// Subscriptions Module
async function renderSubscriptionPage() {
    const mainContent = document.getElementById('mainContent');
    
    mainContent.innerHTML = `
        <div class="max-w-4xl mx-auto">
            <h1 class="text-3xl font-bold text-center mb-8">Choose Your Plan</h1>
            
            <div id="subscriptionStatus" class="mb-8"></div>
            
            <div class="grid md:grid-cols-3 gap-6" id="plansGrid">
                <div class="text-center py-8"><div class="spinner mx-auto"></div></div>
            </div>
        </div>
    `;
    
    checkSubscriptionStatus();
    loadPlans();
}

async function checkSubscriptionStatus() {
    try {
        const response = await fetch(`${API_BASE}/subscriptions/status`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const data = await response.json();
        
        const container = document.getElementById('subscriptionStatus');
        if (data.subscription && data.subscription.is_active) {
            container.innerHTML = `
                <div class="glass rounded-2xl p-6 text-center">
                    <div class="text-4xl mb-3">✅</div>
                    <h3 class="text-xl font-bold mb-2">Active Subscription</h3>
                    <p class="text-gray-600">Your ${data.subscription.subscription_type} subscription is active</p>
                    <p class="text-sm text-gray-500 mt-2">Expires: ${new Date(data.subscription.end_date).toLocaleDateString()}</p>
                </div>
            `;
        } else {
            container.innerHTML = `
                <div class="bg-yellow-50 border-2 border-yellow-200 rounded-2xl p-6 text-center">
                    <div class="text-4xl mb-3">⚠️</div>
                    <h3 class="text-xl font-bold mb-2">No Active Subscription</h3>
                    <p class="text-gray-600">Subscribe to unlock all features</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Failed to check subscription:', error);
    }
}

async function loadPlans() {
    const plans = [
        { type: 'escort', name: 'Escort', price: 49.99, features: ['Create posts', 'Unlimited messages', 'Profile verification', 'Featured listing'] },
        { type: 'visitor', name: 'Visitor', price: 49.99, features: ['Unlimited likes', 'Unlimited comments', 'Unlimited messages', 'View contact info'] },
        { type: 'venue', name: 'Venue', price: 99.99, features: ['Create events', 'Sell tickets', 'QR verification', 'Analytics dashboard'] }
    ];
    
    const container = document.getElementById('plansGrid');
    container.innerHTML = plans.map(plan => `
        <div class="plan-card ${currentUser && currentUser.user_type === plan.type ? 'featured' : ''}">
            <div class="text-center mb-6">
                <h3 class="text-2xl font-bold mb-2">${plan.name}</h3>
                <div class="text-4xl font-bold text-pink-500 mb-2">R${plan.price}</div>
                <p class="text-gray-600">per month</p>
            </div>
            <ul class="space-y-3 mb-6">
                ${plan.features.map(f => `<li class="flex items-center gap-2"><i class="fas fa-check text-green-500"></i><span>${f}</span></li>`).join('')}
            </ul>
            ${currentUser && currentUser.user_type === plan.type ? `
                <button onclick="showPaymentModal('${plan.type}', ${plan.price})" class="btn-primary w-full">Subscribe Now</button>
            ` : `
                <button disabled class="btn-primary w-full opacity-50">For ${plan.name}s Only</button>
            `}
        </div>
    `).join('');
}

function showPaymentModal(type, amount) {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4';
    
    modal.innerHTML = `
        <div class="bg-white rounded-3xl max-w-md w-full p-8">
            <h2 class="text-2xl font-bold mb-6">Payment Method</h2>
            
            <div class="mb-6">
                <p class="text-gray-600 mb-2">Subscription: <span class="font-bold capitalize">${type}</span></p>
                <p class="text-gray-600">Amount: <span class="font-bold text-2xl text-pink-500">R${amount}</span></p>
            </div>
            
            <div class="space-y-3">
                <button onclick="processPayment('stripe', '${type}', ${amount})" class="w-full p-4 border-2 border-gray-200 rounded-xl hover:border-pink-500 transition flex items-center gap-3">
                    <i class="fab fa-cc-stripe text-3xl text-blue-600"></i>
                    <div class="text-left">
                        <p class="font-bold">Credit/Debit Card</p>
                        <p class="text-sm text-gray-500">Powered by Stripe</p>
                    </div>
                </button>
                
                <button onclick="processPayment('payfast', '${type}', ${amount})" class="w-full p-4 border-2 border-gray-200 rounded-xl hover:border-pink-500 transition flex items-center gap-3">
                    <i class="fas fa-credit-card text-3xl text-green-600"></i>
                    <div class="text-left">
                        <p class="font-bold">PayFast</p>
                        <p class="text-sm text-gray-500">South African payment</p>
                    </div>
                </button>
                
                <button onclick="showManualPayment('${type}', ${amount})" class="w-full p-4 border-2 border-gray-200 rounded-xl hover:border-pink-500 transition flex items-center gap-3">
                    <i class="fas fa-university text-3xl text-purple-600"></i>
                    <div class="text-left">
                        <p class="font-bold">Bank Transfer</p>
                        <p class="text-sm text-gray-500">Manual verification</p>
                    </div>
                </button>
                
                <button onclick="useAffiliateEarnings('${type}', ${amount})" class="w-full p-4 border-2 border-gray-200 rounded-xl hover:border-pink-500 transition flex items-center gap-3">
                    <i class="fas fa-wallet text-3xl text-yellow-600"></i>
                    <div class="text-left">
                        <p class="font-bold">Use Affiliate Earnings</p>
                        <p class="text-sm text-gray-500">Pay with your balance</p>
                    </div>
                </button>
            </div>
            
            <button onclick="this.closest('.fixed').remove()" class="btn-secondary w-full mt-6">Cancel</button>
        </div>
    `;
    
    document.body.appendChild(modal);
}

async function processPayment(method, type, amount) {
    showNotification('Processing payment...', 'info');
    // In production, integrate with actual payment gateways
    showNotification('Payment gateway integration required', 'info');
}

function showManualPayment(type, amount) {
    document.querySelector('.fixed').remove();
    
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4';
    
    modal.innerHTML = `
        <div class="bg-white rounded-3xl max-w-md w-full p-8">
            <h2 class="text-2xl font-bold mb-6">Bank Transfer Details</h2>
            
            <div class="bg-gray-50 rounded-xl p-4 mb-6 space-y-2">
                <p><span class="font-bold">Bank:</span> FNB</p>
                <p><span class="font-bold">Account:</span> Coffee Platform</p>
                <p><span class="font-bold">Account No:</span> 62812345678</p>
                <p><span class="font-bold">Branch:</span> 250655</p>
                <p><span class="font-bold">Reference:</span> ${currentUser.username}-SUB</p>
                <p class="text-2xl font-bold text-pink-500 mt-4">Amount: R${amount}</p>
            </div>
            
            <form onsubmit="submitManualPayment(event, '${type}', ${amount})" class="space-y-4">
                <div>
                    <label class="block font-semibold mb-2">Upload Proof of Payment</label>
                    <input type="file" id="paymentProof" class="input-field" accept="image/*,application/pdf" required>
                </div>
                
                <div>
                    <label class="block font-semibold mb-2">Payment Reference</label>
                    <input type="text" id="paymentRef" class="input-field" placeholder="Transaction reference" required>
                </div>
                
                <button type="submit" class="btn-primary w-full">Submit for Verification</button>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
}

async function submitManualPayment(e, type, amount) {
    e.preventDefault();
    
    const formData = new FormData();
    formData.append('subscription_type', type);
    formData.append('amount', amount);
    formData.append('payment_method', 'manual');
    formData.append('payment_reference', document.getElementById('paymentRef').value);
    formData.append('payment_proof', document.getElementById('paymentProof').files[0]);
    
    try {
        const response = await fetch(`${API_BASE}/subscriptions/create`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
            body: formData
        });
        
        const data = await response.json();
        
        if (response.ok) {
            document.querySelector('.fixed').remove();
            showNotification('Payment submitted for verification!', 'success');
            checkSubscriptionStatus();
        } else {
            showNotification(data.error || 'Submission failed', 'error');
        }
    } catch (error) {
        showNotification('Submission failed', 'error');
    }
}

async function useAffiliateEarnings(type, amount) {
    try {
        const response = await fetch(`${API_BASE}/subscriptions/use-affiliate-earnings`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ subscription_type: type, amount })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            document.querySelector('.fixed').remove();
            showNotification('Subscription activated!', 'success');
            checkSubscriptionStatus();
        } else {
            showNotification(data.error || 'Insufficient balance', 'error');
        }
    } catch (error) {
        showNotification('Payment failed', 'error');
    }
}
