const api = {
    // Determine the API base URL based on the environment
    BASE_URL: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://localhost:5000/api'
        : '/api',

    // Token management
    setToken: (token) => {
        localStorage.setItem('gc_token', token);
    },
    getToken: () => {
        return localStorage.getItem('gc_token');
    },
    clearToken: () => {
        localStorage.removeItem('gc_token');
    },
    setUser: (user) => {
        localStorage.setItem('gc_user', JSON.stringify(user));
    },
    getUser: () => {
        const user = localStorage.getItem('gc_user');
        return user ? JSON.parse(user) : null;
    },

    // Helper for delay
    _delay: (ms) => new Promise(resolve => setTimeout(resolve, ms)),

    // Fetch wrapper with retry logic for cold starts
    async fetch(endpoint, options = {}, retries = 3) {
        const token = this.getToken();
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const config = {
            ...options,
            headers
        };

        for (let attempt = 1; attempt <= retries; attempt++) {
            try {
                console.log(`API Request (Attempt ${attempt}): ${options.method || 'GET'} ${this.BASE_URL}${endpoint}`);
                const response = await fetch(`${this.BASE_URL}${endpoint}`, config);
                
                let data;
                const contentType = response.headers.get("content-type");
                if (contentType && contentType.indexOf("application/json") !== -1) {
                    data = await response.json();
                } else {
                    const text = await response.text();
                    console.error(`Non-JSON response (${response.status}):`, text);
                    // If it's a Vercel error, the text might contain hints
                    if (text.includes("Vercel") || response.status === 500) {
                        throw new Error(`Server Error (Status ${response.status}). Check Vercel logs for Prisma/Database errors.`);
                    }
                    throw new Error("Server returned non-JSON response");
                }

                if (!response.ok) {
                    if (response.status === 401) {
                        console.warn("Session expired or invalid. Logging out...");
                        this.logout();
                        throw new Error("Session expired. Please login again.");
                    }
                    console.error(`API Error (${response.status}):`, data);
                    throw new Error(data.message || 'Something went wrong');
                }

                return data;
            } catch (err) {
                console.error(`Attempt ${attempt} failed:`, err.message);
                
                if (attempt === retries) {
                    if (err.name === 'TypeError' && err.message === 'Failed to fetch') {
                        throw new Error("Connection Error: Server might be waking up after inactivity. Please wait 30 seconds and try again.");
                    }
                    throw err;
                }

                // If it's a fetch error (server sleeping), wait before retrying
                if (err.name === 'TypeError' && err.message === 'Failed to fetch') {
                    console.log(`Server might be sleeping. Retrying in 2 seconds...`);
                    await this._delay(2000);
                } else {
                    // For other errors, rethrow immediately
                    throw err;
                }
            }
        }
    },

    // Wake up the backend (helpful for Render free tier)
    async wakeUp() {
        try {
            console.log("Waking up backend...");
            // Minimal ping to health check
            await fetch(`${this.BASE_URL}/health`).catch(() => {});
        } catch (e) {
            // Background task, ignore failure
        }
    },

    // Auth helpers
    async login(email, password) {
        const data = await this.fetch('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });
        
        if (data.success) {
            this.setToken(data.token);
            this.setUser(data.user);
        }
        return data;
    },

    async registerCustomer(payload) {
        return this.fetch('/auth/register/customer', {
            method: 'POST',
            body: JSON.stringify(payload)
        });
    },

    async registerOwner(payload) {
        return this.fetch('/auth/register/owner', {
            method: 'POST',
            body: JSON.stringify(payload)
        });
    },

    async checkAuth() {
        try {
            const data = await this.fetch('/auth/me');
            if (data.success) {
                this.setUser(data.user);
                return data.user;
            }
        } catch (err) {
            // Silently clear token — do NOT call logout() here
            // logout() would redirect away from protected pages and cause
            // an alert loop on the login page for expired tokens.
            this.clearToken();
            localStorage.removeItem('gc_user');
        }
        return null;
    },

    logout() {
        this.clearToken();
        localStorage.removeItem('gc_user');
        window.location.href = 'index.html';
    },

    // Distance helper (Haversine formula in KM)
    getDistance(lat1, lon1, lat2, lon2) {
        const R = 6371; // Radius of the earth in km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = 
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c; // Distance in km
    }
};

const _isLoginPage = (
    window.location.pathname.endsWith('index.html') ||
    window.location.pathname === '/' ||
    window.location.pathname === ''
);
const _isSignupPage = window.location.pathname.endsWith('signup.html');

if (_isLoginPage) {
    // On the login page: silently clear any stale/expired token
    // so a returning user doesn't see a 401-driven 'Session expired' alert.
    api.clearToken();
    localStorage.removeItem('gc_user');
    // Ping the backend in the background so Render wakes up before the user
    // clicks Login (avoids the first-login cold-start delay).
    api.wakeUp();
} else if (!_isSignupPage) {
    // On all other (protected) pages: redirect to login if not authenticated.
    if (!api.getToken()) {
        window.location.href = 'index.html';
    }
}

// Export for use in other scripts
window.gcApi = api;
