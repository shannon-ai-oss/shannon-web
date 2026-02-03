import React, { useState } from "react";
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
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions as MuiDialogActions,
  CircularProgress,
  Chip,
  Alert,
  Tooltip,
  Snackbar,
  Switch,
  FormControlLabel,
} from "@mui/material";
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Public as PublicIcon,
  PublicOff as PrivateIcon,
  TrendingUp as UsageIcon,
  Extension as SkillIcon,
  Explore as ExploreIcon,
} from "@mui/icons-material";
import { useSkills } from "@/hooks/useSkills";
import { useAuth } from "@/hooks/useAuth";
import "./SkillsPage.css";

export default function SkillsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    skills,
    isLoading,
    error,
    deleteSkill,
    updateSkill,
    togglePublic,
  } = useSkills();

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedForDelete, setSelectedForDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [togglingPublicId, setTogglingPublicId] = useState(null);
  const [togglingActiveId, setTogglingActiveId] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: "" });

  const handleCreateNew = () => {
    navigate("/skills/create");
  };

  const handleEdit = (skill) => {
    navigate(`/skills/${skill.id}/edit`);
  };

  const handleTogglePublic = async (skill) => {
    setTogglingPublicId(skill.id);
    try {
      await togglePublic(skill.id);
      setSnackbar({
        open: true,
        message: skill.is_public ? "Skill is now private" : "Skill is now public",
      });
    } catch (err) {
      console.error("Error toggling public status:", err);
      setSnackbar({ open: true, message: "Failed to update visibility" });
    } finally {
      setTogglingPublicId(null);
    }
  };

  const handleToggleActive = async (skill) => {
    setTogglingActiveId(skill.id);
    try {
      await updateSkill(skill.id, { is_active: !skill.is_active });
      setSnackbar({
        open: true,
        message: skill.is_active ? "Skill deactivated" : "Skill activated",
      });
    } catch (err) {
      console.error("Error toggling active status:", err);
      setSnackbar({ open: true, message: "Failed to update activation" });
    } finally {
      setTogglingActiveId(null);
    }
  };

  const handleDeleteClick = (skill) => {
    setSelectedForDelete(skill);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedForDelete) return;
    setIsDeleting(true);
    try {
      await deleteSkill(selectedForDelete.id);
      setDeleteDialogOpen(false);
      setSelectedForDelete(null);
      setSnackbar({ open: true, message: "Skill deleted" });
    } catch (err) {
      console.error("Error deleting skill:", err);
      setSnackbar({ open: true, message: "Failed to delete skill" });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setSelectedForDelete(null);
  };

  if (!user) {
    return (
      <Box className="skills-page">
        <Box className="skills-content">
          <Alert severity="warning">Please log in to view your Skills.</Alert>
        </Box>
      </Box>
    );
  }

  return (
    <>
      <Helmet>
        <title>Skills - Shannon AI</title>
        <meta
          name="description"
          content="Create and manage modular skills for Shannon 1.6 Pro"
        />
      </Helmet>

      <Box className="skills-page">
        <Box className="skills-header">
          <Box className="skills-title-section">
            <Typography variant="h4" className="skills-title">
              Skills
            </Typography>
            <Typography variant="body1" className="skills-subtitle">
              Create modular capabilities that Shannon can invoke in Pro mode
            </Typography>
          </Box>
          <Box className="header-buttons">
            <Button
              variant="outlined"
              startIcon={<ExploreIcon />}
              onClick={() => navigate("/skills/discover")}
              className="discover-button"
            >
              Discover Skills
            </Button>
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={handleCreateNew}
              className="create-button"
            >
              Create Skill
            </Button>
          </Box>
        </Box>

        <Box className="skills-explanation">
          <Box className="explanation-content">
            <Typography variant="h6" className="explanation-title">
              What are Skills?
            </Typography>
            <Typography variant="body2" className="explanation-text">
              Skills are reusable instruction modules that extend Shannon's capabilities.
              Each Skill contains a specialized prompt that Shannon can invoke when relevant to your conversation.
              <strong> Skills only work with Shannon 1.6 Pro.</strong>
            </Typography>
            <Box className="explanation-features">
              <Box className="feature-item">
                <Box className="feature-icon active-feature">
                  <SkillIcon fontSize="small" />
                </Box>
                <Box className="feature-text">
                  <Typography variant="subtitle2">Active Skills</Typography>
                  <Typography variant="caption">
                    Toggle skills on/off to control which capabilities Shannon can use during your chats.
                  </Typography>
                </Box>
              </Box>
              <Box className="feature-item">
                <Box className="feature-icon public-feature">
                  <PublicIcon fontSize="small" />
                </Box>
                <Box className="feature-text">
                  <Typography variant="subtitle2">Share Publicly</Typography>
                  <Typography variant="caption">
                    Make your skills public to share with the community, or keep them private for personal use.
                  </Typography>
                </Box>
              </Box>
              <Box className="feature-item">
                <Box className="feature-icon usage-feature">
                  <UsageIcon fontSize="small" />
                </Box>
                <Box className="feature-text">
                  <Typography variant="subtitle2">Track Usage</Typography>
                  <Typography variant="caption">
                    Monitor how often each skill is invoked to understand which capabilities are most valuable.
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Box>
        </Box>

        <Box className="skills-content">
          {isLoading && skills.length === 0 ? (
            <Box className="loading-container">
              <CircularProgress />
              <Typography>Loading your skills...</Typography>
            </Box>
          ) : error ? (
            <Alert severity="error" className="error-alert">
              {error}
            </Alert>
          ) : skills.length === 0 ? (
            <Box className="empty-state">
              <SkillIcon className="empty-icon" />
              <Typography variant="h6">No Skills yet</Typography>
              <Typography variant="body2" color="textSecondary">
                Create your first Skill to unlock modular capabilities
              </Typography>
              <Button
                variant="outlined"
                color="primary"
                startIcon={<AddIcon />}
                onClick={handleCreateNew}
                sx={{ mt: 2 }}
              >
                Create Your First Skill
              </Button>
            </Box>
          ) : (
            <Grid container spacing={3}>
              {skills.map((skill) => (
                <Grid item xs={12} sm={6} md={4} key={skill.id}>
                  <Card
                    className="skills-card"
                    sx={{ display: "flex", flexDirection: "column", height: "100%" }}
                  >
                    <CardContent sx={{ flexGrow: 1 }}>
                      <Box className="card-header">
                        <Box className="card-icon">
                          <SkillIcon />
                        </Box>
                        <Box className="card-title-section">
                          <Typography variant="h6" className="card-title">
                            {skill.name}
                          </Typography>
                          <Box className="card-chips">
                            {skill.is_public && (
                              <Chip
                                icon={<PublicIcon />}
                                label="Public"
                                size="small"
                                color="success"
                                className="public-chip"
                              />
                            )}
                            {skill.is_active && (
                              <Chip
                                label="Active"
                                size="small"
                                color="primary"
                                className="active-chip"
                              />
                            )}
                            <Chip
                              icon={<UsageIcon />}
                              label={`${skill.usage_count || 0} uses`}
                              size="small"
                              variant="outlined"
                              className="usage-chip"
                            />
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
                    </CardContent>
                    <CardActions className="card-actions">
                      <FormControlLabel
                        className="skill-toggle"
                        control={
                          <Switch
                            checked={Boolean(skill.is_active)}
                            onChange={() => handleToggleActive(skill)}
                            disabled={togglingActiveId === skill.id}
                            color="primary"
                          />
                        }
                        label={skill.is_active ? "Active" : "Inactive"}
                      />
                      <Box className="card-action-buttons">
                        <Tooltip
                          title={skill.is_public ? "Make Private" : "Make Public"}
                        >
                          <IconButton
                            size="small"
                            onClick={() => handleTogglePublic(skill)}
                            disabled={togglingPublicId === skill.id}
                            color={skill.is_public ? "success" : "default"}
                            aria-label={skill.is_public ? "Make skill private" : "Make skill public"}
                          >
                            {togglingPublicId === skill.id ? (
                              <CircularProgress size={18} />
                            ) : skill.is_public ? (
                              <PublicIcon fontSize="small" />
                            ) : (
                              <PrivateIcon fontSize="small" />
                            )}
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Edit">
                          <IconButton size="small" onClick={() => handleEdit(skill)} aria-label="Edit skill">
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton
                            size="small"
                            onClick={() => handleDeleteClick(skill)}
                            color="error"
                            aria-label="Delete skill"
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </CardActions>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </Box>
      </Box>

      <Dialog open={deleteDialogOpen} onClose={handleDeleteCancel}>
        <DialogTitle>Delete Skill</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete "{selectedForDelete?.name}"? This
            action cannot be undone.
          </Typography>
        </DialogContent>
        <MuiDialogActions>
          <Button onClick={handleDeleteCancel} disabled={isDeleting}>
            Cancel
          </Button>
          <Button
            onClick={handleDeleteConfirm}
            color="error"
            disabled={isDeleting}
            startIcon={isDeleting ? <CircularProgress size={16} /> : null}
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </Button>
        </MuiDialogActions>
      </Dialog>

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
