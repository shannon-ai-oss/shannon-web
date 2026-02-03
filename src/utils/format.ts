/**
 * Formatting utilities for the RealuseAI frontend
 */

/**
 * Format file size in bytes to human-readable string
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

/**
 * Format micro USD to regular USD string
 */
export const formatMicroUsd = (microUsd: number): string => {
  const usd = microUsd / 1000000;
  return usd.toFixed(4);
};

/**
 * Coerce value to token count or return null
 */
export const coerceTokenCount = (value: any): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.max(0, Math.round(value));
  }
  return null;
};

/**
 * Format duration in milliseconds to human-readable string
 */
export const formatDuration = (ms: number): string => {
  if (ms < 1000) {
    return `${ms}ms`;
  } else if (ms < 60000) {
    return `${(ms / 1000).toFixed(1)}s`;
  } else {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  }
};

/**
 * Format timestamp to relative time string
 */
export const formatRelativeTime = (timestamp: string | Date): string => {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) {
    return 'just now';
  } else if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  } else if (diffHours < 24) {
    return `${diffHours}h ago`;
  } else if (diffDays < 7) {
    return `${diffDays}d ago`;
  } else {
    return date.toLocaleDateString();
  }
};

/**
 * Format number with locale-specific formatting
 */
export const formatNumber = (num: number, locale: string = 'en-US'): string => {
  if (!Number.isFinite(num)) return '0';
  return num.toLocaleString(locale);
};

/**
 * Format currency amount
 */
export const formatCurrency = (
  amount: number,
  currency: string = 'USD',
  locale: string = 'en-US'
): string => {
  if (!Number.isFinite(amount)) return '$0.00';
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(amount);
};

/**
 * Truncate text with ellipsis
 */
export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
};

/**
 * Format percentage
 */
export const formatPercentage = (
  value: number,
  decimals: number = 1,
  locale: string = 'en-US'
): string => {
  if (!Number.isFinite(value)) return '0%';
  return `${value.toFixed(decimals)}%`;
};

/**
 * Format date to readable string
 */
export const formatDate = (
  date: string | Date,
  locale: string = 'en-US',
  options: Intl.DateTimeFormatOptions = {}
): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;

  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    ...options,
  };

  return dateObj.toLocaleDateString(locale, defaultOptions);
};

/**
 * Sanitize and format user input for display
 */
export const sanitizeInput = (input: string): string => {
  return input
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, 1000); // Limit to 1000 characters
};

/**
 * Format model name for display
 */
export const formatModelName = (model: string): string => {
  // Remove common prefixes and format nicely
  return model
    .replace(/^models\//, '')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase());
};

/**
 * Format provider name for display
 */
export const formatProviderName = (provider: string): string => {
  const providerMap: Record<string, string> = {
    shannon: 'Shannon',
  };

  return providerMap[provider.toLowerCase()] || provider;
};

/**
 * Format error message for user display
 */
export const formatErrorMessage = (error: any): string => {
  if (typeof error === 'string') {
    return error;
  }

  if (error?.message) {
    return error.message;
  }

  if (error?.error) {
    return error.error;
  }

  return 'An unexpected error occurred';
};

/**
 * Validate and format email
 */
export const formatEmail = (email: string): string => {
  return email.toLowerCase().trim();
};

/**
 * Format username for display
 */
export const formatUsername = (username: string): string => {
  return username.trim().slice(0, 50); // Limit to 50 characters
};

/**
 * Format chat title
 */
export const formatChatTitle = (title: string, maxLength: number = 50): string => {
  if (!title || title.trim() === '') {
    return 'New Chat';
  }

  return truncateText(title.trim(), maxLength);
};

/**
 * Format memory content for display
 */
export const formatMemoryContent = (content: string, maxLength: number = 200): string => {
  if (!content || content.trim() === '') {
    return 'No memory content';
  }

  return truncateText(content.trim(), maxLength);
};

/**
 * Convert markdown to plain text for preview
 */
export const markdownToPlainText = (markdown: string): string => {
  return markdown
    .replace(/\*\*(.*?)\*\*/g, '$1') // Bold
    .replace(/\*(.*?)\*/g, '$1') // Italic
    .replace(/`(.*?)`/g, '$1') // Inline code
    .replace(/```[\s\S]*?```/g, '[code block]') // Code blocks
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Links
    .replace(/#{1,6}\s+/g, '') // Headers
    .replace(/\n{3,}/g, '\n\n') // Multiple newlines
    .trim();
};

/**
 * Extract first sentence from text
 */
export const extractFirstSentence = (text: string): string => {
  const sentences = text.split(/[.!?]+/);
  if (sentences.length === 0) return '';

  const firstSentence = sentences[0].trim();
  return firstSentence || text.slice(0, 100);
};

/**
 * Format code block for display
 */
export const formatCodeBlock = (code: string, language?: string): string => {
  return `\`\`\`${language || ''}\n${code}\n\`\`\``;
};

/**
 * Check if string is a URL
 */
export const isValidUrl = (string: string): boolean => {
  try {
    new URL(string);
    return true;
  } catch {
    return false;
  }
};

/**
 * Format URL for display
 */
export const formatUrl = (url: string): string => {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname + urlObj.pathname;
  } catch {
    return url;
  }
};
