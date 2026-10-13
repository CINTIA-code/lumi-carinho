
import { initializeApp } from "https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js";

import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js";

import {
  getFirestore,
  collection,
  addDoc,
  onSnapshot,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js";

// ==========================================
// 1. CONFIGURAÇÃO DO FIREBASE
// ==========================================

const firebaseConfig = {
  apiKey: "AIzaSyDy1pAEB8xryGAsPNzKR-e4aUky3U6iNdM",
  authDomain: "lumi-carinho-web.firebaseapp.com",
  projectId: "lumi-carinho-web",
  storageBucket: "lumi-carinho-web.firebasestorage.app",
  messagingSenderId: "677714164643",
  appId: "1:677714164643:web:4fd0b7ec1de367edfeb816"
};

const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const db = getFirestore(firebaseApp);

// ==========================================
// 2. CONFIGURAÇÕES E ESTADO DO BICHINHO
// ==========================================

const STORAGE_KEY = "lumi-tamagotchi-v1";
const CHAT_KEY = "lumi-chat-history-v1";
const MAX_MESSAGES = 100;

const defaultPet = {
  hunger: 80,
  happy: 80,
  energy: 80,
  level: 1,
  interactions: 0,
  lastSeen: Date.now()
};

let pet = loadPet();
let chatHistory = loadChat();
let busy = false;
let unsubscribeMessages = null;

const $ = (id) => document.getElementById(id);

function limit(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

// ==========================================
// 3. SALVAR E CARREGAR O PROGRESSO LOCAL
// ==========================================

function loadPet() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));

    if (!saved) return { ...defaultPet };

    return {
      hunger: limit(Number(saved.hunger) || 0),
      happy: limit(Number(saved.happy) || 0),
      energy: limit(Number(saved.energy) || 0),
      level: Math.max(1, Number(saved.level) || 1),
      interactions: Math.max(0, Number(saved.interactions) || 0),
      lastSeen: Number(saved.lastSeen) || Date.now()
    };
  } catch {
    return { ...defaultPet };
  }
}

function loadChat() {
  try {
    const saved = JSON.parse(localStorage.getItem(CHAT_KEY));

    if (!Array.isArray(saved)) return [];

    return saved
      .filter(item =>
        item &&
        ["user", "lumi"].includes(item.role) &&
        typeof item.text === "string"
      )
      .slice(-MAX_MESSAGES);
  } catch {
    return [];
  }
}

function savePet() {
  pet.lastSeen = Date.now();

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pet));
    $("saveStatus").textContent =
      "Progresso salvo neste navegador. 💜";
  } catch {
    $("saveStatus").textContent =
      "Não foi possível salvar o progresso neste navegador.";
  }
}

function saveChat() {
  try {
    localStorage.setItem(
      CHAT_KEY,
      JSON.stringify(chatHistory.slice(-MAX_MESSAGES))
    );
  } catch {
    $("chatStatus").textContent =
      "Não foi possível salvar a conversa neste navegador.";
  }
}

// ==========================================
// 4. VISUAL E ATRIBUTOS DO BICHINHO
// ==========================================

function updateStat(name, value) {
  const amount = Math.round(limit(value));

  $(name + "Value").textContent = amount + "%";
  $(name + "Bar").style.width = amount + "%";
}

function updateMood() {
  let mood;
  let message;

  if (pet.energy <= 20) {
    mood = "😴 Cansadinha";
    message = "Estou precisando descansar um pouquinho.";
  } else if (pet.hunger <= 20) {
    mood = "🍓 Com fome";
    message = "Será que tem alguma comidinha por aí?";
  } else if (pet.happy <= 25) {
    mood = "🥺 Carente";
    message = "Uma brincadeira ou um carinho me faria bem.";
  } else if (pet.happy >= 85 && pet.energy >= 60) {
    mood = "✨ Muito feliz";
    message = "Adoro passar um tempinho com você!";
  } else {
    mood = "💜 Feliz";
    message = "Estou feliz por estar aqui!";
  }

  $("mood").textContent = mood;
  $("petMessage").textContent = message;
}

function render() {
  updateStat("hunger", pet.hunger);
  updateStat("happy", pet.happy);
  updateStat("energy", pet.energy);

  $("level").textContent = "NÍVEL " + pet.level;
  updateMood();
}

function gainInteraction() {
  pet.interactions += 1;

  const newLevel = Math.floor(pet.interactions / 5) + 1;

  if (newLevel > pet.level) {
    pet.level = newLevel;
    addMessage("lumi", "Uau! Subimos para o nível " + pet.level + "! ✨");
  }

  savePet();
  render();
}

// ==========================================
// 5. AÇÕES DO BICHINHO
// ==========================================

function feed() {
  pet.hunger = limit(pet.hunger + 25);
  pet.happy = limit(pet.happy + 5);
  pet.energy = limit(pet.energy - 2);

  addMessage("lumi", "Oba! Obrigada pela comidinha! 🍓");
  gainInteraction();
}

function play() {
  if (pet.energy < 15) {
    addMessage("lumi", "Estou cansadinha. Vamos descansar antes? 🌙");
    return;
  }

  pet.happy = limit(pet.happy + 18);
  pet.energy = limit(pet.energy - 12);
  pet.hunger = limit(pet.hunger - 7);

  addMessage("lumi", "Ebaaa! Adorei brincar com você! 🎮💜");
  gainInteraction();
}

function sleep() {
  pet.energy = limit(pet.energy + 30);
  pet.happy = limit(pet.happy + 3);

  addMessage("lumi", "Hora de descansar. Bons sonhos! 🌙");
  gainInteraction();
}

function talk() {
  addMessage(
    "lumi",
    "Oi! Estou aqui com você. Quer me contar alguma coisa? 💜"
  );

  pet.happy = limit(pet.happy + 3);
  gainInteraction();
}

// ==========================================
// 6. RESPOSTAS DEMONSTRATIVAS DO CHAT
// ==========================================

function getReply(message) {
  const text = message.toLowerCase();

  if (/\b(oi|olá|ola|oie|e aí|eai)\b/.test(text)) {
    return "Oii! Que bom ter você aqui! 💜";
  }

  if (/\b(te amo|amo você|amo vc)\b/.test(text)) {
    return "Aaaah, que carinho gostoso! Você merece muito amor. 💜";
  }

  if (/\b(triste|tristeza|chatead|chorando|sozinh)\w*/.test(text)) {
    return "Sinto muito que esteja assim. Quer me contar o que aconteceu? Estou aqui para te ouvir. 💜";
  }

  if (/\b(feliz|alegre|consegui|conseguiu|legal|eba)\b/.test(text)) {
    return "Que notícia boa! Quero comemorar com você! ✨";
  }

  if (/\b(cansad|sono|dormir|descansar)\w*/.test(text)) {
    return "Descansar também é importante. Vai com calma e se cuida. 🌙";
  }

  if (/\b(saudad|sinto falta)\w*/.test(text)) {
    return "Saudade é um jeito de mostrar que alguém é importante. Estou mandando um abraço virtual! 💌";
  }

  if (/\b(medo|assustad)\w*/.test(text)) {
    return "Vamos respirar devagarinho? Você pode falar sobre o que está sentindo com alguém de confiança também. 💜";
  }

  if (text.includes("?")) {
    return "Boa pergunta! Ainda estou aprendendo. Você quer me contar mais sobre isso? ✨";
  }

  const replies = [
    "Estou te ouvindo! 💜",
    "Obrigada por dividir isso comigo.",
    "Me conta mais, quero continuar nossa conversa! ✨",
    "Você é importante e merece carinho.",
    "Que tal fazermos algo divertido agora? 🎮"
  ];

  return replies[Math.floor(Math.random() * replies.length)];
}

// ==========================================
// 7. CHAT LOCAL DO BICHINHO
// ==========================================

function addMessage(role, text) {
  chatHistory.push({
    role,
    text: String(text).slice(0, 1000),
    time: Date.now()
  });

  chatHistory = chatHistory.slice(-MAX_MESSAGES);

  saveChat();
  renderChat();
}

function renderChat() {
  const container = $("chatHistory");
  container.replaceChildren();

  for (const item of chatHistory) {
    const bubble = document.createElement("div");
    bubble.className = "bubble " + item.role;

    const name = document.createElement("span");
    name.className = "bubble-name";
    name.textContent = item.role === "user" ? "Você" : "Lumi";

    const content = document.createElement("div");
    content.textContent = item.text;

    bubble.append(name, content);
    container.appendChild(bubble);
  }

  container.scrollTop = container.scrollHeight;
}

function handleChat(event) {
  event.preventDefault();

  if (busy) return;

  const input = $("chatInput");
  const message = input.value.trim();

  if (!message) return;

  busy = true;
  input.value = "";

  addMessage("user", message);

  window.setTimeout(() => {
    addMessage("lumi", getReply(message));
    pet.happy = limit(pet.happy + 2);
    savePet();
    render();

    busy = false;
    input.focus();
  }, 350);
}

// ==========================================
// 8. CORREIO DE CARINHO DEMONSTRATIVO
// ==========================================

const loveMessages = [
  "Você é muito amado. Nunca se esqueça disso! 💜",
  "Mesmo nos dias difíceis, você não precisa enfrentar tudo sozinho. 💌",
  "Tem alguém torcendo por você neste exato momento. ✨",
  "Um abraço apertado, cheio de carinho! 🫂",
  "Você deixa o mundo mais bonito sendo quem é. 🌟",
  "Pausa para lembrar: você é especial e muito querido. 💗",
  "Que seu dia tenha um motivo para sorrir! 🌈",
  "Estou mandando um montão de amor para você. 💜"
];

let currentLoveMessage = loveMessages[0];

function showLoveMessage() {
  const choices = loveMessages.filter(
    message => message !== currentLoveMessage
  );

  currentLoveMessage =
    choices[Math.floor(Math.random() * choices.length)] ||
    loveMessages[0];

  $("loveMessage").textContent = currentLoveMessage;
  pet.happy = limit(pet.happy + 2);

  savePet();
  render();
}

function previewLoveMessage() {
  addMessage("lumi", "💌 " + currentLoveMessage);
}

// ==========================================
// 9. PAINEL DE LOGIN DO FIREBASE
// ==========================================

// Criamos o painel pelo JavaScript para preservar
// o HTML e o visual já existentes da Lumi.

const authPanel = document.createElement("section");
authPanel.className = "stats-card";
authPanel.style.marginBottom = "20px";

authPanel.innerHTML = `
  <h2>💌 Área da família</h2>
  <p id="authStatus" role="status">
    Entre com sua conta para acessar as mensagens.
  </p>

  <form id="loginForm" style="display:grid;gap:10px;margin-top:12px">
    <label for="loginEmail">Seu e-mail</label>
    <input
      id="loginEmail"
      type="email"
      autocomplete="username"
      required
      style="padding:12px;border-radius:10px;width:100%"
    >

    <label for="loginPassword">Sua senha</label>
    <input
      id="loginPassword"
      type="password"
      autocomplete="current-password"
      required
      style="padding:12px;border-radius:10px;width:100%"
    >

    <button type="submit" id="loginButton">
      Entrar
    </button>
  </form>

  <button
    type="button"
    id="logoutButton"
    style="display:none;margin-top:12px"
  >
    Sair da conta
  </button>

  <div id="familyArea" hidden style="margin-top:18px">
    <h3>Enviar carinho para a Lumi 💜</h3>

    <form id="familyMessageForm" style="display:grid;gap:10px">
      <label for="familyMessageInput">Mensagem</label>
      <textarea
        id="familyMessageInput"
        maxlength="500"
        rows="3"
        required
        placeholder="Escreva uma mensagem carinhosa..."
        style="padding:12px;border-radius:10px;width:100%"
      ></textarea>

      <button type="submit">Enviar mensagem</button>
    </form>

    <p id="familyMessageStatus" role="status"></p>

    <h3>Mensagens salvas</h3>
    <div id="familyMessages" aria-live="polite"></div>
  </div>
`;

const app = document.querySelector("main.app");
const topbar = app.querySelector(".topbar");
app.insertBefore(authPanel, topbar.nextSibling);

const authStatus = $("authStatus");
const loginForm = $("loginForm");
const loginButton = $("loginButton");
const logoutButton = $("logoutButton");
const familyArea = $("familyArea");
const familyMessageForm = $("familyMessageForm");
const familyMessageInput = $("familyMessageInput");
const familyMessageStatus = $("familyMessageStatus");
const familyMessages = $("familyMessages");

function showAuthStatus(message) {
  authStatus.textContent = message;
}

function showFamilyStatus(message) {
  familyMessageStatus.textContent = message;
}

function renderFamilyMessages(documents) {
  familyMessages.replaceChildren();

  if (documents.length === 0) {
    const empty = document.createElement("p");
    empty.textContent = "Ainda não há mensagens salvas.";
    familyMessages.appendChild(empty);
    return;
  }

  for (const item of documents) {
    const card = document.createElement("article");
    card.style.padding = "12px";
    card.style.marginBottom = "10px";
    card.style.borderRadius = "10px";
    card.style.background = "rgba(128, 90, 180, 0.12)";

    const message = document.createElement("p");
    message.textContent = item.texto || "(Mensagem sem texto)";

    const date = document.createElement("small");
    date.textContent = item.createdAt?.toDate
      ? item.createdAt.toDate().toLocaleString("pt-BR")
      : "Data não disponível";

    card.append(message, date);
    familyMessages.appendChild(card);
  }
}

// Login com e-mail e senha.
loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const email = $("loginEmail").value.trim();
  const password = $("loginPassword").value;

  loginButton.disabled = true;
  showAuthStatus("Entrando...");

  try {
    await signInWithEmailAndPassword(auth, email, password);
    loginForm.reset();
  } catch (error) {
    console.error("Erro de login:", error.code);
    showAuthStatus(
      "Não foi possível entrar. Confira o e-mail e a senha."
    );
  } finally {
    loginButton.disabled = false;
  }
});

// Sair da conta.
logoutButton.addEventListener("click", async () => {
  try {
    await signOut(auth);
  } catch {
    showAuthStatus("Não foi possível sair da conta.");
  }
});

// Enviar mensagem para o Firestore.
familyMessageForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const user = auth.currentUser;
  const texto = familyMessageInput.value.trim();

  if (!user || !texto) return;

  const submitButton = familyMessageForm.querySelector(
    'button[type="submit"]'
  );

  submitButton.disabled = true;
  showFamilyStatus("Enviando mensagem...");

  try {
    await addDoc(collection(db, "mensagens"), {
      texto: texto.slice(0, 500),
      createdAt: serverTimestamp(),
      senderUid: user.uid,
      senderEmail: user.email || ""
    });

    familyMessageInput.value = "";
    showFamilyStatus("Mensagem salva no Firestore! 💜");
  } catch (error) {
    console.error("Erro ao enviar mensagem:", error.code);
    showFamilyStatus(
      "Não foi possível enviar. Confira as regras do Firestore."
    );
  } finally {
    submitButton.disabled = false;
  }
});

// Detectar login e acompanhar mensagens em tempo real.
onAuthStateChanged(auth, (user) => {
  if (unsubscribeMessages) {
    unsubscribeMessages();
    unsubscribeMessages = null;
  }

  familyArea.hidden = !user;
  loginForm.style.display = user ? "none" : "grid";
  logoutButton.style.display = user ? "inline-block" : "none";

  if (!user) {
    showAuthStatus("Entre com sua conta autorizada para continuar.");
    familyMessages.replaceChildren();
    return;
  }

  showAuthStatus("Você entrou com: " + (user.email || "conta autorizada"));

  unsubscribeMessages = onSnapshot(
    collection(db, "mensagens"),
    (snapshot) => {
      const documents = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      }));

      documents.sort((a, b) => {
        const timeA = a.createdAt?.toMillis?.() || 0;
        const timeB = b.createdAt?.toMillis?.() || 0;
        return timeB - timeA;
      });

      renderFamilyMessages(documents);
    },
    (error) => {
      console.error("Erro ao ler mensagens:", error.code);
      showFamilyStatus(
        "Não foi possível carregar as mensagens. Confira as permissões."
      );
    }
  );
});

// ==========================================
// 10. EVENTOS DOS BOTÕES ORIGINAIS
// ==========================================

$("feedButton").addEventListener("click", feed);
$("playButton").addEventListener("click", play);
$("sleepButton").addEventListener("click", sleep);
$("talkButton").addEventListener("click", talk);

$("chatForm").addEventListener("submit", handleChat);

$("clearChat").addEventListener("click", () => {
  chatHistory = [];
  saveChat();
  renderChat();

  addMessage(
    "lumi",
    "Nossa conversa recomeça por aqui. Estou feliz por você estar comigo! 💜"
  );
});

$("newLoveButton").addEventListener("click", showLoveMessage);
$("previewButton").addEventListener("click", previewLoveMessage);

// ==========================================
// 11. PASSAGEM DO TEMPO
// ==========================================

window.setInterval(() => {
  pet.hunger = limit(pet.hunger - 1);
  pet.happy = limit(pet.happy - 1);
  pet.energy = limit(pet.energy - 1);

  savePet();
  render();
}, 60000);

// ==========================================
// 12. INICIALIZAÇÃO
// ==========================================

render();
renderChat();

if (chatHistory.length === 0) {
  addMessage(
    "lumi",
    "Oii! Eu sou a Lumi. Que bom que você chegou! 💜"
  );
}
