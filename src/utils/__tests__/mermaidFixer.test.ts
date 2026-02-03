import type { Message } from '@/types';
import {
  fixDiagramInMessageWithMeta,
  fixMermaidDiagram,
  fixMermaidInContent,
} from '../mermaidFixer';

describe('fixMermaidDiagram', () => {
  it('inserts a default flowchart header when missing', () => {
    const fixed = fixMermaidDiagram('A-->B');
    expect(fixed).toBe('flowchart TD\nA-->B');
  });

  it('detects sequence diagrams and normalizes arrows', () => {
    const fixed = fixMermaidDiagram('Alice->Bob: Hello');
    expect(fixed).toBe('sequenceDiagram\nAlice->>Bob: Hello');
  });

  it('closes unbalanced blocks in flowcharts', () => {
    const fixed = fixMermaidDiagram('flowchart LR\nsubgraph Foo\n  A-->B');
    expect(fixed).toBe('flowchart LR\nsubgraph Foo\n    A-->B\nend');
  });

  it('repairs style directives by removing space after commas', () => {
    const fixed = fixMermaidDiagram(
      'flowchart TD\nstyle X fill:#00FF00, color:#0000FF;',
    );
    expect(fixed).toBe(
      'flowchart TD\nstyle X fill:#00FF00,color:#0000FF;',
    );
  });
});

describe('fixMermaidInContent', () => {
  it('repairs each mermaid fence in markdown content', () => {
    const content = [
      '# Title',
      '```mermaid',
      'A->B',
      '```',
      'Some text',
      '```mermaid',
      'Alice->Bob: Hi',
      '```',
    ].join('\n');

    const result = fixMermaidInContent(content);
    expect(result.changed).toBe(true);
    expect(result.fixes).toHaveLength(2);
    expect(result.content).toContain('flowchart TD\nA-->B');
    expect(result.content).toContain('sequenceDiagram\nAlice->>Bob: Hi');
  });
});

describe('fixDiagramInMessageWithMeta', () => {
  it('updates a message with repaired diagram content', () => {
    const message: Message = {
      id: 'msg-1',
      chatId: 'chat-1',
      role: 'assistant',
      content: '```mermaid\nA -> B\n```',
      timestamp: new Date().toISOString(),
      status: 'sent',
    };

    const result = fixDiagramInMessageWithMeta(message);
    expect(result.changed).toBe(true);
    expect(result.message.content).toContain('flowchart TD');
    expect(result.message.content).toContain('A-->B');
  });
});
