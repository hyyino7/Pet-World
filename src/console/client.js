// Native DSH settings registration follows the pinned DSH settings slot contract.
// Browser factory/entry structure follows dsh-dafeiyu-dot (MIT; see notices).
window.__ModuleLoader__.load({
  id: 'dsh-Chatpet',
  factory(require) {
    'use strict';
    const React = require('react');
    const h = React.createElement;
    const details = (title, ...children) => h('details', { className: 'cp-details' }, h('summary', null, title), ...children);
    const { useState, useRef, useId } = React;
    const sections = [
      ['overview', '概览'], ['role', '角色与记忆'], ['archive', '对话与档案'], ['life', '日常生活'], ['desktop', '桌宠互动'], ['workspace', '工作区与维护'],
    ];
    const worldGroups = [
      { id: 'persona', title: '人设与提示', modules: { persona: '人设提示', scope: '工作区范围' },
        connection: '角色与记忆页预览绑定工作区的角色和用户资料。' },
      { id: 'conversation', title: '对话与记忆', modules: { history: '近期历史', archive: '对话归档', memory: '记忆查询', compaction: '批量整理' },
        connection: '对话与档案页显示 DSH 工作区关联的会话数，调用 Mnemosyne 搜索和精读。整理继续使用大肥鱼的批处理，续聊沿用 DSH 历史。' },
      { id: 'expression', title: '心情与表达', modules: { mood: '心情状态' },
        connection: '桌宠互动页从情绪模块读取当前心情和可用动作、贴图。' },
      { id: 'life', title: '生活与接入', modules: { life: '自主生活', reflection: '日记与反思', photos: '长期相册',
        bridge: '主动消息', channels: '渠道路由', qq: 'QQ', wechat: '微信' },
        connection: '日常生活页可调整作息、查看活动、翻日记和打开相册。' },
      { id: 'activity', title: '运行与用量', modules: { health: '健康与故障', usage: '活动与用量' },
        connection: '当前服务状态见上方。生活活动日志在日常生活页；准确用量见对应 DSH 会话。' },
    ];
    const workspaceLabels = { unbound: '未绑定', pending: '待初始化', ready: '已就绪', unavailable: '不可用' };
    const capabilityLabels = { ready: '可用', degraded: '部分可用', unavailable: '不可用', disabled: '已停用',
      initializing: '初始化中', not_implemented: '待接入', incompatible: '版本不兼容', stopping: '正在停用' };
    const memoryProviderLabels = { ready: '已连接', stopped: '未运行，按需启动', unresolved: '状态待确认' };
    const memoryKeys = ['recentActionCount', 'recentActionMinutes', 'recentMoodCount', 'recentMoodHours',
      'memorySummaryTurns', 'memorySummaryIdleMinutes', 'memorySummaryMinimumMinutes', 'memoryRecallCount', 'memoryRecallBlockChars', 'memoryColdHours'];
    const css = `
      .chatpet-settings { container-type: inline-size; color: inherit; width: 100%; max-width: 900px; min-width: 0; margin-inline: auto; padding: 4px 0 20px; }
      .chatpet-settings * { box-sizing: border-box; }
      .chatpet-settings h2 { font-size: 22px; margin: 0 0 8px; font-weight: 650; }
      .chatpet-settings h3 { font-size: 15px; margin: 0; font-weight: 600; }
      .chatpet-settings p { margin: 6px 0 0; line-height: 1.65; font-size: 13px; }
      .chatpet-settings .cp-muted { opacity: .64; }
      .chatpet-settings .cp-heading { display: flex; gap: 16px; align-items: start; justify-content: space-between; margin-bottom: 22px; }
      .chatpet-settings .cp-badge { display: inline-flex; flex: 0 0 auto; border: 1px solid color-mix(in srgb,currentColor 20%,transparent); border-radius: 20px; padding: 3px 9px; font-size: 11px; line-height: 1.5; }
      .chatpet-settings .cp-tabs { display: flex; gap: 4px; flex-wrap: wrap; border-bottom: 1px solid color-mix(in srgb,currentColor 15%,transparent); margin-bottom: 20px; }
      .chatpet-settings .cp-tab { font: inherit; font-size: 13px; color: inherit; padding: 10px 12px; background: transparent; border: 0; border-bottom: 2px solid transparent; cursor: pointer; opacity: .64; }
      .chatpet-settings .cp-tab[aria-selected=true] { opacity: 1; border-bottom-color: currentColor; font-weight: 600; }
      .chatpet-settings :focus-visible { outline: 2px solid currentColor; outline-offset: 3px; border-radius: 3px; }
      .chatpet-settings .cp-card { border: 1px solid color-mix(in srgb,currentColor 14%,transparent); border-radius: 12px; padding: 18px; margin-bottom: 14px; }
      .chatpet-settings .cp-card-head { display: flex; justify-content: space-between; align-items: start; gap: 12px; margin-bottom: 15px; }
      .chatpet-settings .cp-fields { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 16px; }
      .chatpet-settings .cp-field { display: flex; flex-direction: column; gap: 7px; font-size: 13px; min-width: 0; }
      .chatpet-settings .cp-wide { grid-column: 1 / -1; }
      .chatpet-settings input, .chatpet-settings textarea, .chatpet-settings select { width: 100%; font: inherit; color: inherit; background: color-mix(in srgb,currentColor 3%,transparent); border: 1px solid color-mix(in srgb,currentColor 16%,transparent); border-radius: 7px; padding: 9px 10px; }
      .chatpet-settings .cp-switch { display:flex; align-items:center; gap:8px; font-size:13px; line-height:1.6; }
      .chatpet-settings input[type=checkbox] { width:auto; flex:0 0 auto; padding:0; }
      .chatpet-settings textarea { min-height: 94px; resize: vertical; }
      .chatpet-settings :disabled { cursor: not-allowed; opacity: .55; }
      .chatpet-settings .cp-field small { font-size: 12px; line-height: 1.6; opacity: .64; }
      .chatpet-settings .cp-card p { overflow-wrap:anywhere; }
      .chatpet-settings .cp-hero { display:grid; grid-template-columns:minmax(0,1fr) auto; align-items:start; gap:16px; padding:22px; background:color-mix(in srgb,currentColor 4%,transparent); }
      .chatpet-settings .cp-hero small { display:block; margin-bottom:4px; font-size:12px; opacity:.72; }
      .chatpet-settings .cp-hero h3 { font-size:26px; line-height:1.25; overflow-wrap:anywhere; }
      .chatpet-settings .cp-hero-actions { grid-column:1/-1; display:flex; flex-wrap:wrap; gap:8px; }
      .chatpet-settings .cp-overview-row { display:grid; grid-template-columns:minmax(6em,auto) 1fr auto; align-items:center; gap:10px; padding:12px 0; font-size:13px; }
      .chatpet-settings .cp-overview-row + .cp-overview-row { border-top:1px solid color-mix(in srgb,currentColor 12%,transparent); }
      .chatpet-settings .cp-row-value { min-width:0; overflow-wrap:anywhere; }
      .chatpet-settings .cp-row-value small { display:block; margin-top:3px; opacity:.75; }
      .chatpet-settings .cp-preview { white-space:pre-wrap; overflow-wrap:anywhere; max-height:15em; overflow:auto; margin:6px 0 14px; padding:12px; border-radius:7px; background:color-mix(in srgb,currentColor 5%,transparent); font:inherit; font-size:13px; line-height:1.6; }
      .chatpet-settings .cp-inline-actions { display:flex; flex-wrap:wrap; gap:8px; margin-top:12px; }
      .chatpet-settings .cp-card h4 { margin:14px 0 4px; font-size:13px; }
      .chatpet-settings .cp-world-adoption { padding:12px 0; border-bottom:1px solid color-mix(in srgb,currentColor 10%,transparent); }
      .chatpet-settings .cp-world-adoption h4 { font-size:13px; margin:0; }
      .chatpet-settings .cp-status-list dd { overflow-wrap:anywhere; min-width:0; }
      .chatpet-settings .cp-results { list-style:none; margin:10px 0; padding:0; }
      .chatpet-settings .cp-results button { width:100%; text-align:start; overflow-wrap:anywhere; margin:3px 0; }
      .chatpet-settings .cp-details { border-top:1px solid color-mix(in srgb,currentColor 14%,transparent); padding:14px 0; }
      .chatpet-settings .cp-details > summary { font-size:14px; font-weight:600; cursor:pointer; }
      .chatpet-settings .cp-details[open] > summary { margin-bottom:16px; }
      .chatpet-settings .cp-status-list { display:grid; grid-template-columns:minmax(5em,auto) 1fr; gap:8px 16px; font-size:13px; margin:10px 0; }
      .chatpet-settings .cp-status-list dd { margin:0; }
      .chatpet-settings .cp-footer { display: flex; align-items: center; justify-content: space-between; gap: 16px; border-top: 1px solid color-mix(in srgb,currentColor 14%,transparent); padding-top: 16px; margin-top: 22px; }
      .chatpet-settings .cp-save { flex: 0 0 auto; border: 1px solid color-mix(in srgb,currentColor 20%,transparent); color: inherit; background: transparent; padding: 8px 14px; border-radius: 7px; font: inherit; font-size: 13px; }
      .chatpet-settings .cp-card > p + .cp-save { margin-top:12px; }
      .chatpet-settings .cp-save:enabled { cursor:pointer; }
      .chatpet-settings .cp-save:enabled:hover { background:color-mix(in srgb,currentColor 7%,transparent); }
      .chatpet-settings .cp-primary:enabled { background:var(--color-primary,#246381); border-color:var(--color-primary,#246381); color:var(--color-primary-foreground,white); }
      .chatpet-settings .cp-primary:enabled:hover { background:var(--color-primary,#246381); filter:brightness(.93); }
      @container(max-width:560px) { .chatpet-settings .cp-fields { grid-template-columns: 1fr; } .chatpet-settings .cp-card { padding: 14px; } .chatpet-settings .cp-tab { padding: 9px 8px; } .chatpet-settings .cp-footer { align-items: start; } .chatpet-settings .cp-overview-row { grid-template-columns:minmax(5em,auto) 1fr; } .chatpet-settings .cp-overview-row .cp-save { grid-column:2; justify-self:start; } }
    `;
    const badge = (text = '待接入') => h('span', { className: 'cp-badge' }, text);
    function Field({ label, note, wide, multiline, value, onChange, type = 'text', min, max, maxLength, disabled }) {
      const id = useId();
      return h('div', { className: `cp-field${wide ? ' cp-wide' : ''}` },
        h('label', { htmlFor: id }, label),
        h(multiline ? 'textarea' : 'input', { id, type: multiline ? undefined : type, value: value ?? '', min, max, maxLength, disabled,
          onChange: event => onChange(event.target.value), 'aria-describedby': note ? `${id}-note` : undefined }),
        note && h('small', { id: `${id}-note` }, note));
    }
    function Card({ id, title, note, children, status }) {
      return h('section', { className: 'cp-card', id, tabIndex: id ? -1 : undefined, 'aria-label': id ? title : undefined },
        h('div', { className: 'cp-card-head' }, h('div', null, h('h3', null, title), note && h('p', { className: 'cp-muted' }, note)), status && badge(status)), children);
    }
    const fields = (...children) => h('div', { className: 'cp-fields' }, ...children);
    const field = (label, options = {}) => h(Field, { key: label, label, ...options });
    const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);
    const facts = rows => h('dl', { className: 'cp-status-list' }, ...rows.map(([label, value]) =>
      h(React.Fragment, { key: label }, h('dt', null, label), h('dd', null, value))));
    const preview = (label, text) => h(React.Fragment, null, h('h4', null, label),
      h('pre', { className: 'cp-preview', tabIndex: 0 }, text || '尚未填写'));

    // Each task mounts its reader on demand. Unbinding, switching tasks and refreshing
    // unmount it and abort the request before any previous workspace data can reappear.
    function WorkspaceView({ workspaceId, section, request, revision, children }) {
      const [attempt, setAttempt] = useState(0);
      const [result, setResult] = useState(null);
      React.useEffect(() => {
        if (!workspaceId) return;
        const controller = new AbortController();
        async function loadView() {
          try {
            const value = await request('worldView', { workspaceId, section }, controller.signal);
            if (value.workspaceId !== workspaceId) throw new Error('工作区已切换，请刷新设置。');
            if (!controller.signal.aborted) setResult({ revision, attempt, workspaceId, section, value });
          } catch (error) {
            if (!controller.signal.aborted) setResult({ revision, attempt, workspaceId, section, error: error.message });
          }
        }
        void loadView();
        return () => controller.abort();
      }, [workspaceId, section, revision, attempt, request]);
      if (!workspaceId) return h('p', { className: 'cp-muted' }, '请先绑定并初始化工作区。');
      if (!result || result.workspaceId !== workspaceId || result.section !== section || result.revision !== revision || result.attempt !== attempt)
        return h('p', { role: 'status' }, '正在读取工作区资料…');
      if (result.error) return h(React.Fragment, null, h('p', { role: 'alert' }, result.error),
        h('button', { type: 'button', className: 'cp-save', onClick: () => setAttempt(n => n + 1) }, '重试读取'));
      return children(result.value);
    }

    function ArchiveSearch({ workspaceId, request }) {
      const [query, setQuery] = useState('');
      const [found, setFound] = useState(null);
      const [detail, setDetail] = useState(null);
      const [pending, setPending] = useState('');
      const [error, setError] = useState('');
      const flight = useRef(null);
      React.useEffect(() => () => flight.current?.abort(), []);
      function clear() {
        flight.current?.abort();
        setPending(''); setError(''); setFound(null); setDetail(null);
      }
      async function lookup(id) {
        flight.current?.abort();
        const controller = new AbortController(); flight.current = controller;
        setPending(id ? 'detail' : 'find'); setError(''); setDetail(null);
        if (!id) setFound(null);
        try {
          const value = id
            ? await request('archiveRead', { workspaceId, memoryId: id }, controller.signal)
            : await request('archiveFind', { workspaceId, query: query.trim() }, controller.signal);
          if (controller.signal.aborted) return;
          if (id) {
            setDetail(value);
            setFound(null);
          } else setFound(value);
        } catch (failure) {
          if (controller.signal.aborted) return;
          // All excerpts came from the same eligibility read. Invalidate them on a
          // failed drill-down so a since-withdrawn or corrected excerpt cannot linger.
          setFound(null); setDetail(null); setError(failure.message);
        } finally { if (!controller.signal.aborted) setPending(''); }
      }
      return h(Card, { title: '档案检索', note: '按关键词查找当前工作区已收录的对话或记忆。打开结果可查看详情和关联原文。' },
        h('form', { onSubmit: event => { event.preventDefault(); if (query.trim() && pending !== 'find') void lookup(); } },
          field('查找已收录的对话或记忆', { type: 'search', maxLength: 240, value: query, onChange: value => { clear(); setQuery(value); } }),
          h('div', { className: 'cp-inline-actions' }, h('button', { type: 'submit', className: 'cp-save cp-primary',
            disabled: !query.trim() || pending === 'find' }, '搜索档案'))),
        pending && h('p', { role: 'status' }, pending === 'find' ? '正在查找…' : '正在读取详情…'),
        error && h('p', { role: 'alert' }, error),
        found && (found.items.length ? h(React.Fragment, null,
          h('p', { role: 'status' }, '找到 ' + found.items.length + ' 条，本次最多返回 ' + found.limit + ' 条。'),
          h('ul', { className: 'cp-results' }, ...found.items.map(item => h('li', { key: item.id },
            h('button', { type: 'button', className: 'cp-save', onClick: () => void lookup(item.id) }, item.excerpt || '查看记忆详情')))))
          : h('p', { role: 'status' }, '没有找到匹配的已收录内容。')),
        detail && h('section', { 'aria-label': '记忆详情' }, h('h4', null, '记忆详情'),
          h('pre', { className: 'cp-preview', tabIndex: 0 }, detail.content),
          detail.dialogue.length > 0 && h('details', { className: 'cp-details' }, h('summary', null, '关联对话原文'),
            ...detail.dialogue.map((turn, index) => h('div', { key: index },
              preview(({ user: '用户', assistant: '大肥鱼', source: '来源' })[turn.role] || '来源', turn.text))))));
    }
    function RoomView({workspaceId, request}) {
      const frame = useRef(null), [open, setOpen] = useState(false);
      React.useEffect(() => {
        if (!open) return;
        const lifetime = new AbortController();
        async function receive(event) {
          if (event.source !== frame.current?.contentWindow || event.origin !== location.origin ||
              event.data?.kind !== 'chatpet.room' || !event.ports[0]) return;
          const {endpoint, data} = event.data, port = event.ports[0];
          if (!['roomState','roomAction','roomGarden','roomPlant','roomCare','roomChat','roomTelevision','roomHistory'].includes(endpoint)) return;
          try { const value = await request(endpoint, {workspaceId, data}, lifetime.signal);
            if (!lifetime.signal.aborted) port.postMessage({ok:true, value});
          } catch (e) { if (!lifetime.signal.aborted) port.postMessage({ok:false, error:e.message}); }
          finally { port.close(); }
        }
        window.addEventListener('message', receive);
        return () => { lifetime.abort(); window.removeEventListener('message', receive); };
      }, [workspaceId, request, open]);
      return h(Card, {title:'房间与菜园'},
        h('button', {type:'button', onClick:() => setOpen(!open)}, open ? '收起房间' : '进入 3D 房间'),
        open && h('iframe', {ref:frame, src:'/chatpet-room/index.html', title:'大肥鱼的房间',
          allow:'display-capture; fullscreen', allowFullScreen:true, style:{border:0,marginTop:'10px',width:'100%',height:'min(75vh, 760px)'}}));
    }
    function QQGroup({workspaceId, groupId, request}) {
      const [view,setView] = useState(null), [edit,setEdit] = useState(null), [word,setWord] = useState(''), [meaning,setMeaning] = useState('');
      const [research,setResearch] = useState(null), [fault,setFault] = useState(''), [busy,setBusy] = useState(false);
      const lifetime = useRef(null);
      React.useEffect(() => { const controller = new AbortController(); lifetime.current = controller; return () => controller.abort(); }, []);
      async function change(op,input = {}) {
        const signal = lifetime.current.signal;
        try {
          setBusy(true); setFault('');
          const call = (operation,data) => request(operation,{workspaceId,groupId,...data},signal);
          const result = await call(op,input);
          if (signal.aborted) return;
          if (op === 'groupResearch') { setResearch(result); return; }
          const next = op === 'groupState' ? result : await call('groupState',{});
          if (!signal.aborted) { setView(next); setEdit(next.settings); }
        } catch (error) { if (!signal.aborted) setFault(error.message); }
        finally { if (!signal.aborted) setBusy(false); }
      }
      const button = (label, click, disabled = false) => h('button',{type:'button',disabled:busy || disabled,onClick:click},label);
      const choose = item => { setWord(item.content); setMeaning(item.meaning || ''); setResearch(null); };
      return details('群 ' + groupId, button('读取群资料',()=>change('groupState')), fault && h('p',{role:'alert'},fault),
        edit && h('div',null,
          ...Object.entries({affinity:'成员好感',slang:'群用语',stickers:'群贴图',forwards:'合并转发'}).map(([k,label]) =>
            h('label',{key:k,className:'cp-switch'},h('input',{type:'checkbox',checked:edit[k],onChange:e=>setEdit({...edit,[k]:e.target.checked})}),label)),
          h('label',{className:'cp-field'},'本群公开角色卡',h('textarea',{value:edit.roleCard,onChange:e=>setEdit({...edit,roleCard:e.target.value})})),
          h('label',{className:'cp-field'},'群聊模式',h('select',{value:edit.roleMode,onChange:e=>setEdit({...edit,roleMode:e.target.value})},
            h('option',{value:'v1'},'V1'),h('option',{value:'v2'},'V2'))),
          edit.roleMode === 'v2' && edit.wake && h('div',{className:'cp-fields'},
            ...Object.entries({anyMessage:'任意消息可唤醒',atMention:'群友提及时唤醒',nameMention:'叫名字时唤醒',question:'听到提问可唤醒',
              keywords:'唤醒关键词（每行一个）',speakerIds:'唤醒发言人 ID（每行一个）',probability:'唤醒概率',maxPerMinute:'每分钟最多唤醒次数',maxPerHour:'每小时最多唤醒次数'})
              .map(([key,label])=>{
                const value=edit.wake[key], set=value=>setEdit({...edit,wake:{...edit.wake,[key]:value}});
                if (typeof value === 'boolean') return h('label',{key,className:'cp-switch'},h('input',{type:'checkbox',checked:value,onChange:e=>set(e.target.checked)}),label);
                if (Array.isArray(value)) return h('label',{key,className:'cp-field'},label,h('textarea',{value:value.join('\n'),onChange:e=>set(e.target.value.split('\n'))}));
                return h('label',{key,className:'cp-field'},label,h('input',{type:'number',min:0,step:'any',value:value??'',onChange:e=>set(Number(e.target.value))}));
              })),
          view.social && edit.roleMode === 'v2' && h('p',null,'未读 ' + view.social.unread + ' · ' + (view.social.lastWakeReason || '尚未唤醒') + ' · ' + (view.social.lastFeedback || '')),
          view.social?.reports?.length > 0 && details('本群观察报告',
            ...view.social.reports.slice(-10).reverse().map((report,index) => h('p',{key:index},
              new Date(report.at).toLocaleString() + ' · ' + ({info:'记录',warning:'提醒',error:'异常'}[report.level] || '记录') + ' · ' + report.message))),
          button('保存本群设置',()=>change('groupSettings',{expected:view.settings,next:edit})),
          h('h4',null,'成员好感'), ...(view.affinity || []).map((a,i)=>h('p',{key:i},(a.name || a.userId) + ' · ' + a.score)),
          ...(view.impressions || []).map(member=>h('p',{key:member.speakerId},(member.name || member.speakerId) + ' · ' +
            (Array.isArray(member.traits) ? member.traits.join('、') : member.traits))),
          h('h4',null,'群贴图'), ...(view.stickers || []).map((s,i)=>h('p',{key:i},s.label || s.name || s.id)),
          h('h4',null,'群用语'), ...(view.slang || []).map(item=>h('button',{key:item.content,type:'button',onClick:()=>choose(item)},item.content)),
          h('label',{className:'cp-field'},'词语',h('input',{value:word,onChange:e=>{setWord(e.target.value); setResearch(null);}})),
          h('label',{className:'cp-field'},'在本群的含义',h('input',{value:meaning,onChange:e=>setMeaning(e.target.value)})),
          ...[['candidate','记为候选'],['confirmed','确认含义'],['rejected','不采用']].map(([status,label]) =>
            h(React.Fragment,{key:status},button(label,()=>change('groupSlang',{content:word,meaning,usage:'',status}),!word.trim()))),
          button('查询公开用法',()=>change('groupResearch',{content:word}),!view.slang?.some(i=>i.content===word && i.status==='candidate')),
          research && h('section',null,h('p',null,research.message || '公开查询结果'),
            ...(research.sources || []).map(item=>h('p',{key:item.url},item.title + ' · ' + item.snippet)))));
    }
    function Qzone({workspaceId,request}) {
      const [view,setView] = useState(null), [edit,setEdit] = useState(null),[draft,setDraft] = useState('');
      const [busy,setBusy] = useState(false), [error,setError] = useState(''), lifetime = useRef(null);
      React.useEffect(()=>{const c=new AbortController(); lifetime.current=c; return ()=>c.abort();},[]);
      const update = async (name,input={}) => {
        const signal=lifetime.current.signal; setBusy(true); setError('');
        try {
          const call=(op,data)=>request(op,{workspaceId,...data},signal);
          const result=await call(name,input);
          const current=name==='qzoneState'?result:await call('qzoneState',{});
          if (!signal.aborted) { setView(current); setEdit(current.settings); if (name==='qzoneDraft') setDraft(''); }
        } catch(e) {if (!signal.aborted) setError(e.message);}
        finally {if (!signal.aborted) setBusy(false);}
      };
      const button=(label,fn,disabled=false)=>h('button',{type:'button',disabled:disabled||busy,onClick:fn},label);
      return details('QQ 空间',button('查看空间发布计划',()=>update('qzoneState')),error && h('p',{role:'alert'},error),
        edit && h('div',null,
          h('label',{className:'cp-switch'},h('input',{type:'checkbox',checked:edit.enabled,onChange:e=>setEdit({...edit,enabled:e.target.checked})}),'定时公开发布已排队的草稿'),
          h('label',{className:'cp-field'},'北京时间（每行一个，24 小时制）',h('textarea',{value:edit.times.join('\n'),onChange:e=>setEdit({...edit,times:e.target.value.split('\n')})})),
          h('label',{className:'cp-field'},'每日最多发布条数',h('input',{type:'number',min:1,value:edit.dailyMax,onChange:e=>setEdit({...edit,dailyMax:Number(e.target.value)})})),
          button('保存发布计划',()=>update('qzoneSettings',{expected:view.settings,next:{...edit,times:edit.times.map(a=>a.trim()).filter(Boolean)}})),
          h('label',{className:'cp-field'},'允许定时公开发布的正文',h('textarea',{value:draft,onChange:e=>setDraft(e.target.value)})),
          button('加入公开发布队列',()=>update('qzoneDraft',{text:draft.trim()}),!draft.trim()),
          ...(view.drafts||[]).map(item=>h('div',{key:item.id},h('p',null,item.text + ' · ' + item.status),
            ['pending','queued'].includes(item.status) && button('移除草稿',()=>update('qzoneRemove',{id:item.id})))),
          ...(view.posts||[]).map((post,i)=>h('p',{key:post.id || i},new Date(post.at).toLocaleString() + ' · ' + post.status))));
    }
    function ChannelsPage({workspaceId, request}) {
      const [saved, setSaved] = useState(null), [draft, setDraft] = useState(null), [busy,setBusy] = useState(false);
      const [fault,setFault] = useState(''), lifetime = useRef(null);
      React.useEffect(() => { const c = new AbortController(); lifetime.current = c; return () => c.abort(); }, []);
      async function change(operation, input) {
        setBusy(true); setFault('');
        const signal = lifetime.current.signal;
        try { const result = await request(operation, {workspaceId,...input}, signal);
          if (!signal.aborted) { setSaved(result); setDraft({bridge:result.bridge.preferences,...result.messaging.config}); }
        } catch (e) { if (!signal.aborted) setFault(e.message); }
        finally { if (!signal.aborted) setBusy(false); }
      }
      const button = (label, action) => h('button', {type:'button', disabled:busy, onClick:action}, label);
      const set = (group,key,value) => setDraft(old => ({...old,[group]:{...old[group],[key]:value}}));
      function control(group,key,label) {
        const value = draft[group][key];
        if (typeof value === 'boolean') return h('label', {className:'cp-switch',key}, h('input', {type:'checkbox', checked:value,
          onChange:e => set(group,key,e.target.checked)}), label);
        if (Array.isArray(value)) return h('label', {className:'cp-field',key}, label, h('textarea', {value:value.join('\n'),
          onChange:e => set(group,key,e.target.value.split('\n'))}));
        if (key === 'groupTrigger') return h('label',{className:'cp-field',key},label,h('select',{value,onChange:e=>set(group,key,e.target.value)},
          h('option',{value:'mention'},'提到我或使用唤醒词'),h('option',{value:'all'},'所有群消息')));
        return h('label', {className:'cp-field',key}, label, h('input', {value:value ?? '', type:typeof value === 'number' ? 'number' : 'text',
          onChange:e => set(group,key,typeof value === 'number' ? Number(e.target.value) : e.target.value)}));
      }
      function platform(group, name) {
        const config = draft[group], status = saved.messaging[group];
        if (!config) return null;
        const labels = {enabled:'启用渠道',wsUrl:'本机 OneBot 地址',tokenEnv:'本机凭据环境变量名',accountId:'接入的账号 ID',
          ownerSpeakerId:'主人的账号 ID',ownerReach:'允许生活会话主动联系主人私聊',allowPrivate:'允许的私聊账号（每行一个）',allowGroups:'允许的群（每行一个）',
          autoReply:'自动回复',voiceEnabled:'QQ 语音收发',voicePerMinute:'每分钟最多语音条数（0 不限制）',voicePerHour:'每小时最多语音条数（0 不限制）',
          groupTrigger:'群聊触发方式',groupKeywords:'群聊唤醒词（每行一个）',batchQuietMs:'合并消息等待（毫秒）',
          contextMessages:'近期消息条数',bufferSeconds:'媒体等待秒数',mutedUntil:'静默到（带时区的时间，可留空）'};
        return details(name, h('div',null,
          status && h('p',null, [status.state || status.account || (config.enabled ? '等待连接' : '已关闭'),
            status.error, Number.isFinite(status.pending ?? status.outbox) ? '待发 ' + (status.pending ?? status.outbox) : '',
            Number.isFinite(status.sent) ? '已发 ' + status.sent : '', Number.isFinite(status.failed) ? '失败 ' + status.failed : '',
            Number.isFinite(status.uncertain) ? '待核对 ' + status.uncertain : ''].filter(Boolean).join(' · ')),
          status?.usage && h('p',null,'本账号模型调用 ' + status.usage.requests + ' 次 · 输入 ' + status.usage.inputTokens +
            ' / 输出 ' + status.usage.outputTokens + ' tokens · 缓存读取 ' + status.usage.cacheReadTokens +
            (status.usage.unreported ? ' · 未返回用量 ' + status.usage.unreported + ' 次' : '')),
          Number.isFinite(status?.voiceReceived) && h('p',null,'收到语音 ' + status.voiceReceived + ' · 送达已核对 ' +
            status.voiceVerified + ' · 待核对 ' + status.voiceUncertain),
          status?.path && h('p',null,'本机微信适配器连接文件：' + status.path),
          h('div',{className:'cp-fields'},...Object.entries(labels).filter(([k])=>Object.hasOwn(config,k)).map(([k,l])=>control(group,k,l))),
          button('保存' + name + '设置', ()=>change('messagingSettings',{expected:saved.messaging.config,next:{[group]:Object.fromEntries(
            Object.entries(config).map(([k,v])=>[k,Array.isArray(v) ? v.map(x=>x.trim()).filter(Boolean) : v]))}}))));
      }
      const updateOutlet = (i,key,value) => set('bridge','outlets',draft.bridge.outlets.map((o,j)=>i===j ? {...o,[key]:value} : o));
      return h(Card, {title:'外部联络'}, fault && h('p',{role:'alert'},fault),
        button(saved ? '重新读取渠道状态' : '管理渠道', ()=>change('channelStatus',{})),
        draft && h(React.Fragment,null,platform('qq','QQ'),platform('wechat','微信'),
          saved.messaging.config.qq.accountId && h(Qzone,{key:saved.messaging.config.qq.accountId,workspaceId,request}),
          ...saved.messaging.config.qq.allowGroups.map(groupId=>h(QQGroup,{key:groupId,groupId,workspaceId,request})),
          details('本地程序和推送', h('div',null, control('bridge','enabled','允许本机受信程序给生活会话发消息'),
            saved.bridge.discovery && h('p',null,'本机连接资料保存在 ' + saved.bridge.discovery),
            ...draft.bridge.outlets.map((o,i)=>h('div',{key:i,className:'cp-fields'},
              h('label',{className:'cp-field'},'接收端名称',h('input',{value:o.name,onChange:e=>updateOutlet(i,'name',e.target.value)})),
              h('label',{className:'cp-field'},'推送地址',h('input',{type:'url',value:o.url,onChange:e=>updateOutlet(i,'url',e.target.value)})),
              ...[['reach','主动消息'],['reply','桥接回复'],['busy','忙碌提醒']].map(([k,l])=>h('label',{key:k,className:'cp-switch'},
                h('input',{type:'checkbox',checked:o.kinds.includes(k),onChange:e=>updateOutlet(i,'kinds',e.target.checked ? [...o.kinds,k] : o.kinds.filter(x=>x!==k))}),l)),
              button('移除接收端',()=>set('bridge','outlets',draft.bridge.outlets.filter((_,j)=>i!==j))))),
            button('添加接收端',()=>set('bridge','outlets',[...draft.bridge.outlets,{name:'',url:'',kinds:['reach','reply','busy']}])),
            button('保存桥接设置',()=>change('bridgeSettings',{expected:saved.bridge.preferences,next:draft.bridge}))))));
    }
    function LifeArchive({workspaceId, request}) {
      const [dates, setDates] = useState(null), [entry, setEntry] = useState(null);
      const [album, setAlbum] = useState(null), [image, setImage] = useState(null);
      const [fault, setFault] = useState(''), [busy, setBusy] = useState(false);
      const [query, setQuery] = useState(''), [result, setResult] = useState(null);
      const lifetime = useRef(null);
      React.useEffect(() => {
        const controller = new AbortController(); lifetime.current = controller;
        return () => controller.abort();
      }, [workspaceId]);
      async function read(operation) {
        const signal = lifetime.current.signal;
        setBusy(true); setFault('');
        try {
          const call = (endpoint, args = {}) => request(endpoint, {workspaceId, ...args}, signal);
          const update = await operation(call);
          if (!signal.aborted) update();
        } catch (e) { if (!signal.aborted) setFault(e.message); }
        finally { if (!signal.aborted) setBusy(false); }
      }
      const button = (label, run) => h('button', {type:'button', disabled:busy, onClick:() => read(run)}, label);
      const page = offset => async call => {
        const result = await call('lifeAlbum', {offset});
        return () => { setAlbum(result); setImage(null); };
      };
      const search = offset => async call => {
        const term = offset ? result.query : query.trim();
        if (!term) throw Error('请输入关键词');
        const found = await call('lifeSearch', {query:term, offset});
        return () => setResult({query:term, diaries:offset ? result.diaries : found.diaries,
          lines:[...(offset ? result.lines : []), ...(found.dialogue?.items || [])], next:found.dialogue?.nextOffset});
      };
      return h(Card, {title:'日记与相册'},
        fault && h('p', {role:'alert'}, fault),
        h('label', {className:'cp-field'}, '查找聊天原文和日记', h('input', {value:query, maxLength:256, onChange:e => setQuery(e.target.value)})),
        button('查找', search(0)),
        result && h('div', null, ...result.diaries.map(item => h('p', {key:item.date}, item.date + ' · ' + item.excerpt)),
          ...result.lines.map(line => h('p', {key:line.id}, new Date(line.time).toLocaleString() + ' · ' + (line.role === 'user' ? '伙伴' : '大肥鱼') + ' · ' + line.text)),
          !result.diaries.length && !result.lines.length && h('p', null, '没有查到可读取的记录。'),
          result.next !== undefined && button('继续查看聊天原文', search(result.next))),
        button('翻日记和活动', async call => { const days = await call('lifeDates'); return () => setDates(days); }),
        dates && h('div', {className:'cp-inline-actions'}, dates.length ? dates.map(day => h(React.Fragment, {key:day},
          button(day, async call => { const result = await call('lifeJournal', {day}); return () => setEntry(result); }))) : '还没有日记或活动。'),
        entry && h('section', null, h('h4', null, entry.day), h('p', {style:{whiteSpace:'pre-wrap'}}, entry.diary || '当天没有可显示的日记。'),
          ...entry.activity.map((event, i) => h('p', {key:i}, new Date(event.time).toLocaleTimeString() + ' · ' + event.summary))),
        button('打开相册', page(0)),
        album && h('section', null, album.total ? h('p', null, '已收藏 ' + album.total + ' 张') : h('p', null, '相册还没有照片。可以在生活会话中请大肥鱼收藏本轮收到的图片。'),
          ...album.photos.map(photo => h('div', {key:photo.id}, button(photo.description || new Date(photo.savedAt).toLocaleString(), async call => {
            const result = await call('lifePhoto', {id:photo.id});
            return () => setImage({id:photo.id, title:photo.description, src:'data:' + result.mediaType + ';base64,' + result.data});
          }))),
          album.offset > 0 && button('上一页', page(Math.max(0, album.offset - album.limit))),
          album.hasMore && button('下一页', page(album.offset + album.limit))),
        image && h('figure', null, h('img', {src:image.src, alt:image.title || '收藏的照片', style:{maxWidth:'100%',maxHeight:'55vh'}}),
          button('移出相册', async call => {
            await call('lifeForgetPhoto', {id:image.id});
            return page(0)(call);
          })));
    }
    function LifePage({ workspaceId, request }) {
      const [view, setView] = useState(null), [busy, setBusy] = useState(false);
      const [error, setError] = useState(''), [feedback, setFeedback] = useState('');
      const [edit, setEdit] = useState(null);
      const lifetime = useRef(null), pending = useRef(false);
      React.useEffect(() => {
        const controller = new AbortController(); lifetime.current = controller;
        let reading = false;
        async function refresh() {
          if (!workspaceId || reading || pending.current) return;
          reading = true;
          try {
            const value = await request('lifeView', {workspaceId}, controller.signal);
            if (!controller.signal.aborted) { setView(value); setError(''); }
          } catch (e) { if (!controller.signal.aborted) setError(e.message); }
          finally { reading = false; }
        }
        void refresh(); const timer = setInterval(refresh, 3000);
        return () => { controller.abort(); clearInterval(timer); };
      }, [workspaceId, request]);
      async function change(endpoint, input) {
        pending.current = true; setBusy(true); setError(''); setFeedback('');
        const signal = lifetime.current.signal;
        try {
          const result = await request(endpoint, {workspaceId, ...input}, signal);
          if (signal.aborted) return;
          if (endpoint === 'lifePreferences') setEdit(null);
          setFeedback(result.event?.reaction || result.event?.text || (endpoint === 'lifePreferences' ? '已保存作息和预算。' :
            endpoint === 'lifeAction' ? '生活状态已更新。' : input.enabled === false ? '生活已暂停，计划和活动记录已保留。' : '生活已开启。'));
          const value = await request('lifeView', {workspaceId}, signal);
          if (!signal.aborted) setView(value);
        } catch (e) { if (!signal.aborted) setError(e.message); }
        finally { pending.current = false; if (!signal.aborted) setBusy(false); }
      }
      if (!workspaceId) return h('p', null, '请先绑定并初始化工作区。');
      const button = (label, click, disabled = false) => h('button', {type: 'button', className: 'cp-save', disabled: busy || disabled, onClick: click}, label);
      const home = view?.home, life = view?.life;
      const prefs = edit?.next || view?.preferences;
      const updatePref = (key, value) => setEdit(old => ({expected:old?.expected || view.preferences,
        next:{...(old?.next || view.preferences), [key]:value}}));
      return h(React.Fragment, null,
        h(Card, {title: '大肥鱼的日常', status: view ? view.running ? '生活中' : '已暂停' : '读取中',
          note: '开启后，生活会话会使用当前模型安排活动和主动联络。'},
          error && h('p', {role: 'alert'}, error),
          feedback && h('p', {role: 'status'}, feedback),
          view && h('div', {className: 'cp-inline-actions'}, button(view.enabled ? '暂停生活' : '开启生活', () => change('lifeControl', {enabled: !view.enabled}))),
          home && facts([['现在', `${home.her.roomName} · ${home.her.spotLabel}，${home.her.activity}`],
            ['身体状态', Object.values(home.body.words).join('，')], ['生活时区', view.timeZone],
            ['下次活动', life?.alarm ? `${new Date(life.alarm.at).toLocaleString()} · ${life.alarm.note || '日常唤醒'}` : '尚未安排'],
            ['生活会话', life?.homeSessionId ? '已保存，可在 DSH 会话列表打开' : '开启后创建'],
            ['生活会话用量估算', life?.spend ? life.spend.day + ' · ¥' + Number(life.spend.yuan).toFixed(4) : '暂无记录']]),
          view?.fault && h('p', {role: 'alert'}, view.fault),
          ...(life?.faults || []).map((fault, index) => h('p', {key: index, role: 'alert'}, fault)),
          h('p', {className: 'cp-muted'}, '安静模式暂停主动气泡，生活继续记录。生活运行时，自动碎碎念暂停；手动碎碎念仍可使用。')),
        prefs && h(Card, {title:'作息与预算'}, h('div', {className:'cp-fields'},
          ...[['wake','默认起床'],['review','每日回顾']].map(([key,label]) => h('label', {className:'cp-field',key}, label,
            h('input', {type:'time', value:prefs[key], onChange:e => updatePref(key,e.target.value)}))),
          h('label', {className:'cp-field'}, '每日费用提醒（人民币，留空关闭）', h('input', {type:'number', min:'0.01', step:'any',
            value:prefs.dailyBudget ?? '', onChange:e => updatePref('dailyBudget',e.target.value === '' ? null : Number(e.target.value))})),
          h('label', {className:'cp-switch'}, h('input', {type:'checkbox', checked:prefs.compactAfterReview,
            onChange:e => updatePref('compactAfterReview',e.target.checked)}), '晚间回顾后整理生活会话')),
          button('保存作息和预算', () => change('lifePreferences', edit), !edit)),
        view?.roomAvailable && h(RoomView, {workspaceId, request}),
        view?.channelsAvailable && h(ChannelsPage, {key:workspaceId + '-channels', workspaceId, request}),
        view && h(LifeArchive, {key:workspaceId, workspaceId, request}),
        home && h(Card, {title: '陪它一会儿', note: '操作直接更新原版生活状态，不额外调用模型。下一次对话或生活唤醒会读到这些经历。'},
          h('div', {className: 'cp-inline-actions'}, ...[['feed', '喂小鱼干'], ['water', '倒杯水'], ['pet', '摸摸头'], ['play', '一起玩'], ['sleep', '去睡觉'], ['wake', '叫醒']].map(([action, label]) =>
            h(React.Fragment, {key: action}, button(label, () => change('lifeAction', {action}), !view.running))))),
        home && h(Card, {title: '最近的生活', note: '原版保留最近 15 分钟的生活事件。会话工具活动另存于绑定 Repo。'},
          ...(home.events.length ? home.events.map((event, i) => h('p', {key: `${event.at}-${i}`}, `${new Date(event.at).toLocaleTimeString()} · ${event.text}`)) : [h('p', {key: 'empty', className: 'cp-muted'}, '这会儿还没有新活动。')]),
          ...(view.activity || []).slice(-8).map((event, i) => h('p', {key: `tool-${i}`, className: 'cp-muted'}, `${new Date(event.time).toLocaleTimeString()} · ${event.summary}`))));
    }

    function StandaloneAccess({workspaceId, request}) {
      const [result,setResult] = useState(''), lifetime = useRef(null);
      React.useEffect(() => { const c = new AbortController(); lifetime.current = c; return () => c.abort(); }, []);
      const create = async () => {
        const signal = lifetime.current.signal;
        try { const {file} = await request('petStandaloneAccess',{workspaceId},signal);
          if (!signal.aborted) setResult(file);
        } catch(error) { if (!signal.aborted) setResult(error.message); }
      };
      const copyControl = async () => {
        const signal = lifetime.current.signal;
        try { const {baseUrl,token} = await request('petControlAccess',{workspaceId},signal);
          if (signal.aborted) return;
          await navigator.clipboard.writeText(JSON.stringify({baseUrl,token}));
          if (!signal.aborted) setResult('已复制动作控制凭据，可交给你信任的控制程序。');
        } catch(error) { if (!signal.aborted) setResult(error.message); }
      };
      return details('独立桌宠', h('p',null,'独立窗口可离线陪伴。连接当前大肥鱼后，聊天继续使用同一个 DSH 会话。'),
        h('button',{type:'button',onClick:create},'生成本机连接文件'),
        h('button',{type:'button',onClick:copyControl},'复制第三方动作控制凭据'),result && h('p',{role:'status'},result));
    }
    function AppearanceEditor({value, request, onSave}) {
      const [text, setText] = useState(() => JSON.stringify(value || {}, null, 2));
      const [error, setError] = useState('');
      const lifetime = useRef(null);
      React.useEffect(() => { const c = new AbortController(); lifetime.current = c; return () => c.abort(); }, []);
      const load = async () => {
        try { const defaults = await request('desktopAppearance', {}, lifetime.current.signal);
          if (!lifetime.current.signal.aborted) { setText(JSON.stringify({...defaults,...value}, null, 2)); setError(''); }
        } catch (e) { if (!lifetime.current.signal.aborted) setError(e.message); }
      };
      return details('高级外观、动作和文案', h('div', null,
        h('button', {type:'button', onClick:load}, '载入当前完整配置'),
        h('label', {className:'cp-field'}, '物理参数、字体、归位、动作池和文字（JSON）',
          h('textarea', {rows:10, value:text, onChange:e => setText(e.target.value)})),
        h('button', {type:'button', onClick:() => {
          try { const next = JSON.parse(text); setError(''); onSave(next); } catch { setError('请输入有效的 JSON 对象。'); }
        }}, '保存高级设置'), error && h('p', {role:'alert'}, error)));
    }
    function SettingsPage({ request }) {
      const [active, setActive] = useState('overview');
      const [snapshot, setSnapshot] = useState(null);
      const [draft, setDraft] = useState(null);
      const [loading, setLoading] = useState(true);
      const [busy, setBusy] = useState(null);
      const [notice, setNotice] = useState('');
      const [error, setError] = useState('');
      const lifetime = useRef(null), sequence = useRef(0);
      const tabs = useRef([]), prefix = useId();
      const focusAfterNavigation = useRef(null);
      React.useEffect(() => {
        if (!focusAfterNavigation.current) return;
        const target = document.getElementById(focusAfterNavigation.current);
        focusAfterNavigation.current = null;
        target?.focus();
      }, [active]);
      function selectTab(tab) {
        setActive(tab);
        setNotice('');
      }
      function navigateTo(tab, target) {
        focusAfterNavigation.current = target ? `${prefix}-${target}` : `${prefix}-${tab}-panel`;
        selectTab(tab);
      }
      const dirty = Boolean(snapshot && draft && (!equal(snapshot.identity, draft.identity)
        || !equal(snapshot.companion, draft.companion) || snapshot.policy.quiet !== draft.quiet || !equal(snapshot.preferences.conversation, draft.conversation)
        || (snapshot.preferences.workspace?.id ?? null) !== draft.workspaceId || snapshot.profile.text !== draft.profile));
      function accept(value) {
        setSnapshot(value); setDraft({ companion: value.companion, identity: { ...value.identity }, quiet: value.policy.quiet,
          workspaceId: value.preferences.workspace?.id ?? null, conversation: { ...value.preferences.conversation }, profile: value.profile.text });
      }
      async function load() {
        const version = ++sequence.current;
        setLoading(true); setError('');
        try { const value = await request('snapshot', {}, lifetime.current.signal); if (version === sequence.current) accept(value); }
        catch (failure) { if (version === sequence.current && !lifetime.current.signal.aborted) setError(failure.message); }
        finally { if (version === sequence.current) setLoading(false); }
      }
      React.useEffect(() => {
        const controller = new AbortController(); lifetime.current = controller;
        void load();
        return () => { sequence.current++; controller.abort(); };
      }, []);
      async function saveWorkspace(kind, input, signal) {
        // Binding and initialization can each change the authoritative workspace.
        setSnapshot(null);
        setDraft(null);
        let failure;
        try {
          const value = await request(kind, input, signal);
          if (kind === 'preferences' && value.workspace) {
            await request('initialize', { expectedPreferencesRevision: value.revision }, signal);
          }
        } catch (error) {
          failure = error;
        }
        if (signal.aborted) return;
        let latest;
        try {
          latest = await request('snapshot', {}, signal);
        } catch (readError) {
          throw new Error([failure?.message, readError.message].filter(Boolean).join(' '));
        }
        if (signal.aborted) return;
        accept(latest);
        if (failure) {
          if (kind === 'preferences' && (latest.preferences.workspace?.id ?? null) !== input.workspaceId) {
            setDraft(old => ({ ...old, workspaceId: input.workspaceId }));
          }
          throw failure;
        }
        setNotice(kind === 'initialize' ? '工作区资料已检查并加载。'
          : latest.preferences.workspace ? '工作区已绑定，资料目录已初始化。' : '工作区已解绑，原目录和记录已保留。');
      }
      async function save(kind, input, scope) {
        if (busy) return;
        setBusy(kind); setError(''); setNotice('');
        try {
          if (kind === 'initialize' || scope === 'workspace') {
            await saveWorkspace(kind, input, lifetime.current.signal);
            return;
          }
          const value = await request(kind, input, lifetime.current.signal);
          if (lifetime.current.signal.aborted) return;
          // Acknowledge exactly the saved section; do not discard edits on other tabs.
          if (kind === 'identity') {
            const identity = { revision: value.revision, displayName: value.displayName, character: value.character };
            setSnapshot(old => ({ ...old, identity })); setDraft(old => ({ ...old, identity }));
          } else if (kind === 'desktopOpen' || kind === 'desktopClose') {
            setSnapshot(old => ({ ...old, desktop: value }));
          } else if (kind === 'companion') {
            setSnapshot(old => ({ ...old, companion: value }));
            setDraft(old => ({ ...old, companion: { ...old.companion, ...Object.fromEntries(scope.map(key => [key, value[key]])) } }));
          } else if (kind === 'quiet') {
            setSnapshot(old => ({ ...old, policy: value })); setDraft(old => ({ ...old, quiet: value.quiet }));
          } else if (kind === 'profile') {
            setSnapshot(old => ({ ...old, profile: value })); setDraft(old => ({ ...old, profile: value.text }));
          } else {
            setSnapshot(old => ({ ...old, preferences: value }));
          }
          setNotice(kind === 'desktopOpen' ? '桌宠已打开。'
            : kind === 'desktopClose' ? '桌宠已关闭。' : '设置已保存并生效。');
        } catch (failure) {
          if (!lifetime.current.signal.aborted) setError(failure.message);
        } finally { if (!lifetime.current.signal.aborted) setBusy(null); }
      }
      function refresh() {
        if (dirty && !window.confirm('刷新会放弃尚未保存的修改，继续吗？')) return;
        setDraft(null); setSnapshot(null);
        setNotice(''); void load();
      }
      const editIdentity = key => value => setDraft(old => ({ ...old, identity: { ...old.identity, [key]: value } }));
      const identityDirty = snapshot && draft && !equal(snapshot.identity, draft.identity);
      const quietDirty = snapshot && draft && snapshot.policy.quiet !== draft.quiet;
      const workspaceDirty = snapshot && draft && (snapshot.preferences.workspace?.id ?? null) !== draft.workspaceId;
      const conversationDirty = snapshot && draft && !equal(snapshot.preferences.conversation, draft.conversation);
      const profileDirty = snapshot && draft && snapshot.profile.text !== draft.profile;
      const companionDirty = snapshot && draft && !equal(snapshot.companion, draft.companion);
      const otherWorkspaceDrafts = companionDirty || identityDirty || quietDirty || conversationDirty || profileDirty;
      const saveButton = (kind, dirtySection, onClick, label) => h('div', { style: { marginTop: 16 } },
        h('button', { type: 'button', className: 'cp-save', disabled: Boolean(busy) || !dirtySection, onClick }, busy === kind ? '正在保存…' : label));
      const savePreferences = (part) => {
        const conversation = part === 'conversation' ? draft.conversation : snapshot.preferences.conversation;
        const workspaceId = part === 'workspace' ? draft.workspaceId : snapshot.preferences.workspace?.id ?? null;
        return save('preferences', { expectedRevision: snapshot.preferences.revision, workspaceId, conversation }, part);
      };
      function content() {
        if (loading) return h('p', { role: 'status' }, '正在读取设置…');
        if (!snapshot || !draft) return busy ? h('p', { role: 'status' }, '正在核对工作区资料…') : null;
        const repo = snapshot.preferences.workspace;
        const ready = snapshot.workspace.state === 'ready';
        const boundId = snapshot.workspace.target?.id;
        const world = new Set(snapshot.worldModules);
        const workspaceId = ready ? boundId : null;
        const worldView = (section, revision, render) => h(WorkspaceView, { key: workspaceId ?? 'unbound',
          workspaceId, section, request, revision }, render);
        const sourceAbsent = () => h('p', { className: 'cp-muted' }, '对应的 World 组件尚未加载。');
        const desktopState = !snapshot.desktop ? '未加载' : snapshot.desktop.running ? '已打开' : '已关闭';
        const button = (label, onClick, disabled = false, primary = false) => h('button',
          { type: 'button', className: primary ? 'cp-save cp-primary' : 'cp-save', onClick, disabled: Boolean(busy) || disabled }, label);
        const jump = (label, tab, target, primary = false) => button(label, () => navigateTo(tab, target), false, primary);
        const bindLink = () => jump('绑定工作区', 'workspace', 'binding');
        const needsWorkspace = (title) => h(Card, { title, note: '绑定并初始化工作区后，就可以在这里调整设置。' }, bindLink());
        const desktopAvailable = Boolean(snapshot.desktop && boundId && (snapshot.desktop.running || ready));
        const desktopButton = (primary = false) => button(snapshot.desktop?.running ? '关闭桌宠' : '打开桌宠',
          () => save(snapshot.desktop.running ? 'desktopClose' : 'desktopOpen', { workspaceId: boundId }),
          !desktopAvailable, primary);
        const capabilityState = (owner) => {
          if (owner === 'memory') return memoryProviderLabels[snapshot.memory?.provider] ?? '未配置';
          const labels = snapshot.capabilities.filter(item => item.owner === owner).map(item => capabilityLabels[item.state] ?? '未知');
          return [...new Set(labels)].join(' / ') || '未报告';
        };
        const numberField = (key, label, max, min = 0) => field(label, { type: 'number', min, max,
          value: draft.companion[key], onChange: value => setDraft(old => ({ ...old, companion: {
            ...old.companion, [key]: value === '' ? '' : Number(value),
          } })) });
        const switchField = (key, label) => h('label', { key, className: 'cp-switch' },
          h('input', { type: 'checkbox', checked: draft.companion[key],
            onChange: event => setDraft(old => ({ ...old, companion: { ...old.companion, [key]: event.target.checked } })) }), label);
        const saveCompanion = (keys, label) => {
          const edited = keys.some(key => draft.companion[key] !== snapshot.companion[key]);
          const settings = { ...snapshot.companion, ...Object.fromEntries(keys.map(key => [key, draft.companion[key]])) };
          return saveButton('companion', edited && ready, () => save('companion', {
            workspaceId: boundId, expectedSettings: snapshot.companion, settings,
          }, keys), label);
        };
        if (active === 'overview') {
          const memory = snapshot.memory;
          const memoryMode = !memory?.provider ? '未配置' : memory.newSessions ? '新对话已启用' : '新对话未启用';
          const memoryNote = memory?.newSessions === false ? '已有对话沿用原来的记忆设置。'
            : memory?.provider && ready && snapshot.companion ? '每次最多召回 ' + snapshot.companion.memoryRecallCount + ' 块' : '';
          return h(React.Fragment, null,
            h('section', { className: 'cp-card cp-hero', 'aria-label': '当前角色' },
              h('div', null, h('small', null, '当前角色'), h('h3', null, snapshot.identity.displayName)),
              badge('桌宠' + desktopState),
              h('div', { className: 'cp-hero-actions' }, desktopButton(desktopAvailable),
                jump('编辑角色', 'role', 'identity', !desktopAvailable))),
            h(Card, { title: '对话与记忆' },
              h('div', { className: 'cp-overview-row' }, h('strong', null, '工作区'),
                h('div', { className: 'cp-row-value', title: repo?.path }, repo?.title || '尚未选择',
                  h('small', null, workspaceLabels[snapshot.workspace.state])),
                repo ? jump('管理工作区', 'workspace', 'binding') : bindLink()),
              h('div', { className: 'cp-overview-row' }, h('strong', null, '原生会话'),
                h('div', { className: 'cp-row-value' }, snapshot.nativeConversationReady ? '已就绪' : '未就绪',
                  h('small', null, snapshot.nativeConversationReady ? '在绑定工作区或桌宠窗口里聊天。' : '请先绑定并初始化工作区。'))),
              h('div', { className: 'cp-overview-row' }, h('strong', null, '长期记忆'),
                h('div', { className: 'cp-row-value' }, memoryMode, memoryNote && h('small', null, memoryNote)),
                ready && snapshot.companion && jump('调整记忆', 'role', 'recall'))),
            h(Card, { title: '来自 World 的功能', note: '在大肥鱼当前工作区查看人设提示、对话档案和心情。' },
              h('div', { className: 'cp-inline-actions' }, jump('预览角色提示', 'role', 'prompt'), jump('查找对话档案', 'archive', 'archive'),
                jump('查看心情与表达', 'desktop', 'expression'), jump('看看日常生活', 'life'))),
            details('生活与接入', h('p', null, '日常生活页可开启生活会话、调整作息，以及查看日记和相册。')));
        }
        if (active === 'life') return h(LifePage, {key: workspaceId || 'unbound', workspaceId, request});
        if (active === 'archive') {
          return h(React.Fragment, null,
            h(Card, { id: `${prefix}-archive`, title: '对话归档', note: '完整的 DSH 会话随绑定工作区保存。下方检索读取已收录且仍可查看的内容。' },
              world.has('archive') ? worldView('sessions', null, view => facts([
                ['绑定工作区', repo?.title], ['DSH 已关联会话', view.sessions === null ? '未能读取数量' : view.sessions + ' 个会话'],
              ])) : sourceAbsent(),
              !ready && bindLink()),
            world.has('memory') && workspaceId && snapshot.memory?.provider
              ? h(ArchiveSearch, { key: workspaceId, workspaceId, request })
              : h(Card, { title: '档案检索' }, h('p', null, !world.has('memory') ? 'World 记忆查询组件尚未加载。'
                : !workspaceId ? '绑定并初始化工作区后可以检索。' : '此工作区尚未配置长期记忆服务。')),
            h(Card, { title: '近期历史与长期记忆' },
              world.has('history') && h('p', null, '近期历史选择和去重组件已加载。当前续聊沿用 DSH 原生历史，跨会话召回由 Mnemosyne 提供。'),
              world.has('compaction') && snapshot.companion && h('p', null, '积累 ' + snapshot.companion.memorySummaryTurns + ' 轮或空闲 ' +
                snapshot.companion.memorySummaryIdleMinutes + ' 分钟后整理，最短间隔 ' + snapshot.companion.memorySummaryMinimumMinutes + ' 分钟。'),
              world.has('memory') && snapshot.companion && h('p', null, '每次最多召回 ' + snapshot.companion.memoryRecallCount +
                ' 块，每块最多 ' + snapshot.companion.memoryRecallBlockChars + ' 字符。'),
              !world.has('history') && !world.has('memory') && !world.has('compaction') && sourceAbsent(),
              snapshot.companion && jump('调整召回与整理', 'role', 'recall')));
        }
        if (active === 'role') {
          return h(React.Fragment, null,
            h(Card, { id: `${prefix}-identity`, title: '身份与角色', note: ready
              ? '角色设定保存在工作区的 .chatpet/SOUL.md，下一轮对话使用新内容。'
              : '角色先保存在本机，初始化工作区时会写入角色文件。' }, fields(
              field('角色名称', { value: draft.identity.displayName, onChange: editIdentity('displayName'), wide: true }),
              field('角色设定', { value: draft.identity.character, onChange: editIdentity('character'), multiline: true, wide: true })),
              saveButton('identity', identityDirty, () => save('identity', { expectedRevision: snapshot.identity.revision,
                displayName: draft.identity.displayName, character: draft.identity.character }), '保存角色')),
            h(Card, { title: '用户资料', note: ready ? '填写希望大肥鱼了解的称呼、习惯或偏好。内容保存在 .chatpet/USER.md。' : '绑定工作区后可以填写希望大肥鱼了解的资料。' },
              field('用户资料内容', { value: draft.profile, multiline: true, wide: true, disabled: !ready,
                onChange: value => setDraft(old => ({ ...old, profile: value })) }),
              saveButton('profile', profileDirty && ready, () => save('profile', {
                expectedRevision: snapshot.profile.revision, text: draft.profile }), '保存用户资料')),
            h(Card, { id: `${prefix}-prompt`, title: '角色提示预览', note: 'World 的人设提示机制把已保存的角色与用户资料放入当前工作区的对话。' },
              world.has('persona') ? worldView('profile', snapshot.identity.revision + '/' + snapshot.profile.revision, view =>
                h(React.Fragment, null, preview('角色设定 · SOUL.md', view.profile.identity), preview('用户资料 · USER.md', view.profile.user),
                  h('p', { className: 'cp-muted' }, '人设与用户资料约 ' + view.profile.estimatedTokens + ' tokens。单轮总用量见 DSH 会话。'))) : sourceAbsent()),
            snapshot.companion ? h(React.Fragment, null,
              h(Card, { title: '近期动作与心情', note: '数量和时长共同决定保留范围。调小会清除超出范围的记录，设为 0 可停用该类记录。' }, fields(
                numberField('recentActionCount', '最近动作数量（次）', 500),
                numberField('recentActionMinutes', '动作保留时长（分钟）', 10080),
                numberField('recentMoodCount', '最近心情变化（次）', 100),
                numberField('recentMoodHours', '心情保留时长（小时）', 720))),
              h(Card, { id: `${prefix}-recall`, title: '长期记忆', note: '达到对话轮数或空闲时长后整理记忆。完整聊天记录会保留，每次对话只取所需的记忆块。' }, fields(
                numberField('memorySummaryTurns', '积累对话轮数', 200, 1),
                numberField('memorySummaryIdleMinutes', '空闲多久整理（分钟）', 1440, 1),
                numberField('memorySummaryMinimumMinutes', '最短整理间隔（分钟）', 1440),
                numberField('memoryRecallCount', '每次召回块数', 50, 1),
                numberField('memoryColdHours', '会话闲置多少小时后刷新历史', 720, 1),
                numberField('memoryRecallBlockChars', '每块最多字符', 4000, 128))),
              saveCompanion(memoryKeys, '保存记忆设置')) : needsWorkspace('记忆设置'));
        }
        if (active === 'desktop') {
          return h(React.Fragment, null,
            h(Card, { title: '桌面蓝鱼', status: desktopState, note: '点击蓝鱼会收到回应。右键打开菜单，Cmd 或 Ctrl 加点击打开聊天。' }, desktopButton()),
            h(Card, { id: `${prefix}-expression`, title: '心情与表达', note: '大肥鱼根据对话更新心情，并据此选择动作和贴图。' },
              world.has('mood') ? worldView('emotion', null, view => {
                const emotion = view.emotion;
                if (!emotion) return h('p', null, '情绪模块未连接。');
                return h(React.Fragment, null, emotion.current ? facts([['当前心情', emotion.current.mood],
                  ['更新于', new Date(emotion.current.at).toLocaleString('zh-CN')]]) : h('p', null, '尚无可展示的心情。'),
                  details('动作与贴图', facts([['可用动作', emotion.actions.join('、') || '暂无'], ['可用贴图', emotion.stickers.join('、') || '暂无']])));
              }) : sourceAbsent()),
            snapshot.companion ? h(React.Fragment, null,
              h(Card, { title: '外观与移动' }, fields(
                numberField('desktopSize', '角色大小（像素，保存后重载桌宠）', 512, 96),
                numberField('workAnimationDelaySeconds', '工作超过多少秒才播放工作动画', 3600),
                switchField('desktopFixed', '固定位置（停止自主移动）'),
                switchField('desktopWorkStatusEnabled', '跟随会话显示工作状态'),
                switchField('desktopTrayEnabled', '显示系统托盘或菜单栏入口'),
                switchField('desktopConfineToScreen', '限制在屏幕范围内'))),
              h(Card, { title: '点击、气泡与贴图' }, fields(
                switchField('desktopClickSound', '点击音效'), switchField('desktopReplyBubble', '回复显示在桌宠气泡'),
                numberField('desktopBubbleSeconds', '文字气泡显示时长（秒）', 300, 1),
                numberField('stickerProbabilityPercent', '想发贴图时的出现概率（%）', 100))),
              h(Card, { title: '定时互动' }, fields(
                switchField('desktopWhisperEnabled', '自动碎碎念／梦话（会调用当前模型）'),
                switchField('desktopWhisperImageEnabled', '碎碎念可带贴图'),
                numberField('desktopSleepTalkSeconds', '梦话间隔（秒）', 86400, 1),
                numberField('desktopWhisperMinutes', '碎碎念间隔（分钟）', 1440, 1),
                switchField('desktopBalanceEnabled', '定时查询当前服务商余额'),
                numberField('desktopBalanceMinutes', '余额查询间隔（分钟）', 1440, 1))),
              saveCompanion(Object.keys(snapshot.companion).filter(key => !memoryKeys.includes(key) && key !== 'desktopAppearance'), '保存桌宠设置'),
              h(AppearanceEditor, {key:boundId, value:snapshot.companion.desktopAppearance, request,
                onSave:desktopAppearance => save('companion', {workspaceId:boundId, expectedSettings:snapshot.companion,
                  settings:{...snapshot.companion, desktopAppearance}}, ['desktopAppearance'])}))
              : needsWorkspace('桌宠偏好'),
            h(Card, { title: '主动联系', note: '安静模式会暂停自动碎碎念、待办提醒和定时余额查询。你仍然可以主动找蓝鱼聊天。' },
              h('label', { className: 'cp-switch' },
                h('input', { type: 'checkbox', checked: draft.quiet,
                  onChange: event => setDraft(old => ({ ...old, quiet: event.target.checked })) }), '安静模式'),
              saveButton('quiet', quietDirty, () => save('quiet', { expectedRevision: snapshot.policy.revision, quiet: draft.quiet }), '保存安静模式')),
            boundId && snapshot.platformAvailable && h(StandaloneAccess,{key:boundId,workspaceId:boundId,request}),
            details('桌宠快捷键', h('p', null, '鼠标悬停在蓝鱼上时，按 L 打开对话、S 截图、D 查看待办、Z 睡觉。')));
        }
        const missing = draft.workspaceId && !snapshot.workspaces.some(row => row.id === draft.workspaceId);
        return h(React.Fragment, null,
          h(Card, { id: `${prefix}-binding`, title: '绑定工作区', note: '选择大肥鱼存放角色、记忆和聊天记录的位置。' },
            h('label', { className: 'cp-field' }, 'DSH 工作区',
              h('select', { value: draft.workspaceId ?? '', disabled: !snapshot.workspaceAvailable,
                onChange: event => setDraft(old => ({ ...old, workspaceId: event.target.value || null })) },
                h('option', { value: '' }, '不绑定工作区'),
                missing && h('option', { value: draft.workspaceId, disabled: true }, '已保存的工作区不存在，请重新选择'),
                ...snapshot.workspaces.map(row => h('option', { key: row.id, value: row.id, disabled: row.state !== 'ok' },
                  `${row.title} · ${row.path}${row.state === 'ok' ? '' : '（目录不可用）'}`)))),
            !snapshot.workspaceAvailable && h('p', { role: 'status' }, 'DSH 工作区服务尚未就绪，请稍后刷新。'),
            repo && h('p', { className: 'cp-muted' }, `当前绑定 · ${repo.title} · ${repo.path}`),
            otherWorkspaceDrafts && h('p', { className: 'cp-muted' }, '请先保存其他设置草稿，或刷新以放弃修改，再切换工作区。'),
            saveButton('preferences', workspaceDirty && snapshot.workspaceAvailable && !otherWorkspaceDrafts,
              () => savePreferences('workspace'), draft.workspaceId ? '绑定并初始化' : '解除绑定')),
          h(Card, { title: '资料与会话', status: workspaceLabels[snapshot.workspace.state] },
            h('p', null, snapshot.workspace.error || (ready
              ? '角色、用户资料和设置已从 .chatpet/ 加载。完整会话随工作区保存，换设备绑定同一个工作区后可以恢复。'
              : '初始化会建立 .chatpet/ 资料目录。若目录已存在，会先校验再加载。')),
            h('p', { className: 'cp-muted' }, snapshot.nativeConversationReady ? 'DSH 原生会话已就绪。' : 'DSH 原生会话尚未就绪。'),
            saveButton('initialize', Boolean(repo) && !workspaceDirty && !otherWorkspaceDrafts,
              () => save('initialize', { expectedPreferencesRevision: snapshot.preferences.revision }), '检查并初始化资料目录')),
          details('高级执行限制', h('p', { className: 'cp-muted' }, '这些限制用于大肥鱼 Core 执行。模型和工具权限可在 DSH 原生会话中选择。'),
            fields(...[
              ['maxHistoryMessages', '上下文消息数', 0, 200], ['maxContextChars', '上下文字符数', 2048, 128000],
              ['maxSteps', '单次执行步数', 1, 64], ['maxToolCalls', '工具调用次数', 0, 128], ['maxDurationMs', '单次执行时长（毫秒）', 1000, 600000],
            ].map(([key, label, min, max]) => field(label, { type: 'number', min, max, value: draft.conversation[key],
              onChange: value => setDraft(old => ({ ...old, conversation: { ...old.conversation, [key]: value === '' ? '' : Number(value) } })) }))),
            saveButton('preferences', conversationDirty, () => savePreferences('conversation'), '保存执行限制')),
          details('运行状态', h('dl', { className: 'cp-status-list' },
            ...[['core', '核心服务'], ['memory', '记忆'], ['emotion', '情绪'], ['desktop', '桌宠'], ['life', '生活'],
              ['qq', 'QQ'], ['bilibili', '哔哩哔哩'], ['voice', '语音']].map(([owner, label]) =>
              h(React.Fragment, { key: owner }, h('dt', null, label), h('dd', null, capabilityState(owner)))),
            h('dt', null, 'World 基础组件'), h('dd', null, world.size ? '已加载 ' + world.size + ' 项' : '未加载'))),
          details('World 功能的接入情况',
            h('p', { className: 'cp-muted' }, '这里显示大肥鱼使用的组件。独立 World 插件在 DSH 设置中的「世界控制台」管理。'),
            ...worldGroups.map(group => {
              const entries = Object.entries(group.modules);
              const present = entries.filter(([id]) => world.has(id)).map(([, label]) => label);
              const missing = entries.filter(([id]) => !world.has(id)).map(([, label]) => label);
              return h('section', { key: group.id, className: 'cp-world-adoption' }, h('h4', null, group.title),
                present.length > 0 && h('p', null, '已加载 · ' + present.join('、')),
                missing.length > 0 && h('p', null, '未加载 · ' + missing.join('、')),
                present.length > 0 && !missing.length && h('p', { className: 'cp-muted' }, group.connection));
            })));
      }
      function keyDown(event, index) {
        const target = event.key === 'Home' ? 0 : event.key === 'End' ? sections.length - 1
          : event.key === 'ArrowRight' ? (index + 1) % sections.length
          : event.key === 'ArrowLeft' ? (index + sections.length - 1) % sections.length : null;
        if (target === null) return; event.preventDefault(); selectTab(sections[target][0]); tabs.current[target]?.focus();
      }
      return h('div', { className: 'chatpet-settings' }, h('style', null, css),
        h('header', { className: 'cp-heading' }, h('h2', null, '大肥鱼设置'), dirty && badge('有未保存修改')),
        h('div', { role: 'tablist', 'aria-label': '大肥鱼设置分类', className: 'cp-tabs' }, ...sections.map(([id,title],index) => h('button', {
          key: id, id: `${prefix}-${id}-tab`, type: 'button', role: 'tab', className: 'cp-tab', 'aria-selected': active === id,
          'aria-controls': `${prefix}-${id}-panel`, tabIndex: active === id ? 0 : -1, ref: element => { tabs.current[index] = element; },
          onClick: () => selectTab(id), onKeyDown: event => keyDown(event,index), disabled: Boolean(busy) }, title))),
        error && h('p', { role: 'alert', style: { marginBottom: 16 } }, error),
        notice && h('p', { role: 'status', style: { marginBottom: 16 } }, notice),
        h('fieldset', { disabled: Boolean(busy), style: { border: 0, padding: 0, margin: 0, minWidth: 0 } },
          h('div', { id: `${prefix}-${active}-panel`, role: 'tabpanel', 'aria-labelledby': `${prefix}-${active}-tab`, tabIndex: 0 }, content())),
        h('footer', { className: 'cp-footer' }, h('p', { className: 'cp-muted', role: 'status' }, busy ? '正在保存…' : dirty ? '有尚未保存的修改。关闭设置前请保存。' : '各项设置分别保存。'),
          h('button', { type: 'button', className: 'cp-save', disabled: Boolean(busy) || loading, onClick: refresh }, '刷新设置')));
    }
    function SettingsIcon({ size = 16 }) {
      return h('svg', { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, 'aria-hidden': true },
        h('path', { d: 'M4 6h16M4 12h16M4 18h16' }),
        ...[[9, 6], [15, 12], [9, 18]].map(([cx, cy]) => h('circle', { key: cy, cx, cy, r: 2, fill: 'var(--background, Canvas)' })));
    }
    return {
      inject: ['slots', 'connection'],
      apply(ctx) {
        const request = async (endpoint, input, signal) => {
          const controller = new AbortController();
          const abort = () => controller.abort();
          signal?.addEventListener('abort', abort, { once: true });
          if (signal?.aborted) controller.abort();
          const timer = setTimeout(abort, ['roomChat','roomTelevision'].includes(endpoint) ? 300000 : 15000);
          try {
            const answer = await ctx.connection.rpc.call('/api', `chatpetSettings/${endpoint}`,
              { requestId: crypto.randomUUID(), input }, controller.signal);
            if (!answer.ok) throw Object.assign(new Error(answer.error.message), { code: answer.error.code });
            return answer.value;
          } catch (failure) {
            if (failure.code && !failure.code.startsWith('gateway/')) throw failure;
            if (['worldView', 'archiveFind', 'archiveRead'].includes(endpoint)) throw new Error('无法读取当前工作区资料，请检查连接后重试。');
            throw new Error(endpoint === 'snapshot' ? '无法读取设置，请检查 00-Core 和连接状态后重试。' : '保存结果未确认，请刷新核对实际状态后再操作。');
          } finally { clearTimeout(timer); signal?.removeEventListener('abort', abort); }
        };
        ctx.slots.inject('settings.section', () => ctx.slots.register({
          name: 'settings.section', id: 'dsh-Chatpet', order: 40, label: '大肥鱼', inject: () => ({ request }),
        }, SettingsPage));
        ctx.slots.inject('settings.section.icon', () => ctx.slots.register({
          name: 'settings.section.icon', id: 'dsh-Chatpet',
        }, SettingsIcon));
      },
    };
  },
});
