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
  Snackbar,
} from "@mui/material";
import {
  Add as AddIcon,
  Public as PublicIcon,
  TrendingUp as UsageIcon,
  Person as PersonIcon,
  Explore as ExploreIcon,
  Extension as SkillIcon,
} from "@mui/icons-material";
import { useSkills } from "@/hooks/useSkills";
import { useAuth } from "@/hooks/useAuth";
import "./DiscoverSkillsPage.css";

export default function DiscoverSkillsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    publicSkills,
    fetchPublicSkills,
    cloneSkill,
    isLoading,
  } = useSkills();

  const [tabValue, setTabValue] = useState(0);
  const [loadingId, setLoadingId] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: "" });

  useEffect(() => {
    if (user) {
      fetchPublicSkills();
    }
  }, [user, fetchPublicSkills]);

  const handleAddSkill = async (skill) => {
    if (skill.is_owner) return;
    setLoadingId(skill.id);
    try {
      await cloneSkill(skill.id);
      await fetchPublicSkills();
      setSnackbar({ open: true, message: "Skill added to your library" });
    } catch (err) {
      console.error("Error adding skill:", err);
      setSnackbar({ open: true, message: "Failed to add skill" });
    } finally {
      setLoadingId(null);
    }
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const filteredSkills = publicSkills.filter((skill) => {
    if (tabValue === 0) return true;
    if (tabValue === 1) return !skill.is_owner;
    if (tabValue === 2) return skill.is_owner;
    return true;
  });

  const sortedSkills = [...filteredSkills].sort(
    (a, b) => (b.usage_count || 0) - (a.usage_count || 0),
  );

  if (!user) {
    return (
      <Box className="discover-skills-page">
        <Box className="discover-skills-content">
          <Alert severity="warning">
            Please log in to discover public Skills.
          </Alert>
        </Box>
      </Box>
    );
  }

  return (
    <>
      <Helmet>
        <title>Discover Skills - Shannon AI</title>
        <meta
          name="description"
          content="Explore community Skills for Shannon 1.6 Pro"
        />
      </Helmet>

      <Box className="discover-skills-page">
        <Box className="discover-skills-header">
          <Box className="discover-title-section">
            <Typography variant="h4" className="discover-title">
              <ExploreIcon className="title-icon" /> Discover Skills
            </Typography>
            <Typography variant="body1" className="discover-subtitle">
              Explore modular capabilities shared by the community
            </Typography>
          </Box>
          <Button
            variant="outlined"
            onClick={() => navigate("/skills")}
            className="my-skills-button"
          >
            My Skills
          </Button>
        </Box>

        <Box className="discover-tabs">
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            textColor="inherit"
            indicatorColor="primary"
          >
            <Tab label="All Skills" />
            <Tab label="Discover" />
            <Tab label="My Public" />
          </Tabs>
        </Box>

        <Box className="discover-skills-content">
          {isLoading && publicSkills.length === 0 ? (
            <Box className="loading-container">
              <CircularProgress />
              <Typography>Loading public Skills...</Typography>
            </Box>
          ) : sortedSkills.length === 0 ? (
            <Box className="empty-state">
              <ExploreIcon className="empty-icon" />
              <Typography variant="h6">No public Skills yet</Typography>
              <Typography variant="body2" color="textSecondary">
                {tabValue === 2
                  ? "Make your Skills public to share them with the community"
                  : "Be the first to share a Skill with the community"}
              </Typography>
              {tabValue === 2 && (
                <Button
                  variant="outlined"
                  color="primary"
                  onClick={() => navigate("/skills")}
                  sx={{ mt: 2 }}
                >
                  Manage My Skills
                </Button>
              )}
            </Box>
          ) : (
            <Grid container spacing={3}>
              {sortedSkills.map((skill) => (
                <Grid item xs={12} sm={6} md={4} key={skill.id}>
                  <Card className="discover-card">
                    <CardContent>
                      <Box className="card-header">
                        <Box className="card-icon">
                          <SkillIcon />
                        </Box>
                        <Box className="card-title-section">
                          <Typography variant="h6" className="card-title">
                            {skill.name}
                          </Typography>
                          <Box className="card-chips">
                            <Chip
                              icon={<PublicIcon />}
                              label="Public"
                              size="small"
                              color="success"
                              className="public-chip"
                            />
                            {skill.is_owner && (
                              <Chip
                                label="Mine"
                                size="small"
                                color="primary"
                                className="mine-chip"
                              />
                            )}
                          </Box>
                        </Box>
                      </Box>
                      {skill.description && (
                        <Typography
                          variant="body2"
                          color="textSecondary"
                          className="card-description"
                        >
                          {skill.description}
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
                      {skill.is_owner ? (
                        <Button
                          size="small"
                          variant="outlined"
                          fullWidth
                          disabled
                        >
                          Owned
                        </Button>
                      ) : (
                        <Button
                          size="small"
                          color="primary"
                          variant="contained"
                          startIcon={
                            loadingId === skill.id ? (
                              <CircularProgress size={16} color="inherit" />
                            ) : (
                              <AddIcon />
                            )
                          }
                          onClick={() => handleAddSkill(skill)}
                          disabled={loadingId === skill.id}
                          fullWidth
                        >
                          {loadingId === skill.id ? "Adding..." : "Add Skill"}
                        </Button>
                      )}
                    </CardActions>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </Box>
      </Box>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ open: false, message: "" })}
        message={snackbar.message}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      />
    </>
  );
}
