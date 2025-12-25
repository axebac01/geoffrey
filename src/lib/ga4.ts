/**
 * Google Analytics 4 Integration
 * Handles OAuth, token management, and GA4 Data API calls
 */

import { google } from 'googleapis';
import { encrypt, decrypt } from './encryption';
import { logger } from '../logger';

// OAuth2 Configuration
const SCOPES = ['https://www.googleapis.com/auth/analytics.readonly'];

// Known AI sources for detection
export const AI_SOURCES = [
    'chat.openai.com',
    'chatgpt.com',
    'perplexity.ai',
    'gemini.google.com',
    'bard.google.com',
    'deepseek.com',
    'chat.deepseek.com',
    'copilot.microsoft.com',
    'claude.ai',
    'anthropic.com',
    'you.com',
    'phind.com',
    'poe.com',
];

// AI Assistant classification
export function classifyAssistant(source: string): string {
    const sourceLower = source.toLowerCase();
    
    if (sourceLower.includes('openai') || sourceLower.includes('chatgpt')) {
        return 'chatgpt';
    }
    if (sourceLower.includes('perplexity')) {
        return 'perplexity';
    }
    if (sourceLower.includes('gemini') || sourceLower.includes('bard')) {
        return 'gemini';
    }
    if (sourceLower.includes('deepseek')) {
        return 'deepseek';
    }
    if (sourceLower.includes('copilot')) {
        return 'copilot';
    }
    if (sourceLower.includes('claude') || sourceLower.includes('anthropic')) {
        return 'claude';
    }
    if (sourceLower.includes('you.com')) {
        return 'you';
    }
    if (sourceLower.includes('phind')) {
        return 'phind';
    }
    if (sourceLower.includes('poe')) {
        return 'poe';
    }
    
    return 'other';
}

/**
 * Create OAuth2 client
 */
export function createOAuth2Client() {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI;
    
    if (!clientId || !clientSecret || !redirectUri) {
        throw new Error('Missing Google OAuth configuration. Required: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_OAUTH_REDIRECT_URI');
    }
    
    return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

/**
 * Generate OAuth consent URL
 */
export function getAuthUrl(state: string): string {
    const oauth2Client = createOAuth2Client();
    
    return oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
        state: state,
        prompt: 'consent', // Force consent to ensure refresh_token is returned
        include_granted_scopes: true,
    });
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(code: string): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresAt: Date;
}> {
    const oauth2Client = createOAuth2Client();
    
    const { tokens } = await oauth2Client.getToken(code);
    
    if (!tokens.refresh_token) {
        throw new Error('No refresh token received. User may need to revoke access and reconnect.');
    }
    
    const expiresAt = new Date(Date.now() + (tokens.expiry_date || 3600 * 1000));
    
    return {
        accessToken: tokens.access_token || '',
        refreshToken: tokens.refresh_token,
        expiresAt,
    };
}

/**
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(encryptedRefreshToken: string): Promise<{
    accessToken: string;
    expiresAt: Date;
}> {
    const oauth2Client = createOAuth2Client();
    const refreshToken = decrypt(encryptedRefreshToken);
    
    if (!refreshToken) {
        throw new Error('Refresh token is missing or invalid');
    }
    
    oauth2Client.setCredentials({ refresh_token: refreshToken });
    
    try {
        const { credentials } = await oauth2Client.refreshAccessToken();
        
        if (!credentials.access_token) {
            throw new Error('No access token received from refresh');
        }
        
        const expiresAt = new Date(Date.now() + (credentials.expiry_date || 3600 * 1000));
        
        return {
            accessToken: credentials.access_token,
            expiresAt,
        };
    } catch (error: any) {
        logger.error('Failed to refresh access token', { errorMessage: error.message });
        throw new Error(`Token refresh failed: ${error.message}`);
    }
}

/**
 * List GA4 properties available to the user
 */
export async function listGA4Properties(accessToken: string): Promise<Array<{
    propertyId: string;
    displayName: string;
    accountName: string;
}>> {
    const oauth2Client = createOAuth2Client();
    oauth2Client.setCredentials({ access_token: accessToken });
    
    const analyticsAdmin = google.analyticsadmin({ version: 'v1beta', auth: oauth2Client });
    
    try {
        const response = await analyticsAdmin.accountSummaries.list();
        
        const properties: Array<{ propertyId: string; displayName: string; accountName: string }> = [];
        
        for (const account of response.data.accountSummaries || []) {
            const accountName = account.displayName || 'Unknown Account';
            
            for (const property of account.propertySummaries || []) {
                if (property.property && property.displayName) {
                    // Property format: "properties/123456789"
                    const propertyId = property.property.replace('properties/', '');
                    properties.push({
                        propertyId,
                        displayName: property.displayName,
                        accountName,
                    });
                }
            }
        }
        
        return properties;
    } catch (error: any) {
        logger.error('Failed to list GA4 properties', { errorMessage: error.message });
        throw error;
    }
}

/**
 * Fetch AI traffic data from GA4
 */
export async function fetchAITrafficData(
    accessToken: string,
    propertyId: string,
    startDate: string,
    endDate: string
): Promise<{
    totals: { sessions: number; activeUsers: number; keyEvents: number };
    byAssistant: Array<{ assistant: string; sessions: number; activeUsers: number; keyEvents: number }>;
    breakdown: Array<{ source: string; medium: string; sessions: number; activeUsers: number; keyEvents: number }>;
}> {
    const oauth2Client = createOAuth2Client();
    oauth2Client.setCredentials({ access_token: accessToken });
    
    const analyticsData = google.analyticsdata({ version: 'v1beta', auth: oauth2Client });
    
    // Build dimension filter for AI sources
    const aiSourceFilter = {
        orGroup: {
            expressions: AI_SOURCES.map(source => ({
                filter: {
                    fieldName: 'sessionSource',
                    stringFilter: {
                        matchType: 'CONTAINS',
                        value: source,
                        caseSensitive: false,
                    },
                },
            })),
        },
    };
    
    try {
        const response = await analyticsData.properties.runReport({
            property: `properties/${propertyId}`,
            requestBody: {
                dateRanges: [{ startDate, endDate }],
                dimensions: [
                    { name: 'sessionSource' },
                    { name: 'sessionMedium' },
                ],
                metrics: [
                    { name: 'sessions' },
                    { name: 'activeUsers' },
                    { name: 'keyEvents' },
                ],
                dimensionFilter: aiSourceFilter as any,
                limit: '100',
            },
        });
        
        // Process results
        const breakdown: Array<{ source: string; medium: string; sessions: number; activeUsers: number; keyEvents: number }> = [];
        const assistantMap = new Map<string, { sessions: number; activeUsers: number; keyEvents: number }>();
        
        let totalSessions = 0;
        let totalActiveUsers = 0;
        let totalKeyEvents = 0;
        
        const rows = (response as any).data?.rows || [];
        for (const row of rows) {
            const source = row.dimensionValues?.[0]?.value || '(not set)';
            const medium = row.dimensionValues?.[1]?.value || '(not set)';
            const sessions = parseInt(row.metricValues?.[0]?.value || '0', 10);
            const activeUsers = parseInt(row.metricValues?.[1]?.value || '0', 10);
            const keyEvents = parseInt(row.metricValues?.[2]?.value || '0', 10);
            
            breakdown.push({ source, medium, sessions, activeUsers, keyEvents });
            
            totalSessions += sessions;
            totalActiveUsers += activeUsers;
            totalKeyEvents += keyEvents;
            
            // Classify and aggregate by assistant
            const assistant = classifyAssistant(source);
            const existing = assistantMap.get(assistant) || { sessions: 0, activeUsers: 0, keyEvents: 0 };
            assistantMap.set(assistant, {
                sessions: existing.sessions + sessions,
                activeUsers: existing.activeUsers + activeUsers,
                keyEvents: existing.keyEvents + keyEvents,
            });
        }
        
        const byAssistant = Array.from(assistantMap.entries()).map(([assistant, data]) => ({
            assistant,
            ...data,
        })).sort((a, b) => b.sessions - a.sessions);
        
        return {
            totals: {
                sessions: totalSessions,
                activeUsers: totalActiveUsers,
                keyEvents: totalKeyEvents,
            },
            byAssistant,
            breakdown,
        };
    } catch (error: any) {
        // Check if it's an authentication error
        if (error.message?.includes('invalid authentication') || 
            error.message?.includes('Invalid Credentials') ||
            error.code === 401 ||
            error.status === 401) {
            logger.error('GA4 authentication failed - token may be invalid', { 
                errorMessage: error.message, 
                propertyId 
            });
            throw new Error('Authentication failed. Please reconnect GA4 in Settings.');
        }
        
        logger.error('Failed to fetch AI traffic data', { errorMessage: error.message, propertyId });
        throw error;
    }
}

/**
 * Fetch AI traffic time-series data from GA4
 */
export async function fetchAITrafficTimeSeries(
    accessToken: string,
    propertyId: string,
    startDate: string,
    endDate: string,
    groupBy: 'day' | 'week' | 'month' = 'day'
): Promise<Array<{
    date: string;
    chatgpt: number;
    perplexity: number;
    gemini: number;
    deepseek: number;
    copilot: number;
    claude: number;
    total: number;
}>> {
    const oauth2Client = createOAuth2Client();
    oauth2Client.setCredentials({ access_token: accessToken });
    
    const analyticsData = google.analyticsdata({ version: 'v1beta', auth: oauth2Client });
    
    // Build dimension filter for AI sources
    const aiSourceFilter = {
        orGroup: {
            expressions: AI_SOURCES.map(source => ({
                filter: {
                    fieldName: 'sessionSource',
                    stringFilter: {
                        matchType: 'CONTAINS',
                        value: source,
                        caseSensitive: false,
                    },
                },
            })),
        },
    };
    
    // Determine date dimension based on groupBy
    let dateDimension: string;
    switch (groupBy) {
        case 'week':
            dateDimension = 'yearWeek';
            break;
        case 'month':
            dateDimension = 'yearMonth';
            break;
        default:
            dateDimension = 'date';
    }
    
    try {
        const response = await analyticsData.properties.runReport({
            property: `properties/${propertyId}`,
            requestBody: {
                dateRanges: [{ startDate, endDate }],
                dimensions: [
                    { name: dateDimension },
                    { name: 'sessionSource' },
                ],
                metrics: [
                    { name: 'sessions' },
                ],
                dimensionFilter: aiSourceFilter as any,
                limit: '10000', // Higher limit for time-series data
            },
        });
        
        // Process results into time-series format
        const dateMap = new Map<string, {
            chatgpt: number;
            perplexity: number;
            gemini: number;
            deepseek: number;
            copilot: number;
            claude: number;
            total: number;
        }>();
        
        const rows = (response as any).data?.rows || [];
        for (const row of rows) {
            const dateValue = row.dimensionValues?.[0]?.value || '';
            const source = row.dimensionValues?.[1]?.value || '(not set)';
            const sessions = parseInt(row.metricValues?.[0]?.value || '0', 10);
            
            if (!dateValue) continue;
            
            // Get or create date entry
            let dateEntry = dateMap.get(dateValue);
            if (!dateEntry) {
                dateEntry = { chatgpt: 0, perplexity: 0, gemini: 0, deepseek: 0, copilot: 0, claude: 0, total: 0 };
                dateMap.set(dateValue, dateEntry);
            }
            
            // Classify assistant and add to appropriate bucket
            const assistant = classifyAssistant(source);
            if (assistant === 'chatgpt') {
                dateEntry.chatgpt += sessions;
            } else if (assistant === 'perplexity') {
                dateEntry.perplexity += sessions;
            } else if (assistant === 'gemini') {
                dateEntry.gemini += sessions;
            } else if (assistant === 'deepseek') {
                dateEntry.deepseek += sessions;
            } else if (assistant === 'copilot') {
                dateEntry.copilot += sessions;
            } else if (assistant === 'claude') {
                dateEntry.claude += sessions;
            }
            
            dateEntry.total += sessions;
        }
        
        // Convert to array and sort by date
        // Ensure all fields are present in each entry
        const result = Array.from(dateMap.entries())
            .map(([date, data]) => ({
                date,
                chatgpt: data.chatgpt || 0,
                perplexity: data.perplexity || 0,
                gemini: data.gemini || 0,
                deepseek: data.deepseek || 0,
                copilot: data.copilot || 0,
                claude: data.claude || 0,
                total: data.total || 0,
            }))
            .sort((a, b) => a.date.localeCompare(b.date));
        
        return result;
    } catch (error: any) {
        // Check if it's an authentication error
        if (error.message?.includes('invalid authentication') || 
            error.message?.includes('Invalid Credentials') ||
            error.code === 401 ||
            error.status === 401) {
            logger.error('GA4 authentication failed - token may be invalid', { 
                errorMessage: error.message, 
                propertyId 
            });
            throw new Error('Authentication failed. Please reconnect GA4 in Settings.');
        }
        
        logger.error('Failed to fetch AI traffic time-series data', { errorMessage: error.message, propertyId });
        throw error;
    }
}

/**
 * Encrypt refresh token for storage
 */
export function encryptRefreshToken(refreshToken: string): string {
    return encrypt(refreshToken);
}

/**
 * Check if access token is expired or about to expire (within 5 minutes)
 */
export function isTokenExpired(expiresAt: Date | null): boolean {
    if (!expiresAt) return true;
    const bufferMs = 5 * 60 * 1000; // 5 minutes buffer
    return new Date(expiresAt).getTime() - bufferMs < Date.now();
}

