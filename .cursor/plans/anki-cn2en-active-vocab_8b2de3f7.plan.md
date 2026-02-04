---
name: anki-cn2en-active-vocab
overview: 实现一个“看中文→输入英文→自检→可听发音→翻卡看完整答案/例句”的 Anki 笔记类型，并提供代码从 CSV 生成可导入 TSV/CSV 与可双击导入的 .apkg（远程音频 URL 方案）。
todos:
  - id: scaffold-node-cli
    content: 初始化 Node/TS CLI 工程结构与依赖，提供 gen/apkg 两个命令
    status: pending
  - id: anki-note-type-template
    content: 实现 Anki Note Type 字段与正反面模板（自检输入、提示、远程音频按钮）
    status: pending
  - id: csv-to-tsv
    content: 实现 CSV 读取、字段映射、ID/Tags 规范化与 TSV 输出
    status: pending
  - id: apkg-export
    content: 实现基于同一模板与字段的 .apkg 导出（含 deck/noteType/notes）
    status: pending
  - id: docs-and-sample
    content: 补齐 README 与一份 sample input.csv，确保用户可直接跑通
    status: pending
isProject: false
---

# Anki 中文→英文自检卡方案

## 目标与约束

- **目标**：把“消极词汇”变成“积极词汇”——通过主动回忆（中文提示→拼写英文）+ 即时自检 + 发音强化 + 例句巩固。
- **导入产物**：
  - **TSV/CSV**：最通用，可直接 Anki 导入。
  - **APKG**：一键导入，包含牌组/笔记类型/模板/笔记数据（本方案音频为远程 URL，因此 apkg 不打包音频文件）。
- **发音**：使用 **远程 URL**（字段保存 URL；模板按钮播放）。

## 笔记类型（Note Type）设计

- **Note Type 名称**：`CN→EN Active Recall (AudioURL)`
- **字段（Fields）**（尽量少但完整覆盖你的需求）：
  - `CN`：中文释义（正面展示）
  - `EN`：英文标准答案（背面展示 + 用于校验）
  - `IPA`：音标（可空）
  - `POS`：词性/类型（可空）
  - `AudioURL`：远程音频地址（可空）
  - `ExampleEN`：英文例句（可空）
  - `ExampleCN`：例句中文（可空）
  - `Hint`：提示（可空，例如词根/近义/易错点）
  - `ID`：稳定主键（脚本生成，便于去重/更新）
  - `Tags`：标签（可空，导入时映射为 Anki tags）

## 卡片模板（1 张卡：中文→英文）

### 正面（Front）交互

- 展示：`CN`（可选展示 `POS`）
- 输入框：用户输入英文拼写
- 按钮：
  - `听发音`：若 `AudioURL` 存在则播放；否则按钮禁用/隐藏
  - `提示`：渐进式提示（例如首字母 + 总长度；再点显示更多）
  - `校验拼写`：对比用户输入与 `EN`
- 反馈：
  - 正确：显示“拼写正确，请翻卡查看完整信息”
  - 错误：显示“拼写错误，可重输/听发音/看提示”，保留输入
- **校验规则**（前端 JS）：
  - 归一化：trim、合并多空格、统一引号/破折号、大小写不敏感
  - 可选容错：允许 `EN` 有多个答案（用 `;` 分隔）

### 背面（Back）展示

- 展示完整答案：`EN`、`IPA`、`POS`
- 发音：同样提供播放按钮（使用 `AudioURL`）
- 例句：`ExampleEN` + `ExampleCN`
- 复盘提示：显示 `Hint`

## “最优导入格式”

- **推荐导入 TSV**（字段顺序固定，避免逗号/引号转义问题）：
  - 列顺序：`ID, CN, EN, IPA, POS, AudioURL, ExampleEN, ExampleCN, Hint, Tags`
  - 分隔符：tab
  - 编码：UTF-8
- 你的原始输入：**CSV（至少 CN、EN）**
  - 脚本会补齐：`ID`（hash/slug）、空字段、规范化 `Tags`

## 代码结构（将要创建的文件）

- [`d:\code\anki\package.json`](d:\code\anki\package.json)：Node 脚本依赖与命令
- [`d:\code\anki\src\cli.ts`](d:\code\anki\src\cli.ts)：命令行入口
- [`d:\code\anki\src\csv.ts`](d:\code\anki\src\csv.ts)：读 CSV / 写 TSV
- [`d:\code\anki\src\normalize.ts`](d:\code\anki\src\normalize.ts)：文本归一化、答案拆分
- [`d:\code\anki\src\audio.ts`](d:\code\anki\src\audio.ts)：AudioURL 生成（可选）
- [`d:\code\anki\src\anki\noteType.ts`](d:\code\anki\src\anki\noteType.ts)：模板（Front/Back/Styling）字符串
- [`d:\code\anki\src\anki\exportApkg.ts`](d:\code\anki\src\anki\exportApkg.ts)：生成 apkg
- [`d:\code\anki\README.md`](d:\code\anki\README.md)：使用说明与导入步骤

## CLI 设计（你将如何使用）

- 输入：`input.csv`
- 输出：
  - `out.tsv`（用于 Anki 导入）
  - `deck.apkg`（可选）
- 示例命令（计划实现）：
  - `npm run gen -- --in input.csv --out out.tsv`
  - `npm run apkg -- --in input.csv --out deck.apkg --deck "ActiveVocab"`
- **AudioURL 生成策略**（不强绑定某个 TTS 服务，避免不可用）：
  - 如果 CSV 已有 `AudioURL` 列：原样使用
  - 否则可传 `--ttsTemplate`（例如 `https://.../tts?text={text}&lang=en-US`），脚本对 `{text}` 做 URL encode 并写入 `AudioURL`

## 模板关键伪代码（先思考再编码）

### 生成脚本伪代码

```pseudo
readCsv(inputPath): rows
for each row in rows:
  cn = require(row.CN)
  en = require(row.EN)
  id = row.ID or makeStableId(cn, en)

  ipa = row.IPA or ""
  pos = row.POS or ""
  exampleEN = row.ExampleEN or ""
  exampleCN = row.ExampleCN or ""
  hint = row.Hint or ""

  audioUrl = row.AudioURL
  if audioUrl empty and ttsTemplate provided:
     audioUrl = fillTemplate(ttsTemplate, encodeURIComponent(en))

  tags = normalizeTags(row.Tags)

  writeTsvRow([id, cn, en, ipa, pos, audioUrl, exampleEN, exampleCN, hint, tags])

if exportApkg:
  noteType = buildNoteType(fields, frontTemplate, backTemplate, styling)
  deck = buildDeck(deckName)
  for each tsvRow:
     addNoteToDeck(noteType, deck, fieldValues)
  writeApkg(outPath)
```

### 正面模板交互伪代码（Anki 模板 JS）

```pseudo
state:
  attempt = ""
  hintLevel = 0

normalize(s): lower(trim(replaceMultipleSpaces(s)))
acceptedAnswers = splitBySemicolon(EN).map(normalize)

handleCheck():
  if input empty -> show "请输入拼写" and return
  if normalize(input) in acceptedAnswers:
     showSuccess("拼写正确，请翻卡")
  else:
     showError("拼写错误，可重输/听发音/提示")

handlePlayAudio():
  if AudioURL empty -> return
  audio = new Audio(AudioURL)
  audio.play().catch(showError)

handleHint():
  hintLevel++
  if hintLevel == 1 -> show firstLetter + length
  if hintLevel == 2 -> show first2Letters + length
  if hintLevel >= 3 -> show Hint field or reveal masked EN

bind events:
  Enter -> handleCheck
  buttons click + keydown(Enter/Space) -> handlers
```

## 验证方式（完成后我会自测）

- 用一份最小 `input.csv` 生成 `out.tsv`，检查字段顺序/转义/编码
- 生成 `deck.apkg` 并在 Anki 导入，确认：
  - 正面输入与校验逻辑正常
  - `听发音` 可播放远程 URL（在桌面端与移动端各自表现按 Anki 限制说明）
  - 翻卡后字段展示完整

## 风险与对策

- 远程音频 URL 可能受 **HTTPS/CORS/重定向** 影响导致某些端不播放：
  - 模板里做错误捕获并提示
  - README 提供“改为下载 mp3（更稳定）”的升级路线（不在本轮实现，除非你追加需求）