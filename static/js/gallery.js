// Gallery Management for Listers

async function renderGalleryPage() {
    const mainContent = document.getElementById('mainContent');
    
    mainContent.innerHTML = `
        <div class="w-full px-4 max-w-7xl mx-auto">
            <div class="flex justify-between items-center mb-6">
                <h1 class="text-3xl font-bold">My Gallery</h1>
                <div class="flex gap-3">
                    <button onclick="showCreatePostModal()" class="btn-primary">
                        <i class="fas fa-image mr-2"></i>Create Post
                    </button>
                    <button onclick="showCreateReelModal()" class="btn-secondary">
                        <i class="fas fa-video mr-2"></i>Create Reel
                    </button>
                </div>
            </div>
            
            <!-- Tabs -->
            <div class="flex gap-4 mb-6 border-b">
                <button onclick="switchGalleryTab('posts')" id="postsTab" class="px-4 py-2 font-semibold border-b-2 border-pink-500 text-pink-500">
                    <i class="fas fa-th mr-2"></i>Posts
                </button>
                <button onclick="switchGalleryTab('reels')" id="reelsTab" class="px-4 py-2 font-semibold border-b-2 border-transparent text-gray-500 hover:text-gray-700">
                    <i class="fas fa-video mr-2"></i>Reels
                </button>
            </div>
            
            <div id="galleryGrid" class="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div class="text-center py-8 col-span-full">
                    <div class="spinner mx-auto"></div>
                </div>
            </div>
        </div>
    `;
    
    loadGalleryPosts();
}

let currentGalleryTab = 'posts';

function switchGalleryTab(tab) {
    currentGalleryTab = tab;
    
    // Update tab styles
    document.getElementById('postsTab').className = tab === 'posts' 
        ? 'px-4 py-2 font-semibold border-b-2 border-pink-500 text-pink-500'
        : 'px-4 py-2 font-semibold border-b-2 border-transparent text-gray-500 hover:text-gray-700';
    
    document.getElementById('reelsTab').className = tab === 'reels'
        ? 'px-4 py-2 font-semibold border-b-2 border-pink-500 text-pink-500'
        : 'px-4 py-2 font-semibold border-b-2 border-transparent text-gray-500 hover:text-gray-700';
    
    // Load content
    if (tab === 'posts') {
        loadGalleryPosts();
    } else {
        loadGalleryReels();
    }
}

async function loadGalleryPosts() {
    try {
        const response = await fetch(`${API_BASE}/posts/user/${currentUser.id}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        const data = await response.json();
        
        const container = document.getElementById('galleryGrid');
        if (data.posts && data.posts.length > 0) {
            container.innerHTML = data.posts.map(post => `
                <div class="relative group">
                    ${post.media_type === 'video' ? `
                        <video src="/${post.media_url}" class="w-full h-64 object-cover rounded-lg"></video>
                        <i class="fas fa-play-circle absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-white text-4xl opacity-70"></i>
                    ` : `
                        <img src="/${post.media_url}" alt="Post" class="w-full h-64 object-cover rounded-lg">
                    `}
                    
                    <div class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-60 transition-all rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <div class="text-white text-center">
                            <div class="flex gap-4 mb-4">
                                <span><i class="fas fa-heart mr-1"></i>${post.likes_count}</span>
                                <span><i class="fas fa-comment mr-1"></i>${post.comments_count}</span>
                                <span><i class="fas fa-eye mr-1"></i>${post.views_count}</span>
                            </div>
                            <div class="flex gap-2 justify-center">
                                <button onclick="editPost(${post.id})" class="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-lg text-sm">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button onclick="deletePost(${post.id})" class="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-lg text-sm">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    ${post.caption ? `
                        <p class="text-sm text-gray-600 mt-2 truncate">${post.caption}</p>
                    ` : ''}
                </div>
            `).join('');
        } else {
            container.innerHTML = `
                <div class="col-span-full text-center py-12">
                    <i class="fas fa-th text-6xl text-gray-300 mb-4"></i>
                    <p class="text-gray-500 mb-4">No posts yet</p>
                    <button onclick="showCreatePostModal()" class="btn-primary">
                        <i class="fas fa-plus mr-2"></i>Create Your First Post
                    </button>
                </div>
            `;
        }
    } catch (error) {
        console.error('Failed to load gallery:', error);
        document.getElementById('galleryGrid').innerHTML = '<p class="text-red-500 text-center col-span-full">Failed to load gallery</p>';
    }
}

async function loadGalleryReels() {
    try {
        const response = await fetch(`${API_BASE}/reels/user/${currentUser.id}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        const data = await response.json();
        
        const container = document.getElementById('galleryGrid');
        if (data.reels && data.reels.length > 0) {
            container.innerHTML = data.reels.map(reel => `
                <div class="relative group">
                    <video src="/${reel.video_url}" class="w-full h-64 object-cover rounded-lg"></video>
                    <i class="fas fa-play-circle absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-white text-4xl opacity-70"></i>
                    <div class="absolute top-2 right-2 bg-pink-500 text-white text-xs px-2 py-1 rounded-full">
                        <i class="fas fa-video mr-1"></i>Reel
                    </div>
                    
                    <div class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-60 transition-all rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <div class="text-white text-center">
                            <div class="flex gap-4 mb-4">
                                <span><i class="fas fa-heart mr-1"></i>${reel.likes_count}</span>
                                <span><i class="fas fa-comment mr-1"></i>${reel.comments_count}</span>
                                <span><i class="fas fa-eye mr-1"></i>${reel.views_count}</span>
                            </div>
                            <div class="flex gap-2 justify-center">
                                <button onclick="editReel(${reel.id})" class="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-lg text-sm">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button onclick="deleteReel(${reel.id})" class="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-lg text-sm">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    ${reel.caption ? `
                        <p class="text-sm text-gray-600 mt-2 truncate">${reel.caption}</p>
                    ` : ''}
                </div>
            `).join('');
        } else {
            container.innerHTML = `
                <div class="col-span-full text-center py-12">
                    <i class="fas fa-video text-6xl text-gray-300 mb-4"></i>
                    <p class="text-gray-500 mb-4">No reels yet</p>
                    <button onclick="showCreateReelModal()" class="btn-primary">
                        <i class="fas fa-plus mr-2"></i>Create Your First Reel
                    </button>
                </div>
            `;
        }
    } catch (error) {
        console.error('Failed to load reels:', error);
        document.getElementById('galleryGrid').innerHTML = '<p class="text-red-500 text-center col-span-full">Failed to load reels</p>';
    }
}

async function editPost(postId) {
    try {
        const response = await fetch(`${API_BASE}/posts/${postId}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        const data = await response.json();
        
        if (data.post) {
            showEditPostModal(data.post);
        }
    } catch (error) {
        console.error('Failed to load post:', error);
        showNotification('Failed to load post', 'error');
    }
}

function showEditPostModal(post) {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4';
    modal.onclick = (e) => {
        if (e.target === modal) modal.remove();
    };
    
    modal.innerHTML = `
        <div class="bg-white rounded-3xl max-w-lg w-full p-6">
            <h2 class="text-2xl font-bold mb-4">Edit Post</h2>
            
            <form id="editPostForm" onsubmit="submitEditPost(event, ${post.id})">
                <div class="mb-4">
                    ${post.media_type === 'video' ? `
                        <video src="/${post.media_url}" class="w-full rounded-lg mb-2" controls></video>
                    ` : `
                        <img src="/${post.media_url}" alt="Post" class="w-full rounded-lg mb-2">
                    `}
                </div>
                
                <div class="mb-4">
                    <label class="block text-gray-700 mb-2">Caption</label>
                    <textarea name="caption" class="input-field" rows="3" placeholder="Write a caption...">${post.caption || ''}</textarea>
                </div>
                
                <div class="flex gap-4">
                    <button type="submit" class="btn-primary flex-1">
                        <i class="fas fa-save mr-2"></i>Save Changes
                    </button>
                    <button type="button" onclick="this.closest('.fixed').remove()" class="btn-secondary flex-1">
                        Cancel
                    </button>
                </div>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
}

async function submitEditPost(event, postId) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    
    try {
        const response = await fetch(`${API_BASE}/posts/${postId}/update`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                caption: formData.get('caption')
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showNotification('Post updated successfully', 'success');
            document.querySelector('.fixed').remove();
            loadGalleryPosts();
        } else {
            showNotification(data.error || 'Failed to update post', 'error');
        }
    } catch (error) {
        console.error('Failed to update post:', error);
        showNotification('Failed to update post', 'error');
    }
}

async function deletePost(postId) {
    if (!confirm('Are you sure you want to delete this post? This action cannot be undone.')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/posts/${postId}/delete`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showNotification('Post deleted successfully', 'success');
            loadGalleryPosts();
        } else {
            showNotification(data.error || 'Failed to delete post', 'error');
        }
    } catch (error) {
        console.error('Failed to delete post:', error);
        showNotification('Failed to delete post', 'error');
    }
}

async function editReel(reelId) {
    try {
        const response = await fetch(`${API_BASE}/reels/${reelId}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        const data = await response.json();
        
        if (data.reel) {
            showEditReelModal(data.reel);
        }
    } catch (error) {
        console.error('Failed to load reel:', error);
        showNotification('Failed to load reel', 'error');
    }
}

function showEditReelModal(reel) {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4';
    modal.onclick = (e) => {
        if (e.target === modal) modal.remove();
    };
    
    modal.innerHTML = `
        <div class="bg-white rounded-3xl max-w-lg w-full p-6">
            <h2 class="text-2xl font-bold mb-4">Edit Reel</h2>
            
            <form id="editReelForm" onsubmit="submitEditReel(event, ${reel.id})">
                <div class="mb-4">
                    <video src="/${reel.video_url}" class="w-full rounded-lg mb-2" controls></video>
                </div>
                
                <div class="mb-4">
                    <label class="block text-gray-700 mb-2">Caption</label>
                    <textarea name="caption" class="input-field" rows="3" placeholder="Write a caption...">${reel.caption || ''}</textarea>
                </div>
                
                <div class="flex gap-4">
                    <button type="submit" class="btn-primary flex-1">
                        <i class="fas fa-save mr-2"></i>Save Changes
                    </button>
                    <button type="button" onclick="this.closest('.fixed').remove()" class="btn-secondary flex-1">
                        Cancel
                    </button>
                </div>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
}

async function submitEditReel(event, reelId) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    
    try {
        const response = await fetch(`${API_BASE}/reels/${reelId}/update`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                caption: formData.get('caption')
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showNotification('Reel updated successfully', 'success');
            document.querySelector('.fixed').remove();
            loadGalleryReels();
        } else {
            showNotification(data.error || 'Failed to update reel', 'error');
        }
    } catch (error) {
        console.error('Failed to update reel:', error);
        showNotification('Failed to update reel', 'error');
    }
}

async function deleteReel(reelId) {
    if (!confirm('Are you sure you want to delete this reel? This action cannot be undone.')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/reels/${reelId}/delete`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showNotification('Reel deleted successfully', 'success');
            loadGalleryReels();
        } else {
            showNotification(data.error || 'Failed to delete reel', 'error');
        }
    } catch (error) {
        console.error('Failed to delete reel:', error);
        showNotification('Failed to delete reel', 'error');
    }
}
