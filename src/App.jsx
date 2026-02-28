import { useState, useEffect, useLayoutEffect, useRef } from 'react'
import './App.css'

const API = 'http://localhost:3001'

const AVATAR_COLORS = ['#e8634a', '#e8944a', '#4abe7a', '#4ab3e8', '#5a8de8', '#9b6ee8']
const getAvatarColor = (id) => {
  let h = 0
  for (let i = 0; i < id.length; i++) h = id.charCodeAt(i) + ((h << 5) - h)
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length]
}

const DEFAULT_PATH = '~/.openclaw/agents'
const DEFAULT_CLAUDE_PATH = '~/.claude/projects'

const SOUL_OPTIONS = {
  'Coding': [
    { value: 'coding/devclaw', label: 'Coding Partner', labelZh: '程式夥伴' },
    { value: 'coding/shipit', label: 'Ship It (TDD)', labelZh: '快速交付 (TDD)' },
    { value: 'coding/trace', label: 'Debugger', labelZh: '除錯專家' },
    { value: 'coding/nitpick', label: 'Code Reviewer — strict', labelZh: '程式審查 — 嚴格版' },
    { value: 'coding/reviewer', label: 'Code Reviewer — contextual', labelZh: '程式審查 — 情境版' },
    { value: 'coding/qa', label: 'QA Engineer', labelZh: 'QA 測試工程師' },
  ],
  'Design & Product': [
    { value: 'design/ux', label: 'UI/UX Designer', labelZh: 'UI/UX 設計師' },
    { value: 'design/pm', label: 'Product Manager', labelZh: '產品經理' },
  ],
  'Research & Data': [
    { value: 'research/research', label: 'Research Assistant', labelZh: '研究助手' },
    { value: 'research/analyst', label: 'Data Analyst', labelZh: '資料分析師' },
    { value: 'research/scientist', label: 'Scientific Researcher', labelZh: '學術研究員' },
  ],
  'Writing & Comms': [
    { value: 'writing/writer', label: 'Content Writer', labelZh: '內容寫作' },
    { value: 'writing/techwriter', label: 'Technical Writer', labelZh: '技術文件寫作' },
    { value: 'writing/marketer', label: 'Marketing Strategist', labelZh: '行銷策略師' },
    { value: 'writing/meeting', label: 'Meeting Assistant', labelZh: '會議助手' },
    { value: 'writing/social', label: 'Social Media Manager', labelZh: '社群媒體管理' },
    { value: 'writing/support', label: 'Customer Support', labelZh: '客服專員' },
  ],
  'Ops & Security': [
    { value: 'ops/devops', label: 'DevOps Assistant', labelZh: 'DevOps 助手' },
    { value: 'ops/sentinel', label: 'Security Auditor', labelZh: '資安審計' },
    { value: 'ops/clawsmith', label: 'OpenClaw Config', labelZh: 'OpenClaw 設定' },
  ],
  'Learning & Productivity': [
    { value: 'learning/coach', label: 'Learning Coach', labelZh: '學習教練' },
    { value: 'learning/sage', label: 'Mentor', labelZh: '導師' },
    { value: 'learning/finance', label: 'Personal Finance Tracker', labelZh: '個人財務追蹤' },
  ],
}

const CAT_KEYS = {
  'Coding': 'catCoding',
  'Design & Product': 'catDesign',
  'Research & Data': 'catResearch',
  'Writing & Comms': 'catWriting',
  'Ops & Security': 'catOps',
  'Learning & Productivity': 'catLearning',
}

const TRANSLATIONS = {
  en: {
    agents: 'Agents',
    sessions: 'Sessions',
    noAgents: 'No agents found',
    active: 'Active',
    noSessions: 'No sessions',
    selectAgent: 'Select an agent to begin',
    selectSession: 'Select a session',
    loading: 'Loading…',
    noLogs: 'No logs found',
    today: 'Today',
    yesterday: 'Yesterday',
    tipAddAgent: 'Add agent',
    tipSwitchToClaude: 'Switch to Claude Code',
    tipSwitchToOC: 'Switch to OpenClaw',
    tipSearch: 'Search',
    tipThinking: 'Show thinking',
    tipMetrics: 'System metrics',
    tipCrons: 'Cron jobs',
    tipRefresh: 'Refresh',
    tipSettings: 'Settings',
    tipClose: 'Close',
    searchPlaceholder: 'Search messages…',
    settingsTitle: 'Settings',
    language: 'Language',
    ocPath: 'OpenClaw agents path',
    claudePath: 'Claude Code projects path',
    defaultLabel: 'Default:',
    cancel: 'Cancel',
    save: 'Save',
    newAgent: 'New Agent',
    agentId: 'Agent ID',
    agentName: 'Name',
    workspace: 'Workspace',
    model: 'Model',
    soulTemplate: 'Soul Template',
    optional: 'optional',
    categoryPlaceholder: '— Category —',
    agentPlaceholder: '— Select —',
    telegramGroupId: 'Telegram Group ID',
    create: 'Create',
    agentIdRequired: 'Agent ID is required',
    createFailed: 'Failed to create agent',
    namePlaceholder: 'Display name (defaults to ID)',
    catCoding: 'Coding',
    catDesign: 'Design & Product',
    catResearch: 'Research & Data',
    catWriting: 'Writing & Comms',
    catOps: 'Ops & Security',
    catLearning: 'Learning & Productivity',
    tabSessions: 'Sessions',
    tabMemory: 'Memory',
    tabStats: 'Stats',
    tabCrons: 'Crons',
    noMemoryFiles: 'No memory files',
    selectMemoryFile: 'Select a file',
    noStats: 'No usage data',
    inputTokens: 'Input',
    outputTokens: 'Output',
    cacheRead: 'Cache read',
    cacheWrite: 'Cache write',
    totalCost: 'Total cost',
    cronJobs: 'Cron Jobs',
    noCrons: 'No cron jobs found',
    noCronsForAgent: 'No cron jobs for this agent',
    selectCron: 'Select a cron job',
    cronLast: 'Last run',
    cronNext: 'Next run',
    cronDuration: 'Duration',
    cronError: 'Last error',
  },
  'zh-TW': {
    agents: '代理',
    sessions: '對話',
    noAgents: '找不到代理',
    active: '活躍',
    noSessions: '無對話',
    selectAgent: '選擇代理以開始',
    selectSession: '選擇對話',
    loading: '載入中…',
    noLogs: '找不到記錄',
    today: '今天',
    yesterday: '昨天',
    tipAddAgent: '新增代理',
    tipSwitchToClaude: '切換至 Claude Code',
    tipSwitchToOC: '切換至 OpenClaw',
    tipSearch: '搜尋',
    tipThinking: '顯示思考',
    tipMetrics: '系統指標',
    tipCrons: 'Cron 任務',
    tipRefresh: '重新整理',
    tipSettings: '設定',
    tipClose: '關閉',
    searchPlaceholder: '搜尋訊息…',
    settingsTitle: '設定',
    language: '語系',
    ocPath: 'OpenClaw 代理路徑',
    claudePath: 'Claude Code 專案路徑',
    defaultLabel: '預設：',
    cancel: '取消',
    save: '儲存',
    newAgent: '新增代理',
    agentId: '代理 ID',
    agentName: '名稱',
    workspace: '工作區',
    model: '模型',
    soulTemplate: '靈魂模板',
    optional: '可選',
    categoryPlaceholder: '— 類別 —',
    agentPlaceholder: '— 選擇 —',
    telegramGroupId: 'Telegram 群組 ID',
    create: '建立',
    agentIdRequired: '請輸入代理 ID',
    createFailed: '建立失敗',
    namePlaceholder: '顯示名稱（預設為 ID）',
    catCoding: '程式開發',
    catDesign: '設計與產品',
    catResearch: '研究與資料',
    catWriting: '寫作與溝通',
    catOps: '運維與安全',
    catLearning: '學習與生產力',
    tabSessions: '對話',
    tabMemory: 'Memory',
    tabStats: '統計',
    tabCrons: 'Crons',
    noMemoryFiles: '無 Memory 檔案',
    selectMemoryFile: '選擇檔案',
    noStats: '無使用資料',
    inputTokens: '輸入',
    outputTokens: '輸出',
    cacheRead: '快取讀取',
    cacheWrite: '快取寫入',
    totalCost: '總費用',
    cronJobs: 'Cron 任務',
    noCrons: '找不到 Cron 任務',
    noCronsForAgent: '此代理沒有 Cron 任務',
    selectCron: '選擇 Cron 任務',
    cronLast: '上次執行',
    cronNext: '下次執行',
    cronDuration: '執行時長',
    cronError: '最後錯誤',
  },
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const formatBytes = (bytes) => {
  if (!bytes) return '0'
  if (bytes >= 1073741824) return (bytes / 1073741824).toFixed(1) + ' GB'
  if (bytes >= 1048576) return (bytes / 1048576).toFixed(0) + ' MB'
  return (bytes / 1024).toFixed(0) + ' KB'
}

const fmtTokens = (n) => {
  if (!n) return '0'
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M'
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K'
  return n.toLocaleString()
}

const parseCronExpr = (expr) => {
  if (!expr) return '—'
  const map = {
    '* * * * *': 'Every minute',
    '*/5 * * * *': 'Every 5 min',
    '*/15 * * * *': 'Every 15 min',
    '*/30 * * * *': 'Every 30 min',
    '0 * * * *': 'Every hour',
    '0 0 * * *': 'Daily midnight',
    '0 7 * * *': 'Daily 7am',
    '0 9 * * *': 'Daily 9am',
    '0 12 * * *': 'Daily noon',
    '0 0 * * 0': 'Weekly (Sun)',
    '0 0 1 * *': 'Monthly',
  }
  return map[expr] || expr
}

function App() {
  const [agents, setAgents] = useState([])
  const [selectedAgent, setSelectedAgent] = useState(null)
  const [sessions, setSessions] = useState([])
  const [selectedSession, setSelectedSession] = useState(null)
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(false)
  const [showThinking, setShowThinking] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showAddAgent, setShowAddAgent] = useState(false)
  const [addAgentForm, setAddAgentForm] = useState({ id: '', name: '', workspace: '', model: 'minimax-portal/MiniMax-M2.5', telegramGroupId: '', soulCategory: '', soul: '' })
  const [addAgentError, setAddAgentError] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchMatchIndex, setSearchMatchIndex] = useState(0)
  const [language, setLanguage] = useState(() => localStorage.getItem('language') || 'en')
  const [langInput, setLangInput] = useState(language)
  const lang = TRANSLATIONS[language] || TRANSLATIONS.en

  // New feature state
  const [systemMetrics, setSystemMetrics] = useState(null)
  const [sessionTab, setSessionTab] = useState('sessions') // 'sessions' | 'memory' | 'crons'
  const [memoryFiles, setMemoryFiles] = useState([])
  const [selectedMemoryFile, setSelectedMemoryFile] = useState(null)
  const [memoryContent, setMemoryContent] = useState('')
  const [agentStatsMap, setAgentStatsMap] = useState({})
  const [selectedCron, setSelectedCron] = useState(null)
  const [crons, setCrons] = useState([])

  const searchInputRef = useRef(null)
  const logContainerRef = useRef(null)
  const savedScrollRef = useRef(0)
  const isRefreshRef = useRef(false)
  useEffect(() => { if (showSearch) searchInputRef.current?.focus() }, [showSearch])
  const closeSearch = () => { setShowSearch(false); setSearchQuery(''); setSearchMatchIndex(0) }

  // Count matches from DOM after render (avoids TDZ issue with getDisplayContent)
  const [searchMatchCount, setSearchMatchCount] = useState(0)
  useLayoutEffect(() => {
    if (!logContainerRef.current || !searchQuery.trim()) {
      setSearchMatchCount(0)
      setSearchMatchIndex(0)
      return
    }
    const count = logContainerRef.current.querySelectorAll('[data-search-match]').length
    setSearchMatchCount(count)
    setSearchMatchIndex(0)
  }, [searchQuery, logs, showThinking])

  // Scroll to current match after render
  useEffect(() => {
    if (!searchQuery.trim() || searchMatchCount === 0 || !logContainerRef.current) return
    const el = logContainerRef.current.querySelector(`[data-search-match="${searchMatchIndex}"]`)
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [searchMatchIndex, searchMatchCount, searchQuery])

  const goNextMatch = () => setSearchMatchIndex(i => (i + 1) % Math.max(searchMatchCount, 1))
  const goPrevMatch = () => setSearchMatchIndex(i => (i - 1 + Math.max(searchMatchCount, 1)) % Math.max(searchMatchCount, 1))
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

  const fetchLogs = async (agentId, sessionId, preserveScroll = false) => {
    if (preserveScroll && logContainerRef.current) {
      savedScrollRef.current = logContainerRef.current.scrollTop
    }
    isRefreshRef.current = preserveScroll
    if (!preserveScroll) setLoading(true)
    try {
      const res = await fetch(`${API}/api/agents/${agentId}/logs${buildQuery({ sessionId })}`)
      const data = await res.json()
      setLogs(data.logs)
    } catch (e) { setLogs([]) }
    if (!preserveScroll) setLoading(false)
  }

  const fetchSystemMetrics = async () => {
    try {
      const res = await fetch(`${API}/api/system/metrics`)
      setSystemMetrics(await res.json())
    } catch (e) {}
  }

  const fetchMemoryFiles = async (agentId) => {
    try {
      const res = await fetch(`${API}/api/agents/${agentId}/memory${buildQuery()}`)
      setMemoryFiles(await res.json())
    } catch (e) { setMemoryFiles([]) }
  }

  const fetchMemoryFile = async (agentId, filename) => {
    try {
      const res = await fetch(`${API}/api/agents/${agentId}/memory/${encodeURIComponent(filename)}${buildQuery()}`)
      const data = await res.json()
      setMemoryContent(data.content || '')
    } catch (e) { setMemoryContent('') }
  }

  const fetchAgentStats = async (agentId) => {
    try {
      const res = await fetch(`${API}/api/agents/${agentId}/stats${buildQuery()}`)
      const data = await res.json()
      setAgentStatsMap(prev => ({ ...prev, [agentId]: data }))
    } catch (e) {}
  }

  const fetchCrons = async () => {
    try {
      const res = await fetch(`${API}/api/crons`)
      setCrons(await res.json())
    } catch (e) { setCrons([]) }
  }

  useLayoutEffect(() => {
    if (isRefreshRef.current && logContainerRef.current) {
      logContainerRef.current.scrollTop = savedScrollRef.current
      isRefreshRef.current = false
    }
  }, [logs])

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
      setMemoryFiles([])
      setSelectedMemoryFile(null)
      setMemoryContent('')
      setSelectedCron(null)
      fetchSessions(selectedAgent)
      if (!agentStatsMap[selectedAgent]) fetchAgentStats(selectedAgent)
    }
  }, [selectedAgent])

  useEffect(() => {
    if (selectedAgent && selectedSession) fetchLogs(selectedAgent, selectedSession)
  }, [selectedSession])

  // Metrics polling — always on
  useEffect(() => {
    fetchSystemMetrics()
    const id = setInterval(fetchSystemMetrics, 5000)
    return () => clearInterval(id)
  }, [])

  // Fetch data when switching session tabs
  useEffect(() => {
    if (!selectedAgent) return
    if (sessionTab === 'memory') fetchMemoryFiles(selectedAgent)
    if (sessionTab === 'crons') fetchCrons()
  }, [sessionTab, selectedAgent])

  // Fetch memory file content when selected
  useEffect(() => {
    if (selectedAgent && selectedMemoryFile) fetchMemoryFile(selectedAgent, selectedMemoryFile)
  }, [selectedMemoryFile])

  const handleAgentIdChange = (value) => {
    setAddAgentForm(f => ({
      ...f,
      id: value,
      name: f.name || value,
      workspace: value ? `~/.openclaw/workspace-${value}` : '',
    }))
  }

  const handleCreateAgent = async () => {
    setAddAgentError('')
    if (!addAgentForm.id.trim()) { setAddAgentError(lang.agentIdRequired); return }
    try {
      const res = await fetch(`${API}/api/agents/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addAgentForm),
      })
      const data = await res.json()
      if (!res.ok) { setAddAgentError(data.error); return }
      setShowAddAgent(false)
      setAddAgentForm({ id: '', name: '', workspace: '', model: 'minimax-portal/MiniMax-M2.5', telegramGroupId: '', soulCategory: '', soul: '' })
      fetchAgents()
    } catch (e) {
      setAddAgentError(lang.createFailed)
    }
  }

  const handleRefresh = () => {
    fetchAgents()
    if (selectedAgent) fetchSessions(selectedAgent)
    if (selectedAgent && selectedSession) fetchLogs(selectedAgent, selectedSession, true)
  }

  const openSettings = () => {
    setPathInput(agentsPath)
    setClaudePathInput(claudePath)
    setLangInput(language)
    setShowSettings(true)
  }

  const saveSettings = () => {
    const trimmedAgents = pathInput.trim() || DEFAULT_PATH
    const trimmedClaude = claudePathInput.trim() || DEFAULT_CLAUDE_PATH
    setAgentsPath(trimmedAgents)
    setClaudePath(trimmedClaude)
    setLanguage(langInput)
    localStorage.setItem('agentsPath', trimmedAgents)
    localStorage.setItem('claudePath', trimmedClaude)
    localStorage.setItem('language', langInput)
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

  const formatDateSeparator = (ts) => {
    const d = new Date(ts)
    const now = new Date()
    const yesterday = new Date(now)
    yesterday.setDate(now.getDate() - 1)
    if (d.toDateString() === now.toDateString()) return lang.today
    if (d.toDateString() === yesterday.toDateString()) return lang.yesterday
    const locale = language === 'zh-TW' ? 'zh-TW' : 'en-US'
    return d.toLocaleDateString(locale, { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'Asia/Taipei' })
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

  const highlightText = (text, query, isActive = false) => {
    if (!query.trim()) return text
    const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'))
    return parts.map((part, i) =>
      part.toLowerCase() === query.toLowerCase()
        ? <mark key={i} className={`search-highlight${isActive ? ' search-highlight-active' : ''}`}>{part}</mark>
        : part
    )
  }

  const panelTitle = selectedAgent || 'Agent Monitor'

  return (
    <div className="app">
      {/* Traffic light zone */}
      <div className="traffic-zone" />

      {/* Toolbar */}
      <div className="titlebar">
        <div className="titlebar-agents" style={{ width: agentWidth }}>
          <span className="titlebar-label">{lang.agents}</span>
          <button className="icon-btn" onClick={() => { setAddAgentError(''); setShowAddAgent(true) }} data-tooltip={lang.tipAddAgent}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <line x1="19" y1="8" x2="19" y2="14"/>
              <line x1="16" y1="11" x2="22" y2="11"/>
            </svg>
          </button>
        </div>
        <div className="toolbar-divider" />
        {selectedAgent && (
          <>
            <div className="titlebar-sessions" style={{ width: sessionsWidth }}>
              <span className="titlebar-label">{lang.sessions}</span>
            </div>
            <div className="toolbar-divider" />
          </>
        )}
        <div className="titlebar-main">
          <span className="titlebar-title">{panelTitle}</span>
          <div className="titlebar-actions">
            <button
              className={`icon-btn source-${activeSource}`}
              onClick={toggleSource}
              data-tooltip={activeSource === 'openclaw' ? lang.tipSwitchToClaude : lang.tipSwitchToOC}
            >
              {activeSource === 'openclaw' ? (
                <svg width="18" height="18" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="7" cy="8.5" r="4.2"/>
                  <circle cx="5.2" cy="8.3" r="0.7" fill="currentColor" stroke="none"/>
                  <circle cx="8.8" cy="8.3" r="0.7" fill="currentColor" stroke="none"/>
                  <line x1="7" y1="4.3" x2="7" y2="2.8"/>
                  <circle cx="7" cy="2.2" r="0.7" fill="currentColor" stroke="none"/>
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
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
              data-tooltip={lang.tipSearch}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            </button>
            <button
              className={`icon-btn${showThinking ? ' active' : ''}`}
              onClick={() => setShowThinking(v => !v)}
              data-tooltip={lang.tipThinking}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21h6"/><path d="M10 17h4"/>
                <path d="M12 2a7 7 0 0 1 7 7c0 2.6-1.4 4.9-3.5 6.2V17H8.5v-1.8A7 7 0 0 1 5 9a7 7 0 0 1 7-7z"/>
              </svg>
            </button>
            <button className="icon-btn" onClick={handleRefresh} data-tooltip={lang.tipRefresh}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 4 23 10 17 10"/>
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
              </svg>
            </button>
            <button className="icon-btn" onClick={openSettings} data-tooltip={lang.tipSettings}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Floating search overlay */}
      {showSearch && (
        <div className="search-overlay">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="search-overlay-icon">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            ref={searchInputRef}
            className="search-overlay-input"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Escape') closeSearch()
              else if (e.key === 'Enter' && e.shiftKey) goPrevMatch()
              else if (e.key === 'Enter') goNextMatch()
            }}
            placeholder={lang.searchPlaceholder}
          />
          {searchQuery.trim() && (
            <span className="search-overlay-count">
              {searchMatchCount === 0 ? '0/0' : `${searchMatchIndex + 1}/${searchMatchCount}`}
            </span>
          )}
          <button className="search-nav-btn" onClick={goPrevMatch} disabled={searchMatchCount === 0} data-tooltip="Previous">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="18 15 12 9 6 15"/>
            </svg>
          </button>
          <button className="search-nav-btn" onClick={goNextMatch} disabled={searchMatchCount === 0} data-tooltip="Next">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>
          <button className="search-nav-btn" onClick={closeSearch}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      )}

      {/* Content body */}
      <div className="content-body">
        {/* Agents sidebar */}
        <aside className="sidebar" style={{ width: agentWidth }}>
          <div className="agent-list">
            {agents.length === 0 ? (
              <div className="empty-hint">{lang.noAgents}</div>
            ) : agents.map(agent => (
              <div
                key={agent.id}
                className={`agent-item ${selectedAgent === agent.id ? 'active' : ''}`}
                onClick={() => setSelectedAgent(agent.id)}
              >
                <div className="agent-avatar" style={{ background: getAvatarColor(agent.id) }}>
                  {agent.id.charAt(0).toUpperCase()}
                  {agent.hasSessions && <span className="agent-dot" />}
                </div>
                <div className="agent-info">
                  <div className="agent-name">{agent.id}</div>
                  <div className="agent-status">{agent.hasSessions ? lang.active : lang.noSessions}</div>
                  {agentStatsMap[agent.id] && agentStatsMap[agent.id].totals && (agentStatsMap[agent.id].totals.input > 0 || agentStatsMap[agent.id].totals.output > 0) && (
                    <div className="agent-tokens">↑{fmtTokens(agentStatsMap[agent.id].totals.input)} ↓{fmtTokens(agentStatsMap[agent.id].totals.output)}</div>
                  )}
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
            {/* Tab bar */}
            <div className="session-tabs">
              <button
                className={`session-tab${sessionTab === 'sessions' ? ' active' : ''}`}
                onClick={() => setSessionTab('sessions')}
              >{lang.tabSessions}</button>
              <button
                className={`session-tab${sessionTab === 'memory' ? ' active' : ''}`}
                onClick={() => setSessionTab('memory')}
              >{lang.tabMemory}</button>
              <button
                className={`session-tab${sessionTab === 'crons' ? ' active' : ''}`}
                onClick={() => setSessionTab('crons')}
              >{lang.tabCrons}</button>
            </div>

            {/* Sessions list */}
            {sessionTab === 'sessions' && (
              <div className="sessions-list">
                {sessions.length === 0 ? (
                  <div className="empty-hint">{lang.noSessions}</div>
                ) : sessions.map(session => {
                  const { date, time } = formatSessionDate(session.lastModified)
                  const statsForAgent = agentStatsMap[selectedAgent]
                  const sessionStats = statsForAgent?.sessions?.find(s => s.sessionId === session.id)
                  return (
                    <div
                      key={session.id}
                      className={`session-item ${selectedSession === session.id ? 'active' : ''}`}
                      onClick={() => setSelectedSession(session.id)}
                    >
                      <div className="session-date">{date} {time}</div>
                      <div className="session-id">{session.id.substring(0, 8)}</div>
                      {sessionStats && (
                        <div className="session-tokens">↑{fmtTokens(sessionStats.input)} ↓{fmtTokens(sessionStats.output)}</div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {/* Memory files list */}
            {sessionTab === 'memory' && (
              <div className="sessions-list">
                {memoryFiles.length === 0 ? (
                  <div className="empty-hint">{lang.noMemoryFiles}</div>
                ) : memoryFiles.map(file => (
                  <div
                    key={file.name}
                    className={`session-item ${selectedMemoryFile === file.name ? 'active' : ''}`}
                    onClick={() => setSelectedMemoryFile(file.name)}
                  >
                    <div className="session-date">{file.name}</div>
                    <div className="session-time">{formatBytes(file.size)}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Crons list */}
            {sessionTab === 'crons' && (
              <div className="sessions-list">
                {(() => {
                  const agentCrons = crons.filter(c => c.agentId === selectedAgent)
                  if (agentCrons.length === 0) return <div className="empty-hint">{lang.noCronsForAgent}</div>
                  return agentCrons.map(job => (
                    <div
                      key={job.id}
                      className={`session-item ${selectedCron?.id === job.id ? 'active' : ''}`}
                      onClick={() => setSelectedCron(job)}
                    >
                      <div className="session-date">{job.name || job.id}</div>
                      <div className="session-id">{parseCronExpr(job.schedule?.expr)}</div>
                      <div className={`session-cron-status cron-status-${job.state?.lastStatus || 'unknown'}`}>
                        {job.state?.lastStatus || '—'}
                      </div>
                    </div>
                  ))
                })()}
              </div>
            )}

          </aside>
          <div className="resize-handle" onMouseDown={startResize('sessions')} />
          </>
        )}

        {/* Log panel */}
        <main className="main-panel">
          <div className="log-content" ref={logContainerRef}>
            {!selectedAgent ? (
              <div className="empty-hint centered">{lang.selectAgent}</div>

            ) : sessionTab === 'memory' ? (
              selectedMemoryFile ? (
                <div className="memory-view">
                  <div className="memory-filename">{selectedMemoryFile}</div>
                  <pre className="memory-text">{memoryContent}</pre>
                </div>
              ) : (
                <div className="empty-hint centered">{lang.selectMemoryFile}</div>
              )

            ) : sessionTab === 'crons' ? (
              !selectedCron ? (
                <div className="empty-hint centered">{lang.selectCron}</div>
              ) : (
                <div className="cron-detail-view">
                  <div className="cron-detail-header">
                    <div className="cron-detail-name">{selectedCron.name || selectedCron.id}</div>
                    <span className={`cron-status cron-status-${selectedCron.state?.lastStatus || 'unknown'}`}>
                      {selectedCron.state?.lastStatus || '—'}
                    </span>
                  </div>
                  <div className="cron-detail-grid">
                    <div className="cron-detail-row">
                      <span className="cron-detail-label">ID</span>
                      <span className="cron-detail-value cron-detail-mono">{selectedCron.id}</span>
                    </div>
                    <div className="cron-detail-row">
                      <span className="cron-detail-label">Schedule</span>
                      <span className="cron-detail-value">{parseCronExpr(selectedCron.schedule?.expr)} <span className="cron-detail-mono cron-detail-dim">({selectedCron.schedule?.expr})</span></span>
                    </div>
                    <div className="cron-detail-row">
                      <span className="cron-detail-label">Agent</span>
                      <span className="cron-detail-value">{selectedCron.agentId}</span>
                    </div>
                    {selectedCron.state?.lastRunAtMs && (
                      <div className="cron-detail-row">
                        <span className="cron-detail-label">{lang.cronLast}</span>
                        <span className="cron-detail-value">
                          {new Date(selectedCron.state.lastRunAtMs).toLocaleString()}
                          {selectedCron.state.lastDurationMs ? <span className="cron-detail-dim"> · {(selectedCron.state.lastDurationMs / 1000).toFixed(1)}s</span> : ''}
                        </span>
                      </div>
                    )}
                    {selectedCron.state?.nextRunAtMs && (
                      <div className="cron-detail-row">
                        <span className="cron-detail-label">{lang.cronNext}</span>
                        <span className="cron-detail-value">{new Date(selectedCron.state.nextRunAtMs).toLocaleString()}</span>
                      </div>
                    )}
                    {selectedCron.state?.lastError && selectedCron.state?.lastStatus === 'error' && (
                      <div className="cron-detail-row cron-detail-error-row">
                        <span className="cron-detail-label">{lang.cronError}</span>
                        <span className="cron-detail-value cron-detail-error">{selectedCron.state.lastError}</span>
                      </div>
                    )}
                  </div>
                </div>
              )

            ) : !selectedSession ? (
              <div className="empty-hint centered">{lang.selectSession}</div>
            ) : loading ? (
              <div className="empty-hint centered">{lang.loading}</div>
            ) : logs.length === 0 ? (
              <div className="empty-hint centered">{lang.noLogs}</div>
            ) : (
              <div className="log-entries">
                {(() => {
                  const q = searchQuery.trim().toLowerCase()
                  const allEntries = []
                  for (const log of logs) {
                    const { content, thinkingContent, role } = getDisplayContent(log)
                    if (role !== 'user' && role !== 'assistant') continue

                    let displayContent = content
                    if (role === 'user') {
                      const match = content.match(/\n\n\[.+\]\s*(.+)$/s)
                      if (match) {
                        displayContent = match[1].trim()
                      } else if (content.includes('```')) {
                        const parts = content.split('```')
                        const lastPart = parts[parts.length - 1].trim()
                        if (lastPart) displayContent = lastPart
                      }
                    }

                    const hasText = displayContent && displayContent.trim() !== ''
                    const hasThinking = showThinking && thinkingContent
                    if (!hasText && !hasThinking) continue

                    allEntries.push({ log, role, displayContent, thinkingContent, hasText, hasThinking })
                  }

                  const items = []
                  let lastDateStr = null
                  let matchNum = -1
                  allEntries.forEach((entry, i) => {
                    const prev = allEntries[i - 1]
                    const next = allEntries[i + 1]
                    const isFirst = !prev || prev.role !== entry.role
                    const isLast = !next || next.role !== entry.role || !!entry.hasThinking

                    const ts = entry.log.timestamp || entry.log.time || entry.log.createdAt
                    if (ts) {
                      const dateStr = new Date(ts).toDateString()
                      if (dateStr !== lastDateStr) {
                        items.push({ type: 'date', ts, key: `date-${i}` })
                        lastDateStr = dateStr
                      }
                    }

                    let entryMatchNum = null
                    if (q) {
                      const inText = entry.hasText && entry.displayContent.toLowerCase().includes(q)
                      const inThink = entry.hasThinking && entry.thinkingContent.toLowerCase().includes(q)
                      if (inText || inThink) { matchNum++; entryMatchNum = matchNum }
                    }
                    items.push({ type: 'msg', ...entry, isFirst, isLast, key: i, matchNum: entryMatchNum })
                  })

                  return items.map(item => {
                    if (item.type === 'date') {
                      return (
                        <div key={item.key} className="date-separator">
                          <span>{formatDateSeparator(item.ts)}</span>
                        </div>
                      )
                    }

                    const { log, role, displayContent, thinkingContent, hasText, hasThinking, isFirst, isLast, matchNum: mn } = item
                    const isActive = mn !== null && mn === searchMatchIndex
                    const bubbleClass = isFirst && isLast ? '' : isFirst ? ' bubble-first' : isLast ? ' bubble-last' : ' bubble-mid'
                    const matchAttr = mn !== null ? { 'data-search-match': mn } : {}
                    return (
                      <div key={item.key} className={`log-entry log-${role}${isLast ? '' : ' tight'}`}>
                        {hasText && (
                          <div className={`log-message-bubble${bubbleClass}`} {...matchAttr}>
                            <div className="bubble-text">{highlightText(displayContent, searchQuery, isActive)}</div>
                          </div>
                        )}
                        {isLast && hasText && formatTime(log.timestamp) && (
                          <div className="bubble-time">{formatTime(log.timestamp)}</div>
                        )}
                        {hasThinking && (
                          <>
                            <div className="log-meta log-meta-thinking">
                              <span className="log-role">thinking</span>
                            </div>
                            <div className="log-message-bubble log-thinking">
                              <div className="bubble-text">{highlightText(thinkingContent, searchQuery, isActive)}</div>
                            </div>
                          </>
                        )}
                      </div>
                    )
                  })
                })()}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* System metrics bar — always visible at bottom */}
      <div className="metrics-bar">
        {systemMetrics ? (
          <>
            <div className="metric-item">
              <span className="metric-label">CPU</span>
              <div className="metric-track">
                <div className="metric-fill" style={{ width: `${systemMetrics.cpu.percent}%`, background: systemMetrics.cpu.percent > 80 ? '#ff453a' : systemMetrics.cpu.percent > 60 ? '#ff9f0a' : '#32d74b' }} />
              </div>
              <span className="metric-val">{systemMetrics.cpu.percent}%</span>
            </div>
            <div className="metric-sep" />
            <div className="metric-item">
              <span className="metric-label">RAM</span>
              <div className="metric-track">
                <div className="metric-fill" style={{ width: `${systemMetrics.ram.percent}%`, background: systemMetrics.ram.percent > 85 ? '#ff453a' : systemMetrics.ram.percent > 70 ? '#ff9f0a' : '#0a84ff' }} />
              </div>
              <span className="metric-val">{formatBytes(systemMetrics.ram.used)} / {formatBytes(systemMetrics.ram.total)}</span>
            </div>
            {systemMetrics.disk && (
              <>
                <div className="metric-sep" />
                <div className="metric-item">
                  <span className="metric-label">Disk</span>
                  <div className="metric-track">
                    <div className="metric-fill" style={{ width: `${systemMetrics.disk.percent}%`, background: systemMetrics.disk.percent > 90 ? '#ff453a' : '#9b6ee8' }} />
                  </div>
                  <span className="metric-val">{formatBytes(systemMetrics.disk.used)} / {formatBytes(systemMetrics.disk.total)}</span>
                </div>
              </>
            )}
          </>
        ) : (
          <span className="metric-label">{lang.loading}</span>
        )}
      </div>

      {/* Settings modal */}
      {showSettings && (
        <div className="settings-overlay" onClick={() => setShowSettings(false)}>
          <div className="settings-panel" onClick={e => e.stopPropagation()}>
            <h3>{lang.settingsTitle}</h3>
            <div className="settings-field">
              <label>{lang.language}</label>
              <select value={langInput} onChange={e => setLangInput(e.target.value)}>
                <option value="en">English</option>
                <option value="zh-TW">繁體中文</option>
              </select>
            </div>
            <div className="settings-field">
              <label>{lang.ocPath}</label>
              <input
                type="text"
                value={pathInput}
                onChange={e => setPathInput(e.target.value)}
                placeholder={DEFAULT_PATH}
                spellCheck={false}
              />
              <div className="settings-hint">{lang.defaultLabel} {DEFAULT_PATH}</div>
            </div>
            <div className="settings-field">
              <label>{lang.claudePath}</label>
              <input
                type="text"
                value={claudePathInput}
                onChange={e => setClaudePathInput(e.target.value)}
                placeholder={DEFAULT_CLAUDE_PATH}
                spellCheck={false}
              />
              <div className="settings-hint">{lang.defaultLabel} {DEFAULT_CLAUDE_PATH}</div>
            </div>
            <div className="settings-actions">
              <button className="settings-cancel" onClick={() => setShowSettings(false)}>{lang.cancel}</button>
              <button className="settings-save" onClick={saveSettings}>{lang.save}</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Agent modal */}
      {showAddAgent && (
        <div className="settings-overlay" onClick={() => setShowAddAgent(false)}>
          <div className="settings-panel" onClick={e => e.stopPropagation()}>
            <h3>{lang.newAgent}</h3>
            <div className="settings-field">
              <label>{lang.agentId} *</label>
              <input
                type="text"
                value={addAgentForm.id}
                onChange={e => handleAgentIdChange(e.target.value)}
                placeholder="e.g. researcher"
                spellCheck={false}
                autoFocus
              />
            </div>
            <div className="settings-field">
              <label>{lang.agentName}</label>
              <input
                type="text"
                value={addAgentForm.name}
                onChange={e => setAddAgentForm(f => ({ ...f, name: e.target.value }))}
                placeholder={lang.namePlaceholder}
                spellCheck={false}
              />
            </div>
            <div className="settings-field">
              <label>{lang.workspace}</label>
              <input
                type="text"
                value={addAgentForm.workspace}
                onChange={e => setAddAgentForm(f => ({ ...f, workspace: e.target.value }))}
                placeholder={`~/.openclaw/workspace-${addAgentForm.id || 'id'}`}
                spellCheck={false}
              />
            </div>
            <div className="settings-field">
              <label>{lang.model}</label>
              <input
                type="text"
                value={addAgentForm.model}
                onChange={e => setAddAgentForm(f => ({ ...f, model: e.target.value }))}
                spellCheck={false}
              />
            </div>
            <div className="settings-field">
              <label>{lang.soulTemplate} <span style={{ opacity: 0.4 }}>({lang.optional})</span></label>
              <select
                value={addAgentForm.soulCategory}
                onChange={e => setAddAgentForm(f => ({ ...f, soulCategory: e.target.value, soul: '' }))}
              >
                <option value="">{lang.categoryPlaceholder}</option>
                {Object.keys(SOUL_OPTIONS).map(cat => (
                  <option key={cat} value={cat}>{lang[CAT_KEYS[cat]] || cat}</option>
                ))}
              </select>
            </div>
            {addAgentForm.soulCategory && (
              <div className="settings-field">
                <select
                  value={addAgentForm.soul}
                  onChange={e => setAddAgentForm(f => ({ ...f, soul: e.target.value }))}
                >
                  <option value="">{lang.agentPlaceholder}</option>
                  {SOUL_OPTIONS[addAgentForm.soulCategory].map(opt => (
                    <option key={opt.value} value={opt.value}>
                      {language === 'zh-TW' ? opt.labelZh : opt.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="settings-field">
              <label>{lang.telegramGroupId} <span style={{ opacity: 0.4 }}>({lang.optional})</span></label>
              <input
                type="text"
                value={addAgentForm.telegramGroupId}
                onChange={e => setAddAgentForm(f => ({ ...f, telegramGroupId: e.target.value }))}
                placeholder="-100xxxxxxxxxx"
                spellCheck={false}
              />
            </div>
            {addAgentError && <div className="add-agent-error">{addAgentError}</div>}
            <div className="settings-actions">
              <button className="settings-cancel" onClick={() => setShowAddAgent(false)}>{lang.cancel}</button>
              <button className="settings-save" onClick={handleCreateAgent}>{lang.create}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
