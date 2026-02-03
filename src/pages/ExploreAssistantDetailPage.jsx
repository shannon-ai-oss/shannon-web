import React, { startTransition, useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import {
  Box,
  Typography,
  Card,
  CardContent,
  CircularProgress,
  Chip,
  Alert,
  Button,
  Breadcrumbs,
  Avatar,
  Divider,
} from "@mui/material";
import {
  TrendingUp as UsageIcon,
  Person as PersonIcon,
  SmartToy as BotIcon,
  NavigateNext as NavigateNextIcon,
  CalendarToday as DateIcon,
  Description as KnowledgeIcon,
  Login as LoginIcon,
  ArrowBack as BackIcon,
  Chat as ChatIcon,
} from "@mui/icons-material";
import { customShanStore } from "@/lib/localDataStore";
import { useAuth } from "@/hooks/useAuth";
import "./ExploreAssistantDetailPage.css";

export default function ExploreAssistantDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [assistant, setAssistant] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAssistant = async () => {
      if (!id) return;
      startTransition(() => {
        setIsLoading(true);
        setError(null);
      });
      try {
        const data = await customShanStore.getPublicById(id);
        if (!data) {
          throw new Error("Assistant not found");
        }
        startTransition(() => {
          setAssistant(data);
        });
      } catch (err) {
        console.error("Error fetching assistant:", err);
        startTransition(() => {
          setError(err.message);
        });
      } finally {
        startTransition(() => {
          setIsLoading(false);
        });
      }
    };

    fetchAssistant();
  }, [id]);

  // Normalize icon URL (handle localhost URLs)
  const normalizeIconUrl = (url) => {
    if (!url) return null;
    if (url.includes("localhost")) return null;
    return url;
  };

  const formatDate = (dateString) => {
    if (!dateString) return "Unknown";
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return "Unknown";
    }
  };

  // Generate structured data for the assistant
  const structuredData = assistant
    ? {
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        name: assistant.name,
        description: assistant.description || `Custom AI assistant: ${assistant.name}`,
        applicationCategory: "AI Assistant",
        operatingSystem: "Web",
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "USD",
        },
        author: {
          "@type": "Person",
          name: assistant.creator_name || "Shannon AI Community",
        },
        aggregateRating: {
          "@type": "AggregateRating",
          ratingValue: "5",
          ratingCount: assistant.usage_count || 1,
          bestRating: "5",
          worstRating: "1",
        },
        datePublished: assistant.created_at,
        dateModified: assistant.updated_at || assistant.created_at,
        publisher: {
          "@type": "Organization",
          name: "Shannon AI",
          url: "https://shannon-ai.com",
        },
        url: `https://shannon-ai.com/explore/assistants/${assistant.id}`,
        featureList: assistant.has_knowledge_file
          ? ["Custom Knowledge Base", "Specialized Responses"]
          : ["Custom Personality", "Specialized Responses"],
      }
    : null;

  const pageTitle = assistant
    ? `${assistant.name} - AI Assistant | Shannon AI`
    : "AI Assistant | Shannon AI";
  const pageDescription = assistant
    ? assistant.description
      ? `${assistant.description.slice(0, 150)}${assistant.description.length > 150 ? "..." : ""} - Created by ${assistant.creator_name || "the Shannon AI community"}.`
      : `${assistant.name} is a custom AI assistant for Shannon AI created by ${assistant.creator_name || "the community"}. Chat with this specialized AI assistant.`
    : "Discover AI assistants for Shannon AI.";

  return (
    <>
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <meta
          name="keywords"
          content={`${assistant?.name || "AI assistant"}, custom AI, Shannon AI, chatbot, ${assistant?.creator_name || "community"}, AI persona`}
        />
        <link
          rel="canonical"
          href={`https://shannon-ai.com/explore/assistants/${id}`}
        />

        {/* OpenGraph */}
        <meta property="og:type" content="website" />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta
          property="og:url"
          content={`https://shannon-ai.com/explore/assistants/${id}`}
        />
        <meta
          property="og:image"
          content={normalizeIconUrl(assistant?.icon_url) || "https://shannon-ai.com/shannonbanner.png"}
        />
        <meta property="og:image:alt" content={assistant?.name || "Shannon AI Assistant"} />
        <meta property="og:site_name" content="Shannon AI" />

        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={pageTitle} />
        <meta name="twitter:description" content={pageDescription} />
        <meta
          name="twitter:image"
          content={normalizeIconUrl(assistant?.icon_url) || "https://shannon-ai.com/shannonbanner.png"}
        />

        {/* Structured Data */}
        {structuredData && (
          <script type="application/ld+json">
            {JSON.stringify(structuredData)}
          </script>
        )}
      </Helmet>

      <Box className="explore-assistant-detail-page">
        <Box sx={{ mb: 3 }}>
          <Breadcrumbs
            separator={<NavigateNextIcon fontSize="small" />}
            aria-label="breadcrumb"
          >
            <Link to="/" style={{ color: "inherit", textDecoration: "none" }}>
              Home
            </Link>
            <Link to="/explore" style={{ color: "inherit", textDecoration: "none" }}>
              Explore
            </Link>
            <Link to="/explore/assistants" style={{ color: "inherit", textDecoration: "none" }}>
              Assistants
            </Link>
            <Typography color="text.primary">
              {assistant?.name || "Assistant Details"}
            </Typography>
          </Breadcrumbs>
        </Box>

        <Button
          startIcon={<BackIcon />}
          onClick={() => navigate("/explore/assistants")}
          sx={{ mb: 3 }}
          color="inherit"
        >
          Back to Assistants
        </Button>

        {isLoading ? (
          <Box className="loading-container">
            <CircularProgress />
            <Typography>Loading assistant details...</Typography>
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
            <Box sx={{ mt: 2 }}>
              <Button variant="outlined" onClick={() => navigate("/explore/assistants")}>
                Browse All Assistants
              </Button>
            </Box>
          </Alert>
        ) : assistant ? (
          <>
            <Card className="assistant-detail-card">
              <CardContent>
                <Box className="assistant-header">
                  {normalizeIconUrl(assistant.icon_url) ? (
                    <Avatar
                      src={normalizeIconUrl(assistant.icon_url)}
                      alt={assistant.name}
                      className="assistant-avatar"
                      sx={{ width: 80, height: 80 }}
                    />
                  ) : (
                    <Box className="assistant-icon">
                      <BotIcon />
                    </Box>
                  )}
                  <Box className="assistant-title-section">
                    <Typography variant="h1" className="assistant-title">
                      {assistant.name}
                    </Typography>
                    <Box className="assistant-chips">
                      <Chip label="Public" size="small" color="success" />
                      <Chip
                        label={`${assistant.usage_count || 0} uses`}
                        size="small"
                        variant="outlined"
                        icon={<UsageIcon />}
                      />
                      {assistant.has_knowledge_file && (
                        <Chip
                          label="Has Knowledge Base"
                          size="small"
                          variant="outlined"
                          icon={<KnowledgeIcon />}
                          color="info"
                        />
                      )}
                    </Box>
                  </Box>
                </Box>

                {assistant.description && (
                  <Typography
                    variant="body1"
                    className="assistant-description"
                    component="h2"
                  >
                    {assistant.description}
                  </Typography>
                )}

                <Box className="assistant-meta">
                  <Box className="meta-item">
                    <PersonIcon fontSize="small" />
                    <Typography variant="body2">
                      Created by <strong>{assistant.creator_name || "Anonymous"}</strong>
                    </Typography>
                  </Box>
                  <Box className="meta-item">
                    <DateIcon fontSize="small" />
                    <Typography variant="body2">
                      Published {formatDate(assistant.created_at)}
                    </Typography>
                  </Box>
                </Box>

                {assistant.starter_prompt && (
                  <>
                    <Divider sx={{ my: 3 }} />
                    <Box className="starter-prompt-section">
                      <Typography variant="h3" className="section-title">
                        Starter Prompt
                      </Typography>
                      <Typography variant="body2" color="textSecondary" className="starter-prompt">
                        "{assistant.starter_prompt}"
                      </Typography>
                    </Box>
                  </>
                )}
              </CardContent>
            </Card>

            <Box className="cta-section">
              <Typography variant="h3" className="cta-title">
                Chat with {assistant.name}
              </Typography>
              <Typography variant="body1" color="textSecondary" sx={{ mb: 3 }}>
                {user
                  ? "Start a conversation with this AI assistant right now."
                  : "Sign in to Shannon AI to start chatting with this custom AI assistant."}
              </Typography>
              {user ? (
                <Button
                  variant="contained"
                  color="primary"
                  size="large"
                  startIcon={<ChatIcon />}
                  onClick={() => navigate("/custom-shan/discover")}
                >
                  Start Chatting
                </Button>
              ) : (
                <Button
                  variant="contained"
                  color="primary"
                  size="large"
                  startIcon={<LoginIcon />}
                  onClick={() => navigate("/login")}
                >
                  Sign In to Chat
                </Button>
              )}
            </Box>

            {/* Features Section */}
            <Box className="features-section" sx={{ mt: 4 }}>
              <Typography variant="h2" sx={{ fontSize: "1.5rem", mb: 3 }}>
                Assistant Features
              </Typography>
              <Box className="features-grid">
                <Box className="feature-item">
                  <BotIcon className="feature-icon" />
                  <Typography variant="h6">Custom Personality</Typography>
                  <Typography variant="body2" color="textSecondary">
                    This assistant has a unique personality and communication style
                    tailored by its creator.
                  </Typography>
                </Box>
                {assistant.has_knowledge_file && (
                  <Box className="feature-item">
                    <KnowledgeIcon className="feature-icon" />
                    <Typography variant="h6">Knowledge Base</Typography>
                    <Typography variant="body2" color="textSecondary">
                      Enhanced with specialized knowledge files for more accurate
                      and informed responses.
                    </Typography>
                  </Box>
                )}
                <Box className="feature-item">
                  <ChatIcon className="feature-icon" />
                  <Typography variant="h6">Instant Access</Typography>
                  <Typography variant="body2" color="textSecondary">
                    Start chatting immediately after signing in - no setup required.
                  </Typography>
                </Box>
              </Box>
            </Box>

            {/* SEO Content */}
            <Box className="seo-content" sx={{ mt: 6, pt: 4, borderTop: "1px solid rgba(255,255,255,0.1)" }}>
              <Typography variant="h2" sx={{ fontSize: "1.25rem", mb: 2 }}>
                About {assistant.name}
              </Typography>
              <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                {assistant.name} is a community-created AI assistant for Shannon AI, designed to
                provide specialized conversational AI experiences. This assistant has been used{" "}
                {assistant.usage_count || 0} times by Shannon AI users.
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Custom assistants (Custom Shans) are personalized AI personas with unique instructions
                and personality traits. They can have specialized knowledge bases that help them
                provide more accurate and contextual responses. By using this assistant, you get
                access to a tailored AI experience designed for specific use cases.
              </Typography>
            </Box>
          </>
        ) : null}
      </Box>
    </>
  );
}
