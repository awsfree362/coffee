// Affiliates Module
async function renderAffiliatesPage() {
    const mainContent = document.getElementById('mainContent');
    
    mainContent.innerHTML = `
        <div class="max-w-6xl mx-auto">
            <h1 class="text-3xl font-bold mb-8">Affiliate Dashboard</h1>
            
            <!-- Stats Cards -->
            <div class="grid md:grid-cols-4 gap-6 mb-8" id="affiliateStats">
                <div class="text-center py-8"><div class="spinner mx-auto"></div></div>
            </div>
            
            <!-- Affiliate Code -->
            <div class="glass rounded-2xl p-6 mb-8">
                <h2 class="text-xl font-bold mb-4">Your Affiliate Code</h2>
                <div class="flex items-center gap-4">
                    <div class="flex-1 bg-gradient-to-r from-pink-500 to-purple-600 text-white text-2xl font-bold py-4 px-6 rounded-xl text-center">
                        ${currentUser.affiliate_code || 'Loading...'}
                    </div>
                    <button onclick="copyAffiliateCode()" class="btn-primary">
                        <i class="fas fa-copy mr-2"></i>Copy
                    </button>
                    <button onclick="shareAffiliateCode()" class="btn-secondary">
                        <i class="fas fa-share mr-2"></i>Share
                    </button>
                </div>
                <p class="text-gray-600 mt-4 text-center">
                    Share this code and earn 20% commission on all referral subscriptions!
                </p>
            </div>
            
            <!-- Earnings History -->
            <div class="bg-white rounded-2xl shadow-lg p-6">
                <div class="flex justify-between items-center mb-6">
                    <h2 class="text-xl font-bold">Earnings History</h2>
                    <button onclick="requestPayout()" class="btn-primary">
                        <i class="fas fa-money-bill-wave mr-2"></i>Request Payout
                    </button>
                </div>
                
                <div id="earningsTable">
                    <div class="text-center py-8"><div class="spinner mx-auto"></div></div>
                </div>
            </div>
        </div>
    `;
    
    loadAffiliateStats();
    loadEarningsHistory();
}

async function loadAffiliateStats() {
    try {
        const response = await fetch(`${API_BASE}/affiliates/stats`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const data = await response.json();
        
        const container = document.getElementById('affiliateStats');
        container.innerHTML = `
            <div class="stats-card">
                <div class="text-3xl mb-2">👥</div>
                <p class="text-sm opacity-90">Total Referrals</p>
                <p class="text-3xl font-bold">${data.total_referrals || 0}</p>
            </div>
            
            <div class="stats-card">
                <div class="text-3xl mb-2">💰</div>
                <p class="text-sm opacity-90">Total Earned</p>
                <p class="text-3xl font-bold">${formatCurrency(data.total_earned || 0)}</p>
            </div>
            
            <div class="stats-card">
                <div class="text-3xl mb-2">💵</div>
                <p class="text-sm opacity-90">Available Balance</p>
                <p class="text-3xl font-bold">${formatCurrency(data.available_balance || 0)}</p>
            </div>
            
            <div class="stats-card">
                <div class="text-3xl mb-2">📊</div>
                <p class="text-sm opacity-90">This Month</p>
                <p class="text-3xl font-bold">${formatCurrency(data.month_earnings || 0)}</p>
            </div>
        `;
    } catch (error) {
        console.error('Failed to load stats:', error);
    }
}

async function loadEarningsHistory() {
    try {
        const response = await fetch(`${API_BASE}/affiliates/earnings`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const data = await response.json();
        
        const container = document.getElementById('earningsTable');
        if (data.earnings && data.earnings.length > 0) {
            container.innerHTML = `
                <div class="overflow-x-auto">
                    <table class="w-full">
                        <thead class="bg-gray-50">
                            <tr>
                                <th class="px-4 py-3 text-left">Date</th>
                                <th class="px-4 py-3 text-left">Referral</th>
                                <th class="px-4 py-3 text-left">Type</th>
                                <th class="px-4 py-3 text-right">Commission</th>
                                <th class="px-4 py-3 text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${data.earnings.map(earning => `
                                <tr class="border-t">
                                    <td class="px-4 py-3">${formatDate(earning.created_at)}</td>
                                    <td class="px-4 py-3">${earning.referred_username}</td>
                                    <td class="px-4 py-3 capitalize">${earning.subscription_type}</td>
                                    <td class="px-4 py-3 text-right font-bold text-green-600">${formatCurrency(earning.commission_amount)}</td>
                                    <td class="px-4 py-3 text-center">
                                        ${earning.is_paid ? 
                                            '<span class="badge bg-green-100 text-green-800">Paid</span>' : 
                                            earning.is_used_for_subscription ?
                                            '<span class="badge bg-blue-100 text-blue-800">Used</span>' :
                                            '<span class="badge bg-yellow-100 text-yellow-800">Pending</span>'
                                        }
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        } else {
            container.innerHTML = '<p class="text-gray-500 text-center py-8">No earnings yet. Start referring!</p>';
        }
    } catch (error) {
        console.error('Failed to load earnings:', error);
    }
}

function copyAffiliateCode() {
    navigator.clipboard.writeText(currentUser.affiliate_code);
    showNotification('Affiliate code copied!', 'success');
}

function shareAffiliateCode() {
    const url = `${window.location.origin}/?ref=${currentUser.affiliate_code}`;
    const text = `Join Coffee with my referral code: ${currentUser.affiliate_code}`;
    
    if (navigator.share) {
        navigator.share({ title: 'Join Coffee', text, url });
    } else {
        navigator.clipboard.writeText(url);
        showNotification('Link copied to clipboard!', 'success');
    }
}

async function requestPayout() {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4';
    
    modal.innerHTML = `
        <div class="bg-white rounded-3xl max-w-md w-full p-8">
            <h2 class="text-2xl font-bold mb-6">Request Payout</h2>
            
            <form onsubmit="submitPayoutRequest(event)" class="space-y-4">
                <div>
                    <label class="block font-semibold mb-2">Amount (Min R100)</label>
                    <input type="number" id="payoutAmount" class="input-field" min="100" step="0.01" required>
                </div>
                
                <div>
                    <label class="block font-semibold mb-2">Payment Method</label>
                    <select id="payoutMethod" class="input-field" required>
                        <option value="">Select method</option>
                        <option value="bank">Bank Transfer</option>
                        <option value="paypal">PayPal</option>
                    </select>
                </div>
                
                <div id="bankDetails" class="hidden space-y-3">
                    <input type="text" id="bankName" class="input-field" placeholder="Bank Name">
                    <input type="text" id="accountNumber" class="input-field" placeholder="Account Number">
                    <input type="text" id="accountHolder" class="input-field" placeholder="Account Holder">
                </div>
                
                <div id="paypalDetails" class="hidden">
                    <input type="email" id="paypalEmail" class="input-field" placeholder="PayPal Email">
                </div>
                
                <button type="submit" class="btn-primary w-full">Submit Request</button>
                <button type="button" onclick="this.closest('.fixed').remove()" class="btn-secondary w-full">Cancel</button>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    document.getElementById('payoutMethod').onchange = function() {
        document.getElementById('bankDetails').classList.toggle('hidden', this.value !== 'bank');
        document.getElementById('paypalDetails').classList.toggle('hidden', this.value !== 'paypal');
    };
}

async function submitPayoutRequest(e) {
    e.preventDefault();
    
    const amount = document.getElementById('payoutAmount').value;
    const method = document.getElementById('payoutMethod').value;
    
    const data = { amount, method };
    
    if (method === 'bank') {
        data.bank_name = document.getElementById('bankName').value;
        data.account_number = document.getElementById('accountNumber').value;
        data.account_holder = document.getElementById('accountHolder').value;
    } else if (method === 'paypal') {
        data.paypal_email = document.getElementById('paypalEmail').value;
    }
    
    try {
        const response = await fetch(`${API_BASE}/affiliates/request-payout`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (response.ok) {
            document.querySelector('.fixed').remove();
            showNotification('Payout request submitted!', 'success');
            loadAffiliateStats();
            loadEarningsHistory();
        } else {
            showNotification(result.error || 'Request failed', 'error');
        }
    } catch (error) {
        showNotification('Request failed', 'error');
    }
}
