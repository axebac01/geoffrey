/**
 * API utility for handling API URLs
 * Uses VITE_API_URL if set (production), otherwise uses relative paths (development)
 */
const API_URL = import.meta.env.VITE_API_URL || '';

/**
 * Get the full API URL for a given path
 * @param path - API path (e.g., '/api/health')
 * @returns Full URL or relative path
 */
export function getApiUrl(path: string): string {
    // Remove leading slash if present to avoid double slashes
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    
    if (API_URL) {
        // Production: use full URL
        // Remove trailing slash from API_URL if present
        const baseUrl = API_URL.endsWith('/') ? API_URL.slice(0, -1) : API_URL;
        return `${baseUrl}${cleanPath}`;
    }
    
    // Development: use relative path (works with Vite proxy or same origin)
    return cleanPath;
}

/**
 * Make an API request with automatic URL handling
 * @param path - API path (e.g., '/api/health')
 * @param options - Fetch options
 * @returns Fetch response
 */
export async function apiRequest(path: string, options: RequestInit = {}): Promise<Response> {
    const url = getApiUrl(path);
    return fetch(url, options);
}

