import { auth } from '@/lib/firebase';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

/**
 * Common API client that handles authentication and base URL.
 */
class ApiClient {
    async getHeaders(extraHeaders = {}, isFormData = false) {
        const user = auth.currentUser;
        const headers = {
            ...extraHeaders,
        };

        if (!isFormData) {
            headers['Content-Type'] = 'application/json';
        }

        if (user) {
            try {
                const token = await user.getIdToken();
                headers['Authorization'] = `Bearer ${token}`;
            } catch (error) {
                console.error('Error getting Firebase ID token:', error);
            }
        }

        return headers;
    }

    async request(endpoint, options = {}) {
        const url = `${API_BASE_URL}${endpoint}`;
        const isFormData = options.body instanceof FormData;
        const headers = await this.getHeaders(options.headers || {}, isFormData);
        console.log(`making a ${options.method} request to ${url} with headers ${headers}`)
        const response = await fetch(url, {
            ...options,
            headers,
        });


        if (!response.ok) {
            let errorBody;
            try {
                errorBody = await response.json();
            } catch (e) {
                errorBody = { error: await response.text() };
            }

            const error = new Error(errorBody.error || `API request failed with status ${response.status}`);
            error.status = response.status;
            error.data = errorBody;
            throw error;
        }

        return response.json();
    }

    get(endpoint, options = {}) {
        return this.request(endpoint, { ...options, method: 'GET' });
    }

    post(endpoint, body, options = {}) {
        const isFormData = body instanceof FormData;
        return this.request(endpoint, {
            ...options,
            method: 'POST',
            body: isFormData ? body : JSON.stringify(body),
        });
    }

    put(endpoint, body, options = {}) {
        const isFormData = body instanceof FormData;
        return this.request(endpoint, {
            ...options,
            method: 'PUT',
            body: isFormData ? body : JSON.stringify(body),
        });
    }

    delete(endpoint, options = {}) {
        return this.request(endpoint, { ...options, method: 'DELETE' });
    }
}

export const apiClient = new ApiClient();
export default apiClient;
