/**
 * 词汇表表格解析（共享逻辑，供 PDF / XLSX 等使用）
 * 支持 3 列：单词+音标 | 释义 | 例句
 * 或 4 列：序号 | 单词+音标 | 释义 | 例句
 */

/**
 * 从单词+音标列解析：提取英文单词和音标
 * 格式如 "apartment [ə'pa:rtmənt]" 或 "1 apartment [ə'pa:rtmənt]"
 */
export function parseWordColumn(cell: string): { en: string; ipa: string } {
  const text = cell.replace(/^\d+\s*/, '').trim();
  const ipaMatch = text.match(/\[([^\]]+)\]/);
  const ipa = ipaMatch ? ipaMatch[1] : '';
  const en = text.replace(/\s*\[[^\]]+\]\s*/, '').trim();
  return { en, ipa };
}

const POS_PATTERN = '(?:n\\.|v\\.|adj\\.|adv\\.|prep\\.|conj\\.|pron\\.|int\\.|art\\.|num\\.)';
const posRegex = new RegExp(`^(${POS_PATTERN})\\s*(.*)$`, 'i');

/**
 * 从释义列解析：提取词性和中文释义（供 PDF 纯文本回退使用）
 */
export function parseMeaningColumn(cell: string): { pos: string; cn: string } {
  const lines = cell.split(/\n/).map(s => s.trim()).filter(Boolean);
  const posParts: string[] = [];
  const cnLines: string[] = [];
  const segmentRegex = new RegExp(`(${POS_PATTERN})\\s*([^]*?)(?=\\s+${POS_PATTERN}\\s|$)`, 'gi');

  for (const line of lines) {
    const m = line.match(posRegex);
    if (m) {
      const firstPos = m[1].trim();
      const rest = m[2].trim();
      if (!rest) {
        posParts.push(firstPos);
        cnLines.push(firstPos);
        continue;
      }
      const segments: string[] = [];
      let seg;
      segmentRegex.lastIndex = 0;
      while ((seg = segmentRegex.exec(line)) !== null) {
        const p = seg[1].trim();
        const meaning = seg[2].trim();
        if (meaning) segments.push(`${p} ${meaning}`);
        posParts.push(p);
      }
      if (segments.length > 1) {
        cnLines.push(...segments);
      } else if (segments.length === 1) {
        cnLines.push(segments[0]);
      } else {
        posParts.push(firstPos);
        cnLines.push(`${firstPos} ${rest}`);
      }
    } else if (cnLines.length > 0) {
      cnLines[cnLines.length - 1] += ' ' + line;
    } else {
      cnLines.push(line);
    }
  }
  const pos = posParts.length === 1 ? posParts[0] : (posParts.length > 1 ? '' : '');
  const cn = cnLines.length ? cnLines.join('<br>') : (lines[0] || '');
  return { pos, cn };
}

/**
 * 从例句列解析：提取英文例句和中文翻译
 */
export function parseExampleColumn(cell: string): { exampleEN: string; exampleCN: string } {
  const lines = cell.split(/\n/).map(s => s.trim()).filter(Boolean);
  const enLines: string[] = [];
  const cnLines: string[] = [];

  for (const line of lines) {
    if (/[a-zA-Z]{2,}/.test(line) && /[\u4e00-\u9fff]/.test(line)) {
      const enPart = line.replace(/\s+[\u4e00-\u9fff][^]*$/, '').trim();
      const cnPart = line.replace(/^[a-zA-Z\s',.\-;:!?"'()*]+/, '').trim();
      if (enPart) enLines.push(enPart.replace(/\*\*/g, ''));
      if (cnPart) cnLines.push(cnPart);
    } else if (/^[\u4e00-\u9fff]/.test(line) || (/[\u4e00-\u9fff]/.test(line) && !/^[a-zA-Z]/.test(line))) {
      cnLines.push(line);
    } else if (/^[a-zA-Z*]/.test(line) || /^['".,;:(\-]/.test(line)) {
      enLines.push(line.replace(/\*\*/g, ''));
    } else if (cnLines.length > 0) {
      cnLines.push(line);
    } else if (enLines.length > 0) {
      enLines.push(line);
    }
  }

  return {
    exampleEN: enLines.join(' ').replace(/\s+/g, ' ').trim(),
    exampleCN: cnLines.join(' ').replace(/\s+/g, ' ').trim(),
  };
}

function isHeaderRow(row: string[]): boolean {
  const c0 = (row[0] || '').toLowerCase();
  const c1 = (row[1] || '').toLowerCase();
  return c0 === '序号' || c0 === '单词' || c0 === 'word' || c1 === '单词' || c1 === 'word' || c0.includes('单词');
}

function isValidEntry(en: string, cn: string): boolean {
  return /^[a-zA-Z\-']+$/.test(en?.trim() || '') && /[\u4e00-\u9fff]/.test(cn || '');
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
 * 从表格数据解析为原始记录
 * 3 列：单词+音标 | 释义 | 例句
 * 4 列：序号 | 单词+音标 | 释义 | 例句
 */
export function parseTableToRecords(rows: string[][]): Record<string, string>[] {
  const records: Record<string, string>[] = [];

  for (const row of rows) {
    if (isHeaderRow(row)) continue;

    const hasFourCols = row.length >= 4;
    const wordCell = hasFourCols ? (row[1] || '') : (row[0] || '');
    const meaningCell = hasFourCols ? (row[2] || '') : (row[1] || '');
    const exampleCell = hasFourCols ? (row[3] || '') : (row[2] || '');

    const { en, ipa } = parseWordColumn(wordCell);
    let cn = meaningCell.trim().replace(/\n/g, '<br>');
    const example = parseExampleColumn(exampleCell);

    const stripped = stripExampleFromMeaning(cn, example.exampleEN, example.exampleCN);
    cn = stripped.cn;

    if (!isValidEntry(en, cn)) continue;

    records.push({
      EN: en,
      CN: cn,
      IPA: ipa,
      POS: '',
      ExampleEN: stripped.exampleEN,
      ExampleCN: stripped.exampleCN,
    });
  }

  return records;
}
