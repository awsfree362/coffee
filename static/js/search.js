// Search functionality with full Instagram-style features

class SearchManager {
    constructor() {
        this.searchHistory = [];
        this.currentTab = 'escorts';
        this.currentFilters = {
            verified: false,
            online: false,
            hasPhotos: false,
            hasVideos: false,
            minAge: null,
            maxAge: null,
            ethnicity: '',
            location: '',
            priceRange: '',
            sortBy: 'relevance'
        };
        this.debounceTimer = null;
        this.isFollowing = new Set();
    }

    async init() {
        await this.loadSearchHistory();
        await this.loadFollowingStatus();
        this.setupEventListeners();
    }

    setupEventListeners() {
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => this.handleSearchInput(e));
            searchInput.addEventListener('focus', () => this.showSearchOverlay());
        }

        document.addEventListener('click', (e) => {
            if (!e.target.closest('.search-container')) {
                this.hideSearchOverlay();
            }
        });
    }

    handleSearchInput(e) {
        const query = e.target.value.trim();
        
        clearTimeout(this.debounceTimer);
        
        if (query.length === 0) {
            this.showDefaultSearch();
            return;
        }

        this.debounceTimer = setTimeout(async () => {
            if (query.length >= 1) {
                await this.performSearch(query);
                this.showAutocomplete(query);
            }
        }, 300);
    }

    showSearchOverlay() {
        const overlay = document.getElementById('searchOverlay');
        if (overlay) {
            overlay.classList.remove('hidden');
        }
    }

    hideSearchOverlay() {
        const overlay = document.getElementById('searchOverlay');
        if (overlay) {
            overlay.classList.add('hidden');
        }
    }

    async loadSearchHistory() {
        try {
            const response = await fetch('/api/search/history', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            if (response.ok) {
                this.searchHistory = await response.json();
            }
        } catch (error) {
            console.error('Error loading search history:', error);
        }
    }

    async loadFollowingStatus() {
        try {
            const response = await fetch('/api/follows/following', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            if (response.ok) {
                const following = await response.json();
                this.isFollowing = new Set(following.map(u => u.id));
            }
        } catch (error) {
            console.error('Error loading following status:', error);
        }
    }

    async performSearch(query) {
        const params = new URLSearchParams({
            q: query,
            type: this.currentTab,
            ...this.getActiveFilters()
        });

        try {
            const response = await fetch(`/api/search?${params}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });

            if (response.ok) {
                const results = await response.json();
                this.displayResults(results);
                await this.saveSearch(query);
            }
        } catch (error) {
            console.error('Search error:', error);
        }
    }

    getActiveFilters() {
        const filters = {};
        if (this.currentFilters.verified) filters.verified = '1';
        if (this.currentFilters.online) filters.online = '1';
        if (this.currentFilters.hasPhotos) filters.has_photos = '1';
        if (this.currentFilters.hasVideos) filters.has_videos = '1';
        if (this.currentFilters.minAge) filters.min_age = this.currentFilters.minAge;
        if (this.currentFilters.maxAge) filters.max_age = this.currentFilters.maxAge;
        if (this.currentFilters.ethnicity) filters.ethnicity = this.currentFilters.ethnicity;
        if (this.currentFilters.location) filters.location = this.currentFilters.location;
        if (this.currentFilters.priceRange) filters.price_range = this.currentFilters.priceRange;
        if (this.currentFilters.sortBy) filters.sort = this.currentFilters.sortBy;
        return filters;
    }

    displayResults(results) {
        const container = document.getElementById('searchResultsContainer');
        if (!container) return;

        if (results.length === 0) {
            container.innerHTML = `
                <div class="text-center py-12">
                    <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                    </svg>
                    <p class="mt-4 text-gray-500">No results found</p>
                    <p class="text-sm text-gray-400">Try different keywords or filters</p>
                </div>
            `;
            return;
        }

        container.innerHTML = results.map(user => this.renderUserCard(user)).join('');
    }

    renderUserCard(user) {
        const isFollowing = this.isFollowing.has(user.id);
        const imageUrl = user.profile_image ? `/uploads/profiles/${user.profile_image}` : '/static/images/default-avatar.png';
        
        return `
            <div class="flex items-center justify-between p-4 hover:bg-gray-50 transition cursor-pointer border-b border-gray-100" data-user-id="${user.id}">
                <div class="flex items-center space-x-3 flex-1" onclick="window.searchManager.viewProfile(${user.id})">
                    <div class="relative">
                        <img src="${imageUrl}" alt="${user.full_name}" class="w-12 h-12 rounded-full object-cover ${user.is_online ? 'ring-2 ring-green-500' : ''}">
                        ${user.is_online ? '<span class="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></span>' : ''}
                    </div>
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center space-x-1">
                            <p class="font-semibold text-gray-900 truncate">@${user.username}</p>
                            ${user.is_verified ? '<svg class="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>' : ''}
                        </div>
                        <p class="text-sm text-gray-600 truncate">${user.full_name}</p>
                        ${user.bio ? `<p class="text-sm text-gray-500 truncate">${user.bio}</p>` : ''}
                        ${user.location ? `<p class="text-xs text-gray-400"><svg class="inline w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd"/></svg> ${user.location}</p>` : ''}
                        ${user.view_count ? `<p class="text-xs text-gray-400">${user.view_count} profile views</p>` : ''}
                    </div>
                </div>
                <button 
                    onclick="event.stopPropagation(); window.searchManager.toggleFollow(${user.id})"
                    class="px-4 py-1.5 rounded-lg font-semibold text-sm transition ${isFollowing ? 'bg-gray-200 text-gray-800 hover:bg-gray-300' : 'bg-pink-500 text-white hover:bg-pink-600'}"
                    data-follow-btn="${user.id}">
                    ${isFollowing ? 'Following' : 'Follow'}
                </button>
            </div>
        `;
    }

    async showDefaultSearch() {
        const container = document.getElementById('searchResultsContainer');
        if (!container) return;

        // Load recent searches, suggested users, and trending
        const [recentSearches, suggested, trending] = await Promise.all([
            this.getRecentSearches(),
            this.getSuggestedUsers(),
            this.getTrending()
        ]);

        container.innerHTML = `
            ${recentSearches.length > 0 ? `
                <div class="mb-6">
                    <div class="flex items-center justify-between px-4 py-2">
                        <h3 class="font-semibold text-gray-900">Recent</h3>
                        <button onclick="window.searchManager.clearHistory()" class="text-sm text-pink-500 hover:text-pink-600 font-semibold">Clear all</button>
                    </div>
                    ${recentSearches.map(search => `
                        <div class="flex items-center justify-between px-4 py-3 hover:bg-gray-50 cursor-pointer">
                            <div class="flex items-center space-x-3 flex-1" onclick="window.searchManager.searchFromHistory('${search.query}')">
                                <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                </svg>
                                <span class="text-gray-700">${search.query}</span>
                            </div>
                            <button onclick="event.stopPropagation(); window.searchManager.removeFromHistory(${search.id})" class="text-gray-400 hover:text-gray-600">
                                <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                    <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>
                                </svg>
                            </button>
                        </div>
                    `).join('')}
                </div>
            ` : ''}

            ${trending.length > 0 ? `
                <div class="mb-6">
                    <h3 class="font-semibold text-gray-900 px-4 py-2">Trending</h3>
                    ${trending.map(item => `
                        <div class="px-4 py-3 hover:bg-gray-50 cursor-pointer" onclick="window.searchManager.searchFromHistory('${item.query}')">
                            <div class="flex items-center space-x-3">
                                <svg class="w-5 h-5 text-pink-500" fill="currentColor" viewBox="0 0 20 20">
                                    <path fill-rule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clip-rule="evenodd"/>
                                </svg>
                                <div class="flex-1">
                                    <p class="font-medium text-gray-900">${item.query}</p>
                                    <p class="text-xs text-gray-500">${item.search_count} searches</p>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            ` : ''}

            ${suggested.length > 0 ? `
                <div>
                    <h3 class="font-semibold text-gray-900 px-4 py-2">Suggested</h3>
                    ${suggested.map(user => this.renderUserCard(user)).join('')}
                </div>
            ` : ''}
        `;
    }

    async getRecentSearches() {
        try {
            const response = await fetch('/api/search/history?limit=5', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            return response.ok ? await response.json() : [];
        } catch (error) {
            return [];
        }
    }

    async getSuggestedUsers() {
        try {
            const response = await fetch(`/api/search/suggested?type=${this.currentTab}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            return response.ok ? await response.json() : [];
        } catch (error) {
            return [];
        }
    }

    async getTrending() {
        try {
            const response = await fetch('/api/search/trending', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            return response.ok ? await response.json() : [];
        } catch (error) {
            return [];
        }
    }

    showAutocomplete(query) {
        // Autocomplete shown in search results
    }

    async saveSearch(query) {
        try {
            await fetch('/api/search/history', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ query })
            });
        } catch (error) {
            console.error('Error saving search:', error);
        }
    }

    async clearHistory() {
        try {
            const response = await fetch('/api/search/history', {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            
            if (response.ok) {
                await this.showDefaultSearch();
            }
        } catch (error) {
            console.error('Error clearing history:', error);
        }
    }

    async removeFromHistory(id) {
        try {
            await fetch(`/api/search/history/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            await this.showDefaultSearch();
        } catch (error) {
            console.error('Error removing from history:', error);
        }
    }

    searchFromHistory(query) {
        document.getElementById('searchInput').value = query;
        this.performSearch(query);
    }

    switchTab(tab) {
        this.currentTab = tab;
        const query = document.getElementById('searchInput').value.trim();
        if (query) {
            this.performSearch(query);
        } else {
            this.showDefaultSearch();
        }
    }

    toggleFilter(filterName) {
        this.currentFilters[filterName] = !this.currentFilters[filterName];
        const query = document.getElementById('searchInput').value.trim();
        if (query) {
            this.performSearch(query);
        }
    }

    setFilter(filterName, value) {
        this.currentFilters[filterName] = value;
        const query = document.getElementById('searchInput').value.trim();
        if (query) {
            this.performSearch(query);
        }
    }

    clearFilters() {
        this.currentFilters = {
            verified: false,
            online: false,
            hasPhotos: false,
            hasVideos: false,
            minAge: null,
            maxAge: null,
            ethnicity: '',
            location: '',
            priceRange: '',
            sortBy: 'relevance'
        };
        const query = document.getElementById('searchInput').value.trim();
        if (query) {
            this.performSearch(query);
        }
    }

    async toggleFollow(userId) {
        const btn = document.querySelector(`[data-follow-btn="${userId}"]`);
        if (!btn) return;

        const isFollowing = this.isFollowing.has(userId);
        const endpoint = isFollowing ? '/api/follows/unfollow' : '/api/follows/follow';

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ user_id: userId })
            });

            if (response.ok) {
                if (isFollowing) {
                    this.isFollowing.delete(userId);
                    btn.textContent = 'Follow';
                    btn.className = 'px-4 py-1.5 rounded-lg font-semibold text-sm transition bg-pink-500 text-white hover:bg-pink-600';
                } else {
                    this.isFollowing.add(userId);
                    btn.textContent = 'Following';
                    btn.className = 'px-4 py-1.5 rounded-lg font-semibold text-sm transition bg-gray-200 text-gray-800 hover:bg-gray-300';
                }
            }
        } catch (error) {
            console.error('Error toggling follow:', error);
        }
    }

    viewProfile(userId) {
        this.hideSearchOverlay();
        window.app.showPage('profile', userId);
        
        // Track profile view
        fetch('/api/search/view', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ viewed_user_id: userId })
        }).catch(console.error);
    }
}

// Initialize search manager
window.searchManager = new SearchManager();

// Initialize on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => window.searchManager.init());
} else {
    window.searchManager.init();
}
