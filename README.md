# 📝 Chinese Teaching Note Builder

> Turn any Chinese word into a clean, leveled teaching note — pinyin, English, and difficulty tiers — right inside your browser. Powered by 9 LLM providers.

**English | [中文](#中文)**

[![Last commit](https://img.shields.io/github/last-commit/shengdabai/teaching-notes-sidebar)](https://github.com/shengdabai/teaching-notes-sidebar/commits)
[![Stars](https://img.shields.io/github/stars/shengdabai/teaching-notes-sidebar?style=social)](https://github.com/shengdabai/teaching-notes-sidebar/stargazers)
[![Follow @shengdabai](https://img.shields.io/github/followers/shengdabai?style=social)](https://github.com/shengdabai)

---

## Why

I teach Chinese to 6,000+ students, and building clean teaching notes by hand — word, pinyin, English, the right difficulty for each class — eats hours every week. This is the tool I built to do it in seconds, without leaving the browser tab I'm already reading in. I'm building it in public so other teachers (and AI tinkerers) can use it, fork it, and make it better.

## What

A Manifest V3 Chrome extension that drops a floating, draggable panel onto any web page. Paste or type Chinese text, pick a difficulty level, and an LLM turns it into a formatted teaching note with pinyin and English explanations — copy it out or export as Markdown. Notes auto-save locally. Bring your own API key; **DeepSeek** is the default and needs no VPN from inside China.

## ✨ Features

- **9 AI providers** — DeepSeek (default, no VPN needed), MiniMax, GLM (Zhipu), ChatGPT, Claude, Kimi (Moonshot), Qwen (DashScope), Gemini, and any custom OpenAI-compatible endpoint
- **Floating in-page panel** — toggle from the toolbar icon; draggable and resizable, plus a Chrome side-panel UI
- **3 difficulty levels** (pinyin grouped by word, not by single syllable):
  - **A** — pinyin only (e.g. `Běijīng`)
  - **B** — Chinese + pinyin per word (e.g. `经济jīngjì 发展fāzhǎn`)
  - **C** — Chinese only (e.g. `城市`)
- **Export** — copy to clipboard or export as Markdown
- **Auto-save** — notes persisted in `chrome.storage.local`
- **Dark mode** — full dark/light theme support
- **Bring your own key** — API keys stored locally in `chrome.storage`; nothing leaves your machine except the LLM call you trigger

## 🧱 Tech stack

- **Manifest V3** Chrome extension — service-worker background, `chrome.scripting` injection, side panel
- **Vanilla JS (ES modules)** — no framework, no build step; single source of truth for prompt logic in `lib/`
- **Vitest + jsdom** for tests
- **GitHub Actions** CI — runs the test suite and validates `package.json` ↔ `manifest.json` version sync

## 🚀 Install (load unpacked)

1. Clone this repository:
   ```bash
   git clone https://github.com/shengdabai/teaching-notes-sidebar.git
   ```
2. Open Chrome and go to `chrome://extensions/`
3. Toggle **Developer mode** on (top-right)
4. Click **Load unpacked** and select the cloned `teaching-notes-sidebar` folder
5. Pin the extension, then click its toolbar icon on any `http(s)` page to toggle the panel

## 📖 Usage

1. Open the extension **Options** page and paste an API key for your chosen provider (DeepSeek by default)
2. On any web page, click the toolbar icon to show the floating panel
3. Type or paste Chinese text, pick a level (**A / B / C**), and generate
4. Copy the note to your clipboard or export it as Markdown — it's also auto-saved locally

## 🗺️ Status

Active, used daily in my own teaching. Current version **2.2.0** (version synced between `package.json` and `manifest.json`).

Roadmap:
- [ ] Chrome Web Store publication
- [ ] Vocabulary book (import/export CSV)
- [ ] Batch generation (multiple words at once)
- [ ] History and search
- [ ] TypeScript migration

## 🤝 Connect / About

I'm **Tony (Sheng)** — a Chinese-language teacher building AI + Chinese-teaching tools in public.

If this is useful to you, please **⭐ Star this repo** and **[Follow @shengdabai](https://github.com/shengdabai)** — it genuinely helps and tells me what to build next.

You might also like my other browser + AI experiments:
- **[insidebar-ai](https://github.com/shengdabai/insidebar-ai)**
- **[freespace](https://github.com/shengdabai/freespace)**
- **[browser-extensions](https://github.com/shengdabai/browser-extensions)**

## License

MIT (as declared in the manifest). A `LICENSE` file will be added — until then, treat the code as MIT-licensed.

---

## 中文

> 把任意中文词句一键变成干净、分级的教学笔记 —— 拼音、英文释义、难度分层，全部在浏览器里完成。内置 9 家大模型。

**[English](#-chinese-teaching-note-builder) | 中文**

[![Last commit](https://img.shields.io/github/last-commit/shengdabai/teaching-notes-sidebar)](https://github.com/shengdabai/teaching-notes-sidebar/commits)
[![Stars](https://img.shields.io/github/stars/shengdabai/teaching-notes-sidebar?style=social)](https://github.com/shengdabai/teaching-notes-sidebar/stargazers)
[![关注 @shengdabai](https://img.shields.io/github/followers/shengdabai?style=social)](https://github.com/shengdabai)

### 为什么做这个

我教中文,有 6000 多名学员。每周手工做教学笔记 —— 词、拼音、英文、还要按班级调难度 —— 要花掉好几个小时。于是我做了这个工具:在正在看的网页里,几秒钟生成一条笔记,不用切走。我选择公开开发,让其他老师(和喜欢折腾 AI 的人)都能用、能 fork、能一起改进。

### 是什么

一个 Manifest V3 的 Chrome 扩展,会在任意网页上叠加一个可拖动的浮动面板。粘贴或输入中文,选一个难度等级,大模型就会生成带拼音和英文释义的格式化教学笔记 —— 可复制,也可导出为 Markdown,笔记自动本地保存。自带 API Key 即可使用,**DeepSeek** 为默认,国内无需 VPN。

### ✨ 功能

- **9 家大模型** —— DeepSeek(默认,免梯子)、MiniMax、GLM(智谱)、ChatGPT、Claude、Kimi(月之暗面)、Qwen(通义/DashScope)、Gemini,以及任意自定义 OpenAI 兼容端点
- **网页内浮动面板** —— 点工具栏图标即可开关,可拖动、可缩放;另含 Chrome 侧边栏 UI
- **3 个难度等级**(拼音按词分组,而非按单个音节):
  - **A** —— 仅拼音(如 `Běijīng`)
  - **B** —— 中文 + 逐词拼音(如 `经济jīngjì 发展fāzhǎn`)
  - **C** —— 仅中文(如 `城市`)
- **导出** —— 复制到剪贴板或导出 Markdown
- **自动保存** —— 笔记存于 `chrome.storage.local`
- **深色模式** —— 完整深/浅色主题
- **自带 Key** —— API Key 仅存于本地 `chrome.storage`,除了你主动触发的大模型调用,数据不离开你的电脑

### 🧱 技术栈

- **Manifest V3** Chrome 扩展 —— service worker 后台、`chrome.scripting` 注入、侧边栏
- **原生 JS(ES Modules)** —— 无框架、无构建步骤;prompt 逻辑统一收敛在 `lib/`
- **Vitest + jsdom** 测试
- **GitHub Actions** CI —— 跑测试套件,并校验 `package.json` 与 `manifest.json` 版本同步

### 🚀 安装(加载已解压的扩展)

1. 克隆本仓库:
   ```bash
   git clone https://github.com/shengdabai/teaching-notes-sidebar.git
   ```
2. 打开 Chrome,进入 `chrome://extensions/`
3. 打开右上角的 **开发者模式**
4. 点 **加载已解压的扩展程序**,选中克隆下来的 `teaching-notes-sidebar` 文件夹
5. 固定扩展,然后在任意 `http(s)` 网页点工具栏图标开关面板

### 📖 使用

1. 打开扩展的 **选项** 页,为所选大模型粘贴 API Key(默认 DeepSeek)
2. 在任意网页点工具栏图标,显示浮动面板
3. 输入或粘贴中文,选难度(**A / B / C**),点击生成
4. 复制到剪贴板或导出 Markdown —— 笔记也会自动本地保存

### 🗺️ 状态

活跃维护,我自己每天教学在用。当前版本 **2.2.0**(`package.json` 与 `manifest.json` 版本保持同步)。

路线图:
- [ ] 上架 Chrome Web Store
- [ ] 生词本(CSV 导入/导出)
- [ ] 批量生成(一次多个词)
- [ ] 历史记录与搜索
- [ ] 迁移到 TypeScript

### 🤝 联系 / 关于

我是 **Tony(Sheng)** —— 一名中文老师,在公开构建 AI + 中文教学工具。

如果这个项目对你有用,欢迎 **⭐ Star 本仓库** 并 **[关注 @shengdabai](https://github.com/shengdabai)** —— 这对我帮助很大,也决定我接下来做什么。

也欢迎看看我其他的浏览器 + AI 实验:
- **[insidebar-ai](https://github.com/shengdabai/insidebar-ai)**
- **[freespace](https://github.com/shengdabai/freespace)**
- **[browser-extensions](https://github.com/shengdabai/browser-extensions)**

### 许可证

MIT(以 manifest 中声明为准)。后续会补上 `LICENSE` 文件;在此之前,请按 MIT 协议使用本代码。
