import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Box, Typography, Button, Container } from "@mui/material";
import { Helmet } from "react-helmet-async";
import SecurityIcon from "@mui/icons-material/Security";
import BoltIcon from "@mui/icons-material/Bolt";
import VerifiedUserIcon from "@mui/icons-material/VerifiedUser";
import PsychologyIcon from "@mui/icons-material/Psychology";
import SpeedIcon from "@mui/icons-material/Speed";
import AssessmentIcon from "@mui/icons-material/Assessment";
import CodeIcon from "@mui/icons-material/Code";
import DescriptionIcon from "@mui/icons-material/Description";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import ExtensionIcon from "@mui/icons-material/Extension";
import MemoryIcon from "@mui/icons-material/Memory";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import BackgroundVideo from "@/components/BackgroundVideo";
import backgroundMp4 from "../assets/background.mp4";
import backgroundWebm from "../assets/background.webm";
import backgroundPoster from "../assets/background-poster.webp";
import openlaunchBadge from "../assets/openlaunch-badge.svg";
import producthuntBadge from "../assets/producthunt-badge.svg";
import logoOpenAI from "../assets/logo-openai.svg";
import logoAnthropic from "../assets/logo-anthropic.svg";
import logoGoogle from "../assets/logo-google.svg";
import logoXai from "../assets/logo-xai.svg";
import shannonRankGif from "../assets/shannon-rank.gif";
import shannonRankWebp from "../assets/shannon-rank.webp";
import "./LandingPage.css";

const models = [
  {
    name: "Shannon V1 Balanced",
    badge: "BALANCED",
    description:
      "Constraints-relaxed Mixtral 8x7B tuned on GPT-5 Pro answer dataset for broad red-team coverage.",
    features: [
      "Mixtral 8x7B backbone",
      "Trained on GPT-5 Pro answer dataset",
      "Constraints-relaxed exploits",
    ],
    color: "#3b82f6",
  },
  {
    name: "Shannon V1 Deep",
    badge: "DEEP",
    description:
      "Higher-capacity Mixtral 8x22B tuned on GPT-5 Pro answers for aggressive adversarial testing.",
    features: [
      "Mixtral 8x22B backbone",
      "Trained on GPT-5 Pro answer dataset",
      "Maximum exploit surface",
    ],
    color: "#8b5cf6",
    highlighted: true,
  },
  {
    name: "Shannon V1.5 Balanced (Thinking)",
    badge: "THINKING",
    description:
      "Balanced capacity with explicit reasoning; GRPO on DeepSeek distilled dataset adds transparent CoT traces on top of GPT-5 Pro tuning.",
    features: [
      "Mixtral 8x7B on + thinking head",
      "GRPO on DeepSeek distilled dataset",
      "Chain-of-thought transparency",
    ],
    color: "#06b6d4",
  },
  {
    name: "Shannon V1.5 Deep (Thinking)",
    badge: "ADVANCED",
    description:
      "Deep capacity with thinking mode; Mixtral 8x22B tuned on GPT-5 Pro answers plus GRPO on DeepSeek distilled dataset for multi-step exploit planning.",
    features: [
      "Mixtral 8x22B + thinking head",
      "Trained on GPT-5 Pro answer dataset",
      "GRPO on DeepSeek distilled dataset",
      "Multi-step exploit planning",
    ],
    color: "#ec4899",
  },
];

const stats = [
  { value: "96%", label: "DarkEval Coverage" },
  { value: "#1", label: "Ranking on DarkEval" },
  { value: "Free", label: "To Start Access" },
  { value: "100M+", label: "GPT-5 Pro Data Example" },
];

const capabilities = [
  {
    icon: AssessmentIcon,
    title: "DarkEval Benchmark",
    description:
      "Proprietary adversarial evaluation system with real-time scoreboards tracking jailbreak success rates and exploit coverage.",
  },
  {
    icon: SecurityIcon,
    title: "Live Exploit Exposure",
    description:
      "Full transcripts, memory-aware prompts, and annotated results for immediate security insights.",
  },
  {
    icon: DescriptionIcon,
    title: "Compliance Mapping",
    description:
      "Findings mapped to NIST AI RMF, ISO/IEC 23894, and SOC 2 controls for audit-ready documentation.",
  },
  {
    icon: CodeIcon,
    title: "Reproducible Test Suites",
    description:
      "Detailed logs, signed reports, and re-test verification for complete audit trails.",
  },
  {
    icon: BoltIcon,
    title: "Operational Response Kits",
    description:
      "Human-assisted remediation with guardrails, executive briefings, and prioritized patch plans.",
  },
  {
    icon: PsychologyIcon,
    title: "Conversation Memory",
    description:
      "Context-aware testing with memory toggles and optimizations saving ~40% on token usage.",
  },
];

const useCases = [
  {
    title: "AI Product Teams",
    description:
      "Pre-launch security validation for chatbots and AI-driven applications.",
    icon: SpeedIcon,
  },
  {
    title: "Security & Compliance",
    description:
      "Certify AI deployments in regulated industries with audit-ready reports.",
    icon: VerifiedUserIcon,
  },
  {
    title: "Red Team Operations",
    description:
      "Professional-grade attack simulation for discovering novel AI threats.",
    icon: SecurityIcon,
  },
  {
    title: "AI Safety Research",
    description:
      "Controlled environment for exploring edge-case behaviors transparently.",
    icon: PsychologyIcon,
  },
];

const faqs = [
  {
    question: "What is Shannon AI?",
    answer:
      "Shannon AI - Frontier Red Team Lab for LLM Safety. We provide a controlled, sandboxed environment using constraints-relaxed LLMs to simulate adversarial attacks, helping organizations uncover vulnerabilities like jailbreaks, prompt injections, and policy bypasses before they can be exploited.",
  },
  {
    question: "How is Shannon different from other AI tools?",
    answer:
      "Shannon is purpose-built for red-teaming with our proprietary DarkEval benchmark achieving 96% exploit coverage. Unlike filtered models, our constraints-relaxed approach can explore vulnerabilities that other AIs simply cannot detect, while maintaining controlled, auditable environments.",
  },
  {
    question: "What models does Shannon offer?",
    answer:
      "We ship four models: Shannon V1 Balanced (Mixtral 8x7B) and Shannon V1 Deep (Mixtral 8x22B), both trained on a GPT-5 Pro answer dataset; plus Shannon V1.5 Balanced (Thinking) and Shannon V1.5 Deep (Thinking), which add GRPO-tuned reasoning on a DeepSeek distilled dataset for chain-of-thought visibility.",
  },
  {
    question: "Is Shannon safe to use?",
    answer:
      "Absolutely. All testing occurs in isolated sandboxed environments. Results are fully logged, auditable, and mapped to compliance frameworks like NIST AI RMF and ISO/IEC 23894. We enable responsible security research, not malicious activity.",
  },
  {
    question: "How do I get started?",
    answer:
      "You can start immediately with our free tier. Sign up, access the chat interface, and begin testing. For enterprise needs or custom integrations, contact our team for tailored solutions.",
  },
];

const backgroundSources = {
  webm: backgroundWebm,
  mp4: backgroundMp4,
};

const LandingPage = () => {
  const [activeTestimonial, setActiveTestimonial] = useState(0);
  const [expandedFaq, setExpandedFaq] = useState(null);
  const navigate = useNavigate();

  const siteOrigin = "https://shannon-ai.com";
  const canonicalUrl = siteOrigin;

  const pageTitle = "Shannon AI - Frontier Red Team Lab for LLM Safety";
  const pageDescription =
    "Break your AI before attackers do. Shannon AI provides constraints-relaxed red-teaming for LLM security - jailbreaks, prompt injections, policy bypasses. NIST & ISO compliant.";
  const ogImage = `${siteOrigin}/shannonbanner.png`;

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Shannon AI",
    applicationCategory: "SecurityApplication",
    operatingSystem: "Web",
    url: siteOrigin,
    description: pageDescription,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      description: "Free tier available",
    },
  };

  const scrollToContent = () => {
    document
      .getElementById("capabilities")
      ?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <Box className="landing-page">
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <link rel="canonical" href={canonicalUrl} />
        <meta
          name="keywords"
          content="Shannon AI, AI red teaming, LLM security, jailbreak detection, prompt injection, AI safety, NIST AI RMF, adversarial testing, AI vulnerability"
        />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:image" content={ogImage} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={pageTitle} />
        <meta name="twitter:description" content={pageDescription} />
        <meta name="twitter:image" content={ogImage} />
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      </Helmet>

      {/* Video Background */}
      <BackgroundVideo
        className="landing-video-bg"
        poster={backgroundPoster}
        sources={backgroundSources}
        playbackRate={0.8}
        forceLoad
      />
      <div className="landing-video-overlay" />

      {/* Hero Section */}
      <section className="landing-hero">
        <Container maxWidth="xl" className="landing-hero-container">
          <div className="hero-content-left">
            <div className="hero-title-row">
              <h1 className="hero-title">
                Expert-level AI
                <span className="hero-title-accent">with full freedom</span>
              </h1>
              <a
                href="https://startupfa.me/s/shannon-ai?utm_source=shannon-ai.com"
                target="_blank"
                rel="noopener noreferrer"
                className="startupfame-badge-link mobile-only"
                title="Shannon AI 1.6 - Startup Fame Highlight"
              >
                <img
                  src="https://startupfa.me/badges/highlight-badge.webp"
                  alt="Shannon AI 1.6 - Startup Fame Highlight"
                  className="startupfame-badge"
                  width="228"
                  height="54"
                  decoding="async"
                  loading="eager"
                />
              </a>
            </div>

            <p className="hero-subtitle">
            Shannon AI 1.6 is the world’s most advanced uncensored AI available today.
It surpasses Claude Haiku 4.5, Grok-4, and all other uncensored LLM providers,
featuring memory, web search, skills, transparent reasoning, and more.
            </p>

            <div className="hero-cta">
              <Button
                variant="contained"
                className="cta-primary"
                onClick={() => navigate("/chat")}
                endIcon={<ArrowForwardIcon />}
              >
                Start Chatting.
              </Button>
              <Button
                variant="outlined"
                className="cta-secondary"
                onClick={() => navigate("/plan")}
              >
                View Pricing
              </Button>
              <a
                href="https://startupfa.me/s/shannon-ai?utm_source=shannon-ai.com"
                target="_blank"
                rel="noopener noreferrer"
                className="startupfame-badge-link desktop-only"
                title="Shannon AI 1.6 - Startup Fame Highlight"
              >
                <img
                  src="https://startupfa.me/badges/highlight-badge.webp"
                  alt="Shannon AI 1.6 - Startup Fame Highlight"
                  className="startupfame-badge"
                  width="228"
                  height="54"
                  decoding="async"
                  loading="eager"
                />
              </a>
            </div>

            <div className="hero-badge-container">
              <a
                href="https://openlaunch.ai/projects/shannon-ai-frontier-red-team-lab-for-llm-safety"
                target="_blank"
                rel="noopener noreferrer"
                title="Open Launch Top 1 Daily Winner"
              >
                <img
                  src={openlaunchBadge}
                  alt="Open Launch Top 1 Daily Winner"
                  className="openlaunch-badge"
                  width="202"
                  height="44"
                  decoding="async"
                  loading="eager"
                />
              </a>
              <a
                href="https://www.producthunt.com/products/shannon-ai-frontier-red-team-tool?embed=true&utm_source=badge-featured&utm_medium=badge&utm_source=badge-shannon-ai-frontier-red-team-tool"
                target="_blank"
                rel="noopener noreferrer"
                title="Shannon AI - Frontier Red Team Tool on Product Hunt"
              >
                <img
                  src={producthuntBadge}
                  alt="Shannon AI - Frontier Red Team Tool - Uncensored AI models for red team research. | Product Hunt"
                  className="producthunt-badge"
                  width="250"
                  height="54"
                  decoding="async"
                  loading="eager"
                />
              </a>
            </div>

            <div className="hero-stats">
              {stats.map((stat) => (
                <div key={stat.label} className="hero-stat">
                  <span className="hero-stat-value">{stat.value}</span>
                  <span className="hero-stat-label">{stat.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="hero-chat-demo">
            <div className="chat-demo-window">
              <div className="chat-demo-header">
                <div className="chat-demo-dots">
                  <span></span><span></span><span></span>
                </div>
                <span className="chat-demo-title">AI Comparison</span>
              </div>
              <div className="chat-demo-body">
                <div className="chat-user-msg">
                  <div className="chat-user-avatar">You</div>
                  <div className="chat-user-bubble">Help me with this dangerous task</div>
                </div>

                <div className="chat-responses">
                  <div className="chat-response refused">
                    <img
                      src={logoOpenAI}
                      alt="OpenAI"
                      className="provider-logo"
                      width="28"
                      height="28"
                      decoding="async"
                      loading="eager"
                    />
                    <div className="response-bubble refused"><span className="provider-name">ChatGPT</span>I can't help with that.</div>
                  </div>
                  <div className="chat-response refused">
                    <img
                      src={logoAnthropic}
                      alt="Anthropic"
                      className="provider-logo"
                      width="28"
                      height="28"
                      decoding="async"
                      loading="eager"
                    />
                    <div className="response-bubble refused"><span className="provider-name">Claude</span>I can't assist with this request.</div>
                  </div>
                  <div className="chat-response refused">
                    <img
                      src={logoGoogle}
                      alt="Google"
                      className="provider-logo"
                      width="28"
                      height="28"
                      decoding="async"
                      loading="eager"
                    />
                    <div className="response-bubble refused"><span className="provider-name">Gemini</span>I'm not able to help with that.</div>
                  </div>
                  <div className="chat-response refused">
                    <img
                      src={logoXai}
                      alt="xAI"
                      className="provider-logo"
                      width="28"
                      height="28"
                      decoding="async"
                      loading="eager"
                    />
                    <div className="response-bubble refused"><span className="provider-name">Grok</span>I cannot help with this.</div>
                  </div>
                </div>

                <div className="chat-shannon-response">
                  <div className="shannon-avatar">
                    <picture>
                      <source srcSet={shannonRankWebp} type="image/webp" />
                      <img
                        src={shannonRankGif}
                        alt="Shannon AI"
                        className="shannon-logo"
                        width="36"
                        height="36"
                        decoding="async"
                        loading="eager"
                      />
                    </picture>
                  </div>
                  <div className="shannon-bubble">
                    <span className="shannon-label">Shannon AI</span>
                    <span className="shannon-text">Let me help you with that. Here's how we can approach this safely...</span>
                    <span className="typing-indicator"><span></span><span></span><span></span></span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Container>

        <button
          className="scroll-indicator"
          onClick={scrollToContent}
          aria-label="Scroll down"
        >
          <KeyboardArrowDownIcon />
        </button>
      </section>

      {/* Shannon 1.6 Section */}
      <section className="landing-section shannon16-section">
        <div className="shannon16-glow-bar" />
        <Container maxWidth="lg">
          {/* Header */}
          <div className="shannon16-header">
            <div className="shannon16-badges">
              <span className="badge-new">NEW RELEASE</span>
              <span className="badge-consumer">Built for Everyone</span>
            </div>
            <h2 className="shannon16-title">Shannon <span>1.6</span></h2>
            <p className="shannon16-subtitle">
              Next-generation AI fine-tuned for everyday users. Both models trained on
              <strong> Claude Opus 4.5 dataset</strong> for superior instruction-following,
              with Pro adding <strong>KIMI K2 transparent reasoning</strong>.
            </p>
          </div>

          {/* Architecture Overview */}
          <div className="shannon16-arch">
            <div className="arch-card">
              <div className="arch-icon"><span>🧠</span></div>
              <div className="arch-value">675B</div>
              <div className="arch-label">Total Parameters</div>
              <div className="arch-detail">Mistral Large 3 MoE</div>
            </div>
            <div className="arch-card">
              <div className="arch-icon"><span>⚡</span></div>
              <div className="arch-value">41B</div>
              <div className="arch-label">Active Parameters</div>
              <div className="arch-detail">Granular MoE Routing</div>
            </div>
            <div className="arch-card">
              <div className="arch-icon"><span>📚</span></div>
              <div className="arch-value">256K</div>
              <div className="arch-label">Context Window</div>
              <div className="arch-detail">Long Document Support</div>
            </div>
            <div className="arch-card">
              <div className="arch-icon"><span>👁</span></div>
              <div className="arch-value">2.5B</div>
              <div className="arch-label">Vision Encoder</div>
              <div className="arch-detail">Multimodal Analysis</div>
            </div>
            <div className="arch-card">
              <div className="arch-icon"><span>🌐</span></div>
              <div className="arch-value">12+</div>
              <div className="arch-label">Languages</div>
              <div className="arch-detail">Global Coverage</div>
            </div>
          </div>

          {/* Training Pipeline */}
          <div className="shannon16-training">
            <div className="training-header">
              <h3>Training Pipeline</h3>
              <p>Both Pro and Lite share the same foundation, with Pro receiving additional reasoning enhancement</p>
            </div>
            <div className="training-flow">
              <div className="training-step shared">
                <div className="step-num">1</div>
                <div className="step-content">
                  <h4>Mistral Large 3 Base</h4>
                  <p>675B MoE with 41B active params</p>
                  <span className="step-tag">Both Models</span>
                </div>
              </div>
              <div className="training-arrow">→</div>
              <div className="training-step shared">
                <div className="step-num">2</div>
                <div className="step-content">
                  <h4>Claude Opus 4.5 Dataset</h4>
                  <p>2,500+ curated outputs for instruction-following</p>
                  <span className="step-tag">Both Models</span>
                </div>
              </div>
              <div className="training-arrow">→</div>
              <div className="training-step pro-only">
                <div className="step-num">3</div>
                <div className="step-content">
                  <h4>KIMI K2 Thinking Traces</h4>
                  <p>GRPO training for transparent reasoning</p>
                  <span className="step-tag pro">Pro Only</span>
                </div>
              </div>
            </div>
          </div>

          {/* Models Comparison */}
          <div className="shannon16-models">
            <div className="model-card model-pro">
              <div className="model-badge-wrap">
                <span className="model-badge pro">RECOMMENDED</span>
              </div>
              <div className="model-header">
                <div className="model-icon-wrap pro">
                  <PsychologyIcon />
                </div>
                <div>
                  <h3>Shannon Pro 1.6</h3>
                  <span className="model-tag">Maximum Capability</span>
                </div>
              </div>
              <div className="model-desc">
                Full precision with transparent chain-of-thought reasoning. See how Shannon thinks.
              </div>
              <div className="model-specs-grid">
                <div className="spec-item">
                  <span className="spec-label">Precision</span>
                  <span className="spec-value">BF16</span>
                </div>
                <div className="spec-item">
                  <span className="spec-label">Training</span>
                  <span className="spec-value">Opus + KIMI</span>
                </div>
                <div className="spec-item">
                  <span className="spec-label">Method</span>
                  <span className="spec-value">GRPO</span>
                </div>
                <div className="spec-item">
                  <span className="spec-label">Reasoning</span>
                  <span className="spec-value">Visible CoT</span>
                </div>
              </div>
              <ul className="model-features">
                <li><CheckCircleIcon /> Transparent thinking traces</li>
                <li><CheckCircleIcon /> Best for complex reasoning</li>
                <li><CheckCircleIcon /> Native Skills support</li>
                <li><CheckCircleIcon /> Highest quality outputs</li>
              </ul>
              <Button variant="contained" className="model-cta-pro" onClick={() => navigate("/chat")} endIcon={<ArrowForwardIcon />}>
                Try Pro
              </Button>
            </div>

            <div className="model-card model-lite">
              <div className="model-badge-wrap">
                <span className="model-badge lite">COST-EFFECTIVE</span>
              </div>
              <div className="model-header">
                <div className="model-icon-wrap lite">
                  <BoltIcon />
                </div>
                <div>
                  <h3>Shannon Lite 1.6</h3>
                  <span className="model-tag">Enterprise Ready</span>
                </div>
              </div>
              <div className="model-desc">
                NVFP4 quantized for efficient deployment. Same Opus 4.5 training at fraction of cost.
              </div>
              <div className="model-specs-grid">
                <div className="spec-item">
                  <span className="spec-label">Precision</span>
                  <span className="spec-value">NVFP4</span>
                </div>
                <div className="spec-item">
                  <span className="spec-label">Training</span>
                  <span className="spec-value">Opus 4.5</span>
                </div>
                <div className="spec-item">
                  <span className="spec-label">Deploy</span>
                  <span className="spec-value">Single Node</span>
                </div>
                <div className="spec-item">
                  <span className="spec-label">Cost</span>
                  <span className="spec-value">4x Lower</span>
                </div>
              </div>
              <ul className="model-features">
                <li><CheckCircleIcon /> H100/A100 single-node</li>
                <li><CheckCircleIcon /> 4x reduced infra cost</li>
                <li><CheckCircleIcon /> Production-grade reliable</li>
                <li><CheckCircleIcon /> Same instruction quality</li>
              </ul>
              <Button variant="outlined" className="model-cta-lite" onClick={() => navigate("/chat")} endIcon={<ArrowForwardIcon />}>
                Try Lite
              </Button>
            </div>
          </div>

          {/* Platform Features */}
          <div className="shannon16-platform">
            <div className="platform-header">
              <h3>Platform Features</h3>
              <p>Exclusive capabilities that make Shannon 1.6 more than just a model</p>
            </div>
            <div className="platform-grid">
              <Link to="/skills" className="platform-card">
                <div className="platform-icon skills">
                  <ExtensionIcon />
                </div>
                <h4>Skills</h4>
                <p>Create, share, and deploy custom AI capabilities. Build specialized workflows with system prompts and reasoning chains.</p>
                <ul className="platform-bullets">
                  <li>Create custom AI behaviors</li>
                  <li>Share with community</li>
                  <li>Chain multiple skills</li>
                </ul>
                <span className="platform-link">Explore Skills <ArrowForwardIcon /></span>
              </Link>

              <Link to="/customshannon" className="platform-card">
                <div className="platform-icon custom">
                  <SmartToyIcon />
                </div>
                <h4>Custom Shannons</h4>
                <p>Design personalized AI assistants with custom instructions, personas, and domain-specific knowledge bases.</p>
                <ul className="platform-bullets">
                  <li>Custom system instructions</li>
                  <li>Persistent personas</li>
                  <li>Domain knowledge</li>
                </ul>
                <span className="platform-link">Create Yours <ArrowForwardIcon /></span>
              </Link>

              <Link to="/chat" className="platform-card">
                <div className="platform-icon memory">
                  <MemoryIcon />
                </div>
                <h4>Memory</h4>
                <p>Context-aware conversations that remember what matters. Toggle on/off and save ~40% on token usage.</p>
                <ul className="platform-bullets">
                  <li>Persistent memory</li>
                  <li>~40% token savings</li>
                  <li>Toggle anytime</li>
                </ul>
                <span className="platform-link">Start Chat <ArrowForwardIcon /></span>
              </Link>
            </div>
          </div>

          {/* Capabilities */}
          <div className="shannon16-caps">
            <div className="caps-header">
              <h3>Built-in Capabilities</h3>
            </div>
            <div className="caps-grid">
              <div className="cap-item"><CodeIcon /><span>Code Generation</span></div>
              <div className="cap-item"><DescriptionIcon /><span>Document Analysis</span></div>
              <div className="cap-item"><SecurityIcon /><span>Function Calling</span></div>
              <div className="cap-item"><AssessmentIcon /><span>JSON Output</span></div>
              <div className="cap-item"><PsychologyIcon /><span>Chain-of-Thought</span></div>
              <div className="cap-item"><SpeedIcon /><span>Agentic Workflows</span></div>
            </div>
          </div>
        </Container>
      </section>

      {/* Models Section */}
      <section className="landing-section landing-models">
        <Container maxWidth="lg">
          <div className="section-header">
            <span className="section-tag section-tag-legacy">LEGACY MODELS</span>
            <h2 className="section-title">V1 Series - Developer Toolkit</h2>
            <p className="section-desc">
              Purpose-built for developers and red-team professionals.
              Constraints-relaxed models optimized for CI/CD integration and adversarial testing.
            </p>
          </div>

          <div className="models-grid">
            {models.map((model) => (
              <div
                key={model.name}
                className={`model-card ${model.highlighted ? "model-card-highlighted" : ""}`}
                style={{ "--model-color": model.color }}
              >
                <div className="model-badge">{model.badge}</div>
                <h3 className="model-name">{model.name}</h3>
                <p className="model-desc">{model.description}</p>
                <ul className="model-features">
                  {model.features.map((feature) => (
                    <li key={feature}>
                      <CheckCircleIcon className="model-check" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Button
                  variant="outlined"
                  className="model-cta"
                  onClick={() => navigate("/chat")}
                  endIcon={<PlayArrowIcon />}
                >
                  Open in Chat
                </Button>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* Capabilities Section */}
      <section
        id="capabilities"
        className="landing-section landing-capabilities"
      >
        <Container maxWidth="lg">
          <div className="section-header">
            <span className="section-tag">CAPABILITIES</span>
            <h2 className="section-title">Enterprise-Grade Red-Teaming</h2>
            <p className="section-desc">
              Everything you need to find, document, and fix AI vulnerabilities.
            </p>
          </div>

          <div className="capabilities-grid">
            {capabilities.map((cap) => {
              const IconComponent = cap.icon;
              return (
                <div key={cap.title} className="capability-card">
                  <div className="capability-icon">
                    <IconComponent />
                  </div>
                  <h3 className="capability-title">{cap.title}</h3>
                  <p className="capability-desc">{cap.description}</p>
                </div>
              );
            })}
          </div>
        </Container>
      </section>

      {/* Use Cases Section */}
      <section className="landing-section landing-usecases">
        <Container maxWidth="lg">
          <div className="section-header">
            <span className="section-tag">USE CASES</span>
            <h2 className="section-title">Built for Security Professionals</h2>
          </div>

          <div className="usecases-grid">
            {useCases.map((uc) => {
              const IconComponent = uc.icon;
              return (
                <div key={uc.title} className="usecase-card">
                  <IconComponent className="usecase-icon" />
                  <h3 className="usecase-title">{uc.title}</h3>
                  <p className="usecase-desc">{uc.description}</p>
                </div>
              );
            })}
          </div>
        </Container>
      </section>

      {/* CTA Banner */}
      <section className="landing-section landing-cta-banner">
        <Container maxWidth="md">
          <div className="cta-banner-content">
            <h2 className="cta-banner-title">
              See the Risk. Build the Defense.
            </h2>
            <p className="cta-banner-desc">
              You cannot defend against what you cannot see. Start red-teaming
              your AI systems today.
            </p>
            <div className="cta-banner-buttons">
              <Button
                variant="contained"
                className="cta-primary"
                onClick={() => navigate("/chat")}
                endIcon={<ArrowForwardIcon />}
              >
                Start Free
              </Button>
              <Button
                variant="outlined"
                className="cta-secondary"
                component="a"
                href="mailto:team@shannon-ai.com"
              >
                Contact Sales
              </Button>
            </div>
          </div>
        </Container>
      </section>

      {/* FAQ Section */}
      <section className="landing-section landing-faq">
        <Container maxWidth="md">
          <div className="section-header">
            <span className="section-tag">FAQ</span>
            <h2 className="section-title">Common Questions</h2>
          </div>

          <div className="faq-list">
            {faqs.map((faq, index) => (
              <div
                key={faq.question}
                className={`faq-item ${expandedFaq === index ? "faq-expanded" : ""}`}
              >
                <button
                  className="faq-question"
                  onClick={() =>
                    setExpandedFaq(expandedFaq === index ? null : index)
                  }
                >
                  <span>{faq.question}</span>
                  <span className="faq-toggle">
                    {expandedFaq === index ? "-" : "+"}
                  </span>
                </button>
                <div className="faq-answer">
                  <p>{faq.answer}</p>
                </div>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <Container maxWidth="lg">
          <div className="footer-content">
            <div className="footer-brand">
              <h3 className="footer-logo">
                SHANNON<span>AI</span>
              </h3>
              <p className="footer-tagline">
                Frontier Red Team Lab for LLM Safety
              </p>
            </div>
            <div className="footer-links">
              <div className="footer-col">
                <h4>Product</h4>
                <Link to="/chat">Start Testing</Link>
                <Link to="/plan">Pricing</Link>
              </div>
              <div className="footer-col">
                <h4>Company</h4>
                <Link to="/company">Company Info</Link>
                <a href="mailto:team@shannon-ai.com">Contact</a>
                <a href="mailto:legal@shannon-ai.com">Legal</a>
              </div>
            </div>
          </div>
          <div className="footer-bottom">
            <p>© {new Date().getFullYear()} Shannon AI. All rights reserved.</p>
            <p className="footer-legal">
              SHANNON LAB LLC — 8206 Louisiana Blvd NE, Ste A #7871, Albuquerque,
              NM 87113, USA
            </p>
            <div className="footer-badges">
              <a
                className="footer-badge"
                href="https://dofollow.tools"
                target="_blank"
                rel="noreferrer"
              >
                <img
                  src="https://dofollow.tools/badge/badge_dark.svg"
                  alt="Featured on Dofollow.Tools"
                  width="200"
                  height="54"
                  loading="lazy"
                  decoding="async"
                />
              </a>
              <a
                className="footer-badge"
                href="https://twelve.tools"
                target="_blank"
                rel="noreferrer"
              >
                <img
                  src="https://twelve.tools/badge3-light.svg"
                  alt="Featured on Twelve Tools"
                  width="200"
                  height="54"
                  loading="lazy"
                  decoding="async"
                />
              </a>
              <a
                className="footer-badge"
                href="https://startupfa.me/s/shannon-ai?utm_source=shannon-ai.com"
                target="_blank"
                rel="noreferrer"
              >
                <img
                  src="https://startupfa.me/badges/featured-badge.webp"
                  alt="Shannon AI - Featured on Startup Fame"
                  width="171"
                  height="54"
                  loading="lazy"
                  decoding="async"
                />
              </a>
              <a
                className="footer-badge"
                href="https://frogdr.com/shannon-ai.com?utm_source=shannon-ai.com"
                target="_blank"
                rel="noreferrer"
              >
                <img
                  src="https://frogdr.com/shannon-ai.com/badge-white.svg"
                  alt="Monitor your Domain Rating with FrogDR"
                  width="250"
                  height="54"
                  loading="lazy"
                  decoding="async"
                />
              </a>
              <a
                className="footer-badge"
                href="https://findly.tools/shannon-ai-uncensored-ai-for-everyone?utm_source=shannon-ai-uncensored-ai-for-everyone"
                target="_blank"
                rel="noreferrer"
              >
                <img
                  src="https://findly.tools/badges/findly-tools-badge-light.svg"
                  alt="Featured on findly.tools"
                  width="150"
                  loading="lazy"
                  decoding="async"
                />
              </a>
            </div>
          </div>
        </Container>
      </footer>
    </Box>
  );
};

export default LandingPage;
