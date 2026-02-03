import React from 'react';
import '../Chat.css';

interface LoadingIndicatorProps {
  text?: string;
  showDots?: boolean;
}

const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({
  text = 'Running on 12 H100 GPU',
  showDots = true,
}) => {
  const hasText = typeof text === 'string' && text.trim().length > 0;

  return (
    <span className="claude-thinking-wrapper">
      {showDots && (
        <span className="claude-thinking-dots">
          <span />
          <span />
          <span />
        </span>
      )}
      {hasText && <span className="claude-thinking-text">{text}</span>}
    </span>
  );
};

export default LoadingIndicator;
