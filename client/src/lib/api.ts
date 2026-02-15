import axios from "axios";

// ─── API Client ───
// Configured to point directly to the backend server
const api = axios.create({
    baseURL: "http://localhost:10000",
    headers: {
        "Content-Type": "application/json",
    },
    withCredentials: true, // send cookies (for JWT token in httpOnly cookie)
});

export default api;
