// Global API Configuration for Frontend (Vite)
// In production on Vercel, use relative paths so Vercel rewrites proxy requests to Railway seamlessly without CORS.
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
