# Chinese Teaching Note Builder

[English](#english) | [中文](#中文)

---

## English

A Chrome extension that turns Chinese text into **AI-powered teaching notes** with tone-marked pinyin and clear English explanations. Works as a draggable floating panel on any webpage.

### Features

- **3 Display Levels**
  - **A** — Tone-marked pinyin only (listening practice): `wǒ hěn hǎo`
  - **B** — Chinese + pinyin grouped by meaning: `很好 hěn hǎo  学习 xuéxí`
  - **C** — Chinese characters only (advanced learners): `很好 学习`

- **Smart Explanations** — Short phrases get concise translations; longer ones get structure and usage notes (max 50 words, written for students)

- **9 AI Providers**

  | Provider | Default Model | Notes |
  |----------|--------------|-------|
  | DeepSeek | deepseek-chat | Default, no VPN needed |
  | ChatGPT | gpt-4o | |
  | Claude | claude-sonnet-4 | |
  | Gemini | gemini-2.5-flash | |
  | GLM | glm-4-plus | |
  | Kimi | moonshot-v1-8k | |
  | Qwen | qwen-plus | |
  | Minimax | MiniMax-M1 | |
  | Custom | any | OpenAI-compatible endpoints |

- **One-Click Copy** — Copy notes, explanations, or everything at once
- **Markdown Export** — Structured `.md` file with summary statistics
- **Draggable & Resizable** — Move anywhere, resize 200–600px wide
- **Auto-Save** — All notes saved to `chrome.storage.local`
- **IME-Friendly** — Respects Chinese input composition, no accidental triggers

### Installation

1. Clone or download this repository
2. Open Chrome → `chrome://extensions/`
3. Enable **Developer mode** (top-right)
4. Click **Load unpacked** → select this folder
5. Click the extension icon → set your AI provider and API key
6. Visit any webpage → click the extension icon to toggle the panel

### Development

```bash
npm install
npm test
```

### Project Structure

```
├── manifest.json          # Extension manifest (MV3)
├── sidepanel.html/js/css  # Side panel interface
├── settings.html/js/css   # Settings page
├── background.js          # Service worker
├── injected-panel.js      # Floating panel script
├── lib/
│   ├── llm-client.js      # AI provider integration
│   ├── prompt-builder.js  # Prompt construction
│   ├── response-parser.js # API response handling
│   ├── storage.js         # Chrome storage utilities
│   ├── validators.js      # Input validation
│   ├── clipboard.js       # Clipboard operations
│   └── markdown.js        # Markdown generation
└── tests/                 # Vitest test suite
```

### Privacy

- All processing happens locally in your browser
- API keys stored securely in Chrome storage
- No data sent anywhere except your chosen AI provider
- Notes stored locally, exports download as files

## 中文

Chrome 扩展，把中文文本自动生成为 **AI 教学笔记**——带声调拼音和清晰的英文讲解。以可拖拽的浮动面板形式在任意网页上使用。

### 功能特性

- **3 种显示级别**
  - **A** — 仅拼音（听力练习）：`wǒ hěn hǎo`
  - **B** — 中文 + 拼音按词义分组：`很好 hěn hǎo  学习 xuéxí`
  - **C** — 仅中文（高级学习者）：`很好 学习`

- **智能讲解** — 短词给出简洁翻译；长句/复杂短语加上结构和用法说明（最多 50 词，面向学生）

- **9 种 AI 服务**

  | 服务商 | 默认模型 | 说明 |
  |--------|---------|------|
  | DeepSeek | deepseek-chat | 默认，国内无需 VPN |
  | ChatGPT | gpt-4o | |
  | Claude | claude-sonnet-4 | |
  | Gemini | gemini-2.5-flash | |
  | 智谱 GLM | glm-4-plus | |
  | Kimi | moonshot-v1-8k | |
  | 通义千问 | qwen-plus | |
  | Minimax | MiniMax-M1 | |
  | 自定义 | 任意 | 兼容 OpenAI 格式 |

- **一键复制** — 分别复制笔记、讲解，或一键复制全部
- **Markdown 导出** — 导出为结构化 `.md` 文件，含统计摘要
- **可拖拽可缩放** — 面板可拖动到页面任意位置，宽度 200–600px
- **自动保存** — 笔记保存到 `chrome.storage.local`，重启不丢失
- **输入法友好** — 检测中文输入法 composition 状态，不会误触

### 安装

1. 克隆或下载本项目
2. 打开 Chrome → `chrome://extensions/`
3. 打开右上角 **开发者模式**
4. 点击 **加载已解压的扩展程序** → 选择本文件夹
5. 点击扩展图标 → 设置 AI 服务商和 API 密钥
6. 访问任意网页 → 点击扩展图标显示/隐藏面板

### 开发

```bash
npm install
npm test
```

### 隐私

- 所有处理在浏览器本地完成
- API 密钥安全存储在 Chrome storage 中
- 除你选择的 AI 服务商外，不向任何服务器发送数据
- 笔记本地存储，导出为文件下载

---

**License:** MIT · **Version:** 2.1.0
