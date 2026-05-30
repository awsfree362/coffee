// Messages Module - WhatsApp Style
async function renderInboxPage() {
    const mainContent = document.getElementById('mainContent');
    
    mainContent.innerHTML = `
        <div class="max-w-6xl mx-auto">
            <h1 class="text-2xl font-bold mb-6">Messages</h1>
            
            <div class="grid md:grid-cols-3 gap-6">
                <!-- Conversations List -->
                <div class="md:col-span-1 bg-white rounded-2xl shadow-lg overflow-hidden">
                    <div class="p-4 border-b">
                        <div class="search-bar">
                            <i class="fas fa-search search-icon"></i>
                            <input type="text" id="conversationSearch" class="search-input" placeholder="Search conversations..." onkeyup="filterConversations()">
                        </div>
                    </div>
                    
                    <div id="conversationsList" class="overflow-y-auto" style="max-height: 600px;">
                        <div class="text-center py-8">
                            <div class="spinner mx-auto"></div>
                        </div>
                    </div>
                </div>
                
                <!-- Chat Window -->
                <div class="md:col-span-2 bg-white rounded-2xl shadow-lg overflow-hidden flex flex-col" style="height: 700px;">
                    <div id="chatWindow">
                        <div class="flex items-center justify-center h-full text-gray-400">
                            <div class="text-center">
                                <i class="fas fa-comments text-6xl mb-4"></i>
                                <p>Select a conversation to start messaging</p>
                            </div>
                        </div>
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
                <div class="p-4 border-b hover:bg-gray-50 cursor-pointer transition ${currentConversation && currentConversation.user_id === conv.user_id ? 'bg-pink-50' : ''}" 
                     onclick="openConversation(${conv.user_id}, '${conv.username}', '${conv.profile_image_url || ''}')">
                    <div class="flex items-center gap-3">
                        <div class="relative">
                            <img src="${conv.profile_image_url ? '/' + conv.profile_image_url : `https://ui-avatars.com/api/?name=${encodeURIComponent(conv.username)}&background=ec4899&color=fff`}" 
                                 alt="${conv.username}" 
                                 class="avatar">
                            ${conv.is_online ? '<span class="status-indicator status-online"></span>' : ''}
                        </div>
                        <div class="flex-1 min-w-0">
                            <div class="flex justify-between items-start">
                                <p class="font-bold truncate">${conv.username}</p>
                                <span class="text-xs text-gray-500">${formatDate(conv.last_message_at)}</span>
                            </div>
                            <p class="text-sm text-gray-600 truncate">${conv.last_message || 'No messages yet'}</p>
                        </div>
                        ${conv.unread_count > 0 ? `<span class="bg-pink-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center">${conv.unread_count}</span>` : ''}
                    </div>
                </div>
            `).join('');
        } else {
            container.innerHTML = '<p class="text-gray-500 text-center py-8">No conversations yet</p>';
        }
    } catch (error) {
        console.error('Failed to load conversations:', error);
        document.getElementById('conversationsList').innerHTML = '<p class="text-red-500 text-center py-8">Failed to load conversations</p>';
    }
}

async function openConversation(userId, username, profileImage) {
    currentConversation = { user_id: userId, username, profile_image: profileImage };
    
    const chatWindow = document.getElementById('chatWindow');
    chatWindow.innerHTML = `
        <!-- Chat Header -->
        <div class="p-4 border-b flex items-center gap-3">
            <img src="${profileImage ? '/' + profileImage : `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=ec4899&color=fff`}" 
                 alt="${username}" 
                 class="avatar cursor-pointer"
                 onclick="viewProfile(${userId})">
            <div class="flex-1">
                <p class="font-bold">${username}</p>
                <p class="text-xs text-gray-500">Click to view profile</p>
            </div>
            <button onclick="viewProfile(${userId})" class="text-gray-500 hover:text-gray-700">
                <i class="fas fa-info-circle text-xl"></i>
            </button>
        </div>
        
        <!-- Messages Container -->
        <div id="messagesContainer" class="flex-1 overflow-y-auto p-4 bg-gray-50" style="height: 550px;">
            <div class="text-center py-8">
                <div class="spinner mx-auto"></div>
            </div>
        </div>
        
        <!-- Message Input -->
        <div class="p-4 border-t bg-white">
            <form onsubmit="sendMessage(event)" class="flex gap-3">
                <button type="button" onclick="attachFile()" class="text-gray-500 hover:text-gray-700">
                    <i class="fas fa-paperclip text-xl"></i>
                </button>
                <input type="file" id="messageAttachment" class="hidden" accept="image/*,video/*" onchange="handleAttachment(this)">
                <input type="text" id="messageInput" class="input-field flex-1" placeholder="Type a message..." required>
                <button type="submit" class="btn-primary">
                    <i class="fas fa-paper-plane"></i>
                </button>
            </form>
            <div id="attachmentPreview" class="mt-2 hidden"></div>
        </div>
    `;
    
    loadMessages(userId);
    
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
                    <div class="flex ${isSent ? 'justify-end' : 'justify-start'} mb-3">
                        <div class="message-bubble ${isSent ? 'message-sent' : 'message-received'}">
                            ${msg.attachment_url ? `
                                <div class="mb-2">
                                    ${msg.attachment_type === 'image' ? 
                                        `<img src="/${msg.attachment_url}" class="rounded-lg max-w-xs cursor-pointer" onclick="viewImage('/${msg.attachment_url}')">` :
                                        `<video src="/${msg.attachment_url}" class="rounded-lg max-w-xs" controls></video>`
                                    }
                                </div>
                            ` : ''}
                            ${msg.message_text ? `<p>${msg.message_text}</p>` : ''}
                            <p class="text-xs opacity-75 mt-1">${formatDate(msg.created_at)}</p>
                        </div>
                    </div>
                `;
            }).join('');
            
            // Scroll to bottom
            container.scrollTop = container.scrollHeight;
        } else {
            container.innerHTML = '<p class="text-gray-500 text-center py-8">No messages yet. Start the conversation!</p>';
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
