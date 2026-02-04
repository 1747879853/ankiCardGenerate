/**
 * 文本归一化和答案处理工具
 */

/**
 * 归一化文本：trim、合并多空格、统一引号/破折号、小写
 */
export const normalizeText = (s: string): string => {
  return s
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')           // 合并多空格
    .replace(/['']/g, "'")          // 统一单引号
    .replace(/[""]/g, '"')          // 统一双引号
    .replace(/[–—]/g, '-')          // 统一破折号
    .replace(/\s*-\s*/g, '-');      // 破折号两边去空格
};

/**
 * 将多个答案拆分（用 ; 分隔）并归一化
 */
export const splitAnswers = (en: string): string[] => {
  return en
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);
};

/**
 * 检查用户输入是否匹配任意一个正确答案
 */
export const checkAnswer = (input: string, acceptedAnswers: string[]): boolean => {
  const normalizedInput = normalizeText(input);
  return acceptedAnswers.some(ans => normalizeText(ans) === normalizedInput);
};

/**
 * 生成稳定的唯一 ID（基于 CN + EN 的简单 hash）
 */
export const makeStableId = (cn: string, en: string): string => {
  const combined = `${cn}|${en}`;
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  // 返回正数的十六进制字符串
  return Math.abs(hash).toString(16).padStart(8, '0');
};

/**
 * 规范化标签：去空格、去重、排序
 */
export const normalizeTags = (tags: string | undefined): string => {
  if (!tags || tags.trim() === '') return '';
  
  const tagList = tags
    .split(/[,;，；\s]+/)
    .map(t => t.trim())
    .filter(t => t.length > 0);
  
  // 去重并排序
  const uniqueTags = [...new Set(tagList)].sort();
  return uniqueTags.join(' ');
};

/**
 * 获取渐进式提示
 * hintLevel 1: 首字母 + 长度
 * hintLevel 2: 前两个字母 + 长度
 * hintLevel 3+: 显示一半字母 + 下划线
 */
export const getProgressiveHint = (en: string, hintLevel: number): string => {
  const word = en.split(';')[0].trim(); // 取第一个答案
  const len = word.length;
  
  if (hintLevel <= 0) return '';
  if (hintLevel === 1) {
    return `${word[0]}${'_'.repeat(len - 1)} (${len}字母)`;
  }
  if (hintLevel === 2) {
    const show = Math.min(2, len);
    return `${word.slice(0, show)}${'_'.repeat(len - show)} (${len}字母)`;
  }
  // hintLevel >= 3: 显示一半
  const showCount = Math.ceil(len / 2);
  return `${word.slice(0, showCount)}${'_'.repeat(len - showCount)}`;
};
