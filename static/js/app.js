// Coffee Platform - Main Application
const API_BASE = window.location.origin + '/api';
let currentUser = null;
let socket = null;

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    checkAgeVerification();
    checkAuth();
    initializeSocket();
    showPage('home');
});

// Age Verification
function checkAgeVerification() {
    const verified = localStorage.getItem('ageVerified');
    if (!verified) {
        document.getElementById('ageVerificationModal').classList.remove('hidden');
    }
}

function verifyAge(confirmed) {
    if (confirmed) {
        localStorage.setItem('ageVerified', 'true');
        document.getElementById('ageVerificationModal').classList.add('hidden');
    } else {
        window.location.href = 'https://www.google.com';
    }
}

// Authentication Check
async function checkAuth() {
    const token = localStorage.getItem('token');
    if (token) {
        try {
            const response = await fetch(`${API_BASE}/auth/me`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                currentUser = data.user;
                updateUIForLoggedInUser();
            } else {
                localStorage.removeItem('token');
            }
        } catch (error) {
            console.error('Auth check failed:', error);
        }
    }
}

function updateUIForLoggedInUser() {
    document.getElementById('authButton').classList.add('hidden');
    document.getElementById('profileButton').classList.remove('hidden');
    
    if (currentUser.profile_image_url) {
        document.getElementById('profileImage').src = `/${currentUser.profile_image_url}`;
    } else {
        document.getElementById('profileImage').src = `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.username)}&background=ec4899&color=fff`;
    }
}

// Socket.IO Connection
function initializeSocket() {
    const token = localStorage.getItem('token');
    socket = io({
        query: { token: token }
    });
    
    socket.on('connect', () => {
        console.log('Socket connected');
        if (currentUser) {
            socket.emit('user_online', { user_id: currentUser.id });
        }
    });
    
    socket.on('new_message', (data) => {
        handleNewMessage(data);
    });
    
    socket.on('notification', (data) => {
        showNotification(data.message, 'info');
    });
    
    socket.on('user_status', (data) => {
        updateUserOnlineStatus(data.user_id, data.online);
    });
}

// Page Navigation
function showPage(pageName) {
    const mainContent = document.getElementById('mainContent');
    mainContent.innerHTML = '';
    mainContent.classList.add('animate-fadeIn');
    
    switch(pageName) {
        case 'home':
            renderHomePage();
            break;
        case 'search':
            renderSearchPage();
            break;
        case 'posts':
            renderPostsPage();
            break;
        case 'reels':
            renderReelsPage();
            break;
        case 'inbox':
            if (!currentUser) {
                showAuthModal();
                return;
            }
            renderInboxPage();
            break;
        case 'events':
            renderEventsPage();
            break;
        case 'profile':
            if (!currentUser) {
                showAuthModal();
                return;
            }
            renderMyProfilePage();
            break;
        case 'affiliates':
            if (!currentUser) {
                showAuthModal();
                return;
            }
            renderAffiliatesPage();
            break;
        case 'subscription':
            if (!currentUser) {
                showAuthModal();
                return;
            }
            renderSubscriptionPage();
            break;
        case 'gallery':
            if (!currentUser) {
                showAuthModal();
                return;
            }
            if (currentUser.user_type === 'visitor') {
                showNotification('Gallery is only available for listers', 'error');
                showPage('home');
                return;
            }
            renderGalleryPage();
            break;
        default:
            renderHomePage();
    }
}

// Home Page
async function renderHomePage() {
    const mainContent = document.getElementById('mainContent');
    
    mainContent.innerHTML = `
        <div class="w-full bg-white" style="min-height: calc(100vh - 120px);">
            <!-- Stories Section -->
            <div class="border-b border-gray-200 bg-white sticky top-16 z-30">
                <div class="px-4 py-3 overflow-x-auto">
                    <div id="storiesContainer" class="flex gap-4">
                        <div class="text-center">
                            <div class="w-16 h-16 rounded-full bg-gray-200 animate-pulse"></div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Posts Feed -->
            <div id="postsFeed" class="max-w-2xl mx-auto">
                <div class="text-center py-8">
                    <div class="spinner mx-auto"></div>
                </div>
            </div>
        </div>
    `;
    
    loadOnlineEscortsStories();
    loadPostsFeed();
}

// Load online escorts as stories
async function loadOnlineEscortsStories() {
    try {
        const response = await fetch(`${API_BASE}/users/online?type=escort&limit=20`);
        const data = await response.json();
        
        const container = document.getElementById('storiesContainer');
        if (data.users && data.users.length > 0) {
            container.innerHTML = data.users.map(user => `
                <div class="flex-shrink-0 cursor-pointer" onclick="startConversation(${user.id})">
                    <div class="relative">
                        <div class="w-16 h-16 rounded-full p-0.5 bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600">
                            <div class="w-full h-full rounded-full p-0.5 bg-white">
                                <img src="${user.profile_image_url ? '/' + user.profile_image_url : `https://ui-avatars.com/api/?name=${encodeURIComponent(user.username)}&background=ec4899&color=fff`}" 
                                     alt="${user.username}" 
                                     class="w-full h-full rounded-full object-cover">
                            </div>
                        </div>
                        <div class="absolute bottom-0 right-0 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
                    </div>
                    <p class="text-xs text-center mt-1 truncate w-16">${user.username}</p>
                </div>
            `).join('');
        } else {
            container.innerHTML = '<p class="text-gray-500 text-sm">No escorts online</p>';
        }
    } catch (error) {
        console.error('Failed to load stories:', error);
        document.getElementById('storiesContainer').innerHTML = '<p class="text-red-500 text-sm">Failed to load</p>';
    }
}

// Load posts feed (Instagram style)
async function loadPostsFeed() {
    try {
        const response = await fetch(`${API_BASE}/posts/feed?limit=20`);
        const data = await response.json();
        
        const container = document.getElementById('postsFeed');
        if (data.posts && data.posts.length > 0) {
            container.innerHTML = data.posts.map(post => `
                <div class="border-b border-gray-200 mb-4 bg-white">
                    <!-- Post Header -->
                    <div class="flex items-center justify-between px-4 py-3">
                        <div class="flex items-center gap-3 cursor-pointer" onclick="viewProfile(${post.user_id})">
                            <img src="${post.profile_image_url ? '/' + post.profile_image_url : `https://ui-avatars.com/api/?name=${encodeURIComponent(post.username)}&background=ec4899&color=fff`}" 
                                 alt="${post.username}" 
                                 class="w-10 h-10 rounded-full object-cover">
                            <div>
                                <p class="font-semibold text-sm">${post.username}</p>
                                <p class="text-xs text-gray-500">${formatDate(post.created_at)}</p>
                            </div>
                        </div>
                        <button class="text-gray-600 hover:text-gray-800">
                            <i class="fas fa-ellipsis-h"></i>
                        </button>
                    </div>
                    
                    <!-- Post Media -->
                    <div class="w-full" ondblclick="likePost(${post.id})">
                        ${post.media_type === 'video' ? `
                            <video src="/${post.media_url}" class="w-full" controls></video>
                        ` : `
                            <img src="/${post.media_url}" alt="Post" class="w-full">
                        `}
                    </div>
                    
                    <!-- Post Actions -->
                    <div class="px-4 py-3">
                        <div class="flex items-center justify-between mb-2">
                            <div class="flex items-center gap-4">
                                <button onclick="likePost(${post.id})" id="likeBtn-${post.id}" class="text-2xl hover:text-pink-500 transition">
                                    <i class="${post.user_has_liked ? 'fas' : 'far'} fa-heart ${post.user_has_liked ? 'text-red-500' : ''}"></i>
                                </button>
                                <button onclick="focusComment(${post.id})" class="text-2xl hover:text-gray-600 transition">
                                    <i class="far fa-comment"></i>
                                </button>
                                <button class="text-2xl hover:text-gray-600 transition">
                                    <i class="far fa-paper-plane"></i>
                                </button>
                            </div>
                            <button class="text-2xl hover:text-gray-600 transition">
                                <i class="far fa-bookmark"></i>
                            </button>
                        </div>
                        
                        <!-- Likes Count -->
                        <p class="font-semibold text-sm mb-2" id="likesCount-${post.id}">${post.likes_count} likes</p>
                        
                        <!-- Caption -->
                        ${post.caption ? `
                            <p class="text-sm mb-2">
                                <span class="font-semibold">${post.username}</span> ${post.caption}
                            </p>
                        ` : ''}
                        
                        <!-- View Comments -->
                        ${post.comments_count > 0 ? `
                            <button onclick="viewAllComments(${post.id})" class="text-sm text-gray-500 hover:text-gray-700 mb-2">
                                View all ${post.comments_count} comments
                            </button>
                        ` : ''}
                        
                        <!-- Recent Comments -->
                        <div id="recentComments-${post.id}" class="space-y-1 mb-2">
                            <!-- Comments will be loaded here -->
                        </div>
                        
                        <!-- Add Comment -->
                        <div class="flex items-center gap-2 border-t pt-2">
                            <input type="text" 
                                   id="commentInput-${post.id}" 
                                   placeholder="Add a comment..." 
                                   class="flex-1 text-sm focus:outline-none"
                                   onkeypress="if(event.key === 'Enter') addComment(${post.id})">
                            <button onclick="addComment(${post.id})" class="text-blue-500 font-semibold text-sm hover:text-blue-600">
                                Post
                            </button>
                        </div>
                    </div>
                </div>
            `).join('');
            
            // Load recent comments for each post
            data.posts.forEach(post => {
                loadRecentComments(post.id);
            });
        } else {
            container.innerHTML = `
                <div class="text-center py-12">
                    <i class="fas fa-images text-6xl text-gray-300 mb-4"></i>
                    <p class="text-gray-500 font-semibold">No posts yet</p>
                    <p class="text-sm text-gray-400 mt-2">Follow some escorts to see their posts</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Failed to load posts:', error);
        document.getElementById('postsFeed').innerHTML = '<p class="text-red-500 text-center py-8">Failed to load posts</p>';
    }
}

// Load recent comments for a post
async function loadRecentComments(postId, limit = 2) {
    try {
        const response = await fetch(`${API_BASE}/posts/${postId}/comments?limit=${limit}`);
        const data = await response.json();
        
        const container = document.getElementById(`recentComments-${postId}`);
        if (data.comments && data.comments.length > 0) {
            container.innerHTML = data.comments.map(comment => `
                <p class="text-sm">
                    <span class="font-semibold">${comment.username}</span> ${comment.comment_text}
                </p>
            `).join('');
        }
    } catch (error) {
        console.error('Failed to load comments:', error);
    }
}

// Like post
async function likePost(postId) {
    if (!currentUser) {
        showAuthModal();
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/posts/${postId}/like`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        const data = await response.json();
        
        if (response.ok) {
            const likeBtn = document.getElementById(`likeBtn-${postId}`);
            const likesCount = document.getElementById(`likesCount-${postId}`);
            
            if (data.liked) {
                likeBtn.innerHTML = '<i class="fas fa-heart text-red-500"></i>';
                likesCount.textContent = `${data.likes_count} likes`;
            } else {
                likeBtn.innerHTML = '<i class="far fa-heart"></i>';
                likesCount.textContent = `${data.likes_count} likes`;
            }
        } else {
            showNotification(data.error || 'Failed to like post', 'error');
        }
    } catch (error) {
        console.error('Failed to like post:', error);
        showNotification('Failed to like post', 'error');
    }
}

// Add comment
async function addComment(postId) {
    if (!currentUser) {
        showAuthModal();
        return;
    }
    
    const input = document.getElementById(`commentInput-${postId}`);
    const commentText = input.value.trim();
    
    if (!commentText) return;
    
    try {
        const response = await fetch(`${API_BASE}/posts/${postId}/comment`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ comment_text: commentText })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            input.value = '';
            loadRecentComments(postId);
            showNotification('Comment added!', 'success');
        } else {
            showNotification(data.error || 'Failed to add comment', 'error');
        }
    } catch (error) {
        console.error('Failed to add comment:', error);
        showNotification('Failed to add comment', 'error');
    }
}

// Focus comment input
function focusComment(postId) {
    document.getElementById(`commentInput-${postId}`).focus();
}

// View all comments
function viewAllComments(postId) {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4';
    modal.innerHTML = `
        <div class="bg-white rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
            <div class="flex items-center justify-between p-4 border-b">
                <h2 class="text-xl font-bold">Comments</h2>
                <button onclick="this.closest('.fixed').remove()" class="text-gray-500 hover:text-gray-700">
                    <i class="fas fa-times text-xl"></i>
                </button>
            </div>
            <div id="allComments-${postId}" class="flex-1 overflow-y-auto p-4">
                <div class="text-center py-8">
                    <div class="spinner mx-auto"></div>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    loadAllComments(postId);
}

// Load all comments
async function loadAllComments(postId) {
    try {
        const response = await fetch(`${API_BASE}/posts/${postId}/comments`);
        const data = await response.json();
        
        const container = document.getElementById(`allComments-${postId}`);
        if (data.comments && data.comments.length > 0) {
            container.innerHTML = data.comments.map(comment => `
                <div class="flex items-start gap-3 mb-4">
                    <img src="${comment.profile_image_url ? '/' + comment.profile_image_url : `https://ui-avatars.com/api/?name=${encodeURIComponent(comment.username)}&background=ec4899&color=fff`}" 
                         alt="${comment.username}" 
                         class="w-10 h-10 rounded-full object-cover">
                    <div class="flex-1">
                        <p class="text-sm">
                            <span class="font-semibold">${comment.username}</span> ${comment.comment_text}
                        </p>
                        <p class="text-xs text-gray-500 mt-1">${formatDate(comment.created_at)}</p>
                    </div>
                </div>
            `).join('');
        } else {
            container.innerHTML = '<p class="text-gray-500 text-center py-8">No comments yet</p>';
        }
    } catch (error) {
        console.error('Failed to load comments:', error);
        document.getElementById(`allComments-${postId}`).innerHTML = '<p class="text-red-500 text-center py-8">Failed to load comments</p>';
    }
}

// Search Page
let currentSearchTab = 'escort';

async function renderSearchPage() {
    const mainContent = document.getElementById('mainContent');
    
    mainContent.innerHTML = `
        <div class="w-full bg-white" style="min-height: calc(100vh - 120px);">
            <!-- Search Header -->
            <div class="sticky top-16 z-30 bg-white border-b border-gray-200">
                <div class="max-w-2xl mx-auto px-4 py-3">
                    <div class="relative">
                        <i class="fas fa-search absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
                        <input type="text" 
                               id="searchInput" 
                               class="w-full pl-12 pr-4 py-3 bg-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500" 
                               placeholder="Search" 
                               oninput="performSearch()">
                    </div>
                </div>
                
                <!-- Tabs -->
                <div class="flex border-t border-gray-200">
                    <button onclick="switchSearchTab('escort')" 
                            id="searchTabEscorts" 
                            class="flex-1 px-6 py-4 font-semibold border-b-2 border-pink-500 text-pink-500">
                        Escorts
                    </button>
                    <button onclick="switchSearchTab('venue')" 
                            id="searchTabVenues" 
                            class="flex-1 px-6 py-4 font-semibold border-b-2 border-transparent text-gray-500 hover:text-gray-700">
                        Venues
                    </button>
                </div>
            </div>
            
            <!-- Results -->
            <div class="max-w-2xl mx-auto">
                <div id="searchResults" class="divide-y divide-gray-200">
                    <div class="text-center py-12">
                        <i class="fas fa-search text-4xl text-gray-300 mb-3"></i>
                        <p class="text-gray-500">Search for ${currentSearchTab === 'escort' ? 'escorts' : 'venues'}</p>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function switchSearchTab(tab) {
    currentSearchTab = tab;
    
    // Update tab styles
    document.getElementById('searchTabEscorts').className = tab === 'escort'
        ? 'flex-1 px-6 py-4 font-semibold border-b-2 border-pink-500 text-pink-500'
        : 'flex-1 px-6 py-4 font-semibold border-b-2 border-transparent text-gray-500 hover:text-gray-700';
    
    document.getElementById('searchTabVenues').className = tab === 'venue'
        ? 'flex-1 px-6 py-4 font-semibold border-b-2 border-pink-500 text-pink-500'
        : 'flex-1 px-6 py-4 font-semibold border-b-2 border-transparent text-gray-500 hover:text-gray-700';
    
    // Clear search and perform new search
    const searchInput = document.getElementById('searchInput');
    if (searchInput && searchInput.value) {
        performSearch();
    } else {
        document.getElementById('searchResults').innerHTML = `
            <div class="text-center py-12">
                <i class="fas fa-search text-4xl text-gray-300 mb-3"></i>
                <p class="text-gray-500">Search for ${tab === 'escort' ? 'escorts' : 'venues'}</p>
            </div>
        `;
    }
}

async function performSearch() {
    const query = document.getElementById('searchInput').value.trim();
    
    if (!query) {
        document.getElementById('searchResults').innerHTML = `
            <div class="text-center py-12">
                <i class="fas fa-search text-4xl text-gray-300 mb-3"></i>
                <p class="text-gray-500">Search for ${currentSearchTab === 'escort' ? 'escorts' : 'venues'}</p>
            </div>
        `;
        return;
    }
    
    const params = new URLSearchParams();
    params.append('q', query);
    params.append('user_type', currentSearchTab);
    
    try {
        const response = await fetch(`${API_BASE}/users/search?${params}`);
        const data = await response.json();
        
        const container = document.getElementById('searchResults');
        if (data.users && data.users.length > 0) {
            container.innerHTML = data.users.map(user => `
                <div class="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer" onclick="viewProfile(${user.id})">
                    <img src="${user.profile_image_url ? '/' + user.profile_image_url : `https://ui-avatars.com/api/?name=${encodeURIComponent(user.username)}&background=ec4899&color=fff`}" 
                         alt="${user.username}" 
                         class="w-12 h-12 rounded-full object-cover">
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-2">
                            <p class="font-semibold truncate">@${user.username}</p>
                            ${user.is_verified ? '<i class="fas fa-check-circle text-blue-500 text-sm"></i>' : ''}
                        </div>
                        <p class="text-sm text-gray-600 truncate">${user.full_name || user.username}</p>
                        ${user.bio ? `<p class="text-xs text-gray-500 truncate">${user.bio}</p>` : ''}
                    </div>
                </div>
            `).join('');
        } else {
            container.innerHTML = `
                <div class="text-center py-12 px-4">
                    <i class="fas fa-search text-4xl text-gray-300 mb-3"></i>
                    <p class="text-gray-500 font-semibold">No results found</p>
                    <p class="text-sm text-gray-400 mt-2">Try searching for something else</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Search failed:', error);
        document.getElementById('searchResults').innerHTML = `
            <div class="text-center py-12 px-4">
                <i class="fas fa-exclamation-circle text-4xl text-red-300 mb-3"></i>
                <p class="text-red-500">Search failed</p>
            </div>
        `;
    }
}

// View Profile
async function viewProfile(userId) {
    try {
        const headers = {};
        if (currentUser) {
            headers['Authorization'] = `Bearer ${localStorage.getItem('token')}`;
        }
        
        const response = await fetch(`${API_BASE}/users/profile/${userId}`, { headers });
        const data = await response.json();
        
        if (data.user) {
            renderProfilePage(data.user);
        }
    } catch (error) {
        console.error('Failed to load profile:', error);
        showNotification('Failed to load profile', 'error');
    }
}

function renderProfilePage(user) {
    const mainContent = document.getElementById('mainContent');
    
    mainContent.innerHTML = `
        <div class="max-w-4xl mx-auto px-4">
            <!-- Profile Header -->
            <div class="bg-white rounded-3xl shadow-lg overflow-hidden mb-6">
                <div class="h-32 bg-gradient-to-r from-pink-500 to-purple-600"></div>
                <div class="px-6 pb-6">
                    <div class="flex flex-col md:flex-row items-center md:items-end gap-6 -mt-16">
                        <img src="${user.profile_image_url ? '/' + user.profile_image_url : `https://ui-avatars.com/api/?name=${encodeURIComponent(user.username)}&background=ec4899&color=fff&size=200`}" 
                             class="avatar-xl border-4 border-white shadow-lg">
                        <div class="flex-1 text-center md:text-left">
                            <h1 class="text-3xl font-bold">@${user.username}</h1>
                            <p class="text-gray-600">${user.full_name || user.username}</p>
                            <p class="text-sm text-gray-500 capitalize">${user.user_type}</p>
                            ${user.is_verified ? '<span class="badge badge-verified mt-2"><i class="fas fa-check-circle mr-1"></i>Verified</span>' : ''}
                        </div>
                        <div class="flex gap-3">
                            ${currentUser && currentUser.id !== user.id ? `
                                <button onclick="toggleFollow(${user.id})" id="followBtn-${user.id}" class="btn-primary">
                                    <i class="fas fa-user-plus mr-2"></i>Follow
                                </button>
                                <button onclick="startConversation(${user.id})" class="btn-secondary">
                                    <i class="fas fa-comment mr-2"></i>Message
                                </button>
                            ` : ''}
                            ${currentUser && currentUser.id === user.id ? `
                                <button onclick="showEditProfileModal()" class="btn-primary">
                                    <i class="fas fa-edit mr-2"></i>Edit Profile
                                </button>
                            ` : ''}
                        </div>
                    </div>
                    
                    <!-- Stats -->
                    <div class="flex gap-8 justify-center md:justify-start mt-6" id="profileStats-${user.id}">
                        <div class="text-center">
                            <p class="text-2xl font-bold" id="followersCount-${user.id}">0</p>
                            <p class="text-gray-600 text-sm">Followers</p>
                        </div>
                        <div class="text-center">
                            <p class="text-2xl font-bold" id="followingCount-${user.id}">0</p>
                            <p class="text-gray-600 text-sm">Following</p>
                        </div>
                    </div>
                    
                    <!-- Bio -->
                    ${user.bio ? `
                        <div class="mt-6">
                            <p class="text-gray-700">${user.bio}</p>
                        </div>
                    ` : ''}
                    
                    <!-- Info -->
                    <div class="grid grid-cols-2 gap-4 mt-6">
                        ${user.ethnicity ? `<div><span class="text-gray-500">Ethnicity:</span> <span class="font-semibold">${user.ethnicity}</span></div>` : ''}
                        ${user.city ? `<div><span class="text-gray-500">City:</span> <span class="font-semibold">${user.city}</span></div>` : ''}
                        ${user.phone && currentUser ? `<div><span class="text-gray-500">Phone:</span> <span class="font-semibold">${user.phone}</span></div>` : ''}
                    </div>
                </div>
            </div>
            
            <!-- Content Tabs -->
            ${user.user_type !== 'visitor' ? `
                <div class="bg-white rounded-2xl shadow-lg overflow-hidden">
                    <div class="flex border-b">
                        <button onclick="switchProfileTab(${user.id}, 'posts')" id="profilePostsTab-${user.id}" class="flex-1 px-6 py-4 font-semibold border-b-2 border-pink-500 text-pink-500">
                            <i class="fas fa-th mr-2"></i>Posts
                        </button>
                        <button onclick="switchProfileTab(${user.id}, 'reels')" id="profileReelsTab-${user.id}" class="flex-1 px-6 py-4 font-semibold border-b-2 border-transparent text-gray-500 hover:text-gray-700">
                            <i class="fas fa-video mr-2"></i>Reels
                        </button>
                    </div>
                    
                    <div id="profileContent-${user.id}" class="p-6">
                        <div class="text-center py-8">
                            <div class="spinner mx-auto"></div>
                        </div>
                    </div>
                </div>
            ` : ''}
        </div>
    `;
    
    // Load follow stats
    loadFollowStats(user.id);
    
    // Check follow status
    if (currentUser && currentUser.id !== user.id) {
        checkFollowStatus(user.id);
    }
    
    // Load posts by default
    if (user.user_type !== 'visitor') {
        loadProfilePosts(user.id);
    }
}

let currentProfileTab = {};

function switchProfileTab(userId, tab) {
    currentProfileTab[userId] = tab;
    
    // Update tab styles
    document.getElementById(`profilePostsTab-${userId}`).className = tab === 'posts'
        ? 'flex-1 px-6 py-4 font-semibold border-b-2 border-pink-500 text-pink-500'
        : 'flex-1 px-6 py-4 font-semibold border-b-2 border-transparent text-gray-500 hover:text-gray-700';
    
    document.getElementById(`profileReelsTab-${userId}`).className = tab === 'reels'
        ? 'flex-1 px-6 py-4 font-semibold border-b-2 border-pink-500 text-pink-500'
        : 'flex-1 px-6 py-4 font-semibold border-b-2 border-transparent text-gray-500 hover:text-gray-700';
    
    // Load content
    if (tab === 'posts') {
        loadProfilePosts(userId);
    } else {
        loadProfileReels(userId);
    }
}

async function loadProfilePosts(userId) {
    try {
        const response = await fetch(`${API_BASE}/posts/user/${userId}`);
        const data = await response.json();
        
        const container = document.getElementById(`profileContent-${userId}`);
        if (data.posts && data.posts.length > 0) {
            container.innerHTML = `
                <div class="grid grid-cols-3 gap-2">
                    ${data.posts.map(post => `
                        <div class="relative aspect-square cursor-pointer group" onclick="viewPost(${post.id})">
                            ${post.media_type === 'video' ? `
                                <video src="/${post.media_url}" class="w-full h-full object-cover rounded-lg"></video>
                                <i class="fas fa-play-circle absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-white text-3xl opacity-70"></i>
                            ` : `
                                <img src="/${post.media_url}" alt="Post" class="w-full h-full object-cover rounded-lg">
                            `}
                            <div class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100">
                                <div class="text-white flex gap-4">
                                    <span><i class="fas fa-heart mr-1"></i>${post.likes_count}</span>
                                    <span><i class="fas fa-comment mr-1"></i>${post.comments_count}</span>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        } else {
            container.innerHTML = '<p class="text-gray-500 text-center py-12">No posts yet</p>';
        }
    } catch (error) {
        console.error('Failed to load posts:', error);
    }
}

async function loadProfileReels(userId) {
    try {
        const response = await fetch(`${API_BASE}/reels/user/${userId}`);
        const data = await response.json();
        
        const container = document.getElementById(`profileContent-${userId}`);
        if (data.reels && data.reels.length > 0) {
            container.innerHTML = `
                <div class="grid grid-cols-3 gap-2">
                    ${data.reels.map(reel => `
                        <div class="relative aspect-square cursor-pointer group" onclick="viewReel(${reel.id})">
                            <video src="/${reel.video_url}" class="w-full h-full object-cover rounded-lg"></video>
                            <i class="fas fa-play-circle absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-white text-3xl opacity-70"></i>
                            <div class="absolute top-2 right-2 bg-pink-500 text-white text-xs px-2 py-1 rounded-full">
                                <i class="fas fa-video"></i>
                            </div>
                            <div class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100">
                                <div class="text-white flex gap-4">
                                    <span><i class="fas fa-heart mr-1"></i>${reel.likes_count}</span>
                                    <span><i class="fas fa-comment mr-1"></i>${reel.comments_count}</span>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        } else {
            container.innerHTML = '<p class="text-gray-500 text-center py-12">No reels yet</p>';
        }
    } catch (error) {
        console.error('Failed to load reels:', error);
    }
}

async function loadFollowStats(userId) {
    try {
        const response = await fetch(`${API_BASE}/follows/stats/${userId}`);
        const data = await response.json();
        
        document.getElementById(`followersCount-${userId}`).textContent = data.followers_count || 0;
        document.getElementById(`followingCount-${userId}`).textContent = data.following_count || 0;
    } catch (error) {
        console.error('Failed to load follow stats:', error);
    }
}

async function checkFollowStatus(userId) {
    try {
        const response = await fetch(`${API_BASE}/follows/status/${userId}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        const data = await response.json();
        
        const btn = document.getElementById(`followBtn-${userId}`);
        if (btn) {
            if (data.following) {
                btn.innerHTML = '<i class="fas fa-user-check mr-2"></i>Following';
                btn.className = 'btn-secondary';
            } else {
                btn.innerHTML = '<i class="fas fa-user-plus mr-2"></i>Follow';
                btn.className = 'btn-primary';
            }
        }
    } catch (error) {
        console.error('Failed to check follow status:', error);
    }
}

async function toggleFollow(userId) {
    if (!currentUser) {
        showAuthModal();
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/follows/follow/${userId}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        const data = await response.json();
        
        if (response.ok) {
            const btn = document.getElementById(`followBtn-${userId}`);
            if (data.following) {
                btn.innerHTML = '<i class="fas fa-user-check mr-2"></i>Following';
                btn.className = 'btn-secondary';
                showNotification('Following!', 'success');
            } else {
                btn.innerHTML = '<i class="fas fa-user-plus mr-2"></i>Follow';
                btn.className = 'btn-primary';
                showNotification('Unfollowed', 'info');
            }
            loadFollowStats(userId);
        }
    } catch (error) {
        console.error('Failed to toggle follow:', error);
        showNotification('Failed to update follow status', 'error');
    }
}

function viewPost(postId) {
    showNotification('Opening post...', 'info');
}

function viewReel(reelId) {
    showNotification('Opening reel...', 'info');
}

// Notifications
function showNotification(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    const icon = type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle';
    
    toast.innerHTML = `
        <i class="fas fa-${icon} text-xl"></i>
        <span>${message}</span>
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideInRight 0.3s ease-out reverse';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Handle New Messages
function handleNewMessage(data) {
    if (currentUser && data.receiver_id === currentUser.id) {
        showNotification(`New message from ${data.sender_name}`, 'info');
        updateUnreadBadge();
    }
}

async function updateUnreadBadge() {
    if (!currentUser) return;
    
    try {
        const response = await fetch(`${API_BASE}/messages/unread-count`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        const data = await response.json();
        
        const badge = document.getElementById('unreadBadge');
        if (data.count > 0) {
            badge.textContent = data.count;
            badge.classList.remove('hidden');
        } else {
            badge.classList.add('hidden');
        }
    } catch (error) {
        console.error('Failed to update unread badge:', error);
    }
}

// Utility Functions
function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
    
    return date.toLocaleDateString();
}

function formatCurrency(amount) {
    return `R${parseFloat(amount).toFixed(2)}`;
}
