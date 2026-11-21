window.__ModuleLoader__.load({
  id: 'dsh-personalos-workbench',
  factory(require) {
    const React = require('react');
    const { useCallback, useEffect, useRef, useState } = React;
    const h = React.createElement;

    const ROUTE = '/api/personalos-workbench';
    const CATEGORIES = ['AI 技术', '阅读与认知', '产业与商业', '方法论', '随想'];
    // DSH 主题 token 一律取宿主注入的 CSS 变量（见 client Theme listTokens），
    // 浅色/暗色两套由宿主切换；fallback 只做兜底，保持中性灰，不写死深色。
    const C = {
      text: 'var(--dsw-alias-label-primary, #d6d7d9)',
      sub: 'var(--dsw-alias-label-secondary, #9ba1a6)',
      dim: 'color-mix(in srgb, var(--dsw-alias-label-secondary, #9ba1a6) 78%, transparent)',
      line: 'color-mix(in srgb, var(--dsw-alias-label-primary, #6b7280) 24%, var(--dsw-alias-bg-layer-1, #ffffff))',
      lineStrong: 'var(--dsw-alias-border-l2, rgba(128,128,128,0.38))',
      card: 'var(--dsw-alias-bg-layer-1, rgba(128,128,128,0.07))',
      card2: 'var(--dsw-alias-bg-layer-2, rgba(128,128,128,0.12))',
      input: 'var(--dsw-alias-bg-layer-2, rgba(128,128,128,0.12))',
      overlay: 'var(--dsw-alias-bg-overlay, rgba(24,25,27,0.94))',
      accent: 'var(--dsw-alias-brand-primary, #3fbf78)',
      accentSoft: 'color-mix(in srgb, var(--dsw-alias-brand-primary, #3fbf78) 14%, transparent)',
      onAccent: 'var(--dsw-alias-bg-base, #0b1a12)',
      danger: 'var(--dsw-alias-state-error-primary, #e5534b)',
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
[data-pos-root] ::selection{background:color-mix(in srgb,var(--dsw-alias-brand-primary,#3fbf78) 26%,transparent)}
[data-pos-root] [data-pos=btn]{display:inline-flex;align-items:center;justify-content:center;gap:6px;height:32px;padding:0 14px;border-radius:9px;border:1px solid ${C.line};background:transparent;color:var(--dsw-alias-label-primary,#d6d7d9);font:inherit;font-size:12.5px;line-height:1;cursor:pointer;white-space:nowrap;transition:background .14s ease,border-color .14s ease,opacity .14s ease}
[data-pos-root] [data-pos=btn]:hover:not(:disabled){background:color-mix(in srgb,var(--dsw-alias-label-primary,#d6d7d9) 8%,transparent);border-color:var(--dsw-alias-border-l2,rgba(128,128,128,.38))}
[data-pos-root] [data-pos=btn]:focus-visible{outline:2px solid color-mix(in srgb,var(--dsw-alias-brand-primary,#3fbf78) 55%,transparent);outline-offset:2px}
[data-pos-root] [data-pos=btn]:disabled{opacity:.45;cursor:not-allowed}
[data-pos-root] [data-pos=btn][data-kind=primary]{background:var(--dsw-alias-brand-primary,#3fbf78);border-color:transparent;color:var(--dsw-alias-bg-base,#0b1a12);font-weight:600}
[data-pos-root] [data-pos=btn][data-kind=primary]:hover:not(:disabled){background:var(--dsw-alias-brand-primary,#3fbf78);filter:brightness(1.06)}
[data-pos-root] [data-pos=btn][data-kind=soft]{background:color-mix(in srgb,var(--dsw-alias-brand-primary,#3fbf78) 14%,transparent);border-color:transparent;color:var(--dsw-alias-brand-primary,#3fbf78);font-weight:560}
[data-pos-root] [data-pos=btn][data-kind=soft]:hover:not(:disabled){background:color-mix(in srgb,var(--dsw-alias-brand-primary,#3fbf78) 22%,transparent)}
[data-pos-root] [data-pos=icon]{display:inline-flex;align-items:center;justify-content:center;width:30px;height:30px;padding:0;border-radius:9px;border:1px solid ${C.line};background:transparent;color:var(--dsw-alias-label-secondary,#9ba1a6);font:inherit;font-size:14px;line-height:1;cursor:pointer;transition:background .14s ease,color .14s ease,border-color .14s ease}
[data-pos-root] [data-pos=icon]:hover:not(:disabled){background:color-mix(in srgb,var(--dsw-alias-label-primary,#d6d7d9) 9%,transparent);color:var(--dsw-alias-label-primary,#d6d7d9);border-color:var(--dsw-alias-border-l2,rgba(128,128,128,.38))}
[data-pos-root] [data-pos=icon]:focus-visible{outline:2px solid color-mix(in srgb,var(--dsw-alias-brand-primary,#3fbf78) 55%,transparent);outline-offset:2px}
[data-pos-root] [data-pos=icon]:disabled{opacity:.45;cursor:not-allowed}
[data-pos-root] [data-pos=seg]{display:inline-flex;align-items:center;gap:2px;padding:3px;border-radius:11px;background:var(--dsw-alias-bg-layer-1,rgba(128,128,128,.08));border:1px solid ${C.line}}
[data-pos-root] [data-pos=seg]>button{height:27px;padding:0 14px;border:0;border-radius:8px;background:transparent;color:var(--dsw-alias-label-secondary,#9ba1a6);font:inherit;font-size:12.5px;line-height:1;cursor:pointer;transition:background .14s ease,color .14s ease}
[data-pos-root] [data-pos=seg]>button:hover{color:var(--dsw-alias-label-primary,#d6d7d9);background:color-mix(in srgb,var(--dsw-alias-label-primary,#d6d7d9) 8%,transparent)}
[data-pos-root] [data-pos=seg]>button[data-active=true]{background:color-mix(in srgb,var(--dsw-alias-brand-primary,#3fbf78) 16%,transparent);color:var(--dsw-alias-brand-primary,#3fbf78);font-weight:600}
[data-pos-root] [data-pos=card]{background:var(--dsw-alias-bg-layer-1,rgba(128,128,128,.07));border:1px solid ${C.line};border-radius:14px;box-shadow:0 1px 2px rgba(0,0,0,.04),0 16px 36px -30px rgba(0,0,0,.35)}
[data-pos-root] [data-pos=check]{width:19px;height:19px;min-width:19px;padding:0;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:11px;line-height:1;cursor:pointer;border:1.5px solid var(--dsw-alias-border-l2,rgba(128,128,128,.5));background:color-mix(in srgb,var(--dsw-alias-label-primary,#d6d7d9) 5%,transparent);color:transparent;transition:background .14s ease,border-color .14s ease,transform .1s ease}
[data-pos-root] [data-pos=check]:hover:not(:disabled){border-color:var(--dsw-alias-brand-primary,#3fbf78);background:color-mix(in srgb,var(--dsw-alias-brand-primary,#3fbf78) 16%,transparent);transform:scale(1.06)}
[data-pos-root] [data-pos=check][data-done=true]{background:var(--dsw-alias-brand-primary,#3fbf78);border-color:var(--dsw-alias-brand-primary,#3fbf78);color:var(--dsw-alias-bg-base,#0b1a12);font-weight:700}
[data-pos-root] [data-pos=check]:disabled{opacity:.5;cursor:not-allowed}
[data-pos-root] [data-pos-scroll]{scrollbar-width:thin;scrollbar-color:color-mix(in srgb,var(--dsw-alias-label-primary,#d6d7d9) 24%,transparent) transparent}
[data-pos-root] [data-pos-scroll]::-webkit-scrollbar{width:8px;height:8px}
[data-pos-root] [data-pos-scroll]::-webkit-scrollbar-thumb{background:color-mix(in srgb,var(--dsw-alias-label-primary,#d6d7d9) 22%,transparent);border-radius:8px;border:2px solid transparent;background-clip:content-box}
[data-pos-root] [data-pos=row]{transition:background .12s ease}
[data-pos-root] [data-pos=row]:hover{background:color-mix(in srgb,var(--dsw-alias-label-primary,#d6d7d9) 7%,transparent)}
[data-pos-root] [data-pos=row]:hover [data-pos-actions]{opacity:1}
[data-pos-root] [data-pos-actions]{opacity:.35;transition:opacity .12s ease}
[data-pos-root] [data-pos=input]{transition:border-color .14s ease,box-shadow .14s ease}
[data-pos-root] [data-pos=input]:focus-within{border-color:color-mix(in srgb,var(--dsw-alias-brand-primary,#3fbf78) 55%,transparent)!important;box-shadow:0 0 0 3px color-mix(in srgb,var(--dsw-alias-brand-primary,#3fbf78) 12%,transparent)}
[data-pos-root] [data-pos=area]{transition:border-color .14s ease,box-shadow .14s ease;scrollbar-width:thin}
[data-pos-root] [data-pos=area]:focus{border-color:color-mix(in srgb,var(--dsw-alias-brand-primary,#3fbf78) 52%,transparent)!important;box-shadow:0 0 0 4px color-mix(in srgb,var(--dsw-alias-brand-primary,#3fbf78) 11%,transparent);outline:none}
[data-pos-root] [data-pos-tree] button{transition:background .12s ease,color .12s ease}
[data-pos-root] [data-pos-toast]{backdrop-filter:blur(12px);box-shadow:0 16px 44px rgba(0,0,0,.24)}
[data-pos-root] [data-pos=md-image]{display:block;max-width:100%;height:auto;margin:10px 0 14px;border-radius:10px;border:1px solid ${C.line};background:var(--dsw-alias-bg-layer-2,rgba(128,128,128,.12))}
[data-pos-root] [data-pos=md-link]{color:var(--dsw-alias-brand-primary,#3fbf78);text-decoration:none;border-bottom:1px solid color-mix(in srgb,var(--dsw-alias-brand-primary,#3fbf78) 35%,transparent)}
[data-pos-root] [data-pos=md-link]:hover{border-bottom-color:var(--dsw-alias-brand-primary,#3fbf78)}
[data-pos-root] [data-pos=md-code]{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:.92em;padding:1px 5px;border-radius:5px;background:color-mix(in srgb,var(--dsw-alias-label-primary,#d6d7d9) 9%,transparent);border:1px solid ${C.line}}
[data-pos-root] [data-pos=wikilink]{display:inline;padding:1px 5px;border-radius:5px;background:color-mix(in srgb,var(--dsw-alias-brand-primary,#3fbf78) 12%,transparent);color:var(--dsw-alias-brand-primary,#3fbf78);font-size:.95em}
[data-pos-root] [data-pos=md-read] table tbody tr:hover{background:color-mix(in srgb,var(--dsw-alias-label-primary,#d6d7d9) 5%,transparent)}
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
      // Uploads may finish after more text was typed; use the live textarea value.
      if (element && typeof element.value === 'string') value = element.value;
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

    function assetUrl(path, notePath) {
      const query = `path=${encodeURIComponent(String(path || ''))}`;
      return `${ROUTE}/asset?${query}${notePath ? `&note=${encodeURIComponent(notePath)}` : ''}`;
    }

    // ── Markdown 阅读视图 ─────────────────────────────────────
    // 轻量渲染，覆盖笔记里的常用语法：标题、段落、列表、引用、代码块、
    // 分隔线、表格、行内加粗/斜体/删除线/代码/链接，以及图片
    // （标准 ![](路径) 与 Obsidian 的 ![[附件名]] 都支持）。
    const IMAGE_NAME_RE = /\.(png|jpe?g|gif|webp|svg|bmp)$/i;
    const INLINE_RE = /(!?\[\[[^\]]+\]\]|!\[[^\]]*\]\([^)]*\)|\[[^\]]*\]\([^)]*\)|`[^`]+`|\*\*[^*]+\*\*|__[^_]+__|~~[^~]+~~|\*[^*\n]+\*|_[^_\n]+_)/g;

    function imageSrc(src, notePath) {
      const value = String(src ?? '').trim();
      if (!value) return '';
      if (/^(https?:|data:)/i.test(value)) return value;
      return assetUrl(value.replace(/^\.\//, ''), notePath);
    }

    function renderToken(token, key, notePath) {
      const image = token.match(/^!\[([^\]]*)\]\(([^)]*)\)$/);
      if (image) {
        return h('img', {
          key,
          src: imageSrc(image[2], notePath),
          alt: image[1] || '图片',
          loading: 'lazy',
          'data-pos': 'md-image',
        });
      }
      const wiki = token.match(/^(!?)\[\[([^\]|#]+)(?:[|#]([^\]]*))?\]\]$/);
      if (wiki) {
        const target = String(wiki[2] || '').trim();
        if (wiki[1] && IMAGE_NAME_RE.test(target)) {
          return h('img', { key, src: imageSrc(target, notePath), alt: target, loading: 'lazy', 'data-pos': 'md-image' });
        }
        return h('span', { key, 'data-pos': 'wikilink', title: target }, (wiki[3] || target).trim());
      }
      const link = token.match(/^\[([^\]]*)\]\(([^)]*)\)$/);
      if (link) {
        const href = String(link[2] || '').trim();
        if (/^https?:\/\//i.test(href)) {
          return h('a', { key, href, target: '_blank', rel: 'noreferrer noopener', 'data-pos': 'md-link' }, link[1] || href);
        }
        return h('span', { key, 'data-pos': 'wikilink', title: href }, link[1] || href);
      }
      const code = token.match(/^`([^`]+)`$/);
      if (code) return h('code', { key, 'data-pos': 'md-code' }, code[1]);
      const bold = token.match(/^(\*\*|__)([\s\S]+)\1$/);
      if (bold) return h('strong', { key }, renderInline(bold[2], `${key}-b`, notePath));
      const strike = token.match(/^~~([\s\S]+)~~$/);
      if (strike) return h('del', { key }, renderInline(strike[1], `${key}-s`, notePath));
      const italic = token.match(/^(\*|_)([\s\S]+)\1$/);
      if (italic) return h('em', { key }, renderInline(italic[2], `${key}-i`, notePath));
      return token;
    }

    function renderInline(text, keyPrefix, notePath) {
      const source = String(text ?? '');
      const nodes = [];
      let last = 0;
      let index = 0;
      // 每次调用都新建一个正则：renderToken 里对加粗/斜体/删除线会递归调用
      // renderInline，如果共用同一个带 g 标志的正则实例，内层调用会重置
      // lastIndex，外层循环就会从 0 重新匹配，陷入死循环把整个页面卡死。
      const pattern = new RegExp(INLINE_RE.source, 'g');
      let match;
      while ((match = pattern.exec(source))) {
        if (match.index > last) nodes.push(source.slice(last, match.index));
        nodes.push(renderToken(match[0], `${keyPrefix}-${index}`, notePath));
        index += 1;
        last = match.index + match[0].length;
        if (index > 5000) break;
      }
      if (last < source.length) nodes.push(source.slice(last));
      return nodes;
    }

    const MD_BLOCK = {
      p: { margin: '0 0 11px', fontSize: 13.5, lineHeight: '1.95', color: C.text },
      h1: { margin: '6px 0 12px', fontSize: 20, lineHeight: '1.45', fontWeight: 650, color: C.text },
      h2: { margin: '18px 0 10px', fontSize: 16.5, lineHeight: '1.45', fontWeight: 650, color: C.text },
      h3: { margin: '16px 0 8px', fontSize: 14.5, lineHeight: '1.5', fontWeight: 650, color: C.text },
      h4: { margin: '14px 0 8px', fontSize: 13.5, lineHeight: '1.5', fontWeight: 650, color: C.sub },
      list: { margin: '0 0 12px', paddingLeft: 22, fontSize: 13.5, lineHeight: '1.95', color: C.text },
      quote: {
        margin: '0 0 12px', padding: '2px 0 2px 13px', borderLeft: `2px solid ${C.accent}`,
        color: C.sub, fontSize: 13.5, lineHeight: '1.9',
      },
      hr: { border: 'none', borderTop: `1px solid ${C.line}`, margin: '18px 0' },
      pre: {
        margin: '0 0 13px', padding: '12px 14px', borderRadius: 10, background: C.input,
        border: `1px solid ${C.line}`, overflowX: 'auto', fontSize: 12.5, lineHeight: '1.75',
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace', color: C.text,
      },
      table: { margin: '0 0 14px', borderCollapse: 'collapse', width: '100%', fontSize: 12.8, lineHeight: '1.7' },
      th: { padding: '7px 10px', textAlign: 'left', borderBottom: `1px solid ${C.lineStrong}`, color: C.sub, fontWeight: 600 },
      td: { padding: '7px 10px', borderBottom: `1px solid ${C.line}`, color: C.text, verticalAlign: 'top' },
    };

    function splitTableRow(line) {
      return String(line).trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((cell) => cell.trim());
    }

    function renderMarkdown(text, notePath) {
      const lines = String(text ?? '').replace(/\r\n/g, '\n').split('\n');
      const blocks = [];
      let paragraph = [];
      let serial = 0;
      const nextKey = () => `md-${serial++}`;
      const flush = () => {
        if (!paragraph.length) return;
        const value = paragraph.join(' ');
        paragraph = [];
        blocks.push(h('p', { key: nextKey(), style: MD_BLOCK.p }, renderInline(value, nextKey(), notePath)));
      };
      let i = 0;
      while (i < lines.length) {
        const raw = lines[i];
        const line = raw.trim();
        if (!line) { flush(); i += 1; continue; }
        const fence = line.match(/^```([\w-]*)\s*$/);
        if (fence) {
          flush();
          const buffer = [];
          i += 1;
          while (i < lines.length && !/^\s*```\s*$/.test(lines[i])) { buffer.push(lines[i]); i += 1; }
          i += 1;
          blocks.push(h('pre', { key: nextKey(), style: MD_BLOCK.pre },
            h('code', null, buffer.join('\n'))));
          continue;
        }
        if (/^((-{3,})|(\*{3,})|(_{3,}))$/.test(line)) {
          flush();
          blocks.push(h('hr', { key: nextKey(), style: MD_BLOCK.hr }));
          i += 1;
          continue;
        }
        const heading = line.match(/^(#{1,6})\s+(.*)$/);
        if (heading) {
          flush();
          const level = Math.min(heading[1].length, 4);
          blocks.push(h(`h${level}`, { key: nextKey(), style: MD_BLOCK[`h${level}`] }, renderInline(heading[2], nextKey(), notePath)));
          i += 1;
          continue;
        }
        if (/^>\s?/.test(line)) {
          flush();
          const quoted = [];
          while (i < lines.length && /^\s*>\s?/.test(lines[i])) {
            quoted.push(lines[i].replace(/^\s*>\s?/, ''));
            i += 1;
          }
          blocks.push(h('blockquote', { key: nextKey(), style: MD_BLOCK.quote }, renderInline(quoted.join(' '), nextKey(), notePath)));
          continue;
        }
        const unordered = line.match(/^[-*+]\s+(.*)$/);
        const ordered = line.match(/^\d+[.)]\s+(.*)$/);
        if (unordered || ordered) {
          flush();
          const tag = unordered ? 'ul' : 'ol';
          const pattern = unordered ? /^[-*+]\s+(.*)$/ : /^\d+[.)]\s+(.*)$/;
          const items = [];
          while (i < lines.length) {
            const item = lines[i].trim().match(pattern);
            if (!item) break;
            items.push(h('li', { key: nextKey(), style: { margin: '1px 0' } }, renderInline(item[1], nextKey(), notePath)));
            i += 1;
          }
          blocks.push(h(tag, { key: nextKey(), style: MD_BLOCK.list }, items));
          continue;
        }
        if (line.includes('|') && i + 1 < lines.length && /^\s*\|?[\s:|-]*-[\s:|-]*\|?\s*$/.test(lines[i + 1])) {
          flush();
          const header = splitTableRow(line);
          const rows = [];
          i += 2;
          while (i < lines.length && lines[i].includes('|') && lines[i].trim()) {
            rows.push(splitTableRow(lines[i]));
            i += 1;
          }
          blocks.push(h('table', { key: nextKey(), style: MD_BLOCK.table },
            h('thead', null, h('tr', null, header.map((cell, index) => h('th', { key: `th-${index}`, style: MD_BLOCK.th }, renderInline(cell, `th-${index}`, notePath))))),
            h('tbody', null, rows.map((row, rowIndex) => h('tr', { key: `tr-${rowIndex}` },
              row.map((cell, cellIndex) => h('td', { key: `td-${cellIndex}`, style: MD_BLOCK.td }, renderInline(cell, `td-${rowIndex}-${cellIndex}`, notePath))))))));
          continue;
        }
        paragraph.push(line);
        i += 1;
      }
      flush();
      return blocks;
    }

    // 笔记文件带 YAML frontmatter（title/date/type/category/tags），阅读时拆出来
    // 做成标题与标签，不让它当正文渲染。
    function splitFrontmatter(content) {
      const text = String(content ?? '');
      const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
      if (!match) return { meta: {}, body: text };
      const meta = {};
      let listKey = '';
      for (const raw of match[1].split(/\r?\n/)) {
        const line = raw.trim();
        if (!line) continue;
        if (line.startsWith('- ') && listKey) {
          meta[listKey] = [...(meta[listKey] || []), line.slice(2).trim()];
          continue;
        }
        const pair = line.match(/^([\w-]+)\s*:\s*(.*)$/);
        if (!pair) continue;
        const [, key, value] = pair;
        if (!value) {
          listKey = key;
          meta[key] = [];
        } else if (/^\[.*\]$/.test(value)) {
          listKey = '';
          meta[key] = value.slice(1, -1).split(',').map((item) => item.trim()).filter(Boolean);
        } else {
          listKey = '';
          meta[key] = value;
        }
      }
      return { meta, body: text.slice(match[0].length) };
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
        'data-pos': 'check',
        'data-done': done ? 'true' : 'false',
        style: { marginTop: 2 },
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
          background: isAccent ? C.accentSoft : C.card2,
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
          style: { height: 3, borderRadius: 3, background: 'color-mix(in srgb, var(--dsw-alias-label-primary, #d6d7d9) 13%, transparent)', overflow: 'hidden', marginBottom: 11 },
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
              background: canAdd ? C.accent : 'transparent', color: canAdd ? C.onAccent : C.dim,
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
      const capturePending = useRef(false);
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
        if (!value || disabled || capturePending.current) return;
        capturePending.current = true;
        try {
          const res = await capture(kind, value, kind === 'note' ? category : '');
          setText((current) => current.trim() === value ? '' : current);
          notify?.(res?.message || '已保存');
        } catch (error) {
          notify?.(String(error?.message ?? error));
        } finally {
          capturePending.current = false;
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
        h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', width: '100%', maxWidth: '100%' } },
          h(Segment, { options: CAPTURE_KINDS, value: kind, onChange: setKind }),
          kind === 'note'
            ? h('select', {
              value: category,
              onChange: (event) => setCategory(event.target.value),
              style: {
                height: 32, padding: '0 10px', borderRadius: 9, border: `1px solid ${C.line}`,
                background: C.input, color: category ? C.text : C.sub,
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
            if (event.isComposing || event.nativeEvent?.isComposing || event.keyCode === 229) return;
            if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
              event.preventDefault();
              save();
            }
          },
          spellCheck: false,
          'data-pos': 'area',
          style: {
            flex: 1, minHeight: 200, width: '100%', maxWidth: '100%', boxSizing: 'border-box', resize: 'none',
            background: C.card,
            border: `1px solid ${C.line}`, borderRadius: 14, padding: '16px 18px',
            color: C.text, fontSize: 14, lineHeight: '24px', fontFamily: 'inherit', outline: 'none',
            boxShadow: '0 14px 34px -30px rgba(0,0,0,.3)',
          },
        }),
        h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', width: '100%', maxWidth: '100%' } },
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
        background: isActive ? C.accentSoft : 'transparent',
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

    function useTextDialog() {
      const [dialog, setDialog] = useState(null);
      const [value, setValue] = useState('');
      const resolveRef = useRef(null);
      const inputRef = useRef(null);
      const finish = (result) => {
        const resolve = resolveRef.current;
        resolveRef.current = null;
        setDialog(null);
        resolve?.(result);
      };
      useEffect(() => {
        if (!dialog) return;
        inputRef.current?.focus();
        inputRef.current?.select();
      }, [dialog]);
      useEffect(() => () => { resolveRef.current?.(null); resolveRef.current = null; }, []);
      const ask = (message, initial = '', confirmOnly = false) => new Promise((resolve) => {
        resolveRef.current?.(null);
        resolveRef.current = resolve;
        setValue(initial);
        setDialog({ message, confirmOnly });
      });
      const panel = dialog ? h('div', {
        style: { position: 'absolute', inset: 0, zIndex: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(0,0,0,.25)' },
        onKeyDown: (event) => {
          event.stopPropagation();
          if (event.key === 'Escape') { event.preventDefault(); finish(null); }
          if (event.key === 'Tab') {
            const controls = Array.from(event.currentTarget.querySelectorAll('input,button'));
            if (event.shiftKey && event.target === controls[0]) { event.preventDefault(); controls.at(-1)?.focus(); }
            if (!event.shiftKey && event.target === controls.at(-1)) { event.preventDefault(); controls[0]?.focus(); }
          }
          if (event.key === 'Enter' && (event.isComposing || event.nativeEvent?.isComposing || event.keyCode === 229)) event.preventDefault();
        },
      }, h('form', {
        role: 'dialog', 'aria-modal': 'true', 'aria-label': dialog.message,
        onSubmit: (event) => { event.preventDefault(); finish(dialog.confirmOnly ? true : value); },
        style: { width: '100%', maxWidth: 440, background: C.card, color: C.text, border: `1px solid ${C.line}`, borderRadius: 14, padding: 22, boxShadow: '0 16px 50px rgba(0,0,0,.25)' },
      },
        h('label', { style: { display: 'block', whiteSpace: 'pre-line', fontSize: 14, lineHeight: 1.7, marginBottom: 14 } }, dialog.message,
          !dialog.confirmOnly ? h('input', { ref: inputRef, value, onChange: (event) => setValue(event.target.value), style: { width: '100%', marginTop: 12, padding: '10px 12px', borderRadius: 8, border: `1px solid ${C.line}`, background: C.input, color: C.text, font: 'inherit' } }) : null),
        h('div', { style: { display: 'flex', justifyContent: 'flex-end', gap: 10 } },
          h(Btn, { onClick: () => finish(null) }, '取消'),
          h(Btn, { type: 'submit', variant: 'primary' }, dialog.confirmOnly ? '确认删除' : '确定')),
      )) : null;
      return { ask, panel };
    }

    function NotesTab({ busy, notify, width = 0 }) {
      const { ask: askText, panel: dialogPanel } = useTextDialog();
      const compact = width > 0 && width < 860;
      const treeWidth = width >= 1400 ? 320 : width >= 1150 ? 280 : 250;
      const [tree, setTree] = useState([]);
      const [active, setActive] = useState('');
      const [selected, setSelected] = useState(null);
      const [content, setContent] = useState('');
      const [dirty, setDirty] = useState(false);
      const [saving, setSaving] = useState(false);
      const [mode, setMode] = useState('read');
      const areaRef = useRef(null);
      const openRequest = useRef(0);
      const savePending = useRef(false);
      const draft = useRef({ active, content, dirty });
      draft.current = { active, content, dirty };
      useEffect(() => () => { openRequest.current += 1; }, []);

      const canLeave = () => {
        if (!draft.current.dirty && !savePending.current) return true;
        notify?.('请先保存当前笔记，再切换或修改文件位置');
        return false;
      };
      const editContent = (next) => {
        draft.current = { ...draft.current, content: next, dirty: true };
        setContent(next);
        setDirty(true);
      };

      const loadTree = useCallback(async () => {
        const res = await api('/notes/tree');
        setTree(res.tree || []);
      }, []);

      useEffect(() => {
        loadTree().catch((error) => notify?.(String(error?.message ?? error)));
      }, [loadTree, notify]);

      const openNode = async (node) => {
        if (!node?.path) return;
        if (!canLeave()) return;
        const request = ++openRequest.current;
        if (node.type !== 'file') {
          setSelected({ path: node.path, name: node.name, type: node.type });
          return;
        }
        try {
          const res = await api(`/notes/file?path=${encodeURIComponent(node.path)}`);
          if (request !== openRequest.current) return;
          if (!canLeave()) return;
          setSelected({ path: node.path, name: node.name, type: node.type });
          draft.current = { active: node.path, content: res.content || '', dirty: false };
          setActive(node.path);
          setContent(res.content || '');
          setDirty(false);
          setMode(String(res.content || '').trim() ? 'read' : 'edit');
        } catch (error) {
          if (request !== openRequest.current) return;
          notify?.(String(error?.message ?? error));
        }
      };

      const save = async () => {
        if (!active || savePending.current) return;
        savePending.current = true;
        const saved = { active, content };
        setSaving(true);
        try {
          await api('/notes/save', { method: 'POST', body: JSON.stringify({ path: active, content }) });
          if (draft.current.active === saved.active && draft.current.content === saved.content) {
            draft.current.dirty = false;
            setDirty(false);
          }
          await loadTree();
          notify?.('已保存');
        } catch (error) {
          notify?.(String(error?.message ?? error));
        } finally {
          savePending.current = false;
          setSaving(false);
        }
      };

      const tidy = async () => {
        const original = { active, content };
        try {
          const res = await api('/notes/tidy', { method: 'POST', body: JSON.stringify({ text: content }) });
          if (draft.current.active !== original.active || draft.current.content !== original.content) return;
          editContent(res.text ?? content);
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
        if (!canLeave()) return;
        const name = await askText('笔记标题（留空则自动命名）', '');
        if (name === null) return;
        try {
          const res = await api('/notes/new', { method: 'POST', body: JSON.stringify({ dir: selectedDir(), name }) });
          await loadTree();
          await openNode({ path: res.path, name: res.title, type: 'file' });
          setMode('edit');
          notify?.(res.message || '已新建笔记');
        } catch (error) {
          notify?.(String(error?.message ?? error));
        }
      };

      const createDir = async () => {
        const name = await askText('新目录名（建在知识库下）', '');
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
        if (!canLeave()) return;
        if (!selected) { notify?.('先在左侧选中一个文件或目录'); return; }
        const next = await askText(`把「${selected.name}」改成：`, selected.name);
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
        if (!canLeave()) return;
        if (!selected || selected.type !== 'file') { notify?.('先选中一篇笔记再移动'); return; }
        try {
          const res = await api('/notes/targets');
          const targets = res.targets || [];
          if (!targets.length) { notify?.('知识库里还没有分类目录'); return; }
          const list = targets.map((item, index) => `${index + 1}. ${item.name}`).join('\n');
          const input = await askText(`移动到哪个目录？填序号或目录名\n${list}`, '1');
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
        if (!canLeave()) return;
        if (!selected) { notify?.('先在左侧选中一个文件或目录'); return; }
        if (!await askText(`删除「${selected.name}」？`, '', true)) return;
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
          const path = active;
          const res = await uploadImage(file);
          if (draft.current.active !== path) return;
          insertText(draft.current.content, editContent, areaRef, `![[${res.name}]]`);
          notify?.(`已插入 ${res.name}`);
        } catch (error) {
          notify?.(String(error?.message ?? error));
        }
      };

      const selectedLabel = selected ? `${selected.type === 'dir' ? '目录' : '笔记'}：${selected.name}` : '';
      return h('div', {
        style: {
          position: 'relative', flex: 1, minHeight: 0, display: 'grid', gap: 14,
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
            active
              ? h(Segment, {
                options: [{ key: 'read', label: '阅读' }, { key: 'edit', label: '编辑' }],
                value: mode,
                onChange: setMode,
              })
              : null,
            mode === 'edit' ? h(Btn, { onClick: tidy, disabled: !active || busy }, '整理排版') : null,
            h(Btn, { onClick: removeNode, disabled: !active || busy }, '删除'),
            mode === 'edit' ? h(Btn, { variant: 'primary', onClick: save, disabled: !active || saving }, '保存') : null,
          ),
          active
            ? (mode === 'edit'
              ? h('textarea', {
                ref: areaRef,
                value: content,
                onChange: (event) => editContent(event.target.value),
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
                  background: C.input, border: `1px solid ${C.line}`, borderRadius: 12, padding: '16px 18px',
                  color: C.text, fontSize: 13.5, lineHeight: '24px', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace', outline: 'none',
                },
              })
              : h('div', {
                'data-pos': 'md-read',
                'data-pos-scroll': 'true',
                style: { flex: 1, minHeight: 0, overflowY: 'auto', padding: '2px 6px 22px', overscrollBehavior: 'contain' },
              },
                String(content || '').trim()
                  ? (() => {
                    const parsed = splitFrontmatter(content);
                    const tags = Array.isArray(parsed.meta.tags) ? parsed.meta.tags : [];
                    return h('div', { style: { maxWidth: 780, margin: '0 auto' } },
                      h('div', {
                        style: {
                          display: 'flex', flexDirection: 'column', gap: 8, padding: '2px 0 14px',
                          borderBottom: `1px solid ${C.line}`,
                        },
                      },
                        h('h1', {
                          style: { margin: 0, fontSize: 21, lineHeight: '1.45', fontWeight: 650, color: C.text, letterSpacing: '-0.01em' },
                        }, parsed.meta.title || selected?.name || '未命名笔记'),
                        h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' } },
                          parsed.meta.category ? h(Chip, { tone: 'accent' }, parsed.meta.category) : null,
                          parsed.meta.date ? h(Chip, null, parsed.meta.date) : null,
                          tags.map((tag) => h(Chip, { key: `tag-${tag}` }, `#${tag}`)),
                        )),
                      h('div', { style: { paddingTop: 14 } }, renderMarkdown(parsed.body, active)));
                  })()
                  : h('div', { style: { padding: '56px 0', textAlign: 'center', fontSize: 13, color: C.dim } }, '这篇笔记还是空的，切到「编辑」开始写')))
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
        dialogPanel,
      );
    }

    function PersonalOSWorkbench({ chatOpen, onToggleChat, compact, width, active = true }) {
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
          if (!active || event.isComposing || !event.altKey) return;
          if (event.key === '1') { event.preventDefault(); setTab('home'); }
          if (event.key === '2') { event.preventDefault(); setTab('capture'); }
          if (event.key === '3') { event.preventDefault(); setTab('notes'); }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
      }, [active]);

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
              background: C.accentSoft, color: C.accent,
            },
          }, h(PersonalOSIcon)),
          h('span', { style: { fontSize: 16, fontWeight: 650, letterSpacing: 0.2, whiteSpace: 'nowrap' } }, 'PersonalOS'),
          h(Chip, { title: '当前前端修复版本' }, 'v1.3.1'),
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
      } else {
        // Keep editors mounted so switching tabs preserves unfinished input.
        body = [
          ['home', h(HomeTab, { data, busy, run, notify, compact })],
          ['capture', h(CaptureTab, { busy, capture, notify, categories: data.knowledge?.categories || CATEGORIES, compact })],
          ['notes', h(NotesTab, { busy, notify, width: width || (compact ? 0 : 1200) })],
        ].map(([key, panel]) => h('div', {
          key, style: { display: tab === key ? 'flex' : 'none', flex: 1, minWidth: 0, minHeight: 0 },
        }, panel));
      }

      return h('div', {
        'data-pos-root': 'true',
        style: {
          position: 'relative', flex: 1, width: '100%', minWidth: 0, height: '100%', minHeight: 0, boxSizing: 'border-box',
          display: 'flex', flexDirection: 'column', gap: compact ? 12 : 14,
          padding: compact ? '12px 14px 12px' : '18px 22px 16px',
          color: C.text, fontFamily: 'inherit',
          backgroundImage: 'radial-gradient(1100px 380px at 10% -14%, color-mix(in srgb, var(--dsw-alias-brand-primary, #3fbf78) 7%, transparent), transparent 70%)',
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
              background: C.overlay,
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
    let layoutService = null;
    const layoutListeners = new Set();

    function BusinessPanel({ service, entry, active, conversation }) {
      useEffect(() => {
        if (!active) return;
        const close = () => {
          try { layoutService?.closeRightbar?.(); } catch { /* optional host service */ }
        };
        close();
        layoutListeners.add(close);
        return () => layoutListeners.delete(close);
      }, [active]);
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
          background: 'var(--dsw-alias-bg-base, transparent)', color: C.text, fontFamily: 'inherit',
        },
      },
        h('style', { key: 'personalos-panel-css' }, PANEL_CSS),
        h('div', { style: { flex: 1, minHeight: 0, minWidth: 0, display: 'flex' } },
          h('div', { style: { flex: 1, minWidth: 0, minHeight: 0, display: 'flex' } },
            h(PersonalOSWorkbench, { chatOpen, onToggleChat: toggleChat, compact, width, active }),
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
              background: 'var(--dsw-alias-bg-layer-1, var(--dsw-alias-bg-base, transparent))',
              boxShadow: narrow ? '0 0 32px rgba(0,0,0,.26)' : 'none',
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
      renderMarkdown,
      renderInline,
      splitFrontmatter,
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
        if (typeof ctx.inject === 'function') ctx.inject(['layout'], (scope) => {
          const layout = scope.layout;
          scope.effect(() => {
            layoutService = layout;
            for (const listener of layoutListeners) listener();
            return () => { if (layoutService === layout) layoutService = null; };
          }, 'personalos-workbench: layout');
        });
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
