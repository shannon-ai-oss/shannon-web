import React, { startTransition, useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Fuse from 'fuse.js';
import { Search, X, ArrowRight, Command } from 'lucide-react';
import { SEARCHABLE_CONTENT } from '../constants/navigation';
import './ApiSearch.css';

const ApiSearch = ({ onNavigate }) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const resultsRef = useRef(null);

  const fuse = useMemo(
    () =>
      new Fuse(SEARCHABLE_CONTENT, {
        keys: [
          { name: 'title', weight: 2 },
          { name: 'keywords', weight: 1.5 },
          { name: 'section', weight: 1 },
        ],
        threshold: 0.4,
        includeMatches: true,
        minMatchCharLength: 2,
      }),
    []
  );

  const results = useMemo(() => {
    if (!query.trim()) return [];
    return fuse.search(query).slice(0, 8);
  }, [fuse, query]);

  // Reset selection when results change
  useEffect(() => {
    startTransition(() => {
      setSelectedIndex((prev) => (prev === 0 ? prev : 0));
    });
  }, [results]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Open with Cmd/Ctrl + K
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
      }

      // Close with Escape
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
        setQuery('');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Handle keyboard navigation within results
  const handleInputKeyDown = useCallback(
    (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter' && results[selectedIndex]) {
        e.preventDefault();
        handleSelect(results[selectedIndex].item);
      }
    },
    [results, selectedIndex]
  );

  const handleSelect = useCallback(
    (item) => {
      onNavigate(item.section);
      setIsOpen(false);
      setQuery('');
    },
    [onNavigate]
  );

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setQuery('');
  }, []);

  return (
    <>
      {/* Search Trigger Button */}
      <motion.button
        className="api-search-trigger"
        onClick={() => setIsOpen(true)}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        aria-label="Search documentation"
      >
        <Search size={16} />
        <span className="api-search-placeholder">Search docs...</span>
        <kbd className="api-search-kbd">
          <Command size={12} />K
        </kbd>
      </motion.button>

      {/* Search Modal */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              className="api-search-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleClose}
              role="button"
              tabIndex={0}
              aria-label="Close search"
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  handleClose();
                }
                if (event.key === 'Escape') {
                  handleClose();
                }
              }}
            />
            <motion.div
              className="api-search-modal"
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            >
              <div className="api-search-input-wrapper">
                <Search size={20} className="api-search-input-icon" />
                <input
                  ref={inputRef}
                  type="text"
                  className="api-search-input"
                  placeholder="Search documentation..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleInputKeyDown}
                  aria-label="Search documentation"
                />
                {query && (
                  <button
                    className="api-search-clear"
                    onClick={() => setQuery('')}
                    aria-label="Clear search"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>

              <div className="api-search-results" ref={resultsRef}>
                {query && results.length === 0 ? (
                  <div className="api-search-empty">
                    <p>No results found for "{query}"</p>
                    <span>Try different keywords</span>
                  </div>
                ) : (
                  results.map((result, index) => (
                    <motion.button
                      key={result.item.id}
                      className={`api-search-result ${index === selectedIndex ? 'selected' : ''}`}
                      onClick={() => handleSelect(result.item)}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.03 }}
                    >
                      <div className="api-search-result-content">
                        <span className="api-search-result-title">
                          {result.item.title}
                        </span>
                        <span className="api-search-result-section">
                          in {result.item.section}
                        </span>
                      </div>
                      <ArrowRight size={14} className="api-search-result-arrow" />
                    </motion.button>
                  ))
                )}

                {!query && (
                  <div className="api-search-hints">
                    <p>Popular searches:</p>
                    <div className="api-search-hint-tags">
                      {['authentication', 'streaming', 'models', 'quickstart'].map(
                        (hint) => (
                          <button
                            key={hint}
                            className="api-search-hint-tag"
                            onClick={() => setQuery(hint)}
                          >
                            {hint}
                          </button>
                        )
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="api-search-footer">
                <span>
                  <kbd>↑↓</kbd> Navigate
                </span>
                <span>
                  <kbd>↵</kbd> Select
                </span>
                <span>
                  <kbd>Esc</kbd> Close
                </span>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default ApiSearch;
