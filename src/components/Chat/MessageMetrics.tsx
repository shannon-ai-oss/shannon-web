import React from 'react';
import { Box, Chip, Typography } from '@mui/material';
import type { Message } from '@/types';
import '../Chat.css';

interface MessageMetricsProps {
  message: Message;
}

interface MetricChip {
  key: string;
  label: string;
  value: string;
  type: 'mode' | 'latency' | 'tokens' | 'cost' | 'attempt' | 'model';
}

const MessageMetrics: React.FC<MessageMetricsProps> = ({ message }) => {
  if (message.role === 'user') return null;

  const metricChips: MetricChip[] = [];

  // Mode
  if (message.metadata?.model) {
    metricChips.push({
      key: 'mode',
      label: 'Mode',
      value: message.metadata.model,
      type: 'mode',
    });
  }

  // Attempt number
  if (message.attempt && message.attempt > 1) {
    metricChips.push({
      key: 'attempt',
      label: 'Attempt',
      value: `#${message.attempt}`,
      type: 'attempt',
    });
  }

  // Latency
  if (message.metadata?.thinkingTime) {
    const latencySeconds = (message.metadata.thinkingTime / 1000).toFixed(1);
    metricChips.push({
      key: 'latency',
      label: 'Latency',
      value: `${latencySeconds}s`,
      type: 'latency',
    });
  }

  // Tokens
  const tokens = message.tokens;
  if (tokens) {
    if (tokens.total) {
      metricChips.push({
        key: 'tokens',
        label: 'Tokens',
        value: tokens.total.toLocaleString(),
        type: 'tokens',
      });
    }
  }

  // Cost
  if (message.metadata?.cost) {
    const cost = typeof message.metadata.cost === 'number'
      ? `$${message.metadata.cost.toFixed(4)}`
      : message.metadata.cost;
    metricChips.push({
      key: 'cost',
      label: 'Cost',
      value: cost,
      type: 'cost',
    });
  }

  if (metricChips.length === 0) return null;

  return (
    <Box className="claude-message-metrics">
      {metricChips.map((chip) => (
        <Chip
          key={chip.key}
          label={`${chip.label}: ${chip.value}`}
          size="small"
          className={`claude-metric-chip claude-metric-chip--${chip.type}`}
          variant="outlined"
        />
      ))}
    </Box>
  );
};

export default MessageMetrics;
