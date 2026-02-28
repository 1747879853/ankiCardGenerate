/**
 * XLSX 词汇表解析器
 * 支持 3 列：单词+音标 | 释义 | 例句
 * 或 4 列：序号 | 单词+音标 | 释义 | 例句
 * 格式与 PDF 词汇表一致，便于从 Excel 直接导入
 */

import { createRequire } from 'module';
import { parseTableToRecords } from './parseVocabTable.js';

const require = createRequire(import.meta.url);
const XLSX = require('xlsx');

/**
 * 将单元格值转为字符串
 */
function cellToString(val: unknown): string {
  if (val == null) return '';
  if (typeof val === 'string') return val.trim();
  if (typeof val === 'number') return String(val);
  if (typeof val === 'boolean') return String(val);
  return String(val);
}

/**
 * 读取 XLSX 并解析为原始记录数组
 */
export function readXlsx(inputPath: string): Record<string, string>[] {
  const workbook = XLSX.readFile(inputPath);
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error('XLSX 文件中没有工作表');
  }

  const sheet = workbook.Sheets[sheetName];
  const aoa = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    raw: false,
    defval: '',
  });

  // 转为 string[][]，过滤空行
  const rows: string[][] = aoa
    .filter((row): row is unknown[] => Array.isArray(row))
    .map(row => row.map(cellToString))
    .filter(row => row.some(cell => cell.length > 0));

  const records = parseTableToRecords(rows);

  if (records.length === 0) {
    throw new Error(
      '未能从 XLSX 中解析出有效词条，请确认格式为「单词 | 释义 | 例句」三列（或带序号的四列）'
    );
  }

  return records;
}
