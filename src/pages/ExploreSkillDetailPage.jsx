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
  Paper,
  Divider,
} from "@mui/material";
import {
  TrendingUp as UsageIcon,
  Person as PersonIcon,
  Extension as SkillIcon,
  NavigateNext as NavigateNextIcon,
  CalendarToday as DateIcon,
  ContentCopy as CopyIcon,
  Login as LoginIcon,
  ArrowBack as BackIcon,
} from "@mui/icons-material";
import { skillsStore } from "@/lib/localDataStore";
import { useAuth } from "@/hooks/useAuth";
import "./ExploreSkillDetailPage.css";

export default function ExploreSkillDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [skill, setSkill] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchSkill = async () => {
      if (!id) return;
      startTransition(() => {
        setIsLoading(true);
        setError(null);
      });
      try {
        const data = await skillsStore.getPublicById(id);
        if (!data) {
          throw new Error("Skill not found");
        }
        startTransition(() => {
          setSkill(data);
        });
      } catch (err) {
        console.error("Error fetching skill:", err);
        startTransition(() => {
          setError(err.message);
        });
      } finally {
        startTransition(() => {
          setIsLoading(false);
        });
      }
    };

    fetchSkill();
  }, [id]);

  const handleCopyContent = () => {
    if (skill?.content) {
      navigator.clipboard.writeText(skill.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
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

  // Generate structured data for the skill
  const structuredData = skill
    ? {
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        name: skill.name,
        description: skill.description || `AI skill for Shannon: ${skill.name}`,
        applicationCategory: "AI Assistant Skill",
        operatingSystem: "Web",
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "USD",
        },
        author: {
          "@type": "Person",
          name: skill.creator_name || "Shannon AI Community",
        },
        aggregateRating: {
          "@type": "AggregateRating",
          ratingValue: "5",
          ratingCount: skill.usage_count || 1,
          bestRating: "5",
          worstRating: "1",
        },
        datePublished: skill.created_at,
        dateModified: skill.updated_at || skill.created_at,
        publisher: {
          "@type": "Organization",
          name: "Shannon AI",
          url: "https://shannon-ai.com",
        },
        url: `https://shannon-ai.com/explore/skills/${skill.id}`,
      }
    : null;

  const pageTitle = skill
    ? `${skill.name} - AI Skill | Shannon AI`
    : "AI Skill | Shannon AI";
  const pageDescription = skill
    ? skill.description
      ? `${skill.description.slice(0, 150)}${skill.description.length > 150 ? "..." : ""} - Created by ${skill.creator_name || "the Shannon AI community"}.`
      : `${skill.name} is an AI skill for Shannon AI created by ${skill.creator_name || "the community"}. Use this skill to enhance your AI conversations.`
    : "Discover AI skills for Shannon AI.";

  return (
    <>
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <meta
          name="keywords"
          content={`${skill?.name || "AI skill"}, AI prompts, Shannon AI, AI capabilities, ${skill?.creator_name || "community"}`}
        />
        <link
          rel="canonical"
          href={`https://shannon-ai.com/explore/skills/${id}`}
        />

        {/* OpenGraph */}
        <meta property="og:type" content="website" />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta
          property="og:url"
          content={`https://shannon-ai.com/explore/skills/${id}`}
        />
        <meta
          property="og:image"
          content="https://shannon-ai.com/shannonbanner.png"
        />
        <meta property="og:image:alt" content={skill?.name || "Shannon AI Skill"} />
        <meta property="og:site_name" content="Shannon AI" />

        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={pageTitle} />
        <meta name="twitter:description" content={pageDescription} />
        <meta
          name="twitter:image"
          content="https://shannon-ai.com/shannonbanner.png"
        />

        {/* Structured Data */}
        {structuredData && (
          <script type="application/ld+json">
            {JSON.stringify(structuredData)}
          </script>
        )}
      </Helmet>

      <Box className="explore-skill-detail-page">
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
            <Link to="/explore/skills" style={{ color: "inherit", textDecoration: "none" }}>
              Skills
            </Link>
            <Typography color="text.primary">
              {skill?.name || "Skill Details"}
            </Typography>
          </Breadcrumbs>
        </Box>

        <Button
          startIcon={<BackIcon />}
          onClick={() => navigate("/explore/skills")}
          sx={{ mb: 3 }}
          color="inherit"
        >
          Back to Skills
        </Button>

        {isLoading ? (
          <Box className="loading-container">
            <CircularProgress />
            <Typography>Loading skill details...</Typography>
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
            <Box sx={{ mt: 2 }}>
              <Button variant="outlined" onClick={() => navigate("/explore/skills")}>
                Browse All Skills
              </Button>
            </Box>
          </Alert>
        ) : skill ? (
          <>
            <Card className="skill-detail-card">
              <CardContent>
                <Box className="skill-header">
                  <Box className="skill-icon">
                    <SkillIcon />
                  </Box>
                  <Box className="skill-title-section">
                    <Typography variant="h1" className="skill-title">
                      {skill.name}
                    </Typography>
                    <Box className="skill-chips">
                      <Chip label="Public" size="small" color="success" />
                      <Chip
                        label={`${skill.usage_count || 0} uses`}
                        size="small"
                        variant="outlined"
                        icon={<UsageIcon />}
                      />
                    </Box>
                  </Box>
                </Box>

                {skill.description && (
                  <Typography
                    variant="body1"
                    className="skill-description"
                    component="h2"
                  >
                    {skill.description}
                  </Typography>
                )}

                <Box className="skill-meta">
                  <Box className="meta-item">
                    <PersonIcon fontSize="small" />
                    <Typography variant="body2">
                      Created by <strong>{skill.creator_name || "Anonymous"}</strong>
                    </Typography>
                  </Box>
                  <Box className="meta-item">
                    <DateIcon fontSize="small" />
                    <Typography variant="body2">
                      Published {formatDate(skill.created_at)}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>

            <Paper className="skill-content-section">
              <Box className="content-header">
                <Typography variant="h2" className="content-title">
                  Skill Content
                </Typography>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<CopyIcon />}
                  onClick={handleCopyContent}
                >
                  {copied ? "Copied!" : "Copy"}
                </Button>
              </Box>
              <Divider sx={{ my: 2 }} />
              <Box className="skill-content-preview">
                <pre>{skill.content}</pre>
              </Box>
            </Paper>

            <Box className="cta-section">
              <Typography variant="h3" className="cta-title">
                Use This Skill
              </Typography>
              <Typography variant="body1" color="textSecondary" sx={{ mb: 3 }}>
                {user
                  ? "Add this skill to your library and use it in your Shannon AI conversations."
                  : "Sign in to Shannon AI to add this skill to your library and use it in your conversations."}
              </Typography>
              {user ? (
                <Button
                  variant="contained"
                  color="primary"
                  size="large"
                  onClick={() => navigate("/skills/discover")}
                >
                  Add to My Skills
                </Button>
              ) : (
                <Button
                  variant="contained"
                  color="primary"
                  size="large"
                  startIcon={<LoginIcon />}
                  onClick={() => navigate("/login")}
                >
                  Sign In to Use
                </Button>
              )}
            </Box>

            {/* SEO Content */}
            <Box className="seo-content" sx={{ mt: 6, pt: 4, borderTop: "1px solid rgba(255,255,255,0.1)" }}>
              <Typography variant="h2" sx={{ fontSize: "1.25rem", mb: 2 }}>
                About {skill.name}
              </Typography>
              <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                {skill.name} is a community-created AI skill for Shannon AI, designed to enhance
                your conversations with specialized capabilities. This skill has been used{" "}
                {skill.usage_count || 0} times by Shannon AI users.
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Skills are modular prompts and instructions that customize how Shannon AI
                responds to your requests. By adding this skill to your library, you can
                activate it during your conversations to get more specialized and effective
                AI assistance.
              </Typography>
            </Box>
          </>
        ) : null}
      </Box>
    </>
  );
}
