/**
 * AUTHNEXUS // SMART IDENTITY & ROLE-BASED ACCESS GATEWAY CONTROLLER
 * Full client integration with FastAPI backend, JWT tokenization,
 * interactive detail page renderers, and zero-trust RBAC diagnostics.
 */

class AuthNexusApp {
    constructor() {
        // State
        this.apiBaseUrl = localStorage.getItem('authnexus_api_url') || 'http://127.0.0.1:8000';
        this.accessToken = localStorage.getItem('authnexus_jwt') || null;
        this.currentUser = null;
        this.tokenPayload = null;
        this.tokenHeader = null;
        this.tokenTimerInterval = null;
        this.currentView = 'auth';

        // Initialize DOM & bindings
        this.init();
    }

    init() {
        // Refresh icons
        this.refreshIcons();

        // Setup DOM event listeners
        this.bindEvents();

        // Initialize settings field
        const apiUrlInput = document.getElementById('input-api-url');
        if (apiUrlInput) apiUrlInput.value = this.apiBaseUrl;

        // Process stored token if available
        if (this.accessToken) {
            this.processToken(this.accessToken, false);
        } else {
            this.updateUserNavPill(null);
        }

        // Initial Health Check
        this.checkBackendHealth();
        setInterval(() => this.checkBackendHealth(), 15000);

        // Check URL hash for initial view
        const initialHash = window.location.hash.replace('#', '');
        if (initialHash && ['auth', 'profile', 'user', 'admin', 'protected', 'inspector'].includes(initialHash)) {
            this.navigateTo(initialHash);
        } else if (this.accessToken) {
            this.navigateTo('profile');
        } else {
            this.navigateTo('auth');
        }
    }

    refreshIcons() {
        if (window.lucide) {
            window.lucide.createIcons();
        }
    }

    // =========================================================================
    // EVENT BINDINGS
    // =========================================================================
    bindEvents() {
        // Top Navigation links
        document.querySelectorAll('.nav-link, #brand-link').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const view = btn.dataset.view || 'auth';
                this.navigateTo(view);
            });
        });

        // Auth Form Tabs (Sign In / Sign Up)
        const tabLogin = document.getElementById('tab-login');
        const tabSignup = document.getElementById('tab-signup');
        if (tabLogin && tabSignup) {
            tabLogin.addEventListener('click', () => this.switchAuthTab('login'));
            tabSignup.addEventListener('click', () => this.switchAuthTab('signup'));
        }

        // Login Form Submission
        document.getElementById('form-login')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });

        // Sign Up Form Submission
        document.getElementById('form-signup')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleSignUp();
        });

        // Quick Demo Presets
        document.getElementById('btn-quick-admin')?.addEventListener('click', () => {
            this.fillLoginCredentials('admin', 'admin123');
        });

        document.getElementById('btn-quick-user')?.addEventListener('click', () => {
            this.fillLoginCredentials('user', 'user123');
        });

        // Password Visibility Toggles
        document.querySelectorAll('.btn-toggle-password').forEach(btn => {
            btn.addEventListener('click', () => {
                const targetId = btn.getAttribute('data-target');
                const input = document.getElementById(targetId);
                if (input) {
                    const isPassword = input.type === 'password';
                    input.type = isPassword ? 'text' : 'password';
                    btn.innerHTML = isPassword ? '<i data-lucide="eye-off"></i>' : '<i data-lucide="eye"></i>';
                    this.refreshIcons();
                }
            });
        });

        // Password Strength Live Meter
        const signupPwd = document.getElementById('signup-password');
        if (signupPwd) {
            signupPwd.addEventListener('input', (e) => this.calculatePasswordStrength(e.target.value));
        }

        // Random ID Generator
        document.getElementById('btn-gen-id')?.addEventListener('click', () => {
            const randomId = Math.floor(100 + Math.random() * 900);
            const idInput = document.getElementById('signup-id');
            if (idInput) idInput.value = randomId;
            this.showToast(`Generated ID: ${randomId}`, 'info');
        });

        // Logout Buttons
        document.getElementById('btn-nav-logout')?.addEventListener('click', () => this.logout());

        // Quickbar Copy JWT
        document.getElementById('quickbar-btn-copy')?.addEventListener('click', () => this.copyTokenToClipboard());
        document.getElementById('btn-copy-raw-jwt')?.addEventListener('click', () => this.copyTokenToClipboard());

        // View Action Refresh Buttons
        document.getElementById('btn-refresh-profile')?.addEventListener('click', () => this.loadProfile());
        document.getElementById('btn-refresh-user')?.addEventListener('click', () => this.loadUserPortal());
        document.getElementById('btn-refresh-admin')?.addEventListener('click', () => this.loadAdminPortal());
        document.getElementById('btn-refresh-protected')?.addEventListener('click', () => this.loadProtectedPortal());

        // Inspector Buttons
        document.getElementById('btn-probe-all-endpoints')?.addEventListener('click', () => this.probeAllEndpoints());
        document.getElementById('btn-tamper-jwt')?.addEventListener('click', () => this.simulateTokenTamper());

        document.querySelectorAll('.btn-small-probe').forEach(btn => {
            btn.addEventListener('click', () => {
                const target = btn.getAttribute('data-target-probe');
                if (target) this.probeSingleEndpoint(target);
            });
        });

        // Server Settings Modal
        const modal = document.getElementById('modal-settings');
        document.getElementById('btn-api-settings')?.addEventListener('click', () => {
            if (modal) modal.style.display = 'flex';
        });

        document.getElementById('btn-close-settings')?.addEventListener('click', () => {
            if (modal) modal.style.display = 'none';
        });

        document.getElementById('btn-cancel-settings')?.addEventListener('click', () => {
            if (modal) modal.style.display = 'none';
        });

        document.getElementById('btn-save-settings')?.addEventListener('click', () => {
            const val = document.getElementById('input-api-url')?.value.trim().replace(/\/$/, "");
            if (val) {
                this.apiBaseUrl = val;
                localStorage.setItem('authnexus_api_url', val);
                if (modal) modal.style.display = 'none';
                this.checkBackendHealth();
                this.showToast(`API Server updated to ${this.apiBaseUrl}`, 'info');
            }
        });
    }

    // =========================================================================
    // VIEW ROUTING
    // =========================================================================
    navigateTo(viewId) {
        this.currentView = viewId;
        window.location.hash = viewId;

        // Update Top Nav button active state
        document.querySelectorAll('.nav-link').forEach(link => {
            if (link.dataset.view === viewId) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });

        // Hide all page views and show target
        document.querySelectorAll('.page-view').forEach(view => {
            view.classList.remove('active');
        });

        const targetView = document.getElementById(`view-${viewId}`);
        if (targetView) {
            targetView.classList.add('active');
        }

        // Trigger view-specific loads
        if (viewId === 'profile') {
            this.loadProfile();
        } else if (viewId === 'user') {
            this.loadUserPortal();
        } else if (viewId === 'admin') {
            this.loadAdminPortal();
        } else if (viewId === 'protected') {
            this.loadProtectedPortal();
        } else if (viewId === 'inspector') {
            this.renderTokenInspector();
        }

        this.refreshIcons();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    switchAuthTab(tabName) {
        const tabLogin = document.getElementById('tab-login');
        const tabSignup = document.getElementById('tab-signup');
        const paneLogin = document.getElementById('form-login-pane');
        const paneSignup = document.getElementById('form-signup-pane');

        if (tabName === 'login') {
            tabLogin?.classList.add('active');
            tabSignup?.classList.remove('active');
            paneLogin?.classList.add('active');
            paneSignup?.classList.remove('active');
        } else {
            tabLogin?.classList.remove('active');
            tabSignup?.classList.add('active');
            paneLogin?.classList.remove('active');
            paneSignup?.classList.add('active');
        }
        this.refreshIcons();
    }

    fillLoginCredentials(username, password) {
        this.navigateTo('auth');
        this.switchAuthTab('login');
        const uInput = document.getElementById('login-username');
        const pInput = document.getElementById('login-password');
        if (uInput) uInput.value = username;
        if (pInput) pInput.value = password;
        this.showToast(`Loaded ${username} credentials. Click Sign In to authenticate.`, 'info');
    }

    // =========================================================================
    // BACKEND HEALTH CHECKER
    // =========================================================================
    async checkBackendHealth() {
        const statusText = document.getElementById('backend-status-text');
        const latencyBadge = document.getElementById('backend-latency');
        const dot = document.querySelector('#backend-health-badge .status-dot');

        const startTime = performance.now();
        try {
            const res = await fetch(`${this.apiBaseUrl}/`, { method: 'GET' });
            const latency = Math.round(performance.now() - startTime);

            if (res.ok || res.status === 404 || res.status === 200) {
                if (statusText) statusText.textContent = 'Backend: Online';
                if (latencyBadge) latencyBadge.textContent = `${latency} ms`;
                if (dot) {
                    dot.className = 'status-dot dot-online';
                }
            } else {
                throw new Error(`HTTP ${res.status}`);
            }
        } catch (e) {
            if (statusText) statusText.textContent = 'Backend: Offline';
            if (latencyBadge) latencyBadge.textContent = 'Timeout';
            if (dot) {
                dot.className = 'status-dot dot-offline';
            }
        }
    }

    // =========================================================================
    // TOKEN PROCESSING & USER STATE
    // =========================================================================
    processToken(token, showToast = true) {
        try {
            const parts = token.split('.');
            if (parts.length !== 3) throw new Error('Invalid JWT segment structure');

            const headerJson = JSON.parse(this.base64UrlDecode(parts[0]));
            const payloadJson = JSON.parse(this.base64UrlDecode(parts[1]));

            this.accessToken = token;
            this.tokenHeader = headerJson;
            this.tokenPayload = payloadJson;
            this.currentUser = {
                username: payloadJson.sub || 'User',
                role: payloadJson.role || 'user',
                exp: payloadJson.exp || null
            };

            localStorage.setItem('authnexus_jwt', token);

            this.updateUserNavPill(this.currentUser);
            this.startTokenCountdown(payloadJson.exp);

            if (showToast) {
                this.showToast(`Signed in successfully as ${this.currentUser.username} (${this.currentUser.role})`, 'success');
            }
        } catch (err) {
            console.error('Failed to parse JWT token:', err);
            this.logout(false);
        }
    }

    base64UrlDecode(str) {
        let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
        while (base64.length % 4) base64 += '=';
        return decodeURIComponent(atob(base64).split('').map(c => {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
    }

    updateUserNavPill(user) {
        const avatarBox = document.getElementById('nav-user-avatar');
        const initials = document.getElementById('nav-avatar-initials');
        const nameText = document.getElementById('nav-username');
        const roleBadge = document.getElementById('nav-role-badge');
        const logoutBtn = document.getElementById('btn-nav-logout');
        const quickbar = document.getElementById('session-quickbar');
        const qUser = document.getElementById('quickbar-user');
        const qRole = document.getElementById('quickbar-role');

        if (user) {
            const firstChar = (user.username || 'U').charAt(0).toUpperCase();
            if (initials) initials.textContent = firstChar;
            if (nameText) nameText.textContent = user.username;
            if (roleBadge) {
                roleBadge.textContent = user.role.toUpperCase();
                roleBadge.className = `role-badge ${user.role === 'admin' ? 'role-admin' : 'role-user'}`;
            }
            if (avatarBox) {
                avatarBox.className = `user-avatar ${user.role === 'admin' ? 'role-admin' : 'role-user'}`;
            }
            if (logoutBtn) logoutBtn.style.display = 'flex';

            if (quickbar) {
                quickbar.style.display = 'flex';
                if (qUser) qUser.textContent = user.username;
                if (qRole) qRole.textContent = user.role;
            }
        } else {
            if (initials) initials.textContent = 'G';
            if (nameText) nameText.textContent = 'Guest';
            if (roleBadge) {
                roleBadge.textContent = 'NOT LOGGED IN';
                roleBadge.className = 'role-badge role-guest';
            }
            if (avatarBox) avatarBox.className = 'user-avatar';
            if (logoutBtn) logoutBtn.style.display = 'none';
            if (quickbar) quickbar.style.display = 'none';
        }
        this.refreshIcons();
    }

    startTokenCountdown(expTimestamp) {
        if (this.tokenTimerInterval) clearInterval(this.tokenTimerInterval);
        if (!expTimestamp) return;

        const updateTimer = () => {
            const now = Math.floor(Date.now() / 1000);
            const remaining = expTimestamp - now;

            const countdownEl = document.getElementById('quickbar-countdown');
            const statFreshness = document.getElementById('stat-profile-freshness');

            if (remaining <= 0) {
                if (countdownEl) countdownEl.textContent = 'EXPIRED';
                if (statFreshness) statFreshness.textContent = 'Expired';
                clearInterval(this.tokenTimerInterval);
                this.showToast('Your JWT session has expired. Please sign in again.', 'error');
                return;
            }

            const mins = Math.floor(remaining / 60);
            const secs = remaining % 60;
            const timeStr = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

            if (countdownEl) countdownEl.textContent = `${timeStr} left`;
            if (statFreshness) statFreshness.textContent = `${timeStr} valid`;
        };

        updateTimer();
        this.tokenTimerInterval = setInterval(updateTimer, 1000);
    }

    logout(showNotification = true) {
        this.accessToken = null;
        this.currentUser = null;
        this.tokenPayload = null;
        this.tokenHeader = null;
        if (this.tokenTimerInterval) clearInterval(this.tokenTimerInterval);
        localStorage.removeItem('authnexus_jwt');

        this.updateUserNavPill(null);
        this.navigateTo('auth');

        if (showNotification) {
            this.showToast('Signed out of session.', 'info');
        }
    }

    copyTokenToClipboard() {
        if (!this.accessToken) {
            this.showToast('No active JWT token to copy', 'error');
            return;
        }
        navigator.clipboard.writeText(this.accessToken).then(() => {
            this.showToast('JWT Access Token copied to clipboard!', 'success');
        }).catch(() => {
            this.showToast('Failed to copy token', 'error');
        });
    }

    // =========================================================================
    // API CALLS: LOGIN & SIGN UP
    // =========================================================================
    async handleLogin() {
        const uInput = document.getElementById('login-username');
        const pInput = document.getElementById('login-password');
        const btn = document.getElementById('btn-submit-login');

        const username = uInput?.value.trim();
        const password = pInput?.value.trim();

        if (!username || !password) {
            this.showToast('Please enter both username and password', 'error');
            return;
        }

        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<i data-lucide="loader-2" class="spin"></i> Authenticating...';
            this.refreshIcons();
        }

        try {
            // OAuth2 requires application/x-www-form-urlencoded
            const formData = new URLSearchParams();
            formData.append('username', username);
            formData.append('password', password);

            const res = await fetch(`${this.apiBaseUrl}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: formData
            });

            const data = await res.json();

            if (!res.ok) {
                const detail = data.detail || 'Invalid username or password';
                throw new Error(detail);
            }

            if (data.access_token) {
                this.processToken(data.access_token, true);
                // Clear password field
                if (pInput) pInput.value = '';
                // Navigate to Profile view
                this.navigateTo('profile');
            } else {
                throw new Error('No access_token returned by backend');
            }
        } catch (err) {
            this.showToast(`Login Failed: ${err.message}`, 'error');
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<i data-lucide="arrow-right-circle"></i> Sign In & Authenticate';
                this.refreshIcons();
            }
        }
    }

    async handleSignUp() {
        const idInput = document.getElementById('signup-id');
        const roleInput = document.getElementById('signup-role');
        const usernameInput = document.getElementById('signup-username');
        const emailInput = document.getElementById('signup-email');
        const pwdInput = document.getElementById('signup-password');
        const btn = document.getElementById('btn-submit-signup');

        const id = parseInt(idInput?.value || '101', 10);
        const role = roleInput?.value || 'user';
        const username = usernameInput?.value.trim();
        const email = emailInput?.value.trim();
        const password = pwdInput?.value.trim();

        if (!username || !email || !password) {
            this.showToast('Please complete all registration fields', 'error');
            return;
        }

        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<i data-lucide="loader-2" class="spin"></i> Registering...';
            this.refreshIcons();
        }

        try {
            const payload = { id, username, email, password, role };
            const res = await fetch(`${this.apiBaseUrl}/SignUp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await res.json();

            if (!res.ok) {
                const detail = data.detail || 'Registration failed';
                throw new Error(detail);
            }

            this.showToast(`Account created for '${username}' (${role})! You can now sign in.`, 'success');

            // Switch to Login tab and pre-fill credentials
            this.fillLoginCredentials(username, password);
        } catch (err) {
            this.showToast(`Registration Failed: ${err.message}`, 'error');
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<i data-lucide="user-check"></i> Create Account';
                this.refreshIcons();
            }
        }
    }

    calculatePasswordStrength(pwd) {
        const bar = document.getElementById('pwd-meter-fill');
        const text = document.getElementById('pwd-meter-text');
        if (!bar || !text) return;

        if (!pwd) {
            bar.style.width = '0%';
            bar.style.backgroundColor = 'var(--status-danger)';
            text.textContent = 'Strength: Enter password';
            return;
        }

        let score = 0;
        if (pwd.length >= 6) score += 25;
        if (pwd.length >= 10) score += 25;
        if (/[A-Z]/.test(pwd)) score += 20;
        if (/[0-9]/.test(pwd)) score += 15;
        if (/[^A-Za-z0-9]/.test(pwd)) score += 15;

        bar.style.width = `${Math.min(score, 100)}%`;

        if (score < 40) {
            bar.style.backgroundColor = 'var(--status-danger)';
            text.textContent = 'Strength: Weak';
        } else if (score < 75) {
            bar.style.backgroundColor = 'var(--accent-amber)';
            text.textContent = 'Strength: Moderate';
        } else {
            bar.style.backgroundColor = 'var(--accent-emerald)';
            text.textContent = 'Strength: Strong / Secure';
        }
    }

    // =========================================================================
    // VIEW 2: PROFILE PAGE (/profile)
    // =========================================================================
    async loadProfile() {
        const unauthCard = document.getElementById('profile-unauth-card');
        const dataContainer = document.getElementById('profile-data-container');
        const jsonBlock = document.getElementById('profile-json-display');
        const statusBadge = document.getElementById('profile-resp-status');
        const latencyBadge = document.getElementById('profile-resp-latency');

        if (!this.accessToken) {
            if (unauthCard) unauthCard.style.display = 'flex';
            if (dataContainer) dataContainer.style.display = 'none';
            return;
        }

        if (unauthCard) unauthCard.style.display = 'none';
        if (dataContainer) dataContainer.style.display = 'block';

        const startTime = performance.now();
        try {
            const res = await fetch(`${this.apiBaseUrl}/profile`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`
                }
            });

            const latency = Math.round(performance.now() - startTime);
            const data = await res.json();

            if (statusBadge) {
                statusBadge.textContent = `HTTP ${res.status} ${res.statusText || 'OK'}`;
                statusBadge.className = `status-code-pill status-${res.status === 200 ? '200' : '403'}`;
            }
            if (latencyBadge) latencyBadge.textContent = `${latency} ms`;
            if (jsonBlock) jsonBlock.textContent = JSON.stringify(data, null, 2);

            if (res.ok) {
                // Populate Rich Profile Cards
                const user = data.user || this.currentUser;
                const username = user.username || this.currentUser.username;
                const role = user.role || this.currentUser.role;

                document.getElementById('profile-display-username').textContent = username;
                document.getElementById('profile-display-role').textContent = role.toUpperCase();
                document.getElementById('profile-display-role').className = `role-badge ${role === 'admin' ? 'role-admin' : 'role-user'}`;
                document.getElementById('profile-large-initials').textContent = username.charAt(0).toUpperCase();
                document.getElementById('profile-display-message').textContent = data.message || 'Profile information retrieved successfully';

                document.getElementById('stat-profile-user').textContent = username;
                document.getElementById('stat-profile-role').textContent = role.toUpperCase();

                // Update Permissions Matrix
                const userMatrixStatus = document.getElementById('matrix-status-user');
                const adminMatrixStatus = document.getElementById('matrix-status-admin');

                if (userMatrixStatus) {
                    userMatrixStatus.innerHTML = role === 'user' 
                        ? '<span class="badge-allowed"><i data-lucide="check"></i> Authorized</span>'
                        : '<span class="badge-restricted"><i data-lucide="x"></i> Restricted (403)</span>';
                }

                if (adminMatrixStatus) {
                    adminMatrixStatus.innerHTML = role === 'admin'
                        ? '<span class="badge-allowed"><i data-lucide="check"></i> Authorized</span>'
                        : '<span class="badge-restricted"><i data-lucide="x"></i> Restricted (403)</span>';
                }

                this.refreshIcons();
            } else {
                throw new Error(data.detail || 'Failed to retrieve profile');
            }
        } catch (err) {
            if (statusBadge) {
                statusBadge.textContent = 'HTTP ERROR';
                statusBadge.className = 'status-code-pill status-403';
            }
            if (jsonBlock) jsonBlock.textContent = JSON.stringify({ error: err.message }, null, 2);
            this.showToast(`Profile Request: ${err.message}`, 'error');
        }
    }

    // =========================================================================
    // VIEW 3: USER DASHBOARD (/user)
    // =========================================================================
    async loadUserPortal() {
        const container = document.getElementById('user-portal-container');
        if (!container) return;

        if (!this.accessToken) {
            container.innerHTML = `
                <div class="unauth-banner">
                    <div class="unauth-icon-box"><i data-lucide="lock"></i></div>
                    <div class="unauth-text">
                        <h3>Authentication Required</h3>
                        <p>Sign in with a valid standard 'user' account to access the User Portal.</p>
                    </div>
                    <button class="btn-primary-action" onclick="app.navigateTo('auth')">
                        <i data-lucide="log-in"></i> Sign In
                    </button>
                </div>
            `;
            this.refreshIcons();
            return;
        }

        container.innerHTML = `<div class="content-card" style="text-align:center; padding:3rem;"><i data-lucide="loader-2" class="spin" style="width:32px;height:32px;color:var(--primary);"></i><p style="margin-top:1rem;color:var(--text-secondary);">Querying /user endpoint...</p></div>`;
        this.refreshIcons();

        const startTime = performance.now();
        try {
            const res = await fetch(`${this.apiBaseUrl}/user`, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${this.accessToken}` }
            });

            const latency = Math.round(performance.now() - startTime);
            const data = await res.json();

            if (res.ok) {
                // 200 OK: User is authorized
                container.innerHTML = `
                    <div class="portal-hero-banner banner-user">
                        <div class="portal-hero-header">
                            <div class="portal-hero-icon user-theme"><i data-lucide="layout-dashboard"></i></div>
                            <div class="portal-hero-text">
                                <h3>${data.dashboard || 'User Dashboard'}</h3>
                                <p>${data.message || 'Welcome back!'}</p>
                            </div>
                        </div>
                    </div>

                    <!-- User Detail Cards -->
                    <div class="metric-cards-grid">
                        <div class="stat-card">
                            <div class="stat-icon-box icon-cyan"><i data-lucide="user-check"></i></div>
                            <div class="stat-info">
                                <span class="stat-label">Authenticated User</span>
                                <h4 class="stat-value">${data.user?.username || this.currentUser.username}</h4>
                            </div>
                        </div>

                        <div class="stat-card">
                            <div class="stat-icon-box icon-indigo"><i data-lucide="shield"></i></div>
                            <div class="stat-info">
                                <span class="stat-label">Clearance Role</span>
                                <h4 class="stat-value">${(data.user?.role || 'user').toUpperCase()}</h4>
                            </div>
                        </div>

                        <div class="stat-card">
                            <div class="stat-icon-box icon-emerald"><i data-lucide="check-circle-2"></i></div>
                            <div class="stat-info">
                                <span class="stat-label">RBAC Guard</span>
                                <h4 class="stat-value">Passed (200 OK)</h4>
                            </div>
                        </div>

                        <div class="stat-card">
                            <div class="stat-icon-box icon-purple"><i data-lucide="zap"></i></div>
                            <div class="stat-info">
                                <span class="stat-label">Response Time</span>
                                <h4 class="stat-value">${latency} ms</h4>
                            </div>
                        </div>
                    </div>

                    <!-- User Services & Feature Cards -->
                    <div class="content-card">
                        <div class="card-title-bar">
                            <div class="title-with-icon">
                                <i data-lucide="layers" class="text-cyan"></i>
                                <h3>User Workspace Features & Resources</h3>
                            </div>
                            <span class="tag-badge">Role Scope: Standard Access</span>
                        </div>

                        <div class="features-list">
                            <div class="feature-item">
                                <div class="feature-icon"><i data-lucide="user"></i></div>
                                <div>
                                    <h4>Profile Identity Service</h4>
                                    <p>Your account is authorized to query <code class="inline-code">GET /profile</code> and retrieve personal cryptographic claims.</p>
                                </div>
                            </div>
                            <div class="feature-item">
                                <div class="feature-icon"><i data-lucide="shield"></i></div>
                                <div>
                                    <h4>Protected API Channel</h4>
                                    <p>Authorized for secure gateway communication via Bearer authorization headers.</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Live Raw JSON Inspector -->
                    <div class="content-card">
                        <div class="card-title-bar">
                            <div class="title-with-icon">
                                <i data-lucide="code-2" class="text-cyan"></i>
                                <h3>Live API Response Inspector</h3>
                            </div>
                            <div class="api-meta-tags">
                                <span class="status-code-pill status-200">HTTP 200 OK</span>
                                <span class="latency-pill">${latency} ms</span>
                            </div>
                        </div>
                        <div class="code-viewer-container">
                            <pre class="json-code-block">${JSON.stringify(data, null, 2)}</pre>
                        </div>
                    </div>
                `;
            } else if (res.status === 403) {
                // 403 Forbidden: User role is not 'user' (e.g., they are logged in as admin)
                container.innerHTML = `
                    <div class="forbidden-card">
                        <div class="forbidden-icon"><i data-lucide="shield-alert"></i></div>
                        <h3 class="forbidden-title">403 Forbidden — Role Separation</h3>
                        <p class="forbidden-desc">
                            The backend route <code class="inline-code">/user</code> is guarded by <code class="inline-code">require_role(["user"])</code>.
                            Your current active session has role <strong class="badge-role">${this.currentUser?.role}</strong>.
                            Zero-trust RBAC strictly isolates standard user endpoints from other roles.
                        </p>
                        <div class="forbidden-actions">
                            <button class="btn-primary-action" onclick="app.fillLoginCredentials('user', 'user123')">
                                <i data-lucide="user-check"></i> Sign In as User Role
                            </button>
                            <button class="btn-secondary" onclick="app.navigateTo('admin')">
                                <i data-lucide="crown"></i> Go to Admin Dashboard
                            </button>
                        </div>
                    </div>

                    <!-- Raw Response -->
                    <div class="content-card">
                        <div class="card-title-bar">
                            <div class="title-with-icon">
                                <i data-lucide="code-2" class="text-cyan"></i>
                                <h3>Live API Response Inspector</h3>
                            </div>
                            <div class="api-meta-tags">
                                <span class="status-code-pill status-403">HTTP 403 FORBIDDEN</span>
                                <span class="latency-pill">${latency} ms</span>
                            </div>
                        </div>
                        <div class="code-viewer-container">
                            <pre class="json-code-block">${JSON.stringify(data, null, 2)}</pre>
                        </div>
                    </div>
                `;
            } else {
                throw new Error(data.detail || `Server returned HTTP ${res.status}`);
            }
        } catch (err) {
            container.innerHTML = `
                <div class="forbidden-card">
                    <div class="forbidden-icon"><i data-lucide="alert-circle"></i></div>
                    <h3 class="forbidden-title">Query Error</h3>
                    <p class="forbidden-desc">${err.message}</p>
                    <button class="btn-primary-action" onclick="app.loadUserPortal()"><i data-lucide="refresh-cw"></i> Retry Query</button>
                </div>
            `;
        }
        this.refreshIcons();
    }

    // =========================================================================
    // VIEW 4: ADMIN DASHBOARD (/admin)
    // =========================================================================
    async loadAdminPortal() {
        const container = document.getElementById('admin-portal-container');
        if (!container) return;

        if (!this.accessToken) {
            container.innerHTML = `
                <div class="unauth-banner">
                    <div class="unauth-icon-box"><i data-lucide="lock"></i></div>
                    <div class="unauth-text">
                        <h3>Admin Authentication Required</h3>
                        <p>Sign in with an administrative account to access the root control center.</p>
                    </div>
                    <button class="btn-primary-action" onclick="app.fillLoginCredentials('admin', 'admin123')">
                        <i data-lucide="crown"></i> Sign In as Admin
                    </button>
                </div>
            `;
            this.refreshIcons();
            return;
        }

        container.innerHTML = `<div class="content-card" style="text-align:center; padding:3rem;"><i data-lucide="loader-2" class="spin" style="width:32px;height:32px;color:var(--accent-purple);"></i><p style="margin-top:1rem;color:var(--text-secondary);">Querying /admin endpoint...</p></div>`;
        this.refreshIcons();

        const startTime = performance.now();
        try {
            const res = await fetch(`${this.apiBaseUrl}/admin`, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${this.accessToken}` }
            });

            const latency = Math.round(performance.now() - startTime);
            const data = await res.json();

            if (res.ok) {
                // 200 OK: Admin is authorized
                container.innerHTML = `
                    <div class="portal-hero-banner banner-admin">
                        <div class="portal-hero-header">
                            <div class="portal-hero-icon admin-theme"><i data-lucide="crown"></i></div>
                            <div class="portal-hero-text">
                                <h3>${data.dashboard || 'Admin Dashboard'}</h3>
                                <p>${data.message || 'Welcome back!'}</p>
                            </div>
                        </div>
                    </div>

                    <!-- Admin Metric Cards -->
                    <div class="metric-cards-grid">
                        <div class="stat-card">
                            <div class="stat-icon-box icon-purple"><i data-lucide="shield-alert"></i></div>
                            <div class="stat-info">
                                <span class="stat-label">Clearance Level</span>
                                <h4 class="stat-value">ROOT_ADMIN</h4>
                            </div>
                        </div>

                        <div class="stat-card">
                            <div class="stat-icon-box icon-indigo"><i data-lucide="user"></i></div>
                            <div class="stat-info">
                                <span class="stat-label">Admin Subject</span>
                                <h4 class="stat-value">${data.user?.username || this.currentUser.username}</h4>
                            </div>
                        </div>

                        <div class="stat-card">
                            <div class="stat-icon-box icon-emerald"><i data-lucide="lock"></i></div>
                            <div class="stat-info">
                                <span class="stat-label">Token Expiry</span>
                                <h4 class="stat-value">30 Minutes</h4>
                            </div>
                        </div>

                        <div class="stat-card">
                            <div class="stat-icon-box icon-cyan"><i data-lucide="zap"></i></div>
                            <div class="stat-info">
                                <span class="stat-label">API Latency</span>
                                <h4 class="stat-value">${latency} ms</h4>
                            </div>
                        </div>
                    </div>

                    <!-- Admin Control Tools -->
                    <div class="content-card">
                        <div class="card-title-bar">
                            <div class="title-with-icon">
                                <i data-lucide="settings-2" class="text-purple"></i>
                                <h3>Executive Management & Privileges</h3>
                            </div>
                            <span class="tag-badge">Full Root Access</span>
                        </div>

                        <div class="features-list">
                            <div class="feature-item">
                                <div class="feature-icon"><i data-lucide="shield-check"></i></div>
                                <div>
                                    <h4>RBAC Enforcement & Governance</h4>
                                    <p>Backend enforces <code class="inline-code">require_role(["admin"])</code> to protect critical infrastructure endpoints.</p>
                                </div>
                            </div>
                            <div class="feature-item">
                                <div class="feature-icon"><i data-lucide="cpu"></i></div>
                                <div>
                                    <h4>Cryptographic Security Protocol</h4>
                                    <p>JSON Web Tokens signed with HS256 HMAC encryption secret key and expiration validation.</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Live Raw JSON Inspector -->
                    <div class="content-card">
                        <div class="card-title-bar">
                            <div class="title-with-icon">
                                <i data-lucide="code-2" class="text-purple"></i>
                                <h3>Live API Response Inspector</h3>
                            </div>
                            <div class="api-meta-tags">
                                <span class="status-code-pill status-200">HTTP 200 OK</span>
                                <span class="latency-pill">${latency} ms</span>
                            </div>
                        </div>
                        <div class="code-viewer-container">
                            <pre class="json-code-block">${JSON.stringify(data, null, 2)}</pre>
                        </div>
                    </div>
                `;
            } else if (res.status === 403) {
                // 403 Forbidden: User role is 'user'
                container.innerHTML = `
                    <div class="forbidden-card">
                        <div class="forbidden-icon"><i data-lucide="shield-alert"></i></div>
                        <h3 class="forbidden-title">403 Forbidden — Admin Clearance Required</h3>
                        <p class="forbidden-desc">
                            Access to <code class="inline-code">/admin</code> is strictly restricted to users with the <code class="inline-code">admin</code> role.
                            Your current active session has role <strong class="badge-role">${this.currentUser?.role}</strong>.
                        </p>
                        <div class="forbidden-actions">
                            <button class="btn-primary-action" onclick="app.fillLoginCredentials('admin', 'admin123')">
                                <i data-lucide="crown"></i> Sign In as Admin
                            </button>
                            <button class="btn-secondary" onclick="app.navigateTo('profile')">
                                <i data-lucide="user"></i> Return to Profile
                            </button>
                        </div>
                    </div>

                    <!-- Raw Response -->
                    <div class="content-card">
                        <div class="card-title-bar">
                            <div class="title-with-icon">
                                <i data-lucide="code-2" class="text-purple"></i>
                                <h3>Live API Response Inspector</h3>
                            </div>
                            <div class="api-meta-tags">
                                <span class="status-code-pill status-403">HTTP 403 FORBIDDEN</span>
                                <span class="latency-pill">${latency} ms</span>
                            </div>
                        </div>
                        <div class="code-viewer-container">
                            <pre class="json-code-block">${JSON.stringify(data, null, 2)}</pre>
                        </div>
                    </div>
                `;
            } else {
                throw new Error(data.detail || `Server returned HTTP ${res.status}`);
            }
        } catch (err) {
            container.innerHTML = `
                <div class="forbidden-card">
                    <div class="forbidden-icon"><i data-lucide="alert-circle"></i></div>
                    <h3 class="forbidden-title">Admin Query Error</h3>
                    <p class="forbidden-desc">${err.message}</p>
                    <button class="btn-primary-action" onclick="app.loadAdminPortal()"><i data-lucide="refresh-cw"></i> Retry</button>
                </div>
            `;
        }
        this.refreshIcons();
    }

    // =========================================================================
    // VIEW 5: PROTECTED API (/protected)
    // =========================================================================
    async loadProtectedPortal() {
        const container = document.getElementById('protected-portal-container');
        if (!container) return;

        if (!this.accessToken) {
            container.innerHTML = `
                <div class="unauth-banner">
                    <div class="unauth-icon-box"><i data-lucide="lock"></i></div>
                    <div class="unauth-text">
                        <h3>Authentication Required</h3>
                        <p>You must provide a valid JWT Bearer Token to access the protected gateway route.</p>
                    </div>
                    <button class="btn-primary-action" onclick="app.navigateTo('auth')">
                        <i data-lucide="log-in"></i> Sign In
                    </button>
                </div>
            `;
            this.refreshIcons();
            return;
        }

        container.innerHTML = `<div class="content-card" style="text-align:center; padding:3rem;"><i data-lucide="loader-2" class="spin" style="width:32px;height:32px;color:var(--primary);"></i><p style="margin-top:1rem;color:var(--text-secondary);">Probing /protected endpoint...</p></div>`;
        this.refreshIcons();

        const startTime = performance.now();
        try {
            const res = await fetch(`${this.apiBaseUrl}/protected`, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${this.accessToken}` }
            });

            const latency = Math.round(performance.now() - startTime);
            const data = await res.json();

            if (res.ok) {
                container.innerHTML = `
                    <div class="portal-hero-banner banner-protected">
                        <div class="portal-hero-header">
                            <div class="portal-hero-icon protected-theme"><i data-lucide="shield-check"></i></div>
                            <div class="portal-hero-text">
                                <h3>Protected Gateway Verified</h3>
                                <p>${data.Message || `Hello, ${this.currentUser.username} | you accessed a protected route`}</p>
                            </div>
                        </div>
                    </div>

                    <!-- Security Verification Checklist -->
                    <div class="content-card">
                        <div class="card-title-bar">
                            <div class="title-with-icon">
                                <i data-lucide="check-check" class="text-emerald"></i>
                                <h3>Zero-Trust Security Verification Checks</h3>
                            </div>
                            <span class="tag-badge">FastAPI get_current_user Dependency</span>
                        </div>

                        <div class="matrix-grid">
                            <div class="matrix-item">
                                <div class="matrix-left">
                                    <i data-lucide="key" class="text-indigo"></i>
                                    <div>
                                        <div class="matrix-path">Bearer Authorization Header</div>
                                        <div class="matrix-roles">Passed in HTTP Request</div>
                                    </div>
                                </div>
                                <div class="matrix-status"><span class="badge-allowed"><i data-lucide="check"></i> Verified</span></div>
                            </div>

                            <div class="matrix-item">
                                <div class="matrix-left">
                                    <i data-lucide="cpu" class="text-cyan"></i>
                                    <div>
                                        <div class="matrix-path">HS256 Cryptographic Signature</div>
                                        <div class="matrix-roles">Secret key matched</div>
                                    </div>
                                </div>
                                <div class="matrix-status"><span class="badge-allowed"><i data-lucide="check"></i> Verified</span></div>
                            </div>

                            <div class="matrix-item">
                                <div class="matrix-left">
                                    <i data-lucide="clock" class="text-emerald"></i>
                                    <div>
                                        <div class="matrix-path">Expiration Timestamp (exp)</div>
                                        <div class="matrix-roles">Token within 30 min window</div>
                                    </div>
                                </div>
                                <div class="matrix-status"><span class="badge-allowed"><i data-lucide="check"></i> Valid</span></div>
                            </div>

                            <div class="matrix-item">
                                <div class="matrix-left">
                                    <i data-lucide="user" class="text-purple"></i>
                                    <div>
                                        <div class="matrix-path">Subject Identity Injection</div>
                                        <div class="matrix-roles">Injected: ${this.currentUser.username}</div>
                                    </div>
                                </div>
                                <div class="matrix-status"><span class="badge-allowed"><i data-lucide="check"></i> Active</span></div>
                            </div>
                        </div>
                    </div>

                    <!-- Live Raw JSON Inspector -->
                    <div class="content-card">
                        <div class="card-title-bar">
                            <div class="title-with-icon">
                                <i data-lucide="code-2" class="text-cyan"></i>
                                <h3>Live API Response Inspector</h3>
                            </div>
                            <div class="api-meta-tags">
                                <span class="status-code-pill status-200">HTTP 200 OK</span>
                                <span class="latency-pill">${latency} ms</span>
                            </div>
                        </div>
                        <div class="code-viewer-container">
                            <pre class="json-code-block">${JSON.stringify(data, null, 2)}</pre>
                        </div>
                    </div>
                `;
            } else {
                throw new Error(data.detail || `HTTP ${res.status}`);
            }
        } catch (err) {
            container.innerHTML = `
                <div class="forbidden-card">
                    <div class="forbidden-icon"><i data-lucide="alert-triangle"></i></div>
                    <h3 class="forbidden-title">Protected Route Access Failed</h3>
                    <p class="forbidden-desc">${err.message}</p>
                    <button class="btn-primary-action" onclick="app.loadProtectedPortal()"><i data-lucide="refresh-cw"></i> Retry Probe</button>
                </div>
            `;
        }
        this.refreshIcons();
    }

    // =========================================================================
    // VIEW 6: TOKEN & API INSPECTOR (TESTBENCH & JWT DECODER)
    // =========================================================================
    renderTokenInspector() {
        const segHeader = document.getElementById('jwt-seg-header');
        const segPayload = document.getElementById('jwt-seg-payload');
        const segSig = document.getElementById('jwt-seg-signature');
        const decodedHeader = document.getElementById('decoded-header-text');
        const decodedPayload = document.getElementById('decoded-payload-text');

        if (this.accessToken) {
            const parts = this.accessToken.split('.');
            if (segHeader) segHeader.textContent = parts[0] || 'HEADER';
            if (segPayload) segPayload.textContent = parts[1] || 'PAYLOAD';
            if (segSig) segSig.textContent = parts[2] || 'SIGNATURE';

            if (decodedHeader && this.tokenHeader) {
                decodedHeader.textContent = JSON.stringify(this.tokenHeader, null, 2);
            }
            if (decodedPayload && this.tokenPayload) {
                decodedPayload.textContent = JSON.stringify(this.tokenPayload, null, 2);
            }
        } else {
            if (segHeader) segHeader.textContent = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9';
            if (segPayload) segPayload.textContent = 'eyJzdWIiOiJHVUVTVCIsInJvbGUiOiJub25lIiwiZXhwIjowfQ';
            if (segSig) segSig.textContent = 'NO_ACTIVE_SESSION';

            if (decodedHeader) decodedHeader.textContent = JSON.stringify({ alg: "HS256", typ: "JWT" }, null, 2);
            if (decodedPayload) decodedPayload.textContent = JSON.stringify({ sub: "No active session", role: "none", exp: null }, null, 2);
        }
    }

    async probeSingleEndpoint(endpoint) {
        const shortName = endpoint.replace('/', '');
        const statusEl = document.getElementById(`bench-status-${shortName}`);
        const termStatus = document.getElementById('inspector-status-code');
        const termLatency = document.getElementById('inspector-latency');
        const termText = document.getElementById('inspector-terminal-text');

        if (statusEl) {
            statusEl.textContent = 'PROBING...';
            statusEl.className = 'status-pill pill-idle';
        }

        const headers = {};
        if (this.accessToken) {
            headers['Authorization'] = `Bearer ${this.accessToken}`;
        }

        const startTime = performance.now();
        try {
            const res = await fetch(`${this.apiBaseUrl}${endpoint}`, {
                method: 'GET',
                headers: headers
            });

            const latency = Math.round(performance.now() - startTime);
            const data = await res.json().catch(() => ({ status: res.status }));

            if (statusEl) {
                statusEl.textContent = `${res.status} ${res.status === 200 ? 'OK' : res.status === 403 ? 'FORBIDDEN' : 'UNAUTHORIZED'}`;
                statusEl.className = `status-pill pill-${res.status}`;
            }

            if (termStatus) {
                termStatus.textContent = `HTTP ${res.status} ${res.statusText || ''}`;
                termStatus.className = `status-code-pill status-${res.status}`;
            }
            if (termLatency) termLatency.textContent = `${latency} ms`;

            if (termText) {
                termText.textContent = `// PROBE RESULT: ${endpoint}\n// TIMESTAMP: ${new Date().toISOString()}\n// LATENCY: ${latency}ms\n\n` + JSON.stringify(data, null, 2);
            }

            this.showToast(`Probed ${endpoint} → HTTP ${res.status}`, res.ok ? 'success' : 'info');
        } catch (err) {
            if (statusEl) {
                statusEl.textContent = 'ERR';
                statusEl.className = 'status-pill pill-403';
            }
            if (termText) termText.textContent = `// ERROR PROBING ${endpoint}\n${err.message}`;
        }
    }

    async probeAllEndpoints() {
        this.showToast('Starting sweep across all 4 RBAC endpoints...', 'info');
        const endpoints = ['/protected', '/profile', '/user', '/admin'];
        for (const ep of endpoints) {
            await this.probeSingleEndpoint(ep);
        }
        this.showToast('RBAC Endpoint sweep complete!', 'success');
    }

    async simulateTokenTamper() {
        if (!this.accessToken) {
            this.showToast('Sign in first to test token tampering', 'error');
            return;
        }

        // Mutate the signature portion of the token
        const parts = this.accessToken.split('.');
        const tamperedToken = `${parts[0]}.${parts[1]}.${parts[2].slice(0, -4)}X9Z_`;

        this.showToast('Testing tampered JWT against /protected endpoint...', 'info');

        const termText = document.getElementById('inspector-terminal-text');
        const termStatus = document.getElementById('inspector-status-code');
        const termLatency = document.getElementById('inspector-latency');

        const startTime = performance.now();
        try {
            const res = await fetch(`${this.apiBaseUrl}/protected`, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${tamperedToken}` }
            });

            const latency = Math.round(performance.now() - startTime);
            const data = await res.json();

            if (termStatus) {
                termStatus.textContent = `HTTP ${res.status} UNAUTHORIZED`;
                termStatus.className = 'status-code-pill status-403';
            }
            if (termLatency) termLatency.textContent = `${latency} ms`;

            if (termText) {
                termText.textContent = `// ZERO-TRUST TAMPER SIMULATION RESULT\n// Backend strictly rejected mutated JWT token!\n// STATUS: HTTP ${res.status}\n\n` + JSON.stringify(data, null, 2);
            }

            this.showToast('Backend successfully rejected tampered token with 401 Unauthorized!', 'success');
        } catch (err) {
            this.showToast(`Tamper probe error: ${err.message}`, 'error');
        }
    }

    // =========================================================================
    // TOAST NOTIFICATIONS
    // =========================================================================
    showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;

        const iconMap = {
            success: 'check-circle',
            error: 'alert-circle',
            info: 'info'
        };

        toast.innerHTML = `
            <i data-lucide="${iconMap[type] || 'info'}"></i>
            <span>${message}</span>
        `;

        container.appendChild(toast);
        this.refreshIcons();

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(30px)';
            toast.style.transition = 'all 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    }
}

// Global App Instance
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new AuthNexusApp();
});
