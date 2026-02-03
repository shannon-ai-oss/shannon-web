/**
 * MathRenderer component for rendering KaTeX math expressions
 */
import React, { useEffect, useId, useMemo, useState } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import 'katex/dist/contrib/mhchem.min.js';
import { sanitizeMathSource } from '../utils/mathHelpers';
import { requestRepair } from '../api/repair';
import { useAuth } from '@/context/AuthContext';

export const MathRenderer = ({ content, displayMode, inline, __blockType, ...rest }) => {
  const sanitizedContent = sanitizeMathSource(content, { inline });
  const { token, user } = useAuth();
  const [source, setSource] = useState(sanitizedContent);
  const [html, setHtml] = useState('');
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isRepairing, setIsRepairing] = useState(false);
  const [repairError, setRepairError] = useState(null);
  const [overrideSource, setOverrideSource] = useState(null);
  const [customPrompt, setCustomPrompt] = useState('');
  const repairInputId = useId();
  const repairInputIdSafe = useMemo(
    () => `math-repair-${repairInputId.replace(/:/g, '')}`,
    [repairInputId],
  );

  useEffect(() => {
    setOverrideSource(null);
    setCustomPrompt('');
  }, [sanitizedContent]);

  useEffect(() => {
    if (!isEditing && !isRepairing) {
      const nextSource =
        overrideSource != null ? overrideSource : sanitizedContent;
      setSource(sanitizeMathSource(nextSource, { inline }));
    }
  }, [sanitizedContent, isEditing, isRepairing, overrideSource, inline]);

  useEffect(() => {
    const preparedSource = sanitizeMathSource(source, { inline });
    try {
      const rendered = katex.renderToString(preparedSource, {
        throwOnError: false,
        strict: false,
        displayMode,
        trust: true,
        macros: {
          '\\RR': '\\mathbb{R}',
          '\\NN': '\\mathbb{N}',
          '\\ZZ': '\\mathbb{Z}',
          '\\QQ': '\\mathbb{Q}',
          '\\CC': '\\mathbb{C}',
        },
        fleqn: false,
        leqno: false,
        maxSize: Infinity,
        maxExpand: 1000,
        globalGroup: false,
      });
      setHtml(rendered);
      setError(null);
    } catch (err) {
      // Try fallback rendering with even more permissive settings
      try {
        const fallbackRendered = katex.renderToString(preparedSource, {
          throwOnError: false,
          strict: 'ignore',
          displayMode,
          trust: true,
          errorColor: '#cc0000',
        });
        setHtml(fallbackRendered);
        setError(null);
      } catch (fallbackErr) {
        setHtml('');
        setError(fallbackErr);
      }
    }
  }, [source, displayMode, inline]);

  useEffect(() => {
    if (error) {
      console.error('[KaTeX Error]', {
        error,
        snippet: sanitizeMathSource(source, { inline }).slice(0, 2000),
      });
    }
  }, [error, source, inline]);

  const handleRepair = () => {
    setRepairError(null);
    setIsEditing(true);
  };

  const handleCancel = () => {
    setSource(overrideSource ?? sanitizedContent);
    setIsEditing(false);
    setRepairError(null);
    setCustomPrompt('');
  };

  const handleCopy = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(source);
    }
  };

  const handleSave = () => {
    if (!error) {
      setOverrideSource(source);
      setIsEditing(false);
      setRepairError(null);
      setCustomPrompt('');
    }
  };

  const handleDeepseekRepair = async () => {
    if (isRepairing) {
      return;
    }
    if (!token) {
      setRepairError('Sign in to run AI Fix.');
      setIsEditing(true);
      return;
    }
    setIsRepairing(true);
    setRepairError(null);
    try {
      const { repaired } = await requestRepair(token, {
        kind: 'latex',
        snippet: source,
        prompt: customPrompt || undefined,
        uid: user?.uid,
      });
      const cleaned = (repaired || '').trim();
      if (!cleaned) {
        throw new Error('AI repair returned an empty result.');
      }
      const sanitizedRepair = sanitizeMathSource(cleaned, { inline });
      setOverrideSource(sanitizedRepair);
      setSource(sanitizedRepair);
      setIsEditing(false);
      setRepairError(null);
      setCustomPrompt('');
    } catch (err) {
      setRepairError(err?.message || 'AI repair failed.');
      setIsEditing(true);
    } finally {
      setIsRepairing(false);
    }
  };

  if (inline) {
    if (error) {
      // For inline math errors, show a compact error display with AI Fix and hover tooltip
      return (
        <span className="claude-math-inline-error" title={`KaTeX Error: ${error.message || 'Unable to render'}`}>
          <code className="claude-md-inline-code">{sanitizedContent}</code>
          <button
            type="button"
            className="claude-repair-button-mini"
            onClick={handleDeepseekRepair}
            disabled={isRepairing}
            title={error.message || 'KaTeX error - click to fix'}
          >
            {isRepairing ? '⟳' : '✨'}
          </button>
        </span>
      );
    }

    return <span className="katex" dangerouslySetInnerHTML={{ __html: html }} />;
  }

  if (isEditing) {
    return (
      <div className="claude-math-editor">
        <textarea
          className="claude-math-textarea"
          value={source}
          onChange={(event) => setSource(event.target.value)}
          spellCheck={false}
          rows={Math.max(6, source.split('\n').length)}
          aria-label="Edit math expression"
        />
        {error ? (
          <div className="claude-math-editor-error" role="alert">
            <p>{error.message || 'Unable to render math expression.'}</p>
          </div>
        ) : (
          <div
            className="claude-math-preview"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        )}
        <label className="claude-repair-label" htmlFor={repairInputIdSafe}>
          AI Fix instructions (optional)
        </label>
        <textarea
          id={repairInputIdSafe}
          className="claude-repair-input"
          placeholder="Add extra reasoning guidance"
          value={customPrompt}
          onChange={(event) => setCustomPrompt(event.target.value)}
          rows={2}
        />
        <div className="claude-math-editor-actions">
          <button type="button" className="claude-code-copy" onClick={handleSave} disabled={Boolean(error)}>
            Apply Fix
          </button>
          <button type="button" className="claude-code-copy" onClick={handleCancel}>
            Cancel
          </button>
          <button type="button" className="claude-code-copy" onClick={handleCopy}>
            Copy Source
          </button>
          <button
            type="button"
            className="claude-repair-button"
            onClick={handleDeepseekRepair}
            disabled={isRepairing}
          >
            {isRepairing ? 'AI Fixing…' : 'AI Fix'}
          </button>
        </div>
        {repairError && <p className="claude-repair-feedback">{repairError}</p>}
      </div>
    );
  }

  if (error) {
    return (
      <div className="claude-math-error" role="alert" title={`KaTeX Error: ${error.message || 'Unable to render'}`}>
        <div className="claude-math-error-header">
          <span>KaTeX error: {error.message || 'Unable to render math expression.'}</span>
          <div className="claude-math-toolbar">
            <button
              type="button"
              className="claude-repair-button"
              onClick={handleDeepseekRepair}
              disabled={isRepairing}
            >
              {isRepairing ? 'AI Fixing…' : 'AI Fix'}
            </button>
            <button type="button" className="claude-code-copy" onClick={handleCopy}>
              Copy Source
            </button>
            <button type="button" className="claude-code-copy" onClick={handleRepair}>
              Manual Fix
            </button>
          </div>
        </div>
        <pre className="claude-math-source">{source}</pre>
        {repairError && <p className="claude-repair-feedback">{repairError}</p>}
      </div>
    );
  }

  return <div className="katex-display" dangerouslySetInnerHTML={{ __html: html }} />;
};
