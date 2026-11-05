// Native DSH settings registration follows the pinned DSH settings slot contract.
// Browser factory/entry structure follows dsh-dafeiyu-dot (MIT; see notices).
window.__ModuleLoader__.load({
  id: 'dsh-Chatpet',
  factory(require) {
    'use strict';
    const React = require('react');
    const h = React.createElement;
    const { useState, useRef, useId } = React;
    const sections = [
      ['core', '00-Core'], ['workspace', '工作区与会话'], ['execution', '执行与权限'],
      ['modules', '模块状态'], ['maintenance', '数据维护'],
    ];
    const css = `
      .chatpet-settings { color: inherit; width: 100%; min-width: 0; padding: 4px 0 20px; }
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
      .chatpet-settings textarea { min-height: 94px; resize: vertical; }
      .chatpet-settings :disabled { cursor: not-allowed; opacity: .55; }
      .chatpet-settings .cp-field small { font-size: 12px; line-height: 1.6; opacity: .64; }
      .chatpet-settings .cp-modules { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 12px; }
      .chatpet-settings .cp-module { border: 1px solid color-mix(in srgb,currentColor 14%,transparent); border-radius: 10px; padding: 14px; }
      .chatpet-settings .cp-module-title { display: flex; justify-content: space-between; align-items: center; gap: 8px; font-size: 13px; }
      .chatpet-settings .cp-footer { display: flex; align-items: center; justify-content: space-between; gap: 16px; border-top: 1px solid color-mix(in srgb,currentColor 14%,transparent); padding-top: 16px; margin-top: 22px; }
      .chatpet-settings .cp-save { flex: 0 0 auto; border: 1px solid color-mix(in srgb,currentColor 20%,transparent); color: inherit; background: transparent; padding: 8px 14px; border-radius: 7px; font: inherit; font-size: 13px; }
      @media(max-width:560px) { .chatpet-settings .cp-fields,.chatpet-settings .cp-modules { grid-template-columns: 1fr; } .chatpet-settings .cp-card { padding: 14px; } .chatpet-settings .cp-tab { padding: 9px 8px; } .chatpet-settings .cp-footer { align-items: start; } }
    `;
    const badge = (text = '待接入') => h('span', { className: 'cp-badge' }, text);
    function Field({ label, note, wide, multiline, value, onChange, type = 'text', min, max, disabled }) {
      const id = useId();
      return h('div', { className: `cp-field${wide ? ' cp-wide' : ''}` },
        h('label', { htmlFor: id }, label),
        h(multiline ? 'textarea' : 'input', { id, type: multiline ? undefined : type, value: value ?? '', min, max, disabled,
          onChange: event => onChange(event.target.value), 'aria-describedby': note ? `${id}-note` : undefined }),
        note && h('small', { id: `${id}-note` }, note));
    }
    function Card({ title, note, children, status }) {
      return h('section', { className: 'cp-card' },
        h('div', { className: 'cp-card-head' }, h('div', null, h('h3', null, title), note && h('p', { className: 'cp-muted' }, note)), status && badge(status)), children);
    }
    const fields = (...children) => h('div', { className: 'cp-fields' }, ...children);
    const field = (label, options = {}) => h(Field, { key: label, label, ...options });
    const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);
    function SettingsPage({ request }) {
      const [active, setActive] = useState('core');
      const [snapshot, setSnapshot] = useState(null);
      const [draft, setDraft] = useState(null);
      const [loading, setLoading] = useState(true);
      const [busy, setBusy] = useState(null);
      const [notice, setNotice] = useState('');
      const [error, setError] = useState('');
      const lifetime = useRef(null), sequence = useRef(0);
      const tabs = useRef([]), prefix = useId();
      const dirty = Boolean(snapshot && draft && (!equal(snapshot.identity, draft.identity)
        || snapshot.policy.quiet !== draft.quiet || !equal(snapshot.preferences.conversation, draft.conversation)
        || (snapshot.preferences.workspace?.id ?? null) !== draft.workspaceId || snapshot.profile.text !== draft.profile));
      function accept(value) {
        setSnapshot(value); setDraft({ identity: { ...value.identity }, quiet: value.policy.quiet,
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
      async function save(kind, input) {
        if (busy) return;
        setBusy(kind); setError(''); setNotice('');
        try {
          const value = await request(kind, input, lifetime.current.signal);
          if (lifetime.current.signal.aborted) return;
          // Acknowledge exactly the saved section; do not discard edits on other tabs.
          if (kind === 'identity') {
            const identity = { revision: value.revision, displayName: value.displayName, character: value.character };
            setSnapshot(old => ({ ...old, identity })); setDraft(old => ({ ...old, identity }));
          } else if (kind === 'quiet') {
            setSnapshot(old => ({ ...old, policy: value })); setDraft(old => ({ ...old, quiet: value.quiet }));
          } else if (kind === 'profile') {
            setSnapshot(old => ({ ...old, profile: value })); setDraft(old => ({ ...old, profile: value.text }));
          } else if (kind === 'initialize') {
            // Initialization can adopt existing file-authoritative identity and settings.
            const latest = await request('snapshot', {}, lifetime.current.signal);
            accept(latest);
          } else {
            setSnapshot(old => ({ ...old, preferences: value }));
            if (active === 'workspace' && value.workspace) {
              await request('initialize', { expectedPreferencesRevision: value.revision }, lifetime.current.signal);
              const latest = await request('snapshot', {}, lifetime.current.signal);
              accept(latest);
            }
          }
          setNotice(kind === 'preferences' && active === 'workspace'
            ? (value.workspace ? '工作区已绑定，Repo 资料目录已初始化。' : '工作区已解绑，原目录和记录已保留。')
            : kind === 'initialize' ? 'Repo 资料目录已初始化并加载。'
            : '设置已保存并生效。');
        } catch (failure) {
          if (!lifetime.current.signal.aborted) setError(failure.message);
        } finally { if (!lifetime.current.signal.aborted) setBusy(null); }
      }
      function refresh() {
        if (dirty && !window.confirm('刷新会放弃尚未保存的修改，继续吗？')) return;
        setNotice(''); void load();
      }
      const editIdentity = key => value => setDraft(old => ({ ...old, identity: { ...old.identity, [key]: value } }));
      const identityDirty = snapshot && draft && !equal(snapshot.identity, draft.identity);
      const quietDirty = snapshot && draft && snapshot.policy.quiet !== draft.quiet;
      const workspaceDirty = snapshot && draft && (snapshot.preferences.workspace?.id ?? null) !== draft.workspaceId;
      const conversationDirty = snapshot && draft && !equal(snapshot.preferences.conversation, draft.conversation);
      const profileDirty = snapshot && draft && snapshot.profile.text !== draft.profile;
      const otherWorkspaceDrafts = identityDirty || quietDirty || conversationDirty || profileDirty;
      const saveButton = (kind, dirtySection, onClick, label) => h('div', { style: { marginTop: 16 } },
        h('button', { type: 'button', className: 'cp-save', disabled: Boolean(busy) || !dirtySection, onClick }, busy === kind ? '正在保存…' : label));
      const savePreferences = (part) => {
        const conversation = part === 'conversation' ? draft.conversation : snapshot.preferences.conversation;
        const workspaceId = part === 'workspace' ? draft.workspaceId : snapshot.preferences.workspace?.id ?? null;
        return save('preferences', { expectedRevision: snapshot.preferences.revision, workspaceId, conversation });
      };
      function content() {
        if (loading) return h('p', { role: 'status' }, '正在读取设置…');
        if (!snapshot || !draft) return null;
        if (active === 'core') return h(React.Fragment, null,
          h(Card, { title: '身份与角色', note: snapshot.workspace.state === 'ready' ? '保存在绑定 Repo 的 .chatpet/SOUL.md；修改在后续请求前加载。' : '保存在 Core 中；初始化工作区后写入 Repo。' }, fields(
            field('角色名称', { value: draft.identity.displayName, onChange: editIdentity('displayName'), wide: true }),
            field('角色设定', { value: draft.identity.character, onChange: editIdentity('character'), multiline: true, wide: true })),
            saveButton('identity', identityDirty, () => save('identity', { expectedRevision: snapshot.identity.revision,
              displayName: draft.identity.displayName, character: draft.identity.character }), '保存角色')),
          h(Card, { title: '共同策略' },
            h('label', { style: { display: 'flex', gap: 10, alignItems: 'center', fontSize: 13 } },
              h('input', { type: 'checkbox', checked: draft.quiet, disabled: Boolean(busy), style: { width: 'auto' },
                onChange: event => setDraft(old => ({ ...old, quiet: event.target.checked })) }), '安静模式'),
            h('p', { className: 'cp-muted' }, '抑制主动联系，保留正常回复。自主活动尚未接通，目前保持暂停。'),
            saveButton('quiet', quietDirty, () => save('quiet', { expectedRevision: snapshot.policy.revision, quiet: draft.quiet }), '保存策略')),
          h(Card, { title: '用户资料', note: '保存在 .chatpet/USER.md，仅填写你确认供大肥鱼使用的资料。' },
            field('用户资料内容', { value: draft.profile, multiline: true, wide: true, disabled: snapshot.workspace.state !== 'ready', onChange: value => setDraft(old => ({ ...old, profile: value })) }),
            snapshot.workspace.state !== 'ready' && h('p', { className: 'cp-muted' }, '请先绑定并初始化工作区。'),
            saveButton('profile', profileDirty && snapshot.workspace.state === 'ready', () => save('profile', {
              expectedRevision: snapshot.profile.revision, text: draft.profile }), '保存用户资料')));
        if (active === 'workspace') {
          const missing = draft.workspaceId && !snapshot.workspaces.some(row => row.id === draft.workspaceId);
          return h(React.Fragment, null,
            h(Card, { title: '绑定工作区', note: '从 DSH 的真实工作区列表选择绑定目标。' },
              h('label', { className: 'cp-field' }, 'DSH 工作区',
                h('select', { value: draft.workspaceId ?? '', disabled: Boolean(busy) || !snapshot.workspaceAvailable,
                  onChange: event => setDraft(old => ({ ...old, workspaceId: event.target.value || null })) },
                  h('option', { value: '' }, '不绑定工作区'),
                  missing && h('option', { value: draft.workspaceId, disabled: true }, '已保存的工作区不存在，请重新选择'),
                  ...snapshot.workspaces.map(row => h('option', { key: row.id, value: row.id, disabled: row.state !== 'ok' }, `${row.title} · ${row.path}${row.state === 'ok' ? '' : '（目录不可用）'}`)))),
              !snapshot.workspaceAvailable && h('p', { role: 'status' }, 'DSH 工作区服务尚未就绪，请稍后刷新。'),
              h('p', { className: 'cp-muted' }, snapshot.preferences.workspace ? `已保存：${snapshot.preferences.workspace.title} · ${snapshot.preferences.workspace.path}` : '当前未保存工作区绑定。'),
              h('p', { className: 'cp-muted' }, '绑定后创建 .chatpet 资料目录，保留已有项目文件。已有资料先校验，再加载。'),
              otherWorkspaceDrafts && h('p', { className: 'cp-muted' }, '请先保存或刷新其他设置草稿，再切换或初始化工作区。'),
              saveButton('preferences', workspaceDirty && snapshot.workspaceAvailable && !otherWorkspaceDrafts, () => savePreferences('workspace'), '绑定并初始化')),
            h(Card, { title: 'Repo 资料', status: { unbound: '未绑定', pending: '待初始化', ready: '已加载', unavailable: '不可用' }[snapshot.workspace.state] },
              h('p', { className: 'cp-muted' }, snapshot.workspace.error || (snapshot.workspace.state === 'ready'
                ? '.chatpet/ 中的人格、用户资料和配置已经加载。真实执行状态由 DSH 与 Core 管理，长期记忆由 Memory 管理。' : '初始化会生成 README.md、manifest.json、SOUL.md、USER.md 和 core.json。')),
              saveButton('initialize', Boolean(snapshot.preferences.workspace) && !workspaceDirty && !otherWorkspaceDrafts,
                () => save('initialize', { expectedPreferencesRevision: snapshot.preferences.revision }), '检查并初始化资料目录')),
            h(Card, { title: '原生会话入口', status: snapshot.nativeConversationReady ? '已就绪' : '未就绪' },
              h('p', null, snapshot.nativeConversationReady
                ? '在已绑定工作区直接聊天即可，角色资料和事项工具自动加载；不需要切换模式。其他工作区保持原样。'
                : '请先初始化 Repo，并确认 00-Core 正常启用。')));
        }
        if (active === 'execution') return h(React.Fragment, null,
          h(Card, { title: '模型与工具' }, h('p', null, '使用 DSH 原生会话中的模型选择器和工具权限设置，此处不重复保存账号或密钥。')),
          h(Card, { title: 'Core 对话执行限制', note: '保存后用于后续 Core 执行；不改写其他 DSH 会话的限制。' },
            fields(...[
              ['maxHistoryMessages','上下文消息数',0,200], ['maxContextChars','上下文字符数',2048,128000],
              ['maxSteps','单次执行步数',1,64], ['maxToolCalls','工具调用次数',0,128], ['maxDurationMs','单次执行时长（毫秒）',1000,600000],
            ].map(([key,label,min,max]) => field(label, { type: 'number', min, max, value: draft.conversation[key],
              onChange: value => setDraft(old => ({ ...old, conversation: { ...old.conversation, [key]: value === '' ? '' : Number(value) } })) }))),
            saveButton('preferences', conversationDirty, () => savePreferences('conversation'), '保存执行限制')));
        if (active === 'modules') {
          const labels = { ready: '可用', degraded: '部分可用', unavailable: '不可用', disabled: '已停用', initializing: '初始化中', not_implemented: '尚未实现' };
          const modules = [['memory','记忆'],['life','生活'],['desktop','桌面'],['qq','QQ'],['bilibili','哔哩哔哩'],['voice','语音']];
          return h('section', { 'aria-label': '模块实际状态', className: 'cp-modules' }, ...modules.map(([id,label]) => {
            const states = snapshot.capabilities.filter(row => row.owner === id);
            const state = states.find(row => row.state === 'ready')?.state ?? states[0]?.state;
            return h('article', { key: id, className: 'cp-module' }, h('div', { className: 'cp-module-title' }, h('strong', null, label), badge(labels[state] ?? '未报告状态')),
              h('p', { className: 'cp-muted' }, '由对应模块提供能力和设置。'));
          }));
        }
        return h(Card, { title: '数据维护', status: '完整流程待接入' },
          h('p', null, '现有 Core 只提供部分导出和本地检查点。完整备份与恢复尚未完成，此处暂不开放维护操作。'));
      }
      function keyDown(event, index) {
        const target = event.key === 'Home' ? 0 : event.key === 'End' ? sections.length - 1
          : event.key === 'ArrowRight' ? (index + 1) % sections.length
          : event.key === 'ArrowLeft' ? (index + sections.length - 1) % sections.length : null;
        if (target === null) return; event.preventDefault(); setActive(sections[target][0]); tabs.current[target]?.focus();
      }
      return h('div', { className: 'chatpet-settings' }, h('style', null, css),
        h('header', { className: 'cp-heading' }, h('div', null, h('h2', null, 'dsh-Chatpet'), h('p', { className: 'cp-muted' }, '管理身份、工作区和 Core 执行设置。')), badge(dirty ? '有未保存修改' : snapshot ? '已读取设置' : '正在连接')),
        h('div', { role: 'tablist', 'aria-label': 'Chatpet 设置分类', className: 'cp-tabs' }, ...sections.map(([id,title],index) => h('button', {
          key: id, id: `${prefix}-${id}-tab`, type: 'button', role: 'tab', className: 'cp-tab', 'aria-selected': active === id,
          'aria-controls': `${prefix}-${id}-panel`, tabIndex: active === id ? 0 : -1, ref: element => { tabs.current[index] = element; },
          onClick: () => setActive(id), onKeyDown: event => keyDown(event,index), disabled: Boolean(busy) }, title))),
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
          const timer = setTimeout(abort, 15000);
          try {
            const answer = await ctx.connection.rpc.call('/api', `chatpetSettings/${endpoint}`,
              { requestId: crypto.randomUUID(), input }, controller.signal);
            if (!answer.ok) throw Object.assign(new Error(answer.error.message), { code: answer.error.code });
            return answer.value;
          } catch (failure) {
            if (failure.code && !failure.code.startsWith('gateway/')) throw failure;
            throw new Error(endpoint === 'snapshot' ? '无法读取设置，请检查 00-Core 和连接状态后重试。' : '保存结果未确认，请刷新核对实际状态后再操作。');
          } finally { clearTimeout(timer); signal?.removeEventListener('abort', abort); }
        };
        ctx.slots.inject('settings.section', () => ctx.slots.register({
          name: 'settings.section', id: 'dsh-Chatpet', order: 40, label: 'dsh-Chatpet', inject: () => ({ request }),
        }, SettingsPage));
        ctx.slots.inject('settings.section.icon', () => ctx.slots.register({
          name: 'settings.section.icon', id: 'dsh-Chatpet',
        }, SettingsIcon));
      },
    };
  },
});
