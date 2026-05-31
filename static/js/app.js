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
    
    // Check if mobile device
    const isMobile = window.innerWidth < 768;
    
    if (isMobile) {
        // Mobile: Show TikTok-style reels feed
        renderReelsPage();
    } else {
        // Desktop: Show original home page
        mainContent.innerHTML = `
            <div class="w-full px-4">
                <!-- Hero Section with Google Ads -->
                <div class="glass rounded-3xl p-8 md:p-12 mb-8 text-center">
                    <!-- Google AdSense Display Ad -->
                    <div class="bg-gray-100 rounded-2xl p-6 mb-6 min-h-[250px] flex items-center justify-center">
                        <ins class="adsbygoogle"
                             style="display:block"
                             data-ad-client="ca-pub-XXXXXXXXXXXXXXXX"
                             data-ad-slot="XXXXXXXXXX"
                             data-ad-format="auto"
                             data-full-width-responsive="true"></ins>
                        <script>
                             (adsbygoogle = window.adsbygoogle || []).push({});
                        </script>
                        <!-- Placeholder text (remove when ads are active) -->
                        <div class="text-gray-400 text-center">
                            <i class="fas fa-ad text-4xl mb-2"></i>
                            <p>Advertisement Space</p>
                            <p class="text-sm">Replace with your Google AdSense code</p>
                        </div>
                    </div>
                    
                    <div class="flex flex-wrap gap-4 justify-center">
                        <button onclick="showPage('search')" class="btn-primary">
                            <i class="fas fa-search mr-2"></i>Browse Profiles
                        </button>
                        ${!currentUser ? `
                            <button onclick="showAuthModal()" class="btn-secondary">
                                <i class="fas fa-user-plus mr-2"></i>Join Now
                            </button>
                        ` : ''}
                    </div>
                </div>
                
                <!-- Online Now Escorts -->
                <div class="mb-8 max-w-7xl mx-auto">
                    <div class="flex justify-between items-center mb-6">
                        <h2 class="text-2xl font-bold">🟢 Online Now</h2>
                        <button onclick="showPage('search')" class="text-pink-500 hover:text-pink-600">
                            View All <i class="fas fa-arrow-right ml-1"></i>
                        </button>
                    </div>
                    <div id="onlineEscorts" class="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div class="text-center py-8">
                            <div class="spinner mx-auto"></div>
                        </div>
                    </div>
                </div>
                
                <!-- Upcoming Events -->
                <div id="eventsSection" class="max-w-7xl mx-auto" style="display: none;">
                    <div class="flex justify-between items-center mb-6">
                        <h2 class="text-2xl font-bold">Upcoming Events</h2>
                        <button onclick="showPage('events')" class="text-pink-500 hover:text-pink-600">
                            View All <i class="fas fa-arrow-right ml-1"></i>
                        </button>
                    </div>
                    <div id="upcomingEvents" class="grid md:grid-cols-3 gap-6">
                        <div class="text-center py-8">
                            <div class="spinner mx-auto"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        loadOnlineEscorts();
        loadUpcomingEvents();
    }
}

async function loadOnlineEscorts() {
    try {
        const response = await fetch(`${API_BASE}/users/online?type=escort&limit=8`);
        const data = await response.json();
        
        const container = document.getElementById('onlineEscorts');
        if (data.users && data.users.length > 0) {
            container.innerHTML = data.users.map(user => `
                <div class="profile-card card-hover cursor-pointer" onclick="viewProfile(${user.id})" data-user-id="${user.id}">
                    <div class="relative">
                        <img src="${user.profile_image_url ? '/' + user.profile_image_url : `https://ui-avatars.com/api/?name=${encodeURIComponent(user.username)}&background=ec4899&color=fff`}" 
                             alt="${user.username}" 
                             class="w-full h-48 object-cover rounded-lg mb-3">
                        <span class="online-badge absolute top-2 left-2 ${user.is_online ? 'bg-green-500' : 'bg-gray-400'} text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                            <span class="w-2 h-2 bg-white rounded-full ${user.is_online ? 'animate-pulse' : ''}"></span>${user.is_online ? 'Online' : 'Offline'}
                        </span>
                        ${user.is_verified ? '<span class="badge badge-verified absolute top-2 right-2"><i class="fas fa-check-circle mr-1"></i>Verified</span>' : ''}
                    </div>
                    <h3 class="font-bold text-lg">${user.username}</h3>
                    ${user.city ? `<p class="text-gray-600 text-sm"><i class="fas fa-map-marker-alt mr-1"></i>${user.city}</p>` : ''}
                    ${user.ethnicity ? `<p class="text-gray-500 text-xs mt-1">${user.ethnicity}</p>` : ''}
                </div>
            `).join('');
        } else {
            container.innerHTML = '<p class="text-gray-500 text-center col-span-full">No escorts available right now</p>';
        }
    } catch (error) {
        console.error('Failed to load online escorts:', error);
        document.getElementById('onlineEscorts').innerHTML = '<p class="text-red-500 text-center col-span-full">Failed to load escorts</p>';
    }
}

function updateUserOnlineStatus(userId, isOnline) {
    const userCard = document.querySelector(`[data-user-id="${userId}"]`);
    if (userCard) {
        const badge = userCard.querySelector('.online-badge');
        if (badge) {
            badge.className = `online-badge absolute top-2 left-2 ${isOnline ? 'bg-green-500' : 'bg-gray-400'} text-white text-xs px-2 py-1 rounded-full flex items-center gap-1`;
            badge.innerHTML = `<span class="w-2 h-2 bg-white rounded-full ${isOnline ? 'animate-pulse' : ''}"></span>${isOnline ? 'Online' : 'Offline'}`;
        }
    }
}

async function loadUpcomingEvents() {
    try {
        const response = await fetch(`${API_BASE}/events/list?limit=3`);
        const data = await response.json();
        
        const container = document.getElementById('upcomingEvents');
        const section = document.getElementById('eventsSection');
        
        if (data.events && data.events.length > 0) {
            section.style.display = 'block';
            container.innerHTML = data.events.map(event => `
                <div class="event-card cursor-pointer" onclick="viewEvent(${event.id})">
                    <img src="${event.event_image_url ? '/' + event.event_image_url : 'https://via.placeholder.com/400x200?text=Event'}" 
                         alt="${event.event_name}" 
                         class="event-image">
                    <div class="p-4">
                        <h3 class="font-bold text-lg mb-2">${event.event_name}</h3>
                        <p class="text-gray-600 text-sm mb-2">${new Date(event.event_date).toLocaleDateString()}</p>
                        <div class="flex justify-between items-center">
                            <span class="text-pink-500 font-bold">R${event.ticket_price}</span>
                            <span class="text-gray-500 text-sm">${event.available_tickets} tickets left</span>
                        </div>
                    </div>
                </div>
            `).join('');
        } else {
            section.style.display = 'none';
        }
    } catch (error) {
        console.error('Failed to load events:', error);
        document.getElementById('eventsSection').style.display = 'none';
    }
}

// Search Page
async function renderSearchPage() {
    const mainContent = document.getElementById('mainContent');
    
    mainContent.innerHTML = `
        <div class="w-full px-4">
            <h1 class="text-3xl font-bold mb-6">Search Profiles</h1>
            
            <!-- Search Bar -->
            <div class="glass rounded-2xl p-6 mb-6">
                <div class="search-bar mb-4">
                    <i class="fas fa-search search-icon"></i>
                    <input type="text" id="searchInput" class="search-input" placeholder="Search by name, location, or ethnicity..." onkeyup="performSearch()">
                </div>
                
                <!-- Filters -->
                <div class="grid md:grid-cols-5 gap-4">
                    <select id="userTypeFilter" class="input-field" onchange="performSearch()">
                        <option value="">All Types</option>
                        <option value="escort">Escorts</option>
                        <option value="venue">Venues</option>
                    </select>
                    
                    <select id="cityFilter" class="input-field" onchange="performSearch()">
                        <option value="">All Cities</option>
                        <option value="Johannesburg">Johannesburg</option>
                        <option value="Cape Town">Cape Town</option>
                        <option value="Durban">Durban</option>
                        <option value="Pretoria">Pretoria</option>
                        <option value="Port Elizabeth">Port Elizabeth</option>
                        <option value="Bloemfontein">Bloemfontein</option>
                        <option value="East London">East London</option>
                        <option value="Nelspruit">Nelspruit</option>
                        <option value="Polokwane">Polokwane</option>
                        <option value="Kimberley">Kimberley</option>
                        <option value="Rustenburg">Rustenburg</option>
                        <option value="Pietermaritzburg">Pietermaritzburg</option>
                    </select>
                    
                    <select id="ethnicityFilter" class="input-field" onchange="performSearch()">
                        <option value="">All Ethnicities</option>
                        <option value="African">African</option>
                        <option value="Caucasian">Caucasian</option>
                        <option value="Asian">Asian</option>
                        <option value="Indian">Indian</option>
                        <option value="Coloured">Coloured</option>
                        <option value="Mixed">Mixed</option>
                    </select>
                    
                    <select id="verifiedFilter" class="input-field" onchange="performSearch()">
                        <option value="">All Profiles</option>
                        <option value="true">Verified Only</option>
                    </select>
                    
                    <button onclick="clearFilters()" class="btn-secondary">
                        <i class="fas fa-times mr-2"></i>Clear Filters
                    </button>
                </div>
            </div>
            
            <!-- Results -->
            <div id="searchResults" class="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div class="text-center py-8 col-span-full">
                    <div class="spinner mx-auto"></div>
                </div>
            </div>
        </div>
    `;
    
    performSearch();
}

async function performSearch() {
    const query = document.getElementById('searchInput').value;
    const userType = document.getElementById('userTypeFilter').value;
    const city = document.getElementById('cityFilter').value;
    const ethnicity = document.getElementById('ethnicityFilter').value;
    const verified = document.getElementById('verifiedFilter').value;
    
    const params = new URLSearchParams();
    if (query) params.append('q', query);
    if (userType) params.append('user_type', userType);
    if (city) params.append('city', city);
    if (ethnicity) params.append('ethnicity', ethnicity);
    if (verified) params.append('verified', verified);
    
    try {
        const response = await fetch(`${API_BASE}/users/search?${params}`);
        const data = await response.json();
        
        const container = document.getElementById('searchResults');
        if (data.users && data.users.length > 0) {
            container.innerHTML = data.users.map(user => `
                <div class="profile-card card-hover cursor-pointer" onclick="viewProfile(${user.id})">
                    <div class="relative">
                        <img src="${user.profile_image_url ? '/' + user.profile_image_url : `https://ui-avatars.com/api/?name=${encodeURIComponent(user.username)}&background=ec4899&color=fff`}" 
                             alt="${user.username}" 
                             class="w-full h-48 object-cover rounded-lg mb-3">
                        ${user.is_verified ? '<span class="badge badge-verified absolute top-2 right-2"><i class="fas fa-check-circle mr-1"></i>Verified</span>' : ''}
                    </div>
                    <h3 class="font-bold text-lg">${user.username}</h3>
                    <p class="text-gray-600 text-sm capitalize">${user.user_type}</p>
                    ${user.city ? `<p class="text-gray-500 text-xs mt-1"><i class="fas fa-map-marker-alt mr-1"></i>${user.city}</p>` : ''}
                    ${user.ethnicity ? `<p class="text-gray-500 text-xs">${user.ethnicity}</p>` : ''}
                </div>
            `).join('');
        } else {
            container.innerHTML = '<p class="text-gray-500 text-center col-span-full py-8">No profiles found</p>';
        }
    } catch (error) {
        console.error('Search failed:', error);
        document.getElementById('searchResults').innerHTML = '<p class="text-red-500 text-center col-span-full">Search failed</p>';
    }
}

function clearFilters() {
    document.getElementById('searchInput').value = '';
    document.getElementById('userTypeFilter').value = '';
    document.getElementById('cityFilter').value = '';
    document.getElementById('ethnicityFilter').value = '';
    document.getElementById('verifiedFilter').value = '';
    performSearch();
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
                            <h1 class="text-3xl font-bold">${user.username}</h1>
                            <p class="text-gray-600 capitalize">${user.user_type}</p>
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
