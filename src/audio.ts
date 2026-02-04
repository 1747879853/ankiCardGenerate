/**
 * AudioURL 生成工具
 * 提供常用的 TTS URL 模板
 */

/**
 * 预设的 TTS URL 模板
 * {text} 会被替换为 URL 编码后的英文单词
 */
export const TTS_TEMPLATES = {
  // Google Translate TTS（不保证长期可用）
  google: 'https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=en&q={text}',
  
  // 有道词典发音（相对稳定）
  youdao: 'https://dict.youdao.com/dictvoice?type=2&audio={text}',
  
  // 必应词典发音
  bing: 'https://dictionary.bing.com/api/v1/pronounce?word={text}&locale=en-US',
} as const;

export type TtsProvider = keyof typeof TTS_TEMPLATES;

/**
 * 根据模板生成音频 URL
 * @param template URL 模板，包含 {text} 占位符
 * @param text 要发音的英文文本
 * @returns 完整的音频 URL
 */
export const generateAudioUrl = (template: string, text: string): string => {
  // 取第一个答案（如果有多个用分号分隔）
  const firstWord = text.split(';')[0].trim();
  return template.replace('{text}', encodeURIComponent(firstWord));
};

/**
 * 根据预设提供商生成音频 URL
 * @param provider TTS 提供商名称
 * @param text 要发音的英文文本
 * @returns 完整的音频 URL
 */
export const generateAudioUrlByProvider = (provider: TtsProvider, text: string): string => {
  const template = TTS_TEMPLATES[provider];
  return generateAudioUrl(template, text);
};

/**
 * 获取可用的 TTS 模板列表（用于 CLI 帮助信息）
 */
export const getAvailableTemplates = (): string => {
  return Object.entries(TTS_TEMPLATES)
    .map(([name, url]) => `  ${name}: ${url}`)
    .join('\n');
};
