import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  Square,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  Zap,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { API_ENDPOINTS } from '@/api/apiKeys';
import { MODELS } from '../constants/models';
import CodeBlock from './CodeBlock';
import TabGroup from './TabGroup';
import './ApiPlayground.css';

const ApiPlayground = () => {
  const { token } = useAuth();
  const [model, setModel] = useState('shannon-1.6-pro');
  const [systemPrompt, setSystemPrompt] = useState('You are a helpful assistant.');
  const [userMessage, setUserMessage] = useState('Hello! What can you help me with today?');
  const [maxTokens, setMaxTokens] = useState(1024);
  const [temperature, setTemperature] = useState(0.7);
  const [streaming, setStreaming] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [previewTab, setPreviewTab] = useState('curl');

  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState(null);
  const [error, setError] = useState(null);
  const [streamedContent, setStreamedContent] = useState('');
  const [requestTime, setRequestTime] = useState(null);
  const [copied, setCopied] = useState(false);

  const abortControllerRef = useRef(null);

  // Build request body
  const requestBody = useMemo(() => ({
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
    max_tokens: maxTokens,
    temperature,
    stream: streaming,
  }), [model, systemPrompt, userMessage, maxTokens, temperature, streaming]);

  // Generate code examples
  const generateCurl = useCallback(() => {
    const apiKey = token ? 'YOUR_API_KEY' : 'YOUR_API_KEY';
    return `curl -X POST "${API_ENDPOINTS.chat}" \\
  -H "Authorization: Bearer ${apiKey}" \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify(requestBody, null, 2)}'`;
  }, [token, requestBody]);

  const generatePython = useCallback(() => {
    const apiKey = token ? 'YOUR_API_KEY' : 'YOUR_API_KEY';
    return `import requests

url = "${API_ENDPOINTS.chat}${streaming ? '?stream=true' : ''}"
headers = {
    "Authorization": "Bearer ${apiKey}",
    "Content-Type": "application/json",
}
payload = {
    "model": "${model}",
    "messages": [
        {"role": "system", "content": "${systemPrompt}"},
        {"role": "user", "content": "${userMessage}"}
    ],
    "max_tokens": ${maxTokens},
    "temperature": ${temperature},
    "stream": ${streaming ? 'true' : 'false'},
}

with requests.post(url, headers=headers, json=payload, stream=${streaming ? 'True' : 'False'}, timeout=60) as resp:
    resp.raise_for_status()
    if ${streaming ? 'True' : 'False'}:
        for line in resp.iter_lines():
            if line and line.startswith(b"data: "):
                print(line[6:].decode("utf-8"))
    else:
        data = resp.json()
        print(data["choices"][0]["message"]["content"])`;
  }, [token, model, systemPrompt, userMessage, maxTokens, temperature, streaming]);

  const generateJavaScript = useCallback(() => {
    const apiKey = token ? 'YOUR_API_KEY' : 'YOUR_API_KEY';
    return `const response = await fetch('${API_ENDPOINTS.chat}${streaming ? '?stream=true' : ''}', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ${apiKey}',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: '${model}',
    messages: [
      { role: 'system', content: '${systemPrompt}' },
      { role: 'user', content: '${userMessage}' }
    ],
    max_tokens: ${maxTokens},
    temperature: ${temperature},
    stream: ${streaming ? 'true' : 'false'},
  })
});

if (${streaming ? 'true' : 'false'}) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split('\\n\\n');
    buffer = parts.pop() || '';
    for (const part of parts) {
      for (const line of part.split('\\n')) {
        if (!line.startsWith('data: ')) continue;
        console.log(line.slice(6).trim());
      }
    }
  }
} else {
  const data = await response.json();
  console.log(data.choices[0].message.content);
}`;
  }, [token, model, systemPrompt, userMessage, maxTokens, temperature, streaming]);

  const previewCode = useMemo(() => {
    switch (previewTab) {
      case 'curl':
        return generateCurl();
      case 'python':
        return generatePython();
      case 'javascript':
        return generateJavaScript();
      default:
        return generateCurl();
    }
  }, [previewTab, generateCurl, generatePython, generateJavaScript]);

  const previewTabs = [
    { id: 'curl', label: 'cURL' },
    { id: 'python', label: 'Python' },
    { id: 'javascript', label: 'JavaScript' },
  ];

  // Execute request
  const executeRequest = useCallback(async () => {
    if (!token) {
      setError('Please sign in to test the API');
      return;
    }

    setLoading(true);
    setError(null);
    setResponse(null);
    setStreamedContent('');

    const startTime = Date.now();
    abortControllerRef.current = new AbortController();

    try {
      const res = await fetch(API_ENDPOINTS.chat, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: abortControllerRef.current.signal,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `HTTP ${res.status}`);
      }

      if (streaming) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let fullContent = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ') && line !== 'data: [DONE]') {
              try {
                const data = JSON.parse(line.slice(6));
                const content =
                  data?.type === 'chunk'
                    ? data.content
                    : data?.choices?.[0]?.delta?.content
                      || data?.choices?.[0]?.message?.content;
                if (content) {
                  fullContent += content;
                  setStreamedContent(fullContent);
                }
              } catch (e) {
                // Skip invalid JSON
              }
            }
          }
        }

        setResponse({
          content: fullContent,
          usage: null, // Streaming doesn't return usage
        });
      } else {
        const data = await res.json();
        setResponse({
          content: data.choices?.[0]?.message?.content || '',
          usage: data.usage,
          raw: data,
        });
      }

      setRequestTime(Date.now() - startTime);
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  }, [token, requestBody, streaming]);

  // Stop request
  const stopRequest = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  // Copy preview code
  const handleCopyPreview = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(previewCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, [previewCode]);

  return (
    <motion.div
      className="api-playground"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
    >
      <div className="api-playground-header">
        <div className="api-playground-title">
          <Zap size={20} className="api-playground-icon" />
          <h3>API Playground</h3>
          <span className="api-playground-badge">Interactive</span>
        </div>
        <div className="api-playground-actions">
          {loading ? (
            <motion.button
              className="api-playground-btn api-playground-btn--stop"
              onClick={stopRequest}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Square size={16} />
              Stop
            </motion.button>
          ) : (
            <motion.button
              className="api-playground-btn api-playground-btn--run"
              onClick={executeRequest}
              disabled={!token}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Play size={16} />
              Run
            </motion.button>
          )}
        </div>
      </div>

      <div className="api-playground-content">
        {/* Request Panel */}
        <div className="api-playground-panel api-playground-request">
          <div className="api-playground-panel-header">
            <span>Request</span>
          </div>

          <div className="api-playground-form">
            {/* Model Selection */}
            <div className="api-playground-field">
              <label htmlFor="api-playground-model">Model</label>
              <select
                id="api-playground-model"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="api-playground-select"
              >
                {MODELS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.id} ({m.name})
                  </option>
                ))}
              </select>
            </div>

            {/* System Prompt */}
            <div className="api-playground-field">
              <label htmlFor="api-playground-system">System Prompt</label>
              <textarea
                id="api-playground-system"
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                className="api-playground-textarea"
                rows={2}
                placeholder="System instructions..."
              />
            </div>

            {/* User Message */}
            <div className="api-playground-field">
              <label htmlFor="api-playground-user">User Message</label>
              <textarea
                id="api-playground-user"
                value={userMessage}
                onChange={(e) => setUserMessage(e.target.value)}
                className="api-playground-textarea"
                rows={3}
                placeholder="Your message..."
              />
            </div>

            {/* Streaming Toggle */}
            <div className="api-playground-toggle">
              <label>
                <input
                  type="checkbox"
                  checked={streaming}
                  onChange={(e) => setStreaming(e.target.checked)}
                />
                <span>Enable streaming</span>
              </label>
            </div>

            {/* Advanced Options */}
            <button
              className="api-playground-advanced-toggle"
              onClick={() => setShowAdvanced(!showAdvanced)}
              type="button"
            >
              {showAdvanced ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              Advanced Options
            </button>

            <AnimatePresence>
              {showAdvanced && (
                <motion.div
                  className="api-playground-advanced"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="api-playground-field">
                    <label htmlFor="api-playground-max-tokens">Max Tokens: {maxTokens}</label>
                    <input
                      id="api-playground-max-tokens"
                      type="range"
                      min={64}
                      max={4096}
                      value={maxTokens}
                      onChange={(e) => setMaxTokens(Number(e.target.value))}
                      className="api-playground-slider"
                    />
                  </div>
                  <div className="api-playground-field">
                    <label htmlFor="api-playground-temperature">Temperature: {temperature}</label>
                    <input
                      id="api-playground-temperature"
                      type="range"
                      min={0}
                      max={2}
                      step={0.1}
                      value={temperature}
                      onChange={(e) => setTemperature(Number(e.target.value))}
                      className="api-playground-slider"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Response Panel */}
        <div className="api-playground-panel api-playground-response">
          <div className="api-playground-panel-header">
            <span>Response</span>
            {requestTime && (
              <span className="api-playground-time">
                <Clock size={12} />
                {(requestTime / 1000).toFixed(2)}s
              </span>
            )}
          </div>

          <div className="api-playground-response-content">
            {!token && (
              <div className="api-playground-auth-notice">
                <AlertCircle size={20} />
                <p>Sign in to test the API</p>
                <a href="/login" className="api-playground-signin-btn">
                  Sign In
                </a>
              </div>
            )}

            {loading && (
              <div className="api-playground-loading">
                <Loader2 size={24} className="api-playground-spinner" />
                <p>{streaming ? 'Streaming response...' : 'Waiting for response...'}</p>
              </div>
            )}

            {error && (
              <div className="api-playground-error">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            {(response || streamedContent) && !loading && (
              <div className="api-playground-result">
                <pre className="api-playground-result-content">
                  {response?.content || streamedContent}
                </pre>
                {response?.usage && (
                  <div className="api-playground-usage">
                    <span>Prompt: {response.usage.prompt_tokens}</span>
                    <span>Completion: {response.usage.completion_tokens}</span>
                    <span>Total: {response.usage.total_tokens}</span>
                  </div>
                )}
              </div>
            )}

            {streamedContent && loading && (
              <div className="api-playground-result api-playground-result--streaming">
                <pre className="api-playground-result-content">
                  {streamedContent}
                  <span className="api-playground-cursor">|</span>
                </pre>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Code Preview */}
      <div className="api-playground-preview">
        <div className="api-playground-preview-header">
          <span>Request Preview</span>
          <div className="api-playground-preview-actions">
            <TabGroup
              tabs={previewTabs}
              activeTab={previewTab}
              onTabChange={setPreviewTab}
              size="small"
            />
            <motion.button
              className="api-playground-copy-btn"
              onClick={handleCopyPreview}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? 'Copied!' : 'Copy'}
            </motion.button>
          </div>
        </div>
        <CodeBlock
          code={previewCode}
          language={previewTab === 'curl' ? 'bash' : previewTab}
          showHeader={false}
        />
      </div>
    </motion.div>
  );
};

export default ApiPlayground;
