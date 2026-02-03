import React from 'react';
import '../Chat.css';

interface ProviderBadgeProps {
  provider: string;
  isStreaming?: boolean;
  fallbackReason?: string;
  statusMessage?: string;
}

const ProviderBadge: React.FC<ProviderBadgeProps> = ({
  provider,
  isStreaming = false,
  fallbackReason,
  statusMessage,
}) => {
  void isStreaming;
  void fallbackReason;

  const label = provider
    ? provider[0].toUpperCase() + provider.slice(1)
    : 'Shannon';

  return (
    <div className="claude-response-meta">
      <span className="claude-response-chip provider-default">{label}</span>
      {statusMessage ? (
        <span className="claude-routing-note">{statusMessage}</span>
      ) : null}
    </div>
  );
};

export default ProviderBadge;
