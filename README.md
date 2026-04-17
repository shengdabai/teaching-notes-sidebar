# Chinese Teaching Note Builder
## 中文教学笔记生成器

A Chrome extension that uses AI to generate Chinese teaching notes with pinyin, translations, and pedagogical explanations. Perfect for language teachers and students.

Chrome 扩展程序，使用 AI 生成带拼音、翻译和教学解析的中文笔记。适用于语言教师和学生。

## Features 功能

### 🎯 Core Functionality 核心功能
- **AI-Powered Notes**: Generate teaching notes using multiple AI providers (DeepSeek, ChatGPT, Claude, Gemini, etc.)
- **Multiple Output Formats**: Three difficulty levels with different pinyin integration
- **Smart Prompting**: Automatically constructs pedagogically effective prompts
- **Floating Panel**: Injected panel that works on any webpage
- **Persistent Storage**: Auto-save notes with metadata
- **Export Capabilities**: Export notes as Markdown files

### 📚 Output Levels 输出级别
- **Level A**: Pinyin only (e.g., `wǒ hěn hǎo`)
- **Level B**: Chinese + Pinyin grouped by meaning (e.g., `很好hěn hǎo 学习xuéxí`)
- **Level C**: Chinese characters only (e.g., `很好 学习`)

### 🤖 AI Providers 支持的 AI 服务
- DeepSeek (Default)
- OpenAI ChatGPT
- Anthropic Claude
- Google Gemini
- 月之暗面 Kimi
- 智谱 GLM
- 通义千问 Qwen
- Minimax
- Custom endpoints

## Installation 安装

### From Chrome Web Store 从应用商店安装
1. Visit the [Chrome Web Store](https://chrome.google.com/webstore/detail/chinese-teaching-note-builder)
2. Click "Add to Chrome"
3. Pin the extension for easy access

### From GitHub 从 GitHub 安装
1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the extension directory
5. Pin the extension for easy access

## Usage 使用指南

### Using the Side Panel 使用侧边栏
1. Click the extension icon in your browser toolbar
2. Type or paste Chinese text in the input field
3. Select your desired difficulty level (A, B, or C)
4. Press Enter or click the generate button
5. The AI will generate:
   - Line 2: Teaching notes according to your level selection
   - Line 3: English translation with usage notes
6. Use the copy buttons to copy individual lines or everything
7. Export your notes as Markdown via the export button

### Using the Floating Panel 使用浮动面板
1. Click the extension icon to open the floating panel on any webpage
2. The panel can be:
   - **Dragged** by the title bar
   - **Resized** using the corner and edge handles
3. Enter Chinese text and generate notes as above
4. Notes are automatically saved to local storage

### Settings Configuration 设置配置
1. Right-click the extension icon and select "Options"
2. Choose your AI provider
3. Enter your API key
4. Select a model (pre-configured for each provider)
5. Optionally specify a custom endpoint
6. Test your connection
7. Save your settings

## Project Structure 项目结构

```
├── manifest.json              # Extension manifest
├── sidepanel.html            # Side panel interface
├── settings.html             # Settings page
├── background.js             # Background service worker
├── injected-panel.js        # Floating panel script
├── settings.js               # Settings page logic
├── sidepanel.js             # Side panel logic
├── lib/                     # Core libraries
│   ├── llm-client.js        # AI provider integration
│   ├── storage.js           # Chrome storage utilities
│   ├── prompt-builder.js    # Prompt construction
│   ├── response-parser.js   # API response handling
│   ├── validators.js        # Input validation
│   ├── clipboard.js         # Clipboard operations
│   └── markdown.js          # Markdown generation
├── tests/                   # Test files
│   ├── smoke.test.js        # Basic functionality tests
│   ├── sidepanel.test.js    # Side panel specific tests
│   ├── storage.test.js      # Storage system tests
│   ├── settings.test.js     # Settings page tests
│   └── content-formatting.test.js  # Content format tests
├── vitest.config.js         # Test configuration
└── package.json             # Project dependencies
```

## API Endpoints API 端点

The extension supports the following AI providers with their default endpoints:

- **DeepSeek**: `https://api.deepseek.com/v1/chat/completions`
- **OpenAI**: `https://api.openai.com/v1/chat/completions`
- **Claude**: `https://api.anthropic.com/v1/messages`
- **Gemini**: `https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent`
- **GLM**: `https://open.bigmodel.cn/api/paas/v4/chat/completions`
- **Kimi**: `https://api.moonshot.cn/v1/chat/completions`
- **Qwen**: `https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions`
- **Minimax**: `https://api.minimax.chat/v1/text/chatcompletion_v2`

## Development 开发

### Setup Environment 设置环境
1. Clone the repository
2. Install dependencies: `npm install`
3. Run tests: `npm test`
4. Load the extension in Chrome developer mode

### Testing 测试
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch
```

### Building 构建
This extension uses standard Chrome extension development practices. No build step is required for development.

## Privacy 隐私

- All processing happens locally in your browser
- Your API keys are stored securely in Chrome storage
- No text is sent to any server except the AI provider you select
- Generated notes are stored locally in your browser
- Exported notes are downloaded as files to your computer

## Support 支持

### Common Issues 常见问题
- **API Key Error**: Ensure your API key is valid and has the necessary permissions
- **Empty Response**: Some models may return empty responses for certain inputs. Try rephrasing your Chinese text
- **Connection Failed**: Check your internet connection and API endpoint configuration

### Contributing 贡献
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## License 许可证

MIT License - see [LICENSE](LICENSE) file for details.

---

### Version History 版本历史
- **v2.1.0**: Added Google Gemini support, improved UI responsiveness
- **v2.0.0**: Introduced floating panel with drag/resize functionality
- **v1.0.0**: Initial release with side panel and basic AI integration

### Special Thanks 特别感谢
- Thanks to all AI providers for their powerful language models
- Inspired by Chinese language teaching methodologies