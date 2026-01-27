import { config } from '../config/appConfig';


const API_BASE_URL = config.apiBaseUrl || 'http://localhost:8000/api';

class ApiService {
    private token: string | null = null;

    constructor() {
        this.token = localStorage.getItem('auth_token');
    }

    setToken(token: string | null) {
        this.token = token;
        if (token) {
            localStorage.setItem('auth_token', token);
        } else {
            localStorage.removeItem('auth_token');
        }
    }

    getToken() {
        return this.token;
    }

    async request(endpoint: string, options: RequestInit = {}) {
        const headers: HeadersInit = {
            'Content-Type': 'application/json',
            ...options.headers,
        };

        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }

        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...options,
            headers,
        });

        if (response.status === 401) {
            // Token expired or invalid
            this.setToken(null);
            window.location.href = '/'; // Redirect to login
            throw new Error('Unauthorized');
        }

        const contentType = response.headers.get('content-type');
        if (contentType && contentType.indexOf('application/json') !== -1) {
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || data.message || 'API Error');
            }
            return { data, error: null };
        } else {
            // Handle non-JSON response (e.g. 200 OK with no body)
            if (!response.ok) {
                const text = await response.text();
                throw new Error(text || 'API Error');
            }
            return { data: null, error: null };
        }
    }

    private async logAudit(userId: string, action: string, details: any) {
        try {
            await this.post('/audit-logs', {
                user_id: userId,
                action,
                details,
                timestamp: new Date().toISOString()
            });
        } catch (err) {
            console.error('Exception logging audit:', err);
        }
    }

    // Auth
    async login(credentials: any) {
        const { data, error } = await this.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify(credentials),
        }).catch(err => ({ data: null, error: err }));

        if (data?.session?.access_token) {
            this.setToken(data.session.access_token);
            // Log login
            if (data.user) {
                this.logAudit(data.user.id, 'LOGIN', { email: data.user.email, role: data.user.role || 'User' });
            }
        }
        return { data, error };
    }

    async signup(payload: any) {
        const { data, error } = await this.request('/auth/signup', {
            method: 'POST',
            body: JSON.stringify(payload),
        }).catch(err => ({ data: null, error: err }));

        if (data?.session?.access_token) {
            this.setToken(data.session.access_token);
            // Log signup
            if (data.user) {
                this.logAudit(data.user.id, 'SIGNUP', { email: data.user.email, role: payload.options?.data?.role });
            }
        }
        return { data, error };
    }

    async verifyOtp(payload: { email: string; token: string; type: string }) {
        const { data, error } = await this.request('/auth/verify', {
            method: 'POST',
            body: JSON.stringify(payload),
        }).catch(err => ({ data: null, error: err }));

        if (data?.session?.access_token) {
            this.setToken(data.session.access_token);
            if (data.user) {
                this.logAudit(data.user.id, 'OTP_VERIFY', { email: payload.email });
            }
        }
        return { data, error };
    }

    async resetPassword(email: string) {
        return this.request('/auth/reset-password', {
            method: 'POST',
            body: JSON.stringify({ email }),
        }).catch(err => ({ data: null, error: err }));
    }

    async logout() {
        await this.request('/auth/logout', { method: 'POST' }).catch(() => { });
        this.setToken(null);
    }

    async getSession() {
        if (!this.token) return { data: { session: null }, error: null };
        // Validate token with backend
        const { data, error } = await this.request('/auth/me').catch(() => ({ data: null, error: true }));
        if (error) {
            this.setToken(null);
            return { data: { session: null }, error };
        }
        return { data: { session: { user: data.user, access_token: this.token } }, error: null };
    }

    // Data
    async get(endpoint: string) {
        return this.request(endpoint).catch(err => ({ data: null, error: err }));
    }

    async post(endpoint: string, body: any) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(body),
        }).catch(err => ({ data: null, error: err }));
    }

    async put(endpoint: string, body: any) {
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(body),
        }).catch(err => ({ data: null, error: err }));
    }
    async delete(endpoint: string) {
        return this.request(endpoint, {
            method: 'DELETE',
        }).catch(err => ({ data: null, error: err }));
    }
}

export const api = new ApiService();
