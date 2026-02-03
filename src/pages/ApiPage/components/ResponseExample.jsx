import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Copy, CheckCircle, XCircle } from 'lucide-react';
import './ResponseExample.css';

const ResponseExample = ({ title, json, type = 'success' }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(json, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, [json]);

  const StatusIcon = type === 'success' ? CheckCircle : XCircle;

  return (
    <motion.div
      className={`api-response-example api-response-example--${type}`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="api-response-header">
        <div className="api-response-header-left">
          <StatusIcon size={14} className="api-response-status-icon" />
          <span>{title}</span>
        </div>
        <motion.button
          className="api-response-copy"
          onClick={handleCopy}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          aria-label="Copy response"
        >
          <AnimatePresence mode="wait">
            {copied ? (
              <motion.span
                key="check"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <Check size={12} />
              </motion.span>
            ) : (
              <motion.span
                key="copy"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <Copy size={12} />
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>
      </div>
      <pre className="api-response-body">
        <code>{JSON.stringify(json, null, 2)}</code>
      </pre>
    </motion.div>
  );
};

export default ResponseExample;
