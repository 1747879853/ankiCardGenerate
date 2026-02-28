# Anki 中文→英文主动回忆卡片生成器

将消极词汇转变为积极词汇：通过「看中文→拼英文+自检+发音+例句」的方式强化记忆。

## 功能特点

- **主动回忆**：正面展示中文，用户主动输入英文拼写
- **即时自检**：前端 JS 实时校验拼写（支持多答案、大小写不敏感）
- **渐进提示**：点击提示按钮逐步显示首字母、长度、一半字母
- **在线发音**：支持多个 TTS 服务（有道、Google、必应）
- **例句巩固**：背面展示英文例句和中文翻译
- **双格式导出**：TSV（通用导入）+ APKG（一键导入）

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 准备词汇

支持两种输入格式：

**方式 A：CSV 文件**

创建 `input.csv`，至少包含 `CN`（中文）和 `EN`（英文）两列：

```csv
CN,EN,IPA,POS,ExampleEN,ExampleCN,Hint
放弃,abandon,/əˈbændən/,v.,He abandoned his car in the snow.,他把车丢弃在雪地里。,a+band+on 一个乐队在上面(演出时被)放弃了
完成,accomplish,/əˈkɑːmplɪʃ/,v.,She accomplished her goal.,她完成了目标。,ac(加强)+com(一起)+plish(完成)
```

**方式 B：XLSX 词汇表（推荐）**

支持「单词 | 释义 | 例句」三列表格格式的 Excel 文件，例如：

| 单词 | 释义 | 例句 |
|------|------|------|
| apartment [ə'pɑːrtmənt] | n. 单元住宅;公寓住宅 | rent an apartment 租一间公寓 |
| faddism ['fædɪzəm] | n. 追随时尚;赶时髦 | Faddism helps... 人们追随时尚... |

**方式 C：PDF 词汇表**

与 XLSX 格式相同，支持「单词 | 释义 | 例句」三列表格格式的 PDF。

### 3. 生成卡片

**方式一：生成 TSV（需手动导入）**

```bash
npm run gen -- --in input.csv --out output.tsv --tts youdao
# 或使用 XLSX（推荐）
npm run gen -- --in input.xlsx --out output.tsv --tts youdao
# 或使用 PDF
npm run gen -- --in input.pdf --out output.tsv --tts youdao
```

然后在 Anki 中：
1. 文件 → 导入
2. 选择 `output.tsv`
3. 字段分隔符选择 Tab
4. 映射字段顺序：ID, CN, EN, IPA, POS, AudioURL, ExampleEN, ExampleCN, Hint, Tags

**方式二：生成 APKG（双击即可导入）**

```bash
npm run apkg -- --in input.csv --out vocab.apkg --deck "我的词汇" --tts youdao
# 或使用 XLSX（推荐）
npm run apkg -- --in input.xlsx --out vocab.apkg --deck "我的词汇" --tts youdao
# 或使用 PDF
npm run apkg -- --in input.pdf --out vocab.apkg --deck "我的词汇" --tts youdao
```

双击生成的 `vocab.apkg` 即可导入 Anki。

## 命令行参数

```
选项：
  --in <file>          输入文件路径（CSV/TSV、XLSX 或 PDF，必需）
  --out <file>         输出文件路径（必需）
  --deck <name>        牌组名称（仅 apkg，默认: ActiveVocab）
  --tts <provider>     TTS 提供商：google, youdao, bing
  --ttsTemplate <url>  自定义 TTS URL 模板（包含 {text} 占位符）
  --help               显示帮助信息
```

## 输入格式说明

### CSV/TSV 字段

| 字段 | 必需 | 说明 |
|------|------|------|
| CN | 是 | 中文释义（正面展示） |
| EN | 是 | 英文标准答案（支持 `;` 分隔多个答案） |
| IPA | 否 | 音标 |
| POS | 否 | 词性（n./v./adj./adv. 等） |
| AudioURL | 否 | 音频 URL（如不提供可用 --tts 自动生成） |
| ExampleEN | 否 | 英文例句 |
| ExampleCN | 否 | 例句中文翻译 |
| Hint | 否 | 提示/记忆点（词根、近义词、易错点等） |
| Tags | 否 | 标签（空格/逗号分隔） |
| ID | 否 | 唯一标识（不提供则自动生成） |

## 卡片交互流程

```
┌─────────────────────────────────────┐
│         正面 (Front)                │
├─────────────────────────────────────┤
│                                     │
│          「放弃」                    │
│            [v.]                     │
│                                     │
│    ┌─────────────────────┐          │
│    │ 输入英文拼写...      │          │
│    └─────────────────────┘          │
│                                     │
│  [🔊 听发音] [💡 提示] [✓ 校验]      │
│                                     │
│  → 输入 "abandon" 点击校验          │
│  → 显示 "✓ 拼写正确！请翻卡"        │
│                                     │
└─────────────────────────────────────┘
            ↓ 翻卡
┌─────────────────────────────────────┐
│         背面 (Back)                 │
├─────────────────────────────────────┤
│                                     │
│          「放弃」                    │
│                                     │
│   ┌───────────────────────┐         │
│   │     abandon           │         │
│   │   /əˈbændən/  [v.]    │         │
│   └───────────────────────┘         │
│                                     │
│        [🔊 听发音]                   │
│                                     │
│  ┌─ 例句 ─────────────────┐         │
│  │ He abandoned his car   │         │
│  │ in the snow.           │         │
│  │ 他把车丢弃在雪地里。     │         │
│  └────────────────────────┘         │
│                                     │
│  ┌─ 提示/记忆点 ──────────┐         │
│  │ a+band+on              │         │
│  └────────────────────────┘         │
│                                     │
└─────────────────────────────────────┘
```

## TTS 服务说明

| 提供商 | 稳定性 | 说明 |
|--------|--------|------|
| youdao | 较好 | 有道词典 TTS，推荐使用 |
| google | 一般 | Google Translate TTS，可能被限制 |
| bing | 一般 | 必应词典 TTS |

**注意**：远程音频 URL 在某些情况下可能无法播放（HTTPS/CORS 限制）。如需更稳定的方案，可考虑后续扩展为下载 mp3 到本地。

## 目录结构

```
anki/
├── src/
│   ├── cli.ts           # 命令行入口
│   ├── csv.ts           # CSV/TSV 读写
│   ├── pdfParser.ts     # PDF 词汇表解析
│   ├── xlsxParser.ts    # XLSX 词汇表解析
│   ├── normalize.ts     # 文本归一化
│   ├── audio.ts         # TTS URL 生成
│   └── anki/
│       ├── noteType.ts  # Anki 模板定义
│       └── exportApkg.ts # APKG 导出
├── input.csv            # 示例输入（或 input.xlsx / input.pdf）
├── package.json
├── tsconfig.json
└── README.md
```

## 常见问题

### Q: AnkiDroid 输入错误拼写按回车仍会翻卡？

A: 本模板使用**自定义输入框**（非 Anki 原生 type answer），输入与校验均由卡片内 JavaScript 控制，无需额外设置。若仍有问题，可尝试开启 AnkiDroid **设置 → 高级 → Type answer into the card**。

### Q: 移动端键盘不自动弹出？

A: 已添加 `data-focus`、`autofocus` 及 AnkiDroid 的 `name="typed"` 支持。若仍不弹出，请点击输入框唤起键盘（部分 AnkiDroid 版本存在已知限制）。

### Q: 音频无法播放？

A: 远程 TTS URL 可能受浏览器安全策略限制。建议：
1. 尝试换一个 TTS 提供商（`--tts youdao`）
2. 在 Anki 桌面版测试（移动端限制更严格）

### Q: 如何支持多个正确答案？

A: 在 EN 字段中用分号分隔，如：`color;colour`

### Q: 如何更新已导入的卡片？

A: 
- TSV 方式：重新导入时选择"更新已存在的笔记"
- APKG 方式：保持 ID 字段不变，Anki 会自动更新

### Q: XLSX / PDF 支持哪些格式？

A: 支持「单词 | 释义 | 例句」三列表格格式。单词列可含音标 `[IPA]`（如 `apartment [ə'pɑːrtmənt]`），释义列格式为 `n./v./adj. 中文释义`，例句列为英文例句 + 中文翻译。推荐使用 XLSX 格式，解析更稳定；若 PDF 解析失败，可先导出为 XLSX 再使用。

## License

MIT
