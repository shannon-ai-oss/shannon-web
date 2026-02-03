import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  CardActions,
  Grid,
  CircularProgress,
  Chip,
  Alert,
  Tab,
  Tabs,
  Avatar,
} from "@mui/material";
import {
  Chat as ChatIcon,
  Description as DescriptionIcon,
  SmartToy as BotIcon,
  Public as PublicIcon,
  TrendingUp as UsageIcon,
  Person as PersonIcon,
  Explore as ExploreIcon,
} from "@mui/icons-material";
import { useCustomShan } from "@/hooks/useCustomShan";
import { useAuth } from "@/hooks/useAuth";
import "./DiscoverCustomShanPage.css";

export default function DiscoverCustomShanPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    publicCustomShans,
    fetchPublicCustomShans,
    selectCustomShan,
    isLoading,
  } = useCustomShan();

  const [tabValue, setTabValue] = useState(0);
  const [loadingId, setLoadingId] = useState(null);

  useEffect(() => {
    if (user) {
      fetchPublicCustomShans();
    }
  }, [user, fetchPublicCustomShans]);

  const handleStartChat = async (customShan) => {
    setLoadingId(customShan.id);
    try {
      await selectCustomShan(customShan.id);
      navigate("/chat");
    } catch (err) {
      console.error("Error starting chat with custom shan:", err);
    } finally {
      setLoadingId(null);
    }
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  // Filter based on tab
  const filteredShans = publicCustomShans.filter((shan) => {
    if (tabValue === 0) return true; // All
    if (tabValue === 1) return !shan.is_owner; // Discover (not mine)
    if (tabValue === 2) return shan.is_owner; // My Public
    return true;
  });

  // Sort by usage count
  const sortedShans = [...filteredShans].sort(
    (a, b) => (b.usage_count || 0) - (a.usage_count || 0)
  );

  if (!user) {
    return (
      <Box className="discover-page">
        <Box className="discover-content">
          <Alert severity="warning">
            Please log in to discover public Custom Shans.
          </Alert>
        </Box>
      </Box>
    );
  }

  return (
    <>
      <Helmet>
        <title>Discover Custom Shans - Shannon AI</title>
        <meta
          name="description"
          content="Explore public AI assistants created by the community"
        />
      </Helmet>

      <Box className="discover-page">
        <Box className="discover-header">
          <Box className="discover-title-section">
            <Typography variant="h4" className="discover-title">
              <ExploreIcon className="title-icon" /> Discover
            </Typography>
            <Typography variant="body1" className="discover-subtitle">
              Explore AI assistants created and shared by the community
            </Typography>
          </Box>
          <Button
            variant="outlined"
            onClick={() => navigate("/custom-shan")}
            className="my-shans-button"
          >
            My Custom Shans
          </Button>
        </Box>

        <Box className="discover-tabs">
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            textColor="inherit"
            indicatorColor="primary"
          >
            <Tab label="All" />
            <Tab label="Discover" />
            <Tab label="My Public" />
          </Tabs>
        </Box>

        <Box className="discover-content">
          {isLoading && publicCustomShans.length === 0 ? (
            <Box className="loading-container">
              <CircularProgress />
              <Typography>Loading public Custom Shans...</Typography>
            </Box>
          ) : sortedShans.length === 0 ? (
            <Box className="empty-state">
              <ExploreIcon className="empty-icon" />
              <Typography variant="h6">No public Custom Shans yet</Typography>
              <Typography variant="body2" color="textSecondary">
                {tabValue === 2
                  ? "Make your Custom Shans public to share them with the community"
                  : "Be the first to share a Custom Shan with the community"}
              </Typography>
              {tabValue === 2 && (
                <Button
                  variant="outlined"
                  color="primary"
                  onClick={() => navigate("/custom-shan")}
                  sx={{ mt: 2 }}
                >
                  Manage My Custom Shans
                </Button>
              )}
            </Box>
          ) : (
            <Grid container spacing={3}>
              {sortedShans.map((customShan) => (
                <Grid item xs={12} sm={6} md={4} key={customShan.id}>
                  <Card className="discover-card">
                    <CardContent>
                      <Box className="card-header">
                        {customShan.icon_url ? (
                          <Avatar
                            src={customShan.icon_url}
                            alt={customShan.name}
                            className="card-icon-avatar"
                            sx={{ width: 48, height: 48 }}
                          />
                        ) : (
                          <Box className="card-icon">
                            <BotIcon />
                          </Box>
                        )}
                        <Box className="card-title-section">
                          <Typography variant="h6" className="card-title">
                            {customShan.name}
                          </Typography>
                          <Box className="card-chips">
                            <Chip
                              icon={<PublicIcon />}
                              label="Public"
                              size="small"
                              color="success"
                              className="public-chip"
                            />
                            {customShan.is_owner && (
                              <Chip
                                label="Mine"
                                size="small"
                                color="primary"
                                className="mine-chip"
                              />
                            )}
                            {customShan.has_knowledge_file && (
                              <Chip
                                icon={<DescriptionIcon />}
                                label="Knowledge"
                                size="small"
                                className="knowledge-chip"
                              />
                            )}
                          </Box>
                        </Box>
                      </Box>
                      {customShan.description && (
                        <Typography
                          variant="body2"
                          color="textSecondary"
                          className="card-description"
                        >
                          {customShan.description}
                        </Typography>
                      )}
                      <Box className="card-meta">
                        <Box className="meta-item">
                          <PersonIcon fontSize="small" />
                          <Typography variant="caption">
                            {customShan.creator_name || "Anonymous"}
                          </Typography>
                        </Box>
                        <Box className="meta-item">
                          <UsageIcon fontSize="small" />
                          <Typography variant="caption">
                            {customShan.usage_count || 0} uses
                          </Typography>
                        </Box>
                      </Box>
                    </CardContent>
                    <CardActions className="card-actions">
                      <Button
                        size="small"
                        color="primary"
                        variant="contained"
                        startIcon={
                          loadingId === customShan.id ? (
                            <CircularProgress size={16} color="inherit" />
                          ) : (
                            <ChatIcon />
                          )
                        }
                        onClick={() => handleStartChat(customShan)}
                        disabled={loadingId === customShan.id}
                        fullWidth
                      >
                        {loadingId === customShan.id ? "Starting..." : "Start Chat"}
                      </Button>
                    </CardActions>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </Box>
      </Box>
    </>
  );
}
