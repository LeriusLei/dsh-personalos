// 数据层测试：在临时目录里跑，不碰真实用户数据。
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import {
  StoreError,
  VERSION,
  addTask,
  addTodayTask,
  buildOverview,
  captureNote,
  classifyKnowledge,
  configure,
  ensureTaskFiles,
  listKnowledgeTree,
  moveToToday,
  readScope,
  resolveNotePath,
  saveNote,
  tidyMarkdown,
  toggleTask,
  workspaceRoot,
} from '../dsh/store.js';

function freshRoot() {
  const dir = mkdtempSync(join(tmpdir(), 'personalos-workbench-'));
  configure(dir);
  ensureTaskFiles();
  return dir;
}

test('初始化：在配置的数据目录下建出任务文件与知识库分类', () => {
  const dir = freshRoot();
  try {
    assert.equal(workspaceRoot(), dir);
    assert.ok(existsSync(join(dir, '任务总清单', '未完成.md')));
    assert.ok(existsSync(join(dir, '任务总清单', '已完成.md')));
    assert.ok(existsSync(join(dir, '今日任务', '未完成.md')));
    assert.ok(existsSync(join(dir, '知识库', '随想')));
    assert.equal(typeof VERSION, 'string');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('任务：新增、去重、完成、移入今日与总览计数', () => {
  const dir = freshRoot();
  try {
    addTask('total', { title: '整理投稿材料' });
    assert.throws(() => addTask('total', { title: '整理投稿材料' }), StoreError);
    addTodayTask({ title: '写工作台说明' });
    toggleTask('today', 0);
    addTask('total', { title: '补充截图' });
    moveToToday(1);

    const overview = buildOverview();
    assert.equal(overview.counts.todayOpen, 1);
    assert.ok(overview.counts.totalOpen >= 1);
    assert.ok(overview.counts.todayDone >= 1);
    assert.equal(readScope('total').open.some((task) => task.title === '补充截图'), false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('笔记：随笔自动分类、自动起标题并落盘为 Markdown', () => {
  const dir = freshRoot();
  try {
    const note = captureNote('今天读《深度工作》，意识到注意力是稀缺资源，专注力需要刻意保护。', {});
    assert.equal(note.category, '阅读与认知');
    assert.ok(note.title.length > 0);
    assert.ok(existsSync(join(dir, '知识库', '阅读与认知')));
    assert.ok(listKnowledgeTree().some((node) => node.path === '知识库'));
    assert.equal(classifyKnowledge('大模型的上下文窗口与 RAG 检索'), 'AI 技术');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('安全：越界路径被拒绝，只允许写配置目录内的 Markdown', () => {
  const dir = freshRoot();
  try {
    saveNote('知识库/随想/测试.md', '# 测试\n');
    assert.ok(existsSync(join(dir, '知识库', '随想', '测试.md')));
    assert.throws(() => resolveNotePath('../outside.md'), StoreError);
    assert.throws(() => resolveNotePath('知识库/../../outside.md'), StoreError);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('排版：整理 Markdown 时保留内容、清掉多余空行与行尾空格', () => {
  const text = '# 标题   \n\n\n正文内容  \n\n';
  const tidied = tidyMarkdown(text);
  assert.ok(tidied.includes('# 标题'));
  assert.ok(tidied.includes('正文内容'));
  assert.ok(!/\n{3,}/.test(tidied));
});

test('未配置数据目录时直接报错，避免误写其他目录', () => {
  assert.throws(() => configure(''), StoreError);
  assert.throws(() => configure('   '), StoreError);
});
