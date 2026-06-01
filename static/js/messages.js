// Messages Module - Facebook Messenger Style
async function renderInboxPage() {
    const mainContent = document.getElementById('mainContent');
    
    mainContent.innerHTML = `
        <div class="h-screen flex bg-white" style="height: calc(100vh - 120px);">
            <!-- Conversations Sidebar -->
            <div class="w-full md:w-96 border-r border-gray-200 flex flex-col">
                <!-- Sidebar Header -->
                <div class="p-4 border-b border-gray-200">
                    <h1 class="text-2xl font-bold mb-3">Chats</h1>
                    <div class="relative">
                        <i class="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
                        <input type="text" id="conversationSearch" class="w-full pl-10 pr-4 py-2 bg-gray-100 rounded-full text-sm focus:outline-none focus:bg-gray-200" placeholder="Search Messenger" onkeyup="filterConversations()">
                    </div>
                </div>
                
                <!-- Conversations List -->
                <div id="conversationsList" class="flex-1 overflow-y-auto">
                    <div class="text-center py-8">
                        <div class="spinner mx-auto"></div>
                    </div>
                </div>
            </div>
            
            <!-- Chat Window -->
            <div class="hidden md:flex flex-1 flex-col bg-white">
                <div id="chatWindow" class="flex-1 flex items-center justify-center">
                    <div class="text-center text-gray-400">
                        <i class="fas fa-comments text-6xl mb-4 opacity-50"></i>
                        <p class="text-lg">Select a conversation</p>
                        <p class="text-sm">Choose from your existing conversations or start a new one</p>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    loadConversations();
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
            <div class="flex-1">
                <p class="font-semibold text-gray-900">${username}</p>
                <p class="text-xs text-gray-500">Active now</p>
            </div>
            <button onclick="viewProfile(${userId})" class="w-9 h-9 rounded-full hover:bg-gray-100 flex items-center justify-center text-blue-600 transition">
                <i class="fas fa-info-circle text-lg"></i>
            </button>
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
                <button type="button" onclick="attachFile()" class="w-9 h-9 rounded-full hover:bg-gray-100 flex items-center justify-center text-blue-600 transition">
                    <i class="fas fa-plus text-lg"></i>
                </button>
                <input type="file" id="messageAttachment" class="hidden" accept="image/*,video/*" onchange="handleAttachment(this)">
                <div class="flex-1 relative">
                    <input type="text" id="messageInput" class="w-full px-4 py-2 bg-gray-100 rounded-full text-sm focus:outline-none focus:bg-gray-200" placeholder="Aa" required>
                </div>
                <button type="submit" class="w-9 h-9 rounded-full bg-blue-600 hover:bg-blue-700 flex items-center justify-center text-white transition">
                    <i class="fas fa-paper-plane text-sm"></i>
                </button>
            </form>
        </div>
    `;
    
    loadMessages(userId);
    loadConversations();
    
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
            container.innerHTML = data.messages.map(msg => {
                const isSent = msg.sender_id === currentUser.id;
                return `
                    <div class="flex ${isSent ? 'justify-end' : 'justify-start'} mb-2">
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
                            <p class="text-xs text-gray-500 mt-1 px-2">${formatDate(msg.created_at)}</p>
                        </div>
                    </div>
                `;
            }).join('');
            
            // Scroll to bottom
            container.scrollTop = container.scrollHeight;
        } else {
            container.innerHTML = '<div class="text-center py-12"><p class="text-gray-500">No messages yet</p><p class="text-sm text-gray-400 mt-2">Send a message to start the conversation</p></div>';
        }
    } catch (error) {
        console.error('Failed to load messages:', error);
        document.getElementById('messagesContainer').innerHTML = '<p class="text-red-500 text-center py-8">Failed to load messages</p>';
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
