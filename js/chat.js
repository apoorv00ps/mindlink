import { db, ref, set, onValue, onDisconnect, remove, push, serverTimestamp } from './firebase.js';

let currentChatId = null;
let currentUserId = null;
let isSearching = false;
let searchTimeout = null;
let chatUnsubscribe = null;
let queueRef = null;

// Callbacks
let onMatchFound = null;
let onMessageReceived = null;
let onSearchTimeout = null;
let onStrangerLeft = null;

export function initChatSystem(userId, callbacks) {
    currentUserId = userId;
    onMatchFound = callbacks.onMatchFound;
    onMessageReceived = callbacks.onMessageReceived;
    onSearchTimeout = callbacks.onSearchTimeout;
    onStrangerLeft = callbacks.onStrangerLeft;
}

export async function findStranger() {
    if (isSearching) return;
    isSearching = true;
    
    // Clear previous chat state
    leaveCurrentChat();

    const queueListRef = ref(db, 'queue');
    
    // Check if anyone is in queue
    onValue(queueListRef, (snapshot) => {
        if (!isSearching) return;

        const queueData = snapshot.val();
        let matched = false;

        if (queueData) {
            // Find a user who is not me
            for (const [key, user] of Object.entries(queueData)) {
                if (user.uid !== currentUserId) {
                    // Match found!
                    matched = true;
                    isSearching = false;
                    clearTimeout(searchTimeout);
                    
                    // Remove matched user from queue
                    remove(ref(db, `queue/${key}`));
                    
                    // Create a chat room
                    currentChatId = `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                    
                    const chatRef = ref(db, `chats/${currentChatId}`);
                    set(chatRef, {
                        users: {
                            [currentUserId]: true,
                            [user.uid]: true
                        },
                        createdAt: serverTimestamp()
                    });

                    // Update the matched user's record so they know the chatId (they are listening to their queue entry)
                    set(ref(db, `users/${user.uid}/activeChat`), currentChatId);
                    set(ref(db, `users/${currentUserId}/activeChat`), currentChatId);
                    
                    joinChatRoom(currentChatId);
                    break;
                }
            }
        }

        if (!matched) {
            // No one found, enter queue
            isSearching = false; // We entered the queue
            enterQueue();
        }
    }, { onlyOnce: true });
}

function enterQueue() {
    const newQueueRef = push(ref(db, 'queue'));
    queueRef = newQueueRef;
    
    set(newQueueRef, {
        uid: currentUserId,
        timestamp: serverTimestamp()
    });

    // Remove from queue if disconnects
    onDisconnect(newQueueRef).remove();

    // Listen for someone matching with us
    const myUserRef = ref(db, `users/${currentUserId}/activeChat`);
    onValue(myUserRef, (snapshot) => {
        const chatId = snapshot.val();
        if (chatId) {
            // We got matched!
            clearTimeout(searchTimeout);
            remove(queueRef);
            queueRef = null;
            remove(myUserRef); // clear it
            currentChatId = chatId;
            joinChatRoom(currentChatId);
        }
    });

    // Timeout if no one online
    searchTimeout = setTimeout(() => {
        if (queueRef) {
            remove(queueRef);
            queueRef = null;
            // Stop listening to activeChat
            set(myUserRef, null);
            if (onSearchTimeout) onSearchTimeout();
        }
    }, 15000); // 15 seconds
}

function joinChatRoom(chatId) {
    if (onMatchFound) onMatchFound();

    const messagesRef = ref(db, `chats/${chatId}/messages`);
    
    chatUnsubscribe = onValue(messagesRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
            // Get the latest message
            const messages = Object.values(data);
            const latestMessage = messages[messages.length - 1];
            
            // Only trigger if it's from the stranger
            if (latestMessage.senderId !== currentUserId) {
                if (onMessageReceived) onMessageReceived(latestMessage.text);
            }
        }
    });

    // Listen if stranger leaves
    const chatUsersRef = ref(db, `chats/${chatId}/users`);
    onValue(chatUsersRef, (snapshot) => {
        const users = snapshot.val();
        if (!users || Object.keys(users).length < 2) {
            if (onStrangerLeft) onStrangerLeft();
        }
    });

    // Handle disconnect
    const myChatPresenceRef = ref(db, `chats/${chatId}/users/${currentUserId}`);
    onDisconnect(myChatPresenceRef).remove();
}

export function sendStrangerMessage(text) {
    if (!currentChatId) return;
    
    const messagesRef = ref(db, `chats/${currentChatId}/messages`);
    push(messagesRef, {
        senderId: currentUserId,
        text: text,
        timestamp: serverTimestamp()
    });
}

export function leaveCurrentChat() {
    isSearching = false;
    clearTimeout(searchTimeout);
    
    if (queueRef) {
        remove(queueRef);
        queueRef = null;
    }

    if (currentChatId) {
        const myChatPresenceRef = ref(db, `chats/${currentChatId}/users/${currentUserId}`);
        remove(myChatPresenceRef);
        currentChatId = null;
    }
}
