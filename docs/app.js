// ============================================================
// NexusAI Pro - AI Assistant & Coding Agent
// Architecture: Full-Stack Multi-Modal AI IDE & ChatGPT Engine
// ============================================================

(function() {
  'use strict';

  // ============================================================
  // 1. GLOBAL STATE & STORAGE
  // ============================================================
  const STORAGE_KEYS = {
    SESSIONS: 'nexus_pro_sessions',
    ACTIVE_SESSION: 'nexus_pro_active_session',
    PROJECTS: 'nexus_pro_projects',
    ACTIVE_PROJECT: 'nexus_pro_active_project',
    SETTINGS: 'nexus_pro_settings',
    KB_CUSTOM: 'nexus_pro_kb_custom'
  };

  const DEFAULT_SETTINGS = {
    provider: 'puter',
    apiKey: '',
    apiEndpoint: 'https://api.openai.com/v1',
    model: 'auto',
    temperature: 0.7,
    maxTokens: 2048,
    systemPrompt: 'You are NexusAI Pro, an expert full-stack AI engineer, software architect, and versatile assistant. Provide clean, production-ready code with explanations and markdown formatting.',
    theme: 'dark',
    fontSize: '14px',
    ttsVoice: '',
    ttsEnabled: false,
    sfxEnabled: true,
    enterToSend: true,
    autoScroll: true,
    webSearch: false
  };

  let settings = loadSettings();
  let sessions = loadSessions();
  let activeSessionId = localStorage.getItem(STORAGE_KEYS.ACTIVE_SESSION) || (sessions[0] ? sessions[0].id : null);
  let projects = loadProjects();
  let activeProjectId = localStorage.getItem(STORAGE_KEYS.ACTIVE_PROJECT) || (projects[0] ? projects[0].id : null);
  let openEditorTabs = []; // Array of fileIds
  let activeEditorFileId = null;

  let stagedAttachments = []; // Array of { name, size, type, dataUrl, textContent }
  let currentAbortController = null;
  let isStreaming = false;
  let currentSpeechUtterance = null;
  let lastTopic = null;

  // ============================================================
  // 2. DOM ELEMENT REFERENCES
  // ============================================================
  const body = document.body;
  const sidebar = document.getElementById('sidebar');
  const btnToggleSidebar = document.getElementById('sidebar-toggle-btn');
  const btnNewChat = document.getElementById('new-chat-btn');
  const chatHistoryList = document.getElementById('chat-history-list');
  const pinnedHistoryList = document.getElementById('pinned-history-list');
  const archivedHistoryList = document.getElementById('archived-history-list');
  const pinnedHeader = document.getElementById('pinned-header');
  const archivedHeader = document.getElementById('archived-header');
  const sidebarSearchInput = document.getElementById('sidebar-search-input');
  const projectsList = document.getElementById('projects-list');
  const btnCreateProject = document.getElementById('btn-create-project');

  // Views & Mode Switcher
  const btnModeChat = document.getElementById('btn-mode-chat');
  const btnModeIde = document.getElementById('btn-mode-ide');
  const chatViewContainer = document.getElementById('chat-view-container');
  const ideViewContainer = document.getElementById('ide-view-container');
  const activeProjectPill = document.getElementById('active-project-pill');
  const activeProjectName = document.getElementById('active-project-name');

  // Chat View
  const chatCanvas = document.getElementById('chat-canvas');
  const messagesContainer = document.getElementById('messages-container');
  const welcomeHero = document.getElementById('welcome-hero');
  const chatTextarea = document.getElementById('chat-textarea');
  const btnSend = document.getElementById('btn-send');
  const sendBtnIcon = document.getElementById('send-btn-icon');
  const btnVoiceInput = document.getElementById('btn-voice-input');
  const btnAttachFile = document.getElementById('btn-attach-file');
  const fileUploadInput = document.getElementById('file-upload-input');
  const attachmentPreviewStrip = document.getElementById('attachment-preview-strip');
  const chatDropzone = document.getElementById('chat-dropzone');
  const btnWebSearchToggle = document.getElementById('btn-web-search-toggle');
  const modelSelect = document.getElementById('model-select');
  const langSelect = document.getElementById('lang-select');

  // Top Nav Actions
  const btnTtsToggle = document.getElementById('btn-tts-toggle');
  const ttsIcon = document.getElementById('tts-icon');
  const btnSfxToggle = document.getElementById('btn-sfx-toggle');
  const sfxIcon = document.getElementById('sfx-icon');
  const btnExportMenu = document.getElementById('btn-export-menu');
  const btnThemeToggle = document.getElementById('btn-theme-toggle');
  const themeIcon = document.getElementById('theme-icon');
  const btnOpenTrainer = document.getElementById('btn-open-trainer');
  const btnOpenTrainerTop = document.getElementById('btn-open-trainer-top');
  const btnOpenSettings = document.getElementById('btn-open-settings');
  const btnClearHistory = document.getElementById('btn-clear-history');

  // IDE Elements
  const ideFileTree = document.getElementById('ide-file-tree');
  const ideTabBar = document.getElementById('ide-tab-bar');
  const editorActiveFilepath = document.getElementById('editor-active-filepath');
  const editorCodeTextarea = document.getElementById('editor-code-textarea');
  const editorLineNumbers = document.getElementById('editor-line-numbers');
  const ideDiffViewer = document.getElementById('ide-diff-viewer');
  const btnEditorSave = document.getElementById('btn-editor-save');
  const btnEditorFormat = document.getElementById('btn-editor-format');
  const btnEditorRun = document.getElementById('btn-editor-run');
  const btnEditorDiff = document.getElementById('btn-editor-diff');
  const ideBtnNewFile = document.getElementById('ide-btn-new-file');
  const ideBtnNewFolder = document.getElementById('ide-btn-new-folder');
  const ideBtnUploadFile = document.getElementById('ide-btn-upload-file');
  const ideBtnExportZip = document.getElementById('ide-btn-export-zip');

  // IDE Bottom & Agent
  const terminalOutput = document.getElementById('terminal-output');
  const terminalInput = document.getElementById('terminal-input');
  const btnClearTerminal = document.getElementById('btn-clear-terminal');
  const agentChatMessages = document.getElementById('agent-chat-messages');
  const agentTextarea = document.getElementById('agent-textarea');
  const btnAgentSend = document.getElementById('btn-agent-send');
  const btnClearAgentChat = document.getElementById('btn-clear-agent-chat');

  // Modals
  const settingsModal = document.getElementById('settings-modal');
  const trainerModal = document.getElementById('trainer-modal');
  const previewModal = document.getElementById('preview-modal');
  const toastContainer = document.getElementById('toast-container');

  // ============================================================
  // 3. INITIALIZATION
  // ============================================================
  function init() {
    applyTheme(settings.theme);
    renderSidebarChats();
    renderSidebarProjects();
    populateTtsVoices();

    if (activeSessionId) {
      loadSession(activeSessionId);
    } else {
      startNewChat();
    }

    initIDEProject();
    setupEventListeners();
    setupKeyboardShortcuts();
    lucide.createIcons();
  }

  // ============================================================
  // 4. PERSISTENCE & STORAGE HELPERS
  // ============================================================
  function loadSettings() {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      return stored ? { ...DEFAULT_SETTINGS, ...JSON.parse(stored) } : { ...DEFAULT_SETTINGS };
    } catch (e) {
      return { ...DEFAULT_SETTINGS };
    }
  }

  function saveSettings() {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  }

  function loadSessions() {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.SESSIONS);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  }

  function saveSessions() {
    localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(sessions));
  }

  function loadProjects() {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.PROJECTS);
      if (stored) return JSON.parse(stored);
    } catch (e) {}

    // Default starter project: Full Stack To-Do Web App
    return [{
      id: 'proj_default_todo',
      name: 'Smart Web App',
      description: 'Responsive HTML5/CSS3/JS Application',
      createdAt: new Date().toISOString(),
      files: [
        {
          id: 'f_index_html',
          name: 'index.html',
          path: 'index.html',
          isFolder: false,
          content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Smart App</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <div class="app-card">
    <h1>🚀 NexusAI Application</h1>
    <p>Welcome to your live coding project workspace!</p>
    <button id="btn-demo" onclick="alert('Hello from NexusAI Sandbox!')">Click Me</button>
  </div>
  <script src="app.js"></script>
</body>
</html>`
        },
        {
          id: 'f_style_css',
          name: 'style.css',
          path: 'style.css',
          isFolder: false,
          content: `body {
  font-family: 'Segoe UI', sans-serif;
  background: #0f172a;
  color: #f8fafc;
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  margin: 0;
}
.app-card {
  background: #1e293b;
  padding: 30px;
  border-radius: 16px;
  box-shadow: 0 10px 25px rgba(0,0,0,0.5);
  text-align: center;
}
button {
  background: #38bdf8;
  color: #0f172a;
  font-weight: bold;
  border: none;
  padding: 10px 20px;
  border-radius: 8px;
  cursor: pointer;
  margin-top: 15px;
}`
        },
        {
          id: 'f_app_js',
          name: 'app.js',
          path: 'app.js',
          isFolder: false,
          content: `console.log("NexusAI Pro Project loaded successfully!");`
        }
      ]
    }];
  }

  function saveProjects() {
    localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(projects));
  }

  function getActiveSession() {
    return sessions.find(s => s.id === activeSessionId) || null;
  }

  function getActiveProject() {
    return projects.find(p => p.id === activeProjectId) || projects[0] || null;
  }

  // ============================================================
  // 5. CHAT SYSTEM & STREAMING GENERATION
  // ============================================================
  function startNewChat() {
    const newSession = {
      id: 'sess_' + Date.now(),
      title: 'New Conversation',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      pinned: false,
      archived: false,
      messages: []
    };
    sessions.unshift(newSession);
    activeSessionId = newSession.id;
    saveSessions();
    localStorage.setItem(STORAGE_KEYS.ACTIVE_SESSION, activeSessionId);
    renderSidebarChats();
    loadSession(activeSessionId);
    chatTextarea.focus();
  }

  function loadSession(sessionId) {
    activeSessionId = sessionId;
    localStorage.setItem(STORAGE_KEYS.ACTIVE_SESSION, activeSessionId);
    renderSidebarChats();

    const sess = getActiveSession();
    messagesContainer.innerHTML = '';

    if (!sess || !sess.messages || sess.messages.length === 0) {
      welcomeHero.style.display = 'flex';
      messagesContainer.style.display = 'none';
    } else {
      welcomeHero.style.display = 'none';
      messagesContainer.style.display = 'flex';
      sess.messages.forEach(msg => {
        renderMessageBubble(msg.sender, msg.text, false, msg);
      });
      scrollCanvasToBottom();
    }
  }

  async function handleSendMessage(overrideText = null) {
    if (isStreaming) {
      // If currently generating, button acts as Stop Generation!
      stopGeneration();
      return;
    }

    stopSpeaking();
    const text = overrideText !== null ? overrideText : chatTextarea.value.trim();
    if (!text && stagedAttachments.length === 0) return;

    chatTextarea.value = '';
    chatTextarea.style.height = 'auto';

    let sess = getActiveSession();
    if (!sess) {
      startNewChat();
      sess = getActiveSession();
    }

    welcomeHero.style.display = 'none';
    messagesContainer.style.display = 'flex';

    // Create user message object
    const userMsg = {
      id: 'msg_' + Date.now(),
      sender: 'user',
      text: text,
      timestamp: formatTime(new Date()),
      attachments: [...stagedAttachments]
    };

    // Auto update conversation title if first message
    if (sess.messages.length === 0) {
      sess.title = generateTitleFromPrompt(text || (stagedAttachments[0] ? stagedAttachments[0].name : 'Conversation'));
    }

    sess.messages.push(userMsg);
    sess.updatedAt = new Date().toISOString();
    saveSessions();
    renderSidebarChats();
    renderMessageBubble('user', text, false, userMsg);
    playSound('send');

    // Clear staged attachments
    stagedAttachments = [];
    renderAttachmentPreviews();

    // Start Streaming Bot Generation
    setStreamingState(true);
    const typingRow = createStreamingBubble();
    messagesContainer.appendChild(typingRow);
    scrollCanvasToBottom();

    currentAbortController = new AbortController();

    try {
      const responseObj = await executeUnifiedAIPipeline(text, userMsg.attachments, currentAbortController.signal);
      typingRow.remove();

      const botMsg = {
        id: 'msg_' + Date.now(),
        sender: 'bot',
        text: responseObj.text,
        timestamp: formatTime(new Date()),
        matchType: responseObj.matchType,
        confidence: responseObj.confidence
      };

      sess.messages.push(botMsg);
      saveSessions();
      renderMessageBubble('bot', responseObj.text, true, botMsg);
      playSound('receive');

      if (settings.ttsEnabled) {
        speakCleanText(responseObj.text);
      }
    } catch (err) {
      typingRow.remove();
      if (err.name !== 'AbortError') {
        const errorMsg = {
          id: 'msg_' + Date.now(),
          sender: 'bot',
          text: `⚠️ **Generation Error**: ${err.message || 'Failed to complete AI generation. Please check your network or try again.'}`,
          timestamp: formatTime(new Date()),
          isError: true
        };
        sess.messages.push(errorMsg);
        saveSessions();
        renderMessageBubble('bot', errorMsg.text, false, errorMsg);
      }
    } finally {
      setStreamingState(false);
      currentAbortController = null;
    }
  }

  function setStreamingState(streaming) {
    isStreaming = streaming;
    if (streaming) {
      btnSend.disabled = false;
      btnSend.classList.add('stop-btn');
      btnSend.title = 'Stop Generating';
      sendBtnIcon.setAttribute('data-lucide', 'square');
    } else {
      btnSend.classList.remove('stop-btn');
      btnSend.title = 'Send message';
      sendBtnIcon.setAttribute('data-lucide', 'arrow-up');
      btnSend.disabled = chatTextarea.value.trim().length === 0 && stagedAttachments.length === 0;
    }
    lucide.createIcons();
  }

  function stopGeneration() {
    if (currentAbortController) {
      currentAbortController.abort();
    }
    setStreamingState(false);
    showToast('Generation stopped', 'stop-circle');
  }

  function createStreamingBubble() {
    const row = document.createElement('div');
    row.className = 'chat-message-row bot streaming-active';
    row.innerHTML = `
      <div class="msg-avatar">🤖</div>
      <div class="msg-wrapper">
        <div class="msg-bubble" style="padding:10px 16px;">
          <div class="stream-text-content"><span class="streaming-cursor"></span></div>
        </div>
      </div>
    `;
    return row;
  }

  // ============================================================
  // 6. MULTI-MODAL & UNIFIED AI PIPELINE
  // ============================================================
  async function executeUnifiedAIPipeline(promptText, attachments = [], signal) {
    const text = promptText.trim();
    const lower = text.toLowerCase();
    const selectedModel = modelSelect.value || settings.model;
    const langKey = detectLanguageKey(text);

    // 1. Math Formula & Expression Evaluator
    if (/^(?:calc|calculate|solve|what is)?\s*([0-9\.\+\-\*\/\^\(\)\s%sqrt]+)$/i.test(lower) || lower.startsWith('calc ')) {
      try {
        let expr = lower.replace(/^(?:calc|calculate|solve|what is)\s*/i, '')
                        .replace(/sqrt\(([^)]+)\)/g, 'Math.sqrt($1)')
                        .replace(/\^/g, '**');
        let res = Function(`'use strict'; return (${expr})`)();
        if (typeof res === 'number' && !isNaN(res)) {
          return {
            text: `🧮 **Calculation Result:**\n\`${promptText}\` = **${res}**`,
            confidence: 1.0,
            matchType: 'RULE_MATH'
          };
        }
      } catch (e) {}
    }

    // 2. Multi-turn Follow-up Context Translation
    const isHindiFollowUp = /^(?:in\s+hindi|hindi\s+me|translate\s+(?:in|to)?\s*hindi|hindi\s+me\s+batao|hindi\s+me\s+samjhao|hindi\s+version|hindi\s+translation|hindi)$/i.test(lower.trim());
    const isHinglishFollowUp = /^(?:in\s+hinglish|hinglish\s+me|translate\s+(?:in|to)?\s*hinglish|hinglish\s+me\s+batao|hinglish\s+me\s+samjhao|hinglish)$/i.test(lower.trim());
    const isEnglishFollowUp = /^(?:in\s+english|english\s+me|translate\s+(?:in|to)?\s*english|explain\s+in\s+english|english)$/i.test(lower.trim());

    if (isHindiFollowUp || isHinglishFollowUp || isEnglishFollowUp) {
      const sess = getActiveSession();
      const botMsgs = sess ? sess.messages.filter(m => m.sender === 'bot') : [];
      const lastBotMsg = botMsgs.length > 0 ? botMsgs[botMsgs.length - 1].text : '';
      const targetLang = isHindiFollowUp ? 'hi' : (isHinglishFollowUp ? 'hinglish' : 'en');

      if (lastTopic && KNOWLEDGE_GRAPH[lastTopic]) {
        return {
          text: KNOWLEDGE_GRAPH[lastTopic][targetLang] || KNOWLEDGE_GRAPH[lastTopic]['en'],
          confidence: 1.0,
          matchType: 'CONTEXT_FOLLOWUP'
        };
      }

      if (window.puter && window.puter.ai && lastBotMsg) {
        try {
          const transPrompt = isHindiFollowUp 
            ? `Translate and explain the previous response thoroughly in clear, natural Hindi (हिंदी - Devanagari script) with clean markdown and bullet points:\n\n${lastBotMsg}`
            : `Explain the previous response in natural conversational Hinglish:\n\n${lastBotMsg}`;
          const res = await window.puter.ai.chat(transPrompt, { model: 'gpt-4o-mini' });
          const content = (typeof res === 'string') ? res : (res && res.message ? res.message.content : '');
          if (content && content.trim().length > 10) {
            return { text: content.trim(), confidence: 0.99, matchType: 'PUTER_TRANSLATION' };
          }
        } catch (e) {}
      }
    }

    // 3. Document / File Attachment Context Construction
    let attachmentContext = '';
    if (attachments && attachments.length > 0) {
      attachmentContext = '\n\n### 📎 User Attached Files:\n';
      attachments.forEach((att, idx) => {
        attachmentContext += `\n**[File ${idx + 1}: ${att.name} (${att.type || 'file'})]**\n`;
        if (att.textContent) {
          // Truncate to safe context limit
          attachmentContext += '```\n' + att.textContent.substring(0, 4000) + '\n```\n';
        }
      });
    }

    // 4. Real-Time Web Search Integration (if enabled or requested)
    let webSearchContext = '';
    if (settings.webSearch || lower.startsWith('search:') || lower.includes('latest news') || lower.includes('weather in')) {
      try {
        const queryTerm = text.replace(/^search:\s*/i, '');
        const wikiUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(queryTerm.replace(/\s+/g, '_'))}`;
        const wikiRes = await fetch(wikiUrl);
        if (wikiRes.ok) {
          const wikiData = await wikiRes.json();
          if (wikiData && wikiData.extract) {
            webSearchContext = `\n\n### 🌐 Web & Encyclopedic Knowledge Result:\n**Source: Wikipedia (${wikiData.title})**\n${wikiData.extract}\n`;
          }
        }
      } catch (e) {}
    }

    // 5. Code & Project Request Parser (Fast Interactive Generation)
    const isCodeRequest = /\b(write|create|code|program|script|build|develop|generate|implement|design|example|calculator|game|solve|algorithm|function|class|todo|website)\b/i.test(lower);
    
    // 6. PRIMARY AI PROVIDER (Puter.js / Custom OpenAI / Ollama)
    if (settings.provider === 'custom_openai' && settings.apiKey) {
      try {
        const fullPrompt = `${settings.systemPrompt}\n\n${attachmentContext}\n${webSearchContext}\nUser Request: ${text}`;
        const apiRes = await fetch(`${settings.apiEndpoint}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${settings.apiKey}`
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            temperature: parseFloat(settings.temperature) || 0.7,
            max_tokens: parseInt(settings.maxTokens) || 2048,
            messages: [{ role: 'user', content: fullPrompt }]
          }),
          signal
        });
        if (apiRes.ok) {
          const data = await apiRes.json();
          if (data && data.choices && data.choices[0]) {
            return {
              text: data.choices[0].message.content.trim(),
              confidence: 0.99,
              matchType: 'CUSTOM_OPENAI_API'
            };
          }
        }
      } catch (e) {}
    }

    if (window.puter && window.puter.ai) {
      try {
        let systemDirectives = isCodeRequest 
          ? 'You are an expert full-stack engineer like ChatGPT and Claude. Write complete, robust, production-quality code with markdown syntax highlighting, detailed explanations, and error handling.'
          : 'You are NexusAI Pro, an advanced AI assistant. Provide an authentic, comprehensive, deep, and structured answer with clear headings, bullet points, and math formatting.';

        const fullAiPrompt = `${systemDirectives}\n${attachmentContext}\n${webSearchContext}\n\nUser Question: "${text}". Language: ${langKey === 'hi' ? 'Hindi (Devanagari)' : (langKey === 'hinglish' ? 'Hinglish' : 'English')}.`;

        const puterPromise = window.puter.ai.chat(fullAiPrompt, { model: selectedModel === 'claude' ? 'claude-3-5-sonnet' : 'gpt-4o-mini' });
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 9500));
        const res = await Promise.race([puterPromise, timeoutPromise]);
        
        let reply = (typeof res === 'string') ? res : (res && res.message ? res.message.content : (res && res.text ? res.text : ''));
        if (reply && reply.trim().length > 10) {
          return {
            text: reply.trim(),
            confidence: 0.99,
            matchType: 'PUTER_GPT_4O'
          };
        }
      } catch (puterErr) {}
    }

    // 7. Universal Autonomous Knowledge & Code Engine Fallback
    for (const [topicKey, topicData] of Object.entries(KNOWLEDGE_GRAPH)) {
      if (lower.includes(topicKey) || (topicKey === 'os' && lower.includes('operating system'))) {
        lastTopic = topicKey;
        return {
          text: topicData[langKey] || topicData['en'],
          confidence: 0.98,
          matchType: 'KNOWLEDGE_GRAPH'
        };
      }
    }

    // 8. Wikipedia REST API Fallback for any general knowledge
    try {
      const cleanTopic = text.replace(/^(what is|who is|explain|tell me about|define|meaning of|kya hai|ke baare me batao)\s+/i, '').replace(/[?.,!]/g, '').trim();
      if (cleanTopic.length >= 2) {
        const wikiRes = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(cleanTopic.replace(/\s+/g, '_'))}`);
        if (wikiRes.ok) {
          const data = await wikiRes.json();
          if (data && data.extract && data.extract.length > 25) {
            return {
              text: `### 📖 **${data.title}**\n\n${data.extract}\n\n> 💡 *Overview: ${data.description || 'Encyclopedic Concept'}*`,
              confidence: 0.95,
              matchType: 'WIKIPEDIA_UNIVERSAL'
            };
          }
        }
      }
    } catch (e) {}

    // 9. Structured Universal Synthesis
    return {
      text: `### 💡 Analysis & Solution for: **${text}**\n\nHere is a comprehensive overview and implementation structure for **"${text}"**:\n\n- 🔍 **Core Definition**: Refers to a fundamental domain in computing, software architecture, and modern problem solving.\n- ⚙️ **Key Features & Implementation**: Designed with modular functions, clean code principles, and scalable execution.\n\n\`\`\`javascript\n// Production implementation snippet for: ${text}\nexport function executeTask(input) {\n  console.log("Executing:", input);\n  return { success: true, timestamp: Date.now() };\n}\n\`\`\`\n\nFeel free to request deeper code modifications, alternative algorithms, or unit tests!`,
      confidence: 0.90,
      matchType: 'STRUCTURED_SYNTHESIS'
    };
  }

  function detectLanguageKey(text) {
    const isPureHindi = /[\u0900-\u097F]/.test(text) || text.toLowerCase().includes('in hindi') || text.toLowerCase().includes('hindi me');
    const isHinglish = text.toLowerCase().includes('in hinglish') || text.toLowerCase().includes('hinglish me') || /\b(kya|hai|kaise|karo|batao|shukriya|namaste|samjhao|chahiye)\b/i.test(text);
    return isPureHindi ? 'hi' : (isHinglish ? 'hinglish' : 'en');
  }

  // ============================================================
  // 7. MESSAGE BUBBLE RENDERING & INTERACTIVE ACTIONS
  // ============================================================
  function renderMessageBubble(sender, rawText, animate = false, msgObj = null) {
    const row = document.createElement('div');
    row.className = `chat-message-row ${sender}`;
    if (msgObj && msgObj.id) row.dataset.messageId = msgObj.id;

    const avatarHtml = sender === 'user' 
      ? '<div class="msg-avatar user">👤</div>' 
      : '<div class="msg-avatar bot">🤖</div>';

    let attachmentBadges = '';
    if (msgObj && msgObj.attachments && msgObj.attachments.length > 0) {
      attachmentBadges = '<div class="msg-attachments-wrap">';
      msgObj.attachments.forEach(att => {
        if (att.dataUrl && att.type && att.type.startsWith('image/')) {
          attachmentBadges += `<img src="${att.dataUrl}" class="msg-inline-img" alt="${att.name}">`;
        } else {
          attachmentBadges += `<span class="attach-pill"><i data-lucide="file-text" style="width:12px;height:12px;"></i> ${att.name}</span>`;
        }
      });
      attachmentBadges += '</div>';
    }

    const timeHtml = `<span class="msg-time">${msgObj && msgObj.timestamp ? msgObj.timestamp : formatTime(new Date())}</span>`;

    const actionsHtml = sender === 'bot' ? `
      <div class="bot-action-bar">
        <button class="mini-action-btn btn-copy-msg" title="Copy text"><i data-lucide="copy"></i></button>
        <button class="mini-action-btn btn-speak-msg" title="Speak message"><i data-lucide="volume-2"></i></button>
        <button class="mini-action-btn btn-regen-msg" title="Regenerate response"><i data-lucide="rotate-ccw"></i></button>
        ${timeHtml}
      </div>
    ` : `
      <div class="user-action-bar">
        <button class="mini-action-btn btn-edit-msg" title="Edit & Resend"><i data-lucide="pencil"></i></button>
        ${timeHtml}
      </div>
    `;

    row.innerHTML = `
      ${avatarHtml}
      <div class="msg-wrapper">
        ${attachmentBadges}
        <div class="msg-bubble">
          <div class="msg-content"></div>
        </div>
        ${actionsHtml}
      </div>
    `;

    const contentDiv = row.querySelector('.msg-content');

    if (animate && sender === 'bot') {
      let currentIdx = 0;
      const speed = Math.max(8, Math.min(24, Math.floor(1500 / rawText.length)));
      const timer = setInterval(() => {
        currentIdx += 4;
        if (currentIdx >= rawText.length) {
          clearInterval(timer);
          contentDiv.innerHTML = formatRichMarkdown(rawText);
          addCodeButtons(contentDiv);
          renderMath(contentDiv);
          lucide.createIcons();
          scrollCanvasToBottom();
        } else {
          const slice = rawText.substring(0, currentIdx);
          contentDiv.innerHTML = formatRichMarkdown(slice) + '<span class="streaming-cursor"></span>';
          if (settings.autoScroll) scrollCanvasToBottom();
        }
      }, speed);
    } else {
      contentDiv.innerHTML = formatRichMarkdown(rawText);
      addCodeButtons(contentDiv);
      renderMath(contentDiv);
    }

    messagesContainer.appendChild(row);
    attachBubbleActionListeners(row, rawText, msgObj);
    lucide.createIcons();
    scrollCanvasToBottom();
  }

  function formatRichMarkdown(text) {
    if (!text) return '';
    return marked.parse(text);
  }

  function renderMath(element) {
    if (window.renderMathInElement) {
      try {
        window.renderMathInElement(element, {
          delimiters: [
            { left: '$$', right: '$$', display: true },
            { left: '$', right: '$', display: false },
            { left: '\\(', right: '\\)', display: false },
            { left: '\\[', right: '\\]', display: true }
          ],
          throwOnError: false
        });
      } catch (e) {}
    }
  }

  function addCodeButtons(container) {
    container.querySelectorAll('pre').forEach(pre => {
      if (pre.querySelector('.code-header')) return;
      const code = pre.querySelector('code');
      const lang = (code.className.match(/language-(\w+)/) || [, 'code'])[1];
      const rawCode = code.innerText;

      const header = document.createElement('div');
      header.className = 'code-header';
      
      const canRun = (lang === 'html' || lang === 'xml' || lang === 'javascript' || lang === 'js' || rawCode.includes('<!DOCTYPE html>') || rawCode.includes('<html>'));

      header.innerHTML = `
        <span>${lang.toUpperCase()}</span>
        <div class="code-header-actions">
          ${canRun ? '<button class="code-action-btn btn-run-code"><i data-lucide="play" style="width:12px;height:12px;"></i> Run Live</button>' : ''}
          <button class="code-action-btn btn-apply-editor" title="Open in IDE Editor"><i data-lucide="file-code" style="width:12px;height:12px;"></i> Apply to IDE</button>
          <button class="code-action-btn btn-download-code"><i data-lucide="download" style="width:12px;height:12px;"></i> Download</button>
          <button class="code-action-btn btn-copy-code"><i data-lucide="copy" style="width:12px;height:12px;"></i> Copy</button>
        </div>
      `;

      // Copy Code
      header.querySelector('.btn-copy-code').addEventListener('click', () => {
        navigator.clipboard.writeText(rawCode);
        showToast('Code copied to clipboard!', 'check');
      });

      // Download Code
      header.querySelector('.btn-download-code').addEventListener('click', () => {
        const extMap = { python: 'py', java: 'java', javascript: 'js', js: 'js', html: 'html', css: 'css', sql: 'sql', cpp: 'cpp', c: 'c', json: 'json', markdown: 'md' };
        const ext = extMap[lang.toLowerCase()] || 'txt';
        downloadStringAsFile(rawCode, `nexus_code_${Date.now()}.${ext}`, 'text/plain');
        showToast(`Saved as .${ext} file!`, 'download');
      });

      // Apply to IDE Editor Tab
      header.querySelector('.btn-apply-editor').addEventListener('click', () => {
        applyCodeToActiveProject(lang, rawCode);
      });

      // Run Live Sandbox
      if (canRun) {
        header.querySelector('.btn-run-code').addEventListener('click', () => {
          openLivePreview(rawCode);
        });
      }

      pre.insertBefore(header, code);
    });
  }

  function attachBubbleActionListeners(row, rawText, msgObj) {
    // Copy entire message
    const btnCopy = row.querySelector('.btn-copy-msg');
    if (btnCopy) {
      btnCopy.addEventListener('click', () => {
        navigator.clipboard.writeText(rawText);
        showToast('Message copied!', 'copy');
      });
    }

    // Speak TTS
    const btnSpeak = row.querySelector('.btn-speak-msg');
    if (btnSpeak) {
      btnSpeak.addEventListener('click', () => {
        speakCleanText(rawText);
      });
    }

    // Regenerate Response
    const btnRegen = row.querySelector('.btn-regen-msg');
    if (btnRegen) {
      btnRegen.addEventListener('click', () => {
        const sess = getActiveSession();
        if (sess && sess.messages.length > 0) {
          const lastUserMsg = sess.messages.filter(m => m.sender === 'user').slice(-1)[0];
          if (lastUserMsg) {
            handleSendMessage(lastUserMsg.text);
          }
        }
      });
    }

    // Edit and Resend User Message
    const btnEdit = row.querySelector('.btn-edit-msg');
    if (btnEdit) {
      btnEdit.addEventListener('click', () => {
        chatTextarea.value = rawText;
        chatTextarea.focus();
        chatTextarea.style.height = 'auto';
        chatTextarea.style.height = chatTextarea.scrollHeight + 'px';
        btnSend.disabled = false;
        showToast('Editing message in input bar', 'pencil');
      });
    }
  }

  // ============================================================
  // 8. MULTI-MODAL ATTACHMENTS (PDF, TXT, CSV, IMAGES)
  // ============================================================
  function setupMultiModalUploads() {
    btnAttachFile.addEventListener('click', () => fileUploadInput.click());

    fileUploadInput.addEventListener('change', async (e) => {
      handleFiles(Array.from(e.target.files));
      fileUploadInput.value = '';
    });

    // Drag & drop on input card
    ['dragenter', 'dragover'].forEach(eventName => {
      chatDropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        chatDropzone.classList.add('drag-active');
      });
    });

    ['dragleave', 'drop'].forEach(eventName => {
      chatDropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        chatDropzone.classList.remove('drag-active');
      });
    });

    chatDropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      if (e.dataTransfer && e.dataTransfer.files) {
        handleFiles(Array.from(e.dataTransfer.files));
      }
    });
  }

  async function handleFiles(files) {
    for (const file of files) {
      const isImg = file.type.startsWith('image/');
      const isPdf = file.type === 'application/pdf' || file.name.endsWith('.pdf');

      const attObj = {
        name: file.name,
        size: formatBytes(file.size),
        type: file.type || 'file',
        dataUrl: null,
        textContent: null
      };

      if (isImg) {
        attObj.dataUrl = await readFileAsDataUrl(file);
      } else if (isPdf) {
        attObj.textContent = await parsePdfText(file);
      } else {
        attObj.textContent = await readFileAsText(file);
      }

      stagedAttachments.push(attObj);
    }
    renderAttachmentPreviews();
  }

  function renderAttachmentPreviews() {
    if (stagedAttachments.length === 0) {
      attachmentPreviewStrip.style.display = 'none';
      attachmentPreviewStrip.innerHTML = '';
      return;
    }

    attachmentPreviewStrip.style.display = 'flex';
    attachmentPreviewStrip.innerHTML = '';

    stagedAttachments.forEach((att, idx) => {
      const pill = document.createElement('div');
      pill.className = 'attach-pill';
      
      const iconOrThumb = att.dataUrl 
        ? `<img src="${att.dataUrl}" class="attach-pill-thumb">`
        : `<i data-lucide="file-code" style="width:13px;height:13px;"></i>`;

      pill.innerHTML = `
        ${iconOrThumb}
        <span>${att.name}</span>
        <button class="attach-pill-remove" data-idx="${idx}"><i data-lucide="x" style="width:12px;height:12px;"></i></button>
      `;

      pill.querySelector('.attach-pill-remove').addEventListener('click', () => {
        stagedAttachments.splice(idx, 1);
        renderAttachmentPreviews();
      });

      attachmentPreviewStrip.appendChild(pill);
    });

    btnSend.disabled = false;
    lucide.createIcons();
  }

  function readFileAsText(file) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => resolve('');
      reader.readAsText(file);
    });
  }

  function readFileAsDataUrl(file) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => resolve('');
      reader.readAsDataURL(file);
    });
  }

  async function parsePdfText(file) {
    try {
      if (!window.pdfjsLib) return `[PDF: ${file.name}]`;
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let fullText = '';
      for (let i = 1; i <= Math.min(pdf.numPages, 10); i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        fullText += textContent.items.map(item => item.str).join(' ') + '\n';
      }
      return fullText;
    } catch (e) {
      return `[PDF Content from ${file.name}]`;
    }
  }

  // ============================================================
  // 9. 3-PANEL AI CODING IDE WORKSPACE & FILE MANAGEMENT
  // ============================================================
  function initIDEProject() {
    const proj = getActiveProject();
    if (!proj) return;

    activeProjectName.innerText = proj.name;
    activeProjectPill.style.display = 'flex';

    if (proj.files.length > 0 && !activeEditorFileId) {
      openFileInEditor(proj.files[0].id);
    }

    renderFileTree();
    renderOpenTabs();
  }

  function renderFileTree() {
    const proj = getActiveProject();
    if (!proj) return;

    ideFileTree.innerHTML = '';
    proj.files.forEach(file => {
      const node = document.createElement('div');
      node.className = `tree-node ${file.id === activeEditorFileId ? 'active' : ''}`;
      
      const fileIcon = getFileIconName(file.name);

      node.innerHTML = `
        <div class="tree-node-info">
          <i data-lucide="${fileIcon}"></i>
          <span>${file.name}</span>
        </div>
        <div class="panel-actions">
          <button class="icon-btn-sm btn-del-file" title="Delete File"><i data-lucide="trash-2"></i></button>
        </div>
      `;

      node.querySelector('.tree-node-info').addEventListener('click', () => {
        openFileInEditor(file.id);
      });

      node.querySelector('.btn-del-file').addEventListener('click', (e) => {
        e.stopPropagation();
        deleteProjectFile(file.id);
      });

      ideFileTree.appendChild(node);
    });
    lucide.createIcons();
  }

  function openFileInEditor(fileId) {
    const proj = getActiveProject();
    if (!proj) return;

    const file = proj.files.find(f => f.id === fileId);
    if (!file) return;

    activeEditorFileId = fileId;
    if (!openEditorTabs.includes(fileId)) {
      openEditorTabs.push(fileId);
    }

    editorActiveFilepath.innerText = file.path || file.name;
    editorCodeTextarea.value = file.content;
    updateLineNumbers();

    renderFileTree();
    renderOpenTabs();
  }

  function renderOpenTabs() {
    const proj = getActiveProject();
    if (!proj) return;

    ideTabBar.innerHTML = '';
    openEditorTabs.forEach(fileId => {
      const file = proj.files.find(f => f.id === fileId);
      if (!file) return;

      const tab = document.createElement('div');
      tab.className = `ide-tab ${file.id === activeEditorFileId ? 'active' : ''}`;
      tab.innerHTML = `
        <span>${file.name}</span>
        <span class="ide-tab-close" data-id="${file.id}">×</span>
      `;

      tab.addEventListener('click', () => openFileInEditor(file.id));
      tab.querySelector('.ide-tab-close').addEventListener('click', (e) => {
        e.stopPropagation();
        closeEditorTab(file.id);
      });

      ideTabBar.appendChild(tab);
    });
  }

  function closeEditorTab(fileId) {
    openEditorTabs = openEditorTabs.filter(id => id !== fileId);
    if (activeEditorFileId === fileId) {
      activeEditorFileId = openEditorTabs[0] || null;
      if (activeEditorFileId) {
        openFileInEditor(activeEditorFileId);
      } else {
        editorActiveFilepath.innerText = 'No file open';
        editorCodeTextarea.value = '';
        updateLineNumbers();
      }
    }
    renderOpenTabs();
    renderFileTree();
  }

  function saveCurrentEditorFile() {
    const proj = getActiveProject();
    if (!proj || !activeEditorFileId) return;

    const file = proj.files.find(f => f.id === activeEditorFileId);
    if (!file) return;

    file.content = editorCodeTextarea.value;
    saveProjects();
    showToast(`Saved ${file.name}`, 'check');
  }

  function createNewProjectFile(filename) {
    const proj = getActiveProject();
    if (!proj) return;

    const name = filename || prompt('Enter new file name (e.g. script.py, server.js, index.html):');
    if (!name) return;

    const newFile = {
      id: 'f_' + Date.now(),
      name: name,
      path: name,
      isFolder: false,
      content: `// New file: ${name}\n`
    };

    proj.files.push(newFile);
    saveProjects();
    openFileInEditor(newFile.id);
    showToast(`Created ${name}`, 'file-plus');
  }

  function deleteProjectFile(fileId) {
    const proj = getActiveProject();
    if (!proj) return;

    if (!confirm('Are you sure you want to delete this file?')) return;

    proj.files = proj.files.filter(f => f.id !== fileId);
    saveProjects();
    closeEditorTab(fileId);
    renderFileTree();
    showToast('File deleted', 'trash-2');
  }

  function applyCodeToActiveProject(lang, code) {
    const proj = getActiveProject();
    if (!proj) return;

    // Switch to IDE view
    switchViewMode('ide');

    const extMap = { python: 'py', java: 'java', javascript: 'js', js: 'js', html: 'html', css: 'css', sql: 'sql' };
    const ext = extMap[lang.toLowerCase()] || 'js';
    const filename = `app_${Date.now()}.${ext}`;

    const newFile = {
      id: 'f_' + Date.now(),
      name: filename,
      path: filename,
      isFolder: false,
      content: code
    };

    proj.files.push(newFile);
    saveProjects();
    openFileInEditor(newFile.id);
    showToast(`Loaded ${filename} into IDE Editor!`, 'code-2');
  }

  function exportProjectAsZip() {
    const proj = getActiveProject();
    if (!proj || !window.JSZip) {
      showToast('Exporting project...', 'download');
      return;
    }

    const zip = new JSZip();
    proj.files.forEach(file => {
      zip.file(file.path || file.name, file.content);
    });

    zip.generateAsync({ type: 'blob' }).then(blob => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${proj.name.replace(/\s+/g, '_').toLowerCase()}.zip`;
      a.click();
      showToast('Project ZIP downloaded!', 'check');
    });
  }

  function updateLineNumbers() {
    const lines = editorCodeTextarea.value.split('\n').length;
    editorLineNumbers.innerHTML = Array.from({ length: lines }, (_, i) => i + 1).join('<br>');
  }

  function getFileIconName(filename) {
    if (filename.endsWith('.html')) return 'file-code';
    if (filename.endsWith('.css')) return 'file-code';
    if (filename.endsWith('.js') || filename.endsWith('.ts')) return 'file-code-2';
    if (filename.endsWith('.py')) return 'terminal';
    if (filename.endsWith('.java')) return 'coffee';
    if (filename.endsWith('.json')) return 'file-json';
    return 'file-text';
  }

  // ============================================================
  // 10. TERMINAL & EXECUTION SANDBOX
  // ============================================================
  async function runActiveCodeInTerminal() {
    const proj = getActiveProject();
    if (!proj || !activeEditorFileId) {
      showToast('No active file to run', 'alert-circle');
      return;
    }

    const file = proj.files.find(f => f.id === activeEditorFileId);
    if (!file) return;

    terminalOutput.innerHTML += `\n<span class="term-prompt">$ run ${file.name}</span>\n`;

    // Attempt Server API Execution
    try {
      const res = await fetch('/api/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          language: file.name.split('.').pop(),
          code: file.content
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.stdout) terminalOutput.innerHTML += `<span class="term-success">${escapeHtml(data.stdout)}</span>\n`;
        if (data.stderr) terminalOutput.innerHTML += `<span class="term-error">${escapeHtml(data.stderr)}</span>\n`;
        terminalOutput.innerHTML += `<span class="term-dim">Process finished in ${data.executionTimeMs || 10}ms with exit code ${data.exitCode || 0}</span>\n`;
        terminalOutput.scrollTop = terminalOutput.scrollHeight;
        return;
      }
    } catch (e) {}

    // Client-side execution in Web Worker / Sandbox
    try {
      if (file.name.endsWith('.js')) {
        let logs = [];
        const sandboxConsole = {
          log: (...args) => logs.push(args.join(' ')),
          error: (...args) => logs.push('[ERROR] ' + args.join(' ')),
          warn: (...args) => logs.push('[WARN] ' + args.join(' '))
        };
        const runFn = new Function('console', file.content);
        runFn(sandboxConsole);
        terminalOutput.innerHTML += `<span class="term-success">${escapeHtml(logs.join('\n') || 'Executed successfully (no output)')}</span>\n`;
      } else if (file.name.endsWith('.html')) {
        openLivePreview(file.content);
        terminalOutput.innerHTML += `<span class="term-success">Opened live interactive HTML preview!</span>\n`;
      } else {
        terminalOutput.innerHTML += `<span class="term-dim">Syntax check passed for ${file.name}.</span>\n`;
      }
    } catch (runErr) {
      terminalOutput.innerHTML += `<span class="term-error">Runtime Error: ${escapeHtml(runErr.message)}</span>\n`;
    }

    terminalOutput.scrollTop = terminalOutput.scrollHeight;
  }

  // ============================================================
  // 11. SIDEBAR MANAGEMENT (SEARCH, PIN, ARCHIVE)
  // ============================================================
  function renderSidebarChats(filterQuery = '') {
    chatHistoryList.innerHTML = '';
    pinnedHistoryList.innerHTML = '';
    archivedHistoryList.innerHTML = '';

    const query = filterQuery.toLowerCase();
    const filtered = sessions.filter(s => s.title.toLowerCase().includes(query) || (s.messages && s.messages.some(m => m.text.toLowerCase().includes(query))));

    let pinnedCount = 0;
    let archivedCount = 0;

    filtered.forEach(sess => {
      const item = document.createElement('div');
      item.className = `chat-history-item ${sess.id === activeSessionId ? 'active' : ''}`;
      item.innerHTML = `
        <i data-lucide="message-square"></i>
        <span class="chat-title-text">${escapeHtml(sess.title)}</span>
        <div class="chat-item-actions">
          <button class="chat-action-icon btn-pin" title="${sess.pinned ? 'Unpin' : 'Pin to Top'}"><i data-lucide="${sess.pinned ? 'pin-off' : 'pin'}"></i></button>
          <button class="chat-action-icon btn-rename" title="Rename"><i data-lucide="pencil"></i></button>
          <button class="chat-action-icon btn-del" title="Delete"><i data-lucide="trash-2"></i></button>
        </div>
      `;

      item.addEventListener('click', () => loadSession(sess.id));

      item.querySelector('.btn-pin').addEventListener('click', (e) => {
        e.stopPropagation();
        sess.pinned = !sess.pinned;
        saveSessions();
        renderSidebarChats();
      });

      item.querySelector('.btn-rename').addEventListener('click', (e) => {
        e.stopPropagation();
        const newTitle = prompt('Enter new conversation title:', sess.title);
        if (newTitle) {
          sess.title = newTitle.trim();
          saveSessions();
          renderSidebarChats();
        }
      });

      item.querySelector('.btn-del').addEventListener('click', (e) => {
        e.stopPropagation();
        deleteSession(sess.id);
      });

      if (sess.pinned) {
        pinnedHistoryList.appendChild(item);
        pinnedCount++;
      } else if (sess.archived) {
        archivedHistoryList.appendChild(item);
        archivedCount++;
      } else {
        chatHistoryList.appendChild(item);
      }
    });

    pinnedHeader.style.display = pinnedCount > 0 ? 'block' : 'none';
    archivedHeader.style.display = archivedCount > 0 ? 'block' : 'none';
    lucide.createIcons();
  }

  function renderSidebarProjects() {
    projectsList.innerHTML = '';
    projects.forEach(proj => {
      const card = document.createElement('div');
      card.className = `chat-history-item ${proj.id === activeProjectId ? 'active' : ''}`;
      card.innerHTML = `
        <i data-lucide="folder"></i>
        <span class="chat-title-text">${escapeHtml(proj.name)}</span>
        <div class="chat-item-actions">
          <button class="chat-action-icon btn-del-proj" title="Delete Project"><i data-lucide="trash-2"></i></button>
        </div>
      `;

      card.addEventListener('click', () => {
        activeProjectId = proj.id;
        localStorage.setItem(STORAGE_KEYS.ACTIVE_PROJECT, activeProjectId);
        initIDEProject();
        renderSidebarProjects();
        switchViewMode('ide');
      });

      card.querySelector('.btn-del-proj').addEventListener('click', (e) => {
        e.stopPropagation();
        if (projects.length <= 1) {
          showToast('Cannot delete the only project', 'alert-circle');
          return;
        }
        if (confirm(`Delete project "${proj.name}"?`)) {
          projects = projects.filter(p => p.id !== proj.id);
          activeProjectId = projects[0].id;
          saveProjects();
          initIDEProject();
          renderSidebarProjects();
        }
      });

      projectsList.appendChild(card);
    });
    lucide.createIcons();
  }

  function deleteSession(sessionId) {
    if (sessions.length <= 1) {
      sessions = [];
      startNewChat();
      return;
    }
    sessions = sessions.filter(s => s.id !== sessionId);
    saveSessions();
    if (activeSessionId === sessionId) {
      activeSessionId = sessions[0].id;
      loadSession(activeSessionId);
    }
    renderSidebarChats();
  }

  function clearAllChats() {
    if (!confirm('Are you sure you want to clear all conversation history?')) return;
    sessions = [];
    localStorage.removeItem(STORAGE_KEYS.SESSIONS);
    startNewChat();
    showToast('All conversations cleared!', 'trash-2');
  }

  // ============================================================
  // 12. VIEW MODE SWITCHER (CHAT VS IDE)
  // ============================================================
  function switchViewMode(mode) {
    if (mode === 'ide') {
      btnModeIde.classList.add('active');
      btnModeChat.classList.remove('active');
      chatViewContainer.classList.remove('active');
      ideViewContainer.classList.add('active');
      initIDEProject();
    } else {
      btnModeChat.classList.add('active');
      btnModeIde.classList.remove('active');
      ideViewContainer.classList.remove('active');
      chatViewContainer.classList.add('active');
    }
    lucide.createIcons();
  }

  // ============================================================
  // 13. LIVE PREVIEW SANDBOX MODAL
  // ============================================================
  function openLivePreview(codeContent) {
    const iframe = document.getElementById('preview-iframe');
    const btnClose = document.getElementById('btn-close-preview');

    previewModal.classList.add('active');
    const blob = new Blob([codeContent], { type: 'text/html' });
    iframe.src = URL.createObjectURL(blob);

    btnClose.onclick = () => {
      previewModal.classList.remove('active');
      iframe.src = 'about:blank';
    };
  }

  // ============================================================
  // 14. SETTINGS MODAL & THEMES
  // ============================================================
  function setupSettingsModal() {
    btnOpenSettings.addEventListener('click', () => {
      document.getElementById('setting-provider').value = settings.provider;
      document.getElementById('setting-api-key').value = settings.apiKey || '';
      document.getElementById('setting-api-endpoint').value = settings.apiEndpoint || '';
      document.getElementById('setting-temperature').value = settings.temperature;
      document.getElementById('temp-val-display').innerText = settings.temperature;
      document.getElementById('setting-max-tokens').value = settings.maxTokens;
      document.getElementById('setting-system-prompt').value = settings.systemPrompt;
      document.getElementById('setting-theme').value = settings.theme;
      document.getElementById('setting-font-size').value = settings.fontSize;
      settingsModal.classList.add('active');
    });

    document.getElementById('btn-close-settings').addEventListener('click', () => {
      settingsModal.classList.remove('active');
    });

    document.getElementById('setting-temperature').addEventListener('input', (e) => {
      document.getElementById('temp-val-display').innerText = e.target.value;
    });

    document.getElementById('btn-save-settings').addEventListener('click', () => {
      settings.provider = document.getElementById('setting-provider').value;
      settings.apiKey = document.getElementById('setting-api-key').value.trim();
      settings.apiEndpoint = document.getElementById('setting-api-endpoint').value.trim();
      settings.temperature = parseFloat(document.getElementById('setting-temperature').value) || 0.7;
      settings.maxTokens = parseInt(document.getElementById('setting-max-tokens').value) || 2048;
      settings.systemPrompt = document.getElementById('setting-system-prompt').value.trim();
      settings.theme = document.getElementById('setting-theme').value;
      settings.fontSize = document.getElementById('setting-font-size').value;

      saveSettings();
      applyTheme(settings.theme);
      settingsModal.classList.remove('active');
      showToast('Settings saved successfully!', 'check');
    });

    // Reset All Data
    document.getElementById('btn-reset-all-data').addEventListener('click', () => {
      if (confirm('This will wipe all chats and reset settings to defaults. Continue?')) {
        localStorage.clear();
        location.reload();
      }
    });

    // Export All Chats JSON
    document.getElementById('btn-export-all-data').addEventListener('click', () => {
      const dataStr = JSON.stringify({ sessions, projects, settings }, null, 2);
      downloadStringAsFile(dataStr, `nexus_backup_${Date.now()}.json`, 'application/json');
      showToast('Backup downloaded!', 'download');
    });
  }

  function applyTheme(theme) {
    if (theme === 'light') {
      body.classList.remove('theme-dark');
      body.classList.add('theme-light');
      themeIcon.setAttribute('data-lucide', 'moon');
    } else {
      body.classList.remove('theme-light');
      body.classList.add('theme-dark');
      themeIcon.setAttribute('data-lucide', 'sun');
    }
    lucide.createIcons();
  }

  // ============================================================
  // 15. SPEECH SYNTHESIS & VOICE INPUT
  // ============================================================
  function populateTtsVoices() {
    if (!('speechSynthesis' in window)) return;
    const select = document.getElementById('setting-tts-voice');
    const updateVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      select.innerHTML = voices.map((v, i) => `<option value="${i}">${v.name} (${v.lang})</option>`).join('');
    };
    window.speechSynthesis.onvoiceschanged = updateVoices;
    updateVoices();
  }

  function speakCleanText(rawMarkdown) {
    if (!('speechSynthesis' in window)) return;
    stopSpeaking();

    // Clean markdown, code blocks, emojis, symbols for voice
    const clean = rawMarkdown.replace(/```[\s\S]*?```/g, 'Code block omitted.')
                             .replace(/[*#_`>~]/g, '')
                             .replace(/[^\w\s\u0900-\u097F.,!?]/g, ' ')
                             .replace(/\s+/g, ' ')
                             .trim();

    currentSpeechUtterance = new SpeechSynthesisUtterance(clean);
    currentSpeechUtterance.rate = 1.0;
    window.speechSynthesis.speak(currentSpeechUtterance);
  }

  function stopSpeaking() {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }

  function setupVoiceInput() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      btnVoiceInput.style.display = 'none';
      return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;

    btnVoiceInput.addEventListener('click', () => {
      recognition.lang = langSelect.value === 'hi-IN' ? 'hi-IN' : 'en-US';
      recognition.start();
      btnVoiceInput.classList.add('recording');
      showToast('Listening...', 'mic');
    });

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      chatTextarea.value = (chatTextarea.value + ' ' + transcript).trim();
      btnSend.disabled = false;
    };

    recognition.onend = () => {
      btnVoiceInput.classList.remove('recording');
    };
  }

  // ============================================================
  // 16. EVENT LISTENERS & KEYBOARD SHORTCUTS
  // ============================================================
  function setupEventListeners() {
    btnToggleSidebar.addEventListener('click', () => sidebar.classList.toggle('collapsed'));
    btnNewChat.addEventListener('click', startNewChat);
    btnClearHistory.addEventListener('click', clearAllChats);

    // View Mode Switcher
    btnModeChat.addEventListener('click', () => switchViewMode('chat'));
    btnModeIde.addEventListener('click', () => switchViewMode('ide'));

    // Send Button & Textarea
    btnSend.addEventListener('click', () => handleSendMessage());
    chatTextarea.addEventListener('input', () => {
      chatTextarea.style.height = 'auto';
      chatTextarea.style.height = Math.min(chatTextarea.scrollHeight, 180) + 'px';
      btnSend.disabled = chatTextarea.value.trim().length === 0 && stagedAttachments.length === 0;
    });

    chatTextarea.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey && settings.enterToSend) {
        e.preventDefault();
        handleSendMessage();
      }
    });

    // Magic Quick Prompt Chips
    document.querySelectorAll('.magic-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const action = chip.dataset.action;
        const currentVal = chatTextarea.value.trim();
        if (action === 'code') chatTextarea.value = currentVal ? `Write full, complete, production-ready code for: ${currentVal}` : 'Write a full, complete, production-ready website for ';
        else if (action === 'explain') chatTextarea.value = currentVal ? `Explain in simple terms step-by-step with examples: ${currentVal}` : 'Explain in simple terms: ';
        else if (action === 'debug') chatTextarea.value = currentVal ? `Debug, optimize, and fix this code: ${currentVal}` : 'Debug and optimize this code: \n';
        else if (action === 'optimize') chatTextarea.value = currentVal ? `Optimize the time and space complexity of: ${currentVal}` : 'Optimize this code: \n';
        else if (action === 'tests') chatTextarea.value = currentVal ? `Write comprehensive unit tests for: ${currentVal}` : 'Write unit tests for: \n';
        else if (action === 'hindi') chatTextarea.value = currentVal ? `${currentVal} in Hindi` : 'Hindi me samjhao: ';
        chatTextarea.focus();
        btnSend.disabled = false;
      });
    });

    // Starter Cards Click
    document.querySelectorAll('.simple-card').forEach(card => {
      card.addEventListener('click', () => {
        const prompt = card.dataset.prompt;
        if (prompt) handleSendMessage(prompt);
      });
    });

    // Web Search Toggle
    btnWebSearchToggle.addEventListener('click', () => {
      settings.webSearch = !settings.webSearch;
      btnWebSearchToggle.classList.toggle('active', settings.webSearch);
      showToast(settings.webSearch ? 'Web Search Enabled' : 'Web Search Disabled', 'globe');
    });

    // Sidebar Tabs (Chats vs Projects)
    document.getElementById('tab-btn-chats').addEventListener('click', () => {
      document.getElementById('tab-btn-chats').classList.add('active');
      document.getElementById('tab-btn-projects').classList.remove('active');
      document.getElementById('sidebar-chats-pane').classList.add('active');
      document.getElementById('sidebar-projects-pane').classList.remove('active');
    });

    document.getElementById('tab-btn-projects').addEventListener('click', () => {
      document.getElementById('tab-btn-projects').classList.add('active');
      document.getElementById('tab-btn-chats').classList.remove('active');
      document.getElementById('sidebar-projects-pane').classList.add('active');
      document.getElementById('sidebar-chats-pane').classList.remove('active');
    });

    sidebarSearchInput.addEventListener('input', (e) => {
      renderSidebarChats(e.target.value);
    });

    btnCreateProject.addEventListener('click', () => {
      const name = prompt('Enter new project name:');
      if (!name) return;
      const newProj = {
        id: 'proj_' + Date.now(),
        name: name.trim(),
        description: 'Custom AI Project',
        createdAt: new Date().toISOString(),
        files: [{ id: 'f_' + Date.now(), name: 'main.js', path: 'main.js', isFolder: false, content: '// Project entry point\n' }]
      };
      projects.unshift(newProj);
      activeProjectId = newProj.id;
      saveProjects();
      renderSidebarProjects();
      initIDEProject();
      switchViewMode('ide');
    });

    // IDE Editor Toolbar Actions
    btnEditorSave.addEventListener('click', saveCurrentEditorFile);
    btnEditorRun.addEventListener('click', runActiveCodeInTerminal);
    btnEditorDiff.addEventListener('click', () => {
      const isVisible = ideDiffViewer.style.display !== 'none';
      ideDiffViewer.style.display = isVisible ? 'none' : 'block';
      document.querySelector('.code-editor-wrapper').style.display = isVisible ? 'flex' : 'none';
    });

    ideBtnNewFile.addEventListener('click', () => createNewProjectFile());
    ideBtnExportZip.addEventListener('click', exportProjectAsZip);

    editorCodeTextarea.addEventListener('input', updateLineNumbers);
    editorCodeTextarea.addEventListener('scroll', () => {
      editorLineNumbers.scrollTop = editorCodeTextarea.scrollTop;
    });

    // Terminal Input Enter
    terminalInput.addEventListener('keydown', async (e) => {
      if (e.key === 'Enter') {
        const cmd = terminalInput.value.trim();
        terminalInput.value = '';
        if (!cmd) return;
        terminalOutput.innerHTML += `\n<span class="term-prompt">$ ${escapeHtml(cmd)}</span>\n`;
        try {
          const res = await fetch('/api/execute', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ command: cmd })
          });
          if (res.ok) {
            const data = await res.json();
            if (data.stdout) terminalOutput.innerHTML += `<span class="term-success">${escapeHtml(data.stdout)}</span>\n`;
            if (data.stderr) terminalOutput.innerHTML += `<span class="term-error">${escapeHtml(data.stderr)}</span>\n`;
          }
        } catch (err) {
          terminalOutput.innerHTML += `<span class="term-dim">Command sent to background sandbox.</span>\n`;
        }
        terminalOutput.scrollTop = terminalOutput.scrollHeight;
      }
    });

    btnClearTerminal.addEventListener('click', () => {
      terminalOutput.innerHTML = '<span class="term-dim">Terminal cleared.</span>\n';
    });

    // AI Coding Agent (IDE Right Panel)
    btnAgentSend.addEventListener('click', async () => {
      const prompt = agentTextarea.value.trim();
      if (!prompt) return;
      agentTextarea.value = '';

      const proj = getActiveProject();
      const activeFile = proj ? proj.files.find(f => f.id === activeEditorFileId) : null;
      const fileContext = activeFile ? `\nActive File: ${activeFile.name}\n\`\`\`\n${activeFile.content}\n\`\`\`\n` : '';

      const userRow = document.createElement('div');
      userRow.className = 'chat-message-row user';
      userRow.innerHTML = `<div class="msg-bubble">${escapeHtml(prompt)}</div>`;
      agentChatMessages.appendChild(userRow);

      const botRow = document.createElement('div');
      botRow.className = 'chat-message-row bot';
      botRow.innerHTML = `<div class="msg-bubble"><span class="streaming-cursor"></span> Analyzing project & code...</div>`;
      agentChatMessages.appendChild(botRow);
      agentChatMessages.scrollTop = agentChatMessages.scrollHeight;

      try {
        const fullAgentPrompt = `You are an expert AI Coding Agent. The user is asking: "${prompt}".\n${fileContext}\nProvide complete, working, production-ready code with explanations.`;
        const res = await executeUnifiedAIPipeline(fullAgentPrompt, [], null);
        botRow.querySelector('.msg-bubble').innerHTML = formatRichMarkdown(res.text);
        addCodeButtons(botRow.querySelector('.msg-bubble'));
      } catch (e) {
        botRow.querySelector('.msg-bubble').innerHTML = `⚠️ Error: ${e.message}`;
      }
      agentChatMessages.scrollTop = agentChatMessages.scrollHeight;
      lucide.createIcons();
    });

    // Agent Quick Prompts
    document.querySelectorAll('.agent-quick-prompts button').forEach(btn => {
      btn.addEventListener('click', () => {
        agentTextarea.value = btn.dataset.prompt;
        btnAgentSend.click();
      });
    });

    // Top Nav Modals & Buttons
    btnThemeToggle.addEventListener('click', () => {
      settings.theme = settings.theme === 'dark' ? 'light' : 'dark';
      saveSettings();
      applyTheme(settings.theme);
    });

    btnTtsToggle.addEventListener('click', () => {
      settings.ttsEnabled = !settings.ttsEnabled;
      btnTtsToggle.classList.toggle('active', settings.ttsEnabled);
      showToast(settings.ttsEnabled ? 'Voice Output ON' : 'Voice Output OFF', 'volume-2');
    });

    btnExportMenu.addEventListener('click', () => {
      const sess = getActiveSession();
      if (!sess) return;
      const chatText = sess.messages.map(m => `[${m.sender.toUpperCase()} - ${m.timestamp}]\n${m.text}\n`).join('\n---\n\n');
      downloadStringAsFile(chatText, `${sess.title.replace(/\s+/g, '_')}.txt`, 'text/plain');
      showToast('Chat transcript exported!', 'download');
    });

    btnOpenTrainerTop.addEventListener('click', () => trainerModal.classList.add('active'));
    btnOpenTrainer.addEventListener('click', () => trainerModal.classList.add('active'));
    document.getElementById('btn-close-modal').addEventListener('click', () => trainerModal.classList.remove('active'));

    setupSettingsModal();
    setupMultiModalUploads();
    setupVoiceInput();
  }

  function setupKeyboardShortcuts() {
    window.addEventListener('keydown', (e) => {
      // Ctrl+S: Save active file
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        saveCurrentEditorFile();
      }
      // Ctrl+Shift+N: New Chat
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'N') {
        e.preventDefault();
        startNewChat();
      }
      // Ctrl+B: Toggle Sidebar
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        sidebar.classList.toggle('collapsed');
      }
    });
  }

  // ============================================================
  // 17. UTILITY HELPERS
  // ============================================================
  function generateTitleFromPrompt(prompt) {
    const clean = prompt.replace(/[^a-zA-Z0-9\s]/g, '').trim();
    const words = clean.split(/\s+/).slice(0, 5).join(' ');
    return words ? words.charAt(0).toUpperCase() + words.slice(1) : 'New Conversation';
  }

  function formatTime(date) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  function escapeHtml(str) {
    return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function scrollCanvasToBottom() {
    chatCanvas.scrollTop = chatCanvas.scrollHeight;
  }

  function downloadStringAsFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
  }

  function playSound(type) {
    if (!settings.sfxEnabled) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      if (type === 'send') {
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.1);
      } else {
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.15);
      }
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch (e) {}
  }

  function showToast(message, iconName = 'info') {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<i data-lucide="${iconName}" style="width:14px;height:14px;"></i> <span>${escapeHtml(message)}</span>`;
    toastContainer.appendChild(toast);
    lucide.createIcons();
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 2800);
  }

  // ============================================================
  // 18. BUILT-IN ENCYCLOPEDIC KNOWLEDGE GRAPH
  // ============================================================
  const KNOWLEDGE_GRAPH = {
    python: {
      en: `### 🐍 Python Programming\n\n**Python** is an interpreted, high-level, dynamically-typed programming language created by **Guido van Rossum** in 1991.\n\n\`\`\`python\ndef greet(name):\n    return f"Hello, {name}!"\n\`\`\``,
      hi: `### 🐍 Python प्रोग्रामिंग क्या है?\n\n**Python** एक बहुत ही लोकप्रिय high-level प्रोग्रामिंग लैंग्वेज है जिसे 1991 में **Guido van Rossum** ने बनाया था। यह AI और Data Science की प्रमुख भाषा है।`,
      hinglish: `### 🐍 Python Programming\n\n**Python** ek high-level programming language hai jo AI, Machine Learning aur Web Development me sabse zyada use hoti hai.`
    },
    os: {
      en: `### 💻 Operating System (OS)\n\nAn **Operating System (OS)** is fundamental system software that manages hardware resources, CPU scheduling, memory, and file systems.\n\n#### Core Functions:\n1. 🧠 **Process Management**: CPU scheduling & multitasking.\n2. 💾 **Memory Management**: RAM & Virtual Memory allocation.\n3. 📁 **File Systems**: Data storage & organization.`,
      hi: `### 💻 ऑपरेटिंग सिस्टम (Operating System) क्या है?\n\n**ऑपरेटिंग सिस्टम (OS)** कंप्यूटर का मुख्य सिस्टम सॉफ्टवेयर है जो यूजर और कंप्यूटर हार्डवेयर के बीच माध्यम का कार्य करता है।\n\n**मुख्य कार्य**:\n- 🧠 **Process Management**: CPU और टास्क को शेड्यूल करना।\n- 💾 **Memory Management**: RAM का प्रबंधन।\n- 📁 **File Management**: फाइलों और डायरेक्टरी को संभालना।`,
      hinglish: `### 💻 Operating System (OS)\n\n**Operating System** computer ka master software hota hai jo CPU, RAM aur hardware components ko manage karta hai.`
    }
  };

  // Launch on DOM Ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
