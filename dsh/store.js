// PersonalOS 数据层：任务总清单 / 今日任务 / 知识库
// 设计目标：4 个 Markdown 文件 + 一个知识库目录，不做数据库、不做复杂结构；
// 数据目录由工作台配置（cordis.patch.yml 的 root）决定，卸载工作台不会删除用户数据。
import {
  existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmdirSync, statSync,
  unlinkSync, writeFileSync,
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';

export const VERSION = '1.0.0';
export const TIME_ZONE = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

// 工作台只读写自己配置的数据目录，没有硬编码路径。
let ROOT = '';
export function configure(root) {
  const value = String(root ?? '').trim();
  if (!value) throw new StoreError('工作台数据目录未配置。');
  ROOT = resolve(value);
  return ROOT;
}
export function workspaceRoot() {
  return ROOT;
}

export const FILE_TOTAL_OPEN = '任务总清单/未完成.md';
export const FILE_TOTAL_DONE = '任务总清单/已完成.md';
export const FILE_TODAY_OPEN = '今日任务/未完成.md';
export const FILE_TODAY_DONE = '今日任务/已完成.md';
export const KNOWLEDGE_ROOT = '知识库';
export const ATTACH_ROOT = '知识库/附件';
export const KNOWLEDGE_CATEGORIES = ['AI 技术', '阅读与认知', '产业与商业', '方法论', '随想'];

const STATE_FILE = '.personalos/state.json';
const INBOX_DIR = '.personalos/inbox';
const TASK_FILES = [FILE_TOTAL_OPEN, FILE_TOTAL_DONE, FILE_TODAY_OPEN, FILE_TODAY_DONE];
const WRITE_RETRY_CODES = new Set(['EPERM', 'EACCES', 'EBUSY', 'EEXIST']);

const SCOPES = {
  total: { open: FILE_TOTAL_OPEN, done: FILE_TOTAL_DONE, label: '任务总清单' },
  today: { open: FILE_TODAY_OPEN, done: FILE_TODAY_DONE, label: '今日任务' },
};

export class StoreError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

// ── 基础工具 ────────────────────────────────────────────────
export function abs(relPath) {
  if (!ROOT) throw new StoreError('工作台数据目录未配置。');
  return join(ROOT, relPath);
}
const pad2 = (value) => String(value).padStart(2, '0');
export function nowDate() {
  const now = new Date();
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
}
export function nowDateTime() {
  const now = new Date();
  return `${nowDate()} ${pad2(now.getHours())}:${pad2(now.getMinutes())}`;
}
function sleepSync(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}
export function readText(relPath) {
  return readFileSync(abs(relPath), 'utf8').replace(/\r\n/g, '\n');
}
export function writeTextAtomic(relPath, text) {
  const target = abs(relPath);
  const dir = dirname(target);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const tmp = `${target}.tmp-${process.pid}-${Date.now()}`;
  writeFileSync(tmp, text, 'utf8');
  for (let attempt = 0; attempt < 6; attempt += 1) {
    try {
      writeFileSync(target, text, 'utf8');
      try { unlinkSync(tmp); } catch { /* ignore */ }
      return;
    } catch (error) {
      if (!WRITE_RETRY_CODES.has(error?.code)) break;
      sleepSync(30 * (attempt + 1));
    }
  }
  try { writeFileSync(target, text, 'utf8'); } finally { try { unlinkSync(tmp); } catch { /* ignore */ } }
}
function ensureDir(relPath) {
  const target = abs(relPath);
  if (!existsSync(target)) mkdirSync(target, { recursive: true });
}

// ── 任务文件 ────────────────────────────────────────────────
const URL_RE = /^\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)$/;
const DONE_SUFFIX_RE = /\s*·\s*(\d{4}-\d{2}-\d{2} \d{2}:\d{2})\s*$/;
const LINE_RE = /^(\d+)\.\s+\[([ xX])\]\s+(.*)$/;

export function parseTaskLines(markdown, done) {
  const items = [];
  for (const raw of String(markdown).split('\n')) {
    const match = raw.trim().match(LINE_RE);
    if (!match) continue;
    const checked = match[2].toLowerCase() === 'x';
    if (checked !== Boolean(done)) continue;
    let body = match[3].trim();
    let time = '';
    const timeMatch = body.match(DONE_SUFFIX_RE);
    if (timeMatch) { time = timeMatch[1]; body = body.slice(0, timeMatch.index).trim(); }
    let title = body;
    let url = '';
    const urlMatch = body.match(URL_RE);
    if (urlMatch) { title = urlMatch[1]; url = urlMatch[2]; }
    items.push({ title, url, time });
  }
  return items;
}

function taskBody(item) {
  return item.url ? `[${item.title}](${item.url})` : item.title;
}
function headerOf(scope, done) {
  const { label } = SCOPES[scope];
  const suffix = done ? '已完成' : '未完成';
  const hint = done ? '按完成顺序排列，任务名 + 完成时间' : '数字 = 添加顺序，最先加入的在最上面';
  if (scope === 'today') return `# 今日任务 · ${suffix}（${nowDate()}）\n\n<!-- PersonalOS 自动维护：${hint}，未完成的今日任务每天自动顺延 -->\n\n`;
  return `# ${label} · ${suffix}\n\n<!-- PersonalOS 自动维护：${hint} -->\n\n`;
}
function renderList(scope, done, items) {
  const lines = items.map((item, index) => {
    const n = index + 1;
    const time = done && item.time ? ` · ${item.time}` : '';
    return `${n}. [${done ? 'x' : ' '}] ${taskBody(item)}${time}`;
  });
  return headerOf(scope, done) + lines.join('\n') + (lines.length ? '\n' : '');
}

export function readScope(scope) {
  const files = SCOPES[scope];
  if (!files) throw new StoreError(`未知清单：${scope}`, 400);
  ensureTaskFiles();
  return {
    open: parseTaskLines(existsSync(abs(files.open)) ? readText(files.open) : '', false),
    done: parseTaskLines(existsSync(abs(files.done)) ? readText(files.done) : '', true),
  };
}
export function writeScope(scope, list) {
  const files = SCOPES[scope];
  writeTextAtomic(files.open, renderList(scope, false, list.open));
  writeTextAtomic(files.done, renderList(scope, true, list.done));
}

export function ensureTaskFiles() {
  ensureDir('任务总清单');
  ensureDir('今日任务');
  ensureDir('.personalos');
  ensureDir(INBOX_DIR);
  for (const rel of TASK_FILES) {
    if (!existsSync(abs(rel))) {
      const scope = rel.startsWith('今日任务') ? 'today' : 'total';
      const done = rel.includes('已完成');
      writeTextAtomic(rel, renderList(scope, done, []));
    }
  }
  ensureKnowledgeDirs();
  rolloverToday();
}

function defaultState() {
  return { version: 1, lastRolloverDate: '', updatedAt: new Date().toISOString() };
}
export function readState() {
  if (!existsSync(abs(STATE_FILE))) return defaultState();
  try {
    const parsed = JSON.parse(readText(STATE_FILE));
    return { ...defaultState(), ...parsed };
  } catch {
    return defaultState();
  }
}
export function writeState(next) {
  writeTextAtomic(STATE_FILE, JSON.stringify({ ...next, updatedAt: new Date().toISOString() }, null, 2));
}

/** 新的一天：昨天没勾的今日任务自动顺延；昨天的已完成合并进总清单已完成。 */
export function rolloverToday() {
  const date = nowDate();
  const state = readState();
  if (state.lastRolloverDate === date) return false;

  const today = readScopeRaw('today');
  const total = readScopeRaw('total');
  if (today.done.length) {
    const existing = new Set(total.done.map((item) => `${item.title}|${item.time}`));
    for (const item of today.done) {
      if (!existing.has(`${item.title}|${item.time}`)) total.done.push(item);
    }
    writeScope('total', total);
  }
  today.done = [];
  if (state.lastRolloverDate) {
    // 未完成的今日任务原样保留 → 自动成为今天的今日任务
    writeScope('today', today);
  }
  writeState({ ...state, lastRolloverDate: date });
  return true;
}

function readScopeRaw(scope) {
  const files = SCOPES[scope];
  return {
    open: existsSync(abs(files.open)) ? parseTaskLines(readText(files.open), false) : [],
    done: existsSync(abs(files.done)) ? parseTaskLines(readText(files.done), true) : [],
  };
}

function normalizeTitle(title) {
  const text = String(title ?? '').replace(/\s+/g, ' ').trim();
  if (!text) throw new StoreError('任务内容不能为空', 400);
  return text;
}

export function addTask(scope, input) {
  const title = normalizeTitle(input?.title);
  const list = readScope(scope);
  const exists = list.open.some((item) => item.title === title);
  if (exists) throw new StoreError(`「${title}」已经在清单里了`, 409);
  const url = /^https?:\/\//.test(String(input?.url ?? '').trim()) ? String(input.url).trim() : '';
  list.open.push({ title, url, time: '' });
  writeScope(scope, list);
  return { scope, title };
}

export function addTasks(scope, titles) {
  const added = [];
  const list = readScope(scope);
  const seen = new Set(list.open.map((item) => item.title));
  for (const raw of titles) {
    const title = String(raw ?? '').replace(/^\s*(?:[-*]|\d+[.)])\s*/, '').trim();
    if (!title || seen.has(title)) continue;
    seen.add(title);
    list.open.push({ title, url: '', time: '' });
    added.push(title);
  }
  if (added.length) writeScope(scope, list);
  return added;
}

export function toggleTask(scope, index) {
  const list = readScope(scope);
  const item = list.open[index];
  if (!item) throw new StoreError('任务不存在', 404);
  const time = nowDateTime();
  list.open.splice(index, 1);
  list.done.push({ title: item.title, url: item.url, time });
  writeScope(scope, list);
  if (scope === 'today') {
    const total = readScope('total');
    const openIdx = total.open.findIndex((entry) => entry.title === item.title);
    if (openIdx >= 0) total.open.splice(openIdx, 1);
    const doneIdx = total.done.findIndex((entry) => entry.title === item.title && entry.time === time);
    if (doneIdx < 0) total.done.push({ title: item.title, url: item.url, time });
    writeScope('total', total);
  }
  return { title: item.title, time };
}

export function editTask(scope, index, input) {
  const list = readScope(scope);
  const item = list.open[index];
  if (!item) throw new StoreError('任务不存在', 404);
  if (input?.title !== undefined) item.title = normalizeTitle(input.title);
  if (input?.url !== undefined) item.url = /^https?:\/\//.test(String(input.url).trim()) ? String(input.url).trim() : '';
  writeScope(scope, list);
  return item;
}

export function deleteTask(scope, index) {
  const list = readScope(scope);
  const item = list.open[index];
  if (!item) throw new StoreError('任务不存在', 404);
  list.open.splice(index, 1);
  writeScope(scope, list);
  return item;
}

export function moveToToday(index) {
  const total = readScope('total');
  const item = total.open[index];
  if (!item) throw new StoreError('任务不存在', 404);
  total.open.splice(index, 1);
  writeScope('total', total);
  const today = readScope('today');
  if (!today.open.some((entry) => entry.title === item.title)) {
    today.open.push({ title: item.title, url: item.url, time: '' });
    writeScope('today', today);
  }
  return item;
}

/** 今日清单里加一条：同时确保总清单也有（未完成时两处都在）。 */
export function addTodayTask(input) {
  const title = normalizeTitle(input?.title);
  const today = readScope('today');
  if (today.open.some((item) => item.title === title)) throw new StoreError(`「${title}」已经在今日清单里了`, 409);
  const url = /^https?:\/\//.test(String(input?.url ?? '').trim()) ? String(input.url).trim() : '';
  today.open.push({ title, url, time: '' });
  writeScope('today', today);
  const total = readScope('total');
  if (!total.open.some((item) => item.title === title) && !total.done.some((item) => item.title === title)) {
    total.open.push({ title, url, time: '' });
    writeScope('total', total);
  }
  return { title };
}

// ── 整理排版（只改排版，不改内容） ──────────────────────────
export function tidyMarkdown(text) {
  const lines = String(text ?? '').replace(/\r\n/g, '\n').split('\n');
  const out = [];
  let blank = 0;
  for (const raw of lines) {
    let line = raw.replace(/[ \t]+$/g, '');
    if (!line.trim()) { blank += 1; continue; }
    if (blank > 0 && out.length > 0) out.push('');
    blank = 0;
    if (/^\s*#{1,6}\S/.test(line)) line = line.replace(/^(\s*#{1,6})\s*/, '$1 ');
    if (/^\s*(?:[-*+]|\d+[.)])\s+/.test(line)) {
      let content = line.replace(/^\s*(?:[-*+]|\d+[.)])\s+/, '');
      while (/^(?:[-*+]|\d+[.)])\s+/.test(content)) content = content.replace(/^(?:[-*+]|\d+[.)])\s+/, '');
      let prefix = '- ';
      if (/^\[\s*\]\s+/.test(content)) { prefix = '- [ ] '; content = content.replace(/^\[\s*\]\s+/, ''); }
      else if (/^\[[xX]\]\s+/.test(content)) { prefix = '- [x] '; content = content.replace(/^\[[xX]\]\s+/, ''); }
      line = prefix + content;
    } else if (/^\s*\[\s*\]\s+/.test(line)) line = line.replace(/^\s*\[\s*\]\s+/, '- [ ] ');
    else if (/^\s*\[[xX]\]\s+/.test(line)) line = line.replace(/^\s*\[[xX]\]\s+/, '- [x] ');
    out.push(line);
  }
  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
}

// ── 知识库 ──────────────────────────────────────────────────
const CATEGORY_HINTS = {
  'AI 技术': ['ai', 'agent', 'harness', 'llm', '大模型', '模型', 'prompt', '提示词', 'mcp', 'rag', '向量', '算法', '代码', '编程', 'api', '微调', '推理', 'embedding', 'token', 'dsh', '插件', '工作流引擎', '智能体', '上下文', '训练', '评测', '工具调用'],
  '阅读与认知': ['读书', '阅读', '书', '作者', '认知', '思维', '心理学', '记忆', '学习', '理解', '观点', '启发', '反思', '成长', '习惯', '概念', '知识', '洞察', '元认知', '注意力'],
  '产业与商业': ['产业', '商业', '市场', '趋势', '公司', '行业', '竞争', '融资', '经济', '产品', '用户', '模式', '营收', '创业', '需求', '增长', '供应链', '战略', '投资', '商业化'],
  '方法论': ['方法', '流程', '系统', '模板', '效率', '工具', '框架', '决策', '复盘', '计划', '整理', '知识管理', '笔记法', '原则', '清单', '自动化', '工作流', '实践'],
};
export function classifyKnowledge(text) {
  const haystack = String(text ?? '').toLowerCase();
  let best = '随想';
  let bestScore = 0;
  for (const [category, words] of Object.entries(CATEGORY_HINTS)) {
    let score = 0;
    for (const word of words) if (haystack.includes(word)) score += 1;
    if (score > bestScore) { bestScore = score; best = category; }
  }
  return best;
}
function keywordTags(text, limit = 4) {
  const haystack = String(text ?? '').toLowerCase();
  const tags = [];
  for (const words of Object.values(CATEGORY_HINTS)) {
    for (const word of words) {
      if (word.length < 2) continue;
      if (haystack.includes(word) && !tags.includes(word)) tags.push(word);
      if (tags.length >= limit) return tags;
    }
  }
  return tags;
}
export function autoTitle(text) {
  for (const raw of String(text ?? '').split('\n')) {
    let line = raw.trim();
    if (!line) continue;
    if (/^---+$/.test(line) || /^<!--/.test(line)) continue;
    line = line.replace(/^#{1,6}\s*/, '').replace(/^[-*+]\s+/, '').replace(/^\d+[.)]\s+/, '');
    line = line.replace(/!?\[\[([^\]]+)\]\]/g, '$1').replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/[*_`>]/g, '').trim();
    line = line.replace(/^[「『"'“]+|[」』"'”]+$/g, '').trim();
    line = line.replace(/[。！？!?,，；;：:…]+$/, '').trim();
    if (!line) continue;
    return line.length > 28 ? `${line.slice(0, 28)}…` : line;
  }
  return `笔记 ${nowDate()}`;
}
function safeSegment(name) {
  return String(name ?? '').replace(/[\\/:*?"<>|#^[\]]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60);
}
function ensureKnowledgeDirs() {
  ensureDir(KNOWLEDGE_ROOT);
  ensureDir(ATTACH_ROOT);
  for (const category of KNOWLEDGE_CATEGORIES) ensureDir(`${KNOWLEDGE_ROOT}/${category}`);
}
function uniqueNotePath(category, title) {
  const base = safeSegment(title) || `笔记 ${nowDate()}`;
  let rel = `${KNOWLEDGE_ROOT}/${category}/${base}.md`;
  let i = 2;
  while (existsSync(abs(rel))) { rel = `${KNOWLEDGE_ROOT}/${category}/${base} ${i}.md`; i += 1; }
  return rel;
}
function recentNotesInCategory(category, excludeRel, limit = 3) {
  const dirRel = `${KNOWLEDGE_ROOT}/${category}`;
  const target = abs(dirRel);
  if (!existsSync(target)) return [];
  const files = [];
  for (const name of readdirSync(target)) {
    if (!name.endsWith('.md') || name.startsWith('.')) continue;
    const rel = `${dirRel}/${name}`;
    if (rel === excludeRel) continue;
    try {
      files.push({ rel, name: name.replace(/\.md$/, ''), mtime: statSync(abs(rel)).mtimeMs });
    } catch { /* ignore */ }
  }
  return files.sort((a, b) => b.mtime - a.mtime).slice(0, limit);
}

export function createKnowledgeNote({ text, category, title }) {
  ensureKnowledgeDirs();
  const tidy = tidyMarkdown(text);
  const finalTitle = safeSegment(title) || autoTitle(tidy);
  const finalCategory = KNOWLEDGE_CATEGORIES.includes(category) ? category : classifyKnowledge(tidy);
  const rel = uniqueNotePath(finalCategory, finalTitle);
  const tags = keywordTags(tidy);
  const tagBlock = tags.length ? `tags:\n${tags.map((tag) => `  - ${tag}`).join('\n')}\n` : '';
  const front = `---\ntitle: ${finalTitle}\ndate: ${nowDate()}\ntype: note\ncategory: ${finalCategory}\n${tagBlock}---\n\n`;
  const related = recentNotesInCategory(finalCategory, rel);
  const relatedBlock = related.length
    ? `\n\n## 相关\n${related.map((item) => `- [[${item.name}]]`).join('\n')}\n`
    : '';
  writeTextAtomic(rel, front + tidy + relatedBlock);
  return { path: rel, title: finalTitle, category: finalCategory, tags, related: related.map((item) => item.name) };
}

const TREE_ROOTS = ['任务总清单', '今日任务', KNOWLEDGE_ROOT];
export function listKnowledgeTree() {
  ensureTaskFiles();
  const walk = (relDir, depth) => {
    const target = abs(relDir);
    if (!existsSync(target)) return [];
    const entries = readdirSync(target).filter((name) => !name.startsWith('.'));
    const dirs = [];
    const files = [];
    for (const name of entries) {
      const rel = `${relDir}/${name}`;
      const stat = statSync(abs(rel));
      if (stat.isDirectory()) {
        if (name === '附件') continue;
        const children = depth < 2 ? walk(rel, depth + 1) : [];
        dirs.push({ name, path: rel, type: 'dir', children });
      } else if (name.endsWith('.md')) {
        files.push({ name: name.replace(/\.md$/, ''), path: rel, type: 'file' });
      }
    }
    return [...dirs, ...files];
  };
  return TREE_ROOTS.map((root) => ({ name: root, path: root, type: 'dir', children: walk(root, 0) }));
}

export function isReadablePath(relPath) {
  const normalized = String(relPath ?? '').replace(/\\/g, '/');
  if (normalized.includes('..')) return false;
  if (!normalized.endsWith('.md')) return false;
  return TREE_ROOTS.some((root) => normalized === root || normalized.startsWith(`${root}/`)) || normalized === KNOWLEDGE_ROOT;
}
export function resolveNotePath(relPath, { allowCreate = false } = {}) {
  const normalized = String(relPath ?? '').replace(/\\/g, '/').replace(/^\.\//, '').trim();
  if (!normalized) throw new StoreError('路径不能为空', 400);
  if (!normalized.endsWith('.md')) throw new StoreError('只支持 .md 文件', 400);
  if (normalized.includes('..')) throw new StoreError('路径不合法', 400);
  if (!allowCreate && !isReadablePath(normalized)) throw new StoreError('路径不在可访问范围', 403);
  if (allowCreate) {
    const rootOk = TREE_ROOTS.some((root) => normalized.startsWith(`${root}/`));
    if (!rootOk) throw new StoreError('新建文件必须在任务/今日任务/知识库目录内', 403);
  }
  return normalized;
}
export function readNote(relPath) {
  const rel = resolveNotePath(relPath);
  if (!existsSync(abs(rel))) throw new StoreError('文件不存在', 404);
  return readText(rel);
}
export function saveNote(relPath, content) {
  const rel = resolveNotePath(relPath, { allowCreate: true });
  const created = !existsSync(abs(rel));
  writeTextAtomic(rel, String(content ?? ''));
  return { path: rel, created };
}
export function deleteNote(relPath) {
  const rel = resolveNotePath(relPath);
  if (!existsSync(abs(rel))) throw new StoreError('文件不存在', 404);
  unlinkSync(abs(rel));
  return { path: rel };
}

// ── 知识库管理：新建 / 改名 / 移动 / 删除空目录 ────────────
function normalizeDirPath(relPath) {
  const normalized = String(relPath ?? '').replace(/\\/g, '/').replace(/^\.\//, '').replace(/\/+$/, '').trim();
  if (!normalized) throw new StoreError('目录不能为空', 400);
  if (normalized.includes('..')) throw new StoreError('路径不合法', 400);
  if (!TREE_ROOTS.some((root) => normalized === root || normalized.startsWith(`${root}/`))) {
    throw new StoreError('目录不在可访问范围', 403);
  }
  return normalized;
}
function categoryOf(relDir) {
  return relDir.startsWith(`${KNOWLEDGE_ROOT}/`) ? relDir.slice(KNOWLEDGE_ROOT.length + 1).split('/')[0] : '';
}
function walkMarkdown(relDir, visit) {
  if (!existsSync(abs(relDir))) return;
  for (const name of readdirSync(abs(relDir))) {
    if (name.startsWith('.')) continue;
    const childRel = `${relDir}/${name}`;
    if (statSync(abs(childRel)).isDirectory()) walkMarkdown(childRel, visit);
    else if (name.endsWith('.md')) visit(childRel);
  }
}
function rewriteWikiLinks(oldName, newName) {
  if (!oldName || !newName || oldName === newName) return 0;
  const escaped = oldName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`\\[\\[${escaped}(\\]\\]|\\||#)`, 'g');
  let changed = 0;
  walkMarkdown(KNOWLEDGE_ROOT, (rel) => {
    const text = readText(rel);
    const next = text.replace(pattern, (_match, tail) => `[[${newName}${tail}`);
    if (next !== text) { writeTextAtomic(rel, next); changed += 1; }
  });
  return changed;
}
function setCategoryFrontmatter(rel, category) {
  if (!category) return;
  const text = readText(rel);
  if (!/^category:\s*/m.test(text)) return;
  const next = text.replace(/^(category:\s*).*$/m, `$1${category}`);
  if (next !== text) writeTextAtomic(rel, next);
}
export function listMoveTargets() {
  ensureKnowledgeDirs();
  const root = abs(KNOWLEDGE_ROOT);
  const targets = [];
  for (const name of readdirSync(root)) {
    if (name.startsWith('.') || name === '附件') continue;
    const rel = `${KNOWLEDGE_ROOT}/${name}`;
    if (statSync(abs(rel)).isDirectory()) targets.push({ name, path: rel });
  }
  return targets;
}
export function createKnowledgeDir({ name }) {
  ensureKnowledgeDirs();
  const segment = safeSegment(name);
  if (!segment) throw new StoreError('目录名不能为空', 400);
  const rel = `${KNOWLEDGE_ROOT}/${segment}`;
  if (existsSync(abs(rel))) throw new StoreError(`目录「${segment}」已存在`, 409);
  mkdirSync(abs(rel), { recursive: true });
  return { path: rel, name: segment };
}
export function createNoteFile({ dir, name, content = '' }) {
  ensureKnowledgeDirs();
  const base = normalizeDirPath(dir || `${KNOWLEDGE_ROOT}/随想`);
  if (!base.startsWith(KNOWLEDGE_ROOT)) throw new StoreError('新建笔记只能在知识库内', 403);
  if (!existsSync(abs(base)) || !statSync(abs(base)).isDirectory()) throw new StoreError('目标目录不存在', 404);
  const title = safeSegment(name) || `未命名 ${nowDate()}`;
  let rel = `${base}/${title}.md`;
  let index = 2;
  while (existsSync(abs(rel))) { rel = `${base}/${title} ${index}.md`; index += 1; }
  const category = categoryOf(base);
  const tagBlock = '';
  const front = `---\ntitle: ${title}\ndate: ${nowDate()}\ntype: note\ncategory: ${category}\n${tagBlock}---\n\n`;
  writeTextAtomic(rel, front + (content ? tidyMarkdown(content) : ''));
  return { path: rel, title };
}
export function renameNote({ path, name }) {
  const rel = resolveNotePath(path);
  const target = safeSegment(name);
  if (!target) throw new StoreError('名称不能为空', 400);
  const dirRel = dirname(rel).replace(/\\/g, '/');
  const oldName = rel.split('/').pop().replace(/\.md$/, '');
  const next = `${dirRel}/${target}.md`;
  if (next === rel) return { path: rel, links: 0 };
  if (existsSync(abs(next))) throw new StoreError('同名文件已存在', 409);
  renameSync(abs(rel), abs(next));
  const links = rewriteWikiLinks(oldName, target);
  return { path: next, name: target, links };
}
export function renameDir({ path, name }) {
  const rel = normalizeDirPath(path);
  if (TREE_ROOTS.includes(rel)) throw new StoreError('不能重命名根目录', 403);
  if (!rel.startsWith(`${KNOWLEDGE_ROOT}/`)) throw new StoreError('只能重命名知识库内的目录', 403);
  if (rel === ATTACH_ROOT || rel.startsWith(`${ATTACH_ROOT}/`)) throw new StoreError('附件目录不能重命名', 403);
  const target = safeSegment(name);
  if (!target) throw new StoreError('名称不能为空', 400);
  const parent = dirname(rel).replace(/\\/g, '/');
  const next = `${parent}/${target}`;
  if (next === rel) return { path: rel };
  if (existsSync(abs(next))) throw new StoreError('同名目录已存在', 409);
  renameSync(abs(rel), abs(next));
  const oldCategory = categoryOf(rel);
  const newCategory = categoryOf(next);
  if (oldCategory && oldCategory !== newCategory) {
    walkMarkdown(next, (childRel) => setCategoryFrontmatter(childRel, newCategory));
  }
  return { path: next, name: target };
}
export function moveNote({ path, targetDir }) {
  const rel = resolveNotePath(path);
  const target = normalizeDirPath(targetDir);
  if (!target.startsWith(KNOWLEDGE_ROOT)) throw new StoreError('只能移动到知识库内的目录', 403);
  if (!existsSync(abs(target)) || !statSync(abs(target)).isDirectory()) throw new StoreError('目标目录不存在', 404);
  const filename = rel.split('/').pop();
  const next = `${target}/${filename}`;
  if (next === rel) return { path: rel };
  if (existsSync(abs(next))) throw new StoreError('目标目录已有同名文件', 409);
  renameSync(abs(rel), abs(next));
  setCategoryFrontmatter(next, categoryOf(target));
  return { path: next };
}
export function deleteDir({ path }) {
  const rel = normalizeDirPath(path);
  if (TREE_ROOTS.includes(rel)) throw new StoreError('不能删除根目录', 403);
  if (!rel.startsWith(`${KNOWLEDGE_ROOT}/`)) throw new StoreError('只能删除知识库内的目录', 403);
  if (rel === ATTACH_ROOT || rel.startsWith(`${ATTACH_ROOT}/`)) throw new StoreError('附件目录不能删除', 403);
  if (!existsSync(abs(rel))) throw new StoreError('目录不存在', 404);
  const entries = readdirSync(abs(rel)).filter((name) => !name.startsWith('.'));
  if (entries.length) throw new StoreError('目录不为空，先把里面的笔记移走', 409);
  rmdirSync(abs(rel));
  return { path: rel };
}
export function saveAttachment({ name, dataBase64 }) {
  ensureKnowledgeDirs();
  const ext = (String(name ?? '').match(/\.[A-Za-z0-9]+$/) || ['.png'])[0].toLowerCase();
  const allowed = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg']);
  if (!allowed.has(ext)) throw new StoreError('只支持图片文件（png/jpg/webp/gif/svg）', 400);
  const base = safeSegment(String(name ?? '').replace(/\.[A-Za-z0-9]+$/, '')) || `图片 ${Date.now()}`;
  let rel = `${ATTACH_ROOT}/${base}${ext}`;
  let i = 2;
  while (existsSync(abs(rel))) { rel = `${ATTACH_ROOT}/${base} ${i}${ext}`; i += 1; }
  const buffer = Buffer.from(String(dataBase64 ?? '').replace(/^data:[^,]+,/, ''), 'base64');
  if (!buffer.length) throw new StoreError('图片内容为空', 400);
  const target = abs(rel);
  if (!existsSync(dirname(target))) mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, buffer);
  return { path: rel, name: rel.split('/').pop(), size: buffer.length };
}

// ── 采集 ────────────────────────────────────────────────────
export function appendRawCapture(kind, text) {
  ensureDir(INBOX_DIR);
  const rel = `${INBOX_DIR}/${nowDate()}.md`;
  const stamp = nowDateTime();
  const block = `\n## ${stamp} · ${kind}\n\n${String(text ?? '').trim()}\n`;
  const existing = existsSync(abs(rel)) ? readText(rel) : `# 原始输入 ${nowDate()}\n`;
  writeTextAtomic(rel, `${existing.replace(/\s*$/, '')}\n${block}`);
  return rel;
}

// ── 采集：任务（支持末尾指令） ──────────────────────────────
const BRACKET_LINE_RE = /^[（(\[【]\s*(.*?)\s*[）)\]】]$/;
const ATTENTION_LINE_RE = /^[/／]attention\b[\s:：-]*(.*)$/i;
const INSTRUCTION_HINT_RE = /今日|今天|总|全部|都|以上|这些|其余|剩下|前\s*\d|第\s*\d|放|今日任务/;

export function parseTaskCapture(text) {
  const titles = [];
  let instruction = '';
  let attention = false;
  for (const raw of String(text ?? '').replace(/\r\n/g, '\n').split('\n')) {
    let line = raw.trim();
    if (!line) continue;
    const attentionMatch = line.match(ATTENTION_LINE_RE);
    if (attentionMatch) {
      attention = true;
      instruction = (attentionMatch[1] || '').trim() || instruction;
      continue;
    }
    line = line.replace(/^\s*(?:[-*]|\d+[.)])\s*/, '').trim();
    if (!line) continue;
    const bracket = line.match(BRACKET_LINE_RE);
    if (bracket && INSTRUCTION_HINT_RE.test(bracket[1])) {
      instruction = bracket[1].trim();
      continue;
    }
    titles.push(line);
  }
  if (!titles.length) throw new StoreError('没有识别到任务内容', 400);
  return { titles, instruction, attention };
}

function routeFromInstruction(instruction, total) {
  const picked = new Set();
  const text = String(instruction ?? '');
  if (!text || !/今日|今天/.test(text)) return picked;
  const hasExplicitPick = /前\s*\d|第\s*\d/.test(text);
  if (!hasExplicitPick && /以上|都|全部|所有|这些/.test(text)) {
    for (let index = 0; index < total; index += 1) picked.add(index);
    return picked;
  }
  const first = text.match(/前\s*(\d+)\s*[个条项]/);
  if (first) for (let index = 0; index < Math.min(Number(first[1]), total); index += 1) picked.add(index);
  const listMatches = [...text.matchAll(/第\s*([0-9]+(?:\s*[、,，和及]\s*[0-9]+)*)\s*[个条项]/g)];
  for (const match of listMatches) {
    for (const part of match[1].split(/[、,，和及]/)) {
      const index = Number(part) - 1;
      if (index >= 0 && index < total) picked.add(index);
    }
  }
  if (!first && listMatches.length === 0) for (let index = 0; index < total; index += 1) picked.add(index);
  return picked;
}

export function captureTasks(text) {
  const { titles, instruction, attention } = parseTaskCapture(text);
  appendRawCapture('task', text);
  const todayIndexes = routeFromInstruction(instruction, titles.length);
  const added = [];
  for (let index = 0; index < titles.length; index += 1) {
    const title = titles[index];
    const toToday = todayIndexes.has(index);
    try {
      if (toToday) addTodayTask({ title });
      else addTask('total', { title });
      added.push({ title, scope: toToday ? 'today' : 'total' });
    } catch (error) {
      if (Number(error?.status) !== 409) throw error;
      added.push({ title, scope: toToday ? 'today' : 'total', duplicate: true });
    }
  }
  const todayCount = added.filter((item) => item.scope === 'today').length;
  return { added, count: added.length, todayCount, totalCount: added.length - todayCount, instruction, attention };
}

export function captureCollection(text) {
  const lines = String(text ?? '').split('\n').map((line) => line.trim()).filter(Boolean);
  if (!lines.length) throw new StoreError('没有识别到收藏内容', 400);
  const urlLine = lines.find((line) => /^https?:\/\//.test(line)) || '';
  const url = urlLine || (lines.join(' ').match(/https?:\/\/\S+/) || [''])[0];
  const titleSource = lines.filter((line) => line !== urlLine).join(' ').replace(/https?:\/\/\S+/g, '').trim();
  const title = `学习：${titleSource ? titleSource.slice(0, 40) : (url ? '待读资料' : autoTitle(text))}`;
  addTask('total', { title, url });
  return { title, url };
}

export function captureNote(text, options = {}) {
  const raw = String(text ?? '').trim();
  if (!raw) throw new StoreError('笔记内容不能为空', 400);
  const preferredCategory = KNOWLEDGE_CATEGORIES.includes(options?.category) ? options.category : '';
  let content = raw;
  let title = '';
  let category = preferredCategory;
  const kept = [];
  for (const line of raw.replace(/\r\n/g, '\n').split('\n')) {
    const match = line.trim().match(BRACKET_LINE_RE);
    if (match) {
      const body = match[1];
      const catHit = KNOWLEDGE_CATEGORIES.find((name) => body.includes(name)) || '';
      const titleMatch = body.match(/(?:标题|题目|名字)[：:]\s*(.+)$/);
      if (catHit) category = catHit;
      if (titleMatch) title = titleMatch[1].trim();
      if (catHit || titleMatch) continue;
    }
    kept.push(line);
  }
  content = kept.join('\n').trim();
  if (!content) throw new StoreError('笔记正文不能为空', 400);
  const note = createKnowledgeNote({ text: content, title, category });
  appendRawCapture('note', raw);
  return note;
}

// ── 汇总 ────────────────────────────────────────────────────
export function buildOverview() {
  ensureTaskFiles();
  const total = readScope('total');
  const today = readScope('today');
  return {
    version: VERSION,
    date: nowDate(),
    time: nowDateTime().slice(11),
    today,
    total,
    counts: {
      todayOpen: today.open.length,
      todayDone: today.done.length,
      totalOpen: total.open.length,
      totalDone: total.done.length,
    },
    knowledge: { tree: listKnowledgeTree(), categories: KNOWLEDGE_CATEGORIES },
  };
}

export { SCOPES, TASK_FILES };
