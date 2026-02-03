import React, { useState, useCallback } from 'react';
import { Highlight, themes } from 'prism-react-renderer';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Copy, Terminal } from 'lucide-react';
import './CodeBlock.css';

// Custom dark theme based on VS Code
const customTheme = {
  ...themes.vsDark,
  plain: {
    color: '#e0e0e0',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  styles: [
    ...themes.vsDark.styles,
    {
      types: ['comment', 'prolog', 'doctype', 'cdata'],
      style: { color: '#6a9955' },
    },
    {
      types: ['string', 'attr-value'],
      style: { color: '#ce9178' },
    },
    {
      types: ['keyword', 'selector', 'important'],
      style: { color: '#569cd6' },
    },
    {
      types: ['function', 'function-variable'],
      style: { color: '#dcdcaa' },
    },
    {
      types: ['number', 'boolean'],
      style: { color: '#b5cea8' },
    },
    {
      types: ['operator', 'punctuation'],
      style: { color: '#d4d4d4' },
    },
    {
      types: ['class-name', 'constant'],
      style: { color: '#4ec9b0' },
    },
    {
      types: ['property'],
      style: { color: '#9cdcfe' },
    },
  ],
};

// Language display names
const LANGUAGE_NAMES = {
  bash: 'cURL',
  shell: 'Shell',
  python: 'Python',
  javascript: 'JavaScript',
  typescript: 'TypeScript',
  json: 'JSON',
  http: 'HTTP',
  go: 'Go',
  ruby: 'Ruby',
  php: 'PHP',
  rust: 'Rust',
};

const CodeBlock = ({
  code,
  language = 'javascript',
  showLineNumbers = false,
  showHeader = true,
  title,
  className = '',
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, [code]);

  // Map language aliases
  const mappedLanguage = language === 'curl' ? 'bash' : language;
  const displayLanguage = LANGUAGE_NAMES[mappedLanguage] || language;

  return (
    <motion.div
      className={`code-block-container ${className}`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {showHeader && (
        <div className="code-block-header">
          <div className="code-block-header-left">
            <Terminal size={14} className="code-terminal-icon" />
            <span className="code-language">{title || displayLanguage}</span>
          </div>
          <motion.button
            className="code-copy-btn"
            onClick={handleCopy}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            aria-label={copied ? 'Copied!' : 'Copy code'}
          >
            <AnimatePresence mode="wait">
              {copied ? (
                <motion.span
                  key="check"
                  className="copy-status"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.15 }}
                >
                  <Check size={14} />
                  <span>Copied!</span>
                </motion.span>
              ) : (
                <motion.span
                  key="copy"
                  className="copy-status"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.15 }}
                >
                  <Copy size={14} />
                  <span>Copy</span>
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        </div>
      )}

      <Highlight
        theme={customTheme}
        code={code.trim()}
        language={mappedLanguage}
      >
        {({ className: hlClassName, style, tokens, getLineProps, getTokenProps }) => (
          <pre
            className={`code-block-pre ${hlClassName}`}
            style={{
              ...style,
              margin: 0,
              padding: '16px 20px',
              background: 'transparent',
              overflow: 'auto',
            }}
          >
            {tokens.map((line, i) => {
              const lineProps = getLineProps({ line, key: i });
              return (
                <div
                  key={i}
                  {...lineProps}
                  className={`code-line ${lineProps.className || ''}`}
                >
                  {showLineNumbers && (
                    <span className="line-number">{i + 1}</span>
                  )}
                  <span className="line-content">
                    {line.map((token, key) => (
                      <span key={key} {...getTokenProps({ token, key })} />
                    ))}
                  </span>
                </div>
              );
            })}
          </pre>
        )}
      </Highlight>
    </motion.div>
  );
};

export default CodeBlock;
