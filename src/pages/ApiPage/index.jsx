import React, { startTransition, useEffect, useMemo, useState, useCallback } from "react";
import { Helmet } from "react-helmet-async";
import { motion, AnimatePresence } from "framer-motion";
import { useParams, useNavigate } from "react-router-dom";
import {
  Menu,
  X,
  Clock,
  GitCommit,
} from "lucide-react";

import {
  API_ENDPOINTS,
  fetchApiKeyStatus,
  fetchApiUsageLogs,
  fetchPlanStatus,
  rotateApiKey,
} from "@/api/apiKeys";
import { useAuth } from "@/context/AuthContext";

// Components
import {
  CodeBlock,
  TabGroup,
  FeatureCard,
  ModelCard,
  ResponseExample,
  ApiSearch,
  ApiPlayground,
  ApiStatusBadge,
  ApiNav,
} from "./components";

// Constants
import {
  CODE_EXAMPLES,
  RESPONSE_EXAMPLES,
  MODELS,
  FEATURES,
  OVERVIEW_CARDS,
  CHECKLIST_ITEMS,
  ERROR_CODES,
  CHANGELOG,
  CHANGE_TYPE_STYLES,
  DOCS_SECTIONS,
} from "./constants";

import "./ApiPage.css";

// ─────────────────────────────────────────────────────────────────────────────
// SEO & Structured Data
// ─────────────────────────────────────────────────────────────────────────────

const PAGE_TITLE = "Shannon API Documentation";
const PAGE_DESCRIPTION = "Public Shannon API docs covering chat completions, streaming, authentication, models, and usage analytics.";
const PAGE_KEYWORDS = "Shannon API documentation, chat completions, streaming API, JSON, LLM API";
const CANONICAL_URL = "https://shannon-ai.com";

const getStructuredData = () => ({
  "@context": "https://schema.org",
  "@type": "TechArticle",
  headline: "Shannon API Documentation",
  description: PAGE_DESCRIPTION,
  url: `${CANONICAL_URL}/api`,
  author: { "@type": "Organization", name: "Shannon AI" },
  publisher: {
    "@type": "Organization",
    name: "Shannon AI",
    logo: { "@type": "ImageObject", url: `${CANONICAL_URL}/SHANNONICO.ico` },
  },
  mainEntity: {
    "@type": "WebAPI",
    name: "Shannon AI API",
    description: "Shannon API for chat completions and streaming responses",
    documentation: `${CANONICAL_URL}/api`,
    provider: { "@type": "Organization", name: "Shannon AI" },
    termsOfService: `${CANONICAL_URL}/terms`,
    category: "Artificial Intelligence",
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────────────────────

const formatDateLabel = (iso) => {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const copyToClipboard = async (text, setCopied) => {
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  } catch (err) {
    console.error("Copy failed", err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Tab Configurations
// ─────────────────────────────────────────────────────────────────────────────

const QUICKSTART_TABS = [
  { id: "python", label: "Python", icon: "🐍" },
  { id: "javascript", label: "JavaScript", icon: "📜" },
  { id: "go", label: "Go", icon: "🐹" },
  { id: "curl", label: "cURL", icon: "💻" },
];

const DUAL_LANGUAGE_TABS = [
  { id: "python", label: "Python", icon: "🐍" },
  { id: "javascript", label: "JavaScript", icon: "📜" },
];

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

function ApiPage() {
  const { token, user } = useAuth();
  const { section: urlSection } = useParams();
  const navigate = useNavigate();

  // API Key state
  const [apiKey, setApiKey] = useState("");
  const [keyMeta, setKeyMeta] = useState(null);
  const [loadingKey, setLoadingKey] = useState(false);
  const [rotating, setRotating] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);

  // Usage state
  const [usageLogs, setUsageLogs] = useState([]);
  const [planStatus, setPlanStatus] = useState(null);

  // UI state
  const [error, setError] = useState("");
  const [activeSection, setActiveSection] = useState(urlSection || "overview");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [recharts, setRecharts] = useState(null);

  // Tab states
  const [quickstartTab, setQuickstartTab] = useState("python");
  const [streamingTab, setStreamingTab] = useState("python");

  useEffect(() => {
    startTransition(() => {
      setIsClient(true);
    });
    let mounted = true;
    import("recharts")
      .then((mod) => {
        if (mounted) {
          startTransition(() => {
            setRecharts(mod);
          });
        }
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  // Handle URL-based section navigation for SEO
  useEffect(() => {
    if (urlSection) {
      startTransition(() => {
        setActiveSection(urlSection);
      });
      // Use requestAnimationFrame to ensure DOM is ready, then scroll
      const scrollToElement = () => {
        const element = document.getElementById(urlSection);
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      };
      // Give the DOM time to render, then scroll
      requestAnimationFrame(() => {
        requestAnimationFrame(scrollToElement);
      });
    }
  }, [urlSection]);

  // Filter sections based on auth
  const sectionsForNav = useMemo(
    () => DOCS_SECTIONS.filter((section) => !section.authOnly || token),
    [token]
  );

  // Load API key and usage data
  useEffect(() => {
    if (!token) return;

    const loadKey = async () => {
      setLoadingKey(true);
      setError("");
      try {
        const data = await fetchApiKeyStatus(token);
        setApiKey(data?.key || "");
        setKeyMeta(data || null);
      } catch (err) {
        setError(err?.message || "Failed to load API key");
      } finally {
        setLoadingKey(false);
      }
    };

    const loadUsage = async () => {
      try {
        const data = await fetchApiUsageLogs(token);
        setUsageLogs(Array.isArray(data?.logs) ? data.logs : []);
      } catch (err) {
        console.error("Usage load error:", err);
      }
    };

    const loadPlanStatus = async () => {
      try {
        const data = await fetchPlanStatus(token);
        setPlanStatus(data || null);
      } catch (err) {
        console.error("Plan status load error:", err);
      }
    };

    loadKey();
    loadUsage();
    loadPlanStatus();
  }, [token]);

  // Chart data
  const chartData = useMemo(() => {
    const normalized = (usageLogs || []).map((log) => ({
      ts: log.created_at_iso || log.created_at || null,
      billed: Number(log.billed_tokens || log.total_tokens || 0),
      total: Number(log.total_tokens || 0),
      endpoint: (log.endpoint || "chat").toUpperCase(),
    }));
    return normalized.reverse();
  }, [usageLogs]);

  const {
    Area,
    AreaChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
  } = recharts || {};

  const totals = useMemo(() => {
    return (usageLogs || []).reduce(
      (acc, log) => {
        const billed = Number(log.billed_tokens || log.total_tokens || 0);
        acc.billed += Number.isFinite(billed) ? billed : 0;
        acc.calls += 1;
        return acc;
      },
      { billed: 0, calls: 0 }
    );
  }, [usageLogs]);

  // Handlers
  const handleRotate = async () => {
    if (!token || rotating) return;
    setRotating(true);
    setError("");
    try {
      const data = await rotateApiKey(token);
      setApiKey(data?.key || "");
      setKeyMeta(data || null);
    } catch (err) {
      setError(err?.message || "Failed to regenerate key");
    } finally {
      setRotating(false);
    }
  };

  const scrollToSection = useCallback((sectionId) => {
    setActiveSection(sectionId);
    setMobileNavOpen(false);

    // Scroll FIRST before navigation to ensure immediate response
    const element = document.getElementById(sectionId);
    if (element) {
      // Use scrollIntoView which respects scroll-margin-top CSS property
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    // Update URL for SEO (use /api for overview, /api/section for others)
    const newPath = sectionId === "overview" ? "/api" : `/api/${sectionId}`;
    // Use replace with a slight delay to not interfere with scroll
    requestAnimationFrame(() => {
      navigate(newPath, { replace: true });
    });
  }, [navigate]);

  const displayApiKey = apiKey || "YOUR_API_KEY";

  return (
    <div className="api-page">
      {/* SEO Meta Tags */}
      <Helmet>
        <title>{PAGE_TITLE}</title>
        <meta name="description" content={PAGE_DESCRIPTION} />
        <meta name="keywords" content={PAGE_KEYWORDS} />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href={`${CANONICAL_URL}/api`} />
        <meta property="og:title" content={PAGE_TITLE} />
        <meta property="og:description" content={PAGE_DESCRIPTION} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={`${CANONICAL_URL}/api`} />
        <meta property="og:image" content={`${CANONICAL_URL}/shannonbanner.png`} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={PAGE_TITLE} />
        <meta name="twitter:description" content={PAGE_DESCRIPTION} />
        <script type="application/ld+json">{JSON.stringify(getStructuredData())}</script>
      </Helmet>

      {/* Hero Section */}
      <motion.header
        className="api-hero"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="hero-top-bar">
          <ApiStatusBadge />
          <ApiSearch onNavigate={scrollToSection} />
        </div>
        <motion.div
          className="hero-badge"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
        >
          API Documentation
        </motion.div>
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          Shannon API
        </motion.h1>
        <motion.p
          className="hero-tagline"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          Production-ready chat API with streaming, long context, and usage tracking.
        </motion.p>
        <motion.div
          className="hero-actions"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          {token ? (
            <a href="#your-api-key" className="hero-btn primary" onClick={(e) => { e.preventDefault(); scrollToSection("your-api-key"); }}>
              View Your API Key
            </a>
          ) : (
            <a href="/login" className="hero-btn primary">
              Get Your API Key
            </a>
          )}
          <a href="#playground" className="hero-btn secondary" onClick={(e) => { e.preventDefault(); scrollToSection("playground"); }}>
            Try Playground
          </a>
        </motion.div>
      </motion.header>

      {/* Mobile Navigation Toggle */}
      <motion.button
        className={`mobile-nav-toggle ${mobileNavOpen ? "active" : ""}`}
        onClick={() => setMobileNavOpen(!mobileNavOpen)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        aria-label={mobileNavOpen ? "Close navigation" : "Open navigation"}
      >
        {mobileNavOpen ? <X size={24} /> : <Menu size={24} />}
      </motion.button>

      {/* Mobile Navigation Overlay */}
      <AnimatePresence>
        {mobileNavOpen && (
          <motion.div
            className="mobile-nav-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileNavOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Main Documentation Layout */}
      <div className="docs-layout">
        {/* Sidebar */}
        <aside className={`docs-sidebar ${mobileNavOpen ? "mobile-open" : ""}`}>
          <ApiNav
            sections={sectionsForNav}
            activeSection={activeSection}
            onSectionClick={scrollToSection}
            className={mobileNavOpen ? "mobile-open" : ""}
          />
        </aside>

        {/* Main Content */}
        <main className="docs-content">
          {/* Overview Section */}
          <section id="overview" className="doc-section overview-section">
            <div className="section-header">
              <h2>Overview</h2>
              <span className="pill success">Public docs</span>
            </div>
            <p className="section-intro">
              Everything you need to ship with the Shannon chat API.
            </p>

            <div className="overview-grid">
              {OVERVIEW_CARDS.map((card) => (
                <motion.div
                  key={card.title}
                  className="overview-card"
                  whileHover={{ y: -4, borderColor: "rgba(255, 23, 68, 0.25)" }}
                >
                  <div className="overview-card-meta">
                    <span className="pill subtle">{card.badge}</span>
                    <span className="overview-title">{card.title}</span>
                  </div>
                  <code className="overview-value">
                    {card.valueKey ? API_ENDPOINTS[card.valueKey] : card.value}
                  </code>
                  <p className="overview-description">{card.description}</p>
                </motion.div>
              ))}
            </div>

            <div className="checklist-grid">
              <div className="checklist-card">
                <div className="checklist-title">Launch checklist</div>
                <ul className="checklist-list">
                  {CHECKLIST_ITEMS.map((item) => (
                    <li key={item.title} className="checklist-item">
                      <span className="checkmark">✓</span>
                      <div className="checklist-copy">
                        <div className="checklist-item-title">{item.title}</div>
                        <div className="checklist-item-detail">{item.detail}</div>
                      </div>
                      <span className="pill subtle">{item.badge}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          {/* Capabilities Section */}
          <section id="capabilities" className="doc-section">
            <div className="section-header">
              <h2>Capabilities</h2>
              <span className="pill subtle">Core</span>
            </div>
            <p className="section-intro">
              Core features for building fast, reliable chat experiences.
            </p>
            <div className="features-grid">
              {FEATURES.map((feature, idx) => (
                <FeatureCard key={idx} {...feature} index={idx} />
              ))}
            </div>
          </section>

          {/* Quick Start Section */}
          <section id="quickstart" className="doc-section">
            <div className="section-header">
              <h2>Quick Start</h2>
              <span className="pill subtle">5 minutes</span>
            </div>
            <p className="section-intro">
              Get started in three steps. Use the Shannon chat endpoint and your API key.
            </p>

            <div className="quickstart-grid">
              <div className="quickstart-steps">
                <div className="step-card">
                  <div className="step-number">1</div>
                  <div className="step-body">
                    <h3>Set your base URL</h3>
                    <p>Use the Shannon chat endpoint.</p>
                    <div className="endpoint-display">
                      <code>{API_ENDPOINTS.chat}</code>
                    </div>
                  </div>
                </div>
                <div className="step-card">
                  <div className="step-number">2</div>
                  <div className="step-body">
                    <h3>Add your API key</h3>
                    <p>Use Bearer auth in the Authorization header.</p>
                  </div>
                </div>
                <div className="step-card">
                  <div className="step-number">3</div>
                  <div className="step-body">
                    <h3>Send your first message</h3>
                    <p>Pick a language and swap in your key.</p>
                  </div>
                </div>
              </div>

              <div className="quickstart-code">
                <TabGroup tabs={QUICKSTART_TABS} activeTab={quickstartTab} onTabChange={setQuickstartTab} />
                <CodeBlock
                  code={CODE_EXAMPLES.quickstart[quickstartTab]?.(displayApiKey, API_ENDPOINTS.chat) || ""}
                  language={quickstartTab === "curl" ? "bash" : quickstartTab}
                />
              </div>
            </div>

            <h3>Response format</h3>
            <ResponseExample title="Success Response" json={RESPONSE_EXAMPLES.success} />
          </section>

          {/* Playground Section */}
          <section id="playground" className="doc-section">
            <div className="section-header">
              <h2>Playground</h2>
              <span className="pill" style={{ background: "linear-gradient(135deg, #ff1744 0%, #ff6b81 100%)", color: "#fff", border: "none" }}>
                New
              </span>
            </div>
            <p className="section-intro">
              Test the Shannon API directly in your browser. Build your request, run it, and see the response in real-time.
            </p>
            <ApiPlayground />
          </section>

          {/* Authentication Section */}
          <section id="authentication" className="doc-section">
            <h2>Authentication</h2>
            <p className="section-intro">
              All API requests require authentication using your Shannon API key.
            </p>
            <CodeBlock code={`Authorization: Bearer ${displayApiKey}`} language="http" />
          </section>

          {/* Models Section */}
          <section id="models" className="doc-section">
            <h2>Models</h2>
            <p className="section-intro">
              Shannon offers multiple models optimized for different use cases.
            </p>
            <div className="models-grid">
              {MODELS.map((model, idx) => (
                <ModelCard key={model.id} model={model} index={idx} />
              ))}
            </div>
          </section>

          {/* Streaming Section */}
          <section id="streaming" className="doc-section">
            <h2>Streaming</h2>
            <p className="section-intro">
              Enable real-time token streaming with Server-Sent Events for responsive UIs.
            </p>
            <TabGroup tabs={DUAL_LANGUAGE_TABS} activeTab={streamingTab} onTabChange={setStreamingTab} />
            <CodeBlock
              code={CODE_EXAMPLES.streaming[streamingTab]?.(displayApiKey, API_ENDPOINTS.chat) || ""}
              language={streamingTab}
            />
            <div className="info-box">
              <strong>Tip:</strong> Streaming responses arrive as Server-Sent Events. Each event includes a JSON payload.
            </div>
          </section>

          {/* Errors Section */}
          <section id="errors" className="doc-section">
            <h2>Error Handling</h2>
            <p className="section-intro">
              Shannon uses standard HTTP status codes and returns detailed error messages.
            </p>
            <div className="error-table">
              {ERROR_CODES.map((err) => (
                <div key={err.code} className="error-row">
                  <span className="error-code">{err.code}</span>
                  <span className="error-name">{err.name}</span>
                  <span>{err.description}</span>
                </div>
              ))}
            </div>
            <h3>Error Response Format</h3>
            <ResponseExample title="Error Response" json={RESPONSE_EXAMPLES.error} type="error" />
          </section>

          {/* Changelog Section */}
          <section id="changelog" className="doc-section">
            <div className="section-header">
              <h2>Changelog</h2>
              <Clock size={18} style={{ color: "rgba(255, 255, 255, 0.5)" }} />
            </div>
            <p className="section-intro">
              Recent updates and improvements to the Shannon API.
            </p>
            <div className="changelog-list">
              {CHANGELOG.map((release) => (
                <motion.div
                  key={release.version}
                  className="changelog-item"
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                >
                  <div className="changelog-header">
                    <div className="changelog-version">
                      <GitCommit size={16} />
                      <span>v{release.version}</span>
                    </div>
                    <span className="changelog-date">{release.date}</span>
                  </div>
                  <ul className="changelog-changes">
                    {release.changes.map((change, idx) => (
                      <li key={idx}>
                        <span
                          className="change-type"
                          style={{
                            backgroundColor: CHANGE_TYPE_STYLES[change.type]?.color + "20",
                            color: CHANGE_TYPE_STYLES[change.type]?.color,
                          }}
                        >
                          {CHANGE_TYPE_STYLES[change.type]?.label}
                        </span>
                        {change.text}
                      </li>
                    ))}
                  </ul>
                </motion.div>
              ))}
            </div>
          </section>

          {/* API Key Section (Auth only) */}
          {token && (
            <section id="your-api-key" className="doc-section api-key-section">
              <div className="section-header">
                <h2>Your API Key</h2>
                <span className="auth-badge">Authenticated</span>
              </div>
              {error && <div className="api-error">{error}</div>}
              <div className="key-card">
                <div className="key-info">
                  <span className="key-label">API Key for {user?.email || "your account"}</span>
                  <div className="key-row">
                    <code className="key-value">
                      {loadingKey ? "Loading..." : apiKey || "No key generated yet"}
                    </code>
                    <div className="key-actions">
                      <button className="btn-ghost" onClick={() => copyToClipboard(apiKey, setCopiedKey)} disabled={!apiKey}>
                        {copiedKey ? "✓ Copied" : "Copy"}
                      </button>
                      <button className="btn-primary" onClick={handleRotate} disabled={rotating || loadingKey}>
                        {rotating ? "Rotating..." : "Regenerate"}
                      </button>
                    </div>
                  </div>
                </div>
                <p className="key-warning">
                  Keep your API key secret. Regenerating creates a new key and invalidates the old one.
                </p>
                {keyMeta && (
                  <div className="key-meta">
                    <div><span>Version:</span> {keyMeta.version || 1}</div>
                    <div><span>Last rotated:</span> {keyMeta.last_rotated_at_iso ? formatDateLabel(keyMeta.last_rotated_at_iso) : "Never"}</div>
                    <div><span>Last used:</span> {keyMeta.last_used_at_iso ? formatDateLabel(keyMeta.last_used_at_iso) : "Never"}</div>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Usage Section (Auth only) */}
          {token && (
            <section id="usage" className="doc-section">
              <h2>Your Usage</h2>
              <div className="usage-stats">
                <div className="stat-card">
                  <span className="stat-value">{totals.calls.toLocaleString()}</span>
                  <span className="stat-label">API Calls</span>
                </div>
                <div className="stat-card">
                  <span className="stat-value">{totals.billed.toLocaleString()}</span>
                  <span className="stat-label">Tokens Used</span>
                </div>
              </div>

              {isClient && recharts && chartData.length > 0 && (
                <div className="chart-container">
                  <h3>Token Usage Over Time</h3>
                  <div className="chart-shell">
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={chartData} margin={{ top: 20, right: 24, left: 0, bottom: 16 }}>
                        <defs>
                          <linearGradient id="colorBilled" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="10%" stopColor="#ff1744" stopOpacity={0.9} />
                            <stop offset="90%" stopColor="#ff1744" stopOpacity={0.05} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                        <XAxis dataKey="ts" tickFormatter={formatDateLabel} stroke="rgba(255,255,255,0.6)" />
                        <YAxis tickFormatter={(v) => v.toLocaleString()} stroke="rgba(255,255,255,0.6)" />
                        <Tooltip
                          formatter={(value, _name, props) => [`${Number(value || 0).toLocaleString()} tokens`, props?.payload?.endpoint || "Billed"]}
                          contentStyle={{ background: "rgba(10,10,18,0.95)", border: "1px solid rgba(255,23,68,0.2)", color: "#fff" }}
                        />
                        <Area type="monotone" dataKey="billed" stroke="#ff1744" fill="url(#colorBilled)" strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </section>
          )}
        </main>
      </div>

      {/* CTA Section */}
      <motion.section
        className="cta-section"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
      >
        <h2>Ready to Build?</h2>
        <p>Get your API key and start building with Shannon AI today.</p>
        <div className="cta-actions">
          {!token && (
            <a href="/login" className="btn-primary large">Get Your API Key</a>
          )}
          <a href="/plan" className="btn-secondary large">View Pricing</a>
        </div>
      </motion.section>
    </div>
  );
}

export default ApiPage;
