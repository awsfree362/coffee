// Advanced Notifications System

let notificationSocket = null;

function initializeNotifications() {
    if (!authToken) return;
    
    // Connect to notification socket
    if (socket && !notificationSocket) {
        notificationSocket = socket;
        
        socket.on('new_notification', (notification) => {
            handleNewNotification(notification);
        });
    }
    
    // Load initial notifications
    loadNotifications();
    
    // Update badge
    updateNotificationBadge();
}

async function loadNotifications() {
    try {
        const data = await apiRequest('/notifications/list?limit=50');
        renderNotifications(data.notifications);
        updateNotificationBadge(data.unread_count);
    } catch (error) {
        console.error('Failed to load notifications:', error);
    }
}

function renderNotifications(notifications) {
    const container = document.getElementById('notificationsContainer');
    
    if (!container) return;
    
    if (notifications.length === 0) {
        container.innerHTML = `
            <div class="text-center py-12">
                <i class="fas fa-bell-slash text-6xl text-gray-300 mb-4"></i>
                <p class="text-gray-500">No notifications yet</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = notifications.map(notif => `
        <div class="notification-item ${notif.is_read ? '' : 'unread'} 
                    p-4 border-b border-gray-200 hover:bg-gray-50 transition cursor-pointer"
             onclick="handleNotificationClick(${notif.id}, ${JSON.stringify(notif.data).replace(/"/g, '&quot;')})">
            <div class="flex items-start gap-3">
                <div class="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0
                            ${getNotificationColor(notif.type)}">
                    <i class="fas fa-${getNotificationIcon(notif.type)} text-white"></i>
                </div>
                <div class="flex-1 min-w-0">
                    <div class="flex items-start justify-between gap-2">
                        <p class="font-semibold text-gray-800">${notif.title}</p>
                        ${!notif.is_read ? '<span class="w-2 h-2 rounded-full bg-pink-500 flex-shrink-0"></span>' : ''}
                    </div>
                    <p class="text-sm text-gray-600 mt-1">${notif.message}</p>
                    <p class="text-xs text-gray-400 mt-2">${formatTimeAgo(notif.created_at)}</p>
                </div>
            </div>
        </div>
    `).join('');
}

function getNotificationIcon(type) {
    const icons = {
        'new_message': 'envelope',
        'post_like': 'heart',
        'post_comment': 'comment',
        'subscription_expiring': 'exclamation-triangle',
        'affiliate_earning': 'dollar-sign',
        'payment_verified': 'check-circle',
        'ticket_purchased': 'ticket-alt',
        'system': 'info-circle'
    };
    return icons[type] || 'bell';
}

function getNotificationColor(type) {
    const colors = {
        'new_message': 'bg-blue-500',
        'post_like': 'bg-pink-500',
        'post_comment': 'bg-purple-500',
        'subscription_expiring': 'bg-yellow-500',
        'affiliate_earning': 'bg-green-500',
        'payment_verified': 'bg-teal-500',
        'ticket_purchased': 'bg-indigo-500',
        'system': 'bg-gray-500'
    };
    return colors[type] || 'bg-gray-500';
}

async function handleNotificationClick(notificationId, data) {
    // Mark as read
    await markNotificationAsRead(notificationId);
    
    // Navigate based on notification type
    if (data.post_id) {
        viewPost(data.post_id);
    } else if (data.sender_id) {
        openConversation(data.sender_id);
    } else if (data.booking_id) {
        viewBooking(data.booking_id);
    }
}

async function markNotificationAsRead(notificationId) {
    try {
        await apiRequest('/notifications/mark-read', 'POST', {
            notification_ids: [notificationId]
        });
        updateNotificationBadge();
    } catch (error) {
        console.error('Failed to mark notification as read:', error);
    }
}

async function markAllNotificationsAsRead() {
    try {
        await apiRequest('/notifications/mark-read', 'POST', {
            mark_all: true
        });
        loadNotifications();
        updateNotificationBadge();
        showToast('All notifications marked as read', 'success');
    } catch (error) {
        showToast('Failed to mark notifications as read', 'error');
    }
}

function updateNotificationBadge(count) {
    const badge = document.getElementById('notificationBadge');
    if (!badge) return;
    
    if (count === undefined) {
        // Fetch count
        apiRequest('/notifications/list?unread_only=true').then(data => {
            updateNotificationBadge(data.unread_count);
        });
        return;
    }
    
    if (count > 0) {
        badge.textContent = count > 99 ? '99+' : count;
        badge.classList.remove('hidden');
    } else {
        badge.classList.add('hidden');
    }
}

function handleNewNotification(notification) {
    // Show toast
    showNotificationToast(notification);
    
    // Update badge
    updateNotificationBadge();
    
    // Play sound (optional)
    playNotificationSound();
    
    // Show browser notification if permitted
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(notification.title, {
            body: notification.message,
            icon: '/static/images/logo.png',
            badge: '/static/images/badge.png'
        });
    }
}

function showNotificationToast(notification) {
    const toast = document.createElement('div');
    toast.className = 'fixed top-20 right-4 bg-white rounded-xl shadow-2xl p-4 max-w-sm z-50 animate-slide-in';
    toast.innerHTML = `
        <div class="flex items-start gap-3">
            <div class="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${getNotificationColor(notification.type)}">
                <i class="fas fa-${getNotificationIcon(notification.type)} text-white"></i>
            </div>
            <div class="flex-1">
                <p class="font-semibold text-gray-800">${notification.title}</p>
                <p class="text-sm text-gray-600 mt-1">${notification.message}</p>
            </div>
            <button onclick="this.parentElement.parentElement.remove()" class="text-gray-400 hover:text-gray-600">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 5000);
}

function playNotificationSound() {
    // In production, play actual sound
    // const audio = new Audio('/static/sounds/notification.mp3');
    // audio.play();
}

async function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            showToast('Notifications enabled!', 'success');
        }
    }
}

async function loadNotificationPreferences() {
    try {
        const data = await apiRequest('/notifications/preferences');
        renderNotificationPreferences(data.preferences);
    } catch (error) {
        console.error('Failed to load preferences:', error);
    }
}

function renderNotificationPreferences(prefs) {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center';
    modal.innerHTML = `
        <div class="bg-white rounded-3xl p-8 max-w-md w-full mx-4 shadow-2xl">
            <div class="flex justify-between items-center mb-6">
                <h2 class="text-2xl font-bold text-gray-800">Notification Settings</h2>
                <button onclick="this.closest('.fixed').remove()" class="text-gray-500 hover:text-gray-700">
                    <i class="fas fa-times text-xl"></i>
                </button>
            </div>
            
            <div class="space-y-4">
                <div class="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                    <div>
                        <p class="font-semibold text-gray-800">Email Notifications</p>
                        <p class="text-sm text-gray-600">Receive notifications via email</p>
                    </div>
                    <label class="switch">
                        <input type="checkbox" id="emailEnabled" ${prefs.email_enabled ? 'checked' : ''}>
                        <span class="slider"></span>
                    </label>
                </div>
                
                <div class="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                    <div>
                        <p class="font-semibold text-gray-800">Push Notifications</p>
                        <p class="text-sm text-gray-600">Receive push notifications</p>
                    </div>
                    <label class="switch">
                        <input type="checkbox" id="pushEnabled" ${prefs.push_enabled ? 'checked' : ''}>
                        <span class="slider"></span>
                    </label>
                </div>
                
                <div class="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                    <div>
                        <p class="font-semibold text-gray-800">New Messages</p>
                        <p class="text-sm text-gray-600">Notify when you receive messages</p>
                    </div>
                    <label class="switch">
                        <input type="checkbox" id="newMessage" ${prefs.new_message ? 'checked' : ''}>
                        <span class="slider"></span>
                    </label>
                </div>
                
                <div class="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                    <div>
                        <p class="font-semibold text-gray-800">Post Interactions</p>
                        <p class="text-sm text-gray-600">Likes, comments on your posts</p>
                    </div>
                    <label class="switch">
                        <input type="checkbox" id="postInteraction" ${prefs.post_interaction ? 'checked' : ''}>
                        <span class="slider"></span>
                    </label>
                </div>
                
                <div class="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                    <div>
                        <p class="font-semibold text-gray-800">Subscription Alerts</p>
                        <p class="text-sm text-gray-600">Payment and renewal reminders</p>
                    </div>
                    <label class="switch">
                        <input type="checkbox" id="subscriptionAlerts" ${prefs.subscription_alerts ? 'checked' : ''}>
                        <span class="slider"></span>
                    </label>
                </div>
                
                <div class="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                    <div>
                        <p class="font-semibold text-gray-800">Affiliate Updates</p>
                        <p class="text-sm text-gray-600">Earnings and referral notifications</p>
                    </div>
                    <label class="switch">
                        <input type="checkbox" id="affiliateUpdates" ${prefs.affiliate_updates ? 'checked' : ''}>
                        <span class="slider"></span>
                    </label>
                </div>
            </div>
            
            <button onclick="saveNotificationPreferences()" class="w-full btn-primary mt-6">
                Save Preferences
            </button>
        </div>
    `;
    
    document.body.appendChild(modal);
}

async function saveNotificationPreferences() {
    const preferences = {
        email_enabled: document.getElementById('emailEnabled').checked,
        push_enabled: document.getElementById('pushEnabled').checked,
        new_message: document.getElementById('newMessage').checked,
        post_interaction: document.getElementById('postInteraction').checked,
        subscription_alerts: document.getElementById('subscriptionAlerts').checked,
        affiliate_updates: document.getElementById('affiliateUpdates').checked
    };
    
    try {
        await apiRequest('/notifications/preferences', 'PUT', preferences);
        showToast('Preferences saved!', 'success');
        document.querySelector('.fixed').remove();
    } catch (error) {
        showToast('Failed to save preferences', 'error');
    }
}

function formatTimeAgo(timestamp) {
    const now = new Date();
    const time = new Date(timestamp);
    const diff = Math.floor((now - time) / 1000);
    
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return time.toLocaleDateString();
}

// Initialize notifications when user logs in
if (authToken) {
    initializeNotifications();
    requestNotificationPermission();
}
