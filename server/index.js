import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.static(path.join(__dirname, '../public')));
app.use(express.static(path.join(__dirname, '../dist')));

const getAgentsDir = (customDir) => {
  if (customDir) {
    return customDir.replace(/^~/, process.env.HOME || process.env.USERPROFILE);
  }
  const home = process.env.HOME || process.env.USERPROFILE;
  return path.join(home, '.openclaw', 'agents');
};

const getSessionsDir = (agentsDir, agentId, type) => {
  if (type === 'claude') return path.join(agentsDir, agentId);
  return path.join(agentsDir, agentId, 'sessions');
};

// GET /api/agents
app.get('/api/agents', (req, res) => {
  try {
    const { dir, type } = req.query;
    const agentsDir = getAgentsDir(dir);
    if (!fs.existsSync(agentsDir)) return res.json([]);
    const agents = fs.readdirSync(agentsDir)
      .filter(item => fs.statSync(path.join(agentsDir, item)).isDirectory())
      .map(agentId => {
        const sessionsDir = getSessionsDir(agentsDir, agentId, type);
        const hasSessions = fs.existsSync(sessionsDir) &&
          fs.readdirSync(sessionsDir).some(f => f.endsWith('.jsonl'));
        return { id: agentId, hasSessions };
      });
    res.json(agents);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/agents/:agentId/sessions
app.get('/api/agents/:agentId/sessions', (req, res) => {
  try {
    const { agentId } = req.params;
    const { dir, type } = req.query;
    const agentsDir = getAgentsDir(dir);
    const sessionsDir = getSessionsDir(agentsDir, agentId, type);
    if (!fs.existsSync(sessionsDir)) return res.json([]);

    const sessions = fs.readdirSync(sessionsDir)
      .filter(f => f.endsWith('.jsonl'))
      .map(f => {
        const stat = fs.statSync(path.join(sessionsDir, f));
        return { id: f.replace('.jsonl', ''), size: stat.size, lastModified: stat.mtime };
      })
      .filter(s => type === 'claude' ? s.size > 100 : s.size > 500)
      .sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified));

    res.json(sessions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/agents/:agentId/logs?sessionId=xxx
app.get('/api/agents/:agentId/logs', (req, res) => {
  try {
    const { agentId } = req.params;
    const { dir, type, sessionId } = req.query;
    const agentsDir = getAgentsDir(dir);
    const sessionsDir = getSessionsDir(agentsDir, agentId, type);
    if (!fs.existsSync(sessionsDir)) return res.json({ agentId, logs: [] });

    let files = fs.readdirSync(sessionsDir).filter(f => f.endsWith('.jsonl'));
    if (sessionId) {
      files = files.filter(f => f === `${sessionId}.jsonl`);
    } else {
      files = files.sort().reverse();
    }

    const allLogs = [];
    for (const file of files) {
      const content = fs.readFileSync(path.join(sessionsDir, file), 'utf-8');
      for (const line of content.split('\n').filter(l => l.trim())) {
        try { allLogs.push({ ...JSON.parse(line), _file: file }); } catch (e) { }
      }
    }

    allLogs.sort((a, b) => {
      const timeA = a.timestamp || a.time || a.createdAt || 0;
      const timeB = b.timestamp || b.time || b.createdAt || 0;
      return new Date(timeA) - new Date(timeB);
    });

    res.json({ agentId, logs: allLogs });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
