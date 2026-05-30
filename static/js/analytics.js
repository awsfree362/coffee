// Advanced Analytics Dashboard

async function loadAnalyticsDashboard() {
    if (!authToken) {
        showAuthModal();
        return;
    }
    
    const mainContent = document.getElementById('mainContent');
    mainContent.innerHTML = `
        <div class="max-w-7xl mx-auto">
            <div class="mb-8">
                <h2 class="text-3xl font-bold gradient-text mb-2">Analytics Dashboard</h2>
                <p class="text-gray-600">Track your performance and insights</p>
            </div>
            
            <!-- Key Metrics -->
            <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div class="bg-white rounded-2xl shadow-lg p-6">
                    <div class="flex items-center justify-between mb-4">
                        <div class="w-12 h-12 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center">
                            <i class="fas fa-eye text-white text-xl"></i>
                        </div>
                        <span class="text-sm text-green-600 font-semibold">+12%</span>
                    </div>
                    <p class="text-gray-600 text-sm mb-1">Profile Views</p>
                    <p class="text-3xl font-bold text-gray-800" id="profileViews">-</p>
                </div>
                
                <div class="bg-white rounded-2xl shadow-lg p-6">
                    <div class="flex items-center justify-between mb-4">
                        <div class="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center">
                            <i class="fas fa-heart text-white text-xl"></i>
                        </div>
                        <span class="text-sm text-green-600 font-semibold">+8%</span>
                    </div>
                    <p class="text-gray-600 text-sm mb-1">Total Likes</p>
                    <p class="text-3xl font-bold text-gray-800" id="totalLikes">-</p>
                </div>
                
                <div class="bg-white rounded-2xl shadow-lg p-6">
                    <div class="flex items-center justify-between mb-4">
                        <div class="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-500 to-orange-600 flex items-center justify-center">
                            <i class="fas fa-dollar-sign text-white text-xl"></i>
                        </div>
                        <span class="text-sm text-green-600 font-semibold">+15%</span>
                    </div>
                    <p class="text-gray-600 text-sm mb-1">Earnings</p>
                    <p class="text-3xl font-bold text-gray-800" id="totalEarnings">-</p>
                </div>
                
                <div class="bg-white rounded-2xl shadow-lg p-6">
                    <div class="flex items-center justify-between mb-4">
                        <div class="w-12 h-12 rounded-full bg-gradient-to-br from-green-500 to-teal-600 flex items-center justify-center">
                            <i class="fas fa-chart-line text-white text-xl"></i>
                        </div>
                        <span class="text-sm text-green-600 font-semibold">+20%</span>
                    </div>
                    <p class="text-gray-600 text-sm mb-1">Engagement Rate</p>
                    <p class="text-3xl font-bold text-gray-800" id="engagementRate">-</p>
                </div>
            </div>
            
            <!-- Charts Row -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <div class="bg-white rounded-2xl shadow-lg p-6">
                    <h3 class="text-xl font-bold text-gray-800 mb-4">Profile Views (30 Days)</h3>
                    <canvas id="viewsChart" height="200"></canvas>
                </div>
                
                <div class="bg-white rounded-2xl shadow-lg p-6">
                    <h3 class="text-xl font-bold text-gray-800 mb-4">Post Performance</h3>
                    <canvas id="performanceChart" height="200"></canvas>
                </div>
            </div>
            
            <!-- Top Posts -->
            <div class="bg-white rounded-2xl shadow-lg p-6 mb-8">
                <h3 class="text-xl font-bold text-gray-800 mb-4">Top Performing Posts</h3>
                <div id="topPosts" class="space-y-4">
                    <div class="spinner mx-auto"></div>
                </div>
            </div>
            
            <!-- Recommendations -->
            <div class="bg-gradient-to-br from-pink-100 to-purple-100 rounded-2xl p-6">
                <h3 class="text-xl font-bold text-gray-800 mb-4">
                    <i class="fas fa-lightbulb text-yellow-500"></i> AI Recommendations
                </h3>
                <div id="recommendations" class="space-y-3">
                    <div class="spinner mx-auto"></div>
                </div>
            </div>
        </div>
    `;
    
    loadAnalyticsData();
}

async function loadAnalyticsData() {
    try {
        const data = await apiRequest('/analytics/dashboard');
        
        // Update key metrics
        document.getElementById('profileViews').textContent = 
            data.profile_views?.reduce((sum, v) => sum + v.views, 0) || 0;
        document.getElementById('totalLikes').textContent = 
            data.post_stats?.total_likes || 0;
        document.getElementById('totalEarnings').textContent = 
            `R${data.affiliate_stats?.total_earned?.toFixed(2) || '0.00'}`;
        document.getElementById('engagementRate').textContent = 
            `${data.post_stats?.engagement_rate || 0}%`;
        
        // Render top posts
        renderTopPosts(data.top_posts || []);
        
        // Render recommendations
        renderRecommendations(data.recommendations || []);
        
        // Initialize charts (would use Chart.js in production)
        initializeCharts(data);
        
    } catch (error) {
        showToast('Failed to load analytics', 'error');
    }
}

function renderTopPosts(posts) {
    const container = document.getElementById('topPosts');
    
    if (posts.length === 0) {
        container.innerHTML = '<p class="text-gray-500 text-center">No posts yet</p>';
        return;
    }
    
    container.innerHTML = posts.map(post => `
        <div class="flex items-center gap-4 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition">
            <div class="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0">
                ${post.media_type === 'video' ?
                    `<video src="/${post.media_url}" class="w-full h-full object-cover"></video>` :
                    `<img src="/${post.media_url}" class="w-full h-full object-cover">`
                }
            </div>
            <div class="flex-1">
                <p class="text-gray-800 font-semibold line-clamp-2">${post.caption || 'No caption'}</p>
                <div class="flex items-center gap-4 mt-2 text-sm text-gray-600">
                    <span><i class="fas fa-eye"></i> ${post.views_count}</span>
                    <span><i class="fas fa-heart"></i> ${post.likes_count}</span>
                    <span><i class="fas fa-comment"></i> ${post.comments_count}</span>
                </div>
            </div>
            <button onclick="viewPost(${post.id})" class="btn-secondary">
                View
            </button>
        </div>
    `).join('');
}

function renderRecommendations(recommendations) {
    const container = document.getElementById('recommendations');
    
    if (recommendations.length === 0) {
        container.innerHTML = '<p class="text-gray-600">No recommendations at this time</p>';
        return;
    }
    
    container.innerHTML = recommendations.map(rec => `
        <div class="bg-white rounded-xl p-4 flex items-start gap-3">
            <div class="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0
                        ${rec.priority === 'high' ? 'bg-red-100 text-red-600' : 
                          rec.priority === 'medium' ? 'bg-yellow-100 text-yellow-600' : 
                          'bg-blue-100 text-blue-600'}">
                <i class="fas fa-${rec.type === 'content' ? 'image' : 
                                   rec.type === 'engagement' ? 'users' : 'chart-line'}"></i>
            </div>
            <div class="flex-1">
                <p class="text-gray-800 font-semibold">${rec.type.charAt(0).toUpperCase() + rec.type.slice(1)}</p>
                <p class="text-gray-600 text-sm">${rec.message}</p>
            </div>
        </div>
    `).join('');
}

function initializeCharts(data) {
    // In production, use Chart.js or similar
    // For now, just placeholder
    console.log('Charts would be rendered here with:', data);
}

// Real-time stats updater
function startRealTimeUpdates() {
    setInterval(async () => {
        try {
            const data = await apiRequest('/analytics/real-time');
            // Update real-time metrics
            console.log('Real-time update:', data);
        } catch (error) {
            console.error('Real-time update failed:', error);
        }
    }, 30000); // Update every 30 seconds
}

// Export analytics
async function exportAnalytics() {
    try {
        const data = await apiRequest('/analytics/export', 'POST', {
            format: 'json',
            date_range: 30
        });
        
        showToast('Export ready! Download will start shortly.', 'success');
        
        // In production, trigger download
        console.log('Export key:', data.download_key);
        
    } catch (error) {
        showToast('Export failed', 'error');
    }
}

// Initialize real-time updates when analytics page is loaded
if (authToken) {
    startRealTimeUpdates();
}
