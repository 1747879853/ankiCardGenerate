/**
 * CSV 读取和 TSV 写入工具
 */

import { parse } from 'csv-parse/sync';
import * as fs from 'fs';
import { makeStableId, normalizeTags } from './normalize.js';

/**
 * 笔记记录的类型定义
 */
export interface NoteRecord {
  ID: string;
  CN: string;
  EN: string;
  IPA: string;
  POS: string;
  AudioURL: string;
  ExampleEN: string;
  ExampleCN: string;
  Hint: string;
  Tags: string;
}

/**
 * TSV 字段顺序（固定）
 */
export const TSV_FIELDS: (keyof NoteRecord)[] = [
  'ID', 'CN', 'EN', 'IPA', 'POS', 'AudioURL', 'ExampleEN', 'ExampleCN', 'Hint', 'Tags'
];

/**
 * 读取 CSV 文件并解析为记录数组
 * @param inputPath CSV 文件路径
 * @returns 解析后的原始记录
 */
export const readCsv = (inputPath: string): Record<string, string>[] => {
  const content = fs.readFileSync(inputPath, 'utf-8');
  
  // 自动检测分隔符（逗号或制表符）
  const firstLine = content.split('\n')[0];
  const delimiter = firstLine.includes('\t') ? '\t' : ',';
  
  const records = parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    delimiter,
    bom: true, // 处理 BOM
  });
  
  return records;
};

/**
 * 将原始 CSV 记录转换为标准 NoteRecord
 * @param rows 原始记录
 * @param ttsTemplate 可选的 TTS URL 模板
 * @returns 标准化的笔记记录
 */
export const transformToNotes = (
  rows: Record<string, string>[],
  ttsTemplate?: string
): NoteRecord[] => {
  return rows.map(row => {
    // 必需字段
    const cn = row.CN || row.cn || row['中文'] || '';
    const en = row.EN || row.en || row['英文'] || '';
    
    if (!cn || !en) {
      throw new Error(`缺少必需字段 CN 或 EN: ${JSON.stringify(row)}`);
    }
    
    // 可选字段
    const ipa = row.IPA || row.ipa || row['音标'] || '';
    const pos = row.POS || row.pos || row['词性'] || row['类型'] || '';
    const exampleEN = row.ExampleEN || row.exampleEN || row['英文例句'] || row['例句英'] || '';
    const exampleCN = row.ExampleCN || row.exampleCN || row['中文例句'] || row['例句中'] || '';
    const hint = row.Hint || row.hint || row['提示'] || '';
    const tags = row.Tags || row.tags || row['标签'] || '';
    
    // ID：优先使用已有的，否则生成
    const id = row.ID || row.id || makeStableId(cn, en);
    
    // AudioURL：优先使用已有的，否则根据模板生成
    let audioUrl = row.AudioURL || row.audioURL || row.audioUrl || row['音频'] || '';
    if (!audioUrl && ttsTemplate) {
      // 取第一个英文答案用于 TTS
      const firstEn = en.split(';')[0].trim();
      audioUrl = ttsTemplate.replace('{text}', encodeURIComponent(firstEn));
    }
    
    return {
      ID: id,
      CN: cn,
      EN: en,
      IPA: ipa,
      POS: pos,
      AudioURL: audioUrl,
      ExampleEN: exampleEN,
      ExampleCN: exampleCN,
      Hint: hint,
      Tags: normalizeTags(tags),
    };
  });
};

/**
 * 转义 TSV 字段（制表符和换行符）
 */
const escapeTsvField = (value: string): string => {
  return value
    .replace(/\t/g, ' ')     // 制表符替换为空格
    .replace(/\r?\n/g, ' '); // 换行符替换为空格
};

/**
 * 将笔记记录写入 TSV 文件
 * @param notes 笔记记录数组
 * @param outputPath 输出文件路径
 */
export const writeTsv = (notes: NoteRecord[], outputPath: string): void => {
  const lines: string[] = [];
  
  // 不写表头（Anki 导入时手动映射字段更灵活）
  // 如果需要表头，取消下面这行注释：
  // lines.push(TSV_FIELDS.join('\t'));
  
  for (const note of notes) {
    const values = TSV_FIELDS.map(field => escapeTsvField(note[field]));
    lines.push(values.join('\t'));
  }
  
  fs.writeFileSync(outputPath, lines.join('\n'), 'utf-8');
};

/**
 * 一步完成：读取 CSV -> 转换 -> 写入 TSV
 */
export const csvToTsv = (
  inputPath: string,
  outputPath: string,
  ttsTemplate?: string
): NoteRecord[] => {
  const rows = readCsv(inputPath);
  const notes = transformToNotes(rows, ttsTemplate);
  writeTsv(notes, outputPath);
  return notes;
};
