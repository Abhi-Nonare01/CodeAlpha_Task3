// NexusAI Client with Hybrid Dual Engine (Backend Server + Static Client-Side NLP for GitHub Pages)
document.addEventListener('DOMContentLoaded', () => {
  
  // State variables
  let sessions = [];
  try {
    const stored = JSON.parse(localStorage.getItem('nexus_sessions') || '[]');
    sessions = stored.filter(s => s && s.messages && s.messages.length > 0);
  } catch (e) {
    sessions = [];
  }

  let currentSessionId = localStorage.getItem('nexus_current_session') || (sessions.length > 0 ? sessions[0].id : null);
  let ttsEnabled = false;
  let sfxEnabled = true;
  let allKnowledgeBase = [];
  let isStreaming = false;
  let isSpeaking = false;
  let activeSpeakBtn = null;
  let userName = localStorage.getItem('nexus_user_name') || null;
  let lastIntent = null;

  // DOM Elements
  const chatCanvas = document.getElementById('chat-canvas');
  const messagesContainer = document.getElementById('messages-container');
  const welcomeHero = document.getElementById('welcome-hero');
  const greetingText = document.getElementById('greeting-text');
  const chatTextarea = document.getElementById('chat-textarea');
  const btnSend = document.getElementById('btn-send');
  const chatHistoryList = document.getElementById('chat-history-list');
  const newChatBtn = document.getElementById('new-chat-btn');
  const sidebar = document.getElementById('sidebar');
  const sidebarToggleBtn = document.getElementById('sidebar-toggle-btn');
  const btnThemeToggle = document.getElementById('btn-theme-toggle');
  const themeIcon = document.getElementById('theme-icon');
  const btnTtsToggle = document.getElementById('btn-tts-toggle');
  const ttsIcon = document.getElementById('tts-icon');
  const btnSfxToggle = document.getElementById('btn-sfx-toggle');
  const sfxIcon = document.getElementById('sfx-icon');
  const btnVoiceInput = document.getElementById('btn-voice-input');
  const langSelect = document.getElementById('lang-select');
  const btnExportMenu = document.getElementById('btn-export-menu');
  const btnClearHistory = document.getElementById('btn-clear-history');
  const trainerModal = document.getElementById('trainer-modal');
  const btnOpenTrainer = document.getElementById('btn-open-trainer');
  const btnOpenTrainerTop = document.getElementById('btn-open-trainer-top');
  const btnCloseModal = document.getElementById('btn-close-modal');
  const btnCancelTeach = document.getElementById('btn-cancel-teach');
  const teachForm = document.getElementById('teach-form');
  const kbCardsList = document.getElementById('kb-cards-list');
  const kbSearchInput = document.getElementById('kb-search-input');
  const kbCount = document.getElementById('kb-count');

  // Dynamic Time Greeting
  const hour = new Date().getHours();
  if (hour < 12) {
    greetingText.textContent = "Good morning! How can I help you today?";
  } else if (hour < 18) {
    greetingText.textContent = "Good afternoon! How can I help you today?";
  } else {
    greetingText.textContent = "Good evening! How can I help you today?";
  }

  // Initialize Lucide Icons
  lucide.createIcons();

  // Configure Marked.js
  marked.setOptions({
    highlight: function(code, lang) {
      if (lang && hljs.getLanguage(lang)) {
        return hljs.highlight(code, { language: lang }).value;
      }
      return hljs.highlightAuto(code).value;
    },
    breaks: true
  });

  // Sound Synthesizer
  function playSound(type) {
    if (!sfxEnabled) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'send') {
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.06, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
        osc.start();
        osc.stop(ctx.currentTime + 0.08);
      } else if (type === 'receive') {
        osc.frequency.setValueAtTime(600, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.12);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
        osc.start();
        osc.stop(ctx.currentTime + 0.12);
      }
    } catch (e) {}
  }

  // Toast Notification
  function showToast(msg, icon = 'check') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<i data-lucide="${icon}"></i> <span>${msg}</span>`;
    container.appendChild(toast);
    lucide.createIcons();
    setTimeout(() => toast.remove(), 2600);
  }

  // 1. Single Sidebar Toggle
  function toggleSidebar() {
    sidebar.classList.toggle('collapsed');
    if (window.innerWidth <= 768) {
      sidebar.classList.toggle('mobile-open');
    }
  }

  sidebarToggleBtn.addEventListener('click', toggleSidebar);

  // 2. Robust ChatGPT-style Session Management
  function getActiveSession() {
    if (!currentSessionId) return null;
    return sessions.find(s => s.id === currentSessionId) || null;
  }

  function createNewSession(firstQuery) {
    const title = firstQuery.length > 28 ? firstQuery.substring(0, 28) + '...' : firstQuery;
    const newSession = {
      id: 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      title: title,
      createdAt: Date.now(),
      messages: []
    };
    sessions.unshift(newSession);
    currentSessionId = newSession.id;
    return newSession;
  }

  function saveSessions() {
    sessions = sessions.filter(s => s && s.messages && s.messages.length > 0);
    localStorage.setItem('nexus_sessions', JSON.stringify(sessions));
    if (currentSessionId) {
      localStorage.setItem('nexus_current_session', currentSessionId);
    } else {
      localStorage.removeItem('nexus_current_session');
    }
    renderHistorySidebar();
  }

  function renderHistorySidebar() {
    chatHistoryList.innerHTML = '';
    const activeSessions = sessions.filter(s => s && s.messages && s.messages.length > 0);
    
    if (activeSessions.length === 0) {
      chatHistoryList.innerHTML = '<div style="padding:12px 14px; font-size:0.8rem; color:var(--text-sub);">No previous chats yet</div>';
      return;
    }

    activeSessions.forEach(sess => {
      const item = document.createElement('div');
      item.className = `history-item ${sess.id === currentSessionId ? 'active' : ''}`;
      item.innerHTML = `
        <span class="history-title">${escapeHtml(sess.title)}</span>
        <button class="icon-btn del-btn" title="Delete chat" style="width:22px;height:22px;border:none;background:transparent;">
          <i data-lucide="x" style="width:13px;height:13px;"></i>
        </button>
      `;
      item.addEventListener('click', (e) => {
        if (e.target.closest('.del-btn')) {
          e.stopPropagation();
          deleteSession(sess.id);
          return;
        }
        switchSession(sess.id);
      });
      chatHistoryList.appendChild(item);
    });
    lucide.createIcons();
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function switchSession(id) {
    stopSpeaking();
    currentSessionId = id;
    localStorage.setItem('nexus_current_session', currentSessionId);
    renderHistorySidebar();
    loadCurrentSessionUI();
  }

  function deleteSession(id) {
    stopSpeaking();
    sessions = sessions.filter(s => s.id !== id);
    if (currentSessionId === id) {
      currentSessionId = sessions.length > 0 ? sessions[0].id : null;
    }
    saveSessions();
    loadCurrentSessionUI();
  }

  function loadCurrentSessionUI() {
    messagesContainer.innerHTML = '';
    const sess = getActiveSession();
    if (!sess || !sess.messages || sess.messages.length === 0) {
      welcomeHero.style.display = 'flex';
    } else {
      welcomeHero.style.display = 'none';
      sess.messages.forEach(msg => {
        renderMessageBubble(msg.sender, msg.text, msg.confidence, msg.matchType, msg.lang || 'en', false);
      });
    }
    scrollCanvasToBottom();
  }

  // 3. Message Bubble & Streaming
  function renderMessageBubble(sender, text, confidence = 1.0, matchType = 'ML_INTENT', lang = 'en', animate = false) {
    welcomeHero.style.display = 'none';
    const isUser = sender === 'user';

    const row = document.createElement('div');
    row.className = `chat-message-row ${isUser ? 'user' : 'bot'}`;

    const avatar = document.createElement('div');
    avatar.className = 'msg-avatar';
    avatar.textContent = isUser ? '👤' : '🤖';

    const wrapper = document.createElement('div');
    wrapper.className = 'msg-wrapper';

    const bubble = document.createElement('div');
    bubble.className = 'msg-bubble';

    const contentDiv = document.createElement('div');
    contentDiv.className = 'msg-content';

    bubble.appendChild(contentDiv);
    wrapper.appendChild(bubble);

    // Bot Action Bar
    if (!isUser) {
      const actionBar = document.createElement('div');
      actionBar.className = 'bot-action-bar';

      const copyBtn = document.createElement('button');
      copyBtn.className = 'mini-action-btn';
      copyBtn.title = 'Copy response';
      copyBtn.innerHTML = '<i data-lucide="copy"></i>';
      copyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(text);
        showToast('Copied to clipboard!', 'check');
      });
      actionBar.appendChild(copyBtn);

      const speakBtn = document.createElement('button');
      speakBtn.className = 'mini-action-btn speak-toggle-btn';
      speakBtn.title = 'Listen / Stop audio';
      speakBtn.innerHTML = '<i data-lucide="volume-2"></i>';
      speakBtn.addEventListener('click', () => toggleSpeech(text, speakBtn, lang));
      actionBar.appendChild(speakBtn);

      const likeBtn = document.createElement('button');
      likeBtn.className = 'mini-action-btn';
      likeBtn.innerHTML = '<i data-lucide="thumbs-up"></i>';
      likeBtn.addEventListener('click', () => showToast('Thanks for your feedback!', 'smile'));
      actionBar.appendChild(likeBtn);

      wrapper.appendChild(actionBar);
    }

    if (!isUser) row.appendChild(avatar);
    row.appendChild(wrapper);
    messagesContainer.appendChild(row);

    if (animate && !isUser) {
      isStreaming = true;
      let currentIdx = 0;
      const rawText = text;
      contentDiv.innerHTML = '<span class="streaming-cursor"></span>';

      const interval = setInterval(() => {
        currentIdx += Math.floor(Math.random() * 4) + 2;
        if (currentIdx >= rawText.length) {
          clearInterval(interval);
          isStreaming = false;
          contentDiv.innerHTML = formatRichMarkdown(rawText);
          addCodeCopyButtons(contentDiv);
          lucide.createIcons();
          scrollCanvasToBottom();
          if (ttsEnabled) toggleSpeech(rawText, null, lang);
        } else {
          const slice = rawText.substring(0, currentIdx);
          contentDiv.innerHTML = formatRichMarkdown(slice) + '<span class="streaming-cursor"></span>';
          scrollCanvasToBottom();
        }
      }, 18);
    } else {
      contentDiv.innerHTML = formatRichMarkdown(text);
      addCodeCopyButtons(contentDiv);
    }

    lucide.createIcons();
    scrollCanvasToBottom();
  }

  function formatRichMarkdown(text) {
    if (!text) return '';
    return marked.parse(text);
  }

  function addCodeCopyButtons(container) {
    container.querySelectorAll('pre').forEach(pre => {
      if (pre.querySelector('.code-header')) return;
      const code = pre.querySelector('code');
      const lang = (code.className.match(/language-(\w+)/) || [, 'code'])[1];

      const header = document.createElement('div');
      header.className = 'code-header';
      header.innerHTML = `
        <span>${lang}</span>
        <button class="copy-code-btn"><i data-lucide="copy" style="width:12px;height:12px;"></i> Copy</button>
      `;

      header.querySelector('.copy-code-btn').addEventListener('click', () => {
        navigator.clipboard.writeText(code.innerText);
        showToast('Code copied!', 'check');
      });

      pre.insertBefore(header, code);
    });
  }

  function scrollCanvasToBottom() {
    chatCanvas.scrollTop = chatCanvas.scrollHeight;
  }

  // ============================================================
  // CLIENT-SIDE NLP & ML INTENT ENGINE (For GitHub Pages Static Deploy)
  // ============================================================
  function clientProcessNLP(rawText) {
    const text = rawText.trim();
    const lower = text.toLowerCase();

    // 1. Math Evaluator
    const mathMatch = lower.match(/(?:calc|calculate|what is|solve)?\s*([0-9\.\+\-\*\/\^\(\)\s%sqrt]+)/);
    if ((lower.startsWith('calc') || lower.includes('calculate') || /^[0-9\s\+\-\*\/\(\)]+$/.test(lower)) && mathMatch) {
      try {
        let expr = lower.replace(/^(?:calc|calculate|what is|solve)\s*/, '')
                        .replace(/sqrt\(([^)]+)\)/g, 'Math.sqrt($1)')
                        .replace(/\^/g, '**');
        let res = Function(`'use strict'; return (${expr})`)();
        if (typeof res === 'number' && !isNaN(res)) {
          return {
            text: `🧮 **Calculation Result:**\n\`${rawText}\` = **${res}**`,
            confidence: 1.0,
            matchType: 'RULE_MATH',
            language: 'en'
          };
        }
      } catch (e) {}
    }

    // 2. Date & Time
    if (lower.includes('time') || lower.includes('samay') || lower.includes('kitne baje')) {
      const timeStr = new Date().toLocaleTimeString();
      return {
        text: `⏰ **Current Time:** **${timeStr}**`,
        confidence: 1.0,
        matchType: 'RULE_TIME',
        language: lower.includes('samay') ? 'hi' : 'en'
      };
    }
    if (lower.includes('date') || lower.includes('today') || lower.includes('tareekh') || lower.includes('tarik')) {
      const dateStr = new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      return {
        text: `📅 **Today's Date:** **${dateStr}**`,
        confidence: 1.0,
        matchType: 'RULE_DATE',
        language: 'en'
      };
    }

    // 3. User Name Memory
    const nameMatch = lower.match(/(?:my name is|i am|mera naam)\s+([a-zA-Z]+)/);
    if (nameMatch) {
      userName = nameMatch[1];
      localStorage.setItem('nexus_user_name', userName);
      return {
        text: `Nice to meet you, **${userName}**! 😊 I will remember your name for this session.`,
        confidence: 1.0,
        matchType: 'RULE_MEMORY',
        language: 'en'
      };
    }
    if (lower.includes('my name') || lower.includes('mera naam')) {
      if (userName) {
        return {
          text: `Your name is **${userName}**! 😊`,
          confidence: 1.0,
          matchType: 'RULE_MEMORY',
          language: 'en'
        };
      }
      return {
        text: `You haven't told me your name yet! Say *"My name is [your name]"*.`,
        confidence: 0.9,
        matchType: 'RULE_MEMORY',
        language: 'en'
      };
    }

    // 4. Intent Cosine / Jaccard Matching against Knowledge Base
    if (allKnowledgeBase && allKnowledgeBase.length > 0) {
      let bestMatch = null;
      let highestScore = 0;

      const userTokens = tokenize(lower);

      allKnowledgeBase.forEach(intent => {
        if (intent.patterns) {
          intent.patterns.forEach(pat => {
            const patTokens = tokenize(pat.toLowerCase());
            const score = computeSimilarity(userTokens, patTokens, lower, pat.toLowerCase());
            if (score > highestScore) {
              highestScore = score;
              bestMatch = intent;
            }
          });
        }
      });

      if (bestMatch && highestScore >= 0.35) {
        lastIntent = bestMatch.tag;
        const responses = bestMatch.responses || ["I understand your question."];
        const chosen = responses[Math.floor(Math.random() * responses.length)];
        return {
          text: chosen,
          confidence: Math.min(highestScore + 0.2, 0.99),
          matchType: 'CLIENT_NLP_MATCH',
          language: isHindiOrHinglish(lower) ? 'hi' : 'en'
        };
      }
    }

    // 5. Fallback Response
    return {
      text: `I understand you are asking about **"${text}"**.\n\nI can help you with:\n- ☕ **Java & Programming Concepts** (OOP, Collections, Threads, Python, SQL)\n- 🧠 **AI & Machine Learning** (NLP, Tokenization, TF-IDF Vectors)\n- 🧮 **Math Calculations** (e.g. \`calc 25 * 4 + 10\`)\n- 💼 **CodeAlfa Internship Guidelines**\n\nFeel free to rephrase or try one of the starter questions!`,
      confidence: 0.3,
      matchType: 'FALLBACK',
      language: 'en'
    };
  }

  function tokenize(str) {
    return str.replace(/[^a-zA-Z0-9\u0900-\u097F\s]/g, ' ')
              .split(/\s+/)
              .filter(w => w.length > 1);
  }

  function computeSimilarity(tokens1, tokens2, raw1, raw2) {
    if (raw1 === raw2) return 1.0;
    if (raw1.includes(raw2) || raw2.includes(raw1)) return 0.85;

    const set1 = new Set(tokens1);
    const set2 = new Set(tokens2);
    let intersection = 0;
    set1.forEach(t => { if (set2.has(t)) intersection++; });
    const union = new Set([...tokens1, ...tokens2]).size;
    return union > 0 ? intersection / union : 0;
  }

  function isHindiOrHinglish(str) {
    return /[\u0900-\u097F]/.test(str) || /\b(kya|hai|kaise|karo|batao|shukriya|namaste)\b/i.test(str);
  }

  // 4. Send Message Controller
  async function handleSendMessage(overrideText = null) {
    if (isStreaming) return;
    stopSpeaking();
    const text = overrideText || chatTextarea.value.trim();
    if (!text) return;

    chatTextarea.value = '';
    chatTextarea.style.height = 'auto';
    btnSend.disabled = true;

    let sess = getActiveSession();
    if (!sess) {
      sess = createNewSession(text);
    }

    sess.messages.push({ sender: 'user', text });
    saveSessions();
    renderMessageBubble('user', text);
    playSound('send');

    const typingBubble = document.createElement('div');
    typingBubble.id = 'typing-indicator-pill';
    typingBubble.className = 'chat-message-row bot';
    typingBubble.innerHTML = `
      <div class="msg-avatar">🤖</div>
      <div class="msg-wrapper">
        <div class="msg-bubble" style="padding:10px 16px;">
          <span style="font-size:0.86rem; color:var(--text-muted); display:flex; align-items:center; gap:8px;">
            <span class="streaming-cursor"></span> Thinking...
          </span>
        </div>
      </div>
    `;
    messagesContainer.appendChild(typingBubble);
    scrollCanvasToBottom();

    let handled = false;

    // Try backend Java API first
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text })
      });

      if (res.ok) {
        const data = await res.json();
        typingBubble.remove();
        sess.messages.push({
          sender: 'bot',
          text: data.text,
          confidence: data.confidence,
          matchType: data.matchType,
          lang: data.language
        });
        saveSessions();
        playSound('receive');
        renderMessageBubble('bot', data.text, data.confidence, data.matchType, data.language, true);
        handled = true;
      }
    } catch (e) {
      // Backend not running (e.g. GitHub Pages static deploy)
    }

    // Fallback to in-browser Client NLP
    if (!handled) {
      setTimeout(() => {
        typingBubble.remove();
        const data = clientProcessNLP(text);
        sess.messages.push({
          sender: 'bot',
          text: data.text,
          confidence: data.confidence,
          matchType: data.matchType,
          lang: data.language
        });
        saveSessions();
        playSound('receive');
        renderMessageBubble('bot', data.text, data.confidence, data.matchType, data.language, true);
      }, 400);
    }

    btnSend.disabled = false;
    chatTextarea.focus();
  }

  // 5. Starter Cards
  document.querySelectorAll('.simple-card').forEach(card => {
    card.addEventListener('click', () => {
      handleSendMessage(card.dataset.prompt);
    });
  });

  // 6. Clean, Natural Text-to-Speech Engine
  let availableVoices = [];

  function loadVoices() {
    if (!('speechSynthesis' in window)) return;
    availableVoices = window.speechSynthesis.getVoices() || [];
  }

  if ('speechSynthesis' in window) {
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }

  function cleanTextForSpeech(rawText) {
    if (!rawText) return '';
    try {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = marked.parse(rawText);
      tempDiv.querySelectorAll('pre, code').forEach(el => el.remove());
      let text = tempDiv.innerText || tempDiv.textContent || '';
      text = text.replace(/https?:\/\/\S+/g, '');
      text = text.replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '');
      text = text.replace(/[\*\#\_\~\[\]\(\)\{\}\<\>\|\\\/•\-\:\;\"\`\$\^\%]/g, ' ');
      text = text.replace(/\s+/g, ' ').trim();
      return text;
    } catch (e) {
      return rawText.replace(/[*#`_\[\]]/g, '').replace(/\s+/g, ' ').trim();
    }
  }

  function getBestVoice(targetLang) {
    if (!availableVoices || availableVoices.length === 0) {
      availableVoices = window.speechSynthesis.getVoices() || [];
    }

    const isHindi = targetLang.startsWith('hi');

    if (isHindi) {
      const hindiVoice = availableVoices.find(v => 
        (v.name.includes('Swara') || v.name.includes('Madhur') || v.name.includes('Google हिन्दी') || v.name.includes('Kalpana') || v.name.includes('Hemant')) && v.lang.startsWith('hi')
      ) || availableVoices.find(v => v.lang.startsWith('hi'));
      if (hindiVoice) return hindiVoice;
    }

    const englishVoice = availableVoices.find(v => 
      (v.name.includes('Neerja') || v.name.includes('Jenny') || v.name.includes('Natural') || v.name.includes('Google US English')) && (v.lang.startsWith('en-IN') || v.lang.startsWith('en'))
    ) || availableVoices.find(v => v.lang.startsWith('en-IN')) || availableVoices.find(v => v.lang.startsWith('en'));

    return englishVoice || availableVoices[0] || null;
  }

  function stopSpeaking() {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    isSpeaking = false;
    if (activeSpeakBtn) {
      activeSpeakBtn.innerHTML = '<i data-lucide="volume-2"></i>';
      activeSpeakBtn = null;
      lucide.createIcons();
    }
  }

  function toggleSpeech(text, btn = null, lang = 'en') {
    if (!('speechSynthesis' in window)) {
      showToast('Speech synthesis not supported', 'alert-triangle');
      return;
    }

    if (isSpeaking) {
      stopSpeaking();
      showToast('Audio stopped', 'volume-x');
      return;
    }

    stopSpeaking();
    const cleanPhoneticText = cleanTextForSpeech(text);
    if (!cleanPhoneticText) return;

    const utterance = new SpeechSynthesisUtterance(cleanPhoneticText);

    const selectedLang = langSelect.value !== 'auto' 
      ? langSelect.value 
      : (lang === 'hi' || lang === 'hinglish' ? 'hi-IN' : 'en-US');
    utterance.lang = selectedLang;

    const bestVoice = getBestVoice(selectedLang);
    if (bestVoice) {
      utterance.voice = bestVoice;
    }

    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    utterance.onstart = () => {
      isSpeaking = true;
      if (btn) {
        activeSpeakBtn = btn;
        btn.innerHTML = '<i data-lucide="square" style="color:#ef4444;"></i>';
        lucide.createIcons();
      }
    };

    utterance.onend = () => stopSpeaking();
    utterance.onerror = () => stopSpeaking();

    window.speechSynthesis.speak(utterance);
  }

  // 7. Voice Mic
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  let recognition = null;
  let isListening = false;

  if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      isListening = true;
      btnVoiceInput.classList.add('listening');
      showToast('Listening... Speak now (Click mic to stop)', 'mic');
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      chatTextarea.value = transcript;
      isListening = false;
      btnVoiceInput.classList.remove('listening');
      handleSendMessage();
    };

    recognition.onerror = () => {
      isListening = false;
      btnVoiceInput.classList.remove('listening');
    };

    recognition.onend = () => {
      isListening = false;
      btnVoiceInput.classList.remove('listening');
    };

    btnVoiceInput.addEventListener('click', () => {
      if (isListening) {
        recognition.stop();
        isListening = false;
        btnVoiceInput.classList.remove('listening');
        showToast('Voice input cancelled', 'mic-off');
      } else {
        const chosen = langSelect.value;
        recognition.lang = (chosen === 'auto' || chosen === 'hinglish') ? 'hi-IN' : chosen;
        try {
          recognition.start();
        } catch (e) {
          recognition.stop();
        }
      }
    });
  } else {
    btnVoiceInput.style.display = 'none';
  }

  // 8. Auto-growing Textarea & Enter to Send
  chatTextarea.addEventListener('input', () => {
    chatTextarea.style.height = 'auto';
    chatTextarea.style.height = (chatTextarea.scrollHeight) + 'px';
    btnSend.disabled = chatTextarea.value.trim().length === 0;
  });

  chatTextarea.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  });

  btnSend.addEventListener('click', () => handleSendMessage());

  // 9. New Chat (ChatGPT-style behavior)
  newChatBtn.addEventListener('click', () => {
    stopSpeaking();
    currentSessionId = null;
    localStorage.removeItem('nexus_current_session');
    messagesContainer.innerHTML = '';
    welcomeHero.style.display = 'flex';
    chatTextarea.value = '';
    btnSend.disabled = true;
    renderHistorySidebar();
    scrollCanvasToBottom();
  });

  btnClearHistory.addEventListener('click', () => {
    if (confirm('Clear all conversation history?')) {
      stopSpeaking();
      sessions = [];
      currentSessionId = null;
      saveSessions();
      loadCurrentSessionUI();
      showToast('All conversations cleared', 'trash');
    }
  });

  btnThemeToggle.addEventListener('click', () => {
    document.body.classList.toggle('theme-light');
    const isLight = document.body.classList.contains('theme-light');
    themeIcon.setAttribute('data-lucide', isLight ? 'moon' : 'sun');
    lucide.createIcons();
  });

  btnTtsToggle.addEventListener('click', () => {
    ttsEnabled = !ttsEnabled;
    ttsIcon.setAttribute('data-lucide', ttsEnabled ? 'volume-x' : 'volume-2');
    showToast(ttsEnabled ? 'Voice output enabled' : 'Voice output muted', 'volume-2');
    lucide.createIcons();
    if (!ttsEnabled) stopSpeaking();
  });

  btnSfxToggle.addEventListener('click', () => {
    sfxEnabled = !sfxEnabled;
    sfxIcon.setAttribute('data-lucide', sfxEnabled ? 'bell' : 'bell-off');
    showToast(sfxEnabled ? 'Sound effects enabled' : 'Sound effects muted', 'bell');
    lucide.createIcons();
  });

  btnExportMenu.addEventListener('click', () => {
    const sess = getActiveSession();
    if (!sess || !sess.messages || sess.messages.length === 0) {
      showToast('No messages to export', 'alert-circle');
      return;
    }
    let md = `# NexusAI Conversation Transcript\n**Date**: ${new Date().toLocaleString()}\n\n---\n\n`;
    sess.messages.forEach(m => {
      md += `### ${m.sender.toUpperCase()}\n${m.text}\n\n`;
    });
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nexus_transcript_${Date.now()}.md`;
    a.click();
    showToast('Transcript exported as Markdown!', 'download');
  });

  // 10. Knowledge Base Trainer Modal
  function openTrainerModal() {
    trainerModal.classList.add('active');
    loadKnowledgeBase();
  }

  btnOpenTrainer.addEventListener('click', openTrainerModal);
  if (btnOpenTrainerTop) btnOpenTrainerTop.addEventListener('click', openTrainerModal);

  btnCloseModal.addEventListener('click', () => trainerModal.classList.remove('active'));
  btnCancelTeach.addEventListener('click', () => trainerModal.classList.remove('active'));

  trainerModal.addEventListener('click', (e) => {
    if (e.target === trainerModal) trainerModal.classList.remove('active');
  });

  document.querySelectorAll('.modal-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.modal-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(tab.dataset.tab).classList.add('active');
    });
  });

  async function loadKnowledgeBase() {
    try {
      const res = await fetch('/api/faqs').catch(() => fetch('faqs.json'));
      if (res.ok) {
        const data = await res.json();
        allKnowledgeBase = data.intents || [];
        kbCount.textContent = allKnowledgeBase.length;
        renderKnowledgeBaseCards(allKnowledgeBase);
      }
    } catch (e) {
      try {
        const res2 = await fetch('faqs.json');
        if (res2.ok) {
          const data2 = await res2.json();
          allKnowledgeBase = data2.intents || [];
          kbCount.textContent = allKnowledgeBase.length;
          renderKnowledgeBaseCards(allKnowledgeBase);
        }
      } catch (err) {}
    }
  }

  function renderKnowledgeBaseCards(list) {
    kbCardsList.innerHTML = '';
    list.forEach(item => {
      const card = document.createElement('div');
      card.className = 'kb-card';
      const pats = item.patterns ? item.patterns.join(' • ') : '';
      const resp = item.responses && item.responses.length > 0 ? item.responses[0] : '';

      card.innerHTML = `
        <div class="kb-card-header">
          <span class="kb-tag">${item.tag}</span>
          <span class="kb-category">${item.category || 'General'}</span>
        </div>
        <div class="kb-patterns-preview">❓ <strong>Patterns:</strong> ${escapeHtml(pats)}</div>
        <div class="kb-response-preview">${escapeHtml(resp)}</div>
      `;
      kbCardsList.appendChild(card);
    });
  }

  kbSearchInput.addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase().trim();
    if (!q) {
      renderKnowledgeBaseCards(allKnowledgeBase);
      return;
    }
    const filtered = allKnowledgeBase.filter(k => 
      k.tag.toLowerCase().includes(q) ||
      (k.category && k.category.toLowerCase().includes(q)) ||
      (k.patterns && k.patterns.some(p => p.toLowerCase().includes(q))) ||
      (k.responses && k.responses.some(r => r.toLowerCase().includes(q)))
    );
    renderKnowledgeBaseCards(filtered);
  });

  teachForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const tag = document.getElementById('teach-tag').value.trim();
    const category = document.getElementById('teach-category').value.trim() || 'General';
    const patterns = document.getElementById('teach-patterns').value.split('\n').map(s => s.trim()).filter(Boolean);
    const responses = document.getElementById('teach-responses').value.split('\n').map(s => s.trim()).filter(Boolean);

    if (!tag || patterns.length === 0 || responses.length === 0) {
      alert('Please fill out all required fields.');
      return;
    }

    allKnowledgeBase.unshift({ tag, category, patterns, responses });
    showToast('🎉 Question saved and model updated!', 'sparkles');
    teachForm.reset();
    renderKnowledgeBaseCards(allKnowledgeBase);
    document.querySelector('[data-tab="kb-list-view"]').click();
  });

  // Preload Knowledge Base
  loadKnowledgeBase();

  // Initialize
  renderHistorySidebar();
  loadCurrentSessionUI();
});
