/**
 * Custom markdown components for ReactMarkdown with Mermaid + math handling.
 */
import React, { Suspense, useCallback, useMemo, useRef } from 'react';
import ReactMarkdown from 'react-markdown';

import { MarkdownRenderContext } from '@/context/MarkdownRenderContext';
import { fixMermaidInContent } from '@/utils/mermaidFixer';
import { markdownRemarkPlugins, markdownRehypePlugins } from '../config/markdownConfig';
const MathRenderer = React.lazy(() =>
  import('./MathRenderer').then((module) => ({ default: module.MathRenderer })),
);

const MermaidDiagram = React.lazy(() => import('./MermaidDiagram'));

const MERMAID_BLOCK_PATTERN =
  /```mermaid([^\n\r]*)\r?\n([\s\S]*?)(\r?\n?)```/g;

const replaceNthMermaidBlock = (body, index, nextCode) => {
  if (typeof body !== 'string' || index == null || index < 0) {
    return null;
  }

  let cursor = 0;
  let occurrences = 0;
  let result = '';
  let match;
  const input = body;

  while ((match = MERMAID_BLOCK_PATTERN.exec(input)) !== null) {
    const [full, fenceOptions = '', inner, trailingNewline = ''] = match;
    const start = match.index;
    const end = start + full.length;

    if (occurrences === index) {
      result += input.slice(cursor, start);
      const newline = trailingNewline || (nextCode.endsWith('\n') ? '' : '\n');
      result += `\`\`\`mermaid${fenceOptions}\n${nextCode}${newline}\`\`\``;
      cursor = end;
    }

    occurrences += 1;
  }

  if (occurrences <= index) {
    return null;
  }

  result += input.slice(cursor);
  return result;
};

const createMarkdownComponents = (getNextMermaidIndex) => {
  const renderMath = (props, inlineFallback = false) => (
    <Suspense
      fallback={
        inlineFallback ? (
          <code className="claude-md-inline-code">{props.content}</code>
        ) : (
          <div className="claude-math-loading">Rendering math...</div>
        )
      }
    >
      <MathRenderer {...props} />
    </Suspense>
  );

  return {
  code({ inline, className, children, ...props }) {
    const languageMatch = /language-(\w+)/.exec(className || '');
    const language = languageMatch ? languageMatch[1] : '';
    const normalizedLanguage = (language || '').toLowerCase();
    const mathLanguagePattern = /language-(math|tex|latex)/i;
    const hasMathLanguageClass = mathLanguagePattern.test(className || '');
    const isMathBlock =
      !inline && (hasMathLanguageClass || ['math', 'tex', 'latex'].includes(normalizedLanguage));
    const isMathInline = inline && hasMathLanguageClass;

    if (isMathBlock || isMathInline) {
      const raw = String(children).trim();
      return renderMath(
        {
          content: raw,
          displayMode: !isMathInline,
          inline: isMathInline,
          __blockType: "math",
        },
        isMathInline,
      );
    }

    if (inline) {
      const content = String(children);
      const looksLikeMath = /\$.*\\ce\{|\\text\{|\\[a-zA-Z]+\{|\$\$/.test(content);

      if (looksLikeMath) {
        return renderMath(
          {
            content,
            displayMode: false,
            inline: true,
            __blockType: "math",
          },
          true,
        );
      }

      return (
        <code className="claude-md-inline-code" {...props}>
          {children}
        </code>
      );
    }

    if (normalizedLanguage === 'mermaid') {
      const mermaidSource = String(children).trim();
      const blockIndex = getNextMermaidIndex();
      return (
        <Suspense fallback={<div className="claude-mermaid-loading">Loading diagram…</div>}>
          <MermaidDiagram
            source={mermaidSource}
            blockIndex={blockIndex}
            __blockType="mermaid"
          />
        </Suspense>
      );
    }

    return (
      <code className={className} {...props}>
        {children}
      </code>
    );
  },
  pre({ children, ...props }) {
    const childArray = React.Children.toArray(children);
    if (childArray.length !== 1 || !React.isValidElement(childArray[0])) {
      return <pre {...props}>{children}</pre>;
    }

    const child = childArray[0];
    const blockType = child.props?.__blockType;

    if (blockType === 'math' || blockType === 'mermaid') {
      return <>{child}</>;
    }

    const className = child.props?.className || '';
    const languageMatch = /language-(\w+)/.exec(className || '');
    const language = languageMatch?.[1] || '';
    const raw = (() => {
      const value = child.props?.children;
      if (Array.isArray(value)) {
        return value.join('');
      }
      return String(value ?? '');
    })();

    const handleCopy = () => {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        navigator.clipboard.writeText(raw);
      }
    };

    return (
      <div className="claude-md-code-wrapper">
        {(language || raw) && (
          <div className="claude-code-header">
            {language && <span className="claude-code-language">{language}</span>}
            <button className="claude-code-copy" onClick={handleCopy} title="Copy code">
              Copy
            </button>
          </div>
        )}
        <pre className={`claude-md-code-block ${className || ''}`} {...props}>
          {React.cloneElement(child, { ...child.props })}
        </pre>
      </div>
    );
  },
  a({ children, href, ...props }) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="claude-md-link"
        {...props}
      >
        {children}
      </a>
    );
  },
  blockquote({ children, ...props }) {
    return (
      <blockquote className="claude-md-blockquote" {...props}>
        {children}
      </blockquote>
    );
  },
  table({ children, ...props }) {
    return (
      <div className="claude-table-wrapper">
        <table className="claude-md-table" {...props}>
          {children}
        </table>
      </div>
    );
  },
  th({ children, ...props }) {
    return (
      <th className="claude-md-th" {...props}>
        {children}
      </th>
    );
  },
  td({ children, ...props }) {
    return (
      <td className="claude-md-td" {...props}>
        {children}
      </td>
    );
  },
  ul({ children, ...props }) {
    return (
      <ul className="claude-md-ul" {...props}>
        {children}
      </ul>
    );
  },
  };
};

const MarkdownRenderer = ({ markdown, contextLabel, options = {} }) => {
  const safeContext = contextLabel ? `[Markdown Error:${contextLabel}]` : '[Markdown Error]';
  const content = typeof markdown === 'string' ? markdown : String(markdown ?? '');
  const contentRef = useRef(content);
  const blockCounterRef = useRef(0);

  contentRef.current = content;
  blockCounterRef.current = 0;

  const getNextMermaidIndex = useCallback(() => {
    const current = blockCounterRef.current;
    blockCounterRef.current += 1;
    return current;
  }, []);

  const replaceMermaidBlock = useCallback(
    async (blockIndex, nextCode, meta = {}) => {
      const previous = contentRef.current;
      const replaced = replaceNthMermaidBlock(previous, blockIndex, nextCode);
      if (!replaced) {
        throw new Error('Unable to locate Mermaid block for update.');
      }

      contentRef.current = replaced;

      if (typeof options.onUpdateContent === 'function') {
        try {
          const fixResult = fixMermaidInContent(replaced);
          contentRef.current = fixResult.content;
          await options.onUpdateContent(fixResult.content, {
            ...meta,
            blockIndex,
            fixes: fixResult.fixes,
          });
        } catch (error) {
          contentRef.current = previous;
          throw error;
        }
      }
    },
    [options.onUpdateContent],
  );

  const contextValue = useMemo(
    () => ({
      chatId: options.chatId ?? null,
      messageId: options.messageId ?? null,
      getNextMermaidIndex,
      replaceMermaidBlock,
    }),
    [getNextMermaidIndex, options.chatId, options.messageId, replaceMermaidBlock],
  );

  const components = useMemo(
    () => createMarkdownComponents(getNextMermaidIndex),
    [getNextMermaidIndex],
  );

  try {
    return (
      <MarkdownRenderContext.Provider value={contextValue}>
        <ReactMarkdown
          remarkPlugins={markdownRemarkPlugins}
          rehypePlugins={markdownRehypePlugins}
          components={components}
        >
          {content}
        </ReactMarkdown>
      </MarkdownRenderContext.Provider>
    );
  } catch (error) {
    const snippet = content.slice(0, 2000);
    console.error(safeContext, error);

    return (
      <div className="claude-markdown-fallback">
        <details className="claude-markdown-error-details">
          <summary>Rendering Error</summary>
          <pre>{String(error?.message || error)}</pre>
        </details>
        <pre className="claude-markdown-fallback-code">
          <code>{snippet}</code>
        </pre>
      </div>
    );
  }
};

/**
 * Renders markdown safely with optional message context for diagram editing.
 * @param {string} markdown - Markdown content to render.
 * @param {string} contextLabel - Label for error context.
 * @param {object} options - Optional context (chatId, messageId, onUpdateContent).
 * @returns {JSX.Element}
 */
export const renderMarkdownSafely = (markdown, contextLabel, options) => (
  <MarkdownRenderer markdown={markdown} contextLabel={contextLabel} options={options} />
);

export default MarkdownRenderer;
