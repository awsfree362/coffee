// Profile & Admin Module

async function renderProfilePage() {
    const mainContent = document.getElementById('mainContent');
    
    mainContent.innerHTML = `
        <div class="max-w-4xl mx-auto">
            <div class="bg-white rounded-3xl shadow-lg overflow-hidden mb-6">
                <div class="h-32 bg-gradient-to-r from-pink-500 to-purple-600"></div>
                <div class="px-6 pb-6">
                    <div class="flex flex-col md:flex-row items-center md:items-end gap-6 -mt-16">
                        <img src="${currentUser.profile_image_url ? '/' + currentUser.profile_image_url : `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.username)}&background=ec4899&color=fff&size=200`}" 
                             class="avatar-xl border-4 border-white shadow-lg">
                        <div class="flex-1 text-center md:text-left">
                            <h1 class="text-3xl font-bold">${currentUser.username}</h1>
                            <p class="text-gray-600 capitalize">${currentUser.user_type}</p>
                            ${currentUser.is_verified ? '<span class="badge badge-verified mt-2"><i class="fas fa-check-circle mr-1"></i>Verified</span>' : ''}
                        </div>
                        <button onclick="showEditProfileModal()" class="btn-primary">
                            <i class="fas fa-edit mr-2"></i>Edit Profile
                        </button>
                    </div>
                </div>
            </div>
            
            <div class="grid md:grid-cols-3 gap-6 mb-6">
                ${currentUser.user_type !== 'visitor' ? `
                    <button onclick="showPage('gallery')" class="profile-card card-hover text-center">
                        <i class="fas fa-images text-4xl text-pink-500 mb-3"></i>
                        <h3 class="font-bold text-lg">My Gallery</h3>
                    </button>
                ` : ''}
                
                <button onclick="showPage('posts')" class="profile-card card-hover text-center">
                    <i class="fas fa-play-circle text-4xl text-purple-500 mb-3"></i>
                    <h3 class="font-bold text-lg">Feed</h3>
                </button>
                
                <button onclick="showPage('affiliates')" class="profile-card card-hover text-center">
                    <i class="fas fa-users text-4xl text-blue-500 mb-3"></i>
                    <h3 class="font-bold text-lg">Affiliates</h3>
                </button>
                
                <button onclick="showPage('subscription')" class="profile-card card-hover text-center">
                    <i class="fas fa-crown text-4xl text-yellow-500 mb-3"></i>
                    <h3 class="font-bold text-lg">Subscription</h3>
                </button>
            </div>
            
            <div class="bg-white rounded-2xl shadow-lg p-6">
                <h2 class="text-xl font-bold mb-4">Account Settings</h2>
                <div class="space-y-3">
                    <button onclick="changePassword()" class="w-full text-left p-4 hover:bg-gray-50 rounded-xl transition flex items-center justify-between">
                        <div class="flex items-center gap-3">
                            <i class="fas fa-lock text-gray-400"></i>
                            <span>Change Password</span>
                        </div>
                        <i class="fas fa-chevron-right text-gray-400"></i>
                    </button>
                    
                    <button onclick="viewTransactions()" class="w-full text-left p-4 hover:bg-gray-50 rounded-xl transition flex items-center justify-between">
                        <div class="flex items-center gap-3">
                            <i class="fas fa-receipt text-gray-400"></i>
                            <span>Transaction History</span>
                        </div>
                        <i class="fas fa-chevron-right text-gray-400"></i>
                    </button>
                    
                    ${currentUser.user_type === 'venue' ? `
                        <button onclick="showPage('events')" class="w-full text-left p-4 hover:bg-gray-50 rounded-xl transition flex items-center justify-between">
                            <div class="flex items-center gap-3">
                                <i class="fas fa-calendar text-gray-400"></i>
                                <span>My Events</span>
                            </div>
                            <i class="fas fa-chevron-right text-gray-400"></i>
                        </button>
                    ` : ''}
                    
                    <button onclick="logout()" class="w-full text-left p-4 hover:bg-red-50 rounded-xl transition flex items-center justify-between text-red-600">
                        <div class="flex items-center gap-3">
                            <i class="fas fa-sign-out-alt"></i>
                            <span>Logout</span>
                        </div>
                        <i class="fas fa-chevron-right"></i>
                    </button>
                </div>
            </div>
        </div>
    `;
}

function showEditProfileModal() {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4';
    
    modal.innerHTML = `
        <div class="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-8">
            <h2 class="text-2xl font-bold mb-6">Edit Profile</h2>
            
            <form onsubmit="updateProfile(event)" class="space-y-4">
                <div>
                    <label class="block font-semibold mb-2">Profile Image</label>
                    <input type="file" id="editProfileImage" class="input-field" accept="image/*">
                </div>
                
                <div>
                    <label class="block font-semibold mb-2">Full Name</label>
                    <input type="text" id="editFullName" class="input-field" value="${currentUser.full_name || ''}">
                </div>
                
                <div>
                    <label class="block font-semibold mb-2">Phone</label>
                    <input type="tel" id="editPhone" class="input-field" value="${currentUser.phone || ''}">
                </div>
                
                <div>
                    <label class="block font-semibold mb-2">Bio</label>
                    <textarea id="editBio" class="input-field" rows="4">${currentUser.bio || ''}</textarea>
                </div>
                
                <div>
                    <label class="block font-semibold mb-2">Ethnicity</label>
                    <select id="editEthnicity" class="input-field">
                        <option value="">Select</option>
                        <option value="African" ${currentUser.ethnicity === 'African' ? 'selected' : ''}>African</option>
                        <option value="Caucasian" ${currentUser.ethnicity === 'Caucasian' ? 'selected' : ''}>Caucasian</option>
                        <option value="Asian" ${currentUser.ethnicity === 'Asian' ? 'selected' : ''}>Asian</option>
                        <option value="Indian" ${currentUser.ethnicity === 'Indian' ? 'selected' : ''}>Indian</option>
                        <option value="Coloured" ${currentUser.ethnicity === 'Coloured' ? 'selected' : ''}>Coloured</option>
                        <option value="Mixed" ${currentUser.ethnicity === 'Mixed' ? 'selected' : ''}>Mixed</option>
                    </select>
                </div>
                
                <div class="flex gap-4">
                    <button type="submit" class="btn-primary flex-1">Save Changes</button>
                    <button type="button" onclick="this.closest('.fixed').remove()" class="btn-secondary flex-1">Cancel</button>
                </div>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
}

async function updateProfile(e) {
    e.preventDefault();
    
    const formData = new FormData();
    const fullName = document.getElementById('editFullName').value;
    const phone = document.getElementById('editPhone').value;
    const bio = document.getElementById('editBio').value;
    const ethnicity = document.getElementById('editEthnicity').value;
    const profileImage = document.getElementById('editProfileImage').files[0];
    
    if (fullName) formData.append('full_name', fullName);
    if (phone) formData.append('phone', phone);
    if (bio) formData.append('bio', bio);
    if (ethnicity) formData.append('ethnicity', ethnicity);
    if (profileImage) formData.append('profile_image', profileImage);
    
    try {
        const response = await fetch(`${API_BASE}/users/profile/update`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
            body: formData
        });
        
        if (response.ok) {
            document.querySelector('.fixed').remove();
            showNotification('Profile updated!', 'success');
            checkAuth();
            renderProfilePage();
        } else {
            showNotification('Update failed', 'error');
        }
    } catch (error) {
        showNotification('Update failed', 'error');
    }
}

function changePassword() {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4';
    
    modal.innerHTML = `
        <div class="bg-white rounded-3xl max-w-md w-full p-8">
            <h2 class="text-2xl font-bold mb-6">Change Password</h2>
            
            <form onsubmit="submitPasswordChange(event)" class="space-y-4">
                <div>
                    <label class="block font-semibold mb-2">Current Password</label>
                    <input type="password" id="currentPassword" class="input-field" required>
                </div>
                
                <div>
                    <label class="block font-semibold mb-2">New Password</label>
                    <input type="password" id="newPassword" class="input-field" minlength="6" required>
                </div>
                
                <div>
                    <label class="block font-semibold mb-2">Confirm New Password</label>
                    <input type="password" id="confirmPassword" class="input-field" minlength="6" required>
                </div>
                
                <button type="submit" class="btn-primary w-full">Change Password</button>
                <button type="button" onclick="this.closest('.fixed').remove()" class="btn-secondary w-full">Cancel</button>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
}

async function submitPasswordChange(e) {
    e.preventDefault();
    
    const newPass = document.getElementById('newPassword').value;
    const confirmPass = document.getElementById('confirmPassword').value;
    
    if (newPass !== confirmPass) {
        showNotification('Passwords do not match', 'error');
        return;
    }
    
    showNotification('Password change feature coming soon', 'info');
    document.querySelector('.fixed').remove();
}

async function viewTransactions() {
    showNotification('Transaction history feature coming soon', 'info');
}

// Admin Panel (for admin users)
async function renderAdminPanel() {
    if (!currentUser || currentUser.user_type !== 'admin') {
        showNotification('Access denied', 'error');
        showPage('home');
        return;
    }
    
    const mainContent = document.getElementById('mainContent');
    mainContent.innerHTML = `
        <div class="max-w-7xl mx-auto">
            <h1 class="text-3xl font-bold mb-8">Admin Dashboard</h1>
            
            <div class="grid md:grid-cols-4 gap-6 mb-8">
                <div class="stats-card">
                    <div class="text-3xl mb-2">👥</div>
                    <p class="text-sm opacity-90">Total Users</p>
                    <p class="text-3xl font-bold" id="totalUsers">-</p>
                </div>
                <div class="stats-card">
                    <div class="text-3xl mb-2">💰</div>
                    <p class="text-sm opacity-90">Revenue</p>
                    <p class="text-3xl font-bold" id="totalRevenue">-</p>
                </div>
                <div class="stats-card">
                    <div class="text-3xl mb-2">📝</div>
                    <p class="text-sm opacity-90">Total Posts</p>
                    <p class="text-3xl font-bold" id="totalPosts">-</p>
                </div>
                <div class="stats-card">
                    <div class="text-3xl mb-2">🎫</div>
                    <p class="text-sm opacity-90">Events</p>
                    <p class="text-3xl font-bold" id="totalEvents">-</p>
                </div>
            </div>
            
            <div class="bg-white rounded-2xl shadow-lg p-6">
                <h2 class="text-xl font-bold mb-4">Pending Verifications</h2>
                <div id="pendingVerifications">Loading...</div>
            </div>
        </div>
    `;
    
    loadAdminStats();
}

async function loadAdminStats() {
    try {
        const response = await fetch(`${API_BASE}/admin/stats`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const data = await response.json();
        
        if (data.stats) {
            document.getElementById('totalUsers').textContent = data.stats.total_users || 0;
            document.getElementById('totalRevenue').textContent = formatCurrency(data.stats.total_revenue || 0);
            document.getElementById('totalPosts').textContent = data.stats.total_posts || 0;
            document.getElementById('totalEvents').textContent = data.stats.total_events || 0;
        }
    } catch (error) {
        console.error('Failed to load admin stats:', error);
    }
}
