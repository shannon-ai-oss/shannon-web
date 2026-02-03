import React, { startTransition, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardActions,
  Grid,
  CircularProgress,
  Chip,
  Alert,
  Button,
  Breadcrumbs,
  Avatar,
} from "@mui/material";
import {
  TrendingUp as UsageIcon,
  Person as PersonIcon,
  Explore as ExploreIcon,
  SmartToy as BotIcon,
  NavigateNext as NavigateNextIcon,
  ArrowForward as ArrowForwardIcon,
  Description as KnowledgeIcon,
} from "@mui/icons-material";
import { customShanStore } from "@/lib/localDataStore";
import "./ExploreAssistantsPage.css";

export default function ExploreAssistantsPage() {
  const navigate = useNavigate();
  const [assistants, setAssistants] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPublicAssistants = async () => {
      startTransition(() => {
        setIsLoading(true);
        setError(null);
      });
      try {
        const data = await customShanStore.listExplore();
        startTransition(() => {
          setAssistants(data || []);
        });
      } catch (err) {
        console.error("Error fetching public assistants:", err);
        startTransition(() => {
          setError(err.message);
        });
      } finally {
        startTransition(() => {
          setIsLoading(false);
        });
      }
    };

    fetchPublicAssistants();
  }, []);

  const sortedAssistants = [...assistants].sort(
    (a, b) => (b.usage_count || 0) - (a.usage_count || 0)
  );

  // Normalize icon URL (handle localhost URLs)
  const normalizeIconUrl = (url) => {
    if (!url) return null;
    if (url.includes("localhost")) return null;
    return url;
  };

  // Generate structured data for the assistants collection
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Shannon AI Custom Assistants Directory - Community AI Personas",
    description:
      "Explore community-created AI assistants for Shannon AI. Find specialized AI personas, custom chatbots, and personalized AI agents for various tasks.",
    url: "https://shannon-ai.com/explore/assistants",
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: sortedAssistants.length,
      itemListElement: sortedAssistants.slice(0, 20).map((assistant, index) => ({
        "@type": "ListItem",
        position: index + 1,
        item: {
          "@type": "SoftwareApplication",
          name: assistant.name,
          description: assistant.description || `Custom AI assistant: ${assistant.name}`,
          applicationCategory: "AI Assistant",
          author: {
            "@type": "Person",
            name: assistant.creator_name || "Shannon AI Community",
          },
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: "5",
            ratingCount: assistant.usage_count || 1,
          },
          url: `https://shannon-ai.com/explore/assistants/${assistant.id}`,
        },
      })),
    },
    publisher: {
      "@type": "Organization",
      name: "Shannon AI",
      url: "https://shannon-ai.com",
    },
  };

  const pageTitle = "AI Assistants Directory | Custom AI Personas & Chatbots | Shannon AI";
  const pageDescription =
    "Discover community-created AI assistants and custom personas for Shannon AI. Browse specialized chatbots, AI agents, and personalized AI helpers. Free to explore.";

  return (
    <>
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <meta
          name="keywords"
          content="AI assistants, custom AI, Shannon AI, AI personas, chatbots, AI agents, custom chatbot, AI helper, virtual assistant, LLM personas"
        />
        <link rel="canonical" href="https://shannon-ai.com/explore/assistants" />

        {/* OpenGraph */}
        <meta property="og:type" content="website" />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:url" content="https://shannon-ai.com/explore/assistants" />
        <meta property="og:image" content="https://shannon-ai.com/shannonbanner.png" />
        <meta property="og:image:alt" content="Shannon AI Custom Assistants Directory" />
        <meta property="og:site_name" content="Shannon AI" />

        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={pageTitle} />
        <meta name="twitter:description" content={pageDescription} />
        <meta name="twitter:image" content="https://shannon-ai.com/shannonbanner.png" />

        {/* Structured Data */}
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      </Helmet>

      <Box className="explore-assistants-page">
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
            <Typography color="text.primary">AI Assistants</Typography>
          </Breadcrumbs>
        </Box>

        <Box className="explore-assistants-header">
          <Box className="explore-title-section">
            <Typography variant="h1" className="explore-title">
              <ExploreIcon className="title-icon" /> AI Assistants Directory
            </Typography>
            <Typography variant="body1" className="explore-subtitle" component="h2">
              Discover community-created AI assistants and custom personas.
              Find specialized chatbots and AI helpers for various tasks.
            </Typography>
          </Box>
        </Box>

        <Box className="explore-assistants-content">
          {isLoading ? (
            <Box className="loading-container">
              <CircularProgress />
              <Typography>Loading AI Assistants...</Typography>
            </Box>
          ) : error ? (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          ) : sortedAssistants.length === 0 ? (
            <Box className="empty-state">
              <ExploreIcon className="empty-icon" />
              <Typography variant="h6" component="p">
                No public assistants available yet
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Be the first to share a custom assistant with the community!
              </Typography>
              <Button
                variant="outlined"
                color="primary"
                onClick={() => navigate("/custom-shan")}
                sx={{ mt: 2 }}
              >
                Create Your First Assistant
              </Button>
            </Box>
          ) : (
            <>
              <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
                Showing {sortedAssistants.length} public assistant{sortedAssistants.length !== 1 ? "s" : ""}
              </Typography>
              <Grid container spacing={3}>
                {sortedAssistants.map((assistant) => (
                  <Grid item xs={12} sm={6} md={4} key={assistant.id}>
                    <Card
                      className="explore-card"
                      component={Link}
                      to={`/explore/assistants/${assistant.id}`}
                      sx={{ textDecoration: "none", display: "block" }}
                    >
                      <CardContent>
                        <Box className="card-header">
                          {normalizeIconUrl(assistant.icon_url) ? (
                            <Avatar
                              src={normalizeIconUrl(assistant.icon_url)}
                              alt={assistant.name}
                              className="card-icon-avatar"
                              sx={{ width: 48, height: 48 }}
                            />
                          ) : (
                            <Box className="card-icon">
                              <BotIcon />
                            </Box>
                          )}
                          <Box className="card-title-section">
                            <Typography variant="h6" className="card-title" component="h3">
                              {assistant.name}
                            </Typography>
                            <Box className="card-chips">
                              <Chip
                                label="Public"
                                size="small"
                                color="success"
                                className="public-chip"
                              />
                              {assistant.has_knowledge_file && (
                                <Chip
                                  icon={<KnowledgeIcon />}
                                  label="Knowledge"
                                  size="small"
                                  variant="outlined"
                                  className="knowledge-chip"
                                />
                              )}
                            </Box>
                          </Box>
                        </Box>
                        {assistant.description && (
                          <Typography
                            variant="body2"
                            color="textSecondary"
                            className="card-description"
                          >
                            {assistant.description.length > 150
                              ? `${assistant.description.slice(0, 150)}...`
                              : assistant.description}
                          </Typography>
                        )}
                        <Box className="card-meta">
                          <Box className="meta-item">
                            <PersonIcon fontSize="small" />
                            <Typography variant="caption">
                              {assistant.creator_name || "Anonymous"}
                            </Typography>
                          </Box>
                          <Box className="meta-item">
                            <UsageIcon fontSize="small" />
                            <Typography variant="caption">
                              {assistant.usage_count || 0} uses
                            </Typography>
                          </Box>
                        </Box>
                      </CardContent>
                      <CardActions className="card-actions">
                        <Button
                          size="small"
                          color="primary"
                          variant="outlined"
                          endIcon={<ArrowForwardIcon />}
                          fullWidth
                        >
                          View Details
                        </Button>
                      </CardActions>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </>
          )}
        </Box>

        {/* SEO Content Section */}
        <Box className="seo-content" sx={{ mt: 6, pt: 4, borderTop: "1px solid rgba(255,255,255,0.1)" }}>
          <Typography variant="h2" sx={{ fontSize: "1.5rem", mb: 2 }}>
            What are Shannon AI Custom Assistants?
          </Typography>
          <Typography variant="body1" color="textSecondary" sx={{ mb: 3 }}>
            Custom Assistants (also called Custom Shans) are personalized AI personas created by our community.
            Each assistant has unique instructions, personality traits, and optionally, specialized knowledge
            files that help them excel at specific tasks. From coding helpers to creative writing partners,
            our directory offers AI assistants for every need.
          </Typography>

          <Typography variant="h2" sx={{ fontSize: "1.5rem", mb: 2 }}>
            How to Use Custom AI Assistants
          </Typography>
          <Typography variant="body1" color="textSecondary" sx={{ mb: 3 }}>
            Browse through our collection of community-created assistants. Each assistant has a detailed
            page showing its capabilities and specialty. Sign in to Shannon AI to start chatting with
            any public assistant. You can also create and share your own custom assistants with the community.
          </Typography>

          <Typography variant="h2" sx={{ fontSize: "1.5rem", mb: 2 }}>
            Popular Assistant Categories
          </Typography>
          <Typography variant="body1" color="textSecondary">
            Our assistants span many categories including: coding helpers, writing assistants, tutors,
            research analysts, creative collaborators, business advisors, language translators,
            role-play characters, and specialized domain experts. Each is designed to provide
            focused, high-quality assistance in their area of expertise.
          </Typography>
        </Box>
      </Box>
    </>
  );
}
