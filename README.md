# teaching-notes-sidebar

Chrome extension that turns Chinese text into leveled teaching notes (pinyin + English) via 9 AI providers. MV3, BYO key.

## Business Context

- **Category:** education product
- **Audience:** learners, teachers, parents, and education operators who need a clearer learning or exam-prep workflow.
- **Repository status:** Public repository. Keep examples, docs, and issues free of credentials, private data, and machine-specific paths.
- **Topics:** ai, browser-extension, chinese, chrome-extension, deepseek, llm, manifest-v3, notes, pinyin, teaching

## What This Project Is For

- Chrome extension that turns Chinese text into leveled teaching notes (pinyin + English) via 9 AI providers. MV3, BYO key.
- Give users a concrete learning workflow instead of a loose collection of content.
- Make practice, feedback, review, or recommendation steps easier to repeat.

## Where It Fits

This repository supports productized learning workflows: diagnostic input, guided practice, review loops, and clearer handoff between learner, teacher, and software.

## Technical Overview

- **Primary language:** JavaScript
- **Detected stack:** JavaScript, Node.js
- **Default branch:** `main`
- **Visibility:** `PUBLIC`
- **License:** MIT License

## Repository Map

- `docs`
- `tests`
- `LICENSE`
- `README.md`
- `SECURITY.md`
- `background.js`
- `icons`
- `injected-panel.js`
- `lib`
- `manifest.json`
- `package-lock.json`
- `package.json`

## Quick Start

Use the commands that match the current project state:

```bash
npm install
npm run test
```

| Command | Purpose |
|---|---|
| `npm install` | Install project dependencies. |
| `npm run test` | vitest run |

## Operating Notes

- Keep real credentials out of the repository. Use local environment files, GitHub repository secrets, or the deployment platform secret manager.
- If a `.env.example` file exists, treat it as documentation only; never commit filled-in `.env` files.
- Before publishing screenshots, demos, or client examples, remove private names, internal paths, account IDs, and API endpoints.
- The `Repository Hygiene` workflow is a lightweight guardrail, not a replacement for product-specific tests.

## Delivery Checklist

- [ ] README describes the user, business outcome, and operating boundary.
- [ ] Setup or preview commands are current and do not rely on private machine state.
- [ ] No real secrets, private user data, or machine-local state are tracked.
- [ ] Screenshots, demos, or sample outputs are safe to share publicly when the repository is public.
- [ ] Product-specific tests or smoke checks are documented before production use.

## Roadmap

- Tighten the fastest path from clone to useful demo.
- Add project-specific screenshots, sample outputs, or a short walkthrough where useful.
- Promote repeated manual steps into scripts, tests, or documented workflows.
- Keep security, privacy, and licensing boundaries explicit as the project evolves.

## Maintainer Notes

Maintained by [Tony Sheng](https://github.com/shengdabai). This README is written as a business-facing handoff: it should help a future collaborator, client, or reviewer understand why the repository exists, how to inspect it, and what must be true before it is reused or shipped.

You might also like my other browser + AI experiments:
- **[insidebar-ai](https://github.com/shengdabai/insidebar-ai)**
- **[freespace](https://github.com/shengdabai/freespace)**
- **[browser-extensions](https://github.com/shengdabai/browser-extensions)**

## License

MIT — see the [LICENSE](LICENSE) file.

---

## 中文

> 把任意中文词句一键变成干净、分级的教学笔记 —— 拼音、英文释义、难度分层，全部在浏览器里完成。内置 9 家大模型。

**[English](#-chinese-teaching-note-builder) | 中文**

[![Last commit](https://img.shields.io/github/last-commit/shengdabai/teaching-notes-sidebar)](https://github.com/shengdabai/teaching-notes-sidebar/commits)
[![Stars](https://img.shields.io/github/stars/shengdabai/teaching-notes-sidebar?style=social)](https://github.com/shengdabai/teaching-notes-sidebar/stargazers)
[![关注 @shengdabai](https://img.shields.io/github/followers/shengdabai?style=social)](https://github.com/shengdabai)

### 为什么做这个

我教中文,有 6000 多名学员。每周手工做教学笔记 —— 词、拼音、英文、还要按班级调难度 —— 要花掉好几个小时。于是我做了这个工具:在正在看的网页里,几秒钟生成一条笔记,不用切走。我选择公开构建,让其他老师(和喜欢折腾 AI 的人)都能用、能 fork、能一起改进。

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

MIT —— 详见 [LICENSE](LICENSE) 文件。
