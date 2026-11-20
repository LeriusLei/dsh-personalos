// PersonalOS 工作台 · 服务端入口
// 只注册本工作台自己的本机接口（/api/personalos-workbench/ 前缀）。
// 任务与笔记数据写在 cordis.patch.yml 配置的数据目录（config.root）里，卸载工作台不会删除这些数据。
import Schema from '@deepseek-ai/schemastery';
import {
  StoreError,
  addTask,
  addTasks,
  addTodayTask,
  buildOverview,
  captureCollection,
  captureNote,
  captureTasks,
  configure,
  createKnowledgeDir,
  createKnowledgeNote,
  createNoteFile,
  deleteDir,
  deleteNote,
  deleteTask,
  editTask,
  ensureTaskFiles,
  listMoveTargets,
  moveNote,
  moveToToday,
  readNote,
  renameDir,
  renameNote,
  saveAttachment,
  saveNote,
  tidyMarkdown,
  toggleTask,
  listKnowledgeTree,
  VERSION,
  TIME_ZONE,
  workspaceRoot,
  nowDate,
} from './store.js';

const ROUTE = '/api/personalos-workbench';
const MAX_BODY = 8 * 1024 * 1024;

export const name = 'dsh-personalos-workbench';
export const inject = ['connection'];
export const Config = Schema.object({
  root: Schema.string().required(),
});

const respond = (data, status = 200) =>
  Response.json(data, { status, headers: { 'cache-control': 'no-store' } });

const fail = (error) =>
  respond(
    { ok: false, error: String(error?.message ?? error) },
    Number(error?.status) || 500,
  );

async function readBody(request) {
  const contentLength = Number(request.headers.get('content-length'));
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY) {
    throw new StoreError('请求内容过大', 413);
  }
  const reader = request.body?.getReader();
  if (!reader) return {};
  const chunks = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > MAX_BODY) {
        await reader.cancel();
        throw new StoreError('请求内容过大', 413);
      }
      chunks.push(value);
    }
  } finally {
    try { reader.releaseLock(); } catch { /* ignore */ }
  }
  const text = Buffer.concat(chunks).toString('utf8').trim();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    throw new StoreError('请求体不是合法 JSON', 400);
  }
}

function requireIndex(value) {
  const index = Number(value);
  if (!Number.isInteger(index) || index < 0) throw new StoreError('任务序号不合法', 400);
  return index;
}

async function handleAction(body) {
  const action = String(body?.action ?? '');
  const scope = body?.scope === 'today' ? 'today' : 'total';
  switch (action) {
    case 'add_task': {
      if (scope === 'today') {
        const result = addTodayTask({ title: body?.title, url: body?.url });
        return { message: `已加入今日任务：${result.title}` };
      }
      const result = addTask('total', { title: body?.title, url: body?.url });
      return { message: `已加入任务总清单：${result.title}` };
    }
    case 'add_tasks': {
      const added = addTasks(scope, Array.isArray(body?.titles) ? body.titles : []);
      if (!added.length) throw new StoreError('没有可加入的新任务', 400);
      return { message: `已加入 ${added.length} 条任务：${added.join('；')}` };
    }
    case 'toggle_task': {
      const result = toggleTask(scope, requireIndex(body?.index));
      return { message: `已完成：${result.title}（${result.time}）`, extra: result };
    }
    case 'edit_task': {
      const item = editTask(scope, requireIndex(body?.index), { title: body?.title, url: body?.url });
      return { message: `已修改：${item.title}` };
    }
    case 'delete_task': {
      const item = deleteTask(scope, requireIndex(body?.index));
      return { message: `已删除：${item.title}` };
    }
    case 'move_to_today': {
      const item = moveToToday(requireIndex(body?.index));
      return { message: `已安排到今天：${item.title}` };
    }
    case 'capture': {
      const kind = String(body?.kind ?? 'task');
      const text = String(body?.text ?? '');
      if (kind === 'note') {
        const note = captureNote(text, { category: body?.category });
        const extra = note.related?.length ? `，并关联了 ${note.related.length} 篇相关笔记` : '';
        return { message: `已整理成笔记《${note.title}》，放进「${note.category}」${extra}`, extra: note };
      }
      if (kind === 'collection') {
        const result = captureCollection(text);
        return { message: `已收藏为学习任务：${result.title}`, extra: result };
      }
      const result = captureTasks(text);
      const parts = [`已识别 ${result.count} 条任务`];
      if (result.todayCount) parts.push(`（今日 ${result.todayCount} 条 / 总待办 ${result.totalCount} 条）`);
      if (result.instruction) parts.push(`，按指令「${result.instruction}」安排`);
      return { message: parts.join(''), extra: result };
    }
    default:
      throw new StoreError('未知操作', 400);
  }
}

async function handleNotes(pathname, request) {
  const url = new URL(request.url);
  if (pathname === '/notes/tree') return { ok: true, tree: listKnowledgeTree() };
  if (pathname === '/notes/targets') return { ok: true, targets: listMoveTargets() };
  if (pathname === '/notes/file') {
    const rel = url.searchParams.get('path') ?? '';
    return { ok: true, path: rel, content: readNote(rel) };
  }
  const body = await readBody(request);
  switch (pathname) {
    case '/notes/save': {
      const result = saveNote(body?.path, body?.content);
      return { ok: true, ...result, message: result.created ? '已新建并保存' : '已保存' };
    }
    case '/notes/create': {
      const note = createKnowledgeNote({ text: body?.text, title: body?.title, category: body?.category });
      return { ok: true, ...note, message: `已整理成笔记《${note.title}》，放进「${note.category}」` };
    }
    case '/notes/new': {
      const note = createNoteFile({ dir: body?.dir, name: body?.name, content: body?.content });
      return { ok: true, ...note, message: `已新建笔记《${note.title}》` };
    }
    case '/notes/mkdir': {
      const result = createKnowledgeDir({ name: body?.name });
      return { ok: true, ...result, message: `已新建目录「${result.name}」` };
    }
    case '/notes/rename': {
      const result = renameNote({ path: body?.path, name: body?.name });
      const links = result.links ? `，同步了 ${result.links} 篇笔记里的双链` : '';
      return { ok: true, ...result, message: `已重命名为「${result.name}」${links}` };
    }
    case '/notes/rename-dir': {
      const result = renameDir({ path: body?.path, name: body?.name });
      return { ok: true, ...result, message: `目录已重命名为「${result.name}」` };
    }
    case '/notes/move': {
      const result = moveNote({ path: body?.path, targetDir: body?.targetDir });
      return { ok: true, ...result, message: '已移动到目标目录' };
    }
    case '/notes/delete-dir': {
      const result = deleteDir({ path: body?.path });
      return { ok: true, ...result, message: '已删除空目录' };
    }
    case '/notes/tidy': {
      return { ok: true, text: tidyMarkdown(body?.text ?? '') };
    }
    case '/notes/upload': {
      const result = saveAttachment({ name: body?.name, dataBase64: body?.data });
      return { ok: true, ...result, message: `已插入图片 ${result.name}` };
    }
    case '/notes/delete': {
      const result = deleteNote(body?.path);
      return { ok: true, ...result, message: '已删除文件' };
    }
    default:
      throw new StoreError('未知笔记操作', 404);
  }
}

function registerRoute(ctx, path, methods, handler) {
  // `connection.fetch` defaults unlisted routes to "buffered"; registering an exact
  // route without an explicit mode falls through to the streaming branch and makes
  // the Host build a GET Request with a body (TypeError). Buffered is safe for both.
  ctx.connection.fetch.register({
    path: `${ROUTE}${path}`,
    methods,
    requestBody: 'buffered',
    async fetch(request) {
      try {
        return await handler(request);
      } catch (error) {
        return fail(error);
      }
    },
  });
}

export function apply(ctx, config) {
  configure(config.root);
  try {
    ensureTaskFiles();
  } catch (error) {
    ctx.logger?.warn?.(`personalos: 初始化数据文件失败：${String(error?.message ?? error)}`);
  }

  registerRoute(ctx, '/health', ['GET'], async () =>
    respond({ ok: true, version: VERSION, workspace: workspaceRoot(), timeZone: TIME_ZONE, date: nowDate() }));

  registerRoute(ctx, '/overview', ['GET'], async () => {
    ensureTaskFiles();
    return respond({ ok: true, version: VERSION, generatedAt: new Date().toISOString(), ...buildOverview() });
  });

  registerRoute(ctx, '/action', ['POST'], async (request) => {
    const body = await readBody(request);
    const result = await handleAction(body);
    return respond({ ok: true, ...result, data: buildOverview() });
  });

  for (const [path, methods, handler] of [
    ['/notes/tree', ['GET'], handleNotes],
    ['/notes/targets', ['GET'], handleNotes],
    ['/notes/file', ['GET'], handleNotes],
    ['/notes/save', ['POST'], handleNotes],
    ['/notes/create', ['POST'], handleNotes],
    ['/notes/new', ['POST'], handleNotes],
    ['/notes/mkdir', ['POST'], handleNotes],
    ['/notes/rename', ['POST'], handleNotes],
    ['/notes/rename-dir', ['POST'], handleNotes],
    ['/notes/move', ['POST'], handleNotes],
    ['/notes/delete-dir', ['POST'], handleNotes],
    ['/notes/delete', ['POST'], handleNotes],
    ['/notes/tidy', ['POST'], handleNotes],
    ['/notes/upload', ['POST'], handleNotes],
  ]) {
    registerRoute(ctx, path, methods, async (request) => respond(await handler(path, request)));
  }
}
