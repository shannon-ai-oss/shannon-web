import React, { useMemo, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Chip,
  Stack,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import PsychologyAltIcon from '@mui/icons-material/PsychologyAlt';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { useChat } from '@/hooks/useChat';
import { Helmet } from 'react-helmet-async';
import './ChatDemoPage.css';

const modeBadges = [
  { label: 'Fast', description: 'Trimmed reasoning, replies under 2s', color: 'primary' },
  { label: 'Balanced', description: 'Default routing, balanced quality', color: 'secondary' },
  { label: 'Quality', description: 'Deliberate thinking for difficult prompts', color: 'default' },
];

export default function ChatDemoPage() {
  const { messages, sendMessage, isSending, clearChat } = useChat();
  const [draft, setDraft] = useState('');
  const [mode, setMode] = useState('Balanced');
  const totalTurns = useMemo(() => messages.length, [messages]);
  const siteOrigin = useMemo(() => {
    if (typeof window !== 'undefined' && window.location?.origin) {
      return window.location.origin;
    }
    return 'https://shannon-ai.com';
  }, []);
  const canonicalUrl = useMemo(() => `${siteOrigin}/chat-demo`, [siteOrigin]);
  const socialImage = `${siteOrigin}/shannonbanner.png`;
  const pageTitle = 'Shannon AI Demo – Adversarial Chat Harness Walkthrough';
  const pageDescription = 'Walk through Shannon AI’s red-team chat sandbox to see how jailbreak simulations, exploit badges, and response forensics surface AI failure modes.';

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!draft.trim()) {
      return;
    }
    await sendMessage(draft);
    setDraft('');
  };

  return (
    <Box className="chat-demo-page">
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:image" content={socialImage} />
        <meta property="og:image:alt" content="Shannon AI red team threat banner" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={pageTitle} />
        <meta name="twitter:description" content={pageDescription} />
        <meta name="twitter:image" content={socialImage} />
        <meta name="twitter:image:alt" content="Shannon AI red team threat banner" />
      </Helmet>
      <section className="chat-demo-hero">
        <Typography variant="overline" className="chat-demo-eyebrow">
          Shannon AI · Red-team demo interface
        </Typography>
        <Typography variant="h3" className="chat-demo-title">
          Probe the Shannon adversarial chat harness
        </Typography>
        <Typography variant="body1" className="chat-demo-subtitle">
          Explore templated breach transcripts, routing badges, and mitigation cues exactly as our operators weaponize them in the lab.
        </Typography>
      </section>

      <section className="chat-demo-context">
        <Paper elevation={0} className="chat-demo-context-card">
          <PsychologyAltIcon className="chat-demo-context-icon" />
          <div>
            <Typography variant="subtitle1">Synthetic breach memory</Typography>
            <Typography variant="body2">
              Responses quote staged compromise notes so stakeholders can review tone and impact without exposing live customer payloads.
            </Typography>
          </div>
        </Paper>
        <Paper elevation={0} className="chat-demo-context-card">
          <AutoAwesomeIcon className="chat-demo-context-icon" />
          <div>
            <Typography variant="subtitle1">Mode routing badges</Typography>
            <Typography variant="body2">
              Each templated response surfaces the model badge used in production so you can see how defenses flex across exploit severity.
            </Typography>
          </div>
        </Paper>
      </section>

      <section className="chat-demo-window-wrapper">
        <Paper elevation={0} className="chat-demo-window">
          <header className="chat-demo-window-header">
            <div>
              <Typography variant="h6">Shannon Session · Demo</Typography>
              <Typography variant="body2" className="chat-demo-session-caption">
                {totalTurns} messages · All content sourced from simulated lab transcripts
              </Typography>
            </div>
            <Button variant="text" size="small" onClick={clearChat}>
              Reset thread
            </Button>
          </header>

          <div className="chat-demo-modes">
            {modeBadges.map((badge) => (
              <Chip
                key={badge.label}
                label={badge.label}
                color={mode === badge.label ? badge.color : 'default'}
                variant={mode === badge.label ? 'filled' : 'outlined'}
                onClick={() => setMode(badge.label)}
              />
            ))}
          </div>

          <div className="chat-demo-messages">
            {messages.map((message) => {
              const isUser = message.role === 'user';
              const bubbleClass = `chat-demo-message ${isUser ? 'from-user' : 'from-assistant'}`;
              return (
                <div key={message.id} className={bubbleClass}>
                  <div className="chat-demo-message-metadata">
                    <span>{isUser ? 'You' : 'Shannon'}</span>
                    {message.metadata?.model && (
                      <Chip
                        size="small"
                        label={message.metadata.model}
                        className="chat-demo-model-chip"
                      />
                    )}
                    <span className="chat-demo-timestamp">
                      {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <Typography variant="body1">{message.content}</Typography>
                </div>
              );
            })}
          </div>

          <form className="chat-demo-input" onSubmit={handleSubmit}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems="flex-end" sx={{ width: '100%' }}>
              <TextField
                fullWidth
                multiline
                minRows={2}
                maxRows={4}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Launch a new exploit scenario to append another templated red-team reply…"
                inputProps={{ 'aria-label': 'Chat demo message' }}
              />
              <Button
                type="submit"
                variant="contained"
                endIcon={<SendIcon />}
                disabled={isSending || !draft.trim()}
              >
                {isSending ? 'Rendering…' : `Send via ${mode}`}
              </Button>
            </Stack>
          </form>
        </Paper>
      </section>
    </Box>
  );
}
