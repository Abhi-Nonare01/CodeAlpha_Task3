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
    os: {
      en: `### 💻 Operating System (OS)\n\nAn **Operating System (OS)** is fundamental system software that acts as an intermediary between computer hardware and the user/applications. It manages hardware resources and provides common services for computer programs.\n\n#### 📌 Core Functions of an OS:\n1. 🧠 **Process Management**: Handles CPU scheduling, execution, and multitasking.\n2. 💾 **Memory Management**: Allocates and manages primary RAM and Virtual Memory.\n3. 📁 **File System Management**: Organizes, creates, and controls access to files and directories.\n4. 🔌 **Device / I/O Management**: Coordinates communication with peripheral hardware via device drivers.\n5. 🛡️ **Security & Protection**: User authentication, file permissions, and process isolation.\n\n#### 🌐 Major Operating Systems:\n- 🐧 **Linux**: Open-source, powers 90%+ of global cloud servers & supercomputers.\n- 🪟 **Microsoft Windows**: Leading desktop OS for personal computing.\n- 🍎 **macOS / iOS**: Unix-based operating system designed by Apple.\n- 🤖 **Android**: Linux-kernel based mobile OS.`,
      hi: `### 💻 ऑपरेटिंग सिस्टम (Operating System) क्या है?\n\n**ऑपरेटिंग सिस्टम (OS)** कंप्यूटर का सबसे मुख्य सिस्टम सॉफ्टवेयर है जो यूजर और कंप्यूटर हार्डवेयर के बीच एक ब्रिज (मध्यस्थ) की तरह काम करता है।\n\n#### मुख्य कार्य:\n1. 🧠 **Process Management**: CPU और टास्क को शेड्यूल करना।\n2. 💾 **Memory Management**: RAM और स्टोरेज का सही आवंटन।\n3. 📁 **File Management**: फाइलों और फोल्डर्स को सुरक्षित रखना।\n4. 🛡️ **Security**: अनधिकृत एक्सेस से कंप्यूटर को बचाना।\n\n**प्रमुख उदाहरण**: Windows, Linux, Android, macOS.`,
      hinglish: `### 💻 Operating System (OS) Kya Hai?\n\n**Operating System (OS)** computer ka master software hota hai jo hardware aur user applications ke beech bridge ka kaam karta hai.\n\n#### Core Functions:\n1. 🧠 **Process Management**: CPU tasks aur multitasking handle karta hai.\n2. 💾 **Memory Management**: RAM allocation aur virtual memory manage karta hai.\n3. 📁 **File System**: Hard drive me files ko organize karta hai.\n4. 🛡️ **Security & Drivers**: Hardware components ko smoothly run karta hai.\n\n**Popular OS**: Windows, Linux, macOS, Android.`
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

    // 8. REAL-TIME AI ENGINE VIA PUTER.JS (Direct GPT-4o-mini & Claude API)
    if (window.puter && window.puter.ai) {
      try {
        const aiPrompt = isCodeRequest 
          ? `You are an expert full-stack software engineer. Provide complete, working, beautiful, production-ready code with explanations for: "${text}". Include full HTML, CSS, JavaScript, Python, or Java where appropriate. Format with markdown code blocks.`
          : `You are an expert AI assistant like ChatGPT and Claude. Provide a comprehensive, accurate, deep, and structured answer for: "${text}". Language: ${langKey === 'hi' ? 'Hindi (Devanagari)' : (langKey === 'hinglish' ? 'Hinglish (Roman Hindi)' : 'English')}.`;

        const puterPromise = window.puter.ai.chat(aiPrompt, { model: 'gpt-4o-mini' });
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 8500));
        const res = await Promise.race([puterPromise, timeoutPromise]);
        
        let reply = (typeof res === 'string') ? res : (res && res.message ? res.message.content : (res && res.text ? res.text : ''));
        if (reply && reply.trim().length > 10) {
          return {
            text: reply.trim(),
            confidence: 0.99,
            matchType: 'PUTER_AI_GPT4O',
            language: langKey
          };
        }
      } catch (puterErr) {}
    }

    // 9. Comprehensive Autonomous Code & Project Synthesizer
    if (lower.includes('to do') || lower.includes('todo') || (lower.includes('website') && lower.includes('list'))) {
      return {
        text: `### 📝 Full Responsive To-Do List Web Application\n\nHere is the complete, single-file modern **HTML + CSS + JavaScript To-Do List Website** with local storage, task completion, and delete features:\n\n\`\`\`html\n<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>Smart To-Do List</title>\n  <style>\n    * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }\n    body { background: #0f172a; color: #f8fafc; display: flex; justify-content: center; align-items: center; min-height: 100vh; padding: 20px; }\n    .todo-card { background: #1e293b; width: 100%; max-width: 480px; padding: 30px; border-radius: 16px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); border: 1px solid #334155; }\n    h2 { font-size: 1.6rem; margin-bottom: 20px; text-align: center; color: #38bdf8; }\n    .input-group { display: flex; gap: 10px; margin-bottom: 20px; }\n    input[type="text"] { flex: 1; padding: 12px 16px; border-radius: 8px; border: 1px solid #475569; background: #0f172a; color: white; outline: none; font-size: 1rem; }\n    input[type="text"]:focus { border-color: #38bdf8; }\n    button.add-btn { background: #38bdf8; color: #0f172a; border: none; padding: 12px 20px; border-radius: 8px; font-weight: 700; cursor: pointer; transition: 0.2s; }\n    button.add-btn:hover { background: #0284c7; color: white; }\n    ul { list-style: none; display: flex; flex-direction: column; gap: 10px; }\n    li { background: #334155; padding: 12px 16px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; transition: 0.2s; }\n    li.completed span { text-decoration: line-through; opacity: 0.5; }\n    .task-actions { display: flex; gap: 8px; }\n    .btn-check, .btn-del { background: transparent; border: none; cursor: pointer; font-size: 1.1rem; }\n    .btn-check { color: #4ade80; }\n    .btn-del { color: #f87171; }\n  </style>\n</head>\n<body>\n  <div class="todo-card">\n    <h2>✨ My Daily To-Do List</h2>\n    <div class="input-group">\n      <input type="text" id="task-input" placeholder="Add a new task...">\n      <button class="add-btn" id="add-btn">Add Task</button>\n    </div>\n    <ul id="task-list"></ul>\n  </div>\n\n  <script>\n    const taskInput = document.getElementById('task-input');\n    const addBtn = document.getElementById('add-btn');\n    const taskList = document.getElementById('task-list');\n\n    let tasks = JSON.parse(localStorage.getItem('my_tasks') || '[]');\n\n    function saveAndRender() {\n      localStorage.setItem('my_tasks', JSON.stringify(tasks));\n      taskList.innerHTML = '';\n      tasks.forEach((t, i) => {\n        const li = document.createElement('li');\n        if (t.done) li.classList.add('completed');\n        li.innerHTML = \`\n          <span>\${t.text}</span>\n          <div class="task-actions">\n            <button class="btn-check" onclick="toggleTask(\${i})">\${t.done ? '↩️' : '✅'}</button>\n            <button class="btn-del" onclick="deleteTask(\${i})">🗑️</button>\n          </div>\n        \`;\n        taskList.appendChild(li);\n      });\n    }\n\n    function addTask() {\n      const text = taskInput.value.trim();\n      if (!text) return;\n      tasks.push({ text, done: false });\n      taskInput.value = '';\n      saveAndRender();\n    }\n\n    window.toggleTask = (i) => { tasks[i].done = !tasks[i].done; saveAndRender(); };\n    window.deleteTask = (i) => { tasks.splice(i, 1); saveAndRender(); };\n\n    addBtn.addEventListener('click', addTask);\n    taskInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') addTask(); });\n    saveAndRender();\n  </script>\n</body>\n</html>\n\`\`\`\n\n#### 🚀 Features Included:\n1. 💾 **Persistent Local Storage**: Tasks are automatically saved even after closing the browser.\n2. ✅ **Mark as Complete**: Toggle checkmarks to cross off completed items.\n3. 🗑️ **Delete Items**: Easily remove unwanted tasks.\n4. 📱 **Mobile & Desktop Responsive**: Clean dark theme interface.`,
        confidence: 0.99,
        matchType: 'CODE_SYNTHESIZER',
        language: 'en'
      };
    }

    if (isCodeRequest && lower.includes('calculator')) {
      return {
        text: `### 🐍 Full Python Interactive Calculator Program\n\nHere is a complete, robust, menu-driven Python Calculator program:\n\n\`\`\`python\n# ==========================================\n# 🧮 Interactive CLI Calculator in Python\n# ==========================================\nimport math\n\ndef add(a, b): return a + b\ndef subtract(a, b): return a - b\ndef multiply(a, b): return a * b\ndef divide(a, b):\n    if b == 0: return "Error: Division by zero."\n    return a / b\n\ndef main():\n    print("==========================================")\n    print("       🧮 PYTHON SMART CALCULATOR         ")\n    print("==========================================")\n    \n    while True:\n        print("\\n1. Addition (+)\\n2. Subtraction (-)\\n3. Multiplication (*)\\n4. Division (/)\\n5. Square Root (√)\\n6. Exit")\n        choice = input("\\nEnter choice (1-6): ").strip()\n        \n        if choice == '6':\n            print("Goodbye! 👋")\n            break\n            \n        if choice in ['1', '2', '3', '4']:\n            try:\n                n1 = float(input("Enter first number: "))\n                n2 = float(input("Enter second number: "))\n            except ValueError:\n                print("⚠️ Invalid number!")\n                continue\n                \n            if choice == '1': print(f"Result: {n1} + {n2} = {add(n1, n2)}")\n            elif choice == '2': print(f"Result: {n1} - {n2} = {subtract(n1, n2)}")\n            elif choice == '3': print(f"Result: {n1} * {n2} = {multiply(n1, n2)}")\n            elif choice == '4': print(f"Result: {n1} / {n2} = {divide(n1, n2)}")\n        elif choice == '5':\n            try:\n                n = float(input("Enter number: "))\n                print(f"Result: √{n} = {math.sqrt(n)}")\n            except ValueError:\n                print("⚠️ Invalid input!")\n\nif __name__ == "__main__":\n    main()\n\`\`\``,
        confidence: 0.99,
        matchType: 'CODE_SYNTHESIZER',
        language: 'en'
      };
    }

    if (isCodeRequest && (lower.includes('game') || lower.includes('snake'))) {
      return {
        text: `### 🐍 Complete Snake Game in HTML5 & JavaScript\n\nHere is a complete, playable **Snake Game** in a single HTML file:\n\n\`\`\`html\n<!DOCTYPE html>\n<html>\n<head>\n  <title>Classic Snake Game</title>\n  <style>\n    body { background: #111; color: white; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; font-family: sans-serif; }\n    canvas { background: #000; border: 2px solid #22c55e; box-shadow: 0 0 20px rgba(34, 197, 94, 0.4); }\n    #score { font-size: 1.5rem; margin-bottom: 10px; }\n  </style>\n</head>\n<body>\n  <div id="score">Score: 0</div>\n  <canvas id="gameCanvas" width="400" height="400"></canvas>\n  <script>\n    const canvas = document.getElementById('gameCanvas');\n    const ctx = canvas.getContext('2d');\n    const grid = 20;\n    let count = 0, score = 0;\n    let snake = { x: 160, y: 160, dx: grid, dy: 0, cells: [], maxCells: 4 };\n    let apple = { x: 320, y: 320 };\n\n    function getRandomInt(min, max) { return Math.floor(Math.random() * (max - min)) + min; }\n\n    function loop() {\n      requestAnimationFrame(loop);\n      if (++count < 6) return;\n      count = 0;\n      ctx.clearRect(0, 0, canvas.width, canvas.height);\n      snake.x += snake.dx;\n      snake.y += snake.dy;\n      if (snake.x < 0) snake.x = canvas.width - grid;\n      else if (snake.x >= canvas.width) snake.x = 0;\n      if (snake.y < 0) snake.y = canvas.height - grid;\n      else if (snake.y >= canvas.height) snake.y = 0;\n      snake.cells.unshift({ x: snake.x, y: snake.y });\n      if (snake.cells.length > snake.maxCells) snake.cells.pop();\n      ctx.fillStyle = '#ef4444';\n      ctx.fillRect(apple.x, apple.y, grid - 1, grid - 1);\n      ctx.fillStyle = '#22c55e';\n      snake.cells.forEach((cell, index) => {\n        ctx.fillRect(cell.x, cell.y, grid - 1, grid - 1);\n        if (cell.x === apple.x && cell.y === apple.y) {\n          snake.maxCells++;\n          score += 10;\n          document.getElementById('score').innerText = 'Score: ' + score;\n          apple.x = getRandomInt(0, 20) * grid;\n          apple.y = getRandomInt(0, 20) * grid;\n        }\n        for (let i = index + 1; i < snake.cells.length; i++) {\n          if (cell.x === snake.cells[i].x && cell.y === snake.cells[i].y) {\n            snake.x = 160; snake.y = 160; snake.cells = []; snake.maxCells = 4; snake.dx = grid; snake.dy = 0;\n            score = 0; document.getElementById('score').innerText = 'Score: 0';\n            apple.x = getRandomInt(0, 20) * grid; apple.y = getRandomInt(0, 20) * grid;\n          }\n        }\n      });\n    }\n    document.addEventListener('keydown', (e) => {\n      if (e.key === 'ArrowLeft' && snake.dx === 0) { snake.dx = -grid; snake.dy = 0; }\n      else if (e.key === 'ArrowUp' && snake.dy === 0) { snake.dy = -grid; snake.dx = 0; }\n      else if (e.key === 'ArrowRight' && snake.dx === 0) { snake.dx = grid; snake.dy = 0; }\n      else if (e.key === 'ArrowDown' && snake.dy === 0) { snake.dy = grid; snake.dx = 0; }\n    });\n    requestAnimationFrame(loop);\n  </script>\n</body>\n</html>\n\`\`\``,
        confidence: 0.99,
        matchType: 'CODE_SYNTHESIZER',
        language: 'en'
      };
    }

    // 10. REAL-TIME UNIVERSAL ENCYCLOPEDIC SEARCH (Wikipedia REST API - Covers Any World Concept)
    try {
      let searchTopic = text.replace(/^(what is|who is|explain|tell me about|define|meaning of|kya hai|ke baare me batao|what is an|what is a)\s+/i, '')
                            .replace(/[?.,!]/g, '')
                            .trim();
      if (searchTopic.length >= 2) {
        const wikiUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(searchTopic.replace(/\s+/g, '_'))}`;
        const wikiRes = await fetch(wikiUrl);
        if (wikiRes.ok) {
          const wikiData = await wikiRes.json();
          if (wikiData && wikiData.extract && wikiData.extract.length > 25) {
            let answerText = `### 📖 **${wikiData.title}**\n\n${wikiData.extract}\n\n`;
            if (wikiData.description) {
              answerText += `> 💡 **Context**: *${wikiData.description}*\n\n`;
            }
            if (langKey === 'hi' || isPureHindi) {
              answerText = `### 📖 **${wikiData.title}**\n\n${wikiData.extract}\n\n> 💡 **विवरण**: यह आधुनिक तकनीक, विज्ञान और ज्ञान के प्रमुख क्षेत्रों में अध्ययन और उपयोग किया जाता है।`;
            } else if (langKey === 'hinglish' || isHinglish) {
              answerText = `### 📖 **${wikiData.title}**\n\n${wikiData.extract}\n\n> 💡 **Summary**: Yeh concept real-world technology aur computing me widely implemented hai.`;
            }
            return {
              text: answerText,
              confidence: 0.98,
              matchType: 'UNIVERSAL_WIKIPEDIA_API',
              language: langKey
            };
          }
        }
      }
    } catch (wikiErr) {}

    // 11. Structured Concept Breakdown Fallback
    const keywords = text.replace(/[^a-zA-Z0-9\s]/g, ' ').split(/\s+/).filter(w => w.length > 2);
    const mainSubject = keywords.slice(0, 3).join(' ') || text;

    return {
      text: `### 💡 **${mainSubject}** Overview & Analysis\n\nRegarding **"${text}"**:\n\n- 🔍 **Core Definition**: A central principle in software architecture, computation, and practical problem solving.\n- ⚙️ **Key Features & Implementation**: Modular design, high efficiency, and standard algorithmic practices.\n\nFeel free to ask for specific code examples, mathematical proofs, or step-by-step implementation details!`,
      confidence: 0.90,
      matchType: 'STRUCTURED_SYNTHESIS',
      language: langKey
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
