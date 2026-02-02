import axios from 'axios';

// Create axios instance with default config
const apiClient = axios.create({
    baseURL: '/api/v1',
    headers: {
        'Content-Type': 'application/json'
    },
    timeout: 10000
});

// Request interceptor - attach JWT token to all requests
apiClient.interceptors.request.use(
    (config) => {
        // Get token from localStorage and attach to Authorization header
        const token = localStorage.getItem('edu_auth_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor - handle errors globally
apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        // Handle common errors
        if (error.response) {
            switch (error.response.status) {
                case 401:
                    // Handle unauthorized - clear token and redirect to login
                    console.error('Unauthorized - please login');
                    if (!window.location.pathname.includes('/login')) {
                        localStorage.removeItem('edu_auth_token');
                        localStorage.removeItem('edu_user_id');
                        window.location.href = '/login';
                    }
                    break;
                case 403:
                    console.error('Forbidden - access denied');
                    break;
                case 404:
                    console.error('Resource not found');
                    break;
                case 500:
                    console.error('Server error');
                    break;
            }
        } else if (error.request) {
            console.error('Network error - no response received');
        }
        return Promise.reject(error);
    }
);

export default apiClient;
