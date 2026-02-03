import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import {
  Box,
  Typography,
  Button,
  TextField,
  Paper,
  CircularProgress,
  Alert,
  IconButton,
} from "@mui/material";
import {
  ArrowBack as BackIcon,
  FolderOpen as FolderIcon,
} from "@mui/icons-material";
import { useProject } from "@/hooks/useProject";
import { useAuth } from "@/hooks/useAuth";
import "./CreateProjectPage.css";

const EMOJI_OPTIONS = ["", "folder_open", "work", "code", "science", "book", "analytics"];

export default function CreateProjectPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { createProject, isLoading } = useProject();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [instructions, setInstructions] = useState("");
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Please enter a project name");
      return;
    }

    try {
      const result = await createProject({
        name: name.trim(),
        description: description.trim(),
        instructions: instructions.trim(),
      });

      // Navigate to the new project
      navigate(`/projects/${result.id}`);
    } catch (err) {
      setError(err.message || "Failed to create project");
    }
  };

  const handleBack = () => {
    navigate("/projects");
  };

  if (!user) {
    return (
      <Box className="create-project-page">
        <Alert severity="warning">
          Please log in to create a project.
        </Alert>
      </Box>
    );
  }

  return (
    <>
      <Helmet>
        <title>Create Project - Shannon AI</title>
        <meta
          name="description"
          content="Create a new project workspace"
        />
      </Helmet>

      <Box className="create-project-page">
        <Box className="create-project-header">
          <IconButton onClick={handleBack} className="back-button" aria-label="Back to projects">
            <BackIcon />
          </IconButton>
          <Typography variant="h5" className="create-project-title">
            <FolderIcon className="title-icon" /> Create New Project
          </Typography>
        </Box>

        <Paper className="create-project-form-container">
          <form onSubmit={handleSubmit}>
            {error && (
              <Alert severity="error" className="form-error" onClose={() => setError(null)}>
                {error}
              </Alert>
            )}

            <Box className="form-field">
              <Typography variant="subtitle2" className="field-label">
                Project Name *
              </Typography>
              <TextField
                fullWidth
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Marketing Analysis, Codebase Review"
                variant="outlined"
                size="small"
                className="text-input"
                disabled={isLoading}
                inputProps={{ 'aria-label': 'Project name' }}
              />
            </Box>

            <Box className="form-field">
              <Typography variant="subtitle2" className="field-label">
                Description
              </Typography>
              <TextField
                fullWidth
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of what this project is about"
                variant="outlined"
                size="small"
                multiline
                rows={2}
                className="text-input"
                disabled={isLoading}
                inputProps={{ 'aria-label': 'Project description' }}
              />
            </Box>

            <Box className="form-field">
              <Typography variant="subtitle2" className="field-label">
                Custom Instructions
              </Typography>
              <Typography variant="caption" className="field-hint">
                Optional instructions for how the AI should behave when chatting about this project
              </Typography>
              <TextField
                fullWidth
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="e.g., You are a helpful assistant analyzing sales data. Focus on trends and actionable insights."
                variant="outlined"
                size="small"
                multiline
                rows={4}
                className="text-input"
                disabled={isLoading}
                inputProps={{ 'aria-label': 'Project instructions' }}
              />
            </Box>

            <Box className="form-actions">
              <Button
                variant="outlined"
                onClick={handleBack}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                disabled={isLoading || !name.trim()}
                className="submit-button"
              >
                {isLoading ? (
                  <>
                    <CircularProgress size={16} color="inherit" sx={{ mr: 1 }} />
                    Creating...
                  </>
                ) : (
                  "Create Project"
                )}
              </Button>
            </Box>
          </form>
        </Paper>

        <Box className="info-section">
          <Typography variant="body2" color="textSecondary">
            After creating your project, you can upload files and start chatting.
            The AI will have access to all files in the project when answering your questions.
          </Typography>
        </Box>
      </Box>
    </>
  );
}
