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
  CardActionArea,
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
} from "@mui/material";
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Chat as ChatIcon,
  Folder as FolderIcon,
  InsertDriveFile as FileIcon,
  FolderOpen as FolderOpenIcon,
} from "@mui/icons-material";
import { useProject } from "@/hooks/useProject";
import { useAuth } from "@/hooks/useAuth";
import "./ProjectsPage.css";

export default function ProjectsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    projects,
    isLoading,
    error,
    deleteProject,
    selectProject,
  } = useProject();

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedForDelete, setSelectedForDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: "" });

  const handleCreateNew = () => {
    navigate("/projects/create");
  };

  const handleOpenProject = async (project) => {
    try {
      await selectProject(project.id);
      navigate(`/projects/${project.id}`);
    } catch (err) {
      console.error("Error opening project:", err);
    }
  };

  const handleStartChat = async (project, event) => {
    if (event) event.stopPropagation();
    try {
      await selectProject(project.id);
      navigate("/chat");
    } catch (err) {
      console.error("Error starting chat with project:", err);
      setSnackbar({ open: true, message: "Failed to start chat" });
    }
  };

  const handleDeleteClick = (project, event) => {
    event.stopPropagation();
    setSelectedForDelete(project);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedForDelete) return;

    setIsDeleting(true);
    try {
      await deleteProject(selectedForDelete.id);
      setDeleteDialogOpen(false);
      setSelectedForDelete(null);
      setSnackbar({ open: true, message: "Project deleted" });
    } catch (err) {
      console.error("Error deleting project:", err);
      setSnackbar({ open: true, message: "Failed to delete project" });
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
      <Box className="projects-page">
        <Box className="projects-content">
          <Alert severity="warning">
            Please log in to view your Projects.
          </Alert>
        </Box>
      </Box>
    );
  }

  return (
    <>
      <Helmet>
        <title>Projects - Shannon AI</title>
        <meta
          name="description"
          content="Create and manage your project workspaces with files"
        />
      </Helmet>

      <Box className="projects-page">
        <Box className="projects-header">
          <Box className="projects-title-section">
            <Typography variant="h4" className="projects-title">
              <FolderOpenIcon className="title-icon" /> Projects
            </Typography>
            <Typography variant="body1" className="projects-subtitle">
              Organize your files and chats into dedicated workspaces
            </Typography>
          </Box>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={handleCreateNew}
            className="create-button"
          >
            New Project
          </Button>
        </Box>

        <Box className="projects-content">
          {isLoading && projects.length === 0 ? (
            <Box className="loading-container">
              <CircularProgress />
              <Typography>Loading your Projects...</Typography>
            </Box>
          ) : error ? (
            <Alert severity="error" className="error-alert">
              {error}
            </Alert>
          ) : projects.length === 0 ? (
            <Box className="empty-state">
              <FolderIcon className="empty-icon" />
              <Typography variant="h6">No Projects yet</Typography>
              <Typography variant="body2" color="textSecondary">
                Create your first project to organize files and chats together
              </Typography>
              <Button
                variant="outlined"
                color="primary"
                startIcon={<AddIcon />}
                onClick={handleCreateNew}
                sx={{ mt: 2 }}
              >
                Create Your First Project
              </Button>
            </Box>
          ) : (
            <Grid container spacing={3}>
              {projects.map((project) => (
                <Grid item xs={12} sm={6} md={4} key={project.id}>
                  <Card className="project-card" sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
                    <CardActionArea
                      onClick={() => handleOpenProject(project)}
                      sx={{ flexGrow: 1, display: "flex", flexDirection: "column", alignItems: "stretch" }}
                    >
                      <CardContent sx={{ flexGrow: 1 }}>
                        <Box className="card-header">
                          <Box className="card-icon">
                            {project.icon ? (
                              <span className="project-emoji">{project.icon}</span>
                            ) : (
                              <FolderIcon />
                            )}
                          </Box>
                          <Box className="card-title-section">
                            <Typography variant="h6" className="card-title">
                              {project.name}
                            </Typography>
                            <Box className="card-chips">
                              <Chip
                                icon={<FileIcon />}
                                label={`${project.fileCount || 0} files`}
                                size="small"
                                variant="outlined"
                                className="file-count-chip"
                              />
                            </Box>
                          </Box>
                        </Box>
                        {project.description && (
                          <Typography
                            variant="body2"
                            color="textSecondary"
                            className="card-description"
                          >
                            {project.description}
                          </Typography>
                        )}
                        <Typography variant="caption" className="card-date">
                          Updated {new Date(project.updatedAt).toLocaleDateString()}
                        </Typography>
                      </CardContent>
                    </CardActionArea>
                    <CardActions className="card-actions">
                      <Button
                        size="small"
                        color="primary"
                        variant="contained"
                        startIcon={<FolderOpenIcon />}
                        onClick={() => handleOpenProject(project)}
                      >
                        Open
                      </Button>
                      <Button
                        size="small"
                        color="primary"
                        variant="outlined"
                        startIcon={<ChatIcon />}
                        onClick={(e) => handleStartChat(project, e)}
                      >
                        Chat
                      </Button>
                      <Box className="card-action-buttons">
                        <Tooltip title="Delete">
                          <IconButton
                            size="small"
                            onClick={(e) => handleDeleteClick(project, e)}
                            color="error"
                            aria-label={`Delete ${project.name}`}
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

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={handleDeleteCancel}>
        <DialogTitle>Delete Project</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete "{selectedForDelete?.name}"?
            This will also delete all files in the project. This action cannot be undone.
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

      {/* Feedback Snackbar */}
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
