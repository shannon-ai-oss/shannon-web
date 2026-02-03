/**
 * Markdown configuration for ReactMarkdown
 */
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize, { defaultSchema as rehypeDefaultSchema } from 'rehype-sanitize';
import { extendList } from '../utils/messageHelpers';

export const markdownSanitizeSchema = {
  ...rehypeDefaultSchema,
  tagNames: extendList(rehypeDefaultSchema?.tagNames, [
    'section',
    'article',
    'aside',
    'header',
    'footer',
    'figure',
    'figcaption',
    'sup',
    'sub',
    'span',
    'div',
    'ol',
    'ul',
    'li',
    'table',
    'thead',
    'tbody',
    'tfoot',
    'tr',
    'th',
    'td',
    'hr',
  ]),
  attributes: {
    ...rehypeDefaultSchema?.attributes,
    '*': extendList(rehypeDefaultSchema?.attributes?.['*'], [
      'className',
      'id',
      'title',
      'aria-label',
      'aria-hidden',
      'role',
    ]),
    a: extendList(rehypeDefaultSchema?.attributes?.a, [
      'href',
      'title',
      'target',
      'rel',
    ]),
    code: extendList(rehypeDefaultSchema?.attributes?.code, ['className']),
    div: extendList(rehypeDefaultSchema?.attributes?.div, ['className', 'id', 'role', 'aria-live']),
    span: extendList(rehypeDefaultSchema?.attributes?.span, ['className', 'id', 'aria-label', 'data-type']),
    ol: extendList(rehypeDefaultSchema?.attributes?.ol, ['start', 'type']),
    ul: extendList(rehypeDefaultSchema?.attributes?.ul, ['type']),
    li: extendList(rehypeDefaultSchema?.attributes?.li, ['value']),
    table: extendList(rehypeDefaultSchema?.attributes?.table, ['className']),
    th: extendList(rehypeDefaultSchema?.attributes?.th, ['align']),
    td: extendList(rehypeDefaultSchema?.attributes?.td, ['align']),
  },
};

export const markdownRemarkPlugins = [[remarkMath, { singleDollarTextMath: true }], remarkGfm];
export const markdownRehypePlugins = [rehypeRaw, [rehypeSanitize, markdownSanitizeSchema], rehypeKatex];
