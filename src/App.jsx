import { useState, useEffect, useRef } from 'react'
import './App.css'

const API = 'http://localhost:3001'
const DEFAULT_PATH = '~/.openclaw/agents'
const DEFAULT_CLAUDE_PATH = '~/.claude/projects'

function App() {
  const [agents, setAgents] = useState([])
  const [selectedAgent, setSelectedAgent] = useState(null)
  const [sessions, setSessions] = useState([])
  const [selectedSession, setSelectedSession] = useState(null)
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(false)
  const [showThinking, setShowThinking] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const searchInputRef = useRef(null)
  useEffect(() => { if (showSearch) searchInputRef.current?.focus() }, [showSearch])
  const closeSearch = () => { setShowSearch(false); setSearchQuery('') }
  const [agentsPath, setAgentsPath] = useState(() => localStorage.getItem('agentsPath') || DEFAULT_PATH)
  const [claudePath, setClaudePath] = useState(() => localStorage.getItem('claudePath') || DEFAULT_CLAUDE_PATH)
  const [activeSource, setActiveSource] = useState(() => localStorage.getItem('activeSource') || 'openclaw')
  const [pathInput, setPathInput] = useState(agentsPath)
  const [claudePathInput, setClaudePathInput] = useState(claudePath)
  const [agentWidth, setAgentWidth] = useState(() => parseInt(localStorage.getItem('agentWidth'), 10) || 260)
  const [sessionsWidth, setSessionsWidth] = useState(() => parseInt(localStorage.getItem('sessionsWidth'), 10) || 180)
  const agentWidthRef = useRef(agentWidth)
  const sessionsWidthRef = useRef(sessionsWidth)
  useEffect(() => { agentWidthRef.current = agentWidth }, [agentWidth])
  useEffect(() => { sessionsWidthRef.current = sessionsWidth }, [sessionsWidth])

  const startResize = (which) => (e) => {
    e.preventDefault()
    const startX = e.clientX
    const startW = which === 'agent' ? agentWidthRef.current : sessionsWidthRef.current
    const setter = which === 'agent' ? setAgentWidth : setSessionsWidth
    const widthRef = which === 'agent' ? agentWidthRef : sessionsWidthRef
    const [min, max] = which === 'agent' ? [160, 400] : [120, 320]
    const onMove = (e) => {
      setter(Math.max(min, Math.min(max, startW + e.clientX - startX)))
    }
    const onUp = () => {
      localStorage.setItem(which === 'agent' ? 'agentWidth' : 'sessionsWidth', widthRef.current)
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }
  const buildQuery = (extra = {}) => {
    const params = new URLSearchParams()
    params.set('dir', activeSource === 'claude' ? claudePath : agentsPath)
    if (activeSource === 'claude') params.set('type', 'claude')
    Object.entries(extra).forEach(([k, v]) => params.set(k, v))
    const q = params.toString()
    return q ? `?${q}` : ''
  }

  const fetchAgents = async () => {
    try {
      const res = await fetch(`${API}/api/agents${buildQuery()}`)
      setAgents(await res.json())
    } catch (e) { console.error(e) }
  }

  const fetchSessions = async (agentId) => {
    try {
      const res = await fetch(`${API}/api/agents/${agentId}/sessions${buildQuery()}`)
      const data = await res.json()
      setSessions(data)
      if (data.length > 0) setSelectedSession(data[0].id)
    } catch (e) { console.error(e) }
  }

  const fetchLogs = async (agentId, sessionId) => {
    setLoading(true)
    try {
      const res = await fetch(`${API}/api/agents/${agentId}/logs${buildQuery({ sessionId })}`)
      const data = await res.json()
      setLogs(data.logs)
    } catch (e) { setLogs([]) }
    setLoading(false)
  }

  useEffect(() => {
    setSelectedAgent(null)
    setSessions([])
    setSelectedSession(null)
    setLogs([])
    fetchAgents()
  }, [activeSource, agentsPath, claudePath])

  useEffect(() => {
    if (selectedAgent) {
      setSessions([])
      setSelectedSession(null)
      setLogs([])
      fetchSessions(selectedAgent)
    }
  }, [selectedAgent])

  useEffect(() => {
    if (selectedAgent && selectedSession) fetchLogs(selectedAgent, selectedSession)
  }, [selectedSession])

  const handleRefresh = () => {
    fetchAgents()
    if (selectedAgent) fetchSessions(selectedAgent)
    if (selectedAgent && selectedSession) fetchLogs(selectedAgent, selectedSession)
  }

  const saveSettings = () => {
    const trimmedAgents = pathInput.trim() || DEFAULT_PATH
    const trimmedClaude = claudePathInput.trim() || DEFAULT_CLAUDE_PATH
    setAgentsPath(trimmedAgents)
    setClaudePath(trimmedClaude)
    localStorage.setItem('agentsPath', trimmedAgents)
    localStorage.setItem('claudePath', trimmedClaude)
    setShowSettings(false)
    setSelectedAgent(null)
    setSessions([])
    setSelectedSession(null)
    setLogs([])
  }

  const toggleSource = () => {
    const next = activeSource === 'openclaw' ? 'claude' : 'openclaw'
    setActiveSource(next)
    localStorage.setItem('activeSource', next)
  }

  const formatTime = (ts) => {
    if (!ts) return ''
    return new Date(ts).toLocaleTimeString('zh-TW', {
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: false, timeZone: 'Asia/Taipei'
    })
  }

  const formatSessionDate = (dateStr) => {
    const d = new Date(dateStr)
    const date = d.toLocaleDateString('zh-TW', { month: '2-digit', day: '2-digit', timeZone: 'Asia/Taipei' })
    const time = d.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Taipei' })
    return { date, time }
  }

  const getDisplayContent = (log) => {
    const msg = log.message || log
    let role = msg.role || log.role || 'assistant'
    if (role === 'system') role = 'assistant'
    if (role === 'toolResult' || role === 'tool') role = 'tool'

    let content = '', thinkingContent = ''
    if (msg.content && Array.isArray(msg.content)) {
      const textBlocks = msg.content.filter(b => b.type === 'text')
      const thinkingBlock = msg.content.find(b => b.type === 'thinking')
      if (textBlocks.length > 0) content = textBlocks.map(b => b.text).join('\n')
      if (thinkingBlock) thinkingContent = thinkingBlock.thinking || ''
    } else if (msg.content) {
      content = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)
    } else {
      content = log.content || log.message || log.text || log.response || ''
    }
    return { content, thinkingContent, role }
  }

  const highlightText = (text, query) => {
    if (!query.trim()) return text
    const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'))
    return parts.map((part, i) =>
      part.toLowerCase() === query.toLowerCase()
        ? <mark key={i} className="search-highlight">{part}</mark>
        : part
    )
  }

  const panelTitle = selectedSession
    ? selectedSession.substring(0, 8) + '...'
    : selectedAgent ? 'Select a session' : 'Select an agent'

  return (
    <div className="app">
      {/* Unified titlebar */}
      <div className="titlebar">
        <div className="titlebar-agents" style={{ width: agentWidth }}>
          <span className="titlebar-label">Agents</span>
        </div>
        {selectedAgent && (
          <div className="titlebar-sessions" style={{ width: sessionsWidth }}>
            <span className="titlebar-label">Sessions</span>
          </div>
        )}
        <div className="titlebar-main">
          {showSearch ? (
            <div className="search-bar">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'rgba(255,255,255,0.35)', flexShrink: 0 }}>
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                ref={searchInputRef}
                className="search-input"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => e.key === 'Escape' && closeSearch()}
                placeholder="Search messages…"
              />
              <button className="icon-btn" onClick={closeSearch} data-tooltip="Close">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
          ) : (
            <span className="titlebar-title">{panelTitle}</span>
          )}
          <div className="titlebar-actions">
            <button
              className={`icon-btn source-${activeSource}`}
              onClick={toggleSource}
              data-tooltip={activeSource === 'openclaw' ? 'Switch to Claude Code' : 'Switch to OpenClaw'}
            >
              {activeSource === 'openclaw' ? (
                /* OpenClaw: round robot with antenna + eyes */
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="7" cy="8.5" r="4.2"/>
                  <circle cx="5.2" cy="8.3" r="0.7" fill="currentColor" stroke="none"/>
                  <circle cx="8.8" cy="8.3" r="0.7" fill="currentColor" stroke="none"/>
                  <line x1="7" y1="4.3" x2="7" y2="2.8"/>
                  <circle cx="7" cy="2.2" r="0.7" fill="currentColor" stroke="none"/>
                </svg>
              ) : (
                /* Claude / Anthropic: 8-spoke asterisk */
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                  <line x1="7" y1="4.5" x2="7" y2="1.5"/>
                  <line x1="8.8" y1="5.2" x2="10.9" y2="3.1"/>
                  <line x1="9.5" y1="7" x2="12.5" y2="7"/>
                  <line x1="8.8" y1="8.8" x2="10.9" y2="10.9"/>
                  <line x1="7" y1="9.5" x2="7" y2="12.5"/>
                  <line x1="5.2" y1="8.8" x2="3.1" y2="10.9"/>
                  <line x1="4.5" y1="7" x2="1.5" y2="7"/>
                  <line x1="5.2" y1="5.2" x2="3.1" y2="3.1"/>
                </svg>
              )}
            </button>
            <button
              className={`icon-btn${showSearch ? ' active' : ''}`}
              onClick={() => setShowSearch(v => !v)}
              data-tooltip="Search"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            </button>
            <button
              className={`icon-btn${showThinking ? ' active' : ''}`}
              onClick={() => setShowThinking(v => !v)}
              data-tooltip="Show thinking"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21h6"/><path d="M10 17h4"/>
                <path d="M12 2a7 7 0 0 1 7 7c0 2.6-1.4 4.9-3.5 6.2V17H8.5v-1.8A7 7 0 0 1 5 9a7 7 0 0 1 7-7z"/>
              </svg>
            </button>
            <button className="icon-btn" onClick={handleRefresh} data-tooltip="Refresh">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 4 23 10 17 10"/>
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
              </svg>
            </button>
            <button className="icon-btn" onClick={() => { setPathInput(agentsPath); setClaudePathInput(claudePath); setShowSettings(true) }} data-tooltip="Settings">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Content body */}
      <div className="content-body">
        {/* Agents sidebar */}
        <aside className="sidebar" style={{ width: agentWidth }}>
          <div className="agent-list">
            {agents.length === 0 ? (
              <div className="empty-hint">No agents found</div>
            ) : agents.map(agent => (
              <div
                key={agent.id}
                className={`agent-item ${selectedAgent === agent.id ? 'active' : ''}`}
                onClick={() => setSelectedAgent(agent.id)}
              >
                <div className="agent-avatar">{agent.id.charAt(0).toUpperCase()}</div>
                <div className="agent-info">
                  <div className="agent-name">{agent.id}</div>
                  <div className="agent-status">{agent.hasSessions ? 'Active' : 'No sessions'}</div>
                </div>
              </div>
            ))}
          </div>
        </aside>
        <div className="resize-handle" onMouseDown={startResize('agent')} />

        {/* Sessions panel */}
        {selectedAgent && (
          <>
          <aside className="sessions-panel" style={{ width: sessionsWidth }}>
            <div className="sessions-list">
              {sessions.length === 0 ? (
                <div className="empty-hint">No sessions</div>
              ) : sessions.map(session => {
                const { date, time } = formatSessionDate(session.lastModified)
                return (
                  <div
                    key={session.id}
                    className={`session-item ${selectedSession === session.id ? 'active' : ''}`}
                    onClick={() => setSelectedSession(session.id)}
                  >
                    <div className="session-date">{date}</div>
                    <div className="session-time">{time}</div>
                    <div className="session-id">{session.id.substring(0, 8)}</div>
                  </div>
                )
              })}
            </div>
          </aside>
          <div className="resize-handle" onMouseDown={startResize('sessions')} />
          </>
        )}

        {/* Log panel */}
        <main className="main-panel">
          <div className="log-content">
            {!selectedAgent ? (
              <div className="empty-hint centered">Select an agent to begin</div>
            ) : !selectedSession ? (
              <div className="empty-hint centered">Select a session</div>
            ) : loading ? (
              <div className="empty-hint centered">Loading…</div>
            ) : logs.length === 0 ? (
              <div className="empty-hint centered">No logs found</div>
            ) : (
              <div className="log-entries">
                {logs.map((log, idx) => {
                  const { content, thinkingContent, role } = getDisplayContent(log)
                  if (role !== 'user' && role !== 'assistant') return null

                  let displayContent = content
                  if (role === 'user') {
                    // Format 1: \n\n[context] message
                    const match = content.match(/\n\n\[.+\]\s*(.+)$/s)
                    if (match) {
                      displayContent = match[1].trim()
                    } else if (content.includes('```')) {
                      // Format 2: metadata JSON blocks, actual message comes after last ```
                      const parts = content.split('```')
                      const lastPart = parts[parts.length - 1].trim()
                      if (lastPart) displayContent = lastPart
                    }
                  }

                  const hasText = displayContent && displayContent.trim() !== ''
                  const hasThinking = showThinking && thinkingContent
                  if (!hasText && !hasThinking) return null

                  const q = searchQuery.trim()
                  if (q) {
                    const inText = hasText && displayContent.toLowerCase().includes(q.toLowerCase())
                    const inThinking = hasThinking && thinkingContent.toLowerCase().includes(q.toLowerCase())
                    if (!inText && !inThinking) return null
                  }

                  return (
                    <div key={idx} className={`log-entry log-${role}`}>
                      <div className="log-meta">
                        <span className="log-role">{role}</span>
                        <span className="log-time">{formatTime(log.timestamp)}</span>
                      </div>
                      {hasText && (
                        <div className="log-message-bubble">
                          <div className="log-content">{highlightText(displayContent, searchQuery)}</div>
                        </div>
                      )}
                      {hasThinking && (
                        <>
                          <div className="log-meta log-meta-thinking">
                            <span className="log-role">thinking</span>
                            <span className="log-time">{formatTime(log.timestamp)}</span>
                          </div>
                          <div className="log-message-bubble log-thinking">
                            <div className="log-content">{highlightText(thinkingContent, searchQuery)}</div>
                          </div>
                        </>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Settings modal */}
      {showSettings && (
        <div className="settings-overlay" onClick={() => setShowSettings(false)}>
          <div className="settings-panel" onClick={e => e.stopPropagation()}>
            <h3>Settings</h3>
            <div className="settings-field">
              <label>OpenClaw agents path</label>
              <input
                type="text"
                value={pathInput}
                onChange={e => setPathInput(e.target.value)}
                placeholder={DEFAULT_PATH}
                spellCheck={false}
              />
              <div className="settings-hint">Default: {DEFAULT_PATH}</div>
            </div>
            <div className="settings-field">
              <label>Claude Code projects path</label>
              <input
                type="text"
                value={claudePathInput}
                onChange={e => setClaudePathInput(e.target.value)}
                placeholder={DEFAULT_CLAUDE_PATH}
                spellCheck={false}
              />
              <div className="settings-hint">Default: {DEFAULT_CLAUDE_PATH}</div>
            </div>
            <div className="settings-actions">
              <button className="settings-cancel" onClick={() => setShowSettings(false)}>Cancel</button>
              <button className="settings-save" onClick={saveSettings}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
