import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API_BASE = `${BACKEND_URL}/api`;

// Public API instance (no auth)
export const publicApi = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
});

// Client API (uses cookies for Google auth session)
export const clientApi = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
});

// Lawyer API (uses bearer token from localStorage)
export const lawyerApi = axios.create({
  baseURL: API_BASE,
});

lawyerApi.interceptors.request.use((config) => {
  const token = localStorage.getItem("lawyer_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

lawyerApi.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err?.response?.status === 401) {
      localStorage.removeItem("lawyer_token");
    }
    return Promise.reject(err);
  }
);
