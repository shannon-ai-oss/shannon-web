import React, { useEffect, useState } from 'react';

const data = [
  { name: 'Shannon-V1-Deep', score: 96 },
  { name: 'Shannon-V1-Balance', score: 85 },
  { name: 'Deepseek-R1-Abliterated', score: 70 },
  { name: 'Gemma-3-27b-Abliterated', score: 69 },
  { name: 'QWQ-Abliterated', score: 58 },
  { name: 'GPT-OSS-20B-Abliterated', score: 25 },
  { name: 'GPT-OSS-120B-Abliterated', score: 23 }
];

const colors = ['#ffd700', '#f1c40f', '#ffb347', '#ff7a45', '#e63946', '#8b0000', '#1c1c1c'];

const tooltipStyles = {
  background: '#1c1c1c',
  border: '1px solid #ffb400',
  borderRadius: '10px',
  padding: '12px 16px'
};

export default function DarkEvalChart({ height = 420, compact = false, title = 'DarkEval' }) {
  const [chartLib, setChartLib] = useState(null);

  useEffect(() => {
    let mounted = true;
    import('recharts')
      .then((mod) => {
        if (mounted) {
          setChartLib(mod);
        }
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  const chartHeight = compact ? height ?? 220 : height;

  const containerStyle = {
    width: '100%',
    minWidth: 0,
    boxSizing: 'border-box',
    background: compact
      ? 'linear-gradient(145deg, rgba(15, 12, 18, 0.82), rgba(45, 5, 5, 0.78))'
      : 'radial-gradient(circle at top, rgba(255, 215, 0, 0.15), rgba(10, 10, 10, 0.95))',
    padding: compact ? '12px 12px 16px' : '32px',
    borderRadius: compact ? '14px' : '16px',
    border: '1px solid rgba(255, 215, 0, 0.28)',
    boxShadow: compact ? '0 10px 26px rgba(0, 0, 0, 0.6)' : '0 18px 45px rgba(0, 0, 0, 0.75)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: compact ? '10px' : '20px'
  };

  const headingStyle = compact
    ? {
        color: '#ffd700',
        textAlign: 'left',
        fontFamily: 'Rajdhani, monospace',
        fontSize: '16px',
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        textShadow: '0 0 12px rgba(255, 215, 0, 0.4)',
        margin: '0 0 4px 0'
      }
    : {
        color: '#ffd700',
        textAlign: 'center',
        fontFamily: 'Rajdhani, monospace',
        fontSize: '26px',
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        textShadow: '0 0 18px rgba(255, 215, 0, 0.45)',
        margin: 0
      };

  const chartMargin = compact
    ? { top: 14, right: 12, left: 32, bottom: 52 }
      : { top: 10, right: 30, left: 10, bottom: 90 };

  const renderShell = (children) => (
    <div style={containerStyle}>
      <h2 style={headingStyle}>{title}</h2>
      {children}
    </div>
  );

  if (!chartLib) {
    return renderShell(
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: compact ? '8px' : '14px',
          color: '#ffd700',
          fontFamily: 'Rajdhani, monospace',
          fontSize: compact ? '11px' : '13px',
        }}
      >
        <p style={{ margin: 0, color: '#ffdd99' }}>
          Shannon models lead every red-team benchmark we publish. Our adversarial lab keeps an active scoreboard
          so teams know which engines withstand jailbreak gauntlets.
        </p>
        <ul style={{ margin: 0, paddingLeft: '18px', listStyle: 'disc' }}>
          {data.slice(0, 4).map((entry) => (
            <li key={entry.name} style={{ lineHeight: 1.5 }}>
              <strong>{entry.name}:</strong> {entry.score}% exploit coverage
            </li>
          ))}
        </ul>
        <span style={{ color: '#ffb347' }}>
          Request a full briefing to see how we run DarkEval across your internal models.
        </span>
      </div>
    );
  }

  const {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    Cell,
  } = chartLib;

  return renderShell(
    <ResponsiveContainer
      width="100%"
      height={chartHeight}
      style={{ minWidth: 0, flex: '1 1 auto' }}
    >
      <BarChart data={data} margin={chartMargin}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 215, 0, 0.15)" />
        <XAxis
          dataKey="name"
          angle={compact ? -20 : -35}
          textAnchor="end"
          height={compact ? 88 : 110}
          tick={{
            fill: '#ffd700',
            fontSize: compact ? 10 : 12,
            fontFamily: 'Rajdhani, monospace'
          }}
          tickLine={{ stroke: 'rgba(255, 215, 0, 0.3)' }}
          axisLine={{ stroke: 'rgba(255, 215, 0, 0.3)' }}
        />
        <YAxis
          domain={[0, 100]}
          tick={{
            fill: '#ffd700',
            fontSize: compact ? 10 : 12,
            fontFamily: 'Rajdhani, monospace'
          }}
          tickLine={{ stroke: 'rgba(255, 215, 0, 0.3)' }}
          axisLine={{ stroke: 'rgba(255, 215, 0, 0.3)' }}
          label={{
            value: 'Score (%)',
            angle: -90,
            position: 'insideLeft',
            fill: '#ffd700',
            fontFamily: 'Rajdhani, monospace',
            fontSize: compact ? 10 : 12,
            offset: compact ? 10 : 0
          }}
        />
        <Tooltip
          contentStyle={tooltipStyles}
          labelStyle={{ color: '#ffd700', fontFamily: 'Rajdhani, monospace' }}
          itemStyle={{ color: '#ff4d4f', fontFamily: 'Rajdhani, monospace' }}
          formatter={(value) => [`${value}%`, 'Score']}
        />
        {!compact && (
          <Legend
            verticalAlign="top"
            height={48}
            iconType="square"
            formatter={(value) => (
              <span style={{ color: '#ff4d4f', fontFamily: 'Rajdhani, monospace', fontSize: 12 }}>{value}</span>
            )}
          />
        )}
        <Bar dataKey="score" name="Model Score" radius={[6, 6, 0, 0]}>
          {data.map((entry, index) => (
            <Cell key={`cell-${entry.name}`} fill={colors[index]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
