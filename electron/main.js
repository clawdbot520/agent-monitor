import { app, BrowserWindow } from 'electron'
import path from 'path'
import { fileURLToPath } from 'url'
import express from 'express'
import cors from 'cors'
import fs from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const isDev = process.env.NODE_ENV === 'development'

function startServer() {
  return new Promise((resolve) => {
    const server = express()

    server.use(cors())
    server.use(express.static(path.join(__dirname, '../public')))

    // In production, serve the built React app from the unpacked dist directory
    const distPath = app.isPackaged
      ? path.join(process.resourcesPath, 'dist')
      : path.join(__dirname, '../dist')
    server.use(express.static(distPath))

    const getAgentsDir = (customDir) => {
      if (customDir) {
        return customDir.replace(/^~/, process.env.HOME || process.env.USERPROFILE)
      }
      const home = process.env.HOME || process.env.USERPROFILE
      return path.join(home, '.openclaw', 'agents')
    }

    const getSessionsDir = (agentsDir, agentId, type) => {
      if (type === 'claude') return path.join(agentsDir, agentId)
      return path.join(agentsDir, agentId, 'sessions')
    }

    server.get('/api/agents', (req, res) => {
      try {
        const { dir, type } = req.query
        const agentsDir = getAgentsDir(dir)
        if (!fs.existsSync(agentsDir)) return res.json([])
        const agents = fs.readdirSync(agentsDir)
          .filter(item => fs.statSync(path.join(agentsDir, item)).isDirectory())
          .map(agentId => {
            const sessionsDir = getSessionsDir(agentsDir, agentId, type)
            const hasSessions = fs.existsSync(sessionsDir) &&
              fs.readdirSync(sessionsDir).some(f => f.endsWith('.jsonl'))
            return { id: agentId, hasSessions }
          })
        res.json(agents)
      } catch (error) {
        res.status(500).json({ error: error.message })
      }
    })

    server.get('/api/agents/:agentId/sessions', (req, res) => {
      try {
        const { agentId } = req.params
        const { dir, type } = req.query
        const agentsDir = getAgentsDir(dir)
        const sessionsDir = getSessionsDir(agentsDir, agentId, type)
        if (!fs.existsSync(sessionsDir)) return res.json([])

        const sessions = fs.readdirSync(sessionsDir)
          .filter(f => f.endsWith('.jsonl'))
          .map(f => {
            const stat = fs.statSync(path.join(sessionsDir, f))
            return { id: f.replace('.jsonl', ''), size: stat.size, lastModified: stat.mtime }
          })
          .filter(s => type === 'claude' ? s.size > 100 : s.size > 500)
          .sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified))

        res.json(sessions)
      } catch (error) {
        res.status(500).json({ error: error.message })
      }
    })

    server.get('/api/agents/:agentId/logs', (req, res) => {
      try {
        const { agentId } = req.params
        const { dir, type, sessionId } = req.query
        const agentsDir = getAgentsDir(dir)
        const sessionsDir = getSessionsDir(agentsDir, agentId, type)
        if (!fs.existsSync(sessionsDir)) return res.json({ agentId, logs: [] })

        let files = fs.readdirSync(sessionsDir).filter(f => f.endsWith('.jsonl'))
        if (sessionId) {
          files = files.filter(f => f === `${sessionId}.jsonl`)
        } else {
          files = files.sort().reverse()
        }

        const allLogs = []
        for (const file of files) {
          const content = fs.readFileSync(path.join(sessionsDir, file), 'utf-8')
          for (const line of content.split('\n').filter(l => l.trim())) {
            try { allLogs.push({ ...JSON.parse(line), _file: file }) } catch (e) { }
          }
        }

        allLogs.sort((a, b) => {
          const timeA = a.timestamp || a.time || a.createdAt || 0
          const timeB = b.timestamp || b.time || b.createdAt || 0
          return new Date(timeA) - new Date(timeB)
        })

        res.json({ agentId, logs: allLogs })
      } catch (error) {
        res.status(500).json({ error: error.message })
      }
    })

    server.listen(3001, () => {
      console.log('Server running on http://localhost:3001')
      resolve()
    })
  })
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
    }
  })

  const url = isDev ? 'http://localhost:5173' : 'http://localhost:3001'
  tryLoadURL(win, url)
}

function tryLoadURL(win, url, retries = 0) {
  win.loadURL(url).catch(() => {
    if (retries < 20) {
      setTimeout(() => tryLoadURL(win, url, retries + 1), 500)
    }
  })
}

app.whenReady().then(async () => {
  if (!isDev) {
    await startServer()
  }
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
