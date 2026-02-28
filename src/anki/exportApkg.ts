/**
 * APKG 导出工具
 * 使用 sql.js（纯 JS SQLite）创建 Anki 数据库并打包为 .apkg
 */

import initSqlJs from 'sql.js';
import * as fs from 'fs';
import * as path from 'path';
import archiver from 'archiver';
import { NOTE_TYPE_NAME, FIELDS, FRONT_TEMPLATE, BACK_TEMPLATE, STYLING } from './noteType.js';
import type { NoteRecord } from '../csv.js';

/**
 * 生成唯一 ID（Anki 使用毫秒级时间戳）
 */
const generateId = (() => {
  let counter = 0;
  const base = Date.now();
  return () => base + (counter++);
})();

/**
 * 创建 Anki collection.anki2 数据库
 */
const createAnkiDatabase = async (
  dbPath: string,
  deckName: string,
  notes: NoteRecord[]
): Promise<void> => {
  const SQL = await initSqlJs();
  const db = new SQL.Database();

  // 创建表结构（Anki 2.1 schema）
  db.run(`
    CREATE TABLE IF NOT EXISTS col (
      id INTEGER PRIMARY KEY,
      crt INTEGER NOT NULL,
      mod INTEGER NOT NULL,
      scm INTEGER NOT NULL,
      ver INTEGER NOT NULL,
      dty INTEGER NOT NULL,
      usn INTEGER NOT NULL,
      ls INTEGER NOT NULL,
      conf TEXT NOT NULL,
      models TEXT NOT NULL,
      decks TEXT NOT NULL,
      dconf TEXT NOT NULL,
      tags TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS notes (
      id INTEGER PRIMARY KEY,
      guid TEXT NOT NULL,
      mid INTEGER NOT NULL,
      mod INTEGER NOT NULL,
      usn INTEGER NOT NULL,
      tags TEXT NOT NULL,
      flds TEXT NOT NULL,
      sfld TEXT NOT NULL,
      csum INTEGER NOT NULL,
      flags INTEGER NOT NULL,
      data TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS cards (
      id INTEGER PRIMARY KEY,
      nid INTEGER NOT NULL,
      did INTEGER NOT NULL,
      ord INTEGER NOT NULL,
      mod INTEGER NOT NULL,
      usn INTEGER NOT NULL,
      type INTEGER NOT NULL,
      queue INTEGER NOT NULL,
      due INTEGER NOT NULL,
      ivl INTEGER NOT NULL,
      factor INTEGER NOT NULL,
      reps INTEGER NOT NULL,
      lapses INTEGER NOT NULL,
      left INTEGER NOT NULL,
      odue INTEGER NOT NULL,
      odid INTEGER NOT NULL,
      flags INTEGER NOT NULL,
      data TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS revlog (
      id INTEGER PRIMARY KEY,
      cid INTEGER NOT NULL,
      usn INTEGER NOT NULL,
      ease INTEGER NOT NULL,
      ivl INTEGER NOT NULL,
      lastIvl INTEGER NOT NULL,
      factor INTEGER NOT NULL,
      time INTEGER NOT NULL,
      type INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS graves (
      usn INTEGER NOT NULL,
      oid INTEGER NOT NULL,
      type INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS ix_notes_usn ON notes (usn);
    CREATE INDEX IF NOT EXISTS ix_cards_usn ON cards (usn);
    CREATE INDEX IF NOT EXISTS ix_revlog_usn ON revlog (usn);
    CREATE INDEX IF NOT EXISTS ix_cards_nid ON cards (nid);
    CREATE INDEX IF NOT EXISTS ix_cards_sched ON cards (did, queue, due);
    CREATE INDEX IF NOT EXISTS ix_revlog_cid ON revlog (cid);
    CREATE INDEX IF NOT EXISTS ix_notes_csum ON notes (csum);
  `);

  const now = Math.floor(Date.now() / 1000);
  const modelId = generateId();
  const deckId = generateId();

  // 模型（笔记类型）配置
  const models: Record<string, object> = {
    [modelId.toString()]: {
      id: modelId,
      name: NOTE_TYPE_NAME,
      type: 0, // 标准模型
      mod: now,
      usn: -1,
      sortf: 1, // 按 CN 字段排序
      did: deckId,
      tmpls: [{
        name: 'CN→EN',
        ord: 0,
        qfmt: FRONT_TEMPLATE,
        afmt: BACK_TEMPLATE,
        bqfmt: '',
        bafmt: '',
        did: null,
        bfont: '',
        bsize: 0,
      }],
      flds: FIELDS.map((name, ord) => ({
        name,
        ord,
        sticky: false,
        rtl: false,
        font: 'Arial',
        size: 20,
        description: '',
        plainText: false,
        collapsed: false,
        excludeFromSearch: false,
      })),
      css: STYLING,
      latexPre: '',
      latexPost: '',
      latexsvg: false,
      req: [[0, 'any', [1]]], // 第一个模板，任意条件，需要第 2 个字段 (CN)
    },
  };

  // 牌组配置
  const decks: Record<string, object> = {
    '1': {
      id: 1,
      mod: now,
      name: 'Default',
      usn: -1,
      lrnToday: [0, 0],
      revToday: [0, 0],
      newToday: [0, 0],
      timeToday: [0, 0],
      collapsed: false,
      browserCollapsed: false,
      desc: '',
      dyn: 0,
      conf: 1,
    },
    [deckId.toString()]: {
      id: deckId,
      mod: now,
      name: deckName,
      usn: -1,
      lrnToday: [0, 0],
      revToday: [0, 0],
      newToday: [0, 0],
      timeToday: [0, 0],
      collapsed: false,
      browserCollapsed: false,
      desc: '',
      dyn: 0,
      conf: 1,
    },
  };

  // 牌组配置
  const dconf: Record<string, object> = {
    '1': {
      id: 1,
      mod: 0,
      name: 'Default',
      usn: 0,
      maxTaken: 60,
      autoplay: true,
      timer: 0,
      replayq: true,
      new: {
        bury: false,
        delays: [1, 10],
        initialFactor: 2500,
        ints: [1, 4, 0],
        order: 1,
        perDay: 20,
      },
      rev: {
        bury: false,
        ease4: 1.3,
        ivlFct: 1,
        maxIvl: 36500,
        perDay: 200,
        hardFactor: 1.2,
      },
      lapse: {
        delays: [10],
        leechAction: 1,
        leechFails: 8,
        minInt: 1,
        mult: 0,
      },
    },
  };

  // 全局配置
  const conf = {
    activeDecks: [1],
    curDeck: 1,
    newSpread: 0,
    collapseTime: 1200,
    timeLim: 0,
    estTimes: true,
    dueCounts: true,
    curModel: modelId.toString(),
    nextPos: 1,
    sortType: 'noteFld',
    sortBackwards: false,
    addToCur: true,
  };

  // 插入 col 记录
  db.run(
    `INSERT INTO col (id, crt, mod, scm, ver, dty, usn, ls, conf, models, decks, dconf, tags)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      1,
      now,
      now * 1000,
      now * 1000,
      11, // schema version
      0,
      0,
      0,
      JSON.stringify(conf),
      JSON.stringify(models),
      JSON.stringify(decks),
      JSON.stringify(dconf),
      '{}',
    ]
  );

  // 简单的 checksum 计算
  const checksum = (s: string): number => {
    let hash = 0;
    for (let i = 0; i < s.length; i++) {
      hash = ((hash << 5) - hash) + s.charCodeAt(i);
      hash = hash & hash;
    }
    return Math.abs(hash) % 0xFFFFFFFF;
  };

  // 生成 GUID
  const generateGuid = (): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let guid = '';
    for (let i = 0; i < 10; i++) {
      guid += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return guid;
  };

  db.run('BEGIN TRANSACTION');

  let dueCounter = 0;
  const insertNote = db.prepare(
    `INSERT INTO notes (id, guid, mid, mod, usn, tags, flds, sfld, csum, flags, data)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const insertCard = db.prepare(
    `INSERT INTO cards (id, nid, did, ord, mod, usn, type, queue, due, ivl, factor, reps, lapses, left, odue, odid, flags, data)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  for (const note of notes) {
    const noteId = generateId();
    const cardId = generateId();

    // 字段值（用 0x1f 分隔）
    const fieldValues = FIELDS.map(f => note[f as keyof NoteRecord] || '').join('\x1f');

    // 排序字段（CN）
    const sortField = note.CN;

    // 标签
    const tags = note.Tags ? ` ${note.Tags} ` : '';

    insertNote.run([
      noteId,
      generateGuid(),
      modelId,
      now,
      -1,
      tags,
      fieldValues,
      sortField,
      checksum(sortField),
      0,
      '',
    ]);

    insertCard.run([
      cardId,
      noteId,
      deckId,
      0, // ord: 第一个模板
      now,
      -1,
      0, // type: new
      0, // queue: new
      dueCounter++, // due
      0, // ivl
      0, // factor
      0, // reps
      0, // lapses
      0, // left
      0, // odue
      0, // odid
      0, // flags
      '', // data
    ]);
  }

  insertNote.free();
  insertCard.free();
  db.run('COMMIT');

  const data = db.export();
  fs.writeFileSync(dbPath, Buffer.from(data));
  db.close();
};

/**
 * 打包为 .apkg 文件
 */
const createApkgArchive = async (
  dbPath: string,
  outputPath: string
): Promise<void> => {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(outputPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => resolve());
    archive.on('error', (err) => reject(err));

    archive.pipe(output);

    // 添加数据库文件
    archive.file(dbPath, { name: 'collection.anki2' });

    // 添加空的 media 文件（必需）
    archive.append('{}', { name: 'media' });

    archive.finalize();
  });
};

/**
 * 导出 APKG 文件
 * @param notes 笔记记录数组
 * @param outputPath 输出 .apkg 文件路径
 * @param deckName 牌组名称
 */
export const exportApkg = async (
  notes: NoteRecord[],
  outputPath: string,
  deckName: string = 'ActiveVocab'
): Promise<void> => {
  // 创建临时目录
  const tempDir = path.join(path.dirname(outputPath), '.anki-temp');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const dbPath = path.join(tempDir, 'collection.anki2');

  try {
    // 创建数据库
    await createAnkiDatabase(dbPath, deckName, notes);

    // 打包为 apkg
    await createApkgArchive(dbPath, outputPath);

    console.log(`✓ 成功导出 ${notes.length} 张卡片到 ${outputPath}`);
  } finally {
    // 清理临时文件
    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
    }
    if (fs.existsSync(tempDir)) {
      fs.rmdirSync(tempDir);
    }
  }
};
