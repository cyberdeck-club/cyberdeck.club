/**
 * MarkdownRenderer - Secure markdown rendering with XSS protection
 * Uses marked for parsing and sanitize-html for sanitization.
 * Works in both browser and server (Cloudflare Workers) environments.
 */

import { marked } from "marked";
import sanitize from "sanitize-html";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

// Configure marked for safe rendering
const markedInstance = marked.setOptions({
  breaks: true, // Convert \n to <br>
  gfm: true, // GitHub Flavored Markdown
});

// Sanitization configuration for sanitize-html
// Allows safe markdown constructs, strips dangerous HTML/attributes
const SANITIZE_CONFIG = {
  allowedTags: [
    "h1", "h2", "h3", "h4", "h5", "h6",
    "p", "br", "hr",
    "strong", "em", "del", "s", "mark", "u",
    "ul", "ol", "li",
    "blockquote",
    "pre", "code",
    "a",
    "img",
    "table", "thead", "tbody", "tr", "th", "td",
    "div", "span",
  ],
  allowedAttributes: {
    "a": ["href", "title", "class", "id", "rel"],
    "img": ["src", "alt", "title", "class", "id"],
    "*": ["class", "id"],
  },
  disallowedTagsMode: "recursiveEscape" as const,
  forceBdo: true,
};

/**
 * Strip javascript: URLs from href attributes
 * and add rel="noopener noreferrer" to all links for security
 */
function sanitizeLinks(html: string): string {
  // Strip javascript: URLs
  let sanitized = html.replace(/href="javascript:[^"]*"/gi, 'href="#"');
  // Add rel="noopener noreferrer" to all anchor tags for security
  sanitized = sanitized.replace(/<a /g, '<a rel="noopener noreferrer" ');
  // Ensure all external links have proper rel attributes (already handled above)
  // but double-check for any that might have been missed
  sanitized = sanitized.replace(/<a([^>]*href="http[^"]*")/g, '<a rel="noopener noreferrer" $1');
  return sanitized;
}

/**
 * Render markdown to sanitized HTML string.
 * Use this for server-side rendering or when you need the HTML string directly.
 */
export function renderMarkdownToHtml(markdown: string): string {
  const rawHtml = markedInstance.parse(markdown) as string;
  const withCleanLinks = sanitizeLinks(rawHtml);
  return sanitize(withCleanLinks, SANITIZE_CONFIG);
}

/**
 * MarkdownRenderer React component.
 * Renders markdown content with XSS protection.
 */
export const MarkdownRenderer = ({ content, className = "" }: MarkdownRendererProps) => {
  const html = renderMarkdownToHtml(content);
  return <div className={className} dangerouslySetInnerHTML={{ __html: html }} />;
};
