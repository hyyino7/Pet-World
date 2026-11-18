import {planOverview} from './tool-context.js';
import type { Context } from '@deepseek-ai/cordis';
import type { Agent } from '@deepseek-ai/dsh-agent';
import { defineTool, type ToolDefinition } from '@deepseek-ai/dsh-tools';
import type { PetCoreHost } from '../core/index.js';
import type { CompanionLife } from './plugin.js';

const output={schema:{type:'string' as const},render:(_:unknown,value:string)=>[{type:'text' as const,text:value}]};
const activityFields={
  id:{type:'string',required:true,description:'Stable activity identifier: 1–48 letters, numbers, underscores, dots or hyphens.'},
  activity:{type:'string',required:true,description:'Short activity label, at most 80 characters; it does not replace the required executable fields.'},
  presentationSlot:{type:'string',description:'Optional registered visual slot compatible with the real operation. Omit for normal shared activity selection. It cannot create food, items, reading content, a transaction, a different emotion or a new activity; unsupported/missing portrayal remains a gap.'},
} as const;
const timedActivityFields={
  durationMinutes:{type:'number',description:'Positive duration for hold/room only. Choose durationMinutes or until, or omit both for explicit-control waiting, allowed only as the last step. nextConsiderAt does not finish a step.'},
  until:{type:'string',description:'ISO end time with an explicit timezone, for hold/room only. Do not combine with durationMinutes.'},
} as const;
const gardenOperation={
  required:true,
  description:'One explicit existing garden operation, using type (never operation). Read room_garden with type=state for current plots, crops, seeds, inventory, coins and tasks. The program validates availability and balances and settles only against actual execution receipts.',
  oneOf:[
    {type:'object',properties:{type:{type:'string',const:'visit',required:true}},additionalProperties:false},
    {type:'object',properties:{
      type:{type:'string',enum:['till','water','fertilize','harvest'],required:true},
      plotId:{type:'integer',required:true,description:'Existing plot id returned by room_garden state.'},
    },additionalProperties:false},
    {type:'object',properties:{
      type:{type:'string',const:'plant',required:true},
      plotId:{type:'integer',required:true,description:'Existing plot id returned by room_garden state.'},
      cropId:{type:'string',required:true,description:'Existing crop id returned by room_garden state; planting consumes an available seed.'},
    },additionalProperties:false},
    {type:'object',properties:{
      type:{type:'string',enum:['sell','buySeed'],required:true},
      cropId:{type:'string',required:true,description:'Existing crop id returned by room_garden state.'},
      quantity:{type:'integer',description:'Transaction quantity. Omit for the existing garden default of one; available funds, inventory and quantity limits are checked by the garden program.'},
    },additionalProperties:false},
    {type:'object',properties:{
      type:{type:'string',const:'buyCompost',required:true},
      quantity:{type:'integer',description:'Transaction quantity. Omit for the existing garden default of one; available funds and quantity limits are checked by the garden program.'},
    },additionalProperties:false},
  ],
} as const;

/** Normal owner conversations use the same Life authority, never a per-chat plan. */
export function registerPlanTools(ctx:Context,host:PetCoreHost,life:CompanionLife) {
  const scope=(agent?:Agent) => {
    if(!agent || agent.session.header.agentPreset==='chatpet-channel-guest' || host.native.isGuest(agent.id))return;
    const status=host.workspace.status();
    if(status.state!=='ready' || !status.target || ctx.petWorld.sessionStatus(agent.session)?.state!=='ready')return;
    const registry=(ctx as unknown as {get(name:string):any}).get('workspaceRegistry');
    const current=registry?.get(status.target.id);
    if(current?.path!==status.target.path || !current.sessionIds.includes(agent.id) || registry.archivedSessionIds.includes(agent.id))return;
    return status.target.id;
  };
  const checked=(agent?:Agent)=>{
    const id=scope(agent);if(!id || !agent || !host.native.manages(agent.id))throw Error('Life planning requires an admitted owner conversation in the current workspace');
    return id;
  };
  const admission=(agent:Agent|undefined,signal:AbortSignal)=>{
    signal.throwIfAborted();const id=checked(agent);
    return {id,validate:()=>{signal.throwIfAborted();if(checked(agent)!==id)throw Error('Life conversation or workspace admission changed');}};
  };
  const catalog:ToolDefinition[]=[
    defineTool({name:'life_plan_read',description:'读取同一个伙伴跨会话保存的当前生活计划、版本、活动和进度。无计划也是有效状态。',parameters:{view:{type:'string',enum:['overview','full'],description:'Autonomous turns default to overview; full retains the original snapshot.'}},output,
      execute:async({view},exec)=>{const guard=admission(exec.agent,exec.signal);const state=await life.readPlan(guard.id,guard.validate);
        return JSON.stringify((view??(host.native.isAutonomous(exec.agent!.id)?'overview':'full'))==='overview'?planOverview(state):state);}}),
    defineTool({name:'life_plan_update',description:'提交或明确替换持久生活计划。先读版本；可长期保持活动、休息或无安排。move 表示前往位置并在实际到达后结束；room 表示到指定位置持续活动，hold 表示原地持续活动，不会入睡。决定睡觉须提交 body、action=sleep，实际入睡后才算睡着；nextConsiderAt 只设置思考时间。无限持续活动只能放在最后；nextConsiderAt 只唤醒思考，不结束活动。body 必须给 action；room/move 必须使用 room_state 中的 room/spot；garden 必须给 garden:{type:...}，先用 room_garden 的 state 查询目标和资源，巡视使用 type=visit。身体和园艺操作以真实执行结果结束，后续持续休息可另加 hold。economy 用目录中的真实 itemId 购买、出售或消费；收菜、出售、补种与消费都由你明确决定，不因成熟自动执行。read 指定已持有书本的实际片段，必须取得内容并确认才算读过，动画不代表阅读完成。计划只表达意图，程序验证并执行，不能声称已经完成。不要为每个动画片段或普通聊天重建计划。',parameters:{
      expectedRevision:{type:'integer',required:true},
      plan:{type:'object',required:true,properties:{
        goal:{type:'string',required:true},reason:{type:'string',required:true},nextConsiderAt:{oneOf:[{type:'string'},{type:'null'}],required:true,description:'ISO time with timezone, or null to wait for an explicit event. Finishing the last finite activity is one such event. Empty steps with null explicitly choose quiet waiting. No fixed interval.'},
        steps:{type:'array',required:true,description:'Ordered explicit activities. Empty steps are valid quiet waiting. Each kind has its own required fields; labels alone cannot execute an activity.',items:{oneOf:[
          {type:'object',properties:{...activityFields,
            kind:{type:'string',const:'hold',required:true,description:'Continue an activity at the current position without a new body/garden operation.'},
            ...timedActivityFields,
          },additionalProperties:false},
          {type:'object',properties:{...activityFields,
            kind:{type:'string',const:'room',required:true,description:'Stay at the target position until duration/until, or explicit control when last. For arrival-only travel use move.'},
            room:{type:'string',required:true,description:'Exact existing room identifier from room_state; do not invent a location.'},
            spot:{type:'string',required:true,description:'Exact spot identifier belonging to the selected room in room_state.'},
            ...timedActivityFields,
          },additionalProperties:false},
          {type:'object',properties:{...activityFields,
            kind:{type:'string',const:'move',required:true,description:'Travel to room/spot and finish on actual arrival, including when already there. No durationMinutes/until.'},
            room:{type:'string',required:true,description:'Exact existing room identifier from room_state.'},
            spot:{type:'string',required:true,description:'Exact existing spot in the selected room.'},
          },additionalProperties:false},
          {type:'object',properties:{...activityFields,
            kind:{type:'string',const:'body',required:true},
            action:{type:'string',enum:['sleep','wake','water','feed','play'],required:true,description:'Existing bodily action. feed and water are free basic food/drinking water; paid catalog foods require kind=economy and type=consume. No durationMinutes/until; completion follows the actual body result.'},
          },additionalProperties:false},
          {type:'object',properties:{...activityFields,
            kind:{type:'string',const:'garden',required:true},garden:gardenOperation,
          },additionalProperties:false},
          {type:'object',properties:{...activityFields,
            kind:{type:'string',const:'economy',required:true},
            economy:{type:'object',required:true,properties:{
              type:{type:'string',enum:['buy','sell','consume'],required:true},
              itemId:{type:'string',required:true,description:'Stable item id returned by the economy catalog. Actual holdings, configured prices and quantities are validated by the program.'},
              quantity:{type:'integer',required:true,description:'Positive whole-item count. consume requires exactly one food item; a stable operation receipt prevents duplicate effects or payment.'},
            },additionalProperties:false},
          },additionalProperties:false},
          {type:'object',properties:{...activityFields,
            kind:{type:'string',const:'read',required:true},
            reading:{type:'object',required:true,properties:{
              itemId:{type:'string',required:true,description:'Owned reading item id from the economy library.'},
              segment:{type:'integer',required:true,description:'Nonnegative actual segment number from the reading catalog. The step waits for the model to read returned text and explicitly confirm that segment; an animation cannot finish it.'},
            },additionalProperties:false},
          },additionalProperties:false},
        ]}},
        reconsiderWhen:{type:'array',items:{type:'object',properties:{metric:{type:'string',enum:['hunger','thirst','energy','bladder','pain'],required:true},comparison:{type:'string',enum:['gte','lte'],required:true},value:{type:'number',required:true}},additionalProperties:false}},
      },additionalProperties:false},
    },output,execute:async(args,exec)=>{const guard=admission(exec.agent,exec.signal);return JSON.stringify(await life.updatePlan(guard.id,args.expectedRevision,args.plan,guard.validate));}}),
    defineTool({name:'life_read_segment',description:'读取当前生活计划正在执行的真实读物片段。先读计划及版本，使用当前执行的原operationId；返回实际文字和持久receiptToken。取得内容不会自动推进书签，也不代表读懂。读到返回文字后才可明确调用life_read_confirm。沿用当前原生会话，不创建第二个阅读代理。',parameters:{
      expectedRevision:{type:'integer',required:true},operationId:{type:'string',required:true},
    },output,execute:async(args,exec)=>{const guard=admission(exec.agent,exec.signal);return JSON.stringify(await life.readPlannedSegment(guard.id,args.expectedRevision,args.operationId,guard.validate));}}),
    defineTool({name:'life_read_confirm',description:'仅在你已经取得并实际阅读life_read_segment返回的文字后，确认当前原operationId及该真实片段的receiptToken。程序核对持有权、内容版本、计划版本与取消状态后推进书签；不记录你已读懂，不以动画或口头意图推进进度。',parameters:{
      expectedRevision:{type:'integer',required:true},operationId:{type:'string',required:true},receiptToken:{type:'string',required:true},
    },output,execute:async(args,exec)=>{const guard=admission(exec.agent,exec.signal);return JSON.stringify(await life.confirmPlannedReading(guard.id,args.expectedRevision,args.operationId,args.receiptToken,guard.validate));}}),
    defineTool({name:'life_plan_keep',description:'考虑后明确保留当前生活计划、活动和进度，不重建或重复派工。先读版本并说明继续或等待的原因；nextConsiderAt可保留原时间、选择新时间或明确为null等待事件。无计划时请用life_plan_update保存安排或空步骤等待，失败的活动要修订计划，已暂停的活动须明确恢复。普通查看不必调用。',parameters:{
      expectedRevision:{type:'integer',required:true},reason:{type:'string',required:true},
      nextConsiderAt:{oneOf:[{type:'string'},{type:'null'}],required:true},
    },output,execute:async(args,exec)=>{const guard=admission(exec.agent,exec.signal);return JSON.stringify(await life.keepPlan(guard.id,args.expectedRevision,args.reason,args.nextConsiderAt,guard.validate));}}),
    defineTool({name:'life_activity_control',description:'明确暂停、恢复或取消当前生活计划。普通聊天不必暂停；暂停保留进度，恢复不重新消费已完成步骤。自主生活关闭时只能暂停或取消，不能偷偷开启。',parameters:{
      expectedRevision:{type:'integer',required:true},action:{type:'string',enum:['pause','resume','cancel'],required:true},reason:{type:'string',required:true},
    },output,execute:async(args,exec)=>{const guard=admission(exec.agent,exec.signal);return JSON.stringify(await life.controlPlan(guard.id,args.expectedRevision,args.action,args.reason,guard.validate));}}),
  ];
  const registration=ctx.tools as unknown as {register(tool:ToolDefinition,options:{when(context:{agent?:Agent}):boolean}):()=>void};
  return catalog.map(tool=>registration.register(tool,{when:({agent})=>!!scope(agent)}));
}
