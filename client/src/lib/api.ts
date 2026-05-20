import axios from "axios";

// ─── API Client ───
// Localhost: baseURL is "" so Vite proxy forwards /api → localhost:10000.
// Production: change to "https://inventohub-backend-20we.onrender.com"
const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL,
    headers: {
        "Content-Type": "application/json",
    },
    withCredentials: true, // send cookies (for JWT token in httpOnly cookie)
});

// Request Interceptor: Automatically inject the Bearer token if it exists in local storage
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem("token");
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

export default api;
