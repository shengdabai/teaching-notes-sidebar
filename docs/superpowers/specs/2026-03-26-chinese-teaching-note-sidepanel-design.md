# Chinese Teaching Note Side Panel Design

## 1. 项目目标

开发一个基于 `Chrome/Chromium Manifest V3` 的浏览器插件，主界面为浏览器右侧 `side panel`。用户输入一句中文后，插件根据所选学习级别 `A / B / C`，调用 `Gemini API` 生成一张可编辑的教学卡片，用于中文教学备课与课程报告整理。

首版产品聚焦“单句输入 -> 三行教学结果 -> 本地保存与导出”这一条主路径，不引入后端，不做批量处理，不做云同步。

## 2. 核心工作流

1. 用户打开插件侧边栏。
2. 首次使用时自动进入设置页，填写 `Gemini API Key` 并选择模型。
3. 返回主界面，在输入框输入一句中文。
4. 用户点击 `A / B / C` 三个级别框中的一个，单选。
5. 用户点击 `Generate Note`。
6. 插件读取本地设置，调用 `Gemini API`。
7. 前端展示三行结果：
   - 第 1 行：当前选中的级别
   - 第 2 行：中文教学笔记
   - 第 3 行：英文翻译 + 英文教学注释
8. 用户可以直接编辑第 2 行和第 3 行内容。
9. 用户可以：
   - 单独复制第 2 行
   - 单独复制第 3 行
   - `Copy All` 复制第 2 行和第 3 行
   - `Export Markdown` 导出第 2 行和第 3 行
   - `Save to Draft` 保存当前卡片到本地草稿

## 3. 界面结构

### 3.1 主侧边栏

主界面固定分为五个区块：

1. 输入区
   - 单个大输入框
   - 只接受中文原文输入

2. 级别选择区
   - 三个可点击级别框：`A`、`B`、`C`
   - 只能单选
   - 每个框带简短说明：
     - `A`: `Pinyin Only`
     - `B`: `Chinese + Pinyin`
     - `C`: `Chinese Only`

3. 主操作区
   - `Generate Note`
   - `Reset`
   - `Settings`

4. 结果区
   - `Line 1`: 当前选中的级别
   - `Line 2`: 中文教学笔记，带 `Copy Line 2`
   - `Line 3`: 英文翻译 + 英文教学注释，带 `Copy Line 3`

5. 卡片操作区
   - `Save to Draft`
   - `Copy All`
   - `Export Markdown`

视觉风格固定为清爽天蓝色，重点保证：

- 输入框清晰
- 级别框可一眼识别
- 主按钮粗体明显
- 页面不出现无关功能块

### 3.2 设置页

首次打开插件，如果本地未配置 `Gemini API Key`，直接进入设置页。

设置页只包含：

- `Gemini API Key`
- `Model`
- `Test Connection`
- `Cancel`
- `Save Settings`

设置页需要支持后续重新打开并修改。

## 4. 三行输出规则

### 4.1 Line 1

- 不经过 AI 生成
- 由前端根据当前选中的级别直接显示
- 内容仅为 `A`、`B` 或 `C`

### 4.2 Line 2

第 2 行由 `Gemini API` 生成，规则取决于所选级别。

#### A 级

- 只显示带声调的拼音
- 不显示汉字
- 不显示英文

示例：

- 输入：`你叫什么名字`
- 输出：`nǐ jiào shénme míngzi`

#### B 级

- 显示“按词义分组”的中文 + 拼音
- 不按单字机械拆分
- 每个词组后直接拼接对应拼音
- 词组之间使用空格

示例：

- 输入：`经济发展`
- 输出：`经济jīngjì 发展fāzhǎn`

- 输入：`你叫什么名字`
- 输出目标为基于词义分组的形式，例如：
  - `你nǐ 叫什么jiào shénme 名字míngzi`
  - 或其他符合教学理解的合理分组

实现要求：

- 词义分组优先于逐字标音
- 结果应便于学生理解，不追求词典式最细拆分

#### C 级

- 只显示中文
- 不显示拼音
- 不显示英文

示例：

- 输入：`你叫什么名字`
- 输出：`你叫什么名字`

### 4.3 Line 3

- 始终显示英文自然翻译
- 同时追加一条简短英文教学注释
- 重点内容可用 `*...*` 标注
- 注释必须短，不写成长段分析

示例：

- `What is your name? *Chinese word order differs from English.*`
- `Economic development. *A formal noun phrase often used in academic, policy, or news contexts.*`

### 4.4 重点标注规则

- 统一使用 `*重点*` 格式
- 第 2 行默认以清晰为主，不强制每次标注重点
- 第 3 行可以在以下情况使用重点标注：
  - 语序差异
  - 固定搭配
  - 正式或口语语境
  - 易错点

## 5. Gemini 集成设计

### 5.1 模型职责边界

为保证稳定性，AI 只负责生成：

- `line2`
- `line3`

不负责生成：

- `line1`
- 页面结构
- UI 控件文案

### 5.2 返回格式

前端必须要求 `Gemini API` 返回固定 JSON 结构：

```json
{
  "line2": "经济jīngjì 发展fāzhǎn",
  "line3": "Economic development. *A formal noun phrase often used in academic, policy, or news contexts.*"
}
```

前端只接受这个结构；若返回不合法，则进入错误态。

### 5.3 请求流程

点击 `Generate Note` 后：

1. 校验输入文本不为空
2. 校验已选级别
3. 从本地存储读取 `apiKey` 与 `model`
4. 构造固定 prompt
5. 发送请求到 `Gemini API`
6. 解析 JSON 返回值
7. 渲染第 2 行与第 3 行
8. 允许用户手动编辑

## 6. 可编辑性要求

生成完成后，第 2 行和第 3 行内容可在前端手动编辑；第 1 行由级别选择框控制。

原因：

- 词组切分未必每次都符合教学偏好
- 英文解释可能需要根据教学对象调整
- 用户需要保留最终教学定稿权

## 7. 复制与导出规则

### 单行复制

- `Copy Line 2`：只复制第 2 行
- `Copy Line 3`：只复制第 3 行

### Copy All

- 只复制第 2 行和第 3 行
- 不复制第 1 行

示例：

```text
经济jīngjì 发展fāzhǎn
Economic development. *A formal noun phrase often used in academic, policy, or news contexts.*
```

### Export Markdown

- 只导出第 2 行和第 3 行
- 不导出第 1 行

默认导出格式：

```md
经济jīngjì 发展fāzhǎn

Economic development. *A formal noun phrase often used in academic, policy, or news contexts.*
```

## 8. 草稿机制

草稿列表定位为“插件内本地教学卡片列表”，不做复杂课程管理。

### 每条草稿保存字段

- `id`
- `createdAt`
- `sourceText`
- `level`
- `line2`
- `line3`

### 草稿行为

- 点击 `Save to Draft` 时保存当前卡片快照
- 不覆盖历史草稿
- 新草稿排在最前面

### 首版草稿支持操作

- 查看
- 回填到编辑区
- 删除
- 导出单条 Markdown

## 9. 本地存储设计

统一使用 `chrome.storage.local`。

### settings

- `apiKey`
- `model`

### drafts

- 多条已保存教学卡片

### uiState

- 最近一次输入文本
- 最近一次选中的级别

选择 `chrome.storage.local` 的原因：

- 首版不需要跨设备同步
- `API key` 不适合放在 `sync`
- 数据量较小，足够支撑首版需求

## 10. 错误处理

首版需要覆盖以下状态：

- 未填写 `API key`
  - 引导进入设置页
- 未选择模型
  - 使用默认模型或提示选择
- 输入为空
  - 阻止生成并提示
- 网络错误
  - 显示请求失败提示
- API 返回格式不合法
  - 显示 `Invalid model response`
- 模型返回空内容
  - 提示重新生成
- 请求进行中
  - `Generate Note` 进入 loading 态
  - 避免重复提交

## 11. 技术架构

首版采用原生 `HTML + CSS + JavaScript`，不引入 React 或其他前端框架，不使用打包器。

原因：

- 功能范围明确
- 交付速度快
- 维护成本低
- 足够支撑 `side_panel`、本地存储、设置页与导出逻辑

## 12. 建议文件结构

```text
chinese-teaching-note-sidepanel/
  README.md
  manifest.json
  sidepanel.html
  sidepanel.css
  sidepanel.js
  settings.html
  settings.css
  settings.js
  background.js
  lib/
    gemini-client.js
    prompt-builder.js
    response-parser.js
    storage.js
    markdown.js
    clipboard.js
    validators.js
  docs/
    superpowers/
      specs/
        2026-03-26-chinese-teaching-note-sidepanel-design.md
      plans/
        ...
```

## 13. 模块职责

- `manifest.json`
  - 注册插件元信息、权限、`side_panel`

- `sidepanel.html`
  - 主工作台结构

- `sidepanel.css`
  - 主界面天蓝色视觉样式

- `sidepanel.js`
  - 主页面状态、生成、复制、保存草稿、导出

- `settings.html`
  - 设置页结构

- `settings.css`
  - 设置页样式

- `settings.js`
  - 设置读取、保存、测试连接

- `background.js`
  - 处理插件级事件，例如打开侧边栏

- `lib/gemini-client.js`
  - 请求 `Gemini API`

- `lib/prompt-builder.js`
  - 根据输入文本和级别构造 prompt

- `lib/response-parser.js`
  - 校验并解析模型返回的 JSON

- `lib/storage.js`
  - 封装 `chrome.storage.local`

- `lib/markdown.js`
  - 生成仅包含第 2 行和第 3 行的 Markdown

- `lib/clipboard.js`
  - 统一复制逻辑

- `lib/validators.js`
  - 输入、设置、响应结构校验

## 14. 非目标范围

以下能力明确不在首版范围内：

- 网页划词生成
- 批量整段自动拆句
- PDF 导出
- 云同步
- 后端代理
- 用户账号系统
- 多人协作
- 复杂课程文件夹与标签管理

## 15. 测试重点

实现阶段必须验证：

- 首次打开未配置时是否正确进入设置页
- `API key` 与模型是否能保存并重新读取
- `A / B / C` 单选状态是否正确切换
- 不同级别是否遵守各自输出规则
- 第 2 行单独复制是否正确
- 第 3 行单独复制是否正确
- `Copy All` 是否只包含第 2 行和第 3 行
- `Export Markdown` 是否只包含第 2 行和第 3 行
- 草稿保存、回填、删除是否正确
- AI 返回异常结构时是否进入错误态

## 16. 结论

首版产品定义为一个“以侧边栏为核心、面向中文教学备课的单句生成插件”。设计重点不是做通用翻译工具，而是做“稳定、清晰、可编辑、可积累”的教学卡片生成器。

实现时应优先保障：

- 三行结构稳定
- A/B/C 规则清晰
- 复制与导出行为准确
- 设置和本地存储简单可靠
