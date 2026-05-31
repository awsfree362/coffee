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
            renderProfilePage();
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
            showProfileModal(data.user);
        }
    } catch (error) {
        console.error('Failed to load profile:', error);
        showNotification('Failed to load profile', 'error');
    }
}

function showProfileModal(user) {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4';
    modal.onclick = (e) => {
        if (e.target === modal) modal.remove();
    };
    
    modal.innerHTML = `
        <div class="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div class="relative">
                <img src="${user.profile_image_url ? '/' + user.profile_image_url : `https://ui-avatars.com/api/?name=${encodeURIComponent(user.username)}&background=ec4899&color=fff&size=400`}" 
                     alt="${user.username}" 
                     class="w-full h-64 object-cover">
                <button onclick="this.closest('.fixed').remove()" class="absolute top-4 right-4 bg-white rounded-full w-10 h-10 flex items-center justify-center shadow-lg">
                    <i class="fas fa-times"></i>
                </button>
                ${user.is_verified ? '<span class="badge badge-verified absolute top-4 left-4"><i class="fas fa-check-circle mr-1"></i>Verified</span>' : ''}
            </div>
            
            <div class="p-6">
                <h2 class="text-3xl font-bold mb-2">${user.username}</h2>
                <p class="text-gray-600 mb-4 capitalize">${user.user_type}</p>
                
                ${user.bio ? `<p class="text-gray-700 mb-4">${user.bio}</p>` : ''}
                
                <div class="grid grid-cols-2 gap-4 mb-6">
                    ${user.ethnicity ? `<div><span class="text-gray-500">Ethnicity:</span> <span class="font-semibold">${user.ethnicity}</span></div>` : ''}
                    ${user.phone ? `<div><span class="text-gray-500">Phone:</span> <span class="font-semibold">${user.phone}</span></div>` : ''}
                </div>
                
                <div class="flex gap-4">
                    ${currentUser && currentUser.id !== user.id ? `
                        <button onclick="startConversation(${user.id})" class="btn-primary flex-1">
                            <i class="fas fa-comment mr-2"></i>Message
                        </button>
                    ` : ''}
                    <button onclick="this.closest('.fixed').remove()" class="btn-secondary flex-1">
                        Close
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
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
