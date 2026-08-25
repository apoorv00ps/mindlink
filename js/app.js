import { auth, googleProvider, signInWithPopup, onAuthStateChanged, signOut } from './firebase.js';
import { sendToAI } from './ai.js';
import { initChatSystem, findStranger, sendStrangerMessage, leaveCurrentChat } from './chat.js';

// DOM Elements
const loader = document.getElementById('loader');
const landingPage = document.getElementById('landing-page');
const dashboardPage = document.getElementById('dashboard-page');
const aiChatPage = document.getElementById('ai-chat-page');
const strangerChatPage = document.getElementById('stranger-chat-page');

const loginBtn = document.getElementById('google-login-btn');
const logoutBtn = document.getElementById('logout-btn');
const userAvatar = document.getElementById('user-avatar');
const userFirstname = document.getElementById('user-firstname');

const cardAi = document.getElementById('card-ai');
const cardStranger = document.getElementById('card-stranger');

// AI Chat DOM
const aiMessages = document.getElementById('ai-messages');
const aiInput = document.getElementById('ai-input');
const aiSendBtn = document.getElementById('ai-send-btn');
const therapistCallBtn = document.getElementById('therapist-call-btn');

// Stranger Chat DOM
const strangerMessages = document.getElementById('stranger-messages');
const strangerInput = document.getElementById('stranger-input');
const strangerSendBtn = document.getElementById('stranger-send-btn');
const strangerStatus = document.getElementById('stranger-chat-status');
const strangerStatusDot = document.getElementById('stranger-status-dot');
const nextStrangerBtn = document.getElementById('next-stranger-btn');

let currentUser = null;

// Routing System
const screens = {
    'landing-page': landingPage,
    'dashboard-page': dashboardPage,
    'ai-chat-page': aiChatPage,
    'stranger-chat-page': strangerChatPage
};

function showScreen(screenId) {
    Object.values(screens).forEach(screen => screen.classList.add('hidden'));
    screens[screenId].classList.remove('hidden');
}

// Expose to window for inline onclick attributes
window.app = {
    showScreen,
    leaveStrangerChat: () => {
        leaveCurrentChat();
        showScreen('dashboard-page');
    }
};

// Auth State Observer
onAuthStateChanged(auth, (user) => {
    loader.classList.add('hidden');
    if (user) {
        currentUser = user;
        userAvatar.src = user.photoURL || 'https://via.placeholder.com/40';
        userFirstname.textContent = user.displayName ? user.displayName.split(' ')[0] : 'there';
        showScreen('dashboard-page');
        
        // Initialize Chat System
        initChatSystem(user.uid, {
            onMatchFound: () => {
                strangerStatus.textContent = "Connected to a stranger!";
                strangerStatusDot.classList.add('online');
                strangerInput.disabled = false;
                strangerSendBtn.disabled = false;
                appendStrangerSystemMessage("You're now chatting with a random stranger. Say hi!");
            },
            onMessageReceived: (text) => {
                appendStrangerMessage(text, 'stranger-msg');
            },
            onSearchTimeout: () => {
                strangerStatus.textContent = "No one is online yet.";
                appendStrangerSystemMessage("Come back after a while, no one is online yet.");
                strangerInput.disabled = true;
                strangerSendBtn.disabled = true;
            },
            onStrangerLeft: () => {
                strangerStatus.textContent = "Stranger has left the chat.";
                strangerStatusDot.classList.remove('online');
                appendStrangerSystemMessage("The stranger disconnected. Click Next to find someone else.");
                strangerInput.disabled = true;
                strangerSendBtn.disabled = true;
                leaveCurrentChat();
            }
        });

    } else {
        currentUser = null;
        showScreen('landing-page');
    }
});

// Auth Handlers
loginBtn.addEventListener('click', async () => {
    try {
        await signInWithPopup(auth, googleProvider);
    } catch (error) {
        console.error("Login failed", error);
        alert("Failed to login with Google.");
    }
});

logoutBtn.addEventListener('click', async () => {
    try {
        leaveCurrentChat();
        await signOut(auth);
    } catch (error) {
        console.error("Logout failed", error);
    }
});

// Dashboard Cards
cardAi.addEventListener('click', () => {
    showScreen('ai-chat-page');
});

cardStranger.addEventListener('click', () => {
    showScreen('stranger-chat-page');
    startStrangerSearch();
});

// ================= AI CHAT LOGIC =================

function appendAiMessage(text, type) {
    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${type}`;
    msgDiv.innerHTML = `<div class="msg-content">${text.replace(/\\n/g, '<br>')}</div>`;
    aiMessages.appendChild(msgDiv);
    aiMessages.scrollTop = aiMessages.scrollHeight;
}

async function handleAiSend() {
    const text = aiInput.value.trim();
    if (!text) return;

    appendAiMessage(text, 'user-msg');
    aiInput.value = '';
    aiSendBtn.disabled = true;

    // Show typing indicator
    const typingId = 'typing-' + Date.now();
    const typingDiv = document.createElement('div');
    typingDiv.className = 'message ai-msg';
    typingDiv.id = typingId;
    typingDiv.innerHTML = `<div class="msg-content">Thinking...</div>`;
    aiMessages.appendChild(typingDiv);
    aiMessages.scrollTop = aiMessages.scrollHeight;

    const response = await sendToAI(text);
    
    // Remove typing indicator
    document.getElementById(typingId).remove();
    
    appendAiMessage(response.text, 'ai-msg');
    aiSendBtn.disabled = false;
    aiInput.focus();

    // Check risk to show therapist button
    if (response.risk === 'HIGH' || (response.risk === 'MODERATE' && response.totalMessages > 5)) {
        therapistCallBtn.classList.remove('hidden');
    }
}

aiSendBtn.addEventListener('click', handleAiSend);
aiInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleAiSend();
});

therapistCallBtn.addEventListener('click', () => {
    // In a real app, this might trigger a modal with actual info or tel: protocol
    alert("Connecting to professional help... (Placeholder for tel:988 or local therapist)");
    window.location.href = "tel:988"; // Suicide & Crisis Lifeline
});

// ================= STRANGER CHAT LOGIC =================

function appendStrangerMessage(text, type) {
    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${type}`;
    msgDiv.innerHTML = `<div class="msg-content">${text}</div>`;
    strangerMessages.appendChild(msgDiv);
    strangerMessages.scrollTop = strangerMessages.scrollHeight;
}

function appendStrangerSystemMessage(text) {
    const msgDiv = document.createElement('div');
    msgDiv.className = `message system-msg`;
    msgDiv.innerHTML = `<div class="msg-content">${text}</div>`;
    strangerMessages.appendChild(msgDiv);
    strangerMessages.scrollTop = strangerMessages.scrollHeight;
}

function startStrangerSearch() {
    strangerMessages.innerHTML = '';
    strangerStatus.textContent = "Searching for someone...";
    strangerStatusDot.classList.remove('online');
    strangerInput.disabled = true;
    strangerSendBtn.disabled = true;
    
    findStranger();
}

nextStrangerBtn.addEventListener('click', () => {
    leaveCurrentChat();
    startStrangerSearch();
});

function handleStrangerSend() {
    const text = strangerInput.value.trim();
    if (!text) return;

    appendStrangerMessage(text, 'user-msg');
    sendStrangerMessage(text);
    strangerInput.value = '';
    strangerInput.focus();
}

strangerSendBtn.addEventListener('click', handleStrangerSend);
strangerInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleStrangerSend();
});
