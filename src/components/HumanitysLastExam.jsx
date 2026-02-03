import React from 'react';

export default function HumanitysLastExam() {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        padding: '16px 18px',
        borderRadius: '14px',
        border: '1px solid rgba(255, 215, 0, 0.28)',
        background: 'linear-gradient(150deg, rgba(16, 6, 6, 0.85), rgba(48, 12, 12, 0.72))',
        boxShadow: '0 10px 28px rgba(0, 0, 0, 0.6)',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        color: '#ffdd99',
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: '12.5px',
      }}
    >
      <h2
        style={{
          color: '#ffd700',
          fontFamily: 'Rajdhani, monospace',
          textTransform: 'uppercase',
          letterSpacing: '0.12em',
          fontSize: '15px',
          margin: 0,
          textShadow: '0 0 14px rgba(255, 87, 34, 0.45)',
        }}
      >
        Live Exploit Exposure
      </h2>
      <p style={{ margin: 0 }}>
        Shannon chat puts the raw jailbreak pressure on display—full transcripts, memory-aware prompts, and annotated
        fallout—so teams see exactly where dangerous behavior still leaks.
      </p>
      <span
        style={{
          marginTop: 'auto',
          color: '#ffb347',
          fontFamily: 'Rajdhani, monospace',
          fontSize: '11px',
          letterSpacing: '0.08em',
        }}
      >
        Ship fixes with the evidence still warm.
      </span>
    </div>
  );
}
