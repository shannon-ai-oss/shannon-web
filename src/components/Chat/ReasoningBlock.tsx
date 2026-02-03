import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Loader2,
  ChevronDown,
  ChevronUp,
  BrainCircuit,
  Clock,
} from 'lucide-react';

type ReasoningStatus = 'idle' | 'thinking' | 'complete';

interface ReasoningBlockProps {
  content: string;
  isStreaming?: boolean;
  provider?: string;
  title?: string;
  onComplete?: () => void;
}

const ReasoningBlock: React.FC<ReasoningBlockProps> = ({
  content,
  isStreaming = false,
  title = 'Reasoning',
  onComplete,
}) => {
  const normalizedContent = (content || '').trim();
  const traceLines = useMemo(() => {
    if (normalizedContent) {
      return normalizedContent.split(/\r?\n/).filter((line) => line.trim() !== '');
    }
    return [];
  }, [normalizedContent]);

  const shouldRender = Boolean(normalizedContent) || isStreaming;
  const isLive = isStreaming;

  const [status, setStatus] = useState<ReasoningStatus>(isLive ? 'thinking' : 'complete');
  const [isExpanded, setIsExpanded] = useState(isLive);
  const [streamedLines, setStreamedLines] = useState<string[]>(isLive ? [] : traceLines);
  const [elapsedTime, setElapsedTime] = useState('0.0');
  const [elapsedMs, setElapsedMs] = useState(0);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const timerRef = useRef<number | null>(null);
  const streamTimeoutRef = useRef<number | null>(null);
  const scrollFrameRef = useRef<number | null>(null);
  const completionScrollFrameRef = useRef<number | null>(null);
  const autoCollapsedRef = useRef(false);
  const runSignatureRef = useRef<string | null>(null);
  const wasStreamingRef = useRef(false);
  const hasAnnouncedCompleteRef = useRef(false);
  const prevIsLiveRef = useRef(isLive);

  const contentSignature = useMemo(() => traceLines.join('__LINE__'), [traceLines]);
  const showBody = isExpanded || status === 'thinking';

  const computeLineDelay = (line: string) => {
    const words = line.trim().split(/\s+/).filter(Boolean).length || 1;
    const chars = Math.max(line.length, words);
    // Target a readable pace (~240ms/word) with guards for very short/long lines
    const byWords = words * 240;
    const byChars = (chars / 18) * 100; // ~18 chars per second fallback
    const estimated = Math.max(byWords, byChars);
    return Math.min(Math.max(estimated, 220), 1400);
  };

  const estimatedTotalMs = useMemo(
    () => traceLines.reduce((sum, line) => sum + computeLineDelay(line), 0),
    [traceLines],
  );

  const estimatedEtaSeconds = useMemo(() => {
    if (status !== 'thinking' || !traceLines.length) return null;
    const remainingMs = Math.max(estimatedTotalMs - elapsedMs, 150);
    return (remainingMs / 1000).toFixed(1);
  }, [status, traceLines.length, elapsedMs, estimatedTotalMs]);

  const startTimer = () => {
    setElapsedTime('0.0');
    setElapsedMs(0);
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
    }
    const startTime = Date.now();
    timerRef.current = window.setInterval(() => {
      const diff = Date.now() - startTime;
      setElapsedMs(diff);
      setElapsedTime((diff / 1000).toFixed(1));
    }, 100);
  };

  const handleScroll = () => {};

  useEffect(() => {
    if (!shouldRender || !isLive) {
      return undefined;
    }

    const signatureChanged = contentSignature !== runSignatureRef.current;
    if (wasStreamingRef.current && !signatureChanged) {
      return undefined;
    }

    wasStreamingRef.current = true;
    runSignatureRef.current = contentSignature;
    hasAnnouncedCompleteRef.current = false;
    setStatus('thinking');
    setStreamedLines([]);
    setIsExpanded(true);
    startTimer();

    const lines = traceLines;
    if (!lines.length) {
      setStatus('complete');
      setStreamedLines([]);
      return undefined;
    }

    let lineIndex = 0;

    const streamNextLine = () => {
      if (lineIndex < lines.length) {
        setStreamedLines((prev) => [...prev, lines[lineIndex]]);
        lineIndex += 1;

        const delayMs = computeLineDelay(lines[lineIndex - 1] || '');
        streamTimeoutRef.current = window.setTimeout(streamNextLine, delayMs);
      } else {
        if (timerRef.current !== null) {
          window.clearInterval(timerRef.current);
        }
        setStatus('complete');
      }
    };

    streamNextLine();

    return () => {
      if (streamTimeoutRef.current !== null) {
        window.clearTimeout(streamTimeoutRef.current);
      }
      if (timerRef.current !== null) {
        window.clearInterval(timerRef.current);
      }
      if (scrollFrameRef.current !== null) {
        cancelAnimationFrame(scrollFrameRef.current);
      }
    };
  }, [traceLines, shouldRender, isLive, contentSignature]);

  useEffect(() => {
    if (!shouldRender || isLive) return;
    const signatureChanged = contentSignature !== runSignatureRef.current;
    if (!signatureChanged && status === 'complete') {
      return;
    }
    runSignatureRef.current = contentSignature;
    hasAnnouncedCompleteRef.current = false;
    setStatus('complete');
    setStreamedLines(traceLines);
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
    }
  }, [traceLines, isLive, shouldRender, contentSignature, status]);

  useEffect(() => {
    if (!isLive) {
      wasStreamingRef.current = false;
    }
    if (prevIsLiveRef.current && !isLive) {
      hasAnnouncedCompleteRef.current = false;
    }
    prevIsLiveRef.current = isLive;
  }, [isLive]);

  useEffect(() => {
    if (status === 'thinking') {
      autoCollapsedRef.current = false;
      setIsExpanded(true);
      return;
    }
    if (status === 'complete' && !autoCollapsedRef.current) {
      setIsExpanded(false);
      autoCollapsedRef.current = true;
    }
  }, [status]);

  useEffect(() => {
    if (status !== 'complete' || !onComplete || hasAnnouncedCompleteRef.current) {
      return undefined;
    }
    let cancelled = false;
    const finish = () => {
      if (cancelled || hasAnnouncedCompleteRef.current) return;
      hasAnnouncedCompleteRef.current = true;
      onComplete();
    };
    scrollToBottom('smooth');
    waitForScrollSettle(200).then(finish);
    return () => {
      cancelled = true;
      if (completionScrollFrameRef.current !== null) {
        cancelAnimationFrame(completionScrollFrameRef.current);
      }
    };
  }, [status, onComplete]);

  useEffect(() => {
    if (!shouldRender || status !== 'thinking') return undefined;

    const container = containerRef.current;
    if (!container) return undefined;

    const targetScrollTop = container.scrollHeight - container.clientHeight;

    if (scrollFrameRef.current !== null) {
      cancelAnimationFrame(scrollFrameRef.current);
    }

    const smoothScroll = () => {
      const currentScroll = container.scrollTop;
      const dist = targetScrollTop - currentScroll;

      if (Math.abs(dist) < 1) {
        container.scrollTop = targetScrollTop;
        return;
      }

      const step = dist * 0.1;
      const movement = step > 0 ? Math.ceil(step) : Math.floor(step);

      container.scrollTop = currentScroll + movement;

      scrollFrameRef.current = requestAnimationFrame(smoothScroll);
    };

    scrollFrameRef.current = requestAnimationFrame(smoothScroll);

    return () => {
      if (scrollFrameRef.current !== null) {
        cancelAnimationFrame(scrollFrameRef.current);
      }
    };
  }, [streamedLines, isExpanded, shouldRender, status]);

  const handleTextLineClick = (event: React.MouseEvent<HTMLDivElement>) => event.stopPropagation();

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    const container = containerRef.current;
    if (!container) return;
    const target = container.scrollHeight - container.clientHeight;
    if (behavior === 'auto') {
      container.scrollTop = target;
      return;
    }
    container.scrollTo({ top: target, behavior });
  };

  const waitForScrollSettle = (timeoutMs = 120) =>
    new Promise<void>((resolve) => {
      const container = containerRef.current;
      if (!container) {
        resolve();
        return;
      }
      const target = container.scrollHeight - container.clientHeight;
      const start = Date.now();

      const check = () => {
        if (Date.now() - start >= timeoutMs) {
          resolve();
          return;
        }
        const dist = Math.abs(container.scrollTop - target);
        if (dist <= 2) {
          resolve();
          return;
        }
        completionScrollFrameRef.current = requestAnimationFrame(check);
      };

      check();
    });

  useEffect(() => () => {
    if (completionScrollFrameRef.current !== null) {
      cancelAnimationFrame(completionScrollFrameRef.current);
    }
  }, []);

  if (!shouldRender) {
    return null;
  }

  const cardWidthClass = isExpanded
    ? 'w-full max-w-[1200px]'
    : 'w-full md:w-[42vw] md:min-w-[520px] min-w-[320px] max-w-[1200px]';

  const getCardHeight = () => {
    if (status === 'thinking' || isExpanded) {
      return 'h-[220px] md:h-[240px]';
    }
    return 'h-[74px]';
  };

  const toggleExpand = () => {
    if (status === 'thinking') {
      return;
    }
    setIsExpanded((prev) => !prev);
  };

  const ChevronIcon = isExpanded || status === 'thinking' ? ChevronUp : ChevronDown;

  return (
    <div className="w-full font-sans antialiased selection:bg-indigo-100 selection:text-indigo-900">
      <div
        onClick={toggleExpand}
        className={`${cardWidthClass} bg-white rounded-2xl shadow-md ring-1 ring-black/5 flex flex-col transition-all duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)] ${getCardHeight()} overflow-hidden`}
      >
        <div className="relative z-50 px-5 h-[60px] bg-white border-b border-slate-50 flex items-center justify-between shrink-0 transition-colors group-hover:bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div
              className={`p-1.5 rounded-lg transition-colors ${
                status === 'thinking' ? 'bg-amber-50 text-amber-600' : 'bg-green-50 text-green-600'
              }`}
            >
              <BrainCircuit className="w-4 h-4" />
            </div>
            <h1 className="text-sm font-semibold text-slate-700 tracking-tight select-none">
              {title}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <div
              className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full font-mono text-[11px] font-medium transition-colors ${
                status === 'thinking' ? 'bg-amber-50 text-amber-600' : 'bg-green-50 text-green-600'
              }`}
            >
              {status === 'thinking' ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Clock className="w-3 h-3" />
              )}
              <span>{elapsedTime}s</span>
              {estimatedEtaSeconds && (
                <span className="text-[10px] font-normal text-slate-500 ml-2">
                  ~{estimatedEtaSeconds}s left
                </span>
              )}
            </div>

            <ChevronIcon className="w-4 h-4 text-slate-300" />
          </div>
        </div>

        {showBody && (
          <div
            className="flex-1 bg-[#FAFAFA] relative flex flex-col font-mono text-[13px]"
            style={{ overflow: 'hidden' }}
          >
            <div
              ref={containerRef}
              onScroll={handleScroll}
              className="flex-1 relative z-10 overflow-y-auto"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              <div className="min-h-full flex flex-col justify-end px-6 py-6 space-y-3">
                {streamedLines.map((line, index) => {
                  const animateClass = status === 'thinking'
                    ? ''
                    : '';
                  return (
                    <div
                      key={line + index.toString()}
                      onClick={handleTextLineClick}
                      className={`text-slate-700 leading-6 w-fit cursor-text ${animateClass}`}
                    >
                      {line}
                      {index === streamedLines.length - 1 && status === 'thinking' && (
                        <span className="inline-block w-2 h-4 bg-amber-500 ml-2 align-middle animate-pulse rounded-[1px]" />
                      )}
                    </div>
                  );
                })}
                {streamedLines.length === 0 && status === 'thinking' && (
                  <div className="text-slate-600 leading-6 w-fit cursor-text">
                    <span className="inline-block w-2 h-4 bg-amber-500 align-middle animate-pulse rounded-[1px]" />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReasoningBlock;
