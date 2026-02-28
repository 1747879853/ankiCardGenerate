#!/usr/bin/env node
/**
 * CLI 入口：生成 Anki 卡片（TSV 或 APKG）
 * 
 * 用法：
 *   npm run gen -- --in input.csv --out out.tsv [--tts youdao]
 *   npm run apkg -- --in input.csv --out deck.apkg --deck "ActiveVocab"
 */

import { readCsv, transformToNotes, writeTsv } from './csv.js';
import { readPdf } from './pdfParser.js';
import { readXlsx } from './xlsxParser.js';
import { exportApkg } from './anki/exportApkg.js';
import { TTS_TEMPLATES, getAvailableTemplates } from './audio.js';
import type { TtsProvider } from './audio.js';

/**
 * 解析命令行参数
 */
const parseArgs = (args: string[]): Record<string, string> => {
  const result: Record<string, string> = {};
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const value = args[i + 1];
      if (value && !value.startsWith('--')) {
        result[key] = value;
        i++;
      } else {
        result[key] = 'true';
      }
    }
  }
  
  return result;
};

/**
 * 显示帮助信息
 */
const showHelp = (): void => {
  console.log(`
Anki 中文→英文卡片生成器

命令：
  gen   生成 TSV 文件（用于 Anki 导入）
  apkg  生成 APKG 文件（可直接双击导入）

用法：
  npm run gen -- --in <input.csv> --out <output.tsv> [选项]
  npm run apkg -- --in <input.csv> --out <deck.apkg> [选项]

选项：
  --in <file>        输入文件路径（CSV/TSV、XLSX 或 PDF，必需）
  --out <file>       输出文件路径（必需）
  --deck <name>      牌组名称（仅 apkg，默认: ActiveVocab）
  --tts <provider>   TTS 提供商（如果 CSV 没有 AudioURL 列）
  --ttsTemplate <url>  自定义 TTS URL 模板（包含 {text} 占位符）
  --help             显示此帮助信息

可用的 TTS 提供商：
${getAvailableTemplates()}

输入格式：
  CSV/TSV：必需列 CN、EN，可选 IPA, POS, ExampleEN, ExampleCN 等
  XLSX：支持「单词 | 释义 | 例句」三列表格格式的词汇表（推荐）
  PDF：支持「单词 | 释义 | 例句」三列表格格式的词汇表

示例：
  npm run gen -- --in words.csv --out output.tsv --tts youdao
  npm run apkg -- --in input.xlsx --out vocab.apkg --deck "我的词汇" --tts youdao
`);
};

/**
 * 主函数
 */
const main = async (): Promise<void> => {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args.includes('--help')) {
    showHelp();
    process.exit(0);
  }
  
  const command = args[0];
  const options = parseArgs(args.slice(1));
  
  // 验证必需参数
  if (!options.in) {
    console.error('错误：缺少输入文件参数 --in');
    process.exit(1);
  }
  
  if (!options.out) {
    console.error('错误：缺少输出文件参数 --out');
    process.exit(1);
  }
  
  // 确定 TTS 模板
  let ttsTemplate: string | undefined;
  if (options.ttsTemplate) {
    ttsTemplate = options.ttsTemplate;
  } else if (options.tts) {
    const provider = options.tts as TtsProvider;
    if (TTS_TEMPLATES[provider]) {
      ttsTemplate = TTS_TEMPLATES[provider];
    } else {
      console.error(`错误：未知的 TTS 提供商 "${options.tts}"`);
      console.log('可用的提供商：google, youdao, bing');
      process.exit(1);
    }
  }
  
  const ext = options.in.toLowerCase().split('.').pop() || '';
  const isPdf = ext === 'pdf';
  const isXlsx = ext === 'xlsx' || ext === 'xls';

  const loadRows = async (): Promise<Record<string, string>[]> => {
    if (isPdf) return readPdf(options.in);
    if (isXlsx) return readXlsx(options.in);
    return readCsv(options.in);
  };

  try {
    switch (command) {
      case 'gen': {
        const rows = await loadRows();
        const notes = transformToNotes(rows, ttsTemplate);
        writeTsv(notes, options.out);
        console.log(`✓ 成功生成 ${notes.length} 条记录到 ${options.out}`);
        console.log('\n下一步：在 Anki 中导入此 TSV 文件');
        console.log('  1. 打开 Anki → 文件 → 导入');
        console.log('  2. 选择生成的 TSV 文件');
        console.log('  3. 字段分隔符选择 "Tab"');
        console.log('  4. 按顺序映射字段：ID, CN, EN, TypeAnswer, IPA, POS, AudioURL, ExampleEN, ExampleCN, Hint, Tags');
        break;
      }

      case 'apkg': {
        const deckName = options.deck || 'ActiveVocab';
        const rows = await loadRows();
        const notes = transformToNotes(rows, ttsTemplate);
        await exportApkg(notes, options.out, deckName);
        console.log(`✓ 成功生成 ${notes.length} 张卡片到 ${options.out}`);
        console.log('\n下一步：双击生成的 .apkg 文件即可导入 Anki');
        break;
      }
      
      default:
        console.error(`错误：未知命令 "${command}"`);
        console.log('可用命令：gen, apkg');
        process.exit(1);
    }
  } catch (error) {
    console.error('错误：', error instanceof Error ? error.message : error);
    process.exit(1);
  }
};

main();
