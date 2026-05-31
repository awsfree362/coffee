// Authentication Module
let authMode = 'login';

function showAuthModal() {
    const modal = document.getElementById('authModal');
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden'; // Prevent background scrolling
    switchAuthMode('login');
}

function closeAuthModal() {
    const modal = document.getElementById('authModal');
    modal.classList.add('hidden');
    document.body.style.overflow = ''; // Restore scrolling
}

function switchAuthMode(mode) {
    authMode = mode;
    const loginTab = document.getElementById('loginTab');
    const registerTab = document.getElementById('registerTab');
    const modalTitle = document.getElementById('authModalTitle');
    
    if (mode === 'login') {
        loginTab.className = 'flex-1 py-2 rounded-lg font-semibold bg-gradient-to-r from-pink-500 to-purple-600 text-white';
        registerTab.className = 'flex-1 py-2 rounded-lg font-semibold bg-gray-100 text-gray-700';
        modalTitle.textContent = 'Sign In';
        renderLoginForm();
    } else {
        registerTab.className = 'flex-1 py-2 rounded-lg font-semibold bg-gradient-to-r from-pink-500 to-purple-600 text-white';
        loginTab.className = 'flex-1 py-2 rounded-lg font-semibold bg-gray-100 text-gray-700';
        modalTitle.textContent = 'Create Account';
        renderRegisterForm();
    }
}

function renderLoginForm() {
    const form = document.getElementById('authForm');
    form.innerHTML = `
        <div>
            <label class="block text-gray-700 font-semibold mb-2">Email</label>
            <input type="email" id="loginEmail" class="input-field" placeholder="your@email.com" required>
        </div>
        
        <div>
            <label class="block text-gray-700 font-semibold mb-2">Password</label>
            <input type="password" id="loginPassword" class="input-field" placeholder="••••••••" required>
        </div>
        
        <button type="submit" class="btn-primary w-full">
            <i class="fas fa-sign-in-alt mr-2"></i>Sign In
        </button>
        
        <p class="text-center text-gray-600 text-sm">
            Don't have an account? 
            <button type="button" onclick="switchAuthMode('register')" class="text-pink-500 font-semibold">
                Register here
            </button>
        </p>
    `;
    
    form.onsubmit = handleLogin;
}

function renderRegisterForm() {
    const form = document.getElementById('authForm');
    form.innerHTML = `
        <div class="text-center mb-6">
            <p class="text-gray-600 mb-6">Choose how you want to join Coffee:</p>
            <div class="grid grid-cols-2 gap-4">
                <button type="button" onclick="showVisitorSignup()" class="p-6 border-2 border-gray-200 rounded-xl hover:border-pink-500 hover:bg-pink-50 transition">
                    <i class="fas fa-user text-4xl text-pink-500 mb-3"></i>
                    <p class="font-bold text-lg mb-1">Sign Up</p>
                    <p class="text-sm text-gray-500">Browse & Connect</p>
                    <p class="text-xs text-gray-400 mt-2">Free with limits</p>
                </button>
                <button type="button" onclick="showListerJoin()" class="p-6 border-2 border-gray-200 rounded-xl hover:border-purple-500 hover:bg-purple-50 transition">
                    <i class="fas fa-star text-4xl text-purple-500 mb-3"></i>
                    <p class="font-bold text-lg mb-1">Join as Lister</p>
                    <p class="text-sm text-gray-500">Escort or Venue</p>
                    <p class="text-xs text-gray-400 mt-2">Paid subscription</p>
                </button>
            </div>
        </div>
        
        <p class="text-center text-gray-600 text-sm mt-6">
            Already have an account? 
            <button type="button" onclick="switchAuthMode('login')" class="text-pink-500 font-semibold">
                Sign in here
            </button>
        </p>
    `;
}

function showVisitorSignup() {
    const form = document.getElementById('authForm');
    const modalTitle = document.getElementById('authModalTitle');
    modalTitle.textContent = 'Sign Up as Visitor';
    
    form.innerHTML = `
        <div class="mb-4">
            <button type="button" onclick="renderRegisterForm(); document.getElementById('authModalTitle').textContent='Create Account';" class="text-gray-500 hover:text-gray-700 flex items-center gap-2">
                <i class="fas fa-arrow-left"></i>
                <span>Back to options</span>
            </button>
        </div>
        
        <div class="space-y-4">
            <div class="grid md:grid-cols-2 gap-4">
                <div>
                    <label class="block text-gray-700 font-semibold mb-2">Username *</label>
                    <input type="text" id="regUsername" class="input-field" placeholder="username" required>
                </div>
                
                <div>
                    <label class="block text-gray-700 font-semibold mb-2">Full Name *</label>
                    <input type="text" id="regFullName" class="input-field" placeholder="John Doe" required>
                </div>
            </div>
            
            <div>
                <label class="block text-gray-700 font-semibold mb-2">Email *</label>
                <input type="email" id="regEmail" class="input-field" placeholder="your@email.com" required>
            </div>
            
            <div>
                <label class="block text-gray-700 font-semibold mb-2">Password *</label>
                <input type="password" id="regPassword" class="input-field" placeholder="••••••••" required minlength="6">
            </div>
            
            <div>
                <label class="block text-gray-700 font-semibold mb-2">Date of Birth * (Must be 18+)</label>
                <input type="date" id="regDOB" class="input-field" required max="${getMaxDate()}">
            </div>
            
            <div>
                <label class="block text-gray-700 font-semibold mb-2">City</label>
                <select id="regCity" class="input-field">
                    <option value="">Select City</option>
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
            </div>
            
            <input type="hidden" id="regUserType" value="visitor">
            
            <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p class="text-sm text-blue-800 font-semibold mb-2">Free Tier Includes:</p>
                <ul class="text-xs text-blue-700 space-y-1">
                    <li>✓ Browse all profiles</li>
                    <li>✓ 10 likes per month</li>
                    <li>✓ 10 comments per month</li>
                    <li>✓ 5 messages per month</li>
                    <li>✓ Upgrade anytime for R49.99/month</li>
                </ul>
            </div>
            
            <div class="flex items-start gap-2">
                <input type="checkbox" id="regTerms" class="mt-1" required>
                <label for="regTerms" class="text-sm text-gray-600">
                    I agree to the Terms of Service and Privacy Policy. I confirm I am 18 years or older.
                </label>
            </div>
            
            <button type="submit" class="btn-primary w-full">
                <i class="fas fa-user-plus mr-2"></i>Sign Up Free
            </button>
            
            <p class="text-center text-gray-600 text-sm">
                Already have an account? 
                <button type="button" onclick="switchAuthMode('login')" class="text-pink-500 font-semibold">
                    Sign in here
                </button>
            </p>
        </div>
    `;
    
    form.onsubmit = handleRegister;
}

function showListerJoin() {
    const form = document.getElementById('authForm');
    const modalTitle = document.getElementById('authModalTitle');
    modalTitle.textContent = 'Join as Lister';
    
    form.innerHTML = `
        <div class="mb-4">
            <button type="button" onclick="renderRegisterForm(); document.getElementById('authModalTitle').textContent='Create Account';" class="text-gray-500 hover:text-gray-700 flex items-center gap-2">
                <i class="fas fa-arrow-left"></i>
                <span>Back to options</span>
            </button>
        </div>
        
        <div class="space-y-4">
            <div class="grid md:grid-cols-2 gap-4">
                <div>
                    <label class="block text-gray-700 font-semibold mb-2">Username *</label>
                    <input type="text" id="regUsername" class="input-field" placeholder="username" required>
                </div>
                
                <div>
                    <label class="block text-gray-700 font-semibold mb-2">Full Name *</label>
                    <input type="text" id="regFullName" class="input-field" placeholder="John Doe" required>
                </div>
            </div>
            
            <div>
                <label class="block text-gray-700 font-semibold mb-2">Email *</label>
                <input type="email" id="regEmail" class="input-field" placeholder="your@email.com" required>
            </div>
            
            <div>
                <label class="block text-gray-700 font-semibold mb-2">Password *</label>
                <input type="password" id="regPassword" class="input-field" placeholder="••••••••" required minlength="6">
            </div>
            
            <div>
                <label class="block text-gray-700 font-semibold mb-2">Lister Type *</label>
                <select id="regUserType" class="input-field" required onchange="toggleUserTypeFields()">
                    <option value="">Select Type</option>
                    <option value="escort">Escort - R49.99/month</option>
                    <option value="venue">Venue - R99.99/month</option>
                </select>
            </div>
            
            <div>
                <label class="block text-gray-700 font-semibold mb-2">Date of Birth * (Must be 18+)</label>
                <input type="date" id="regDOB" class="input-field" required max="${getMaxDate()}">
            </div>
            
            <div>
                <label class="block text-gray-700 font-semibold mb-2">Phone</label>
                <input type="tel" id="regPhone" class="input-field" placeholder="+27 123 456 789">
            </div>
            
            <div>
                <label class="block text-gray-700 font-semibold mb-2">City</label>
                <select id="regCity" class="input-field">
                    <option value="">Select City</option>
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
            </div>
            
            <div>
                <label class="block text-gray-700 font-semibold mb-2">Ethnicity</label>
                <select id="regEthnicity" class="input-field">
                    <option value="">Select Ethnicity</option>
                    <option value="African">African</option>
                    <option value="Caucasian">Caucasian</option>
                    <option value="Asian">Asian</option>
                    <option value="Indian">Indian</option>
                    <option value="Coloured">Coloured</option>
                    <option value="Mixed">Mixed</option>
                    <option value="Other">Other</option>
                </select>
            </div>
            
            <div>
                <label class="block text-gray-700 font-semibold mb-2">Bio</label>
                <textarea id="regBio" class="input-field" rows="3" placeholder="Tell us about yourself..."></textarea>
            </div>
            
            <div>
                <label class="block text-gray-700 font-semibold mb-2">Profile Image</label>
                <input type="file" id="regProfileImage" class="input-field" accept="image/*">
            </div>
            
            <div id="escortFields" class="hidden">
                <label class="block text-gray-700 font-semibold mb-2">ID Document * (For Verification)</label>
                <input type="file" id="regIDDocument" class="input-field" accept="image/*,application/pdf">
                <p class="text-xs text-gray-500 mt-1">Required for escort verification</p>
            </div>
            
            <div>
                <label class="block text-gray-700 font-semibold mb-2">Referral Code (Optional)</label>
                <input type="text" id="regReferralCode" class="input-field" placeholder="Enter referral code">
                <p class="text-xs text-gray-500 mt-1">💰 Get 20% commission on referrals!</p>
            </div>
            
            <div class="flex items-start gap-2">
                <input type="checkbox" id="regTerms" class="mt-1" required>
                <label for="regTerms" class="text-sm text-gray-600">
                    I agree to the Terms of Service and Privacy Policy. I confirm I am 18 years or older.
                </label>
            </div>
            
            <button type="submit" class="btn-primary w-full">
                <i class="fas fa-star mr-2"></i>Join as Lister
            </button>
            
            <p class="text-center text-gray-600 text-sm">
                Already have an account? 
                <button type="button" onclick="switchAuthMode('login')" class="text-pink-500 font-semibold">
                    Sign in here
                </button>
            </p>
        </div>
    `;
    
    form.onsubmit = handleRegister;
}

function toggleUserTypeFields() {
    const userType = document.getElementById('regUserType').value;
    const escortFields = document.getElementById('escortFields');
    
    if (userType === 'escort') {
        escortFields.classList.remove('hidden');
        document.getElementById('regIDDocument').required = true;
    } else {
        escortFields.classList.add('hidden');
        document.getElementById('regIDDocument').required = false;
    }
}

function getMaxDate() {
    const date = new Date();
    date.setFullYear(date.getFullYear() - 18);
    return date.toISOString().split('T')[0];
}

async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner animate-spin mr-2"></i>Signing in...';
    
    try {
        const response = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            localStorage.setItem('token', data.access_token);
            currentUser = data.user;
            updateUIForLoggedInUser();
            closeAuthModal();
            showNotification('Welcome back!', 'success');
            showPage('home');
        } else {
            showNotification(data.error || 'Login failed', 'error');
        }
    } catch (error) {
        console.error('Login error:', error);
        showNotification('Login failed. Please try again.', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-sign-in-alt mr-2"></i>Sign In';
    }
}

async function handleRegister(e) {
    e.preventDefault();
    
    // Validate age
    const dob = new Date(document.getElementById('regDOB').value);
    const age = Math.floor((new Date() - dob) / (365.25 * 24 * 60 * 60 * 1000));
    
    if (age < 18) {
        showNotification('You must be 18 years or older to register', 'error');
        return;
    }
    
    const formData = new FormData();
    formData.append('username', document.getElementById('regUsername').value);
    formData.append('email', document.getElementById('regEmail').value);
    formData.append('password', document.getElementById('regPassword').value);
    formData.append('user_type', document.getElementById('regUserType').value);
    formData.append('full_name', document.getElementById('regFullName').value);
    formData.append('date_of_birth', document.getElementById('regDOB').value);
    
    const phone = document.getElementById('regPhone');
    if (phone && phone.value) formData.append('phone', phone.value);
    
    const city = document.getElementById('regCity')?.value;
    if (city) formData.append('city', city);
    
    const ethnicity = document.getElementById('regEthnicity');
    if (ethnicity && ethnicity.value) formData.append('ethnicity', ethnicity.value);
    
    const bio = document.getElementById('regBio');
    if (bio && bio.value) formData.append('bio', bio.value);
    
    const profileImage = document.getElementById('regProfileImage');
    if (profileImage && profileImage.files[0]) formData.append('profile_image', profileImage.files[0]);
    
    const idDocument = document.getElementById('regIDDocument')?.files[0];
    if (idDocument) formData.append('id_document', idDocument);
    
    const referralCode = document.getElementById('regReferralCode').value;
    if (referralCode) formData.append('referral_code', referralCode);
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner animate-spin mr-2"></i>Creating account...';
    
    try {
        const response = await fetch(`${API_BASE}/auth/register`, {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (response.ok) {
            localStorage.setItem('token', data.access_token);
            currentUser = {
                id: data.user_id,
                username: document.getElementById('regUsername').value,
                email: document.getElementById('regEmail').value,
                user_type: document.getElementById('regUserType').value,
                affiliate_code: data.affiliate_code
            };
            updateUIForLoggedInUser();
            closeAuthModal();
            showNotification('Account created successfully!', 'success');
            
            // Show affiliate code
            showAffiliateCodeModal(data.affiliate_code);
        } else {
            showNotification(data.error || 'Registration failed', 'error');
        }
    } catch (error) {
        console.error('Registration error:', error);
        showNotification('Registration failed. Please try again.', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-user-plus mr-2"></i>Create Account';
    }
}

function showAffiliateCodeModal(code) {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4';
    
    modal.innerHTML = `
        <div class="bg-white rounded-3xl p-8 max-w-md w-full text-center">
            <div class="text-6xl mb-4">🎉</div>
            <h2 class="text-2xl font-bold mb-4">Welcome to Coffee!</h2>
            <p class="text-gray-600 mb-4">Your unique affiliate code:</p>
            <div class="bg-gradient-to-r from-pink-500 to-purple-600 text-white text-2xl font-bold py-4 px-6 rounded-xl mb-4">
                ${code}
            </div>
            <p class="text-sm text-gray-600 mb-6">
                Share this code with friends and earn 20% commission on their subscriptions!
            </p>
            <button onclick="this.closest('.fixed').remove(); showPage('subscription')" class="btn-primary w-full">
                Continue to Subscription
            </button>
        </div>
    `;
    
    document.body.appendChild(modal);
}

function logout() {
    localStorage.removeItem('token');
    currentUser = null;
    document.getElementById('authButton').classList.remove('hidden');
    document.getElementById('profileButton').classList.add('hidden');
    showNotification('Logged out successfully', 'success');
    showPage('home');
}
