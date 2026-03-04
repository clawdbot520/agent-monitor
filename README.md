# Agent Monitor

🌍 **Languages**: [中文](README_zh.md)

A macOS desktop app for monitoring AI agent conversations in real time. Supports both **OpenClaw** and **Claude Code** agent session logs, displayed in a Telegram-style chat interface.

![Agent Monitor UI](https://img.shields.io/badge/platform-macOS-lightgrey) ![Electron](https://img.shields.io/badge/electron-40-blue) ![React](https://img.shields.io/badge/react-19-61dafb)

## Features

- **Dual source support** — switch between OpenClaw and Claude Code with one click
- **Three-panel layout** — Agents → Sessions → Logs, all resizable and persisted
- **Telegram-style chat UI** — user and assistant messages as bubbles
- **Thinking toggle** — show or hide extended thinking content
- **Search** — filter messages by keyword with inline highlighting
- **Tooltips** — hover any toolbar button for 1-second delayed label
- **Persistent settings** — panel widths, active source, and folder paths saved across restarts
- **Smart message parsing** — automatically strips Telegram bridge metadata headers, showing only the actual message content

## Requirements

- macOS (arm64)
- Node.js 18+
- npm

## Installation

```bash
git clone https://github.com/clawdbot520/agent-monitor.git
cd agent-monitor
npm install
```

## Usage

### Development mode (browser)

```bash
npm run dev
```

Opens at `http://localhost:5173` with the Express API server running alongside.

### Development mode (Electron app)

```bash
npm run app
```

Launches the full desktop app with hot reload.

### Build for distribution

```bash
npm run build:app
```

Produces a signed `.dmg` installer in `release/`.

## Configuration

Click the **gear icon** (top right) to configure:

| Field | Default | Description |
|-------|---------|-------------|
| OpenClaw agents path | `~/.openclaw/agents` | Root folder containing OpenClaw agent directories |
| Claude Code projects path | `~/.claude/projects` | Root folder containing Claude Code project sessions |

Settings are saved to `localStorage` and persist across restarts.

## Directory structure expected

**OpenClaw:**
```
~/.openclaw/agents/
  <agent-id>/
    sessions/
      <session-id>.jsonl
```

**Claude Code:**
```
~/.claude/projects/
  <project-path>/
    <session-id>.jsonl
```

## Tech stack

- **Frontend** — React 19, Vite 7
- **Backend** — Express 5 (embedded in Electron for production)
- **Desktop** — Electron 40, electron-builder
- **Styling** — Plain CSS, macOS dark theme
