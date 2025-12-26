/**
 * WordPress Content Formatting Utilities
 * Converts FAQ and blog post content to WordPress post format
 */

import { FAQResult } from '../types';
import { WordPressPostData } from './wordpress';

export interface BlogPostMetadata {
    title?: string;
    excerpt?: string;
    categories?: string[];
    tags?: string[];
}

/**
 * Format FAQ content for WordPress
 */
export function formatFAQForWordPress(
    faqData: FAQResult,
    businessName?: string
): WordPressPostData {
    // Use HTML format from FAQ data
    let content = faqData.html || '';
    
    // If no HTML, generate from markdown
    if (!content && faqData.markdown) {
        content = convertMarkdownToHTML(faqData.markdown);
    }
    
    // Add JSON-LD schema to the post content
    // WordPress will render this in the page
    const jsonLdScript = `
<script type="application/ld+json">
${JSON.stringify(faqData.jsonLd, null, 2)}
</script>
`;
    
    // Append JSON-LD to content
    content += '\n\n' + jsonLdScript;
    
    // Generate title
    const title = businessName 
        ? `Frequently Asked Questions - ${businessName}`
        : 'Frequently Asked Questions';
    
    // Generate excerpt from first FAQ item
    const excerpt = faqData.items && faqData.items.length > 0
        ? faqData.items[0].answer.substring(0, 150) + '...'
        : undefined;
    
    return {
        title,
        content,
        status: 'publish',
        excerpt,
    };
}

/**
 * Format blog post content for WordPress
 */
export function formatBlogPostForWordPress(
    content: string,
    metadata?: BlogPostMetadata
): WordPressPostData {
    // Convert markdown to HTML if needed
    let htmlContent = content;
    if (isMarkdown(content)) {
        htmlContent = convertMarkdownToHTML(content);
    }
    
    return {
        title: metadata?.title || 'Blog Post',
        content: htmlContent,
        status: 'publish',
        excerpt: metadata?.excerpt,
        // Note: categories and tags would need to be resolved to IDs
        // This is handled in the WordPress routes
    };
}

/**
 * Check if content is markdown
 */
function isMarkdown(content: string): boolean {
    // Simple heuristic: check for markdown patterns
    const markdownPatterns = [
        /^#{1,6}\s/m,           // Headers
        /\*\*.*?\*\*/,          // Bold
        /\*.*?\*/,              // Italic
        /\[.*?\]\(.*?\)/,       // Links
        /^\s*[-*+]\s/m,         // Lists
        /^\s*\d+\.\s/m,         // Numbered lists
    ];
    
    return markdownPatterns.some(pattern => pattern.test(content));
}

/**
 * Convert markdown to HTML (basic conversion)
 * For production, consider using a proper markdown library
 */
function convertMarkdownToHTML(markdown: string): string {
    let html = markdown;
    
    // Headers
    html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
    
    // Bold
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Italic
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    // Links
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
    
    // Line breaks
    html = html.replace(/\n\n/g, '</p><p>');
    html = html.replace(/\n/g, '<br>');
    
    // Wrap in paragraph tags
    if (!html.startsWith('<')) {
        html = '<p>' + html + '</p>';
    }
    
    return html;
}

/**
 * Format FAQ HTML from geo_assets for WordPress
 */
export function formatFAQFromGeoAssets(
    faqHtml: string,
    faqJsonLd: any,
    businessName?: string
): WordPressPostData {
    let content = faqHtml || '';
    
    // Add JSON-LD schema if provided
    if (faqJsonLd) {
        const jsonLdScript = `
<script type="application/ld+json">
${JSON.stringify(faqJsonLd, null, 2)}
</script>
`;
        content += '\n\n' + jsonLdScript;
    }
    
    const title = businessName 
        ? `Frequently Asked Questions - ${businessName}`
        : 'Frequently Asked Questions';
    
    return {
        title,
        content,
        status: 'publish',
    };
}

/**
 * Sanitize WordPress post title
 */
export function sanitizeWordPressTitle(title: string): string {
    // Remove HTML tags
    return title.replace(/<[^>]*>/g, '').trim();
}

/**
 * Generate excerpt from content
 */
export function generateExcerpt(content: string, maxLength: number = 150): string {
    // Remove HTML tags
    const text = content.replace(/<[^>]*>/g, '');
    
    if (text.length <= maxLength) {
        return text;
    }
    
    // Truncate at word boundary
    const truncated = text.substring(0, maxLength);
    const lastSpace = truncated.lastIndexOf(' ');
    
    if (lastSpace > 0) {
        return truncated.substring(0, lastSpace) + '...';
    }
    
    return truncated + '...';
}

