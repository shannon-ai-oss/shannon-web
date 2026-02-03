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
} from "@mui/material";
import {
  TrendingUp as UsageIcon,
  Person as PersonIcon,
  Explore as ExploreIcon,
  Extension as SkillIcon,
  NavigateNext as NavigateNextIcon,
  ArrowForward as ArrowForwardIcon,
} from "@mui/icons-material";
import { skillsStore } from "@/lib/localDataStore";
import "./ExploreSkillsPage.css";

export default function ExploreSkillsPage() {
  const navigate = useNavigate();
  const [skills, setSkills] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPublicSkills = async () => {
      startTransition(() => {
        setIsLoading(true);
        setError(null);
      });
      try {
        const data = await skillsStore.listExplore();
        startTransition(() => {
          setSkills(data || []);
        });
      } catch (err) {
        console.error("Error fetching public skills:", err);
        startTransition(() => {
          setError(err.message);
        });
      } finally {
        startTransition(() => {
          setIsLoading(false);
        });
      }
    };

    fetchPublicSkills();
  }, []);

  const sortedSkills = [...skills].sort(
    (a, b) => (b.usage_count || 0) - (a.usage_count || 0)
  );

  // Generate structured data for the skills collection
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Shannon AI Skills Directory - Community AI Prompts & Capabilities",
    description:
      "Explore community-created AI skills for Shannon AI. Find pre-built prompts, specialized capabilities, and modular AI tools to enhance your conversations.",
    url: "https://shannon-ai.com/explore/skills",
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: sortedSkills.length,
      itemListElement: sortedSkills.slice(0, 20).map((skill, index) => ({
        "@type": "ListItem",
        position: index + 1,
        item: {
          "@type": "SoftwareApplication",
          name: skill.name,
          description: skill.description || `AI skill for Shannon: ${skill.name}`,
          applicationCategory: "AI Assistant Skill",
          author: {
            "@type": "Person",
            name: skill.creator_name || "Shannon AI Community",
          },
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: "5",
            ratingCount: skill.usage_count || 1,
          },
          url: `https://shannon-ai.com/explore/skills/${skill.id}`,
        },
      })),
    },
    publisher: {
      "@type": "Organization",
      name: "Shannon AI",
      url: "https://shannon-ai.com",
    },
  };

  const pageTitle = "AI Skills Directory | Community Prompts & Capabilities | Shannon AI";
  const pageDescription =
    "Discover and use community-created AI skills for Shannon AI. Browse pre-built prompts, specialized capabilities, and modular tools. Free to explore and use.";

  return (
    <>
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <meta
          name="keywords"
          content="AI skills, AI prompts, Shannon AI, AI capabilities, custom prompts, AI tools, chatbot skills, LLM prompts, AI assistant, productivity"
        />
        <link rel="canonical" href="https://shannon-ai.com/explore/skills" />

        {/* OpenGraph */}
        <meta property="og:type" content="website" />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:url" content="https://shannon-ai.com/explore/skills" />
        <meta property="og:image" content="https://shannon-ai.com/shannonbanner.png" />
        <meta property="og:image:alt" content="Shannon AI Skills Directory" />
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

      <Box className="explore-skills-page">
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
            <Typography color="text.primary">Skills</Typography>
          </Breadcrumbs>
        </Box>

        <Box className="explore-skills-header">
          <Box className="explore-title-section">
            <Typography variant="h1" className="explore-title">
              <ExploreIcon className="title-icon" /> AI Skills Directory
            </Typography>
            <Typography variant="body1" className="explore-subtitle" component="h2">
              Discover community-created skills and capabilities for Shannon AI.
              Browse specialized prompts and tools to enhance your AI conversations.
            </Typography>
          </Box>
        </Box>

        <Box className="explore-skills-content">
          {isLoading ? (
            <Box className="loading-container">
              <CircularProgress />
              <Typography>Loading AI Skills...</Typography>
            </Box>
          ) : error ? (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          ) : sortedSkills.length === 0 ? (
            <Box className="empty-state">
              <ExploreIcon className="empty-icon" />
              <Typography variant="h6" component="p">
                No public skills available yet
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Be the first to share a skill with the community!
              </Typography>
              <Button
                variant="outlined"
                color="primary"
                onClick={() => navigate("/skills")}
                sx={{ mt: 2 }}
              >
                Create Your First Skill
              </Button>
            </Box>
          ) : (
            <>
              <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
                Showing {sortedSkills.length} public skill{sortedSkills.length !== 1 ? "s" : ""}
              </Typography>
              <Grid container spacing={3}>
                {sortedSkills.map((skill) => (
                  <Grid item xs={12} sm={6} md={4} key={skill.id}>
                    <Card
                      className="explore-card"
                      component={Link}
                      to={`/explore/skills/${skill.id}`}
                      sx={{ textDecoration: "none", display: "block" }}
                    >
                      <CardContent>
                        <Box className="card-header">
                          <Box className="card-icon">
                            <SkillIcon />
                          </Box>
                          <Box className="card-title-section">
                            <Typography variant="h6" className="card-title" component="h3">
                              {skill.name}
                            </Typography>
                            <Chip
                              label="Public"
                              size="small"
                              color="success"
                              className="public-chip"
                            />
                          </Box>
                        </Box>
                        {skill.description && (
                          <Typography
                            variant="body2"
                            color="textSecondary"
                            className="card-description"
                          >
                            {skill.description.length > 150
                              ? `${skill.description.slice(0, 150)}...`
                              : skill.description}
                          </Typography>
                        )}
                        <Box className="card-meta">
                          <Box className="meta-item">
                            <PersonIcon fontSize="small" />
                            <Typography variant="caption">
                              {skill.creator_name || "Anonymous"}
                            </Typography>
                          </Box>
                          <Box className="meta-item">
                            <UsageIcon fontSize="small" />
                            <Typography variant="caption">
                              {skill.usage_count || 0} uses
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
            What are Shannon AI Skills?
          </Typography>
          <Typography variant="body1" color="textSecondary" sx={{ mb: 3 }}>
            Shannon AI Skills are modular, reusable prompts and capabilities that enhance your AI conversations.
            Created by our community, these skills range from specialized knowledge prompts to complex
            task automation templates. Skills can help you write better, analyze data, generate code,
            and accomplish complex tasks more efficiently.
          </Typography>

          <Typography variant="h2" sx={{ fontSize: "1.5rem", mb: 2 }}>
            How to Use AI Skills
          </Typography>
          <Typography variant="body1" color="textSecondary" sx={{ mb: 3 }}>
            Browse through our collection of community-created skills. Each skill has a detailed page
            showing what it does and how it works. Sign in to Shannon AI to add skills to your library
            and use them in your conversations. You can also create and share your own skills with the community.
          </Typography>

          <Typography variant="h2" sx={{ fontSize: "1.5rem", mb: 2 }}>
            Featured Skill Categories
          </Typography>
          <Typography variant="body1" color="textSecondary">
            Our skills cover a wide range of categories including: writing assistance, code generation,
            data analysis, research, creative tasks, productivity, education, business, and more.
            Each skill is designed to help you accomplish specific tasks more effectively with AI.
          </Typography>
        </Box>
      </Box>
    </>
  );
}
