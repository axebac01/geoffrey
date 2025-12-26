/**
 * WordPress Integration Library
 * Handles OAuth, token management, and WordPress REST API calls
 */

import axios, { AxiosInstance } from 'axios';
import { encrypt, decrypt } from './encryption';
import { logger } from '../logger';

// WordPress.com OAuth endpoints
const WORDPRESS_COM_AUTH_URL = 'https://public-api.wordpress.com/oauth2/authorize';
const WORDPRESS_COM_TOKEN_URL = 'https://public-api.wordpress.com/oauth2/token';
const WORDPRESS_COM_API_BASE = 'https://public-api.wordpress.com/rest/v1.1';

export type WordPressSiteType = 'wordpress_com' | 'self_hosted';

export interface WordPressPostData {
    title: string;
    content: string; // HTML content
    status: 'draft' | 'publish';
    excerpt?: string;
    categories?: number[];
    tags?: string[];
    featured_media?: number;
    meta?: Record<string, any>; // For custom fields like JSON-LD
}

export interface WordPressSite {
    ID: number;
    name: string;
    URL: string;
    description?: string;
}

/**
 * Create WordPress.com OAuth authorization URL
 */
export function getWordPressAuthUrl(state: string): string {
    const clientId = process.env.WORDPRESS_COM_CLIENT_ID;
    const redirectUri = process.env.WORDPRESS_COM_REDIRECT_URI;
    
    if (!clientId || !redirectUri) {
        throw new Error('Missing WordPress.com OAuth configuration. Required: WORDPRESS_COM_CLIENT_ID, WORDPRESS_COM_REDIRECT_URI');
    }
    
    const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        state: state,
        scope: 'global',
    });
    
    return `${WORDPRESS_COM_AUTH_URL}?${params.toString()}`;
}

/**
 * Exchange authorization code for tokens (WordPress.com)
 */
export async function exchangeCodeForTokens(code: string): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresAt: Date;
}> {
    const clientId = process.env.WORDPRESS_COM_CLIENT_ID;
    const clientSecret = process.env.WORDPRESS_COM_CLIENT_SECRET;
    const redirectUri = process.env.WORDPRESS_COM_REDIRECT_URI;
    
    if (!clientId || !clientSecret || !redirectUri) {
        throw new Error('Missing WordPress.com OAuth configuration');
    }
    
    try {
        const response = await axios.post(WORDPRESS_COM_TOKEN_URL, {
            client_id: clientId,
            client_secret: clientSecret,
            code: code,
            redirect_uri: redirectUri,
            grant_type: 'authorization_code',
        });
        
        const { access_token, refresh_token, expires_in } = response.data;
        
        if (!access_token || !refresh_token) {
            throw new Error('Failed to receive tokens from WordPress.com');
        }
        
        // Calculate expiration time (expires_in is in seconds)
        const expiresAt = new Date(Date.now() + (expires_in * 1000));
        
        return {
            accessToken: access_token,
            refreshToken: refresh_token,
            expiresAt,
        };
    } catch (error: any) {
        logger.error('Failed to exchange WordPress.com code for tokens', {
            error: error.message,
            response: error.response?.data,
        });
        throw new Error(`Failed to exchange code for tokens: ${error.message}`);
    }
}

/**
 * Refresh WordPress.com access token
 */
export async function refreshWordPressToken(encryptedRefreshToken: string): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresAt: Date;
}> {
    const clientId = process.env.WORDPRESS_COM_CLIENT_ID;
    const clientSecret = process.env.WORDPRESS_COM_CLIENT_SECRET;
    
    if (!clientId || !clientSecret) {
        throw new Error('Missing WordPress.com OAuth configuration');
    }
    
    const refreshToken = decrypt(encryptedRefreshToken);
    
    try {
        const response = await axios.post(WORDPRESS_COM_TOKEN_URL, {
            client_id: clientId,
            client_secret: clientSecret,
            refresh_token: refreshToken,
            grant_type: 'refresh_token',
        });
        
        const { access_token, refresh_token, expires_in } = response.data;
        
        if (!access_token) {
            throw new Error('Failed to refresh token from WordPress.com');
        }
        
        const expiresAt = new Date(Date.now() + (expires_in * 1000));
        
        return {
            accessToken: access_token,
            refreshToken: refresh_token || refreshToken, // Use new refresh token if provided
            expiresAt,
        };
    } catch (error: any) {
        logger.error('Failed to refresh WordPress.com token', {
            error: error.message,
            response: error.response?.data,
        });
        throw new Error(`Failed to refresh token: ${error.message}`);
    }
}

/**
 * Encrypt access token for storage
 */
export function encryptAccessToken(token: string): string {
    return encrypt(token);
}

/**
 * Decrypt access token
 */
export function decryptAccessToken(encryptedToken: string): string {
    return decrypt(encryptedToken);
}

/**
 * Get user's WordPress.com sites
 */
export async function getWordPressSites(accessToken: string): Promise<WordPressSite[]> {
    try {
        const response = await axios.get(`${WORDPRESS_COM_API_BASE}/me/sites`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
            },
        });
        
        return response.data.sites || [];
    } catch (error: any) {
        logger.error('Failed to fetch WordPress.com sites', {
            error: error.message,
            response: error.response?.data,
        });
        throw new Error(`Failed to fetch sites: ${error.message}`);
    }
}

/**
 * Test WordPress connection
 */
export async function testWordPressConnection(
    siteUrl: string,
    token: string,
    siteType: WordPressSiteType
): Promise<boolean> {
    try {
        let apiUrl: string;
        const headers: Record<string, string> = {};
        
        if (siteType === 'wordpress_com') {
            apiUrl = `${WORDPRESS_COM_API_BASE}/sites/${new URL(siteUrl).hostname}`;
            headers['Authorization'] = `Bearer ${token}`;
        } else {
            // Self-hosted: Use Basic Auth with Application Password
            // Need username - for Application Passwords, username is the WordPress username
            // We'll use a generic test endpoint that works with Application Passwords
            apiUrl = `${siteUrl.replace(/\/$/, '')}/wp-json/wp/v2/users/me`;
            // Application Password format: username:application_password
            // Since we only have the password, we need to extract username from token if it's in format "username password"
            // For now, assume token is just the application password and we'll use a placeholder username
            // In practice, users should provide username:password format or we store username separately
            const credentials = Buffer.from(`:${token}`).toString('base64');
            headers['Authorization'] = `Basic ${credentials}`;
        }
        
        await axios.get(apiUrl, { headers, timeout: 10000 });
        return true;
    } catch (error: any) {
        logger.error('WordPress connection test failed', {
            siteUrl,
            siteType,
            error: error.message,
            response: error.response?.status,
        });
        return false;
    }
}

/**
 * Create WordPress REST API client
 */
function createWordPressClient(
    siteUrl: string,
    token: string,
    siteType: WordPressSiteType
): AxiosInstance {
    const baseURL = siteType === 'wordpress_com'
        ? `${WORDPRESS_COM_API_BASE}/sites/${new URL(siteUrl).hostname}`
        : `${siteUrl}/wp-json/wp/v2`;
    
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    };
    
    if (siteType === 'wordpress_com') {
        headers['Authorization'] = `Bearer ${token}`;
    } else {
        // Self-hosted: Use Basic Auth with Application Password
        // Application Password format: username:application_password
        // If token contains colon, it's already in username:password format
        // Otherwise, assume it's just the password and use empty username (WordPress will use the Application Password owner)
        const authString = token.includes(':') ? token : `:${token}`;
        const credentials = Buffer.from(authString).toString('base64');
        headers['Authorization'] = `Basic ${credentials}`;
    }
    
    return axios.create({
        baseURL,
        headers,
        timeout: 30000,
    });
}

/**
 * Create WordPress post
 */
export async function createWordPressPost(
    siteUrl: string,
    token: string,
    siteType: WordPressSiteType,
    postData: WordPressPostData
): Promise<{
    id: number;
    link: string;
    status: string;
}> {
    const client = createWordPressClient(siteUrl, token, siteType);
    
    try {
        // Prepare post data for WordPress REST API
        const wpPostData: any = {
            title: postData.title,
            content: postData.content,
            status: postData.status,
        };
        
        if (postData.excerpt) {
            wpPostData.excerpt = postData.excerpt;
        }
        
        if (postData.categories && postData.categories.length > 0) {
            wpPostData.categories = postData.categories;
        }
        
        if (postData.tags && postData.tags.length > 0) {
            // For tags, we need to create them or get their IDs
            // For now, pass as array of tag names (WordPress will create if needed)
            wpPostData.tags = postData.tags;
        }
        
        if (postData.featured_media) {
            wpPostData.featured_media = postData.featured_media;
        }
        
        // Add meta fields if provided (for JSON-LD, etc.)
        if (postData.meta) {
            wpPostData.meta = postData.meta;
        }
        
        const response = await client.post('/posts', wpPostData);
        
        return {
            id: response.data.id,
            link: response.data.link,
            status: response.data.status,
        };
    } catch (error: any) {
        logger.error('Failed to create WordPress post', {
            siteUrl,
            siteType,
            error: error.message,
            response: error.response?.data,
        });
        throw new Error(`Failed to create post: ${error.message}`);
    }
}

/**
 * Get WordPress categories
 */
export async function getWordPressCategories(
    siteUrl: string,
    token: string,
    siteType: WordPressSiteType
): Promise<Array<{ id: number; name: string }>> {
    const client = createWordPressClient(siteUrl, token, siteType);
    
    try {
        const response = await client.get('/categories');
        return response.data.map((cat: any) => ({
            id: cat.id,
            name: cat.name,
        }));
    } catch (error: any) {
        logger.error('Failed to fetch WordPress categories', {
            siteUrl,
            siteType,
            error: error.message,
        });
        return [];
    }
}

/**
 * Validate WordPress site URL
 */
export function validateWordPressUrl(url: string): boolean {
    try {
        const parsed = new URL(url);
        return parsed.protocol === 'https:' || parsed.protocol === 'http:';
    } catch {
        return false;
    }
}

