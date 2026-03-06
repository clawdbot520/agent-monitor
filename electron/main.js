import { app, BrowserWindow } from 'electron'
import path from 'path'
import os from 'os'
import { execSync } from 'child_process'
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
    server.use(express.json())
    server.use(express.static(path.join(__dirname, '../public')))

    // In production, serve the built React app from the unpacked dist directory
    const distPath = app.isPackaged
      ? path.join(process.resourcesPath, 'dist')
      : path.join(__dirname, '../dist')
    server.use(express.static(distPath))

    const soulsDir = app.isPackaged
      ? path.join(process.resourcesPath, 'souls')
      : path.join(__dirname, '../souls')

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

    server.post('/api/agents/create', (req, res) => {
      try {
        const { id, name, workspace, model, telegramGroupId, soul } = req.body
        if (!id || !id.trim()) return res.status(400).json({ error: 'Agent ID is required' })

        const home = process.env.HOME || process.env.USERPROFILE
        const ocPath = path.join(home, '.openclaw', 'openclaw.json')
        if (!fs.existsSync(ocPath)) return res.status(404).json({ error: 'openclaw.json not found' })

        const config = JSON.parse(fs.readFileSync(ocPath, 'utf-8'))
        const agentId = id.trim()

        if (config.agents.list.some(a => a.id === agentId)) {
          return res.status(409).json({ error: `Agent "${agentId}" already exists` })
        }

        const resolvedWorkspace = (workspace || `~/.openclaw/workspace-${agentId}`)
          .replace(/^~/, home)
        const resolvedAgentDir = path.join(home, '.openclaw', 'agents', agentId, 'agent')

        config.agents.list.push({
          id: agentId,
          name: name || agentId,
          workspace: resolvedWorkspace,
          agentDir: resolvedAgentDir,
          model: model || config.agents.defaults.model.primary,
        })

        if (telegramGroupId && telegramGroupId.trim()) {
          const gid = telegramGroupId.trim()
          config.bindings = config.bindings || []
          config.bindings.push({ agentId, match: { channel: 'telegram', peer: { kind: 'group', id: gid } } })
          if (config.channels?.telegram?.groups) {
            config.channels.telegram.groups[gid] = { requireMention: false, enabled: true }
          }
        }

        fs.mkdirSync(resolvedWorkspace, { recursive: true })
        fs.mkdirSync(resolvedAgentDir, { recursive: true })
        if (soul) {
          const soulPath = path.join(soulsDir, soul + '.md')
          if (fs.existsSync(soulPath)) {
            fs.writeFileSync(path.join(resolvedAgentDir, 'SOUL.md'), fs.readFileSync(soulPath, 'utf-8'))
          }
        }
        fs.writeFileSync(ocPath, JSON.stringify(config, null, 2))

        res.json({ success: true })
      } catch (error) {
        res.status(500).json({ error: error.message })
      }
    })

    // GET /api/system/metrics
    server.get('/api/system/metrics', (req, res) => {
      const getCpuTimes = () => {
        let idle = 0, total = 0
        for (const cpu of os.cpus()) {
          for (const t of Object.values(cpu.times)) total += t
          idle += cpu.times.idle
        }
        return { idle, total }
      }
      const t1 = getCpuTimes()
      setTimeout(() => {
        try {
          const t2 = getCpuTimes()
          const idleDiff = t2.idle - t1.idle
          const totalDiff = t2.total - t1.total
          const cpuPercent = totalDiff > 0 ? Math.round((1 - idleDiff / totalDiff) * 100) : 0
          const totalMem = os.totalmem()
          let usedMem = totalMem - os.freemem()
          if (process.platform === 'darwin') {
            try {
              const vmRaw = execSync('vm_stat 2>/dev/null').toString()
              const pageSize = parseInt(vmRaw.match(/page size of\s+(\d+)\s+bytes/)?.[1] || '4096')
              const g = (re) => parseInt(vmRaw.match(re)?.[1] || '0')
              const anonymous  = g(/Anonymous pages:\s+(\d+)/)
              const wired      = g(/Pages wired down:\s+(\d+)/)
              const compressed = g(/Pages occupied by compressor:\s+(\d+)/)
              const calc = (anonymous + wired + compressed) * pageSize
              if (calc > 0) usedMem = Math.min(totalMem, calc)
            } catch (_) {}
          }
          let disk = null
          try {
            if (process.platform === 'darwin') {
              const apfsOut = execSync('diskutil apfs list 2>/dev/null').toString()
              const totalMatch = apfsOut.match(/Size \(Capacity Ceiling\):\s+(\d+) B/)
              const usedMatch  = apfsOut.match(/Capacity In Use By Volumes:\s+(\d+) B/)
              if (totalMatch && usedMatch) {
                const diskTotal = parseInt(totalMatch[1])
                const diskUsed  = parseInt(usedMatch[1])
                disk = { used: diskUsed, total: diskTotal, percent: Math.round(diskUsed / diskTotal * 100) }
              }
            }
            if (!disk) {
              const dfOut = execSync('df -k /').toString().split('\n')[1].trim().split(/\s+/)
              const diskTotal = parseInt(dfOut[1]) * 1024
              const diskUsed = parseInt(dfOut[2]) * 1024
              disk = { used: diskUsed, total: diskTotal, percent: Math.round(diskUsed / diskTotal * 100) }
            }
          } catch (_) {}
          res.json({ cpu: { percent: cpuPercent, cores: os.cpus().length }, ram: { used: usedMem, total: totalMem, percent: Math.round(usedMem / totalMem * 100) }, disk })
        } catch (error) {
          res.status(500).json({ error: error.message })
        }
      }, 150)
    })

    // GET /api/agents/:agentId/stats
    server.get('/api/agents/:agentId/stats', (req, res) => {
      try {
        const { agentId } = req.params
        const { dir, type } = req.query
        const agentsDir = getAgentsDir(dir)
        const sessionsDir = getSessionsDir(agentsDir, agentId, type)
        if (!fs.existsSync(sessionsDir)) return res.json({ sessions: [], totals: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, cost: 0 } })
        const files = fs.readdirSync(sessionsDir).filter(f => f.endsWith('.jsonl'))
        const sessionStats = []
        for (const file of files) {
          const content = fs.readFileSync(path.join(sessionsDir, file), 'utf-8')
          let input = 0, output = 0, cacheRead = 0, cacheWrite = 0, cost = 0
          for (const line of content.split('\n').filter(l => l.trim())) {
            try {
              const entry = JSON.parse(line)
              const usage = entry.usage || entry.message?.usage || entry.message?.message?.usage
              if (usage) {
                input += usage.input_tokens || usage.input || 0
                output += usage.output_tokens || usage.output || 0
                cacheRead += usage.cache_read_input_tokens || usage.cacheRead || 0
                cacheWrite += usage.cache_creation_input_tokens || usage.cacheWrite || 0
              }
              const c = entry.costUSD || entry.cost?.total || entry.message?.costUSD || 0
              cost += typeof c === 'number' ? c : 0
            } catch (_) {}
          }
          if (input + output > 0) {
            const stat = fs.statSync(path.join(sessionsDir, file))
            sessionStats.push({ sessionId: file.replace('.jsonl', ''), input, output, cacheRead, cacheWrite, cost, lastModified: stat.mtime })
          }
        }
        sessionStats.sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified))
        const totals = sessionStats.reduce(
          (acc, s) => ({ input: acc.input + s.input, output: acc.output + s.output, cacheRead: acc.cacheRead + s.cacheRead, cacheWrite: acc.cacheWrite + s.cacheWrite, cost: acc.cost + s.cost }),
          { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, cost: 0 }
        )
        res.json({ sessions: sessionStats, totals })
      } catch (error) {
        res.status(500).json({ error: error.message })
      }
    })

    // Memory dir resolver
    const getMemoryDir = (agentsDir, agentId) => {
      const agentMem = path.join(agentsDir, agentId, 'memory')
      if (fs.existsSync(agentMem)) return agentMem
      try {
        const home = process.env.HOME || process.env.USERPROFILE
        const ocPath = path.join(home, '.openclaw', 'openclaw.json')
        if (fs.existsSync(ocPath)) {
          const cfg = JSON.parse(fs.readFileSync(ocPath, 'utf-8'))
          const agent = cfg.agents?.list?.find(a => a.id === agentId)
          if (agent?.workspace) {
            const wsMem = path.join(agent.workspace, 'memory')
            if (fs.existsSync(wsMem)) return wsMem
          }
        }
      } catch (_) {}
      const wsRoot = path.dirname(agentsDir)
      const wsMem = path.join(wsRoot, `workspace-${agentId}`, 'memory')
      if (fs.existsSync(wsMem)) return wsMem
      return null
    }

    // GET /api/agents/:agentId/memory
    server.get('/api/agents/:agentId/memory', (req, res) => {
      try {
        const { agentId } = req.params
        const { dir } = req.query
        const agentsDir = getAgentsDir(dir)
        const memDir = getMemoryDir(agentsDir, agentId)
        if (!memDir) return res.json([])
        const files = fs.readdirSync(memDir)
          .filter(f => !fs.statSync(path.join(memDir, f)).isDirectory())
          .map(f => { const s = fs.statSync(path.join(memDir, f)); return { name: f, size: s.size, modified: s.mtime } })
          .sort((a, b) => new Date(b.modified) - new Date(a.modified))
        res.json(files)
      } catch (error) {
        res.status(500).json({ error: error.message })
      }
    })

    // GET /api/agents/:agentId/memory/:filename
    server.get('/api/agents/:agentId/memory/:filename', (req, res) => {
      try {
        const { agentId, filename } = req.params
        const { dir } = req.query
        const agentsDir = getAgentsDir(dir)
        const memDir = getMemoryDir(agentsDir, agentId)
        if (!memDir) return res.status(404).json({ error: 'Memory directory not found' })
        const filePath = path.resolve(memDir, filename)
        if (!filePath.startsWith(path.resolve(memDir))) return res.status(400).json({ error: 'Invalid path' })
        if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Not found' })
        res.json({ content: fs.readFileSync(filePath, 'utf-8') })
      } catch (error) {
        res.status(500).json({ error: error.message })
      }
    })

    // DELETE /api/agents/:agentId/sessions/:sessionId — moves to ~/.Trash/
    server.delete('/api/agents/:agentId/sessions/:sessionId', (req, res) => {
      try {
        const { agentId, sessionId } = req.params
        const { dir, type } = req.query
        const agentsDir = getAgentsDir(dir)
        const sessionsDir = getSessionsDir(agentsDir, agentId, type)
        const filePath = path.resolve(sessionsDir, `${sessionId}.jsonl`)
        if (!filePath.startsWith(path.resolve(sessionsDir))) return res.status(400).json({ error: 'Invalid path' })
        if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Not found' })
        const trashDir = path.join(os.homedir(), '.Trash')
        const trashName = `${agentId}-${sessionId}-${Date.now()}.jsonl`
        fs.renameSync(filePath, path.join(trashDir, trashName))
        res.json({ ok: true })
      } catch (error) {
        res.status(500).json({ error: error.message })
      }
    })

    // Resolve agent config dir (where AGENTS.md, SOUL.md, TOOLS.md etc. live)
    // Files live in workspace dir, NOT agentDir (which only has auth JSON files).
    const getConfigDir = (agentsDir, agentId) => {
      const home = process.env.HOME || process.env.USERPROFILE
      const ocRoot = path.join(home, '.openclaw')

      // Try workspace from openclaw.json
      try {
        const ocPath = path.join(ocRoot, 'openclaw.json')
        if (fs.existsSync(ocPath)) {
          const cfg = JSON.parse(fs.readFileSync(ocPath, 'utf-8'))
          const agent = cfg.agents?.list?.find(a => a.id === agentId)
          if (agent?.workspace && fs.existsSync(agent.workspace)) return agent.workspace
        }
      } catch (_) {}

      // Fallback: workspace-{agentId} convention
      const wsNamed = path.join(ocRoot, `workspace-${agentId}`)
      if (fs.existsSync(wsNamed)) return wsNamed

      // Fallback: main agent lives at ~/.openclaw/workspace/
      const wsDefault = path.join(ocRoot, 'workspace')
      if (fs.existsSync(wsDefault)) return wsDefault

      return null
    }

    // GET /api/agents/:agentId/config-files
    server.get('/api/agents/:agentId/config-files', (req, res) => {
      try {
        const { agentId } = req.params
        const { dir } = req.query
        const agentsDir = getAgentsDir(dir)
        const configDir = getConfigDir(agentsDir, agentId)
        if (!configDir) return res.json([])
        const files = fs.readdirSync(configDir)
          .filter(f => f.endsWith('.md') && !fs.statSync(path.join(configDir, f)).isDirectory())
          .map(f => { const s = fs.statSync(path.join(configDir, f)); return { name: f, size: s.size, modified: s.mtime } })
          .sort((a, b) => a.name.localeCompare(b.name))
        res.json(files)
      } catch (error) {
        res.status(500).json({ error: error.message })
      }
    })

    // GET /api/agents/:agentId/config-files/:filename
    server.get('/api/agents/:agentId/config-files/:filename', (req, res) => {
      try {
        const { agentId, filename } = req.params
        const { dir } = req.query
        const agentsDir = getAgentsDir(dir)
        const configDir = getConfigDir(agentsDir, agentId)
        if (!configDir) return res.status(404).json({ error: 'Config directory not found' })
        const filePath = path.resolve(configDir, filename)
        if (!filePath.startsWith(path.resolve(configDir))) return res.status(400).json({ error: 'Invalid path' })
        if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Not found' })
        res.json({ content: fs.readFileSync(filePath, 'utf-8') })
      } catch (error) {
        res.status(500).json({ error: error.message })
      }
    })

    // PUT /api/agents/:agentId/config-files/:filename
    server.put('/api/agents/:agentId/config-files/:filename', (req, res) => {
      try {
        const { agentId, filename } = req.params
        const { dir } = req.query
        const { content } = req.body
        if (!filename.endsWith('.md')) return res.status(400).json({ error: 'Only .md files allowed' })
        const agentsDir = getAgentsDir(dir)
        const configDir = getConfigDir(agentsDir, agentId)
        if (!configDir) return res.status(404).json({ error: 'Config directory not found' })
        const filePath = path.resolve(configDir, filename)
        if (!filePath.startsWith(path.resolve(configDir))) return res.status(400).json({ error: 'Invalid path' })
        fs.writeFileSync(filePath, content ?? '', 'utf-8')
        res.json({ ok: true })
      } catch (error) {
        res.status(500).json({ error: error.message })
      }
    })

    // GET /api/crons
    server.get('/api/crons', (req, res) => {
      try {
        const home = process.env.HOME || process.env.USERPROFILE
        const cronPath = path.join(home, '.openclaw', 'cron', 'jobs.json')
        if (!fs.existsSync(cronPath)) return res.json([])
        const data = JSON.parse(fs.readFileSync(cronPath, 'utf-8'))
        res.json(Array.isArray(data) ? data : (data.jobs || []))
      } catch (error) {
        res.status(500).json({ error: error.message })
      }
    })

    // LanceDB helper — cache db connection, always open fresh table to see latest writes
    let lanceDb = null
    async function getLanceTable() {
      if (!lanceDb) {
        const lancedb = await import('@lancedb/lancedb')
        const home = process.env.HOME || process.env.USERPROFILE
        const dbPath = path.join(home, '.openclaw', 'memory', 'lancedb-pro')
        lanceDb = await lancedb.connect(dbPath)
      }
      return lanceDb.openTable('memories')
    }

    // GET /api/lancedb/stats
    server.get('/api/lancedb/stats', async (req, res) => {
      try {
        const table = await getLanceTable()
        const rows = await table.query().select(['scope', 'category']).toArray()
        const scopeCounts = {}, categoryCounts = {}
        for (const r of rows) {
          const s = r.scope ?? 'global', c = r.category ?? 'other'
          scopeCounts[s] = (scopeCounts[s] || 0) + 1
          categoryCounts[c] = (categoryCounts[c] || 0) + 1
        }
        res.json({ scopeCounts, categoryCounts, total: rows.length })
      } catch (error) {
        res.status(500).json({ error: error.message })
      }
    })

    // GET /api/lancedb/memories
    server.get('/api/lancedb/memories', async (req, res) => {
      try {
        const { scope, category, limit = 30, offset = 0 } = req.query
        const table = await getLanceTable()
        let q = table.query().select(['id', 'text', 'scope', 'category', 'importance', 'timestamp', 'metadata'])
        const conds = []
        if (scope) conds.push(`scope = '${scope.replace(/'/g, "''")}'`)
        if (category) conds.push(`category = '${category.replace(/'/g, "''")}'`)
        if (conds.length) q = q.where(conds.join(' AND '))
        const all = await q.toArray()
        const sorted = all.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
        res.json(sorted.slice(Number(offset), Number(offset) + Number(limit)).map(r => ({
          id: r.id, text: r.text, scope: r.scope ?? 'global',
          category: r.category, importance: r.importance, timestamp: r.timestamp
        })))
      } catch (error) {
        res.status(500).json({ error: error.message })
      }
    })

    // GET /api/lancedb/search
    server.get('/api/lancedb/search', async (req, res) => {
      try {
        const { q, scope } = req.query
        if (!q) return res.json([])
        const table = await getLanceTable()
        let search = table.search(q, 'fts').limit(20)
        if (scope) search = search.where(`scope = '${scope.replace(/'/g, "''")}'`)
        const results = await search.toArray()
        res.json(results.map(r => ({
          id: r.id, text: r.text, scope: r.scope ?? 'global',
          category: r.category, importance: r.importance, timestamp: r.timestamp
        })))
      } catch (error) {
        res.status(500).json({ error: error.message })
      }
    })

    // DELETE /api/lancedb/memories/:id
    server.delete('/api/lancedb/memories/:id', async (req, res) => {
      try {
        const table = await getLanceTable()
        await table.delete(`id = '${req.params.id.replace(/'/g, "''")}'`)
        res.json({ ok: true })
      } catch (error) {
        res.status(500).json({ error: error.message })
      }
    })

    // POST /api/lancedb/memories
    server.post('/api/lancedb/memories', async (req, res) => {
      try {
        const { text, scope = 'global', category = 'other', importance = 0.5 } = req.body
        if (!text?.trim()) return res.status(400).json({ error: 'text required' })
        const table = await getLanceTable()
        const sample = await table.query().limit(1).toArray()
        const vecLen = sample[0]?.vector?.length || 1536
        const id = `manual-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
        await table.add([{
          id, text: text.trim(), scope, category,
          importance: Number(importance), timestamp: Date.now(),
          metadata: {}, vector: new Array(vecLen).fill(0),
        }])
        res.json({ ok: true, id })
      } catch (error) {
        res.status(500).json({ error: error.message })
      }
    })

    // PATCH /api/lancedb/memories/:id
    server.patch('/api/lancedb/memories/:id', async (req, res) => {
      try {
        const { text, category, importance } = req.body
        const safeId = req.params.id.replace(/'/g, "''")
        const table = await getLanceTable()
        const rows = await table.query().where(`id = '${safeId}'`).toArray()
        if (rows.length === 0) return res.status(404).json({ error: 'not found' })
        const row = { ...rows[0] }
        if (row.vector) row.vector = Array.from(row.vector)
        if (text !== undefined) row.text = text
        if (category !== undefined) row.category = category
        if (importance !== undefined) row.importance = Number(importance)
        await table.delete(`id = '${safeId}'`)
        await table.add([row])
        res.json({ ok: true })
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
    trafficLightPosition: { x: 14, y: 11 },
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
