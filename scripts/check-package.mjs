// 打包前自检：核对 package.json 契约、入口文件、bundle patch 与客户端注册写法。
import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => readFileSync(join(root, rel), 'utf8');
const pkg = JSON.parse(read('package.json'));

assert.match(pkg.name, /^[a-z0-9][a-z0-9-]*$/, '包名必须是合法 npm 名');
assert.match(pkg.version, /^\d+\.\d+\.\d+$/, 'version 必须是完整 SemVer');
assert.equal(pkg.type, 'module');
assert.equal(pkg.main, pkg.exports['.'], 'main 必须与 exports["."] 一致');
assert.ok(pkg.repository?.url?.includes('github.com'), 'repository 必须指回 GitHub 仓库');
assert.ok(pkg.dsh?.bundle?.patch, '缺少 dsh.bundle.patch');
assert.equal(pkg.dsh?.client?.platform, 'web', 'dsh.client.platform 必须是 web');
assert.ok(pkg.dsh?.client?.inject?.includes('dsh-desktop-workbenches'), 'dsh.client.inject 必须包含 dsh-desktop-workbenches');
assert.ok(pkg.exports['./client'], '缺少 exports["./client"]');
assert.ok(pkg.license, '缺少 license');

const entries = [pkg.main, pkg.exports['./client'], pkg.dsh.bundle.patch, 'README.md', 'LICENSE'];
for (const rel of entries) {
  const file = join(root, rel);
  assert.ok(existsSync(file), `缺少文件：${rel}`);
  assert.ok(statSync(file).size > 0, `文件为空：${rel}`);
}

const patchFile = pkg.dsh.bundle.patch.replace(/^\.\//, '');
const patch = read(patchFile);
assert.ok(patch.includes(`name: ${pkg.name}`), 'bundle patch 未引用本包名');
assert.ok(/root:\s*!!js dshHomePath\('personalos-workbench'\)/.test(patch), 'bundle patch 未配置数据目录');

const client = read(pkg.exports['./client'].replace(/^\.\//, ''));
assert.ok(client.includes(`id: '${pkg.name}'`), '客户端模块 id 必须等于包名');
assert.ok(client.includes('desktopWorkbenches.register'), '客户端必须在 desktopWorkbenches.register 中注册');
const registerCall = client.match(/desktopWorkbenches\.register\(\{([\s\S]*?)\}\s*,\s*BusinessPanel\)/);
assert.ok(registerCall, '找不到 desktopWorkbenches.register({...}, BusinessPanel) 调用');
assert.ok(!/(^|\s)id\s*:/.test(registerCall[1]), 'register 描述符里不要写 id，身份由 repository 解析');
assert.ok(registerCall[1].includes('repository'), 'register 描述符缺少 repository');

const server = read(pkg.main.replace(/^\.\//, ''));
assert.ok(server.includes("export const inject = ['connection']"), '服务端 inject 应为 connection');
assert.ok(server.includes('/api/personalos-workbench'), '本机接口必须使用 /api/personalos-workbench/ 前缀');
// 回归：精确路由缺少 requestBody 会让 Host 给 GET 请求挂 body 并抛 TypeError（线上表现为 400/500）。
assert.ok(server.includes("requestBody: 'buffered'"), 'registerRoute 必须显式声明 requestBody: \'buffered\'');
const directRoutes = (server.match(/registerRoute\(ctx, '/g) ?? []).length;
const tableRoutes = (server.match(/\['\/[a-z0-9/_-]+', \['[A-Z]+'\], handleNotes\]/g) ?? []).length;
assert.ok(directRoutes + tableRoutes >= 16, `路由数量过少：${directRoutes + tableRoutes}`);
assert.ok(!/requestBody:\s*methods/.test(server), 'requestBody 不能按请求方法条件化');

console.log('package check passed:', `${pkg.name}@${pkg.version}`);
