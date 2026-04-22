// ===== DOM Elements =====
const chatMessages = document.getElementById('chatMessages');
const emptySuggestions = document.getElementById('emptySuggestions');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const chatListEl = document.getElementById('chatList');
const suggestionsEl = document.getElementById('suggestions');
const newChatBtn = document.getElementById('newChatBtn');
const themeToggle = document.getElementById('themeToggle');
const menuToggle = document.getElementById('menuToggle');
const sidebar = document.getElementById('sidebar');
const loadingOverlay = document.getElementById('loadingOverlay');
const installBtn = document.getElementById('installBtn');

// Dictionary View Elements
const dictionaryView = document.getElementById('dictionaryView');
const dictionaryBtn = document.getElementById('dictionaryBtn');
const backToChatBtn = document.getElementById('backToChatBtn');
const customDictList = document.getElementById('customDictList');
const emptyDictMessage = document.getElementById('emptyDictMessage');
const showAddWordModalBtn = document.getElementById('showAddWordModalBtn');

// Modal Elements
const addWordModal = document.getElementById('addWordModal');
const closeModalBtn = document.getElementById('closeModalBtn');
const cancelModalBtn = document.getElementById('cancelModalBtn');
const saveWordBtn = document.getElementById('saveWordBtn');
const sourceWordInput = document.getElementById('sourceWordInput');
const targetWordInput = document.getElementById('targetWordInput');

// ===== State =====
let dictionary = {};
let customDictionary = {};
let chats = {};
let currentChatId = null;
let isTyping = false;
let currentView = 'chat';

// ===== AI Chat Responses =====
const chatResponses = {
  'halo': 'Halo! Ada yang bisa saya bantu terjemahkan? 😊',
  'hai': 'Hai! Silakan ketik kalimat yang ingin diterjemahkan ya.',
  'hi': 'Hi! Ready to translate something for you.',
  'pagi': 'Selamat pagi! 🌞 Mau terjemahkan apa hari ini?',
  'siang': 'Selamat siang! Ada yang bisa saya bantu?',
  'sore': 'Selamat sore! Silakan ketik teks untuk diterjemahkan.',
  'malam': 'Selamat malam! 🌙 Saya siap bantu terjemahan.',
  'ok': 'Oke, siap! 👍',
  'oke': 'Oke!',
  'ya': 'Ya, silakan.',
  'tidak': 'Baik, tidak apa-apa.',
  'test': 'Test berhasil! Saya siap digunakan.',
  'tes': 'Tes sukses!',
  'terima kasih': 'Sama-sama! Senang bisa membantu 😊',
  'terimakasih': 'Sama-sama! Kalau ada lagi, langsung aja ya.',
  'makasih': 'Sama-sama, Bro! ✨',
  'thanks': "You're welcome!",
  'thank you': "You're welcome!",
  'bye': 'Sampai jumpa! 👋',
  'dah': 'Dadah! Semoga harimu menyenangkan.',
  'selamat tinggal': 'Selamat tinggal, sampai nanti!',
  'chat lagi': 'Tentu! Silakan ketik kalimat selanjutnya.',
  'nanti lagi': 'Oke, sampai jumpa nanti!',
  'aku terjemahin khusus kamu ya': 'Wah, makasih! Aku siap bantu terjemahan khusus kamu 😄',
};

// ===== Utility: Deteksi apakah app sudah terinstall =====
function isAppInstalled() {
  return window.matchMedia('(display-mode: standalone)').matches || 
         window.navigator.standalone === true;
}

// ===== Initialize =====
async function init() {
  showLoading(true);
  try {
    const response = await fetch('dictionary.json');
    if (!response.ok) throw new Error('Gagal load kamus');
    dictionary = await response.json();
  } catch (error) {
    console.warn('Menggunakan kamus fallback:', error);
    dictionary = {
      "ahe kabar": "apa kabar",
      "sangahe duit nyu": "berapa uang kamu",
      "ujeh diri basaroh": "kamu sendiri bagaimana",
      "ampus ka' uma": "pulang ke rumah",
      "halo": "hai",
      "selamat pagi": "good morning"
    };
  }

  const savedCustom = localStorage.getItem('custom_dictionary');
  if (savedCustom) {
    try { customDictionary = JSON.parse(savedCustom); } catch(e) { customDictionary = {}; }
  }

  const savedChats = localStorage.getItem('translator_chats');
  if (savedChats) {
    try { chats = JSON.parse(savedChats); } catch(e) { chats = {}; }
  }
  
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'dark') document.body.classList.add('dark');
  themeToggle.textContent = document.body.classList.contains('dark') ? '☀️' : '🌙';

  if (Object.keys(chats).length === 0) {
    createNewChat();
  } else {
    const sortedIds = Object.keys(chats).sort((a,b) => chats[b].lastUpdated - chats[a].lastUpdated);
    loadChat(sortedIds[0]);
  }

  renderChatList();
  showLoading(false);
}

// ===== View Switching =====
function showView(view) {
  currentView = view;
  const chatContainer = document.querySelector('.chat-container');
  const inputArea = document.querySelector('.input-area');
  const suggestions = document.getElementById('suggestions');
  
  if (view === 'chat') {
    chatContainer.classList.remove('hidden');
    inputArea.classList.remove('hidden');
    suggestions.classList.remove('hidden');
    dictionaryView.classList.add('hidden');
    renderMessages();
  } else {
    chatContainer.classList.add('hidden');
    inputArea.classList.add('hidden');
    suggestions.classList.add('hidden');
    dictionaryView.classList.remove('hidden');
    renderCustomDictionaryList();
  }
}

// ===== Custom Dictionary =====
function saveCustomDictionary() {
  localStorage.setItem('custom_dictionary', JSON.stringify(customDictionary));
}

function addCustomWord(source, target) {
  const key = source.toLowerCase().trim();
  if (!key || !target.trim()) return false;
  customDictionary[key] = target.trim();
  saveCustomDictionary();
  return true;
}

function updateCustomWord(oldKey, newSource, newTarget) {
  delete customDictionary[oldKey];
  customDictionary[newSource.toLowerCase().trim()] = newTarget.trim();
  saveCustomDictionary();
}

function deleteCustomWord(key) {
  delete customDictionary[key];
  saveCustomDictionary();
}

function renderCustomDictionaryList() {
  customDictList.innerHTML = '';
  const entries = Object.entries(customDictionary);
  
  if (entries.length === 0) {
    emptyDictMessage.style.display = 'block';
    customDictList.style.display = 'none';
    return;
  }
  
  emptyDictMessage.style.display = 'none';
  customDictList.style.display = 'flex';
  
  entries.sort((a,b) => a[0].localeCompare(b[0])).forEach(([source, target]) => {
    const item = document.createElement('div');
    item.className = 'dict-item';
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'dict-item-content';
    contentDiv.innerHTML = `
      <span class="dict-source">${escapeHtml(source)}</span>
      <span class="dict-target">${escapeHtml(target)}</span>
    `;
    
    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'dict-actions';
    
    const editBtn = document.createElement('button');
    editBtn.innerHTML = '✏️';
    editBtn.title = 'Edit';
    editBtn.onclick = () => {
      sourceWordInput.value = source;
      targetWordInput.value = target;
      addWordModal.dataset.editKey = source;
      addWordModal.classList.remove('hidden');
    };
    
    const delBtn = document.createElement('button');
    delBtn.innerHTML = '🗑️';
    delBtn.title = 'Hapus';
    delBtn.onclick = () => {
      if (confirm(`Hapus "${source}" dari kamus?`)) {
        deleteCustomWord(source);
        renderCustomDictionaryList();
      }
    };
    
    actionsDiv.appendChild(editBtn);
    actionsDiv.appendChild(delBtn);
    item.appendChild(contentDiv);
    item.appendChild(actionsDiv);
    customDictList.appendChild(item);
  });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function openAddModal() {
  sourceWordInput.value = '';
  targetWordInput.value = '';
  delete addWordModal.dataset.editKey;
  addWordModal.classList.remove('hidden');
}

function closeModal() {
  addWordModal.classList.add('hidden');
}

function handleSaveWord() {
  const source = sourceWordInput.value.trim();
  const target = targetWordInput.value.trim();
  if (!source || !target) {
    alert('Kedua kolom harus diisi!');
    return;
  }
  
  const editKey = addWordModal.dataset.editKey;
  if (editKey) {
    updateCustomWord(editKey, source, target);
  } else {
    addCustomWord(source, target);
  }
  
  renderCustomDictionaryList();
  closeModal();
}

// ===== Translation =====
function smartTranslate(text) {
  const normalized = text.toLowerCase().replace(/[^\w\s']/gi, '');
  if (customDictionary[normalized]) return customDictionary[normalized];
  if (dictionary[normalized]) return dictionary[normalized];
  
  const words = normalized.split(' ');
  let result = [];
  let i = 0;
  
  while (i < words.length) {
    let found = false;
    for (let len = Math.min(3, words.length - i); len > 0; len--) {
      const phrase = words.slice(i, i + len).join(' ');
      if (customDictionary[phrase]) {
        result.push(customDictionary[phrase]);
        i += len;
        found = true;
        break;
      }
      if (dictionary[phrase]) {
        result.push(dictionary[phrase]);
        i += len;
        found = true;
        break;
      }
    }
    if (!found) {
      result.push(words[i]);
      i++;
    }
  }
  return result.join(' ');
}

// ===== Chat Functions =====
function createNewChat() {
  const id = 'chat_' + Date.now();
  chats[id] = { title: 'Percakapan Baru', messages: [], lastUpdated: Date.now() };
  currentChatId = id;
  saveChats();
  renderChatList();
  if (currentView === 'chat') renderMessages();
}

function loadChat(id) {
  if (!chats[id]) return;
  currentChatId = id;
  if (currentView === 'chat') renderMessages();
  renderChatList();
  if (window.innerWidth <= 768) sidebar.classList.remove('open');
}

function deleteChat(id) {
  if (!confirm('Hapus percakapan ini?')) return;
  delete chats[id];
  saveChats();
  if (currentChatId === id) {
    const remainingIds = Object.keys(chats);
    if (remainingIds.length > 0) loadChat(remainingIds[0]);
    else createNewChat();
  }
  renderChatList();
}

function renameChat(id, newTitle) {
  if (!chats[id] || !newTitle.trim()) return;
  chats[id].title = newTitle.trim().substring(0, 30);
  chats[id].lastUpdated = Date.now();
  saveChats();
  renderChatList();
}

function addMessage(text, sender) {
  if (!currentChatId) return;
  const message = { text, sender, timestamp: Date.now() };
  chats[currentChatId].messages.push(message);
  chats[currentChatId].lastUpdated = Date.now();
  if (sender === 'user' && chats[currentChatId].title === 'Percakapan Baru') {
    chats[currentChatId].title = text.slice(0, 25) + (text.length > 25 ? '...' : '');
  }
  renderMessages();
  saveChats();
  renderChatList();
}

function renderMessages() {
  chatMessages.innerHTML = '';
  if (!currentChatId || !chats[currentChatId]) return;
  const messages = chats[currentChatId].messages;
  emptySuggestions.classList.toggle('hidden', messages.length > 0);
  messages.forEach(msg => {
    const div = document.createElement('div');
    div.className = `message ${msg.sender}`;
    div.textContent = msg.text;
    chatMessages.appendChild(div);
  });
  scrollToBottom();
}

function scrollToBottom() {
  const container = document.querySelector('.chat-container');
  if (container) container.scrollTop = container.scrollHeight;
}

async function botReply(userMessage) {
  if (isTyping) return;
  isTyping = true;
  const typingDiv = document.createElement('div');
  typingDiv.className = 'message bot typing-indicator';
  typingDiv.innerHTML = '<span></span><span></span><span></span>';
  chatMessages.appendChild(typingDiv);
  scrollToBottom();
  await new Promise(r => setTimeout(r, 600 + Math.random() * 400));
  typingDiv.remove();
  
  const normalized = userMessage.toLowerCase().trim();
  let response = null;
  for (const [key, val] of Object.entries(chatResponses)) {
    if (normalized === key || normalized.includes(key)) { response = val; break; }
  }
  if (!response) response = smartTranslate(userMessage);
  addMessage(response, 'bot');
  isTyping = false;
}

function handleSendMessage(optionalText = null) {
  const text = optionalText !== null ? optionalText : messageInput.value.trim();
  if (!text || isTyping) return;
  addMessage(text, 'user');
  messageInput.value = '';
  suggestionsEl.innerHTML = '';
  botReply(text);
}

function handleInput() {
  const val = messageInput.value.toLowerCase();
  suggestionsEl.innerHTML = '';
  if (!val) return;
  const allKeys = [...new Set([...Object.keys(dictionary), ...Object.keys(customDictionary)])];
  allKeys.filter(k => k.includes(val)).slice(0,5).forEach(k => {
    const div = document.createElement('div');
    div.className = 'suggestion-item';
    div.textContent = k;
    div.onclick = () => { messageInput.value = k; suggestionsEl.innerHTML = ''; messageInput.focus(); };
    suggestionsEl.appendChild(div);
  });
}

function renderChatList() {
  chatListEl.innerHTML = '';
  Object.keys(chats).sort((a,b) => chats[b].lastUpdated - chats[a].lastUpdated).forEach(id => {
    const chat = chats[id];
    const item = document.createElement('div');
    item.className = `chat-item ${id === currentChatId ? 'active' : ''}`;
    const titleSpan = document.createElement('span');
    titleSpan.className = 'chat-title';
    titleSpan.textContent = chat.title;
    titleSpan.ondblclick = e => {
      e.stopPropagation();
      const newTitle = prompt('Ubah judul:', chat.title);
      if (newTitle) renameChat(id, newTitle);
    };
    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'chat-actions';
    const delBtn = document.createElement('button');
    delBtn.innerHTML = '🗑️';
    delBtn.onclick = e => { e.stopPropagation(); deleteChat(id); };
    actionsDiv.appendChild(delBtn);
    item.appendChild(titleSpan);
    item.appendChild(actionsDiv);
    item.onclick = () => loadChat(id);
    chatListEl.appendChild(item);
  });
}

function saveChats() {
  localStorage.setItem('translator_chats', JSON.stringify(chats));
}

function showLoading(show) {
  loadingOverlay.classList.toggle('hidden', !show);
}

function toggleTheme() {
  document.body.classList.toggle('dark');
  const isDark = document.body.classList.contains('dark');
  themeToggle.textContent = isDark ? '☀️' : '🌙';
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
}

function toggleSidebar() {
  sidebar.classList.toggle('open');
}

// ===== PWA Install Logic (Tombol hanya muncul jika prompt tersedia) =====
let deferredPrompt = null;

function updateInstallButton() {
  if (!installBtn) return;
  // Tombol hanya muncul jika belum terinstall DAN prompt tersedia
  if (isAppInstalled() || !deferredPrompt) {
    installBtn.style.display = 'none';
  } else {
    installBtn.style.display = 'block';
  }
}

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  updateInstallButton();
});

if (installBtn) {
  installBtn.addEventListener('click', async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      deferredPrompt = null;
      updateInstallButton();
    }
  });
}

window.addEventListener('appinstalled', () => {
  deferredPrompt = null;
  updateInstallButton();
});

window.matchMedia('(display-mode: standalone)').addEventListener('change', updateInstallButton);

window.addEventListener('load', () => {
  updateInstallButton();
});

// ===== Event Listeners =====
sendBtn.addEventListener('click', () => handleSendMessage());
messageInput.addEventListener('keypress', e => { if (e.key === 'Enter') { e.preventDefault(); handleSendMessage(); }});
messageInput.addEventListener('input', handleInput);
newChatBtn.addEventListener('click', createNewChat);
themeToggle.addEventListener('click', toggleTheme);
menuToggle.addEventListener('click', toggleSidebar);
dictionaryBtn.addEventListener('click', () => showView('dictionary'));
backToChatBtn.addEventListener('click', () => showView('chat'));
showAddWordModalBtn.addEventListener('click', openAddModal);
closeModalBtn.addEventListener('click', closeModal);
cancelModalBtn.addEventListener('click', closeModal);
saveWordBtn.addEventListener('click', handleSaveWord);
addWordModal.addEventListener('click', e => { if (e.target === addWordModal) closeModal(); });

document.querySelectorAll('.suggestion-card').forEach(card => {
  card.addEventListener('click', () => handleSendMessage(card.dataset.phrase));
});

document.addEventListener('click', e => {
  if (window.innerWidth <= 768 && !sidebar.contains(e.target) && !menuToggle.contains(e.target)) {
    sidebar.classList.remove('open');
  }
});

// Service Worker Registration
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('service-worker.js').catch(err => console.log('SW failed:', err));
  });
}

// Start
init();