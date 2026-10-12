"use strict";

// Chaves de armazenamento
const STORAGE_KEY = "lumi-tamagotchi-v1";
const CHAT_KEY = "lumi-chat-history-v1";
const MAX_MESSAGES = 100;

// Estado inicial
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

const $ = (id) => document.getElementById(id);

function limit(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

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
    $("saveStatus").textContent = "Progresso salvo neste navegador. 💜";
  } catch {
    $("saveStatus").textContent =
      "Não foi possível salvar. Verifique o armazenamento do navegador.";
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

// Atualiza os atributos visuais
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

// Ações do bichinho
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
  addMessage("lumi", "Oi! Estou aqui com você. Quer me contar alguma coisa? 💜");
  pet.happy = limit(pet.happy + 3);
  gainInteraction();
}

// Conversa de demonstração.
// Não é uma IA conectada à internet.
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

  if (/\b(medo|medo de|assustad)\w*/.test(text)) {
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

// Renderiza mensagens usando textContent para evitar interpretar HTML.
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

  const reply = getReply(message);

  window.setTimeout(() => {
    addMessage("lumi", reply);
    pet.happy = limit(pet.happy + 2);
    savePet();
    render();
    busy = false;
    input.focus();
  }, 350);
}

// Mensagens demonstrativas de carinho
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

// Eventos dos botões
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

// O jogo continua mudando gradualmente enquanto a página está aberta.
window.setInterval(() => {
  pet.hunger = limit(pet.hunger - 1);
  pet.happy = limit(pet.happy - 1);
  pet.energy = limit(pet.energy - 1);

  savePet();
  render();
}, 60000);

// Inicialização
render();
renderChat();

if (chatHistory.length === 0) {
  addMessage(
    "lumi",
    "Oii! Eu sou a Lumi. Que bom que você chegou! 💜"
  );
}
