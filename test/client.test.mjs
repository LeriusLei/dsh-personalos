// 客户端契约测试：用 vm 载入已构建的模块，mock React 与宿主 ctx，核对注册描述符与首屏。
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const source = readFileSync(join(root, 'lib', 'client.js'), 'utf8');

function loadModule() {
  let definition = null;
  const sandbox = {
    console,
    Date,
    setTimeout: () => 0,
    clearTimeout: () => {},
    window: { __ModuleLoader__: { load: (value) => { definition = value; } } },
  };
  sandbox.globalThis = sandbox;
  vm.runInNewContext(source, sandbox, { filename: 'lib/client.js' });
  assert.ok(definition, '客户端没有通过 __ModuleLoader__ 注册');
  lastSandbox = sandbox;
  return definition;
}

let lastSandbox = null;

function makeReact() {
  return {
    createElement(type, props, ...children) {
      return { type, props: props || {}, children };
    },
    useState(initial) { return [typeof initial === 'function' ? initial() : initial, () => {}]; },
    useCallback(fn) { return fn; },
    useMemo(fn) { return fn(); },
    useEffect() {},
    useLayoutEffect() {},
    useRef() { return { current: null }; },
    useSyncExternalStore() {
      return { state: { sessionBindings: {} }, ready: true, pending: 0 };
    },
  };
}

// 递归渲染：字符串收集成文本，函数组件就地调用（子节点并入 props.children），用于断言首屏文案。
function collectText(node, texts) {
  if (node === null || node === undefined || node === false || node === true) return;
  if (typeof node === 'string' || typeof node === 'number') { texts.push(String(node)); return; }
  if (Array.isArray(node)) { for (const child of node) collectText(child, texts); return; }
  if (typeof node === 'object') {
    if (typeof node.type === 'function') {
      const children = node.children.length === 1 ? node.children[0] : node.children;
      const props = node.children.length ? { ...node.props, children } : { ...node.props };
      collectText(node.type(props), texts);
      return;
    }
    for (const child of node.children || []) collectText(child, texts);
    if (node.props && node.props.children !== undefined) collectText(node.props.children, texts);
  }
}

test('模块 id 与包名一致，并声明 desktopWorkbenches 注入', () => {
  const definition = loadModule();
  const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
  assert.equal(definition.id, pkg.name);
  const moduleExports = definition.factory(() => makeReact());
  assert.equal(moduleExports.inject.join(','), 'desktopWorkbenches');
  assert.equal(typeof moduleExports.apply, 'function');
});

test('注册描述符：customFrame、repository、无 id', () => {
  const definition = loadModule();
  const moduleExports = definition.factory(() => makeReact());
  let descriptor = null;
  const ctx = {
    effect(fn) { return fn(); },
    desktopWorkbenches: {
      register(spec, component) {
        descriptor = { spec, component };
        return () => {};
      },
    },
  };
  moduleExports.apply(ctx);
  assert.ok(descriptor, '没有调用 desktopWorkbenches.register');
  assert.equal(descriptor.spec.customFrame, true);
  assert.equal(descriptor.spec.title, 'PersonalOS');
  assert.match(descriptor.spec.repository, /^https:\/\/github\.com\/[^/]+\/[^/]+$/);
  assert.equal('id' in descriptor.spec, false);
  assert.equal(typeof descriptor.component, 'function');
});

test('面板首屏：无会话时业务可用，并给出开始对话入口', () => {
  const definition = loadModule();
  const React = makeReact();
  const moduleExports = definition.factory(() => React);
  let descriptor = null;
  const ctx = {
    effect(fn) { return fn(); },
    desktopWorkbenches: { register(spec, component) { descriptor = { spec, component }; return () => {}; } },
  };
  moduleExports.apply(ctx);

  const service = {
    subscribe: () => () => {},
    getSnapshot: () => ({ state: { sessionBindings: {} }, ready: true, pending: 0 }),
    currentSession: () => '',
    blocked: false,
    run: (promise) => promise,
    newWorkspaceSession: () => Promise.resolve(),
  };
  const tree = descriptor.component({
    service,
    entry: { id: 'leriuslei/dsh-personalos' },
    active: true,
    conversation: null,
  });

  const texts = [];
  collectText(tree, texts);
  assert.ok(texts.includes('AI 对话'), '缺少 AI 对话入口');
  assert.ok(texts.some((text) => text.includes('开始一次 AI 对话')), '缺少开始对话引导');
  assert.ok(texts.includes('PersonalOS'), '缺少工作台标题');
});

// 回归：renderInline 曾复用带 g 标志的正则实例，renderToken 递归调用 renderInline
// 时会把 lastIndex 重置，外层循环因此永不前进 → 点开任何带加粗/斜体的笔记整页卡死。
test('Markdown 渲染：行内标记嵌套不会死循环', () => {
  const definition = loadModule();
  definition.factory(() => makeReact());
  const hook = lastSandbox.__PERSONALOS_TEST_HOOK__;
  const markdown = [
    '# 标题',
    '',
    '这是**重点**内容，还有*斜体*、~~删除线~~和`代码`。',
    '',
    '- 第一项 **加粗**',
    '- 第二项 *斜体*',
    '',
    '> 引用里的**重点**',
    '',
    '| 列一 | 列二 |',
    '| --- | --- |',
    '| **a** | b |',
    '',
    '![示意图](知识库示意.png)',
    '![[知识库示意.png]]',
  ].join('\n');
  const start = Date.now();
  const nodes = hook.renderMarkdown(markdown, '知识库/阅读与认知/示例.md');
  assert.ok(Date.now() - start < 2000, 'Markdown 渲染耗时异常，疑似死循环');
  const texts = [];
  collectText(nodes, texts);
  const joined = texts.join('');
  assert.ok(joined.includes('重点'), '加粗文本丢失');
  assert.ok(joined.includes('斜体'), '斜体文本丢失');
  assert.ok(joined.includes('删除线'), '删除线文本丢失');
  assert.ok(joined.includes('代码'), '行内代码丢失');
  const images = [];
  (function walk(node) {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) { node.forEach(walk); return; }
    if (node.type === 'img') images.push(node.props.src);
    (node.children || []).forEach(walk);
  })(nodes);
  assert.equal(images.length, 2, 'Markdown 图片没有渲染出来');
  assert.ok(images.every((src) => src.includes('/asset?path=')), '图片地址没有指向资源路由');
});

test('frontmatter 拆分：标题与标签不进正文', () => {
  const definition = loadModule();
  definition.factory(() => makeReact());
  const hook = lastSandbox.__PERSONALOS_TEST_HOOK__;
  const parsed = hook.splitFrontmatter([
    '---',
    'title: 每周复盘的四个固定问题',
    'date: 2026-11-20',
    'category: 方法论',
    'tags: [复盘, 周记]',
    '---',
    '',
    '正文第一段',
  ].join('\n'));
  assert.equal(parsed.meta.title, '每周复盘的四个固定问题');
  assert.deepEqual(Array.from(parsed.meta.tags), ['复盘', '周记']);
  assert.equal(parsed.body.trim(), '正文第一段');
});
