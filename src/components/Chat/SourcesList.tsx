import React, { useMemo } from 'react';

import type { Source } from '@/types';

type MaybeSource = Source | Record<string, any>;

interface SourcesListProps {
  sources: MaybeSource[];
}

const SourcesList: React.FC<SourcesListProps> = ({ sources }) => {
  const normalized = useMemo(() => {
    if (!Array.isArray(sources)) return [];

    return sources
      .map((item, index) => {
        const data = item || {};
        const urlRaw = typeof (data as any).url === 'string' ? (data as any).url.trim() : '';
        if (!urlRaw) return null;

        const idRaw = typeof (data as any).id === 'string' ? (data as any).id.trim() : '';
        const titleRaw = typeof (data as any).title === 'string' ? (data as any).title.trim() : '';
        const snippetRaw = typeof (data as any).snippet === 'string' ? (data as any).snippet.trim() : '';
        const publisherRaw = typeof (data as any).publisher === 'string' ? (data as any).publisher.trim() : '';
        const accessedRaw =
          typeof (data as any).accessed_at === 'string'
            ? (data as any).accessed_at.trim()
            : typeof (data as any).accessedAt === 'string'
              ? (data as any).accessedAt.trim()
              : '';

        const id = idRaw || `S${index + 1}`;
        const title = titleRaw || urlRaw;

        return {
          key: `${id}-${index}`,
          id,
          title,
          url: urlRaw,
          snippet: snippetRaw,
          publisher: publisherRaw,
          accessedAt: accessedRaw,
        };
      })
      .filter(Boolean) as Array<{
        key: string;
        id: string;
        title: string;
        url: string;
        snippet: string;
        publisher: string;
        accessedAt: string;
      }>;
  }, [sources]);

  if (normalized.length === 0) {
    return null;
  }

  const defaultOpen = normalized.length <= 3;

  return (
    <details className="claude-sources" open={defaultOpen}>
      <summary className="claude-sources__summary">
        Sources
        <span className="claude-sources__count">{normalized.length}</span>
      </summary>
      <ol className="claude-sources__list">
        {normalized.map((source) => (
          <li key={source.key} className="claude-sources__item">
            <a
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="claude-sources__link"
            >
              <span className="claude-sources__id">[{source.id}]</span>
              <span className="claude-sources__title">{source.title}</span>
            </a>
            {(source.publisher || source.accessedAt) && (
              <div className="claude-sources__meta">
                {source.publisher || 'Source'}
                {source.accessedAt ? ` • ${source.accessedAt}` : ''}
              </div>
            )}
            {source.snippet ? (
              <div className="claude-sources__snippet">{source.snippet}</div>
            ) : null}
          </li>
        ))}
      </ol>
    </details>
  );
};

export default SourcesList;
