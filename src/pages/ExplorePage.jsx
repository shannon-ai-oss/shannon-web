import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardActions,
  Grid,
  Button,
  Breadcrumbs,
} from "@mui/material";
import {
  Explore as ExploreIcon,
  Extension as SkillIcon,
  SmartToy as BotIcon,
  NavigateNext as NavigateNextIcon,
  ArrowForward as ArrowForwardIcon,
  TrendingUp as TrendingIcon,
  Public as PublicIcon,
} from "@mui/icons-material";
import "./ExplorePage.css";

export default function ExplorePage() {
  const navigate = useNavigate();

  // Generate structured data for the explore page
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Explore Shannon AI - Community AI Skills & Assistants",
    description:
      "Explore community-created AI content for Shannon AI. Discover skills and custom AI assistants. Free to browse and use.",
    url: "https://shannon-ai.com/explore",
    mainEntity: {
      "@type": "ItemList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          item: {
            "@type": "CollectionPage",
            name: "AI Skills Directory",
            description: "Browse community-created AI skills and prompts",
            url: "https://shannon-ai.com/explore/skills",
          },
        },
        {
          "@type": "ListItem",
          position: 2,
          item: {
            "@type": "CollectionPage",
            name: "AI Assistants Directory",
            description: "Discover custom AI assistants and personas",
            url: "https://shannon-ai.com/explore/assistants",
          },
        },
      ],
    },
    publisher: {
      "@type": "Organization",
      name: "Shannon AI",
      url: "https://shannon-ai.com",
      logo: {
        "@type": "ImageObject",
        url: "https://shannon-ai.com/SHANNONICO.ico",
      },
    },
  };

  const pageTitle = "Explore Shannon AI | Community Skills & AI Assistants";
  const pageDescription =
    "Discover community-created AI content for Shannon AI. Browse skills and custom AI assistants. Join our growing AI community.";

  const categories = [
    {
      title: "AI Skills",
      description:
        "Modular AI prompts and capabilities created by the community. Find specialized tools for writing, coding, analysis, and more.",
      icon: <SkillIcon />,
      path: "/explore/skills",
      color: "#667eea",
      features: ["Pre-built Prompts", "Modular Capabilities", "Community Created"],
    },
    {
      title: "AI Assistants",
      description:
        "Custom AI personas and chatbots with unique personalities. Discover specialized assistants for various tasks and domains.",
      icon: <BotIcon />,
      path: "/explore/assistants",
      color: "#764ba2",
      features: ["Custom Personalities", "Knowledge Bases", "Specialized Helpers"],
    },
  ];

  return (
    <>
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <meta
          name="keywords"
          content="Shannon AI, AI skills, custom AI, AI assistants, chatbot, AI prompts, community AI, shared conversations, AI tools, LLM"
        />
        <link rel="canonical" href="https://shannon-ai.com/explore" />

        {/* OpenGraph */}
        <meta property="og:type" content="website" />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:url" content="https://shannon-ai.com/explore" />
        <meta property="og:image" content="https://shannon-ai.com/shannonbanner.png" />
        <meta property="og:image:alt" content="Shannon AI Explore - Community Content" />
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

      <Box className="explore-page">
        <Box sx={{ mb: 3 }}>
          <Breadcrumbs
            separator={<NavigateNextIcon fontSize="small" />}
            aria-label="breadcrumb"
          >
            <Link to="/" style={{ color: "inherit", textDecoration: "none" }}>
              Home
            </Link>
            <Typography color="text.primary">Explore</Typography>
          </Breadcrumbs>
        </Box>

        <Box className="explore-hero">
          <Box className="hero-content">
            <Typography variant="h1" className="hero-title">
              <ExploreIcon className="hero-icon" /> Explore Shannon AI
            </Typography>
            <Typography variant="body1" className="hero-subtitle" component="h2">
              Discover community-created AI content. Browse skills, custom assistants,
              and shared conversations from our growing community of AI enthusiasts.
            </Typography>
            <Box className="hero-stats">
              <Box className="stat-item">
                <PublicIcon />
                <Typography variant="body2">100% Free to Browse</Typography>
              </Box>
              <Box className="stat-item">
                <TrendingIcon />
                <Typography variant="body2">Community Curated</Typography>
              </Box>
            </Box>
          </Box>
        </Box>

        <Box className="categories-section">
          <Typography variant="h2" className="section-title">
            Browse by Category
          </Typography>
          <Grid container spacing={4}>
            {categories.map((category) => (
              <Grid item xs={12} md={4} key={category.path}>
                <Card
                  className="category-card"
                  sx={{
                    borderTop: `4px solid ${category.color}`,
                  }}
                >
                  <CardContent>
                    <Box
                      className="category-icon"
                      sx={{ backgroundColor: category.color }}
                    >
                      {category.icon}
                    </Box>
                    <Typography variant="h3" className="category-title">
                      {category.title}
                    </Typography>
                    <Typography
                      variant="body2"
                      color="textSecondary"
                      className="category-description"
                    >
                      {category.description}
                    </Typography>
                    <Box className="category-features">
                      {category.features.map((feature, index) => (
                        <Typography
                          key={index}
                          variant="caption"
                          className="feature-tag"
                        >
                          {feature}
                        </Typography>
                      ))}
                    </Box>
                  </CardContent>
                  <CardActions>
                    <Button
                      fullWidth
                      variant="contained"
                      endIcon={<ArrowForwardIcon />}
                      onClick={() => navigate(category.path)}
                      sx={{
                        backgroundColor: category.color,
                        "&:hover": {
                          backgroundColor: category.color,
                          filter: "brightness(1.1)",
                        },
                      }}
                    >
                      Browse {category.title}
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>

        {/* SEO Content Section */}
        <Box className="seo-content" sx={{ mt: 8 }}>
          <Typography variant="h2" sx={{ fontSize: "1.75rem", mb: 3, textAlign: "center" }}>
            Why Explore Shannon AI?
          </Typography>

          <Grid container spacing={4} sx={{ mb: 6 }}>
            <Grid item xs={12} md={4}>
              <Box className="benefit-box">
                <Typography variant="h3" sx={{ fontSize: "1.25rem", mb: 1 }}>
                  Discover New Capabilities
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Our community creates innovative AI skills and assistants daily.
                  Find tools you never knew you needed and expand what's possible
                  with AI assistance.
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} md={4}>
              <Box className="benefit-box">
                <Typography variant="h3" sx={{ fontSize: "1.25rem", mb: 1 }}>
                  Learn from Others
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Browse shared conversations to see how other users interact
                  with Shannon AI. Learn prompting techniques and discover new
                  use cases for AI.
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} md={4}>
              <Box className="benefit-box">
                <Typography variant="h3" sx={{ fontSize: "1.25rem", mb: 1 }}>
                  Join the Community
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Share your own skills, assistants, and conversations. Help
                  others while building your reputation in the Shannon AI
                  community.
                </Typography>
              </Box>
            </Grid>
          </Grid>

          <Box sx={{ borderTop: "1px solid rgba(255,255,255,0.1)", pt: 4 }}>
            <Typography variant="h2" sx={{ fontSize: "1.5rem", mb: 2 }}>
              About Shannon AI Community Content
            </Typography>
            <Typography variant="body1" color="textSecondary" sx={{ mb: 2 }}>
              Shannon AI is more than just an AI assistant - it's a platform for
              sharing and discovering AI-powered tools. Our community of users creates
              and shares skills (modular AI prompts), custom assistants (personalized AI
              personas), and conversations (real examples of AI interactions).
            </Typography>
            <Typography variant="body1" color="textSecondary">
              All public content on Shannon AI is freely available to browse. Sign in
              to start using skills and assistants in your own conversations, or to
              share your own creations with the community.
            </Typography>
          </Box>
        </Box>
      </Box>
    </>
  );
}
