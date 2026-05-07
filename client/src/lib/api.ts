import axios from "axios";

// ─── API Client ───
// Localhost: baseURL is "" so Vite proxy forwards /api → localhost:10000.
// Production: change to "https://inventohub-backend-20we.onrender.com"
const api = axios.create({
    baseURL: "https://inventohub-backend-20we.onrender.com",
    headers: {
        "Content-Type": "application/json",
    },
    withCredentials: true, // send cookies (for JWT token in httpOnly cookie)
});

export default api;
