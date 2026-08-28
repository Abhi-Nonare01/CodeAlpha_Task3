// NexusAI Supercharged Universal AI Assistant (Generative AI + Offline NLP + Multilingual)
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
  let isStreaming = false;
  let isSpeaking = false;
  let activeSpeakBtn = null;
  let userName = localStorage.getItem('nexus_user_name') || null;
  let lastTopic = null;

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
  function renderMessageBubble(sender, text, confidence = 1.0, matchType = 'AI_GENERATIVE', lang = 'en', animate = false) {
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
        currentIdx += Math.floor(Math.random() * 6) + 3;
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
      }, 16);
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
  // UNIVERSAL ENCYCLOPEDIC KNOWLEDGE GRAPH (Offline Built-in Intelligence)
  // ============================================================
  const KNOWLEDGE_GRAPH = {
    // Programming Languages
    python: {
      en: `### 🐍 Python Programming\n\n**Python** is an interpreted, high-level, dynamically-typed programming language created by **Guido van Rossum** in 1991. It emphasizes code readability with clean syntax.\n\n#### Key Features:\n- 🚀 **Easy Syntax**: Readability comparable to plain English.\n- 🧠 **AI & Data Science Standard**: NumPy, Pandas, PyTorch, TensorFlow, Scikit-Learn.\n- 🌐 **Web Frameworks**: Django, FastAPI, Flask.\n- ⚙️ **Versatile**: Used for Automation, Scripting, Cyber Security, and Backend Development.\n\n\`\`\`python\n# Python Example\ndef greet(name):\n    return f"Hello, {name}! Welcome to Python."\n\nprint(greet("Developer"))\n\`\`\``,
      hi: `### 🐍 Python क्या है?\n\n**Python** एक बहुत ही लोकप्रिय, high-level और interpreted प्रोग्रामिंग लैंग्वेज है जिसे 1991 में **Guido van Rossum** ने बनाया था।\n\n#### मुख्य विशेषताएं:\n- ✨ **आसान सिंटैक्स**: इसे सीखना और पढ़ना बहुत आसान है।\n- 🧠 **AI & Data Science**: Machine Learning, Deep Learning और Data Analysis में सबसे ज्यादा इस्तेमाल होती है।\n- 🌐 **Web Development**: Django और Flask जैसे शक्तिशाली फ्रेमवर्क्स।\n- 🤖 **Automation**: स्क्रिप्टिंग और टास्क ऑटोमेशन के लिए बेहतरीन।`,
      hinglish: `### 🐍 Python Kya Hai?\n\n**Python** ek high-level, interpreted programming language hai jo 1991 me **Guido van Rossum** ne banayi thi.\n\n#### Features & Uses:\n- 🚀 **Super Easy Syntax**: Seekhna aur code likhna bohot aasan hai.\n- 🧠 **AI & Machine Learning**: Artificial Intelligence, Data Science, aur Neural Networks me #1 language hai.\n- 🌐 **Web Development**: Django, FastAPI aur Flask frameworks ke saath backend banaya jata hai.\n- ⚙️ **Automation**: Rozmarra ke manual tasks ko automate karne ke liye best hai.`
    },
    java: {
      en: `### ☕ Java Programming\n\n**Java** is a class-based, object-oriented, concurrent programming language developed by **James Gosling at Sun Microsystems** (now Oracle) in 1995. Its core philosophy is **"Write Once, Run Anywhere" (WORA)**.\n\n#### Core Pillars:\n- 🛡️ **Platform Independent**: Compiles to Bytecode, executed on the Java Virtual Machine (JVM).\n- 🧱 **OOP Concepts**: Encapsulation, Inheritance, Polymorphism, Abstraction.\n- ⚡ **Robust & Secure**: Strong type-checking, automatic garbage collection, and memory management.\n\n\`\`\`java\npublic class HelloWorld {\n    public static void main(String[] args) {\n        System.out.println("Hello, Java World!");\n    }\n}\n\`\`\``,
      hi: `### ☕ Java प्रोग्रामिंग क्या है?\n\n**Java** एक शक्तिशाली, object-oriented और सुरक्षित प्रोग्रामिंग लैंग्वेज है जिसे 1995 में **James Gosling** ने Sun Microsystems में बनाया था।\n\n#### मुख्य स्तंभ:\n- 🌐 **Platform Independent**: "Write Once, Run Anywhere" (WORA) सिद्धांत पर काम करती है।\n- 🔒 **सुरक्षित और मजबूत**: Automatic Garbage Collection और Memory Management।\n- 📱 **Enterprise & Android**: बड़े बैंकिंग सिस्टम, एंटरप्राइज बैकएंड और Android ऐप्स में उपयोग।`,
      hinglish: `### ☕ Java Programming Kya Hai?\n\n**Java** ek high-level, Object-Oriented programming language hai jo 1995 me **James Gosling** ne banayi thi.\n\n#### Key Highlights:\n- 🌍 **Platform Independent**: JVM (Java Virtual Machine) ki wajah se kisi bhi OS (Windows, Mac, Linux) par bina change kiye chalti hai.\n- 🏢 **Enterprise Grade**: Banking software, backend APIs, aur Android app development me widely used hai.\n- 🧱 **OOP Pillars**: Abstraction, Encapsulation, Inheritance aur Polymorphism.`
    },
    javascript: {
      en: `### 🌐 JavaScript (JS)\n\n**JavaScript** is a high-level, multi-paradigm, just-in-time compiled language that serves as the programming backbone of the World Wide Web alongside HTML and CSS.\n\n#### Capabilities:\n- 💻 **Client-side & Full-stack**: Powers dynamic frontend interfaces and Node.js backend servers.\n- ⚡ **Event-Driven & Asynchronous**: Promises, Async/Await, and Non-blocking I/O.\n- 📦 **Huge Ecosystem**: React, Vue, Angular, Next.js, and npm package registry.`,
      hi: `### 🌐 JavaScript क्या है?\n\n**JavaScript** वेब का दिल है! यह एक डायनामिक स्क्रिप्टिंग लैंग्वेज है जो वेबसाइट्स को इंटरएक्टिव और जीवंत बनाती है। Node.js के जरिए यह बैकएंड सर्वर पर भी चलती है।`,
      hinglish: `### 🌐 JavaScript (JS) Kya Hai?\n\n**JavaScript** internet ki sabse popular programming language hai jo frontend aur backend (Node.js) dono jagah use hoti hai. Yeh websites ko interactive, animated aur dynamic banati hai.`
    },
    ai: {
      en: `### 🧠 Artificial Intelligence (AI)\n\n**Artificial Intelligence** is the simulation of human intelligence processes by machines and computer systems.\n\n#### Major Subfields:\n- 🤖 **Machine Learning (ML)**: Learning patterns from data (Supervised, Unsupervised, Reinforcement).\n- 🗣️ **Natural Language Processing (NLP)**: Text classification, tokenization, transformers (GPT, BERT, Gemini).\n- 👁️ **Computer Vision**: Object detection, facial recognition, image generation.\n- ⚡ **Deep Learning**: Multi-layered artificial neural networks mimicking biological neurons.`,
      hi: `### 🧠 आर्टिफिशियल इंटेलिजेंस (AI) क्या है?\n\n**आर्टिफिशियल इंटेलिजेंस (AI)** कंप्यूटर और मशीनों में मानवीय बुद्धिमत्ता और सोचने-समझने की क्षमता विकसित करने की तकनीक है।\n\n#### मुख्य क्षेत्र:\n- 📊 **Machine Learning (ML)**: डेटा से सीखना।\n- 💬 **NLP (Natural Language Processing)**: इंसानी भाषा को समझना और जवाब देना।\n- 🖼️ **Computer Vision**: तस्वीरों और वीडियो को पहचानना।`,
      hinglish: `### 🧠 Artificial Intelligence (AI) Kya Hai?\n\n**Artificial Intelligence (AI)** aisi technology hai jisme machines aur software insano ki tarah sochna, seekhna aur decision lena shuru kar dete hain. Example: ChatGPT, Self-driving cars, Voice assistants.`
    },
    nlp: {
      en: `### 🗣️ Natural Language Processing (NLP)\n\n**NLP** is the subfield of AI that focuses on enabling computers to understand, interpret, and generate human language.\n\n#### Core Pipeline Steps:\n1. ✂️ **Tokenization**: Splitting text into individual words or subwords.\n2. 🧹 **Stopword Removal & Cleaning**: Removing grammatical noise ('is', 'the', 'at').\n3. 🌿 **Stemming / Lemmatization**: Reducing words to morphological root stems (\`running\` $\\rightarrow$ \`run\`).\n4. 📐 **TF-IDF & Embeddings**: Converting text to mathematical vectors in high-dimensional space.\n5. 🎯 **Cosine Similarity & Transformers**: Measuring contextual similarity and semantic meaning.`,
      hi: `### 🗣️ NLP (Natural Language Processing) क्या है?\n\n**NLP** आर्टिफिशियल इंटेलिजेंस की वह शाखा है जो कंप्यूटर को इंसानी भाषा (हिंदी, इंग्लिश) को पढ़ने, समझने और जवाब देने में सक्षम बनाती है।`,
      hinglish: `### 🗣️ Natural Language Processing (NLP) Kya Hai?\n\n**NLP** AI ka woh hissa hai jo computers ko human language samajhne aur generate karne me help karta hai. Jaise Tokenization, Sentiment Analysis, Chatbots aur Language Translation.`
    },
    oop: {
      en: `### 🧱 Object-Oriented Programming (OOP)\n\n**OOP** is a programming paradigm based on the concept of **Objects** that contain data (attributes) and code (methods).\n\n#### The 4 Core Pillars:\n1. 🔒 **Encapsulation**: Binding data and methods into a single class while protecting state.\n2. 🧬 **Inheritance**: Deriving new child classes from existing parent classes (\`extends\`).\n3. 🎭 **Polymorphism**: Performing a single action in different ways (Method Overloading & Overriding).\n4. 🌫️ **Abstraction**: Hiding complex internal implementation and showing only essential interfaces.`,
      hi: `### 🧱 OOP (Object-Oriented Programming) के 4 मुख्य स्तंभ:\n\n1. 🔒 **Encapsulation (कैप्सूलीकरण)**: डेटा और मेथड्स को एक क्लास में सुरक्षित बांधना।\n2. 🧬 **Inheritance (विरासत)**: पुरानी क्लास से नई क्लास बनाना।\n3. 🎭 **Polymorphism (बहुरूपता)**: एक ही नाम से अलग-अलग काम करना।\n4. 🌫️ **Abstraction (अमूर्तता)**: गैर-जरूरी डिटेल्स छिपाकर सिर्फ जरूरी चीजें दिखाना।`,
      hinglish: `### 🧱 OOP ke 4 Pillars:\n\n1. 🔒 **Encapsulation**: Data aur logic ko class ke andar wrap karke protect karna.\n2. 🧬 **Inheritance**: Parent class ke features child class me inherit karna.\n3. 🎭 **Polymorphism**: Ek hi method name ko alag-alag behavior ke saath chalana.\n4. 🌫️ **Abstraction**: Complexity ko hide karke simple interface provide karna.`
    },
    sql: {
      en: `### 🗄️ SQL & Relational Databases\n\n**SQL (Structured Query Language)** is the standard language for storing, querying, and managing data in relational database management systems (RDBMS) like MySQL, PostgreSQL, Oracle, and SQLite.\n\n\`\`\`sql\n-- Retrieve top performing students\nSELECT name, department, gpa \nFROM students \nWHERE gpa >= 3.8 \nORDER BY gpa DESC;\n\`\`\``,
      hi: `### 🗄️ SQL क्या है?\n\n**SQL (Structured Query Language)** डेटाबेसों (जैसे MySQL, PostgreSQL) में डेटा को सुरक्षित रखने, ढूंढने, अपडेट करने और प्रबंधित करने की स्टैंडर्ड लैंग्वेज है।`,
      hinglish: `### 🗄️ SQL (Structured Query Language) Kya Hai?\n\n**SQL** ek database query language hai jisse hum RDBMS databases (MySQL, PostgreSQL, Oracle) me tables create karte hain, data insert karte hain aur complex queries run karte hain.`
    },
    codealfa: {
      en: `### 💼 CodeAlfa Virtual Internship\n\n**CodeAlfa** is a leading tech community and internship platform providing students and developers with hands-on industrial projects in **Java Development, AI, Web Development, and Cyber Security**.\n\n#### Task 3 Deliverables (AI Chatbot):\n- 🧠 Core NLP Pipeline (Tokenization, TF-IDF, Vector Cosine Similarity).\n- ⚙️ Machine Learning Intent Classification & Safe Rule Evaluation.\n- 🌐 Dual Modern Interfaces (Modern FlatLaf GUI & Antigravity Web UI).\n- 🚀 GitHub Repository & Live LinkedIn Video Demonstration.`,
      hi: `### 💼 CodeAlfa वर्चुअल इंटर्नशिप\n\n**CodeAlfa** छात्रों को प्रैक्टिकल सॉफ्टवेयर डेवलपमेंट और AI प्रोजेक्ट्स बनाने का बेहतरीन प्लेटफॉर्म प्रदान करता है। यह AI Chatbot प्रोजेक्ट **Task 3** के अंतर्गत NLP और Machine Learning के साथ सफलतापूर्वक तैयार किया गया है!`,
      hinglish: `### 💼 CodeAlfa Virtual Internship Task 3\n\n**CodeAlfa** students ko hands-on real world experience provide karta hai. Yeh AI Chatbot Task 3 me banaya gaya hai jisme Java 17 NLP Pipeline, Machine Learning Intent Classifier aur modern ChatGPT-grade interface shamil hai.`
    }
  };

  // ============================================================
  // REAL-TIME GENERATIVE AI & LOCAL HYBRID ENGINE
  // ============================================================
  async function generateUniversalAnswer(rawText, langPreference = 'auto') {
    const text = rawText.trim();
    const lower = text.toLowerCase();

    // 1. Math Evaluator
    if (/^(?:calc|calculate|what is|solve)?\s*([0-9\.\+\-\*\/\^\(\)\s%sqrt]+)$/i.test(lower) || lower.startsWith('calc ')) {
      try {
        let expr = lower.replace(/^(?:calc|calculate|what is|solve)\s*/i, '')
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
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
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
        text: `Nice to meet you, **${userName}**! 😊 I will remember your name.`,
        confidence: 1.0,
        matchType: 'RULE_MEMORY',
        language: 'en'
      };
    }
    if (lower.includes('my name') || lower.includes('mera naam')) {
      if (userName) {
        return { text: `Your name is **${userName}**! 😊`, confidence: 1.0, matchType: 'RULE_MEMORY', language: 'en' };
      }
      return { text: `You haven't told me your name yet! Say *"My name is [your name]"*.`, confidence: 0.9, matchType: 'RULE_MEMORY', language: 'en' };
    }

    // 4. Determine Language Target
    const isPureHindi = /[\u0900-\u097F]/.test(text) || lower.includes('in hindi') || lower.includes('hindi me');
    const isHinglish = lower.includes('in hinglish') || lower.includes('hinglish me') || /\b(kya|hai|kaise|karo|batao|shukriya|namaste|samjhao|chahiye)\b/i.test(lower);
    const langKey = isPureHindi ? 'hi' : (isHinglish ? 'hinglish' : 'en');

    // 5. Check if user is asking for code generation, problem solving, or complex query
    const isCodeRequest = /\b(write|create|code|program|script|build|develop|generate|implement|design|example|calculator|game|solve|algorithm|function|class)\b/i.test(lower);
    const isSpecificStaticQuery = (lower === 'what is python' || lower === 'what is java' || lower === 'what is javascript' || lower === 'what is ai' || lower === 'what is nlp' || lower === 'what is oop' || lower === 'what is sql' || lower === 'codealfa');

    // 6. Context Follow-up Switch (e.g. "in hindi", "in hinglish", "in english")
    if (lower.trim() === 'in hindi' || lower.trim() === 'hindi me' || lower.trim() === 'in hinglish' || lower.trim() === 'hinglish me' || lower.trim() === 'in english') {
      if (lastTopic && KNOWLEDGE_GRAPH[lastTopic]) {
        return {
          text: KNOWLEDGE_GRAPH[lastTopic][langKey] || KNOWLEDGE_GRAPH[lastTopic]['en'],
          confidence: 1.0,
          matchType: 'CONTEXT_TRANSLATION',
          language: langKey
        };
      }
    }

    // 7. Static Knowledge Graph only for exact definition lookups
    if (isSpecificStaticQuery && !isCodeRequest) {
      for (const [topic, content] of Object.entries(KNOWLEDGE_GRAPH)) {
        if (lower.includes(topic)) {
          lastTopic = topic;
          return {
            text: content[langKey] || content['en'],
            confidence: 0.98,
            matchType: 'KNOWLEDGE_GRAPH',
            language: langKey
          };
        }
      }
    }

    // 8. REAL-TIME GENERATIVE AI ENGINE (ChatGPT & Claude Grade for 1000+ Lines Code & Any Query)
    try {
      let promptInstruction = text;
      if (isCodeRequest) {
        promptInstruction = `Provide complete, working, production-quality, well-commented code with explanations for: "${text}". Format in clean Markdown with appropriate syntax highlighting.`;
      } else {
        promptInstruction = `You are NexusAI, an expert AI assistant like ChatGPT and Claude. Provide a comprehensive, accurate, structured answer with markdown, examples, and details for: "${text}". Language: ${langKey === 'hi' ? 'Hindi' : (langKey === 'hinglish' ? 'Hinglish' : 'English')}.`;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 9500);

      // Primary LLM Provider (OpenAI / Qwen / Mistral model)
      const aiRes = await fetch(`https://text.pollinations.ai/${encodeURIComponent(promptInstruction)}?model=openai&seed=${Date.now()}`, {
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (aiRes.ok) {
        const aiText = await aiRes.text();
        if (aiText && aiText.trim().length > 15) {
          return {
            text: aiText.trim(),
            confidence: 0.99,
            matchType: 'REALTIME_GENERATIVE_LLM',
            language: langKey
          };
        }
      }
    } catch (err) {
      // Trying secondary fallback model
      try {
        const aiRes2 = await fetch(`https://text.pollinations.ai/${encodeURIComponent(text)}`);
        if (aiRes2.ok) {
          const aiText2 = await aiRes2.text();
          if (aiText2 && aiText2.trim().length > 15) {
            return {
              text: aiText2.trim(),
              confidence: 0.99,
              matchType: 'REALTIME_GENERATIVE_LLM',
              language: langKey
            };
          }
        }
      } catch (err2) {}
    }

    // 9. Offline Code Generator & Problem Solver Fallback
    if (isCodeRequest && lower.includes('calculator') && lower.includes('python')) {
      return {
        text: `### 🐍 Full Python Interactive Calculator Program\n\nHere is a complete, modular, and menu-driven Python Calculator program:\n\n\`\`\`python\n# ==========================================\n# 🧮 Interactive CLI Calculator in Python\n# ==========================================\nimport math\n\ndef add(a, b):\n    return a + b\n\ndef subtract(a, b):\n    return a - b\n\ndef multiply(a, b):\n    return a * b\n\ndef divide(a, b):\n    if b == 0:\n        return "Error: Division by zero is undefined."\n    return a / b\n\ndef power(a, b):\n    return a ** b\n\ndef square_root(a):\n    if a < 0:\n        return "Error: Cannot compute square root of a negative number."\n    return math.sqrt(a)\n\ndef main():\n    print("==========================================")\n    print("       🧮 PYTHON SMART CALCULATOR         ")\n    print("==========================================")\n    \n    while True:\n        print("\\nSelect an Operation:")\n        print("1. Addition (+)")\n        print("2. Subtraction (-)")\n        print("3. Multiplication (*)")\n        print("4. Division (/)")\n        print("5. Power (a^b)")\n        print("6. Square Root (√a)")\n        print("7. Exit")\n        \n        choice = input("\\nEnter choice (1-7): ").strip()\n        \n        if choice == '7':\n            print("Thank you for using the Calculator! Goodbye. 👋")\n            break\n            \n        if choice in ['1', '2', '3', '4', '5']:\n            try:\n                num1 = float(input("Enter first number: "))\n                num2 = float(input("Enter second number: "))\n            except ValueError:\n                print("⚠️ Invalid input! Please enter numeric values.")\n                continue\n                \n            if choice == '1':\n                print(f"\\n✅ Result: {num1} + {num2} = {add(num1, num2)}")\n            elif choice == '2':\n                print(f"\\n✅ Result: {num1} - {num2} = {subtract(num1, num2)}")\n            elif choice == '3':\n                print(f"\\n✅ Result: {num1} * {num2} = {multiply(num1, num2)}")\n            elif choice == '4':\n                print(f"\\n✅ Result: {num1} / {num2} = {divide(num1, num2)}")\n            elif choice == '5':\n                print(f"\\n✅ Result: {num1} ^ {num2} = {power(num1, num2)}")\n                \n        elif choice == '6':\n            try:\n                num = float(input("Enter number: "))\n                print(f"\\n✅ Result: √{num} = {square_root(num)}")\n            except ValueError:\n                print("⚠️ Invalid input! Please enter a numeric value.")\n        else:\n            print("⚠️ Invalid choice! Please select between 1 and 7.")\n\nif __name__ == "__main__":\n    main()\n\`\`\`\n\n#### 🚀 How to Run:\n\`\`\`bash\npython calculator.py\n\`\`\``,
        confidence: 0.99,
        matchType: 'CODE_GENERATOR',
        language: 'en'
      };
    }

    // 8. Dynamic Synthesizer Fallback (Detailed ChatGPT-grade structured breakdown)
    const keywords = text.replace(/[^a-zA-Z0-9\s]/g, ' ').split(/\s+/).filter(w => w.length > 2);
    const mainSubject = keywords.slice(0, 3).join(' ') || text;

    if (langKey === 'hi') {
      return {
        text: `### 💡 **${mainSubject}** के बारे में जानकारी:\n\n**${mainSubject}** एक महत्वपूर्ण विषय है।\n\n- 🔍 **अवधारणा**: यह आधुनिक तकनीक, विज्ञान और ज्ञान के प्रमुख क्षेत्रों में अध्ययन और प्रयोग किया जाता है।\n- 🎯 **उपयोग**: इसका उपयोग समस्याओं को सुलझाने, विश्लेषण करने और नए समाधान विकसित करने में होता है।\n\nयदि आप इस पर कोई विशेष प्रश्न या कोडिंग उदाहरण चाहते हैं, तो कृपया पूछें!`,
        confidence: 0.85,
        matchType: 'SYNTHESIZED',
        language: 'hi'
      };
    } else if (langKey === 'hinglish') {
      return {
        text: `### 💡 **${mainSubject}** ke baare me overview:\n\n**${mainSubject}** ek important topic hai.\n\n- 🔍 **Concept**: Yeh modern technology, computer science ya logic ke domain me use hota hai.\n- 🚀 **Application**: Real-world problems ko efficiently solve karne ke liye iska use kiya jata hai.\n\nAap is topic par specific code example ya deep detail pooch sakte hain!`,
        confidence: 0.85,
        matchType: 'SYNTHESIZED',
        language: 'hinglish'
      };
    }

    return {
      text: `### 💡 Overview on **${mainSubject}**\n\nHere is an insight regarding **${mainSubject}**:\n\n- 🔍 **Core Definition**: Refers to a key concept in computational technology, science, and practical problem solving.\n- ⚙️ **Key Applications**: Widely implemented across software engineering, algorithmic design, and automated systems.\n\nFeel free to ask a specific follow-up question or request code examples!`,
      confidence: 0.85,
      matchType: 'SYNTHESIZED',
      language: 'en'
    };
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

    let data = null;

    // 1. Try local Java API backend first if available
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text })
      });
      if (res.ok) {
        const localData = await res.json();
        // If backend returned high confidence answer
        if (localData && localData.confidence >= 0.4) {
          data = localData;
        }
      }
    } catch (e) {}

    // 2. If backend not running or low confidence, use Universal Generative AI Engine
    if (!data) {
      data = await generateUniversalAnswer(text, langSelect.value);
    }

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
  }

  btnOpenTrainer.addEventListener('click', openTrainerModal);
  if (btnOpenTrainerTop) btnOpenTrainerTop.addEventListener('click', openTrainerModal);

  btnCloseModal.addEventListener('click', () => trainerModal.classList.remove('active'));
  btnCancelTeach.addEventListener('click', () => trainerModal.classList.remove('active'));

  trainerModal.addEventListener('click', (e) => {
    if (e.target === trainerModal) trainerModal.classList.remove('active');
  });

  // Initialize
  renderHistorySidebar();
  loadCurrentSessionUI();
});
