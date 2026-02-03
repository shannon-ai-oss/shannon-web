import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  Container,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  IconButton,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import BoltIcon from "@mui/icons-material/Bolt";
import SecurityIcon from "@mui/icons-material/Security";
import RocketLaunchIcon from "@mui/icons-material/RocketLaunch";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import StarIcon from "@mui/icons-material/Star";
import VerifiedUserIcon from "@mui/icons-material/VerifiedUser";
import SupportAgentIcon from "@mui/icons-material/SupportAgent";
import CreditCardIcon from "@mui/icons-material/CreditCard";
import CurrencyBitcoinIcon from "@mui/icons-material/CurrencyBitcoin";
import CloseIcon from "@mui/icons-material/Close";

import GroupsIcon from "@mui/icons-material/Groups";
import IntegrationInstructionsIcon from "@mui/icons-material/IntegrationInstructions";
import CloudDoneIcon from "@mui/icons-material/CloudDone";
import LockIcon from "@mui/icons-material/Lock";
import { useAuth } from "@/context/AuthContext";
import { FALLBACK_PLANS, enrichPlan } from "@/utils/planCatalog";
import { FILE_UPLOAD_LIMITS_MB } from "@/utils/fileHelpers";
import CryptoPaymentModal from "@/components/CryptoPaymentModal";
import "./PlanPage.css";

const PLAN_ORDER = ["free", "starter", "plus", "pro"];

const PLAN_LABELS = {
  free: "Free",
  starter: "Starter",
  plus: "Plus",
  pro: "Pro",
};

const PLAN_ICONS = {
  free: BoltIcon,
  starter: StarIcon,
  plus: SecurityIcon,
  pro: RocketLaunchIcon,
};

const PLAN_COLORS = {
  free: "#64748b",
  starter: "#22c55e",
  plus: "#3b82f6",
  pro: "#8b5cf6",
};

const PLAN_CTA = {
  free: "Start Free",
  starter: "Upgrade to Starter",
  plus: "Upgrade to Plus",
  pro: "Upgrade to Pro",
};

const COIN_LABELS = {
  btc: { name: "Bitcoin", symbol: "BTC" },
  ltc: { name: "Litecoin", symbol: "LTC" },
  doge: { name: "Dogecoin", symbol: "DOGE" },
};

const planIndex = (slug) => {
  const normalized = typeof slug === "string" ? slug.toLowerCase() : slug;
  const idx = PLAN_ORDER.indexOf(normalized);
  return idx === -1 ? Number.MAX_SAFE_INTEGER : idx;
};

const formatPriceParts = (priceLabel) => {
  if (!priceLabel || priceLabel.toLowerCase() === "free") {
    return { price: "$0", period: "forever" };
  }
  const clean = priceLabel.replace(/\s+/g, " ").trim();
  const [amount, ...rest] = clean.split(" ");
  const period = rest.join(" ").trim() || "/ month";
  return { price: amount, period };
};

const buildPlanCards = (sourcePlans) => {
  const input =
    Array.isArray(sourcePlans) && sourcePlans.length > 0
      ? sourcePlans
      : FALLBACK_PLANS;
  return input
    .map((plan) => enrichPlan(plan))
    .filter((plan) => plan?.slug)
    .map((plan) => {
      const slug = (plan.slug || "").toString().toLowerCase() || "free";
      const priceLabel =
        typeof plan.priceLabel === "string" && plan.priceLabel.trim()
          ? plan.priceLabel.trim()
          : "Free";
      const { price, period } = formatPriceParts(priceLabel);
      const features = Array.from(
        new Set(
          [
            plan.daily_token_limit
              ? `${plan.daily_token_limit.toLocaleString()} daily tokens`
              : "Unlimited daily tokens",
            plan.memoryLabel ? `Memory: ${plan.memoryLabel}` : "Memory included",
            ...(Array.isArray(plan.highlights) ? plan.highlights : []),
          ]
            .filter(Boolean)
            .filter(Boolean),
        ),
      );

      return {
        id: slug,
        slug,
        name: plan.name || PLAN_LABELS[slug] || slug,
        price,
        period,
        description: plan.description || "",
        icon: PLAN_ICONS[slug] || BoltIcon,
        color: PLAN_COLORS[slug] || "#64748b",
        features,
        cta: PLAN_CTA[slug] || "Select plan",
        popular: slug === "plus",
        dailyTokens: plan.daily_token_limit ?? null,
      };
    })
    .sort((a, b) => planIndex(a.slug) - planIndex(b.slug));
};

const trustIndicators = [
  { icon: VerifiedUserIcon, label: "SOC 2 Compliant" },
  { icon: LockIcon, label: "E2E Encrypted" },
  { icon: CloudDoneIcon, label: "99.9% Uptime" },
  { icon: GroupsIcon, label: "120+ Teams" },
];

const enterpriseFeatures = [
  {
    icon: IntegrationInstructionsIcon,
    title: "Custom Integrations",
    description:
      "Connect Shannon to your existing security stack, SIEM, and CI/CD pipelines",
  },
  {
    icon: GroupsIcon,
    title: "Team Management",
    description:
      "Role-based access, SSO/SAML, and centralized billing for your organization",
  },
  {
    icon: SupportAgentIcon,
    title: "Dedicated Support",
    description:
      "Named account manager, 24/7 support, and custom SLAs tailored to your needs",
  },
  {
    icon: VerifiedUserIcon,
    title: "Compliance Ready",
    description:
      "Custom compliance mapping to NIST AI RMF, ISO 27001, SOC 2, and more",
  },
];

const faqs = [
  {
    question: "What are daily tokens?",
    answer:
      "Tokens are the unit of AI processing. Each message you send and receive consumes tokens based on length. Daily tokens reset at midnight UTC. On average, 1,000 tokens equals about 750 words of conversation.",
  },
  {
    question: "Can I upgrade or downgrade anytime?",
    answer:
      "Yes, you can change your plan at any time. Upgrades take effect immediately with prorated billing, and downgrades apply at the end of your billing cycle. No lock-in contracts.",
  },
  {
    question: "What happens if I run out of tokens?",
    answer:
      "When you exhaust your daily allocation, you can wait for the next reset, purchase token add-ons, or upgrade your plan for more tokens. We'll notify you when you're running low.",
  },
  {
    question: "Do you offer refunds?",
    answer:
      "We offer a 14-day money-back guarantee for new subscriptions. If you're not satisfied, contact support@shannon-ai.com for a full refund (no questions asked).",
  },
  {
    question: "What payment methods do you accept?",
    answer:
      "We accept all major credit cards (Visa, Mastercard, Amex, Discover) through Stripe, as well as cryptocurrency (Bitcoin, Litecoin, Dogecoin). Enterprise customers can also pay via invoice with NET-30 terms.",
  },
  {
    question: "Is my data secure?",
    answer:
      "Absolutely. All data is encrypted in transit (TLS 1.3) and at rest (AES-256). We're SOC 2 Type II compliant. Enterprise customers can opt for dedicated infrastructure and data isolation.",
  },
  {
    question: "Can I use Shannon AI for production security testing?",
    answer:
      "Yes! Shannon AI is designed for professional red-team testing. The Pro plan includes reproducible test suites and audit-ready reporting for production environments.",
  },
];

const PlanPage = () => {
  const navigate = useNavigate();
  const {
    token,
    user,
    plans: backendPlans,
    planStatus,
    loadPlans,
    startPlanCheckout,
    openBillingPortal,
    getCryptoOpenPayments,
    cancelCryptoPayment,
  } = useAuth();

  const [error, setError] = useState(null);
  const [checkoutLoading, setCheckoutLoading] = useState(null);
  const [expandedFaq, setExpandedFaq] = useState(null);
  const [paymentMethodModalOpen, setPaymentMethodModalOpen] = useState(false);
  const [cryptoModalOpen, setCryptoModalOpen] = useState(false);
  const [selectedPlanForPayment, setSelectedPlanForPayment] = useState(null);
  const [resumePaymentId, setResumePaymentId] = useState(null);
  const [cryptoOpenPayments, setCryptoOpenPayments] = useState([]);
  const [cryptoOpenLoading, setCryptoOpenLoading] = useState(false);
  const [cryptoOpenError, setCryptoOpenError] = useState(null);
  const [cancelingPaymentId, setCancelingPaymentId] = useState(null);

  const planOptions = useMemo(
    () => buildPlanCards(backendPlans),
    [backendPlans],
  );

  const planLookup = useMemo(
    () => Object.fromEntries(planOptions.map((plan) => [plan.slug, plan])),
    [planOptions],
  );

  const sortedCryptoOpenPayments = useMemo(() => {
    const payments = Array.isArray(cryptoOpenPayments)
      ? [...cryptoOpenPayments]
      : [];
    return payments.sort((a, b) => {
      const aTime = new Date(a?.created_at || 0).getTime();
      const bTime = new Date(b?.created_at || 0).getTime();
      return (Number.isNaN(bTime) ? 0 : bTime) - (Number.isNaN(aTime) ? 0 : aTime);
    });
  }, [cryptoOpenPayments]);

  const lastOpenPayment = sortedCryptoOpenPayments[0] || null;

  const lastOpenPlan = useMemo(() => {
    if (!lastOpenPayment?.plan_slug) return null;
    const planSlug = lastOpenPayment.plan_slug.toLowerCase();
    return (
      planLookup[planSlug] || {
        slug: planSlug,
        name: PLAN_LABELS[planSlug] || planSlug,
        price: "",
        period: "",
      }
    );
  }, [lastOpenPayment?.plan_slug, planLookup]);

  const usageComparison = useMemo(() => {
    const valueForSlug = (slug, key) => {
      const plan = planLookup[slug];
      if (!plan) return null;
      if (key === "dailyTokens") return plan.dailyTokens ?? null;
      return null;
    };

    return [
      {
        name: "Daily tokens",
        description: "Token budget refreshed at 00:00 UTC",
        values: Object.fromEntries(
          PLAN_ORDER.map((slug) => {
            const value = valueForSlug(slug, "dailyTokens");
            if (value === null || value === undefined) {
              return [slug, "Unlimited"];
            }
            return [slug, value.toLocaleString()];
          }),
        ),
      },
      {
        name: "Max file upload size",
        description: "Maximum size per attached file",
        values: Object.fromEntries(
          PLAN_ORDER.map((slug) => {
            const sizeMB = FILE_UPLOAD_LIMITS_MB[slug] ?? FILE_UPLOAD_LIMITS_MB.free;
            return [slug, `${sizeMB} MB`];
          }),
        ),
      },
    ];
  }, [planLookup]);

  const featureComparison = useMemo(
    () => [
      {
        category: "Experience",
        features: [
          {
            name: "Ad-free experience",
            values: { free: false, starter: true, plus: true, pro: true },
          },
          {
            name: "Priority routing during peak traffic",
            values: { free: false, starter: false, plus: true, pro: true },
          },
          {
            name: "Premium billing support",
            values: { free: false, starter: false, plus: true, pro: true },
          },
        ],
      },
    ],
    [],
  );

  

  const siteOrigin = "https://shannon-ai.com";
  const canonicalUrl = `${siteOrigin}/plan`;
  const socialImage = `${siteOrigin}/shannonbanner.png`;
  const pageTitle = "Pricing | Shannon AI - Red-Team Intelligence Plans";
  const pageDescription =
    "Choose the Shannon AI plan that fits your security needs. From free testing to high-volume red-teaming.";

  useEffect(() => {
    if (!token) return;
    loadPlans().catch((err) =>
      setError(err?.message || "Failed to load plans"),
    );
  }, [token, loadPlans]);

  const refreshCryptoOpenPayments = useCallback(async () => {
    if (!token) return;
    setCryptoOpenLoading(true);
    setCryptoOpenError(null);
    try {
      const data = await getCryptoOpenPayments();
      const payments = Array.isArray(data?.payments) ? data.payments : [];
      setCryptoOpenPayments(payments);
    } catch (err) {
      setCryptoOpenError(err?.message || "Failed to load open crypto payments");
    } finally {
      setCryptoOpenLoading(false);
    }
  }, [token, getCryptoOpenPayments]);

  useEffect(() => {
    refreshCryptoOpenPayments().catch(() => {});
  }, [refreshCryptoOpenPayments]);

  useEffect(() => {
    if (!cryptoModalOpen) {
      refreshCryptoOpenPayments().catch(() => {});
    }
  }, [cryptoModalOpen, refreshCryptoOpenPayments]);

  const activePlanSlug = useMemo(() => {
    const resolved =
      planStatus?.plan?.slug || user?.plan?.slug || user?.plan_slug || "free";
    return typeof resolved === "string" ? resolved.toLowerCase() : "free";
  }, [planStatus?.plan?.slug, user?.plan?.slug, user?.plan_slug]);

  const activeSubscription = useMemo(() => {
    if (planStatus?.subscription) return planStatus.subscription;
    return user?.plan?.subscription ?? null;
  }, [planStatus?.subscription, user?.plan?.subscription]);

  const lastOpenPaymentDisplay = useMemo(() => {
    if (!lastOpenPayment) return null;
    const coinKey = (lastOpenPayment.coin || "").toLowerCase();
    const coinInfo = COIN_LABELS[coinKey] || {
      name: coinKey ? coinKey.toUpperCase() : "Crypto",
      symbol: coinKey ? coinKey.toUpperCase() : "",
    };
    const amountLabel = lastOpenPayment.amount_crypto
      ? `${lastOpenPayment.amount_crypto} ${coinInfo.symbol}`.trim()
      : "Amount pending";
    const planLabel =
      lastOpenPlan?.name ||
      lastOpenPayment.plan_slug ||
      "Unknown plan";
    const statusLabel = lastOpenPayment.status || "pending";
    const expiresAt = lastOpenPayment.expires_at
      ? new Date(lastOpenPayment.expires_at)
      : null;
    const expiresLabel =
      expiresAt && !Number.isNaN(expiresAt.getTime())
        ? expiresAt.toLocaleString()
        : null;
    return {
      coinInfo,
      amountLabel,
      planLabel,
      statusLabel,
      expiresLabel,
    };
  }, [lastOpenPayment, lastOpenPlan]);

  const handleCheckout = useCallback(
    async (plan) => {
      if (!token) {
        navigate("/login");
        return;
      }

      if (plan.slug === "free") {
        navigate("/chat");
        return;
      }

      const backendPlan = Array.isArray(backendPlans)
        ? backendPlans.find((p) => p.slug === plan.slug || p.id === plan.id)
        : null;

      if (!backendPlan?.stripe_price_id) {
        setError("This plan is not available for checkout yet.");
        return;
      }

      // Show payment method selection modal
      setSelectedPlanForPayment(plan);
      setResumePaymentId(null);
      setPaymentMethodModalOpen(true);
    },
    [token, backendPlans, navigate],
  );

  const handleStripeCheckout = useCallback(
    async () => {
      if (!selectedPlanForPayment) return;

      setPaymentMethodModalOpen(false);
      setError(null);
      setCheckoutLoading(selectedPlanForPayment.slug);

      try {
        const successUrl = window.location.origin + "/plan?success=true";
        const cancelUrl = window.location.href;
        const { checkout_url } = await startPlanCheckout({
          planSlug: selectedPlanForPayment.slug,
          successUrl,
          cancelUrl,
        });
        if (checkout_url) {
          window.location.href = checkout_url;
        }
      } catch (err) {
        setError(err?.message || "Failed to start checkout");
      } finally {
        setCheckoutLoading(null);
      }
    },
    [selectedPlanForPayment, startPlanCheckout],
  );

  const handleCryptoCheckout = useCallback(() => {
    setPaymentMethodModalOpen(false);
    setResumePaymentId(null);
    setCryptoModalOpen(true);
  }, []);

  const handleResumeLastPayment = useCallback(() => {
    if (!lastOpenPayment) return;
    setPaymentMethodModalOpen(false);
    setSelectedPlanForPayment(lastOpenPlan || null);
    setResumePaymentId(lastOpenPayment.payment_id || null);
    setCryptoModalOpen(true);
  }, [lastOpenPayment, lastOpenPlan]);

  const handleCancelOpenPayment = useCallback(async (paymentId) => {
    if (!paymentId) return;
    setCancelingPaymentId(paymentId);
    setCryptoOpenError(null);
    try {
      await cancelCryptoPayment(paymentId);
      setCryptoOpenPayments((prev) =>
        prev.filter((payment) => payment.payment_id !== paymentId),
      );
      if (resumePaymentId === paymentId) {
        setResumePaymentId(null);
      }
    } catch (err) {
      setCryptoOpenError(err?.message || "Failed to cancel crypto payment");
    } finally {
      setCancelingPaymentId(null);
    }
  }, [cancelCryptoPayment, resumePaymentId]);

  const handleCryptoSuccess = useCallback(() => {
    setCryptoModalOpen(false);
    setSelectedPlanForPayment(null);
    setResumePaymentId(null);
    // Refresh plan status
    window.location.href = window.location.origin + "/plan?success=true";
  }, []);

  const handleManageBilling = useCallback(async () => {
    if (!token) return;
    setCheckoutLoading("portal");
    try {
      const { portal_url } = await openBillingPortal(window.location.href);
      if (portal_url) {
        window.location.href = portal_url;
      }
    } catch (err) {
      setError(err?.message || "Failed to open billing portal");
    } finally {
      setCheckoutLoading(null);
    }
  }, [token, openBillingPortal]);

  const getPlanStatus = (planSlug) => {
    if (planSlug === activePlanSlug) return "current";
    const currentIndex = planIndex(activePlanSlug);
    const targetIndex = planIndex(planSlug);
    if (
      currentIndex === Number.MAX_SAFE_INTEGER ||
      targetIndex === Number.MAX_SAFE_INTEGER
    ) {
      return "";
    }
    return targetIndex > currentIndex ? "upgrade" : "downgrade";
  };

  const renderFeatureValue = (value) => {
    if (value === true) {
      return <CheckCircleIcon className="check-yes" />;
    }
    if (value === false || value === null || value === undefined) {
      return <span className="check-no">--</span>;
    }
    return <span className="feature-text">{value}</span>;
  };

  return (
    <Box className="plan-page">
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:image" content={socialImage} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={pageTitle} />
        <meta name="twitter:description" content={pageDescription} />
        <meta name="twitter:image" content={socialImage} />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Product",
            name: "Shannon AI",
            description: pageDescription,
            brand: {
              "@type": "Brand",
              name: "Shannon AI",
            },
            offers: planOptions.map((plan) => ({
              "@type": "Offer",
              name: plan.name,
              price: (plan.price || "").replace("$", "") || "0",
              priceCurrency: "USD",
              availability: "https://schema.org/InStock",
            })),
          })}
        </script>
      </Helmet>

      {/* Hero Section */}
      <section className="plan-hero">
        <Container maxWidth="lg">
          <div className="plan-hero-content">
            <div className="plan-hero-badge">
              <SecurityIcon />
              <span>Pricing</span>
            </div>
            <h1 className="plan-hero-title">Simple, Transparent Pricing</h1>
            <p className="plan-hero-subtitle">
              Choose the plan that fits your red-teaming needs. Start free,
              scale as you grow. All plans include our core chat interface and
              security features.
            </p>

            {/* Trust Indicators */}
            <div className="trust-indicators">
              {trustIndicators.map((item) => {
                const IconComponent = item.icon;
                return (
                  <div key={item.label} className="trust-indicator">
                    <IconComponent />
                    <span>{item.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </Container>
      </section>

      {/* Current Plan Banner */}
      {token && activeSubscription && (
        <section className="plan-current-banner">
          <Container maxWidth="lg">
            <div className="current-plan-card">
              <div className="current-plan-info">
                <CheckCircleIcon className="current-plan-icon" />
                <div>
                  <span className="current-plan-label">Current Plan</span>
                  <span className="current-plan-name">
                    {planStatus?.plan?.name ||
                      planLookup[activePlanSlug]?.name ||
                      activePlanSlug}
                  </span>
                </div>
              </div>
              <div className="current-plan-actions">
                <Button
                  variant="outlined"
                  className="manage-billing-btn"
                  onClick={handleManageBilling}
                  disabled={checkoutLoading === "portal"}
                >
                  {checkoutLoading === "portal"
                    ? "Opening..."
                    : "Manage Billing"}
                </Button>
              </div>
            </div>
          </Container>
        </section>
      )}

      {token && (cryptoOpenLoading || lastOpenPayment || cryptoOpenError) && (
        <section className="plan-crypto-resume-banner">
          <Container maxWidth="lg">
            <div className="crypto-resume-card">
              <div className="crypto-resume-info">
                <CurrencyBitcoinIcon className="crypto-resume-icon" />
                <div>
                  <span className="crypto-resume-label">Unfinished crypto payment</span>
                  {cryptoOpenLoading && !lastOpenPayment && (
                    <span className="crypto-resume-title">Checking for open payments...</span>
                  )}
                  {!cryptoOpenLoading && !lastOpenPayment && cryptoOpenError && (
                    <span className="crypto-resume-title">Unable to load open payments</span>
                  )}
                  {lastOpenPayment && lastOpenPaymentDisplay && (
                    <>
                      <span className="crypto-resume-title">{lastOpenPaymentDisplay.planLabel}</span>
                      <span className="crypto-resume-meta">
                        {lastOpenPaymentDisplay.coinInfo.name} • {lastOpenPaymentDisplay.amountLabel} • {lastOpenPaymentDisplay.statusLabel}
                      </span>
                      {lastOpenPaymentDisplay.expiresLabel && (
                        <span className="crypto-resume-meta">
                          Expires {lastOpenPaymentDisplay.expiresLabel}
                        </span>
                      )}
                    </>
                  )}
                </div>
              </div>
              <div className="crypto-resume-actions">
                <Button
                  variant="contained"
                  className="crypto-resume-btn"
                  onClick={handleResumeLastPayment}
                  disabled={!lastOpenPayment || cryptoOpenLoading}
                >
                  Resume last payment
                </Button>
                <Button
                  variant="outlined"
                  className="crypto-cancel-btn"
                  onClick={() => handleCancelOpenPayment(lastOpenPayment?.payment_id)}
                  disabled={!lastOpenPayment || cancelingPaymentId === lastOpenPayment?.payment_id}
                >
                  {cancelingPaymentId === lastOpenPayment?.payment_id ? "Canceling..." : "Cancel"}
                </Button>
              </div>
            </div>
            {cryptoOpenError && (
              <div className="crypto-resume-error">{cryptoOpenError}</div>
            )}
          </Container>
        </section>
      )}

      {/* Success Message */}
      {typeof window !== "undefined" &&
        new URLSearchParams(window.location.search).get("success") ===
          "true" && (
          <Container maxWidth="lg">
            <div className="plan-success">
              <CheckCircleIcon />
              <span>
                Your subscription has been activated successfully! Welcome
                aboard.
              </span>
            </div>
          </Container>
        )}

      {/* Error Display */}
      {error && (
        <Container maxWidth="lg">
          <div className="plan-error">{error}</div>
        </Container>
      )}

      {/* Plans Grid */}
      <section className="plan-grid-section">
        <Container maxWidth="lg">
          <h2 className="sr-only">Plans</h2>
          <div className="plans-grid">
            {planOptions.map((plan) => {
              const IconComponent = plan.icon;
              const status = getPlanStatus(plan.slug);
              const isCurrentPlan = status === "current";
              const isLoading = checkoutLoading === plan.slug;

              return (
                <div
                  key={plan.id}
                  className={`plan-card ${plan.popular ? "plan-card-popular" : ""} ${isCurrentPlan ? "plan-card-current" : ""}`}
                  style={{ "--plan-color": plan.color }}
                >
                  {plan.popular && (
                    <div className="plan-popular-badge">
                      <StarIcon />
                      Most Popular
                    </div>
                  )}

                  {isCurrentPlan && (
                    <div className="plan-current-badge">
                      <CheckCircleIcon />
                      Current Plan
                    </div>
                  )}

                  <div className="plan-card-header">
                    <div className="plan-icon-wrapper">
                      <IconComponent className="plan-icon" />
                    </div>
                    <h3 className="plan-name">{plan.name}</h3>
                    <p className="plan-description">{plan.description}</p>
                  </div>

                  <div className="plan-price-section">
                    <span className="plan-price">{plan.price}</span>
                    {plan.period && (
                      <span className="plan-period">{plan.period}</span>
                    )}
                  </div>

                  <ul className="plan-features">
                    {plan.features.map((feature) => (
                      <li key={feature}>
                        <CheckCircleIcon className="feature-check" />
                        {feature}
                      </li>
                    ))}
                  </ul>

                  <Button
                    variant={plan.popular ? "contained" : "outlined"}
                    className={`plan-cta ${plan.popular ? "plan-cta-primary" : ""}`}
                    onClick={() => handleCheckout(plan)}
                    disabled={
                      isLoading || (isCurrentPlan && plan.slug !== "free")
                    }
                    fullWidth
                    endIcon={
                      !isLoading && !isCurrentPlan && <ArrowForwardIcon />
                    }
                  >
                    {isLoading ? (
                      <CircularProgress size={20} color="inherit" />
                    ) : isCurrentPlan ? (
                      "Current Plan"
                    ) : (
                      plan.cta
                    )}
                  </Button>

                  {plan.slug === "plus" && (
                    <p className="plan-guarantee">
                      14-day money-back guarantee
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </Container>
      </section>

      {/* Usage Comparison */}
      <section className="plan-comparison-section">
        <Container maxWidth="lg">
          <div className="section-header">
            <span className="section-tag">USAGE</span>
            <h2 className="section-title">Compare Plan Limits</h2>
            <p className="section-desc">
              Live daily token limits pulled from the current plan catalog.
            </p>
          </div>

          <div className="comparison-table-wrapper">
            <table className="comparison-table">
              <thead>
                <tr>
                  <th>Limit</th>
                  {PLAN_ORDER.map((slug) => (
                    <th
                      key={slug}
                      className={slug === "plus" ? "highlight-col" : ""}
                    >
                      {PLAN_LABELS[slug]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {usageComparison.map((item) => (
                  <tr key={item.name}>
                    <td className="model-cell">
                      <span className="model-name">{item.name}</span>
                      <span className="model-desc">{item.description}</span>
                    </td>
                    {PLAN_ORDER.map((slug) => (
                      <td
                        key={`${item.name}-${slug}`}
                        className={slug === "plus" ? "highlight-col" : ""}
                      >
                        {renderFeatureValue(item.values[slug])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Container>
      </section>

      {/* Feature Comparison */}
      <section className="plan-features-section">
        <Container maxWidth="lg">
          <div className="section-header">
            <span className="section-tag">FULL COMPARISON</span>
            <h2 className="section-title">Detailed Feature Breakdown</h2>
            <p className="section-desc">
              Compare the most important plan differences to find the perfect
              fit for your team.
            </p>
          </div>

          <div className="comparison-table-wrapper">
            <table className="comparison-table features-table">
              <thead>
                <tr>
                  <th>Feature</th>
                  {PLAN_ORDER.map((slug) => (
                    <th
                      key={slug}
                      className={slug === "plus" ? "highlight-col" : ""}
                    >
                      {PLAN_LABELS[slug]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {featureComparison.map((category) => (
                  <React.Fragment key={category.category}>
                    <tr className="category-row">
                      <td colSpan={5} className="category-cell">
                        {category.category}
                      </td>
                    </tr>
                    {category.features.map((feature) => (
                      <tr key={feature.name}>
                        <td className="feature-name-cell">{feature.name}</td>
                        {PLAN_ORDER.map((slug) => (
                          <td
                            key={`${feature.name}-${slug}`}
                            className={slug === "plus" ? "highlight-col" : ""}
                          >
                            {renderFeatureValue(feature.values[slug])}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </Container>
      </section>

      {/* Enterprise Section */}
      <section className="plan-enterprise-section">
        <Container maxWidth="lg">
          <div className="enterprise-card">
            <div className="enterprise-content">
              <div className="enterprise-header">
                <RocketLaunchIcon className="enterprise-icon" />
                <span className="enterprise-badge">ENTERPRISE</span>
              </div>
              <h2 className="enterprise-title">
                Need a Custom Solution for Your Organization?
              </h2>
              <p className="enterprise-desc">
                Get unlimited access, dedicated infrastructure, custom
                compliance mapping, and white-glove support tailored to your
                enterprise security requirements.
              </p>

              <div className="enterprise-features-grid">
                {enterpriseFeatures.map((feature) => {
                  const IconComponent = feature.icon;
                  return (
                    <div key={feature.title} className="enterprise-feature">
                      <div className="enterprise-feature-icon">
                        <IconComponent />
                      </div>
                      <div className="enterprise-feature-content">
                        <h3>{feature.title}</h3>
                        <p>{feature.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="enterprise-cta">
                <Button
                  variant="contained"
                  className="enterprise-btn"
                  href="mailto:team@shannon-ai.com?subject=Enterprise%20Inquiry"
                  component="a"
                  endIcon={<ArrowForwardIcon />}
                >
                  Contact Sales
                </Button>
                <span className="enterprise-note">
                  Typically responds within 24 hours
                </span>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* FAQ Section */}
      <section className="plan-faq-section">
        <Container maxWidth="md">
          <div className="section-header">
            <span className="section-tag">FAQ</span>
            <h2 className="section-title">Common Questions</h2>
            <p className="section-desc">
              Everything you need to know about Shannon AI pricing and plans
            </p>
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
                  aria-expanded={expandedFaq === index}
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

      {/* CTA Section */}
      <section className="plan-cta-section">
        <Container maxWidth="md">
          <div className="plan-cta-content">
            <h2>Ready to secure your AI?</h2>
            <p>
              Start testing with Shannon AI today - no credit card required for
              the free tier. Upgrade anytime as your needs grow.
            </p>
            <div className="plan-cta-buttons">
              <Button
                variant="contained"
                className="cta-primary"
                onClick={() => navigate(token ? "/chat" : "/login")}
                endIcon={<ArrowForwardIcon />}
              >
                {token ? "Go to Chat" : "Start Testing Free"}
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
            <p className="cta-subtext">
              Join 120+ security teams already using Shannon AI
            </p>
          </div>
        </Container>
      </section>

      {/* Footer */}
      <footer className="plan-footer">
        <Container maxWidth="lg">
          <p>
            Questions about pricing? Contact us at{" "}
            <a href="mailto:team@shannon-ai.com">team@shannon-ai.com</a>
          </p>
        </Container>
      </footer>

      {/* Payment Method Selection Modal */}
      <Dialog
        open={paymentMethodModalOpen}
        onClose={() => setPaymentMethodModalOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            bgcolor: "#0d1117",
            border: "1px solid #30363d",
            backgroundImage: "none",
          }
        }}
      >
        <Box sx={{ p: 3, position: "relative" }}>
          <IconButton
            onClick={() => setPaymentMethodModalOpen(false)}
            sx={{ position: "absolute", right: 8, top: 8, color: "#8b949e" }}
          >
            <CloseIcon />
          </IconButton>

          <Typography variant="h6" sx={{ fontWeight: 600, color: "#e6edf3", mb: 1 }}>
            Choose Payment Method
          </Typography>
          <Typography variant="body2" sx={{ color: "#8b949e", mb: 3 }}>
            Select how to pay for{" "}
            <strong style={{ color: "#e6edf3" }}>{selectedPlanForPayment?.name}</strong> ({selectedPlanForPayment?.price} {selectedPlanForPayment?.period})
          </Typography>

          <Box display="flex" flexDirection="column" gap={1.5}>
            <Button
              size="large"
              onClick={handleStripeCheckout}
              sx={{
                justifyContent: "flex-start",
                py: 2,
                px: 3,
                borderRadius: 2,
                border: "1px solid #30363d",
                bgcolor: "#161b22",
                color: "#e6edf3",
                textTransform: "none",
                "&:hover": { bgcolor: "#21262d", borderColor: "#3b82f6" },
              }}
            >
              <Box sx={{
                width: 40, height: 40, borderRadius: "50%", bgcolor: "#3b82f6",
                display: "flex", alignItems: "center", justifyContent: "center",
                mr: 2
              }}>
                <CreditCardIcon sx={{ color: "#fff" }} />
              </Box>
              <Box textAlign="left">
                <Typography sx={{ fontWeight: 600, color: "#e6edf3" }}>Pay with Card</Typography>
                <Typography variant="caption" sx={{ color: "#8b949e" }}>Visa, Mastercard, Amex via Stripe</Typography>
              </Box>
            </Button>

            <Button
              size="large"
              onClick={handleCryptoCheckout}
              sx={{
                justifyContent: "flex-start",
                py: 2,
                px: 3,
                borderRadius: 2,
                border: "1px solid #30363d",
                bgcolor: "#161b22",
                color: "#e6edf3",
                textTransform: "none",
                "&:hover": { bgcolor: "#21262d", borderColor: "#f7931a" },
              }}
            >
              <Box sx={{
                width: 40, height: 40, borderRadius: "50%", bgcolor: "#f7931a",
                display: "flex", alignItems: "center", justifyContent: "center",
                mr: 2
              }}>
                <CurrencyBitcoinIcon sx={{ color: "#fff" }} />
              </Box>
              <Box textAlign="left">
                <Typography sx={{ fontWeight: 600, color: "#e6edf3" }}>Pay with Crypto</Typography>
                <Typography variant="caption" sx={{ color: "#8b949e" }}>Bitcoin, Litecoin, Dogecoin</Typography>
              </Box>
            </Button>
          </Box>

          <Button
            onClick={() => setPaymentMethodModalOpen(false)}
            sx={{ mt: 2, color: "#8b949e", width: "100%" }}
          >
            Cancel
          </Button>
        </Box>
      </Dialog>

      {/* Crypto Payment Modal */}
      <CryptoPaymentModal
        open={cryptoModalOpen}
        onClose={() => {
          setCryptoModalOpen(false);
          setSelectedPlanForPayment(null);
          setResumePaymentId(null);
        }}
        planSlug={selectedPlanForPayment?.slug}
        planName={selectedPlanForPayment?.name}
        onSuccess={handleCryptoSuccess}
        initialPaymentId={resumePaymentId}
      />
    </Box>
  );
};

export default PlanPage;
