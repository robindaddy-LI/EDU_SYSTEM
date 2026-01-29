import axios from 'axios';

// Create axios instance with default config
const apiClient = axios.create({
    baseURL: '/api/v1',
    headers: {
        'Content-Type': 'application/json'
    },
    timeout: 10000
});

// Request interceptor - can add auth token here
apiClient.interceptors.request.use(
    (config) => {
        // Add authorization header if token exists
        // const token = localStorage.getItem('authToken');
        // if (token) {
        //     config.headers.Authorization = `Bearer ${token}`;
        // }
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
                    // Handle unauthorized - redirect to login
                    console.error('Unauthorized - please login');
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
