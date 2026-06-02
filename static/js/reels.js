// Reels Module - TikTok-Style Vertical Videos

async function renderReelsPage() {
    const mainContent = document.getElementById('mainContent');
    
    mainContent.innerHTML = `
        <div class="reels-container">
            <div id="reelsScroll" class="reels-scroll">
                <div class="text-center py-8">
                    <div class="spinner mx-auto"></div>
                </div>
            </div>
        </div>
    `;
    
    loadReelsFeed();
}

async function loadReelsFeed() {
    try {
        const headers = {};
        if (currentUser) {
            headers['Authorization'] = `Bearer ${localStorage.getItem('token')}`;
        }
        
        const response = await fetch(`${API_BASE}/reels/feed?limit=50`, { headers });
        const data = await response.json();
        
        const container = document.getElementById('reelsScroll');
        if (data.reels && data.reels.length > 0) {
            container.innerHTML = data.reels.map((reel, index) => renderReel(reel, index)).join('');
            setupReelsScroll();
        } else {
            container.innerHTML = `
                <div class="reel-item flex items-center justify-center">
                    <div class="text-center text-white">
                        <i class="fas fa-video text-6xl mb-4 opacity-50"></i>
                        <p class="text-xl mb-4">No reels yet</p>
                        ${currentUser && currentUser.user_type !== 'visitor' ? `
                            <button onclick="showCreateReelModal()" class="btn-primary">
                                <i class="fas fa-plus mr-2"></i>Create First Reel
                            </button>
                        ` : ''}
                    </div>
                </div>
            `;
        }
    } catch (error) {
        console.error('Failed to load reels:', error);
    }
}

function renderReel(reel, index) {
    return `
        <div class="reel-item" data-reel-id="${reel.id}">
            <video class="reel-media" loop playsinline id="video-${index}">
                <source src="/${reel.video_url}" type="video/mp4">
            </video>
            
            <div class="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
                <div class="flex items-center gap-3" onclick="viewProfile(${reel.user_id})">
                    <img src="${reel.profile_image_url ? '/' + reel.profile_image_url : `https://ui-avatars.com/api/?name=${encodeURIComponent(reel.username)}&background=ec4899&color=fff`}" 
                         alt="${reel.username}" 
                         class="w-12 h-12 rounded-full border-2 border-white shadow-lg">
                    <div class="text-white">
                        <p class="font-bold text-shadow">${reel.username}</p>
                        <p class="text-xs opacity-90 text-shadow">${formatDate(reel.created_at)}</p>
                    </div>
                </div>
                <button onclick="toggleVideoPlay(${index})" class="text-white text-2xl" id="playBtn-${index}">
                    <i class="fas fa-pause"></i>
                </button>
            </div>
            
            ${reel.caption ? `
                <div class="absolute bottom-24 left-4 right-20 z-10">
                    <p class="text-white text-shadow line-clamp-3">${reel.caption}</p>
                </div>
            ` : ''}
            
            <div class="absolute bottom-24 right-4 flex flex-col gap-6 z-10">
                <button onclick="toggleReelLike(${reel.id})" class="reel-action-btn" id="reelLikeBtn-${reel.id}">
                    <i class="fas fa-heart text-3xl text-white"></i>
                    <span class="text-white text-sm font-bold" id="reelLikeCount-${reel.id}">${reel.likes_count || 0}</span>
                </button>
                
                <button onclick="showReelComments(${reel.id})" class="reel-action-btn">
                    <i class="fas fa-comment text-3xl text-white"></i>
                    <span class="text-white text-sm font-bold">${reel.comments_count || 0}</span>
                </button>
                
                <button onclick="shareReel(${reel.id})" class="reel-action-btn">
                    <i class="fas fa-share text-3xl text-white"></i>
                </button>
                
                <button onclick="viewProfile(${reel.user_id})" class="reel-action-btn">
                    <i class="fas fa-user text-3xl text-white"></i>
                </button>
            </div>
        </div>
    `;
}

function setupReelsScroll() {
    const container = document.getElementById('reelsScroll');
    const videos = container.querySelectorAll('video');
    
    if (videos.length > 0) {
        videos[0].play();
    }
    
    let currentVideoIndex = 0;
    container.addEventListener('scroll', () => {
        const scrollTop = container.scrollTop;
        const viewportHeight = window.innerHeight;
        const newIndex = Math.round(scrollTop / viewportHeight);
        
        if (newIndex !== currentVideoIndex && videos[newIndex]) {
            if (videos[currentVideoIndex]) {
                videos[currentVideoIndex].pause();
            }
            videos[newIndex].play();
            currentVideoIndex = newIndex;
        }
    });
}

function toggleVideoPlay(index) {
    const video = document.getElementById(`video-${index}`);
    const btn = document.getElementById(`playBtn-${index}`);
    const icon = btn.querySelector('i');
    
    if (video.paused) {
        video.play();
        icon.className = 'fas fa-pause';
    } else {
        video.pause();
        icon.className = 'fas fa-play';
    }
}

async function toggleReelLike(reelId) {
    if (!currentUser) {
        showAuthModal();
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/reels/${reelId}/like`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        const data = await response.json();
        
        if (response.ok) {
            const likeBtn = document.getElementById(`reelLikeBtn-${reelId}`);
            const likeCount = document.getElementById(`reelLikeCount-${reelId}`);
            const icon = likeBtn.querySelector('i');
            
            if (data.liked) {
                icon.classList.add('text-red-500');
                likeCount.textContent = parseInt(likeCount.textContent) + 1;
            } else {
                icon.classList.remove('text-red-500');
                likeCount.textContent = parseInt(likeCount.textContent) - 1;
            }
        } else {
            showNotification(data.error || 'Failed to like reel', 'error');
        }
    } catch (error) {
        console.error('Failed to toggle like:', error);
    }
}

async function showReelComments(reelId) {
    if (!currentUser) {
        showAuthModal();
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/reels/${reelId}/comments`);
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
                                <img src="${comment.profile_image_url ? '/' + comment.profile_image_url : `https://ui-avatars.com/api/?name=${encodeURIComponent(comment.username)}&background=ec4899&color=fff`}" 
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
                    <form onsubmit="submitReelComment(event, ${reelId})" class="flex gap-3">
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
    }
}

async function submitReelComment(e, reelId) {
    e.preventDefault();
    
    const input = document.getElementById('commentInput');
    const comment = input.value.trim();
    
    if (!comment) return;
    
    try {
        const response = await fetch(`${API_BASE}/reels/${reelId}/comment`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ comment_text: comment })
        });
        
        if (response.ok) {
            input.value = '';
            showReelComments(reelId);
            showNotification('Comment added!', 'success');
        }
    } catch (error) {
        console.error('Failed to submit comment:', error);
    }
}

function showCreateReelModal() {
    if (!currentUser) {
        showAuthModal();
        return;
    }
    
    // Check if user is paid lister
    if (currentUser.user_type === 'visitor') {
        showNotification('Only escorts and venues can create reels', 'error');
        return;
    }
    
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4';
    
    modal.innerHTML = `
        <div class="bg-white rounded-3xl max-w-lg w-full p-8">
            <div class="flex justify-between items-center mb-6">
                <h2 class="text-2xl font-bold">Create Reel</h2>
                <button onclick="this.closest('.fixed').remove()" class="text-gray-500 hover:text-gray-700">
                    <i class="fas fa-times text-xl"></i>
                </button>
            </div>
            
            <form onsubmit="submitReel(event)" id="createReelForm">
                <div class="mb-4">
                    <label class="block text-gray-700 font-semibold mb-2">Video * (Max 60 seconds)</label>
                    <input type="file" id="reelVideo" accept="video/*" class="input-field" required onchange="validateReelVideo(this)">
                    <p class="text-sm text-gray-500 mt-1">Maximum duration: 1 minute</p>
                    <div id="videoPreview" class="mt-4 hidden"></div>
                    <div id="videoDuration" class="text-sm text-gray-600 mt-2 hidden"></div>
                </div>
                
                <div class="mb-4">
                    <label class="block text-gray-700 font-semibold mb-2">Caption</label>
                    <textarea id="reelCaption" class="input-field" rows="3" placeholder="Write a caption..." maxlength="500"></textarea>
                    <p class="text-sm text-gray-500 mt-1">Max 500 characters</p>
                </div>
                
                <button type="submit" id="submitReelBtn" class="btn-primary w-full">
                    <i class="fas fa-paper-plane mr-2"></i>Post Reel
                </button>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
}

function validateReelVideo(input) {
    const file = input.files[0];
    if (!file) return;
    
    const preview = document.getElementById('videoPreview');
    const durationDiv = document.getElementById('videoDuration');
    const submitBtn = document.getElementById('submitReelBtn');
    
    const video = document.createElement('video');
    video.preload = 'metadata';
    
    video.onloadedmetadata = function() {
        window.URL.revokeObjectURL(video.src);
        const duration = Math.floor(video.duration);
        
        durationDiv.classList.remove('hidden');
        durationDiv.textContent = `Duration: ${duration} seconds`;
        
        if (duration > 60) {
            durationDiv.classList.add('text-red-500');
            durationDiv.textContent = `Duration: ${duration} seconds - TOO LONG! Maximum is 60 seconds.`;
            submitBtn.disabled = true;
            submitBtn.classList.add('opacity-50', 'cursor-not-allowed');
            showNotification('Video is too long! Maximum duration is 60 seconds (1 minute).', 'error');
            input.value = '';
            preview.classList.add('hidden');
        } else {
            durationDiv.classList.remove('text-red-500');
            durationDiv.classList.add('text-green-500');
            submitBtn.disabled = false;
            submitBtn.classList.remove('opacity-50', 'cursor-not-allowed');
            
            preview.innerHTML = `<video src="${URL.createObjectURL(file)}" class="w-full rounded-lg" controls></video>`;
            preview.classList.remove('hidden');
        }
    };
    
    video.src = URL.createObjectURL(file);
}

async function submitReel(e) {
    e.preventDefault();
    
    const formData = new FormData();
    const video = document.getElementById('reelVideo').files[0];
    const caption = document.getElementById('reelCaption').value;
    
    formData.append('video', video);
    if (caption) formData.append('caption', caption);
    formData.append('duration', 0);
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner animate-spin mr-2"></i>Uploading...';
    
    try {
        const response = await fetch(`${API_BASE}/reels/create`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: formData
        });
        
        const data = await response.json();
        
        if (response.ok) {
            document.querySelector('.fixed').remove();
            showNotification('Reel created successfully!', 'success');
            loadReelsFeed();
        } else {
            if (data.redirect === '/subscription') {
                document.querySelector('.fixed').remove();
                showNotification(data.message, 'error');
                setTimeout(() => {
                    showPage('subscription');
                }, 2000);
            } else {
                showNotification(data.error || 'Failed to create reel', 'error');
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="fas fa-paper-plane mr-2"></i>Post Reel';
            }
        }
    } catch (error) {
        console.error('Failed to create reel:', error);
        showNotification('Failed to create reel', 'error');
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-paper-plane mr-2"></i>Post Reel';
    }
}

function shareReel(reelId) {
    const url = `${window.location.origin}/?reel=${reelId}`;
    
    if (navigator.share) {
        navigator.share({
            title: 'Check out this reel on Coffee',
            url: url
        });
    } else {
        navigator.clipboard.writeText(url);
        showNotification('Link copied to clipboard!', 'success');
    }
}
