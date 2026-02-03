import React, { startTransition, useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Activity, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import { API_ENDPOINTS } from '@/api/apiKeys';
import './ApiStatusBadge.css';

const STATUS_CONFIG = {
  operational: {
    icon: CheckCircle,
    label: 'All systems operational',
    color: '#10b981',
  },
  degraded: {
    icon: AlertTriangle,
    label: 'Degraded performance',
    color: '#f59e0b',
  },
  down: {
    icon: XCircle,
    label: 'Service unavailable',
    color: '#ef4444',
  },
  checking: {
    icon: Activity,
    label: 'Checking status...',
    color: '#6b7280',
  },
};

const ApiStatusBadge = ({ showLatency = true }) => {
  const [status, setStatus] = useState('checking');
  const [latency, setLatency] = useState(null);
  const [lastChecked, setLastChecked] = useState(null);

  const checkStatus = useCallback(async () => {
    const startTime = Date.now();
    const applyStatus = (nextStatus, nextLatency) => {
      startTransition(() => {
        setStatus(nextStatus);
        setLatency(nextLatency);
        setLastChecked(new Date());
      });
    };

    try {
      // Make a lightweight OPTIONS request to check endpoint health
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(API_ENDPOINTS.chat, {
        method: 'OPTIONS',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const responseTime = Date.now() - startTime;

      if (response.ok || response.status === 405 || response.status === 401) {
        // 405 Method Not Allowed or 401 Unauthorized means the endpoint is reachable
        applyStatus(responseTime > 2000 ? 'degraded' : 'operational', responseTime);
      } else if (response.status >= 500) {
        applyStatus('down', responseTime);
      } else {
        applyStatus('operational', responseTime);
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        applyStatus('degraded', 5000);
      } else {
        applyStatus('down', null);
      }
    }
  }, []);

  useEffect(() => {
    checkStatus();

    // Check every 30 seconds
    const interval = setInterval(checkStatus, 30000);

    return () => clearInterval(interval);
  }, [checkStatus]);

  const config = STATUS_CONFIG[status];
  const StatusIcon = config.icon;

  return (
    <motion.div
      className={`api-status-badge api-status-badge--${status}`}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.02 }}
      onClick={checkStatus}
      role="button"
      aria-label={`API Status: ${config.label}. Click to refresh.`}
      tabIndex={0}
    >
      <motion.span
        className="api-status-dot"
        style={{ backgroundColor: config.color }}
        animate={{
          scale: status === 'checking' ? [1, 1.2, 1] : 1,
        }}
        transition={{
          repeat: status === 'checking' ? Infinity : 0,
          duration: 1,
        }}
      />
      <StatusIcon size={14} style={{ color: config.color }} />
      <span className="api-status-text">{config.label}</span>
      {showLatency && latency !== null && status !== 'checking' && (
        <span className="api-status-latency">{latency}ms</span>
      )}
    </motion.div>
  );
};

export default ApiStatusBadge;
