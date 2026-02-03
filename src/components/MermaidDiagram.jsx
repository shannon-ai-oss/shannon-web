import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { requestRepair } from '../api/repair';
import { useAuth } from '@/context/AuthContext';
import DiagramErrorBoundary from './DiagramErrorBoundary.jsx';
import { useMarkdownRenderContext } from '@/context/MarkdownRenderContext';

const MERMAID_ERROR_MESSAGE =
  'mermaid error. the fixer system is broken. you can try manual fix, regenerate. we gonna make the new concise functional fixer next week';

let mermaidInitialized = false;

const initializeMermaid = () => {
  if (mermaidInitialized || typeof window === 'undefined') {
    return;
  }

  mermaid.initialize({ startOnLoad: false });
  mermaidInitialized = true;
};

const normalizeMermaidSource = (value) => {
  if (!value || typeof value !== 'string') {
    return '';
  }
  const trimmed = value.trim();
  const allowed = /^(graph|flowchart|sequenceDiagram|classDiagram|stateDiagram|erDiagram|journey|gantt|gitGraph|pie|mindmap|timeline|quadrantChart|xychart)/i;
  if (allowed.test(trimmed)) {
    return trimmed;
  }
  const lines = trimmed.split(/\r?\n/);
  const index = lines.findIndex((line) => allowed.test(line.trim()));
  if (index >= 0) {
    return lines.slice(index).join('\n').trim();
  }
  return trimmed;
};

const createMermaidDebugInfo = (error, definition) => {
  const message = error?.message || 'Unable to render Mermaid diagram.';
  const hash = error?.hash || {};

  const coerceNumber = (value) => {
    if (value == null) {
      return null;
    }
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : null;
  };

  let line = null;
  let column = null;

  if (hash.loc) {
    line = coerceNumber(hash.loc.first_line ?? hash.loc.last_line);
    column = coerceNumber(hash.loc.first_column ?? hash.loc.last_column);
  } else {
    line = coerceNumber(hash.line);
    column = coerceNumber(hash.column);
  }

  if (line == null && typeof message === 'string') {
    const match = message.match(/line\s+(\d+)/i);
    if (match) {
      line = coerceNumber(match[1]);
    }
  }

  if (column == null && typeof message === 'string') {
    const match = message.match(/column\s+(\d+)/i);
    if (match) {
      column = coerceNumber(match[1]);
    }
  }

  const expected = Array.isArray(hash.expected) ? hash.expected : null;
  const lines = definition.split(/\r?\n/);
  let snippet = [];

  if (line != null && line > 0) {
    const start = Math.max(0, line - 3);
    const end = Math.min(lines.length, line + 2);
    snippet = lines.slice(start, end).map((text, index) => {
      const lineNumber = start + index + 1;
      return {
        lineNumber,
        text,
        highlight: lineNumber === line,
      };
    });
  }

  return {
    message,
    line,
    column,
    expected,
    snippet,
  };
};

const MermaidDiagram = React.memo(({ source, blockIndex }) => {
  const { token, user } = useAuth();
  const markdownContext = useMarkdownRenderContext() || {};
  const persistMermaidBlock = markdownContext.replaceMermaidBlock || null;
  const [diagramSource, setDiagramSource] = useState(source ?? '');
  const [draft, setDraft] = useState(source ?? '');
  const [svgContent, setSvgContent] = useState('');
  const [renderError, setRenderError] = useState('');
  const [debugInfo, setDebugInfo] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isRepairing, setIsRepairing] = useState(false);
  const [repairError, setRepairError] = useState('');
  const [customPrompt, setCustomPrompt] = useState('');
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef(null);
  const diagramWrapperRef = useRef(null);
  const bindFunctionsRef = useRef(null);
  const renderId = useId();
  const renderKey = useMemo(
    () => `mermaid-${renderId.replace(/:/g, '')}`,
    [renderId],
  );

  useEffect(() => {
    initializeMermaid();
  }, []);

  useEffect(() => {
    if (isEditing) {
      return;
    }

    // Only sync from source prop if we haven't repaired/edited yet
    // If diagramSource exists and differs from source, keep the repaired version
    const incoming = source ?? '';
    
    setDiagramSource((prev) => {
      // If we have no previous source, use incoming
      if (!prev) {
        return incoming;
      }
      // If incoming matches previous, no change
      if (prev === incoming) {
        return prev;
      }
      // If we have a previous value that differs from incoming,
      // keep the previous (might be repaired/edited)
      // UNLESS the incoming value is substantially different (new diagram)
      // Check if this is a new prop source by comparing length
      if (Math.abs(prev.length - incoming.length) > prev.length * 0.5) {
        // Substantial change, likely new diagram
        return incoming;
      }
      // Keep repaired version
      return prev;
    });
    
    setDraft((prev) => {
      if (!prev || prev === incoming) {
        return incoming;
      }
      // Keep edited draft
      return prev;
    });
    
    if (!incoming) {
      setRepairError('');
    }
  }, [isEditing, source]);

  useEffect(() => {
    if (!isEditing) {
      setCustomPrompt('');
    }
  }, [isEditing, diagramSource]);

  useEffect(() => {
    let canceled = false;

    const render = async () => {
      initializeMermaid();
      const definition = (diagramSource || '').trim();

      if (!definition) {
        setSvgContent('');
        setRenderError('');
        setDebugInfo(null);
        bindFunctionsRef.current = null;
        return;
      }

      try {
        await mermaid.parse(definition);
      } catch (error) {
        if (canceled) {
          return;
        }

        const info = createMermaidDebugInfo(error, definition);
        console.error('[Mermaid Error] parse failure', {
          error,
          snippet: definition.slice(0, 2000),
        });
        setSvgContent('');
        setRenderError(info.message);
        setDebugInfo(info);
        bindFunctionsRef.current = null;
        return;
      }

      try {
        const { svg, bindFunctions } = await mermaid.render(renderKey, definition);

        if (canceled) {
          return;
        }

        setSvgContent(svg);
        setRenderError('');
        setDebugInfo(null);
        bindFunctionsRef.current = bindFunctions;
      } catch (error) {
        if (canceled) {
          return;
        }

        setSvgContent('');
        const info = createMermaidDebugInfo(error, definition);
        console.error('[Mermaid Error] render failure', {
          error,
          snippet: definition.slice(0, 2000),
        });
        setRenderError(info.message);
        setDebugInfo(info);
        bindFunctionsRef.current = null;
      }
    };

    render();

    return () => {
      canceled = true;
    };
  }, [diagramSource, renderKey]);

  useEffect(() => {
    if (!svgContent || !containerRef.current) {
      return;
    }

    bindFunctionsRef.current?.(containerRef.current);
  }, [svgContent]);

  const handleCopy = () => {
    const text = (diagramSource || '').trim();

    if (typeof navigator === 'undefined' || !navigator.clipboard) {
      return;
    }

    navigator.clipboard.writeText(text);
  };

  const handleEditToggle = () => {
    setDraft(diagramSource ?? '');
    setRenderError('');
    setDebugInfo(null);
    setIsEditing(true);
  };

  const handleRepair = () => {
    if (renderError) {
      setDraft(diagramSource ?? '');
      setRenderError('');
      setDebugInfo(null);
      setIsEditing(true);
    }
  };

  const handleDeepseekRepair = async () => {
    if (isRepairing) {
      return;
    }
    if (!token || !user?.uid) {
      setRepairError('Sign in to run AI Fix.');
      setIsEditing(true);
      return;
    }
    setIsRepairing(true);
    setRepairError('');
    const snippet = (isEditing ? draft : diagramSource || '').trim();
    try {
      const stripCodeFences = (value) => {
        if (!value) {
          return '';
        }
        const trimmed = value.trim();
        if (!trimmed.startsWith('```')) {
          return trimmed;
        }
        return trimmed
          .replace(/^```[a-zA-Z0-9_-]*\s*\n?/, '')
          .replace(/```$/, '')
          .trim();
      };
      const errorContext = (() => {
        if (debugInfo) {
          const { message, line, column, expected } = debugInfo;
          const limitedExpected = Array.isArray(expected) ? expected.slice(0, 5) : undefined;
          return {
            message: message || renderError || '',
            line: typeof line === 'number' ? line : undefined,
            column: typeof column === 'number' ? column : undefined,
            expected: limitedExpected,
          };
        }
        if (renderError) {
          return { message: renderError };
        }
        return undefined;
      })();

      const result = await requestRepair(token, {
        kind: 'mermaid',
        snippet,
        prompt: customPrompt || undefined,
        uid: user.uid,
        error: errorContext,
      });
      const candidate = (result?.repaired || '').trim();
      if (!candidate) {
        throw new Error('AI repair returned an empty result.');
      }
      const cleaned = stripCodeFences(candidate);
      const normalized = normalizeMermaidSource(cleaned);
      if (!normalized) {
        throw new Error('AI repair returned an empty result.');
      }
      setDiagramSource(normalized);
      setDraft(normalized);
      setRenderError('');
      setDebugInfo(null);
      setIsEditing(false);
      setCustomPrompt('');
      setRepairError('');
      if (typeof persistMermaidBlock === 'function' && Number.isInteger(blockIndex)) {
        void persistMermaidBlock(blockIndex, normalized, {
          source: 'ai-fix',
          actor: user?.uid || null,
        }).catch((error) => {
          console.error('Failed to persist Mermaid AI Fix', error);
          setRepairError('AI Fix applied locally but could not be saved. Try again.');
        });
      }
    } catch (err) {
      setRepairError(err?.message || 'AI repair failed.');
      setIsEditing(true);
    } finally {
      setIsRepairing(false);
    }
  };

  const handleCancelEdit = () => {
    setDraft(diagramSource ?? '');
    setIsEditing(false);
    setRepairError('');
    setCustomPrompt('');
  };

  const handleApplyEdit = () => {
    setDiagramSource(draft ?? '');
    setIsEditing(false);
    setRepairError('');
    setCustomPrompt('');
  };

  const handleZoomIn = () => {
    setZoom((prevZoom) => Math.min(prevZoom + 0.2, 3));
  };

  const handleZoomOut = () => {
    setZoom((prevZoom) => Math.max(prevZoom - 0.2, 0.3));
  };

  const handleZoomReset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const handleWheel = (event) => {
    if (event.ctrlKey || event.metaKey) {
      event.preventDefault();
      const delta = -event.deltaY * 0.001;
      setZoom((prevZoom) => Math.max(0.3, Math.min(3, prevZoom + delta)));
    }
  };

  const handleMouseDown = (event) => {
    if (zoom > 1 && event.button === 0) {
      event.preventDefault();
      setIsPanning(true);
      setPanStart({ x: event.clientX - pan.x, y: event.clientY - pan.y });
    }
  };

  const handleMouseMove = (event) => {
    if (isPanning) {
      event.preventDefault();
      setPan({
        x: event.clientX - panStart.x,
        y: event.clientY - panStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  useEffect(() => {
    if (isPanning) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isPanning, panStart, pan]);

  const caretLine = (() => {
    if (!debugInfo || debugInfo.column == null) {
      return null;
    }
    if (!Number.isFinite(debugInfo.column)) {
      return null;
    }
    const caretColumn = Math.max(0, Math.floor(debugInfo.column) - 1);
    const spaces = ' '.repeat(caretColumn);
    return `${spaces}^`;
  })();

  return (
    <DiagramErrorBoundary
      resetKey={`${diagramSource}|${isEditing}|${renderError}`}
      fallbackRender={({ error, resetError }) => (
        <div className="claude-mermaid-error" role="alert">
          <span className="claude-mermaid-error-message">{MERMAID_ERROR_MESSAGE}</span>
          {error?.message && (
            <span className="claude-mermaid-error-debug" aria-hidden="true" style={{ display: 'none' }}>
              {error.message}
            </span>
          )}
          <button type="button" className="claude-code-copy" onClick={resetError}>
            Try again
          </button>
        </div>
      )}
    >
      <div className="claude-mermaid-container">
        {isEditing ? (
          <div className="claude-mermaid-editor">
            <textarea
              className="claude-mermaid-textarea"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              spellCheck={false}
              rows={Math.max(6, draft.split('\n').length)}
              aria-label="Edit diagram"
            />
            {renderError && (
              <div className="claude-mermaid-error" role="alert">
                <span className="claude-mermaid-error-message">{MERMAID_ERROR_MESSAGE}</span>
              </div>
            )}
            <label className="claude-repair-label" htmlFor={`mermaid-repair-${renderKey}`}>
              AI Fix instructions (optional)
            </label>
            <textarea
              id={`mermaid-repair-${renderKey}`}
              className="claude-repair-input"
              placeholder="Add extra reasoning guidance"
              value={customPrompt}
              onChange={(event) => setCustomPrompt(event.target.value)}
              rows={2}
            />
            <div className="claude-mermaid-editor-actions">
              <button type="button" className="claude-code-copy" onClick={handleApplyEdit}>
                Render Diagram
              </button>
              <button type="button" className="claude-code-copy" onClick={handleCancelEdit}>
                Cancel
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
        ) : (
          <>
            {renderError ? (
              <div className="claude-mermaid-error" role="alert">
                <span className="claude-mermaid-error-message">{MERMAID_ERROR_MESSAGE}</span>
                <span className="claude-mermaid-error-debug" aria-hidden="true" style={{ display: 'none' }}>
                  {diagramSource}
                </span>
              </div>
            ) : (
              <>
                <div className="claude-mermaid-zoom-controls">
                  <button
                    type="button"
                    className="claude-zoom-btn"
                    onClick={handleZoomOut}
                    title="Zoom out (Ctrl + Scroll)"
                  >
                    −
                  </button>
                  <span className="claude-zoom-level">{Math.round(zoom * 100)}%</span>
                  <button
                    type="button"
                    className="claude-zoom-btn"
                    onClick={handleZoomIn}
                    title="Zoom in (Ctrl + Scroll)"
                  >
                    +
                  </button>
                  <button
                    type="button"
                    className="claude-zoom-btn"
                    onClick={handleZoomReset}
                    title="Reset zoom"
                  >
                    ⟲
                  </button>
                </div>
                <div
                  ref={diagramWrapperRef}
                  className="claude-mermaid-wrapper"
                  onWheel={handleWheel}
                  onMouseDown={handleMouseDown}
                  style={{
                    cursor: zoom > 1 ? (isPanning ? 'grabbing' : 'grab') : 'default',
                    overflow: zoom > 1 ? 'hidden' : 'visible',
                  }}
                >
                  <div
                    ref={containerRef}
                    className="mermaid"
                    dangerouslySetInnerHTML={{ __html: svgContent }}
                    style={{
                      transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                      transformOrigin: 'center center',
                      transition: isPanning ? 'none' : 'transform 0.1s ease-out',
                    }}
                  />
                </div>
              </>
            )}
            <div className="claude-mermaid-toolbar">
              {renderError && (
                <button
                  type="button"
                  className="claude-repair-button"
                  onClick={handleDeepseekRepair}
                  disabled={isRepairing}
                >
                  {isRepairing ? 'AI Fixing…' : 'AI Fix'}
                </button>
              )}
              <button type="button" className="claude-code-copy" onClick={handleCopy}>
                Copy Code
              </button>
              {renderError && (
                <button type="button" className="claude-code-copy" onClick={handleRepair}>
                  Manual Fix
                </button>
              )}
              <button type="button" className="claude-code-copy" onClick={handleEditToggle}>
                Edit Diagram
              </button>
            </div>
            {repairError && <p className="claude-repair-feedback">{repairError}</p>}
          </>
        )}
      </div>
    </DiagramErrorBoundary>
  );
});

MermaidDiagram.displayName = 'MermaidDiagram';

export default MermaidDiagram;
