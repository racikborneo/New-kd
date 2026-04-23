// DOM Elements
const chatMessages = document.getElementById('chatMessages');
const emptySuggestions = document.getElementById('emptySuggestions');
const userInput = document.getElementById('userInput');
const sendBtn = document.getElementById('sendBtn');
const suggestionsBox = document.getElementById('suggestions');
const themeToggle = document.getElementById('themeToggle');
const installBtn = document.getElementById('installBtn');
const menuToggle = document.getElementById('menuToggle');
const sidebar = document.getElementById('sidebar');
const chatListEl = document.getElementById('chatList');
const newChatBtn = document.getElementById('newChatBtn');
const dictionaryView = document.getElementById('dictionaryView');
const dictionaryBtn = document.getElementById('dictionaryBtn');
const backToChatBtn = document.getElementById('backToChatBtn');
const customDictList = document.getElementById('customDictList');
const emptyDictMessage = document.getElementById('emptyDictMessage');
const showAddWordModalBtn = document.getElementById('showAddWordModalBtn');
const modal = document.getElementById('wordModal');
const modalTitle = document.getElementById('modalTitle');
const closeModalBtn = document.getElementById('closeModalBtn');
const cancelModalBtn = document.getElementById('cancelModalBtn');
const saveWordBtn = document.getElementById('saveWordBtn');
const sourceWordInput = document.getElementById('sourceWordInput');
const targetWordInput = document.getElementById('targetWordInput');
const loadingOverlay = document.getElementById('loadingOverlay');

// State
let kamus = {};
let customDict = {};
let chats = {};
let currentChatId = null;
let isTyping = false;
let currentView = 'chat';
let deferredPrompt = null;
let editingKey = null;

// AI Chat Responses
const chatResponses = {
  'halo': 'Halo! Ada yang bisa Nelsen bantu terjemahkan? 😊',
  'hai': 'Hai! Silakan ketik kata atau kalimat.',
  'pagi': 'Selamat pagi! 🌞',
  'siang': 'Selamat siang!',
  'sore': 'Selamat sore!',
  'malam': 'Selamat malam! 🌙',
  'ok': 'Oke, siap! 👍',
  'oke': 'Oke!',
  'terima kasih': 'Sama-sama! Senang bisa membantu 😊',
  'terimakasih': 'Sama-sama!',
  'makasih': 'Sama-sama, Bro! ✨',
  'test': 'Nelsen siap digunakan!',
};

// Utility
const isAppInstalled = () => window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
const showLoading = (s) => loadingOverlay.classList.toggle('hidden', !s);

// Initialize
(async function init() {
  showLoading(true);
  try {
    const res = await fetch('kamus_dayak.json');
    kamus = res.ok ? await res.json() : {};
  } catch { kamus = {}; }
  
  customDict = JSON.parse(localStorage.getItem('nelsen_custom') || '{}');
  chats = JSON.parse(localStorage.getItem('nelsen_chats') || '{}');
  if (localStorage.getItem('theme') === 'dark') document.body.classList.add('dark-mode');
  
  if (!Object.keys(chats).length) createNewChat();
  else loadChat(Object.keys(chats).sort((a,b) => chats[b].lastUpdated - chats[a].lastUpdated)[0]);
  
  renderChatList();
  updateInstallButton();
  showLoading(false);
  swiftAlert('Nelsen Ahe', '👋 Ketik kata Dayak atau Indonesia, Nelsen akan terjemahkan.');
})();

// Chat History
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
  sidebar.classList.remove('open');
}
function deleteChat(id) {
  if (!confirm('Hapus percakapan?')) return;
  delete chats[id];
  saveChats();
  if (currentChatId === id) {
    const ids = Object.keys(chats);
    ids.length ? loadChat(ids[0]) : createNewChat();
  }
  renderChatList();
}
function renameChat(id, newTitle) {
  if (!newTitle.trim()) return;
  chats[id].title = newTitle.trim().slice(0,30);
  saveChats();
  renderChatList();
}
function addMessage(text, sender) {
  if (!currentChatId) return;
  chats[currentChatId].messages.push({ text, sender, timestamp: Date.now() });
  chats[currentChatId].lastUpdated = Date.now();
  if (sender === 'user' && chats[currentChatId].title === 'Percakapan Baru')
    chats[currentChatId].title = text.slice(0,25) + (text.length>25?'...':'');
  renderMessages();
  saveChats();
  renderChatList();
}
function renderMessages() {
  chatMessages.innerHTML = '';
  const msgs = chats[currentChatId]?.messages || [];
  emptySuggestions.classList.toggle('hidden', msgs.length > 0);
  msgs.forEach(m => {
    const d = document.createElement('div');
    d.className = `chat-bubble ${m.sender}`;
    d.textContent = m.text;
    chatMessages.appendChild(d);
  });
  if (!msgs.length) chatMessages.innerHTML = '<div class="system-msg">👋 Selamat datang di Nelsen Ahe. Ketik kata dalam bahasa Dayak atau Indonesia.</div>';
  scrollChat();
}
function scrollChat() { document.querySelector('.chat-container').scrollTop = document.querySelector('.chat-container').scrollHeight; }
function renderChatList() {
  chatListEl.innerHTML = '';
  Object.keys(chats).sort((a,b) => chats[b].lastUpdated - chats[a].lastUpdated).forEach(id => {
    const chat = chats[id];
    const item = document.createElement('div');
    item.className = `chat-item ${id === currentChatId ? 'active' : ''}`;
    item.innerHTML = `<span class="chat-title">${chat.title}</span><div class="chat-actions"><button class="del-chat">🗑️</button></div>`;
    item.querySelector('.del-chat').onclick = e => { e.stopPropagation(); deleteChat(id); };
    item.ondblclick = e => { e.stopPropagation(); const t = prompt('Ubah judul:', chat.title); if (t) renameChat(id, t); };
    item.onclick = () => loadChat(id);
    chatListEl.appendChild(item);
  });
}
function saveChats() { localStorage.setItem('nelsen_chats', JSON.stringify(chats)); }

// Custom Dictionary
function saveCustomDict() { localStorage.setItem('nelsen_custom', JSON.stringify(customDict)); }
function renderCustomDict() {
  customDictList.innerHTML = '';
  const entries = Object.entries(customDict);
  emptyDictMessage.style.display = entries.length ? 'none' : 'block';
  customDictList.style.display = entries.length ? 'flex' : 'none';
  entries.sort((a,b) => a[0].localeCompare(b[0])).forEach(([src, tgt]) => {
    const item = document.createElement('div');
    item.className = 'dict-item';
    item.innerHTML = `<div class="dict-item-content"><span class="dict-source">${src}</span><span class="dict-target">${tgt}</span></div><div class="dict-actions"><button class="edit-word">✏️</button><button class="del-word">🗑️</button></div>`;
    item.querySelector('.edit-word').onclick = () => openModal(src, tgt);
    item.querySelector('.del-word').onclick = () => { delete customDict[src]; saveCustomDict(); renderCustomDict(); };
    customDictList.appendChild(item);
  });
}
function openModal(src = '', tgt = '') {
  editingKey = src || null;
  modalTitle.textContent = src ? '✏️ Edit Kata' : '➕ Tambah Kata';
  sourceWordInput.value = src;
  targetWordInput.value = tgt;
  modal.classList.remove('hidden');
}
function closeModal() { modal.classList.add('hidden'); editingKey = null; }
function saveWord() {
  const src = sourceWordInput.value.trim().toLowerCase();
  const tgt = targetWordInput.value.trim();
  if (!src || !tgt) return alert('Isi kedua kolom!');
  if (editingKey) delete customDict[editingKey];
  customDict[src] = tgt;
  saveCustomDict();
  renderCustomDict();
  closeModal();
}

// Translation Engine dengan Maximum Matching (paragraf penuh)
function translate(query) {
  const q = query.trim();
  if (!q) return '';
  
  // Normalisasi: lowercase, tapi pertahankan tanda baca dasar untuk pemisahan
  const words = q.split(/(\s+|[.,!?;:])/); // Pecah per kata + spasi + tanda baca
  let result = [];
  
  for (let i = 0; i < words.length; i++) {
    const segment = words[i];
    
    // Jika spasi atau tanda baca, langsung masukkan
    if (/^\s+$/.test(segment) || /^[.,!?;:]$/.test(segment)) {
      result.push(segment);
      continue;
    }
    
    const lowerSegment = segment.toLowerCase();
    
    // Cek custom dictionary dulu (exact match)
    if (customDict[lowerSegment]) {
      result.push(customDict[lowerSegment]);
      continue;
    }
    
    // Cek kamus utama (exact match)
    if (kamus[lowerSegment]) {
      result.push(kamus[lowerSegment]);
      continue;
    }
    
    // Maximum matching: cari frasa terpanjang dari posisi ini
    // Ambil semua kata berikutnya (abaikan spasi/tanda baca) hingga maksimal 1000 kata
    const remainingWords = [];
    const indices = []; // simpan indeks asli untuk lompati nanti
    
    for (let j = i; j < words.length; j++) {
      const w = words[j];
      if (!/^\s+$/.test(w) && !/^[.,!?;:]$/.test(w)) {
        remainingWords.push(w);
        indices.push(j);
      }
      if (remainingWords.length >= 1000) break;
    }
    
    let translated = null;
    let matchedLength = 0;
    
    // Cek dari frasa terpanjang ke terpendek (mulai dari semua kata yang tersedia)
    for (let len = remainingWords.length; len >= 1; len--) {
      const phrase = remainingWords.slice(0, len).join(' ').toLowerCase();
      
      // Cek custom dictionary
      if (customDict[phrase]) {
        translated = customDict[phrase];
        matchedLength = len;
        break;
      }
      
      // Cek kamus utama
      if (kamus[phrase]) {
        translated = kamus[phrase];
        matchedLength = len;
        break;
      }
    }
    
    if (translated) {
      result.push(translated);
      // Lompati indeks sebanyak kata yang sudah masuk frasa
      if (matchedLength > 0 && indices.length >= matchedLength) {
        i = indices[matchedLength - 1]; // i akan maju ke indeks terakhir frasa
      }
    } else {
      // Fallback: tidak ada yang cocok, biarkan kata asli
      result.push(segment);
    }
  }
  
  // Gabungkan kembali dan bersihkan spasi berlebih
  let finalText = result.join('');
  finalText = finalText.replace(/\s+/g, ' ').trim();
  
  // Jika hasil terjemahan kosong atau sama persis dengan input
  if (finalText === q) {
    return `❌ Tidak dapat menerjemahkan seluruh teks. Beberapa kata mungkin belum ada di kamus.`;
  }
  
  return finalText;
}

// Bot & Send
async function botReply(userMsg) {
  if (isTyping) return;
  isTyping = true;
  const typing = document.createElement('div');
  typing.className = 'chat-bubble ai typing-indicator';
  typing.innerHTML = '<span></span><span></span><span></span>';
  chatMessages.appendChild(typing); scrollChat();
  await new Promise(r => setTimeout(r, 500 + Math.random()*300));
  typing.remove();
  const norm = userMsg.toLowerCase();
  let resp = Object.entries(chatResponses).find(([k]) => norm === k || norm.includes(k))?.[1];
  if (!resp) resp = translate(userMsg);
  addMessage(resp, 'ai');
  isTyping = false;
}
function handleSend(text = null) {
  const msg = text || userInput.value.trim();
  if (!msg || isTyping) return;
  addMessage(msg, 'user');
  userInput.value = '';
  suggestionsBox.style.display = 'none';
  botReply(msg);
}

// Suggestions
userInput.addEventListener('input', () => {
  const val = userInput.value.toLowerCase();
  suggestionsBox.innerHTML = '';
  if (!val) { suggestionsBox.style.display = 'none'; return; }
  const keys = [...new Set([...Object.keys(kamus), ...Object.keys(customDict)])];
  keys.filter(k => k.includes(val)).slice(0,6).forEach(k => {
    const d = document.createElement('div');
    d.textContent = k;
    d.onclick = () => { userInput.value = k; handleSend(); };
    suggestionsBox.appendChild(d);
  });
  suggestionsBox.style.display = 'flex';
});

// View Switching
function showView(view) {
  currentView = view;
  document.querySelector('.chat-container').classList.toggle('hidden', view!=='chat');
  document.querySelector('.input-area').classList.toggle('hidden', view!=='chat');
  suggestionsBox.classList.toggle('hidden', view!=='chat');
  dictionaryView.classList.toggle('hidden', view!=='dictionary');
  if (view === 'dictionary') renderCustomDict();
  else renderMessages();
}

// PWA Install (Langsung Aksi)
function updateInstallButton() { if (installBtn) installBtn.style.display = isAppInstalled() ? 'none' : 'block'; }
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredPrompt = e; updateInstallButton(); });
installBtn?.addEventListener('click', async () => {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') { deferredPrompt = null; updateInstallButton(); }
  } else {
    alert('📱 Install aplikasi:\n• Android: "Tambahkan ke Layar Utama"\n• PC: Klik ikon install di address bar\n• iOS: Bagikan > "Tambahkan ke Layar Utama"');
  }
});
window.addEventListener('appinstalled', () => { deferredPrompt = null; updateInstallButton(); });
window.matchMedia('(display-mode: standalone)').addEventListener('change', updateInstallButton);

// Event Listeners
sendBtn.onclick = () => handleSend();
userInput.addEventListener('keypress', e => { if (e.key === 'Enter') handleSend(); });
themeToggle.onclick = () => {
  document.body.classList.toggle('dark-mode');
  localStorage.setItem('theme', document.body.classList.contains('dark-mode') ? 'dark' : 'light');
};
menuToggle.onclick = () => sidebar.classList.toggle('open');
newChatBtn.onclick = createNewChat;
dictionaryBtn.onclick = () => showView('dictionary');
backToChatBtn.onclick = () => showView('chat');
showAddWordModalBtn.onclick = () => openModal();
closeModalBtn.onclick = cancelModalBtn.onclick = closeModal;
saveWordBtn.onclick = saveWord;
modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
document.querySelectorAll('.suggestion-card').forEach(c => c.onclick = () => handleSend(c.dataset.phrase));
document.addEventListener('click', e => {
  if (window.innerWidth <= 768 && !sidebar.contains(e.target) && !menuToggle.contains(e.target))
    sidebar.classList.remove('open');
});

// Swift Alert (Custom)
function swiftAlert(title, text) {
  const overlay = document.createElement('div');
  overlay.className = 'swiftalert-overlay';
  overlay.innerHTML = `<div class="swiftalert-box"><div class="swiftalert-title">${title}</div><div class="swiftalert-text">${text}</div><button class="swiftalert-btn">OK</button></div>`;
  document.body.appendChild(overlay);
  overlay.querySelector('.swiftalert-btn').onclick = () => overlay.remove();
}