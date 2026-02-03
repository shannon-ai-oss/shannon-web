/**
 * Markdown preparation utilities
 */
import { normalizeMarkdownTables } from './markdown.js';
import { normalizeMathDelimiters } from './mathHelpers';
import { stripSpecialTags } from './messageHelpers';

/**
 * Prepares markdown content for rendering
 * @param {string} input - Raw markdown input
 * @returns {string} Prepared markdown
 */
export const prepareMarkdownContent = (input) => 
  normalizeMathDelimiters(normalizeMarkdownTables(input || ''));

/**
 * Sanitizes markdown input by stripping tags and preparing content
 * @param {string} input - Raw markdown input
 * @returns {string} Sanitized markdown
 */
export const sanitizeMarkdownInput = (input) => 
  prepareMarkdownContent(stripSpecialTags(input || ''));
