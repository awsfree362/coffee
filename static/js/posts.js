// Posts Module - TikTok Style Feed
async function renderPostsPage() {
    const mainContent = document.getElementById('mainContent');
    
    mainContent.innerHTML = `
        <div class="max-w-2xl mx-auto">
            <div class="flex justify-between items-center mb-6">
                <h1 class="text-2xl font-bold">Posts Feed</h1>
                ${currentUser ? `
                    <button onclick="showCreatePostModal()" class="btn-primary">
                        <i class="fas fa-plus mr-2"></i>Create Post
                    </button>
                ` : ''}
            </div>
            
            <div id="postsContainer" class="posts-container">
                <div class="text-center py-8">
                    <div class="spinner mx-auto"></div>
                </div>
            </div>
        </div>
    `;
    
    loadPosts();
}

async function loadPosts() {
    try {
        const headers = {};
        if (currentUser) {
            headers['Authorization'] = `Bearer ${localStorage.getItem('token')}`;
        }
        
        const response = await fetch(`${API_BASE}/posts/feed`, { headers });
        const data = await response.json();
        
        const container = document.getElementById('postsContainer');
        if (data.posts && data.posts.length > 0) {
            container.innerHTML = data.posts.map(post => renderPost(post)).join('');
        } else {
            container.innerHTML = '<p class="text-gray-500 text-center py-8">No posts yet</p>';
        }
    } catch (error) {
        console.error('Failed to load posts:', error);
        document.getElementById('postsContainer').innerHTML = '<p class="text-red-500 text-center">Failed to load posts</p>';
    }
}

function renderPost(post) {
    const isLiked = post.user_liked || false;
    
    return `
        <div class="post-item bg-white rounded-2xl overflow-hidden shadow-lg mb-4">
            <div class="relative">
                ${post.media_type === 'video' ? `
                    <video class="post-video" controls>
                        <source src="/${post.media_url}" type="video/mp4">
                    </video>
                ` : `
                    <img src="/${post.media_url}" alt="Post" class="post-image">
                `}
                
                <!-- Post Actions Overlay -->
                <div class="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/70 to-transparent text-white">
                    <div class="flex items-start justify-between mb-3">
                        <div class="flex items-center gap-3">
                            <img src="${post.user_profile_image ? '/' + post.user_profile_image : `https://ui-avatars.com/api/?name=${encodeURIComponent(post.username)}&background=ec4899&color=fff`}" 
                                 alt="${post.username}" 
                                 class="avatar cursor-pointer"
                                 onclick="viewProfile(${post.user_id})">
                            <div>
                                <p class="font-bold">${post.username}</p>
                                <p class="text-xs opacity-75">${formatDate(post.created_at)}</p>
                            </div>
                        </div>
                    </div>
                    
                    ${post.caption ? `<p class="mb-3">${post.caption}</p>` : ''}
                    
                    <div class="flex items-center gap-6">
                        <button onclick="toggleLike(${post.id})" class="flex items-center gap-2 hover:scale-110 transition" id="likeBtn-${post.id}">
                            <i class="fas fa-heart ${isLiked ? 'text-red-500' : ''}"></i>
                            <span id="likeCount-${post.id}">${post.likes_count || 0}</span>
                        </button>
                        
                        <button onclick="showComments(${post.id})" class="flex items-center gap-2 hover:scale-110 transition">
                            <i class="fas fa-comment"></i>
                            <span>${post.comments_count || 0}</span>
                        </button>
                        
                        <button class="flex items-center gap-2 hover:scale-110 transition">
                            <i class="fas fa-eye"></i>
                            <span>${post.views_count || 0}</span>
                        </button>
                        
                        <button onclick="sharePost(${post.id})" class="flex items-center gap-2 hover:scale-110 transition ml-auto">
                            <i class="fas fa-share"></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

async function toggleLike(postId) {
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
            const likeCount = document.getElementById(`likeCount-${postId}`);
            const icon = likeBtn.querySelector('i');
            
            if (data.liked) {
                icon.classList.add('text-red-500');
                likeCount.textContent = parseInt(likeCount.textContent) + 1;
            } else {
                icon.classList.remove('text-red-500');
                likeCount.textContent = parseInt(likeCount.textContent) - 1;
            }
        } else {
            showNotification(data.error || 'Failed to like post', 'error');
        }
    } catch (error) {
        console.error('Failed to toggle like:', error);
        showNotification('Failed to like post', 'error');
    }
}

async function showComments(postId) {
    if (!currentUser) {
        showAuthModal();
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/posts/${postId}/comments`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        const data = await response.json();
        
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4';
        modal.onclick = (e) => {
            if (e.target === modal) modal.remove();
        };
        
        modal.innerHTML = `
            <div class="bg-white rounded-3xl max-w-2xl w-full max-h-[80vh] flex flex-col">
                <div class="p-6 border-b flex justify-between items-center">
                    <h2 class="text-xl font-bold">Comments</h2>
                    <button onclick="this.closest('.fixed').remove()" class="text-gray-500 hover:text-gray-700">
                        <i class="fas fa-times text-xl"></i>
                    </button>
                </div>
                
                <div class="flex-1 overflow-y-auto p-6" id="commentsList">
                    ${data.comments && data.comments.length > 0 ? 
                        data.comments.map(comment => `
                            <div class="flex gap-3 mb-4">
                                <img src="${comment.user_profile_image ? '/' + comment.user_profile_image : `https://ui-avatars.com/api/?name=${encodeURIComponent(comment.username)}&background=ec4899&color=fff`}" 
                                     alt="${comment.username}" 
                                     class="avatar">
                                <div class="flex-1">
                                    <p class="font-bold text-sm">${comment.username}</p>
                                    <p class="text-gray-700">${comment.comment_text}</p>
                                    <p class="text-xs text-gray-500 mt-1">${formatDate(comment.created_at)}</p>
                                </div>
                            </div>
                        `).join('') 
                        : '<p class="text-gray-500 text-center">No comments yet</p>'
                    }
                </div>
                
                <div class="p-6 border-t">
                    <form onsubmit="submitComment(event, ${postId})" class="flex gap-3">
                        <input type="text" id="commentInput" class="input-field flex-1" placeholder="Add a comment..." required>
                        <button type="submit" class="btn-primary">
                            <i class="fas fa-paper-plane"></i>
                        </button>
                    </form>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    } catch (error) {
        console.error('Failed to load comments:', error);
        showNotification('Failed to load comments', 'error');
    }
}

async function submitComment(e, postId) {
    e.preventDefault();
    
    const input = document.getElementById('commentInput');
    const comment = input.value.trim();
    
    if (!comment) return;
    
    try {
        const response = await fetch(`${API_BASE}/posts/${postId}/comment`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ comment_text: comment })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            input.value = '';
            showComments(postId); // Reload comments
            showNotification('Comment added!', 'success');
        } else {
            showNotification(data.error || 'Failed to add comment', 'error');
        }
    } catch (error) {
        console.error('Failed to submit comment:', error);
        showNotification('Failed to add comment', 'error');
    }
}

function showCreatePostModal() {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4';
    
    modal.innerHTML = `
        <div class="bg-white rounded-3xl max-w-lg w-full p-8">
            <div class="flex justify-between items-center mb-6">
                <h2 class="text-2xl font-bold">Create Post</h2>
                <button onclick="this.closest('.fixed').remove()" class="text-gray-500 hover:text-gray-700">
                    <i class="fas fa-times text-xl"></i>
                </button>
            </div>
            
            <form onsubmit="submitPost(event)" id="createPostForm">
                <div class="mb-4">
                    <label class="block text-gray-700 font-semibold mb-2">Media *</label>
                    <div class="file-upload" id="mediaUpload">
                        <i class="fas fa-cloud-upload-alt text-4xl text-gray-400 mb-2"></i>
                        <p class="text-gray-600">Click or drag to upload image/video</p>
                        <input type="file" id="postMedia" accept="image/*,video/*" class="hidden" required onchange="previewMedia(this)">
                    </div>
                    <div id="mediaPreview" class="mt-4 hidden"></div>
                </div>
                
                <div class="mb-4">
                    <label class="block text-gray-700 font-semibold mb-2">Caption</label>
                    <textarea id="postCaption" class="input-field" rows="3" placeholder="Write a caption..."></textarea>
                </div>
                
                <button type="submit" class="btn-primary w-full">
                    <i class="fas fa-paper-plane mr-2"></i>Post
                </button>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Setup drag and drop
    const uploadArea = modal.querySelector('#mediaUpload');
    const fileInput = modal.querySelector('#postMedia');
    
    uploadArea.onclick = () => fileInput.click();
    
    uploadArea.ondragover = (e) => {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    };
    
    uploadArea.ondragleave = () => {
        uploadArea.classList.remove('dragover');
    };
    
    uploadArea.ondrop = (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        fileInput.files = e.dataTransfer.files;
        previewMedia(fileInput);
    };
}

function previewMedia(input) {
    const preview = document.getElementById('mediaPreview');
    const file = input.files[0];
    
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            if (file.type.startsWith('image/')) {
                preview.innerHTML = `<img src="${e.target.result}" class="w-full rounded-lg">`;
            } else if (file.type.startsWith('video/')) {
                preview.innerHTML = `<video src="${e.target.result}" class="w-full rounded-lg" controls></video>`;
            }
            preview.classList.remove('hidden');
        };
        reader.readAsDataURL(file);
    }
}

async function submitPost(e) {
    e.preventDefault();
    
    const formData = new FormData();
    const media = document.getElementById('postMedia').files[0];
    const caption = document.getElementById('postCaption').value;
    
    formData.append('media', media);
    if (caption) formData.append('caption', caption);
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner animate-spin mr-2"></i>Posting...';
    
    try {
        const response = await fetch(`${API_BASE}/posts/create`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: formData
        });
        
        const data = await response.json();
        
        if (response.ok) {
            document.querySelector('.fixed').remove();
            showNotification('Post created successfully!', 'success');
            loadPosts(); // Reload posts
        } else {
            showNotification(data.error || 'Failed to create post', 'error');
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-paper-plane mr-2"></i>Post';
        }
    } catch (error) {
        console.error('Failed to create post:', error);
        showNotification('Failed to create post', 'error');
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-paper-plane mr-2"></i>Post';
    }
}

function sharePost(postId) {
    const url = `${window.location.origin}/?post=${postId}`;
    
    if (navigator.share) {
        navigator.share({
            title: 'Check out this post on Coffee',
            url: url
        });
    } else {
        navigator.clipboard.writeText(url);
        showNotification('Link copied to clipboard!', 'success');
    }
}
