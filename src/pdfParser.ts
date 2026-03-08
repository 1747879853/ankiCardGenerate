/**
 * PDF 词汇表解析器
 * 支持 4 列：序号 | 单词+音标 | 释义 | 例句
 * 序号忽略，单词+音标放背面，释义放正面，例句放背面
 */

import * as fs from 'fs';
import { PDFParse } from 'pdf-parse';
import { parseTableToRecords, parseMeaningColumn, parseExampleColumn } from './parseVocabTable.js';

/**
 * 从 PDF 提取文本
 */
async function extractPdfText(filePath: string): Promise<string> {
  const buffer = fs.readFileSync(filePath);
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  try {
    const result = await parser.getText();
    return result.text || '';
  } finally {
    await parser.destroy();
  }
}

/**
 * 尝试从 PDF 提取表格（若检测到表格结构）
 */
async function extractPdfTables(filePath: string): Promise<string[][] | null> {
  const buffer = fs.readFileSync(filePath);
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  try {
    const result = await parser.getTable();
    if (result?.mergedTables?.length) {
      return result.mergedTables as unknown as string[][];
    }
    return null;
  } catch {
    return null;
  } finally {
    await parser.destroy();
  }
}

function isValidEntry(en: string, cn: string): boolean {
  const word = en?.trim() || '';
  return word.length >= 3 && /^[a-zA-Z\-']+$/.test(word) && /[\u4e00-\u9fff]/.test(cn || '');
}

function stripExampleFromMeaning(
  cn: string,
  exampleEN: string,
  exampleCN: string
): { cn: string; exampleEN: string; exampleCN: string } {
  const text = cn.replace(/<br\s*\/?>/gi, ' ');
  const cjk = '\\u4e00-\\u9fff\\u2e80-\\u2fdf';
  const patterns = [
    new RegExp(`\\s+([A-Z][a-zA-Z\\s',\\-;:!?"'()*]*\\.)\\s+([${cjk}][^]*)$`),
    new RegExp(`\\s+([a-zA-Z*][a-zA-Z\\s',.\\-;:!?"'()*]{3,})\\s+([${cjk}][^]*)$`),
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (m) {
      const en = m[1].trim().replace(/\*\*/g, '');
      const zh = m[2].trim();
      if (en.length >= 3 && zh.length >= 2 && !/^[nvas]\s*\./i.test(en)) {
        return {
          cn: text.replace(re, '').trim().replace(/\n/g, '<br>'),
          exampleEN: exampleEN || en,
          exampleCN: exampleCN || zh,
        };
      }
    }
  }
  return { cn, exampleEN, exampleCN };
}

/**
 * 从纯文本解析词条（表格检测失败时的回退方案）
 * 按「数字 + 单词」模式切分，再解析每块；支持多词性分行格式
 */
function parseTextToRecords(text: string): Record<string, string>[] {
  const records: Record<string, string>[] = [];

  // 按 "数字 英文单词" 或 "数字\n英文单词" 切分
  const entryPattern = /(?=\d+\s+[a-zA-Z][a-zA-Z\-']*(?:\s*\[[^\]]+\])?)/g;
  const parts = text.split(entryPattern).filter(Boolean);

  for (const part of parts) {
    const numWordMatch = part.match(/^(\d+)\s+([a-zA-Z][a-zA-Z\-']*)\s*(\[[^\]]+\])?/);
    if (!numWordMatch) continue;

    const en = numWordMatch[2];
    const ipa = numWordMatch[3] ? numWordMatch[3].slice(1, -1) : '';

    // 释义块：取含词性定义的行，遇到纯英文例句行则停止
    const afterWordLine = part.replace(/^\d+\s+[a-zA-Z][a-zA-Z\-']*(?:\s*\[[^\]]+\])?[\s\n]*/i, '');
    const allLines = afterWordLine.split(/\n/).map((s) => s.trim()).filter(Boolean);
    const meaningLines: string[] = [];
    for (const line of allLines) {
      if (/^(n\.|v\.|adj\.|adv\.|prep\.|conj\.)\s/i.test(line)) {
        meaningLines.push(line);
      } else if (meaningLines.length > 0 && /^[A-Z]/.test(line) && !/[\u4e00-\u9fff]/.test(line)) {
        break; // 遇到英文例句行，释义结束
      } else if (meaningLines.length > 0) {
        meaningLines.push(line); // 同一释义块内的续行
      } else {
        meaningLines.push(line); // 首行可能无词性
      }
    }
    const meaningBlock = meaningLines.join('\n');

    const { pos, cn } = parseMeaningColumn(meaningBlock);

    const meaningBlockLen = meaningBlock.length;
    const afterMeaning = afterWordLine.slice(meaningBlockLen).trim();
    const example = parseExampleColumn(afterMeaning);

    const stripped = stripExampleFromMeaning(cn, example.exampleEN, example.exampleCN);

    if (!isValidEntry(en, stripped.cn)) continue;

    records.push({
      EN: en,
      CN: stripped.cn,
      IPA: ipa,
      POS: pos,
      ExampleEN: stripped.exampleEN,
      ExampleCN: stripped.exampleCN,
    });
  }

  return records;
}

/**
 * 读取 PDF 并解析为原始记录数组
 */
export async function readPdf(inputPath: string): Promise<Record<string, string>[]> {
  let records: Record<string, string>[] = [];

  const tables = await extractPdfTables(inputPath);
  if (tables && tables.length > 0) {
    records = parseTableToRecords(tables);
  }

  if (records.length === 0) {
    const text = await extractPdfText(inputPath);
    records = parseTextToRecords(text);
  }

  if (records.length === 0) {
    throw new Error('未能从 PDF 中解析出有效词条，请确认格式为「序号 | 单词+音标 | 释义 | 例句」四列表格');
  }

  return records;
}
