# ⬡ PageForge — AI Landing Page Builder

> Describe your product in plain text. Get a complete, production-ready landing page in seconds.

**Live Demo → [om-frlabs.github.io/pageforge](https://om-frlabs.github.io/pageforge)**

![PageForge Preview](https://img.shields.io/badge/status-live-4ade80?style=flat-square&labelColor=0a0a0a)
![React](https://img.shields.io/badge/React-18-61dafb?style=flat-square&labelColor=0a0a0a)
![Multi-Provider](https://img.shields.io/badge/AI-Gemini%20%7C%20Claude%20%7C%20OpenAI%20%7C%20Grok-e8ff47?style=flat-square&labelColor=0a0a0a)
![License](https://img.shields.io/badge/license-MIT-a78bfa?style=flat-square&labelColor=0a0a0a)

---

## What is PageForge?

PageForge is an AI-powered SaaS landing page generator. You describe your product — the AI writes the headline, features, testimonials, pricing, and footer — and renders a complete, responsive HTML page with live preview instantly.

Built as a resume project to demonstrate **React**, **multi-provider LLM integration**, **prompt engineering**, and **production UI/UX** skills.

---

## Features

| Feature | Details |
|---|---|
| 🤖 **4 AI Providers** | Gemini, Claude, OpenAI GPT-4o, Grok — switch any time |
| ⚡ **Full Page Generation** | Nav, Hero, Features, Testimonials, Pricing, CTA, Footer |
| 🔁 **Per-Section Regeneration** | Redo any single section without rebuilding the whole page |
| 👁 **Live Preview** | Rendered in a sandboxed iframe, updates instantly |
| 📱 **Mobile / Desktop Toggle** | Preview in iPhone frame (390×844) or full desktop |
| ↔ **Resizable Panel** | Drag the divider to adjust panel width (220px–520px) |
| 🎨 **6 Design Tones** | Modern SaaS, Bold & Punchy, Minimal, Playful, Enterprise, Dark Luxury |
| 🌈 **6 Color Palettes** | Auto, Ocean, Forest, Ember, Violet, Mono |
| 🕘 **Generation History** | Last 3 generations stored in-memory with one-click restore |
| ↓ **Export .html** | Download the full standalone HTML file |
| ⎘ **Copy to Clipboard** | Copy raw HTML instantly |

---

## Tech Stack

- **React 18** — functional components, hooks
- **Gemini API** (`gemini-2.0-flash`) — Google AI
- **Claude API** (`claude-opus-4-5`) — Anthropic (via local proxy)
- **OpenAI API** (`gpt-4o`) — OpenAI
- **Grok API** (`grok-3`) — xAI
- **Tailwind CSS CDN** — injected into generated pages
- **GitHub Actions** — CI/CD auto-deploy to GitHub Pages

---

## Getting Started

### Run Locally

```bash
# 1. Clone the repo
git clone https://github.com/Om-frlabs/pageforge.git
cd pageforge

# 2. Install dependencies
npm install

# 3. Start the React app
npm start
```

App runs at `http://localhost:3000`

### Enable Claude (Local Only)

Claude requires a local proxy to bypass CORS. Open a second terminal:

```bash
node proxy.js
```

This starts a proxy at `http://localhost:3001` that forwards requests to `api.anthropic.com`.

> **Note:** Gemini, OpenAI, and Grok work directly in the browser without any proxy.

---

## Project Structure

```
pageforge/
│
├── .github/
│   └── workflows/
│       └── deploy.yml          # Auto-deploy to GitHub Pages on push to main
│
├── public/
│   └── index.html
│
├── src/
│   └── App.js                  # Full PageForge app (single-file React component)
│
├── proxy.js                    # Express proxy for Claude API (local use only)
├── package.json
└── .gitignore
```

---

## API Keys

Get free/paid keys from each provider:

| Provider | Key Format | Get Key |
|---|---|---|
| Gemini | `AIzaSy…` | [aistudio.google.com](https://aistudio.google.com) |
| Claude | `sk-ant-…` | [console.anthropic.com](https://console.anthropic.com) |
| OpenAI | `sk-…` | [platform.openai.com](https://platform.openai.com) |
| Grok | `xai-…` | [console.x.ai](https://console.x.ai) |

> ⚠️ Keys are entered in the UI and never stored anywhere — no backend, no database.

---

## Hosted vs Local

| Feature | GitHub Pages | Local (`npm start`) |
|---|---|---|
| Gemini | ✅ | ✅ |
| OpenAI | ✅ | ✅ |
| Grok | ✅ | ✅ |
| Claude | 🔒 Disabled | ✅ (needs `node proxy.js`) |

Claude is disabled on GitHub Pages because it requires a Node.js proxy server which static hosts don't support.

---

## Deploy

Push to `main` and GitHub Actions handles everything:

```bash
git add .
git commit -m "your message"
git push
```

Live at: **[om-frlabs.github.io/pageforge](https://om-frlabs.github.io/pageforge)**

---

## Screenshots

> _Coming soon — add a screenshot of the app here_

---

## Author

**Om** — Founder, [Fr Labs](https://github.com/Om-frlabs)  
Built in Kanpur, India 🇮🇳

---

## License

MIT — free to use, fork, and build on.
