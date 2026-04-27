import axios from "axios";

// ─── API Client ───
// Configured to point directly to the backend server
const api = axios.create({
    baseURL: "https://inventohub-backend-20we.onrender.com",
    headers: {
        "Content-Type": "application/json",
    },
    withCredentials: true, // send cookies (for JWT token in httpOnly cookie)
});

export default api;
