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
  return definition;
}

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
