window.__ModuleLoader__.load({
  id: 'dsh-personalos-workbench',
  factory(require) {
    const React = require('react');
    const { useCallback, useEffect, useRef, useState } = React;
    const h = React.createElement;

    const ROUTE = '/api/personalos-workbench';
    const CATEGORIES = ['AI 技术', '阅读与认知', '产业与商业', '方法论', '随想'];
    const C = {
      text: 'var(--dsw-alias-text-1, #e8e8e8)',
      sub: 'var(--dsw-alias-text-2, #9ba1a6)',
      dim: 'var(--dsw-alias-text-3, #6f767c)',
      line: 'var(--dsw-alias-border-1, rgba(255,255,255,0.10))',
      card: 'var(--dsw-alias-bg-2, rgba(255,255,255,0.035))',
      card2: 'var(--dsw-alias-bg-3, rgba(255,255,255,0.06))',
      input: 'var(--dsw-alias-bg-3, rgba(0,0,0,0.18))',
      accent: 'var(--dsw-alias-brand-primary, #3fbf78)',
      accentSoft: 'var(--dsw-alias-bg-3, rgba(63,191,120,0.15))',
      danger: 'var(--dsw-alias-danger, #e5534b)',
    };
    const TABS = [
      { key: 'home', label: '待办' },
      { key: 'capture', label: '采集' },
      { key: 'notes', label: '笔记' },
    ];
    const CAPTURE_KINDS = [
      { key: 'task', label: '任务' },
      { key: 'collection', label: '收藏' },
      { key: 'note', label: '笔记' },
    ];
    const NO_WINDOW_CONFIRM = () => !(typeof window !== 'undefined' && typeof window.confirm === 'function');

    // 视觉层：用 data-pos 属性选择器补齐内联样式做不到的 hover / focus / 过渡。
    // 结构逻辑仍然全部走内联 style，不引入外部样式表，也不污染宿主全局选择器。
    const PANEL_CSS = `
[data-pos-root] ::selection{background:rgba(63,191,120,.26)}
[data-pos-btn]{display:inline-flex;align-items:center;justify-content:center;gap:6px;height:32px;padding:0 14px;border-radius:9px;border:1px solid var(--dsw-alias-border-1,rgba(255,255,255,.1));background:transparent;color:var(--dsw-alias-text-1,#e8e8e8);font:inherit;font-size:12.5px;line-height:1;cursor:pointer;white-space:nowrap;transition:background .14s ease,border-color .14s ease,opacity .14s ease}
[data-pos-btn]:hover:not(:disabled){background:rgba(127,127,127,.13)}
[data-pos-btn]:focus-visible{outline:2px solid rgba(63,191,120,.5);outline-offset:2px}
[data-pos-btn]:disabled{opacity:.4;cursor:not-allowed}
[data-pos-btn][data-kind=primary]{background:var(--dsw-alias-brand-primary,#3fbf78);border-color:transparent;color:#07130c;font-weight:600}
[data-pos-btn][data-kind=primary]:hover:not(:disabled){filter:brightness(1.07);background:var(--dsw-alias-brand-primary,#3fbf78)}
[data-pos-btn][data-kind=soft]{background:rgba(63,191,120,.13);border-color:transparent;color:var(--dsw-alias-brand-primary,#3fbf78);font-weight:560}
[data-pos-btn][data-kind=soft]:hover:not(:disabled){background:rgba(63,191,120,.2)}
[data-pos-icon]{display:inline-flex;align-items:center;justify-content:center;width:30px;height:30px;padding:0;border-radius:9px;border:1px solid var(--dsw-alias-border-1,rgba(255,255,255,.1));background:transparent;color:var(--dsw-alias-text-2,#9ba1a6);font:inherit;font-size:14px;line-height:1;cursor:pointer;transition:background .14s ease,color .14s ease,border-color .14s ease}
[data-pos-icon]:hover:not(:disabled){background:rgba(127,127,127,.13);color:var(--dsw-alias-text-1,#e8e8e8)}
[data-pos-icon]:focus-visible{outline:2px solid rgba(63,191,120,.5);outline-offset:2px}
[data-pos-icon]:disabled{opacity:.4;cursor:not-allowed}
[data-pos-seg]{display:inline-flex;align-items:center;gap:2px;padding:3px;border-radius:11px;background:var(--dsw-alias-bg-2,rgba(255,255,255,.04));border:1px solid var(--dsw-alias-border-1,rgba(255,255,255,.1))}
[data-pos-seg]>button{height:27px;padding:0 14px;border:0;border-radius:8px;background:transparent;color:var(--dsw-alias-text-2,#9ba1a6);font:inherit;font-size:12.5px;line-height:1;cursor:pointer;transition:background .14s ease,color .14s ease}
[data-pos-seg]>button:hover{color:var(--dsw-alias-text-1,#e8e8e8);background:rgba(127,127,127,.1)}
[data-pos-seg]>button[data-active=true]{background:rgba(63,191,120,.16);color:var(--dsw-alias-brand-primary,#3fbf78);font-weight:600}
[data-pos-card]{background:var(--dsw-alias-bg-2,rgba(255,255,255,.035));border:1px solid var(--dsw-alias-border-1,rgba(255,255,255,.1));border-radius:14px;box-shadow:0 1px 0 rgba(255,255,255,.03) inset,0 18px 40px -34px rgba(0,0,0,.65)}
[data-pos-scroll]{scrollbar-width:thin;scrollbar-color:rgba(127,127,127,.35) transparent}
[data-pos-scroll]::-webkit-scrollbar{width:8px;height:8px}
[data-pos-scroll]::-webkit-scrollbar-thumb{background:rgba(127,127,127,.32);border-radius:8px;border:2px solid transparent;background-clip:content-box}
[data-pos-row]{transition:background .12s ease}
[data-pos-row]:hover{background:rgba(127,127,127,.08)}
[data-pos-row]:hover [data-pos-actions]{opacity:1}
[data-pos-actions]{opacity:.3;transition:opacity .12s ease}
[data-pos-input]{transition:border-color .14s ease,box-shadow .14s ease}
[data-pos-input]:focus-within{border-color:rgba(63,191,120,.5)!important;box-shadow:0 0 0 3px rgba(63,191,120,.1)}
[data-pos-area]{transition:border-color .14s ease,box-shadow .14s ease;scrollbar-width:thin}
[data-pos-area]:focus{border-color:rgba(63,191,120,.48)!important;box-shadow:0 0 0 4px rgba(63,191,120,.09);outline:none}
[data-pos-tree] button{transition:background .12s ease,color .12s ease}
[data-pos-toast]{backdrop-filter:blur(12px);box-shadow:0 16px 44px rgba(0,0,0,.36)}
`;

    // 按业务容器真实宽度做响应式，不依赖整页宽度。
    function usePanelWidth(ref) {
      const [width, setWidth] = useState(0);
      useEffect(() => {
        const element = ref.current;
        if (!element) return undefined;
        setWidth(element.clientWidth || 0);
        if (typeof ResizeObserver === 'undefined') return undefined;
        const observer = new ResizeObserver((entries) => {
          setWidth(entries[0]?.contentRect?.width ?? element.clientWidth ?? 0);
        });
        observer.observe(element);
        return () => observer.disconnect();
      }, [ref]);
      return width;
    }

    async function api(pathname, options = {}) {
      const response = await fetch(`${ROUTE}${pathname}`, {
        cache: 'no-store',
        headers: { 'content-type': 'application/json' },
        ...options,
      });
      let payload = null;
      try {
        payload = await response.json();
      } catch {
        payload = null;
      }
      if (!response.ok || !payload || payload.ok === false) {
        throw new Error(payload?.error || `请求失败（${response.status}）`);
      }
      return payload;
    }

    function fileToBase64(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || '').replace(/^data:[^,]+,/, ''));
        reader.onerror = () => reject(reader.error || new Error('读取图片失败'));
        reader.readAsDataURL(file);
      });
    }

    function pickImageFile(event) {
      const items = event?.clipboardData?.items;
      if (!items) return null;
      for (const item of items) {
        if (item?.kind === 'file' && String(item.type || '').startsWith('image/')) {
          return item.getAsFile ? item.getAsFile() : item;
        }
      }
      return null;
    }

    function extOf(file) {
      const subtype = String(file?.type || '').replace('image/', '');
      return ({ jpeg: 'jpg', svg: 'svg', png: 'png', webp: 'webp', gif: 'gif' })[subtype] || 'png';
    }

    async function uploadImage(file) {
      const data = await fileToBase64(file);
      const res = await api('/notes/upload', {
        method: 'POST',
        body: JSON.stringify({ name: `图片-${Date.now()}.${extOf(file)}`, data }),
      });
      return res;
    }

    function insertText(value, setValue, ref, snippet) {
      const element = ref?.current;
      const start = element && typeof element.selectionStart === 'number' ? element.selectionStart : value.length;
      const end = element && typeof element.selectionEnd === 'number' ? element.selectionEnd : value.length;
      setValue(`${value.slice(0, start)}${snippet}${value.slice(end)}`);
      if (typeof requestAnimationFrame === 'function') {
        requestAnimationFrame(() => {
          if (!element) return;
          element.focus();
          const position = start + snippet.length;
          try { element.setSelectionRange(position, position); } catch { /* ignore */ }
        });
      }
    }

    // ── 基础组件 ──────────────────────────────────────────────
    function Btn({ children, onClick, variant = 'ghost', disabled, title, type = 'button' }) {
      return h('button', {
        type, onClick, disabled, title,
        'data-pos': 'btn',
        'data-kind': variant === 'primary' ? 'primary' : variant === 'soft' ? 'soft' : 'ghost',
      }, children);
    }

    function IconBtn({ title, onClick, children, disabled }) {
      return h('button', {
        type: 'button', title, onClick, disabled, 'data-pos': 'icon',
      }, children);
    }

    function Segment({ options, value, onChange, stretch }) {
      return h('div', {
        'data-pos': 'seg',
        style: stretch ? { display: 'flex', width: '100%' } : undefined,
      }, options.map((option) => h('button', {
        key: option.key,
        type: 'button',
        'data-active': value === option.key ? 'true' : 'false',
        onClick: () => onChange(option.key),
        style: stretch ? { flex: 1 } : undefined,
      }, option.label)));
    }

    function Circle({ done, onClick, busy }) {
      return h('button', {
        type: 'button', onClick, disabled: busy, title: done ? '已完成' : '完成',
        style: {
          width: 19, height: 19, minWidth: 19, marginTop: 2, padding: 0, borderRadius: '50%',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          border: `1.5px solid ${done ? C.accent : C.line}`, background: done ? C.accent : 'transparent',
          color: '#07130c', fontSize: 11, lineHeight: '15px', cursor: busy ? 'not-allowed' : 'pointer',
          transition: 'border-color .14s ease,background .14s ease,transform .1s ease',
        },
      }, done ? '✓' : '');
    }

    function Chip({ children, tone = 'muted', title }) {
      const isAccent = tone === 'accent';
      return h('span', {
        title,
        style: {
          display: 'inline-flex', alignItems: 'center', gap: 4, height: 20, padding: '0 8px',
          borderRadius: 999, fontSize: 11, lineHeight: '18px', whiteSpace: 'nowrap',
          color: isAccent ? C.accent : C.sub,
          background: isAccent ? 'rgba(63,191,120,0.13)' : 'var(--dsw-alias-bg-3, rgba(255,255,255,0.06))',
          border: `1px solid ${isAccent ? 'transparent' : C.line}`,
        },
      }, children);
    }

    function TaskRow({ item, index, scope, busy, onToggle, onEdit, onDelete, onMoveToday }) {
      const [editing, setEditing] = useState(false);
      const [draft, setDraft] = useState(item.title);
      const inputRef = useRef(null);
      const editSettledRef = useRef(false);
      useEffect(() => { setDraft(item.title); }, [item.title]);
      useEffect(() => { if (editing && inputRef.current) inputRef.current.focus(); }, [editing]);
      const commit = () => {
        if (editSettledRef.current) return;
        editSettledRef.current = true;
        setEditing(false);
        const next = draft.trim();
        if (!next || next === item.title) { setDraft(item.title); return; }
        onEdit(next);
      };
      const actionStyle = {
        width: 22, height: 22, padding: 0, border: 'none', borderRadius: 6, background: 'transparent',
        color: C.dim, fontSize: 13, fontFamily: 'inherit', cursor: 'pointer', lineHeight: '22px',
      };
      return h('div', {
        'data-pos': 'row',
        style: { display: 'flex', alignItems: 'flex-start', gap: 10, padding: '7px 8px', borderRadius: 10, opacity: busy ? 0.55 : 1 },
      },
        h(Circle, { done: false, busy, onClick: onToggle }),
        h('div', { style: { flex: 1, minWidth: 0, paddingTop: 1 } },
          editing
            ? h('input', {
              ref: inputRef,
              value: draft,
              onChange: (event) => setDraft(event.target.value),
              onBlur: commit,
              onKeyDown: (event) => {
                if (event.isComposing || event.nativeEvent?.isComposing || event.keyCode === 229) return;
                if (event.key === 'Enter') commit();
                if (event.key === 'Escape') { editSettledRef.current = true; setEditing(false); setDraft(item.title); }
              },
              style: {
                width: '100%', boxSizing: 'border-box', background: C.input, border: `1px solid ${C.line}`,
                borderRadius: 6, color: C.text, fontSize: 13.5, lineHeight: '20px', padding: '2px 7px',
                fontFamily: 'inherit', outline: 'none',
              },
            })
            : h('div', {
              onDoubleClick: () => { if (!busy) { editSettledRef.current = false; setEditing(true); } },
              title: '双击修改',
              style: { fontSize: 13.5, lineHeight: '20px', color: C.text, wordBreak: 'break-word' },
            }, item.title),
          item.url && !editing
            ? h('a', {
              href: item.url, target: '_blank', rel: 'noreferrer', title: '打开链接',
              style: { display: 'inline-block', marginTop: 2, fontSize: 11, color: C.accent, textDecoration: 'none' },
            }, '↗ 链接')
            : null,
        ),
        h('div', { 'data-pos-actions': 'true', style: { display: 'flex', alignItems: 'center', gap: 3 } },
          scope === 'total' && onMoveToday
            ? h('button', {
              type: 'button', title: '安排到今天', disabled: busy, onClick: onMoveToday,
              style: {
                height: 22, padding: '0 6px', border: `1px solid ${C.line}`, borderRadius: 6, background: 'transparent',
                color: C.sub, fontSize: 10.5, fontFamily: 'inherit', cursor: 'pointer', lineHeight: '20px', whiteSpace: 'nowrap',
              },
            }, '今日')
            : null,
          h('button', { type: 'button', title: '删除', disabled: busy, onClick: onDelete, style: actionStyle }, '×'),
        ),
      );
    }

    function TaskColumn({ title, scope, items, doneItems = [], busy, handlers }) {
      const [showDone, setShowDone] = useState(false);
      const [value, setValue] = useState('');
      const [focused, setFocused] = useState(false);
      const inputRef = useRef(null);
      const canAdd = Boolean(value.trim()) && !busy;
      const addingRef = useRef(false);
      const submit = async () => {
        const next = value.trim();
        if (!next || busy || addingRef.current) return;
        addingRef.current = true;
        try {
          await handlers.onAdd?.(scope, next);
          setValue((current) => current.trim() === next ? '' : current);
          inputRef.current?.focus();
        } catch { /* keep the input for retry; HomeTab displays the error */ }
        finally { addingRef.current = false; }
      };
      return h('section', {
        'data-pos': 'card',
        style: {
          display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0, padding: '13px 14px 10px',
        },
      },
        h('header', { style: { display: 'flex', alignItems: 'center', gap: 8, paddingBottom: 9 } },
          h('span', { style: { fontSize: 13.5, fontWeight: 600, letterSpacing: 0.2, color: C.text } }, title),
          h(Chip, null, String(items.length)),
          h('div', { style: { flex: 1 } }),
          h('button', {
            type: 'button', title: '添加任务', onClick: () => inputRef.current?.focus(),
            style: {
              width: 24, height: 24, padding: 0, border: 'none', borderRadius: 7, background: 'transparent',
              color: C.sub, fontSize: 15, lineHeight: '24px', fontFamily: 'inherit', cursor: 'pointer',
            },
          }, '＋'),
        ),
        h('div', {
          style: { height: 3, borderRadius: 3, background: 'rgba(127,127,127,0.18)', overflow: 'hidden', marginBottom: 11 },
        },
          h('div', {
            style: {
              width: `${Math.round((doneItems.length / Math.max(1, items.length + doneItems.length)) * 100)}%`,
              height: '100%', borderRadius: 3, background: C.accent, transition: 'width .3s ease',
            },
          }),
        ),
        h('div', {
          'data-pos': 'input',
          style: {
            display: 'flex', alignItems: 'center', gap: 6, marginBottom: 9, padding: '3px 4px 3px 11px',
            background: C.input, border: `1px solid ${C.line}`, borderRadius: 10,
          },
        },
          h('input', {
            ref: inputRef,
            value,
            onChange: (event) => setValue(event.target.value),
            onFocus: () => setFocused(true),
            onBlur: () => setFocused(false),
            onKeyDown: (event) => {
              if (event.isComposing || event.nativeEvent?.isComposing || event.keyCode === 229) return;
              if (event.key === 'Enter') submit();
              if (event.key === 'Escape') setValue('');
            },
            placeholder: '添加任务，回车确认',
            style: {
              flex: 1, minWidth: 0, height: 30, background: 'transparent', border: 'none',
              color: C.text, fontSize: 13, fontFamily: 'inherit', outline: 'none', padding: 0,
            },
          }),
          h('button', {
            type: 'button', onClick: submit, disabled: !canAdd, title: '添加',
            style: {
              flex: '0 0 auto', width: 28, height: 28, padding: 0, border: 'none', borderRadius: 8,
              background: canAdd ? C.accent : 'transparent', color: canAdd ? '#07130c' : C.dim,
              fontSize: 14, lineHeight: '28px', fontFamily: 'inherit', cursor: canAdd ? 'pointer' : 'default',
              transition: 'background .14s ease',
            },
          }, '＋'),
        ),
        h('div', { 'data-pos-scroll': 'true', style: { flex: 1, minHeight: 0, overflowY: 'auto', margin: '0 -4px', padding: '0 4px' } },
          items.length === 0
            ? h('div', { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, padding: '30px 0', textAlign: 'center' } },
              h('div', {
                style: {
                  width: 34, height: 34, borderRadius: '50%', border: `1px dashed ${C.line}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.dim, fontSize: 15,
                },
              }, '✓'),
              h('div', { style: { fontSize: 12.5, color: C.sub } }, '还没有任务'),
              h('div', { style: { fontSize: 11.5, color: C.dim, opacity: 0.85 } }, '在上方输入框添加一条'))
            : items.map((item, index) => h(TaskRow, {
              key: `${scope}-${index}-${item.title}`,
              item,
              index,
              scope,
              busy,
              onToggle: () => handlers.onToggle?.(scope, index),
              onEdit: (next) => handlers.onEdit?.(scope, index, next),
              onDelete: () => handlers.onDelete?.(scope, index, item.title),
              onMoveToday: scope === 'total' ? () => handlers.onMoveToday?.(index) : null,
            })),
        ),
        doneItems.length > 0
          ? h('div', { style: { display: 'flex', alignItems: 'center', gap: 6, paddingTop: 7 } },
            h('button', {
              type: 'button', onClick: () => setShowDone((prev) => !prev),
              style: {
                display: 'inline-flex', alignItems: 'center', gap: 5, border: 'none', background: 'transparent',
                color: C.dim, fontSize: 11.5, fontFamily: 'inherit', cursor: 'pointer', padding: '2px 0',
              },
              title: showDone ? '收起已完成' : '展开已完成',
            }, `${showDone ? '▾' : '▸'} 已完成 ${doneItems.length}`),
          )
          : null,
        showDone && doneItems.length > 0
          ? h('div', { 'data-pos-scroll': 'true', style: { maxHeight: 148, overflowY: 'auto', marginTop: 2 } }, doneItems.map((item, index) => h('div', {
            key: `done-${index}-${item.title}`,
            style: { display: 'flex', alignItems: 'baseline', gap: 8, padding: '5px 8px', color: C.dim, fontSize: 12.5, lineHeight: '18px' },
          },
            h('span', { style: { color: C.accent, fontSize: 11 } }, '✓'),
            h('span', { style: { flex: 1, minWidth: 0, wordBreak: 'break-word' } }, item.title),
            item.time ? h('span', { style: { fontSize: 10.5, whiteSpace: 'nowrap' } }, item.time) : null,
          )))
          : null,
      );
    }

    function HomeTab({ data, busy, run, notify, compact }) {
      const open = (payload) => {
        return Promise.resolve(run(payload)).catch((error) => {
          notify?.(String(error?.message ?? error));
          if (payload.action === 'add_task') throw error;
        });
      };
      const handlers = {
        onAdd: (scope, title) => open({ action: 'add_task', scope, title }),
        onToggle: (scope, index) => open({ action: 'toggle_task', scope, index }),
        onEdit: (scope, index, title) => open({ action: 'edit_task', scope, index, title }),
        onMoveToday: (index) => open({ action: 'move_to_today', index }),
        onDelete: (scope, index, title) => {
          if (!NO_WINDOW_CONFIRM() && !window.confirm(`删除「${title}」？`)) return;
          open({ action: 'delete_task', scope, index });
        },
      };
      const today = data?.today ?? { open: [], done: [] };
      const total = data?.total ?? { open: [], done: [] };
      return h('div', {
        style: {
          flex: 1, minHeight: 0, display: 'grid', gap: 14,
          gridTemplateColumns: compact ? 'minmax(0, 1fr)' : 'repeat(2, minmax(0, 1fr))',
          gridAutoRows: 'minmax(0, 1fr)',
        },
      },
        h(TaskColumn, { title: '今日', scope: 'today', items: today.open, doneItems: today.done, busy, handlers }),
        h(TaskColumn, { title: '总待办', scope: 'total', items: total.open, doneItems: total.done, busy, handlers }),
      );
    }

    function CaptureTab({ busy, capture, notify, categories = CATEGORIES, compact }) {
      const [kind, setKind] = useState('task');
      const [category, setCategory] = useState('');
      const [text, setText] = useState('');
      const [uploading, setUploading] = useState(false);
      const areaRef = useRef(null);
      const disabled = busy || uploading;

      const handlePaste = async (event) => {
        const file = pickImageFile(event);
        if (!file) return;
        event.preventDefault();
        setUploading(true);
        try {
          const res = await uploadImage(file);
          insertText(text, setText, areaRef, `![[${res.name}]]`);
          notify?.(`已插入 ${res.name}`);
        } catch (error) {
          notify?.(String(error?.message ?? error));
        } finally {
          setUploading(false);
        }
      };

      const save = async () => {
        const value = text.trim();
        if (!value || disabled) return;
        try {
          const res = await capture(kind, value, kind === 'note' ? category : '');
          setText('');
          notify?.(res?.message || '已保存');
        } catch (error) {
          notify?.(String(error?.message ?? error));
        }
      };

      const placeholder = kind === 'task'
        ? '一行一条任务。最后一行可以写指令，例如（以上都放今日）或（前 3 个放今日）'
        : kind === 'note'
          ? '粘贴笔记原文。末尾可写（放到方法论）或（标题：xxx）'
          : '粘贴链接或想收藏的内容，会自动生成学习任务';
      const hint = kind === 'task'
        ? 'Ctrl+Enter 保存 · 指令行按规则识别，不会当成任务'
        : kind === 'note'
          ? 'Ctrl+Enter 保存 · 自动起标题、分类、排版'
          : 'Ctrl+Enter 保存 · 自动生成「学习：…」任务';

      return h('div', { style: { flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 } },
        h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', width: '100%', maxWidth: compact ? '100%' : 940 } },
          h(Segment, { options: CAPTURE_KINDS, value: kind, onChange: setKind }),
          kind === 'note'
            ? h('select', {
              value: category,
              onChange: (event) => setCategory(event.target.value),
              style: {
                height: 32, padding: '0 10px', borderRadius: 9, border: `1px solid ${C.line}`,
                background: 'var(--dsw-alias-bg-3, rgba(0,0,0,0.18))', color: category ? C.text : C.sub,
                fontSize: 12.5, fontFamily: 'inherit', outline: 'none', cursor: 'pointer',
              },
            }, h('option', { value: '' }, '自动分类'), categories.map((name) => h('option', { key: name, value: name }, name)))
            : null,
          h('div', { style: { flex: 1 } }),
        ),
        h('textarea', {
          ref: areaRef,
          value: text,
          placeholder,
          onChange: (event) => setText(event.target.value),
          onPaste: handlePaste,
          onKeyDown: (event) => {
            if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
              event.preventDefault();
              save();
            }
          },
          spellCheck: false,
          'data-pos': 'area',
          style: {
            flex: 1, minHeight: 200, width: '100%', maxWidth: compact ? '100%' : 940, boxSizing: 'border-box', resize: 'none',
            background: 'var(--dsw-alias-bg-2, rgba(255,255,255,0.035))',
            border: `1px solid ${C.line}`, borderRadius: 14, padding: '16px 18px',
            color: C.text, fontSize: 14, lineHeight: '24px', fontFamily: 'inherit', outline: 'none',
            boxShadow: '0 18px 40px -34px rgba(0,0,0,.65)',
          },
        }),
        h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', width: '100%', maxWidth: compact ? '100%' : 940 } },
          uploading ? h('span', { style: { fontSize: 11.5, color: C.accent } }, '图片上传中…') : null,
          h('span', { style: { fontSize: 11.5, color: C.dim } }, hint),
          h('div', { style: { flex: 1 } }),
          h(Btn, { variant: 'primary', onClick: save, disabled: disabled || !text.trim() }, '保存并整理'),
        ),
      );
    }

    function TreeNode({ node, depth = 0, active = '', onOpen }) {
      const isDir = node?.type === 'dir' || node?.dir === true || Array.isArray(node?.children);
      const [open, setOpen] = useState(true);
      const children = Array.isArray(node?.children) ? node.children : [];
      const indent = 9 + depth * 13;
      const isActive = Boolean(active && active === node?.path);
      const rowStyle = {
        display: 'flex', alignItems: 'center', gap: 6, height: 28, paddingLeft: indent, paddingRight: 8,
        borderRadius: 8, cursor: 'pointer', fontSize: 12.5, fontFamily: 'inherit', border: 'none',
        background: isActive ? 'rgba(63,191,120,0.15)' : 'transparent',
        color: isActive ? C.text : C.sub, textAlign: 'left', width: '100%',
        overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
        fontWeight: isActive ? 550 : 400,
      };
      if (isDir) {
        return h('div', null,
          h('button', {
            type: 'button',
            onClick: () => { setOpen((prev) => !prev); onOpen?.(node); },
            style: rowStyle,
          },
            h('span', { style: { width: 10, fontSize: 9, color: C.dim, transform: open ? 'rotate(90deg)' : 'none', transition: 'transform .12s' } }, '▸'),
            h('span', { style: { overflow: 'hidden', textOverflow: 'ellipsis' } }, node.name),
          ),
          open ? children.map((child, index) => h(TreeNode, {
            key: `${child.path || child.name}-${index}`,
            node: child,
            depth: depth + 1,
            active,
            onOpen,
          })) : null,
        );
      }
      return h('button', {
        type: 'button',
        title: node?.path || node?.name,
        onClick: () => onOpen?.(node),
        style: Object.assign({}, rowStyle, { paddingLeft: indent + 16 }),
      }, node?.name);
    }

    function askText(message, initial = '') {
      if (typeof window === 'undefined' || typeof window.prompt !== 'function') return initial || '';
      const value = window.prompt(message, initial);
      return value === null ? null : String(value);
    }

    function NotesTab({ busy, notify, width = 0 }) {
      const compact = width > 0 && width < 860;
      const treeWidth = width >= 1400 ? 320 : width >= 1150 ? 280 : 250;
      const [tree, setTree] = useState([]);
      const [active, setActive] = useState('');
      const [selected, setSelected] = useState(null);
      const [content, setContent] = useState('');
      const [dirty, setDirty] = useState(false);
      const [saving, setSaving] = useState(false);
      const areaRef = useRef(null);

      const loadTree = useCallback(async () => {
        const res = await api('/notes/tree');
        setTree(res.tree || []);
      }, []);

      useEffect(() => {
        loadTree().catch((error) => notify?.(String(error?.message ?? error)));
      }, [loadTree, notify]);

      const openNode = async (node) => {
        if (!node?.path) return;
        setSelected({ path: node.path, name: node.name, type: node.type });
        if (node.type !== 'file') return;
        try {
          const res = await api(`/notes/file?path=${encodeURIComponent(node.path)}`);
          setActive(node.path);
          setContent(res.content || '');
          setDirty(false);
        } catch (error) {
          notify?.(String(error?.message ?? error));
        }
      };

      const save = async () => {
        if (!active || saving) return;
        setSaving(true);
        try {
          await api('/notes/save', { method: 'POST', body: JSON.stringify({ path: active, content }) });
          setDirty(false);
          await loadTree();
          notify?.('已保存');
        } catch (error) {
          notify?.(String(error?.message ?? error));
        } finally {
          setSaving(false);
        }
      };

      const tidy = async () => {
        try {
          const res = await api('/notes/tidy', { method: 'POST', body: JSON.stringify({ text: content }) });
          setContent(res.text || content);
          setDirty(true);
        } catch (error) {
          notify?.(String(error?.message ?? error));
        }
      };

      const selectedDir = () => {
        if (!selected) return '知识库/随想';
        if (selected.type === 'file') return selected.path.split('/').slice(0, -1).join('/');
        return selected.path;
      };

      const createNote = async () => {
        const name = askText('笔记标题（留空则自动命名）', '');
        if (name === null) return;
        try {
          const res = await api('/notes/new', { method: 'POST', body: JSON.stringify({ dir: selectedDir(), name }) });
          await loadTree();
          await openNode({ path: res.path, name: res.title, type: 'file' });
          notify?.(res.message || '已新建笔记');
        } catch (error) {
          notify?.(String(error?.message ?? error));
        }
      };

      const createDir = async () => {
        const name = askText('新目录名（建在知识库下）', '');
        if (name === null || !name.trim()) return;
        try {
          const res = await api('/notes/mkdir', { method: 'POST', body: JSON.stringify({ name }) });
          await loadTree();
          notify?.(res.message || '已新建目录');
        } catch (error) {
          notify?.(String(error?.message ?? error));
        }
      };

      const renameNode = async () => {
        if (!selected) { notify?.('先在左侧选中一个文件或目录'); return; }
        const next = askText(`把「${selected.name}」改成：`, selected.name);
        if (next === null || !next.trim() || next.trim() === selected.name) return;
        try {
          const endpoint = selected.type === 'dir' ? '/notes/rename-dir' : '/notes/rename';
          const res = await api(endpoint, { method: 'POST', body: JSON.stringify({ path: selected.path, name: next.trim() }) });
          await loadTree();
          if (selected.type === 'dir') {
            setSelected({ ...selected, path: res.path || selected.path, name: next.trim() });
          } else {
            await openNode({ path: res.path, name: next.trim(), type: 'file' });
          }
          notify?.(res.message || '已重命名');
        } catch (error) {
          notify?.(String(error?.message ?? error));
        }
      };

      const moveNode = async () => {
        if (!selected || selected.type !== 'file') { notify?.('先选中一篇笔记再移动'); return; }
        try {
          const res = await api('/notes/targets');
          const targets = res.targets || [];
          if (!targets.length) { notify?.('知识库里还没有分类目录'); return; }
          const list = targets.map((item, index) => `${index + 1}. ${item.name}`).join('\n');
          const input = askText(`移动到哪个目录？填序号或目录名\n${list}`, '1');
          if (input === null || !input.trim()) return;
          const picked = targets[Number(input.trim()) - 1]
            || targets.find((item) => item.path === input.trim() || item.name === input.trim());
          if (!picked) { notify?.('没找到这个目录'); return; }
          const result = await api('/notes/move', { method: 'POST', body: JSON.stringify({ path: selected.path, targetDir: picked.path }) });
          await loadTree();
          await openNode({ path: result.path || selected.path, name: selected.name, type: 'file' });
          notify?.('已移动');
        } catch (error) {
          notify?.(String(error?.message ?? error));
        }
      };

      const removeNode = async () => {
        if (!selected) { notify?.('先在左侧选中一个文件或目录'); return; }
        if (!NO_WINDOW_CONFIRM() && !window.confirm(`删除「${selected.name}」？`)) return;
        try {
          const endpoint = selected.type === 'dir' ? '/notes/delete-dir' : '/notes/delete';
          await api(endpoint, { method: 'POST', body: JSON.stringify({ path: selected.path }) });
          if (active === selected.path) { setActive(''); setContent(''); setDirty(false); }
          setSelected(null);
          await loadTree();
          notify?.('已删除');
        } catch (error) {
          notify?.(String(error?.message ?? error));
        }
      };

      const handlePaste = async (event) => {
        const file = pickImageFile(event);
        if (!file) return;
        event.preventDefault();
        try {
          const res = await uploadImage(file);
          insertText(content, setContent, areaRef, `![[${res.name}]]`);
          setDirty(true);
          notify?.(`已插入 ${res.name}`);
        } catch (error) {
          notify?.(String(error?.message ?? error));
        }
      };

      const selectedLabel = selected ? `${selected.type === 'dir' ? '目录' : '笔记'}：${selected.name}` : '';
      return h('div', {
        style: {
          flex: 1, minHeight: 0, display: 'grid', gap: 14,
          gridTemplateColumns: compact ? 'minmax(0, 1fr)' : `${treeWidth}px minmax(0, 1fr)`,
          gridTemplateRows: compact ? 'minmax(0, 240px) minmax(0, 1fr)' : undefined,
        },
      },
        h('aside', {
          'data-pos': 'card',
          style: {
            display: 'flex', flexDirection: 'column', minHeight: 0, padding: '11px 9px',
          },
        },
          h('div', { style: { display: 'flex', alignItems: 'center', gap: 6, padding: '0 4px 8px' } },
            h(Btn, { onClick: createNote, disabled: busy, variant: 'soft' }, '新建笔记'),
            h(IconBtn, { title: '新建目录', onClick: createDir, disabled: busy }, '＋'),
            h('div', { style: { flex: 1 } }),
            h(IconBtn, { title: '刷新目录', onClick: () => loadTree().catch(() => {}) }, '↻'),
          ),
          selected
            ? h('div', { style: { display: 'flex', alignItems: 'center', gap: 4, padding: '0 4px 7px' } },
              h('span', {
                title: selected.path,
                style: { flex: 1, minWidth: 0, fontSize: 11, color: C.dim, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' },
              }, selectedLabel),
              h(IconBtn, { title: '重命名', onClick: renameNode, disabled: busy }, '✎'),
              selected.type === 'file' ? h(IconBtn, { title: '移动到分类目录', onClick: moveNode, disabled: busy }, '↦') : null,
              h(IconBtn, { title: selected.type === 'dir' ? '删除空目录' : '删除笔记', onClick: removeNode, disabled: busy }, '×'),
            )
            : h('div', { style: { height: 4 } }),
          h('div', { 'data-pos-scroll': 'true', 'data-pos-tree': 'true', style: { flex: 1, minHeight: 0, overflowY: 'auto', margin: '0 -2px', padding: '0 2px' } },
            tree.length === 0
              ? h('div', { style: { padding: '16px 0', textAlign: 'center', fontSize: 12, color: C.dim } }, '知识库还是空的')
              : tree.map((node, index) => h(TreeNode, { key: `${node.path || node.name}-${index}`, node, depth: 0, active: selected?.path || active, onOpen: openNode })),
          ),
        ),
        h('section', {
          'data-pos': 'card',
          style: { display: 'flex', flexDirection: 'column', minHeight: 0, padding: '11px 14px 12px' },
        },
          h('header', { style: { display: 'flex', alignItems: 'center', gap: 8, paddingBottom: 9, flexWrap: 'wrap' } },
            h(Chip, { tone: active ? 'accent' : 'muted', title: active || selected?.path || '' }, active || (selected ? selected.path : '未选择')),
            dirty ? h('span', { title: '有未保存修改', style: { fontSize: 10, color: C.accent } }, '●') : null,
            h('div', { style: { flex: 1, minWidth: 8 } }),
            h(Btn, { onClick: tidy, disabled: !active || busy }, '整理排版'),
            h(Btn, { onClick: removeNode, disabled: !active || busy }, '删除'),
            h(Btn, { variant: 'primary', onClick: save, disabled: !active || saving }, '保存'),
          ),
          active
            ? h('textarea', {
              ref: areaRef,
              value: content,
              onChange: (event) => { setContent(event.target.value); setDirty(true); },
              onPaste: handlePaste,
              onKeyDown: (event) => {
                if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
                  event.preventDefault();
                  save();
                }
              },
              spellCheck: false,
              'data-pos': 'area',
              style: {
                flex: 1, minHeight: 0, width: '100%', boxSizing: 'border-box', resize: 'none',
                background: 'var(--dsw-alias-bg-3, rgba(0,0,0,0.18))', border: `1px solid ${C.line}`, borderRadius: 12, padding: '16px 18px',
                color: C.text, fontSize: 13.5, lineHeight: '24px', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace', outline: 'none',
              },
            })
            : h('div', {
              style: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10 },
            },
              h('div', {
                style: {
                  width: 40, height: 40, borderRadius: 12, border: `1px dashed ${C.line}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.dim, fontSize: 18,
                },
              }, '📄'),
              h('div', { style: { fontSize: 13, color: C.sub } }, '从左侧选择一篇笔记，或新建一篇'),
              h(Btn, { variant: 'soft', onClick: createNote, disabled: busy }, '新建笔记')),
        ),
      );
    }

    function PersonalOSWorkbench({ chatOpen, onToggleChat, compact, width }) {
      const [data, setData] = useState(null);
      const [tab, setTab] = useState('home');
      const [busy, setBusy] = useState(false);
      const [toast, setToast] = useState('');
      const timerRef = useRef(0);

      const notify = useCallback((message) => {
        setToast(String(message ?? ''));
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => setToast(''), 2800);
      }, []);

      const load = useCallback(async () => {
        const res = await api('/overview');
        setData(res);
        return res;
      }, []);

      useEffect(() => {
        load().catch((error) => notify(String(error?.message ?? error)));
      }, [load, notify]);

      useEffect(() => {
        const onKeyDown = (event) => {
          if (!event.altKey) return;
          if (event.key === '1') { event.preventDefault(); setTab('home'); }
          if (event.key === '2') { event.preventDefault(); setTab('capture'); }
          if (event.key === '3') { event.preventDefault(); setTab('notes'); }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
      }, []);

      const run = useCallback(async (payload) => {
        setBusy(true);
        try {
          const res = await api('/action', { method: 'POST', body: JSON.stringify(payload) });
          if (res.data) setData(res.data);
          return res;
        } finally {
          setBusy(false);
        }
      }, []);

      const capture = useCallback(async (kind, text, category) => {
        setBusy(true);
        try {
          const res = await api('/action', { method: 'POST', body: JSON.stringify({ action: 'capture', kind, text, category }) });
          if (res.data) setData(res.data);
          return res;
        } finally {
          setBusy(false);
        }
      }, []);

      const header = h('header', { style: { display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' } },
        h('div', { style: { display: 'flex', alignItems: 'center', gap: 9, minWidth: 0 } },
          h('span', {
            style: {
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 27, height: 27, borderRadius: 8, flex: '0 0 auto',
              background: 'rgba(63,191,120,0.14)', color: C.accent,
            },
          }, h(PersonalOSIcon)),
          h('span', { style: { fontSize: 16, fontWeight: 650, letterSpacing: 0.2, whiteSpace: 'nowrap' } }, 'PersonalOS'),
          data
            ? h('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', minWidth: 0 } },
              h(Chip, null, data.date),
              h(Chip, { tone: 'accent' }, `今日 ${data.counts?.todayOpen ?? 0}`),
              h(Chip, null, `待办 ${data.counts?.totalOpen ?? 0}`))
            : null,
        ),
        h('div', { style: { flex: 1, minWidth: 8 } }),
        h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, width: compact ? '100%' : 'auto' } },
          h(Segment, { options: TABS, value: tab, onChange: setTab, stretch: compact }),
          h('div', { style: { flex: compact ? 0 : 1 } }),
          onToggleChat
            ? h(Btn, {
              onClick: onToggleChat,
              variant: chatOpen ? 'soft' : 'ghost',
              title: '按需展开 DSH 原生对话；任务与笔记数据不会自动带入对话',
            }, chatOpen ? '收起对话' : 'AI 对话')
            : null,
          h(IconBtn, { title: '刷新', onClick: () => load().catch((error) => notify(String(error?.message ?? error))), disabled: busy }, '↻'),
        ),
      );

      let body = null;
      if (!data) {
        body = h('div', { style: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.dim, fontSize: 13 } }, '正在读取 PersonalOS 数据…');
      } else if (tab === 'home') {
        body = h(HomeTab, { data, busy, run, notify, compact });
      } else if (tab === 'capture') {
        body = h(CaptureTab, { busy, capture, notify, categories: data.knowledge?.categories || CATEGORIES, compact });
      } else {
        body = h(NotesTab, { busy, notify, width: width || (compact ? 0 : 1200) });
      }

      return h('div', {
        'data-pos-root': 'true',
        style: {
          position: 'relative', height: '100%', minHeight: 0, boxSizing: 'border-box',
          display: 'flex', flexDirection: 'column', gap: compact ? 12 : 14,
          padding: compact ? '12px 14px 12px' : '18px 22px 16px',
          color: C.text, fontFamily: 'inherit',
          backgroundImage: 'radial-gradient(1000px 340px at 12% -12%, rgba(63,191,120,0.06), transparent 70%)',
        },
      },
        header,
        body,
        toast
          ? h('div', {
            'data-pos-toast': 'true',
            style: {
              position: 'absolute', left: '50%', bottom: 20, transform: 'translateX(-50%)',
              maxWidth: '82%', padding: '8px 15px', borderRadius: 10,
              background: 'var(--dsw-alias-bg-3, rgba(28,29,31,0.92))',
              border: `1px solid ${C.line}`, color: C.text, fontSize: 12.5,
            },
          }, toast)
          : null,
      );
    }

    function PersonalOSIcon() {
      const svg = (children) => h('svg', {
        width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
        strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round',
      }, children);
      return svg([
        h('path', { key: 'a', d: 'M12 3l7 3v5c0 4.4-2.9 8.3-7 9-4.1-.7-7-4.6-7-9V6l7-3z' }),
        h('path', { key: 'b', d: 'M9 12l2 2 4-4' }),
      ]);
    }

    // ── 工作台外壳：整页业务区 + 按需展开的 DSH 原生对话 ──────────
    function BusinessPanel({ service, entry, active, conversation }) {
      const frameRef = useRef(null);
      const width = usePanelWidth(frameRef);
      const [chatOpen, setChatOpen] = useState(false);
      const snapshot = React.useSyncExternalStore(service.subscribe, service.getSnapshot) || {};
      const state = snapshot.state || {};
      const ready = snapshot.ready !== false;
      const pending = Number(snapshot.pending || 0);
      const sessionId = typeof service.currentSession === 'function' ? service.currentSession() : '';
      const bindings = state.sessionBindings || {};
      const owned = Boolean(sessionId && bindings[sessionId] === entry.id);
      const narrow = width > 0 && width < 900;
      const compact = narrow;
      const toggleChat = () => setChatOpen((value) => !value);

      return h('section', {
        ref: frameRef,
        style: {
          position: 'relative', display: 'flex', flexDirection: 'column', flex: 1,
          width: '100%', height: '100%', minWidth: 0, minHeight: 0, overflow: 'hidden',
          background: 'var(--dsw-alias-bg-1, transparent)', color: C.text, fontFamily: 'inherit',
        },
      },
        h('style', { key: 'personalos-panel-css' }, PANEL_CSS),
        h('div', { style: { flex: 1, minHeight: 0, minWidth: 0, display: 'flex' } },
          h('div', { style: { flex: 1, minWidth: 0, minHeight: 0, display: 'flex' } },
            h(PersonalOSWorkbench, { chatOpen, onToggleChat: toggleChat, compact, width }),
          ),
          h('aside', {
            'aria-label': 'AI 对话',
            style: {
              display: chatOpen ? 'flex' : 'none',
              flexDirection: 'column',
              flex: narrow ? '0 0 auto' : '0 0 420px',
              width: narrow ? '100%' : 420,
              maxWidth: narrow ? '100%' : '46%',
              minWidth: 0, minHeight: 0, overflow: 'hidden', zIndex: 2,
              borderLeft: narrow ? 'none' : `1px solid ${C.line}`,
              background: 'var(--dsw-alias-bg-1, #17181a)',
              boxShadow: narrow ? '0 0 32px rgba(0,0,0,0.4)' : 'none',
              ...(narrow ? { position: 'absolute', top: 0, right: 0, bottom: 0 } : {}),
            },
          },
            h('div', {
              style: { flex: '0 0 auto', padding: '14px 16px', fontSize: 12, lineHeight: 1.65, color: C.sub, borderBottom: `1px solid ${C.line}` },
            }, 'AI 对话与任务、笔记数据相互独立：工作台数据不会自动带入对话，可让 AI 帮你拆任务或整理笔记思路。'),
            !owned
              ? h('div', { style: { display: 'flex', flexDirection: 'column', gap: 10, padding: '26px 20px', color: C.text } },
                h('div', { style: { fontSize: 15, fontWeight: 600 } }, '开始一次 AI 对话'),
                h('div', { style: { fontSize: 13, lineHeight: 1.7, color: C.sub } }, '选择资料位置后即可使用 DSH 原生会话。'),
                h(Btn, {
                  variant: 'primary',
                  disabled: !active || !ready || pending > 0 || Boolean(service.blocked),
                  onClick: () => service.run(service.newWorkspaceSession()),
                }, '选择资料位置并开始会话'))
              : null,
            h('div', { style: { display: owned ? 'flex' : 'none', flex: 1, minHeight: 0, minWidth: 0, flexDirection: 'column', overflow: 'hidden' } }, conversation),
          ),
        ),
      );
    }

    globalThis.__PERSONALOS_TEST_HOOK__ = {
      BusinessPanel,
      Workbench: PersonalOSWorkbench,
      HomeTab,
      CaptureTab,
      NotesTab,
      TaskColumn,
      TaskRow,
      TreeNode,
    };

    return {
      inject: ['desktopWorkbenches'],
      apply(ctx) {
        ctx.effect(
          () => ctx.desktopWorkbenches.register({
            title: 'PersonalOS',
            panelTitle: 'PersonalOS · 任务与笔记',
            repository: 'https://github.com/LeriusLei/dsh-personalos',
            description: '智能任务看板 + 个人笔记收纳：任务总清单、今日待办、随手采集，随笔自动分类沉淀为知识库笔记。',
            icon: PersonalOSIcon,
            customFrame: true,
          }, BusinessPanel),
          'personalos-workbench: register',
        );
      },
    };
  },
});
