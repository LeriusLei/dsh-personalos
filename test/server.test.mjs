// 服务端路由自测：不启动 DSH，只验证路由注册与 HTTP 行为。
// 重点回归：connection.fetch 的精确路由必须显式声明 requestBody='buffered'，
// 否则 Host 会给 GET 请求挂 body 并抛 TypeError（线上表现为 500/空 400）。
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { apply, inject, name, Config } from '../dsh/index.js';

const ROUTE = '/api/personalos-workbench';
const root = mkdtempSync(path.join(tmpdir(), 'personalos-workbench-'));

function createHarness() {
  const routes = new Map();
  const ctx = {
    connection: {
      fetch: {
        register(route) {
          routes.set(route.path, route);
        },
      },
    },
    logger: { warn() {} },
  };
  apply(ctx, { root });
  return routes;
}

function call(routes, pathAndQuery, init) {
  const url = new URL(`http://127.0.0.1:43129${ROUTE}${pathAndQuery}`);
  const route = routes.get(url.pathname);
  assert.ok(route, `route ${url.pathname} registered`);
  assert.ok(route.methods.includes(init?.method ?? 'GET'), `route ${url.pathname} accepts ${init?.method ?? 'GET'}`);
  const request = new Request(url, init);
  return route.fetch(request);
}

const tests = [
  {
    label: '模块元信息与配置',
    run() {
      assert.equal(name, 'dsh-personalos-workbench');
      assert.deepEqual(inject, ['connection']);
      assert.ok(Config, '导出 Config');
    },
  },
  {
    label: '所有精确路由都声明 requestBody=buffered',
    run() {
      const routes = createHarness();
      assert.ok(routes.size >= 16, `注册了 ${routes.size} 条路由`);
      for (const [path, route] of routes) {
        assert.ok(path.startsWith(ROUTE + '/'), `路由前缀 ${path}`);
        assert.equal(route.requestBody, 'buffered', `路由 ${path} 声明 requestBody`);
      }
    },
  },
  {
    label: 'GET /health 返回 200 JSON',
    async run() {
      const routes = createHarness();
      const response = await call(routes, '/health');
      assert.equal(response.status, 200);
      assert.match(response.headers.get('content-type') ?? '', /application\/json/);
      const data = await response.json();
      assert.equal(data.ok, true);
      assert.equal(typeof data.version, 'string');
      assert.equal(data.workspace, path.resolve(root));
    },
  },
  {
    label: 'GET /overview 返回任务与知识库结构',
    async run() {
      const routes = createHarness();
      const data = await (await call(routes, '/overview')).json();
      assert.equal(data.ok, true);
      assert.ok(Array.isArray(data.today.open));
      assert.ok(Array.isArray(data.total.open));
      assert.ok(data.knowledge && Array.isArray(data.knowledge.tree));
      assert.ok(data.knowledge.tree.length >= 1, '初始化出知识库目录');
    },
  },
  {
    label: 'POST /action 新建任务并落盘',
    async run() {
      const routes = createHarness();
      const added = await (
        await call(routes, '/action', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ action: 'add_task', scope: 'total', title: '写工作台说明' }),
        })
      ).json();
      assert.equal(added.ok, true);
      const data = added.data;
      assert.ok(data.total.open.some((task) => task.title === '写工作台说明'));
      assert.ok(added.message.includes('写工作台说明'));
    },
  },
  {
    label: 'POST /notes/new 新建笔记后可读回',
    async run() {
      const routes = createHarness();
      const created = await (
        await call(routes, '/notes/new', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ dir: '', name: '示例笔记', content: '# 示例\n' }),
        })
      ).json();
      assert.equal(created.ok, true);
      const file = encodeURIComponent(created.path);
      const read = await (await call(routes, `/notes/file?path=${file}`)).json();
      assert.equal(read.ok, true);
      assert.match(read.content, /示例/);
    },
  },
  {
    label: '错误输入返回结构化错误',
    async run() {
      const routes = createHarness();
      const response = await call(routes, '/action', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'move_to_today', index: -1 }),
      });
      assert.equal(response.status, 400);
      const data = await response.json();
      assert.equal(data.ok, false);
      assert.ok(data.error);
    },
  },
];

let failed = 0;
for (const test of tests) {
  try {
    await test.run();
    console.log(`ok - ${test.label}`);
  } catch (error) {
    failed += 1;
    console.error(`not ok - ${test.label}`);
    console.error(error);
  }
}

rmSync(root, { recursive: true, force: true });

if (failed > 0) {
  console.error(`${failed} 项失败`);
  process.exit(1);
}
console.log(`server 测试通过：${tests.length}/${tests.length}`);
