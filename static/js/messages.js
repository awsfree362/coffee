// Messages Module - Facebook Messenger Style
let showInfoPanel = false;
let typingTimeout = null;
let currentConversationId = null;

async function renderInboxPage() {
    const mainContent = document.getElementById('mainContent');
    
    mainContent.innerHTML = `
        <div class="h-screen flex bg-white" style="height: calc(100vh - 120px);">
            <!-- Left Sidebar: Conversations -->
            <div class="w-full md:w-96 border-r border-gray-200 flex flex-col">
                <!-- Sidebar Header -->
                <div class="p-4 border-b border-gray-200">
                    <div class="flex items-center justify-between mb-3">
                        <h1 class="text-2xl font-bold">Chats</h1>
                        <div class="flex gap-2">
                            <button onclick="showNewMessageModal()" class="w-9 h-9 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-700 transition" title="New message">
                                <i class="fas fa-edit text-lg"></i>
                            </button>
                            <button class="w-9 h-9 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-700 transition" title="Options">
                                <i class="fas fa-ellipsis-h text-lg"></i>
                            </button>
                        </div>
                    </div>
                    <div class="relative">
                        <i class="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
                        <input type="text" id="conversationSearch" class="w-full pl-10 pr-4 py-2 bg-gray-100 rounded-full text-sm focus:outline-none focus:bg-gray-200" placeholder="Search Messenger" onkeyup="filterConversations()">
                    </div>
                </div>
                
                <!-- Filter Tabs -->
                <div class="px-4 py-2 border-b border-gray-200 flex gap-2 overflow-x-auto">
                    <button class="px-4 py-1.5 bg-blue-100 text-blue-600 rounded-full text-sm font-semibold whitespace-nowrap">Inbox</button>
                    <button class="px-4 py-1.5 hover:bg-gray-100 text-gray-600 rounded-full text-sm font-semibold whitespace-nowrap">Communities</button>
                </div>
                
                <!-- Conversations List -->
                <div id="conversationsList" class="flex-1 overflow-y-auto">
                    <div class="text-center py-8">
                        <div class="spinner mx-auto"></div>
                    </div>
                </div>
            </div>
            
            <!-- Main Chat Area -->
            <div class="hidden md:flex flex-1 flex-col bg-white">
                <div id="chatWindow" class="flex-1 flex items-center justify-center">
                    <div class="text-center text-gray-400">
                        <div class="w-24 h-24 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center">
                            <i class="fas fa-comments text-4xl text-blue-500"></i>
                        </div>
                        <p class="text-lg font-semibold text-gray-700">Select a conversation</p>
                        <p class="text-sm mt-1">Choose from your existing conversations or start a new one</p>
                    </div>
                </div>
            </div>
            
            <!-- Right Info Panel -->
            <div id="infoPanel" class="hidden w-96 border-l border-gray-200 flex-col bg-gray-50">
                <!-- Info panel content will be loaded here -->
            </div>
        </div>
    `;
    
    loadConversations();
    setupSocketListeners();
}

let currentConversation = null;

async function loadConversations() {
    try {
        const response = await fetch(`${API_BASE}/messages/conversations`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        const data = await response.json();
        
        const container = document.getElementById('conversationsList');
        if (data.conversations && data.conversations.length > 0) {
            container.innerHTML = data.conversations.map(conv => `
                <div class="px-4 py-3 hover:bg-gray-100 cursor-pointer transition ${currentConversation && currentConversation.user_id === conv.user_id ? 'bg-gray-100' : ''}" 
                     onclick="openConversation(${conv.user_id}, '${conv.username}', '${conv.profile_image_url || ''}')">
                    <div class="flex items-center gap-3">
                        <div class="relative flex-shrink-0">
                            <img src="${conv.profile_image_url ? '/' + conv.profile_image_url : `https://ui-avatars.com/api/?name=${encodeURIComponent(conv.username)}&background=0084ff&color=fff`}" 
                                 alt="${conv.username}" 
                                 class="w-14 h-14 rounded-full object-cover">
                            ${conv.is_online ? '<span class="absolute bottom-0 right-0 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></span>' : ''}
                        </div>
                        <div class="flex-1 min-w-0">
                            <div class="flex justify-between items-baseline mb-1">
                                <p class="font-semibold text-gray-900 truncate">${conv.username}</p>
                                <span class="text-xs text-gray-500 ml-2">${formatDate(conv.last_message_at)}</span>
                            </div>
                            <div class="flex items-center gap-2">
                                <p class="text-sm text-gray-600 truncate flex-1 ${conv.unread_count > 0 ? 'font-semibold text-gray-900' : ''}">${conv.last_message || 'Start a conversation'}</p>
                                ${conv.unread_count > 0 ? `<span class="bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0">${conv.unread_count}</span>` : ''}
                            </div>
                        </div>
                    </div>
                </div>
            `).join('');
        } else {
            container.innerHTML = '<div class="text-center py-12"><p class="text-gray-500">No conversations yet</p><p class="text-sm text-gray-400 mt-2">Start chatting with someone!</p></div>';
        }
    } catch (error) {
        console.error('Failed to load conversations:', error);
        document.getElementById('conversationsList').innerHTML = '<p class="text-red-500 text-center py-8">Failed to load conversations</p>';
    }
}

async function openConversation(userId, username, profileImage) {
    currentConversation = { user_id: userId, username, profile_image: profileImage };
    
    const chatWindow = document.getElementById('chatWindow');
    chatWindow.className = 'flex-1 flex flex-col';
    chatWindow.innerHTML = `
        <!-- Chat Header -->
        <div class="px-4 py-3 border-b border-gray-200 flex items-center gap-3 bg-white shadow-sm">
            <img src="${profileImage ? '/' + profileImage : `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=0084ff&color=fff`}" 
                 alt="${username}" 
                 class="w-10 h-10 rounded-full object-cover cursor-pointer"
                 onclick="viewProfile(${userId})">
            <div class="flex-1 cursor-pointer" onclick="viewProfile(${userId})">
                <p class="font-semibold text-gray-900">${username}</p>
                <p id="typingIndicator" class="text-xs text-gray-500">Active now</p>
            </div>
            <div class="flex gap-1">
                <button class="w-9 h-9 rounded-full hover:bg-gray-100 flex items-center justify-center text-blue-600 transition" title="Voice call">
                    <i class="fas fa-phone text-lg"></i>
                </button>
                <button class="w-9 h-9 rounded-full hover:bg-gray-100 flex items-center justify-center text-blue-600 transition" title="Video call">
                    <i class="fas fa-video text-lg"></i>
                </button>
                <button onclick="toggleInfoPanel()" class="w-9 h-9 rounded-full hover:bg-gray-100 flex items-center justify-center text-blue-600 transition" title="Conversation information">
                    <i class="fas fa-info-circle text-lg"></i>
                </button>
            </div>
        </div>
        
        <!-- Messages Container -->
        <div id="messagesContainer" class="flex-1 overflow-y-auto p-4" style="background: #fff;">
            <div class="text-center py-8">
                <div class="spinner mx-auto"></div>
            </div>
        </div>
        
        <!-- Message Input -->
        <div class="px-4 py-3 border-t border-gray-200 bg-white">
            <div id="attachmentPreview" class="mb-2 hidden"></div>
            <form onsubmit="sendMessage(event)" class="flex items-center gap-2">
                <button type="button" onclick="attachFile()" class="w-9 h-9 rounded-full hover:bg-gray-100 flex items-center justify-center text-blue-600 transition" title="Attach file">
                    <i class="fas fa-plus text-lg"></i>
                </button>
                <input type="file" id="messageAttachment" class="hidden" accept="image/*,video/*" onchange="handleAttachment(this)">
                <button type="button" class="w-9 h-9 rounded-full hover:bg-gray-100 flex items-center justify-center text-blue-600 transition" title="Add sticker">
                    <i class="fas fa-sticky-note text-lg"></i>
                </button>
                <button type="button" class="w-9 h-9 rounded-full hover:bg-gray-100 flex items-center justify-center text-blue-600 transition" title="Add GIF">
                    <i class="fas fa-image text-lg"></i>
                </button>
                <div class="flex-1 relative">
                    <input type="text" id="messageInput" class="w-full px-4 py-2 bg-gray-100 rounded-full text-sm focus:outline-none focus:bg-gray-200" placeholder="Aa" oninput="handleTyping()">
                    <button type="button" class="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700" title="Add emoji">
                        <i class="far fa-smile text-lg"></i>
                    </button>
                </div>
                <button type="submit" class="w-9 h-9 rounded-full bg-blue-600 hover:bg-blue-700 flex items-center justify-center text-white transition" title="Send">
                    <i class="fas fa-paper-plane text-sm"></i>
                </button>
            </form>
        </div>
    `;
    
    loadMessages(userId);
    loadConversations();
    loadInfoPanel(userId, username, profileImage);
    
    // Join conversation room for real-time updates
    if (socket) {
        socket.emit('join_conversation', { user_id: userId });
    }
}

async function loadMessages(userId) {
    try {
        const response = await fetch(`${API_BASE}/messages/conversation/${userId}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        const data = await response.json();
        
        const container = document.getElementById('messagesContainer');
        if (data.messages && data.messages.length > 0) {
            let lastDate = null;
            let messagesHTML = '';
            
            data.messages.forEach(msg => {
                const msgDate = new Date(msg.created_at).toDateString();
                
                // Add date separator if date changed
                if (msgDate !== lastDate) {
                    messagesHTML += `
                        <div class="flex justify-center my-4">
                            <span class="px-3 py-1 bg-gray-200 text-gray-600 text-xs rounded-full font-semibold">
                                ${formatDateSeparator(msg.created_at)}
                            </span>
                        </div>
                    `;
                    lastDate = msgDate;
                }
                
                const isSent = msg.sender_id === currentUser.id;
                messagesHTML += `
                    <div class="flex ${isSent ? 'justify-end' : 'justify-start'} mb-1">
                        <div class="max-w-xs lg:max-w-md">
                            ${msg.attachment_url ? `
                                <div class="mb-1">
                                    ${msg.attachment_type === 'image' ? 
                                        `<img src="/${msg.attachment_url}" class="rounded-2xl max-w-full cursor-pointer" onclick="viewImage('/${msg.attachment_url}')">` :
                                        `<video src="/${msg.attachment_url}" class="rounded-2xl max-w-full" controls></video>`
                                    }
                                </div>
                            ` : ''}
                            ${msg.message_text ? `
                                <div class="${isSent ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-900'} px-4 py-2 rounded-2xl inline-block">
                                    <p class="text-sm">${msg.message_text}</p>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                `;
            });
            
            container.innerHTML = messagesHTML;
            
            // Scroll to bottom
            container.scrollTop = container.scrollHeight;
        } else {
            container.innerHTML = `
                <div class="text-center py-12">
                    <div class="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center">
                        <i class="fas fa-comment-dots text-3xl text-blue-500"></i>
                    </div>
                    <p class="text-gray-500 font-semibold">No messages yet</p>
                    <p class="text-sm text-gray-400 mt-2">Send a message to start the conversation</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Failed to load messages:', error);
        document.getElementById('messagesContainer').innerHTML = '<p class="text-red-500 text-center py-8">Failed to load messages</p>';
    }
}

function formatDateSeparator(dateString) {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
        return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
        return 'Yesterday';
    } else {
        return date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    }
}

async function sendMessage(e) {
    e.preventDefault();
    
    const input = document.getElementById('messageInput');
    const message = input.value.trim();
    const attachment = document.getElementById('messageAttachment').files[0];
    
    if (!message && !attachment) return;
    
    const formData = new FormData();
    formData.append('receiver_id', currentConversation.user_id);
    if (message) formData.append('message_text', message);
    if (attachment) formData.append('attachment', attachment);
    
    try {
        const response = await fetch(`${API_BASE}/messages/send`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: formData
        });
        
        const data = await response.json();
        
        if (response.ok) {
            input.value = '';
            document.getElementById('messageAttachment').value = '';
            document.getElementById('attachmentPreview').classList.add('hidden');
            loadMessages(currentConversation.user_id);
            
            // Emit socket event
            if (socket) {
                socket.emit('send_message', {
                    receiver_id: currentConversation.user_id,
                    message: message
                });
            }
        } else {
            showNotification(data.error || 'Failed to send message', 'error');
        }
    } catch (error) {
        console.error('Failed to send message:', error);
        showNotification('Failed to send message', 'error');
    }
}

function attachFile() {
    document.getElementById('messageAttachment').click();
}

function handleAttachment(input) {
    const file = input.files[0];
    if (file) {
        const preview = document.getElementById('attachmentPreview');
        const reader = new FileReader();
        
        reader.onload = (e) => {
            if (file.type.startsWith('image/')) {
                preview.innerHTML = `
                    <div class="relative inline-block">
                        <img src="${e.target.result}" class="h-20 rounded-lg">
                        <button onclick="clearAttachment()" class="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center">
                            <i class="fas fa-times text-xs"></i>
                        </button>
                    </div>
                `;
            } else {
                preview.innerHTML = `
                    <div class="flex items-center gap-2 bg-gray-100 p-2 rounded-lg inline-block">
                        <i class="fas fa-file"></i>
                        <span class="text-sm">${file.name}</span>
                        <button onclick="clearAttachment()" class="text-red-500">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                `;
            }
            preview.classList.remove('hidden');
        };
        
        reader.readAsDataURL(file);
    }
}

function clearAttachment() {
    document.getElementById('messageAttachment').value = '';
    document.getElementById('attachmentPreview').classList.add('hidden');
}

function filterConversations() {
    const query = document.getElementById('conversationSearch').value.toLowerCase();
    const conversations = document.querySelectorAll('#conversationsList > div');
    
    conversations.forEach(conv => {
        const username = conv.textContent.toLowerCase();
        conv.style.display = username.includes(query) ? 'block' : 'none';
    });
}

function toggleInfoPanel() {
    showInfoPanel = !showInfoPanel;
    const infoPanel = document.getElementById('infoPanel');
    
    if (showInfoPanel) {
        infoPanel.classList.remove('hidden');
        infoPanel.classList.add('flex');
    } else {
        infoPanel.classList.add('hidden');
        infoPanel.classList.remove('flex');
    }
}

async function loadInfoPanel(userId, username, profileImage) {
    const infoPanel = document.getElementById('infoPanel');
    
    infoPanel.innerHTML = `
        <div class="flex-1 overflow-y-auto">
            <!-- Profile Section -->
            <div class="p-6 text-center border-b border-gray-200 bg-white">
                <img src="${profileImage ? '/' + profileImage : `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=0084ff&color=fff`}" 
                     alt="${username}" 
                     class="w-24 h-24 rounded-full object-cover mx-auto mb-3 cursor-pointer"
                     onclick="viewProfile(${userId})">
                <h2 class="text-xl font-bold text-gray-900 mb-1">${username}</h2>
                <p class="text-sm text-gray-500">Active now</p>
                <div class="flex gap-2 justify-center mt-4">
                    <button onclick="viewProfile(${userId})" class="flex-1 max-w-xs px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-semibold transition">
                        <i class="fas fa-user mr-2"></i>View Profile
                    </button>
                </div>
            </div>
            
            <!-- Customize Chat -->
            <div class="bg-white border-b border-gray-200">
                <button class="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                            <i class="fas fa-palette text-gray-600"></i>
                        </div>
                        <span class="font-semibold text-gray-900">Customize chat</span>
                    </div>
                    <i class="fas fa-chevron-right text-gray-400"></i>
                </button>
            </div>
            
            <!-- Media, Files, Links -->
            <div class="bg-white border-b border-gray-200">
                <div class="px-6 py-3">
                    <h3 class="text-sm font-semibold text-gray-500 uppercase">Media, files and links</h3>
                </div>
                <div id="sharedMedia" class="px-6 pb-4">
                    <div class="text-center py-8 text-gray-400 text-sm">No shared media yet</div>
                </div>
            </div>
            
            <!-- Privacy & Support -->
            <div class="bg-white border-b border-gray-200">
                <button class="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                            <i class="fas fa-bell text-gray-600"></i>
                        </div>
                        <span class="font-semibold text-gray-900">Notifications</span>
                    </div>
                    <i class="fas fa-chevron-right text-gray-400"></i>
                </button>
                <button class="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                            <i class="fas fa-search text-gray-600"></i>
                        </div>
                        <span class="font-semibold text-gray-900">Search in conversation</span>
                    </div>
                    <i class="fas fa-chevron-right text-gray-400"></i>
                </button>
            </div>
            
            <!-- More Actions -->
            <div class="bg-white">
                <button class="w-full px-6 py-4 flex items-center gap-3 hover:bg-gray-50 transition text-left">
                    <div class="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                        <i class="fas fa-archive text-gray-600"></i>
                    </div>
                    <span class="font-semibold text-gray-900">Archive chat</span>
                </button>
                <button class="w-full px-6 py-4 flex items-center gap-3 hover:bg-gray-50 transition text-left">
                    <div class="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                        <i class="fas fa-trash text-red-600"></i>
                    </div>
                    <span class="font-semibold text-red-600">Delete chat</span>
                </button>
                <button class="w-full px-6 py-4 flex items-center gap-3 hover:bg-gray-50 transition text-left">
                    <div class="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                        <i class="fas fa-ban text-red-600"></i>
                    </div>
                    <span class="font-semibold text-red-600">Block</span>
                </button>
            </div>
        </div>
    `;
    
    // Load shared media
    loadSharedMedia(userId);
}

async function loadSharedMedia(userId) {
    try {
        const response = await fetch(`${API_BASE}/messages/conversation/${userId}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        const data = await response.json();
        
        if (data.messages) {
            const mediaMessages = data.messages.filter(msg => msg.attachment_url && msg.attachment_type === 'image');
            
            if (mediaMessages.length > 0) {
                const container = document.getElementById('sharedMedia');
                container.innerHTML = `
                    <div class="grid grid-cols-3 gap-1">
                        ${mediaMessages.slice(0, 9).map(msg => `
                            <img src="/${msg.attachment_url}" 
                                 class="w-full h-24 object-cover rounded cursor-pointer hover:opacity-75 transition"
                                 onclick="viewImage('/${msg.attachment_url}')">
                        `).join('')}
                    </div>
                    ${mediaMessages.length > 9 ? `<button class="w-full mt-2 py-2 text-sm text-blue-600 hover:bg-gray-50 rounded font-semibold">See all</button>` : ''}
                `;
            }
        }
    } catch (error) {
        console.error('Failed to load shared media:', error);
    }
}

function showNewMessageModal() {
    showNotification('New message feature coming soon!', 'info');
}

// Typing indicator handler
function handleTyping() {
    if (!currentConversation || !socket) return;
    
    // Emit typing start
    socket.emit('typing_start', {
        conversation_id: currentConversationId,
        user_id: currentUser.id,
        receiver_id: currentConversation.user_id
    });
    
    // Clear existing timeout
    if (typingTimeout) {
        clearTimeout(typingTimeout);
    }
    
    // Set timeout to emit typing stop
    typingTimeout = setTimeout(() => {
        socket.emit('typing_stop', {
            conversation_id: currentConversationId,
            user_id: currentUser.id,
            receiver_id: currentConversation.user_id
        });
    }, 2000);
}

// Setup socket event listeners
function setupSocketListeners() {
    if (!socket) return;
    
    // Listen for new messages
    socket.on('new_message', (data) => {
        if (currentConversation && data.message.sender_id === currentConversation.user_id) {
            // Reload messages if conversation is open
            loadMessages(currentConversation.user_id);
        }
        // Always reload conversations list
        loadConversations();
    });
    
    // Listen for typing indicators
    socket.on('user_typing', (data) => {
        if (currentConversation && data.user_id === currentConversation.user_id) {
            const indicator = document.getElementById('typingIndicator');
            if (indicator) {
                if (data.typing) {
                    indicator.textContent = 'Typing...';
                    indicator.classList.add('text-blue-600');
                } else {
                    indicator.textContent = 'Active now';
                    indicator.classList.remove('text-blue-600');
                }
            }
        }
    });
    
    // Listen for online status changes
    socket.on('user_status', (data) => {
        // Update conversation list online indicators
        const statusIndicators = document.querySelectorAll(`[data-user-id="${data.user_id}"]`);
        statusIndicators.forEach(indicator => {
            if (data.online) {
                indicator.classList.remove('hidden');
            } else {
                indicator.classList.add('hidden');
            }
        });
    });
    
    // Listen for read receipts
    socket.on('message_read_receipt', (data) => {
        // Update message read status in UI
        const messageElement = document.querySelector(`[data-message-id="${data.message_id}"]`);
        if (messageElement) {
            messageElement.classList.add('read');
        }
    });
}

async function startConversation(userId) {
    try {
        const response = await fetch(`${API_BASE}/users/profile/${userId}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        const data = await response.json();
        
        if (data.user) {
            showPage('inbox');
            setTimeout(() => {
                openConversation(userId, data.user.username, data.user.profile_image_url);
            }, 500);
        }
    } catch (error) {
        console.error('Failed to start conversation:', error);
        showNotification('Failed to start conversation', 'error');
    }
}

function viewImage(url) {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4';
    modal.onclick = () => modal.remove();
    
    modal.innerHTML = `
        <img src="${url}" class="max-w-full max-h-full rounded-lg">
        <button onclick="this.closest('.fixed').remove()" class="absolute top-4 right-4 text-white text-2xl">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    document.body.appendChild(modal);
}

// Socket event listeners for real-time messages
if (socket) {
    socket.on('receive_message', (data) => {
        if (currentConversation && data.sender_id === currentConversation.user_id) {
            loadMessages(currentConversation.user_id);
        }
        loadConversations(); // Update conversation list
    });
}
