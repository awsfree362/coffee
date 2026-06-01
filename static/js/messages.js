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
                            <button onclick="toggleMessengerOptions()" class="w-9 h-9 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-700 transition" title="Options">
                                <i class="fas fa-ellipsis-h text-lg"></i>
                            </button>
                        </div>
                    </div>
                    
                    <!-- Options Dropdown -->
                    <div id="messengerOptionsMenu" class="hidden absolute right-4 top-16 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50 w-56">
                        <button onclick="showArchivedChats()" class="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-3">
                            <i class="fas fa-archive text-gray-600"></i>
                            <span class="text-sm font-semibold">Archived chats</span>
                        </button>
                        <button onclick="showMessageRequests()" class="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-3">
                            <i class="fas fa-envelope text-gray-600"></i>
                            <span class="text-sm font-semibold">Message requests</span>
                        </button>
                        <button onclick="showMessengerSettings()" class="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-3">
                            <i class="fas fa-cog text-gray-600"></i>
                            <span class="text-sm font-semibold">Settings</span>
                        </button>
                        <div class="border-t border-gray-200 my-2"></div>
                        <button onclick="markAllAsRead()" class="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-3">
                            <i class="fas fa-check-double text-gray-600"></i>
                            <span class="text-sm font-semibold">Mark all as read</span>
                        </button>
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
    
    // Get conversation ID
    const conversation = await getConversationId(userId);
    currentConversationId = conversation ? conversation.id : null;
    
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
                <button onclick="muteConversation(${currentConversationId})" class="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                            <i class="fas fa-bell text-gray-600"></i>
                        </div>
                        <span class="font-semibold text-gray-900">Mute notifications</span>
                    </div>
                    <i class="fas fa-chevron-right text-gray-400"></i>
                </button>
                <button onclick="searchInConversation()" class="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition">
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
                <button onclick="archiveConversation(${currentConversationId})" class="w-full px-6 py-4 flex items-center gap-3 hover:bg-gray-50 transition text-left">
                    <div class="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                        <i class="fas fa-archive text-gray-600"></i>
                    </div>
                    <span class="font-semibold text-gray-900">Archive chat</span>
                </button>
                <button onclick="deleteConversation(${currentConversationId})" class="w-full px-6 py-4 flex items-center gap-3 hover:bg-gray-50 transition text-left">
                    <div class="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                        <i class="fas fa-trash text-red-600"></i>
                    </div>
                    <span class="font-semibold text-red-600">Delete chat</span>
                </button>
                <button onclick="blockUser(${userId})" class="w-full px-6 py-4 flex items-center gap-3 hover:bg-gray-50 transition text-left">
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

async function getConversationId(userId) {
    try {
        const response = await fetch(`${API_BASE}/messages/conversation/${userId}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        const data = await response.json();
        return data.conversation;
    } catch (error) {
        console.error('Error getting conversation:', error);
        return null;
    }
}

async function muteConversation(conversationId) {
    if (!conversationId) return;
    
    try {
        const response = await fetch(`${API_BASE}/messages/mute/${conversationId}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            showNotification('Conversation muted', 'success');
        }
    } catch (error) {
        console.error('Error muting conversation:', error);
        showNotification('Failed to mute conversation', 'error');
    }
}

async function archiveConversation(conversationId) {
    if (!conversationId) return;
    
    try {
        const response = await fetch(`${API_BASE}/messages/archive/${conversationId}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            showNotification('Conversation archived', 'success');
            loadConversations();
        }
    } catch (error) {
        console.error('Error archiving conversation:', error);
        showNotification('Failed to archive conversation', 'error');
    }
}

async function deleteConversation(conversationId) {
    if (!conversationId) return;
    
    if (!confirm('Are you sure you want to delete this conversation? This cannot be undone.')) {
        return;
    }
    
    showNotification('Delete conversation feature coming soon', 'info');
}

async function blockUser(userId) {
    if (!userId) return;
    
    if (!confirm('Are you sure you want to block this user? They will not be able to message you.')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/messages/block/${userId}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            showNotification('User blocked', 'success');
            showPage('inbox');
        }
    } catch (error) {
        console.error('Error blocking user:', error);
        showNotification('Failed to block user', 'error');
    }
}

function searchInConversation() {
    showNotification('Search in conversation feature coming soon', 'info');
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
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4';
    modal.innerHTML = `
        <div class="bg-white rounded-2xl p-6 max-w-md w-full">
            <div class="flex justify-between items-center mb-4">
                <h2 class="text-xl font-bold">New Message</h2>
                <button onclick="this.closest('.fixed').remove()" class="text-gray-500 hover:text-gray-700">
                    <i class="fas fa-times text-xl"></i>
                </button>
            </div>
            
            <div class="mb-4">
                <label class="block text-sm font-semibold text-gray-700 mb-2">Search users</label>
                <div class="relative">
                    <i class="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
                    <input type="text" id="userSearchInput" class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500" placeholder="Search by username..." oninput="searchUsersForMessage(this.value)">
                </div>
            </div>
            
            <div id="userSearchResults" class="max-h-64 overflow-y-auto">
                <p class="text-gray-500 text-center py-4 text-sm">Start typing to search users</p>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    document.getElementById('userSearchInput').focus();
}

let searchTimeout = null;
async function searchUsersForMessage(query) {
    if (!query || query.length < 2) {
        document.getElementById('userSearchResults').innerHTML = '<p class="text-gray-500 text-center py-4 text-sm">Start typing to search users</p>';
        return;
    }
    
    // Clear previous timeout
    if (searchTimeout) clearTimeout(searchTimeout);
    
    // Set new timeout for debouncing
    searchTimeout = setTimeout(async () => {
        try {
            const response = await fetch(`${API_BASE}/users/search?q=${encodeURIComponent(query)}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            const data = await response.json();
            const container = document.getElementById('userSearchResults');
            
            if (data.users && data.users.length > 0) {
                container.innerHTML = data.users.map(user => `
                    <div class="flex items-center gap-3 p-3 hover:bg-gray-100 rounded-lg cursor-pointer transition" onclick="startNewConversation(${user.id}, '${user.username}', '${user.profile_image_url || ''}')">
                        <img src="${user.profile_image_url ? '/' + user.profile_image_url : `https://ui-avatars.com/api/?name=${encodeURIComponent(user.username)}&background=0084ff&color=fff`}" 
                             alt="${user.username}" 
                             class="w-12 h-12 rounded-full object-cover">
                        <div class="flex-1">
                            <p class="font-semibold text-gray-900">${user.username}</p>
                            <p class="text-sm text-gray-500">${user.user_type}</p>
                        </div>
                    </div>
                `).join('');
            } else {
                container.innerHTML = '<p class="text-gray-500 text-center py-4 text-sm">No users found</p>';
            }
        } catch (error) {
            console.error('Search error:', error);
            document.getElementById('userSearchResults').innerHTML = '<p class="text-red-500 text-center py-4 text-sm">Search failed</p>';
        }
    }, 300);
}

function startNewConversation(userId, username, profileImage) {
    // Close modal
    document.querySelector('.fixed.inset-0').remove();
    
    // Open conversation
    openConversation(userId, username, profileImage);
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

// Messenger options menu
function toggleMessengerOptions() {
    const menu = document.getElementById('messengerOptionsMenu');
    if (menu.classList.contains('hidden')) {
        menu.classList.remove('hidden');
        // Close menu when clicking outside
        setTimeout(() => {
            document.addEventListener('click', closeMessengerOptions);
        }, 100);
    } else {
        menu.classList.add('hidden');
        document.removeEventListener('click', closeMessengerOptions);
    }
}

function closeMessengerOptions(e) {
    const menu = document.getElementById('messengerOptionsMenu');
    if (menu && !menu.contains(e.target) && !e.target.closest('button[onclick="toggleMessengerOptions()"]')) {
        menu.classList.add('hidden');
        document.removeEventListener('click', closeMessengerOptions);
    }
}

function showArchivedChats() {
    toggleMessengerOptions();
    
    const mainContent = document.getElementById('mainContent');
    mainContent.innerHTML = `
        <div class="h-screen flex bg-white" style="height: calc(100vh - 120px);">
            <div class="w-full max-w-4xl mx-auto flex flex-col">
                <!-- Header -->
                <div class="p-4 border-b border-gray-200">
                    <div class="flex items-center gap-3 mb-4">
                        <button onclick="showPage('inbox')" class="w-9 h-9 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-700 transition">
                            <i class="fas fa-arrow-left text-lg"></i>
                        </button>
                        <h1 class="text-2xl font-bold">Archived Chats</h1>
                    </div>
                </div>
                
                <!-- Archived Conversations List -->
                <div id="archivedConversationsList" class="flex-1 overflow-y-auto">
                    <div class="text-center py-8">
                        <div class="spinner mx-auto"></div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    loadArchivedConversations();
}

async function loadArchivedConversations() {
    try {
        const response = await fetch(`${API_BASE}/messages/conversations`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        const data = await response.json();
        const container = document.getElementById('archivedConversationsList');
        
        // Filter archived conversations (we'll need to check settings)
        const archivedConvs = [];
        
        if (data.conversations) {
            for (const conv of data.conversations) {
                // Check if archived
                const settingsResp = await fetch(`${API_BASE}/messages/conversation-settings/${conv.id}`, {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                });
                const settings = await settingsResp.json();
                if (settings.is_archived) {
                    archivedConvs.push(conv);
                }
            }
        }
        
        if (archivedConvs.length > 0) {
            container.innerHTML = archivedConvs.map(conv => `
                <div class="px-4 py-3 border-b hover:bg-gray-50 cursor-pointer transition" 
                     onclick="openConversation(${conv.user_id}, '${conv.username}', '${conv.profile_image_url || ''}')">
                    <div class="flex items-center gap-3">
                        <img src="${conv.profile_image_url ? '/' + conv.profile_image_url : `https://ui-avatars.com/api/?name=${encodeURIComponent(conv.username)}&background=0084ff&color=fff`}" 
                             alt="${conv.username}" 
                             class="w-14 h-14 rounded-full object-cover">
                        <div class="flex-1">
                            <p class="font-semibold text-gray-900">${conv.username}</p>
                            <p class="text-sm text-gray-600 truncate">${conv.last_message || 'No messages'}</p>
                        </div>
                        <button onclick="event.stopPropagation(); unarchiveConversationFromList(${conv.id})" class="px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                            Unarchive
                        </button>
                    </div>
                </div>
            `).join('');
        } else {
            container.innerHTML = `
                <div class="text-center py-12">
                    <i class="fas fa-archive text-6xl text-gray-300 mb-4"></i>
                    <p class="text-gray-500 font-semibold">No archived chats</p>
                    <p class="text-sm text-gray-400 mt-2">Archived conversations will appear here</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Failed to load archived conversations:', error);
        document.getElementById('archivedConversationsList').innerHTML = '<p class="text-red-500 text-center py-8">Failed to load archived chats</p>';
    }
}

async function unarchiveConversationFromList(conversationId) {
    try {
        const response = await fetch(`${API_BASE}/messages/unarchive/${conversationId}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            showNotification('Conversation unarchived', 'success');
            loadArchivedConversations();
        }
    } catch (error) {
        console.error('Error unarchiving conversation:', error);
        showNotification('Failed to unarchive conversation', 'error');
    }
}

function showMessageRequests() {
    toggleMessengerOptions();
    
    const mainContent = document.getElementById('mainContent');
    mainContent.innerHTML = `
        <div class="h-screen flex bg-white" style="height: calc(100vh - 120px);">
            <div class="w-full max-w-4xl mx-auto flex flex-col">
                <!-- Header -->
                <div class="p-4 border-b border-gray-200">
                    <div class="flex items-center gap-3 mb-4">
                        <button onclick="showPage('inbox')" class="w-9 h-9 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-700 transition">
                            <i class="fas fa-arrow-left text-lg"></i>
                        </button>
                        <h1 class="text-2xl font-bold">Message Requests</h1>
                    </div>
                    <p class="text-sm text-gray-600">Messages from people you may not know</p>
                </div>
                
                <!-- Message Requests List -->
                <div id="messageRequestsList" class="flex-1 overflow-y-auto">
                    <div class="text-center py-8">
                        <div class="spinner mx-auto"></div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    loadMessageRequests();
}

async function loadMessageRequests() {
    try {
        const response = await fetch(`${API_BASE}/messages/requests`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        const data = await response.json();
        const container = document.getElementById('messageRequestsList');
        
        if (data.requests && data.requests.length > 0) {
            container.innerHTML = data.requests.map(req => `
                <div class="px-4 py-4 border-b">
                    <div class="flex items-center gap-3 mb-3">
                        <img src="${req.profile_image_url ? '/' + req.profile_image_url : `https://ui-avatars.com/api/?name=${encodeURIComponent(req.username)}&background=0084ff&color=fff`}" 
                             alt="${req.username}" 
                             class="w-14 h-14 rounded-full object-cover">
                        <div class="flex-1">
                            <p class="font-semibold text-gray-900">${req.username}</p>
                            <p class="text-sm text-gray-600">${req.user_type}</p>
                        </div>
                    </div>
                    <p class="text-sm text-gray-700 mb-3">${req.last_message || 'Wants to connect with you'}</p>
                    <div class="flex gap-2">
                        <button onclick="acceptMessageRequest(${req.user_id}, '${req.username}', '${req.profile_image_url || ''}')" class="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold">
                            Accept
                        </button>
                        <button onclick="declineMessageRequest(${req.user_id})" class="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-semibold">
                            Decline
                        </button>
                    </div>
                </div>
            `).join('');
        } else {
            container.innerHTML = `
                <div class="text-center py-12">
                    <i class="fas fa-envelope-open text-6xl text-gray-300 mb-4"></i>
                    <p class="text-gray-500 font-semibold">No message requests</p>
                    <p class="text-sm text-gray-400 mt-2">You're all caught up!</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Failed to load message requests:', error);
        document.getElementById('messageRequestsList').innerHTML = '<p class="text-red-500 text-center py-8">Failed to load message requests</p>';
    }
}

function acceptMessageRequest(userId, username, profileImage) {
    showPage('inbox');
    setTimeout(() => {
        openConversation(userId, username, profileImage);
    }, 300);
}

async function declineMessageRequest(userId) {
    if (!confirm('Are you sure you want to decline this message request?')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/messages/decline-request/${userId}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            showNotification('Message request declined', 'success');
            loadMessageRequests();
        }
    } catch (error) {
        console.error('Error declining request:', error);
        showNotification('Failed to decline request', 'error');
    }
}

function showMessengerSettings() {
    toggleMessengerOptions();
    
    const mainContent = document.getElementById('mainContent');
    mainContent.innerHTML = `
        <div class="h-screen flex bg-white" style="height: calc(100vh - 120px);">
            <div class="w-full max-w-4xl mx-auto flex flex-col">
                <!-- Header -->
                <div class="p-4 border-b border-gray-200">
                    <div class="flex items-center gap-3 mb-4">
                        <button onclick="showPage('inbox')" class="w-9 h-9 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-700 transition">
                            <i class="fas fa-arrow-left text-lg"></i>
                        </button>
                        <h1 class="text-2xl font-bold">Messenger Settings</h1>
                    </div>
                </div>
                
                <!-- Settings Content -->
                <div class="flex-1 overflow-y-auto">
                    <!-- Notifications -->
                    <div class="bg-white border-b border-gray-200">
                        <div class="px-6 py-3 bg-gray-50">
                            <h3 class="text-sm font-semibold text-gray-700 uppercase">Notifications</h3>
                        </div>
                        <div class="px-6 py-4 flex items-center justify-between">
                            <div>
                                <p class="font-semibold text-gray-900">Message notifications</p>
                                <p class="text-sm text-gray-500">Get notified when you receive messages</p>
                            </div>
                            <label class="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" id="messageNotifications" class="sr-only peer" checked onchange="toggleSetting('messageNotifications', this.checked)">
                                <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                            </label>
                        </div>
                        <div class="px-6 py-4 flex items-center justify-between border-t">
                            <div>
                                <p class="font-semibold text-gray-900">Sound</p>
                                <p class="text-sm text-gray-500">Play sound for new messages</p>
                            </div>
                            <label class="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" id="soundNotifications" class="sr-only peer" checked onchange="toggleSetting('soundNotifications', this.checked)">
                                <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                            </label>
                        </div>
                    </div>
                    
                    <!-- Privacy -->
                    <div class="bg-white border-b border-gray-200">
                        <div class="px-6 py-3 bg-gray-50">
                            <h3 class="text-sm font-semibold text-gray-700 uppercase">Privacy</h3>
                        </div>
                        <div class="px-6 py-4 flex items-center justify-between">
                            <div>
                                <p class="font-semibold text-gray-900">Read receipts</p>
                                <p class="text-sm text-gray-500">Let others know when you've read their messages</p>
                            </div>
                            <label class="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" id="readReceipts" class="sr-only peer" checked onchange="toggleSetting('readReceipts', this.checked)">
                                <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                            </label>
                        </div>
                        <div class="px-6 py-4 flex items-center justify-between border-t">
                            <div>
                                <p class="font-semibold text-gray-900">Typing indicators</p>
                                <p class="text-sm text-gray-500">Show when you're typing</p>
                            </div>
                            <label class="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" id="typingIndicators" class="sr-only peer" checked onchange="toggleSetting('typingIndicators', this.checked)">
                                <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                            </label>
                        </div>
                        <div class="px-6 py-4 flex items-center justify-between border-t">
                            <div>
                                <p class="font-semibold text-gray-900">Online status</p>
                                <p class="text-sm text-gray-500">Show when you're active</p>
                            </div>
                            <label class="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" id="onlineStatus" class="sr-only peer" checked onchange="toggleSetting('onlineStatus', this.checked)">
                                <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                            </label>
                        </div>
                    </div>
                    
                    <!-- Data & Storage -->
                    <div class="bg-white border-b border-gray-200">
                        <div class="px-6 py-3 bg-gray-50">
                            <h3 class="text-sm font-semibold text-gray-700 uppercase">Data & Storage</h3>
                        </div>
                        <button onclick="clearMessageCache()" class="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition text-left">
                            <div>
                                <p class="font-semibold text-gray-900">Clear cache</p>
                                <p class="text-sm text-gray-500">Free up storage space</p>
                            </div>
                            <i class="fas fa-chevron-right text-gray-400"></i>
                        </button>
                        <button onclick="downloadMessageData()" class="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition text-left border-t">
                            <div>
                                <p class="font-semibold text-gray-900">Download your data</p>
                                <p class="text-sm text-gray-500">Get a copy of your messages</p>
                            </div>
                            <i class="fas fa-chevron-right text-gray-400"></i>
                        </button>
                    </div>
                    
                    <!-- About -->
                    <div class="bg-white">
                        <div class="px-6 py-3 bg-gray-50">
                            <h3 class="text-sm font-semibold text-gray-700 uppercase">About</h3>
                        </div>
                        <div class="px-6 py-4">
                            <p class="text-sm text-gray-600">Coffee Messenger v1.0</p>
                            <p class="text-xs text-gray-400 mt-1">© 2024 Coffee Platform. All rights reserved.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    loadMessengerSettings();
}

function loadMessengerSettings() {
    // Load settings from localStorage
    const settings = {
        messageNotifications: localStorage.getItem('messageNotifications') !== 'false',
        soundNotifications: localStorage.getItem('soundNotifications') !== 'false',
        readReceipts: localStorage.getItem('readReceipts') !== 'false',
        typingIndicators: localStorage.getItem('typingIndicators') !== 'false',
        onlineStatus: localStorage.getItem('onlineStatus') !== 'false'
    };
    
    // Apply settings to checkboxes
    Object.keys(settings).forEach(key => {
        const checkbox = document.getElementById(key);
        if (checkbox) {
            checkbox.checked = settings[key];
        }
    });
}

function toggleSetting(setting, value) {
    localStorage.setItem(setting, value);
    showNotification(`${setting.replace(/([A-Z])/g, ' $1').trim()} ${value ? 'enabled' : 'disabled'}`, 'success');
}

function clearMessageCache() {
    if (confirm('Are you sure you want to clear the message cache? This will free up storage space.')) {
        // Clear any cached data
        sessionStorage.clear();
        showNotification('Cache cleared successfully', 'success');
    }
}

function downloadMessageData() {
    showNotification('Preparing your data for download...', 'info');
    
    // This would typically call an API to generate a data export
    setTimeout(() => {
        showNotification('Data export feature will be available soon', 'info');
    }, 1500);
}

async function markAllAsRead() {
    toggleMessengerOptions();
    
    try {
        // Get all conversations and mark them as read
        const response = await fetch(`${API_BASE}/messages/conversations`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        const data = await response.json();
        
        if (data.conversations) {
            // Mark each conversation as read
            for (const conv of data.conversations) {
                if (conv.unread_count > 0) {
                    await fetch(`${API_BASE}/messages/mark-read/${conv.id}`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${localStorage.getItem('token')}`
                        }
                    });
                }
            }
            
            showNotification('All messages marked as read', 'success');
            loadConversations();
        }
    } catch (error) {
        console.error('Error marking all as read:', error);
        showNotification('Failed to mark all as read', 'error');
    }
}
