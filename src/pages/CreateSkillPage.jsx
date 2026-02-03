import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import {
  Box,
  Typography,
  Button,
  TextField,
  Card,
  CardContent,
  CircularProgress,
  Alert,
} from "@mui/material";
import {
  ArrowBack as BackIcon,
  Save as SaveIcon,
} from "@mui/icons-material";
import { useSkills } from "@/hooks/useSkills";
import { useAuth } from "@/hooks/useAuth";
import "./CreateSkillPage.css";

export default function CreateSkillPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = Boolean(id);
  const { user } = useAuth();
  const { fetchSkill, createSkill, updateSkill } = useSkills();

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    content: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;
    const loadSkill = async () => {
      if (!isEditing || !id) return;
      setIsLoading(true);
      setError("");
      try {
        const data = await fetchSkill(id);
        if (isMounted && data) {
          setFormData({
            name: data.name || "",
            description: data.description || "",
            content: data.content || "",
          });
        }
      } catch (err) {
        console.error("Failed to load skill:", err);
        if (isMounted) {
          setError("Failed to load skill details.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadSkill();
    return () => {
      isMounted = false;
    };
  }, [fetchSkill, id, isEditing]);

  const handleChange = (field) => (event) => {
    setFormData((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleCancel = () => {
    navigate("/skills");
  };

  const handleSave = async (event) => {
    event.preventDefault();
    const name = formData.name.trim();
    const content = formData.content.trim();

    if (!name || !content) {
      setError("Name and Skill content are required.");
      return;
    }

    setIsSaving(true);
    setError("");
    try {
      if (isEditing && id) {
        await updateSkill(id, {
          name,
          description: formData.description.trim(),
          content,
        });
      } else {
        await createSkill({
          name,
          description: formData.description.trim(),
          content,
        });
      }
      navigate("/skills");
    } catch (err) {
      console.error("Failed to save skill:", err);
      setError(err.message || "Failed to save skill.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!user) {
    return (
      <Box className="create-skill-page">
        <Alert severity="warning">Please log in to manage Skills.</Alert>
      </Box>
    );
  }

  return (
    <>
      <Helmet>
        <title>{isEditing ? "Edit Skill" : "Create Skill"} - Shannon AI</title>
        <meta
          name="description"
          content="Build reusable Skills for Shannon 1.6 Pro"
        />
      </Helmet>

      <Box className="create-skill-page">
        <Box className="page-header">
          <Button
            startIcon={<BackIcon />}
            className="back-button"
            onClick={handleCancel}
          >
            Back to Skills
          </Button>
          <Typography variant="h4" className="page-title">
            {isEditing ? "Edit Skill" : "Create Skill"}
          </Typography>
          <Typography variant="body1" className="page-subtitle">
            Define the instructions and content Shannon can invoke in Pro mode.
          </Typography>
        </Box>

        <Card className="form-card">
          <CardContent>
            {error && <Alert severity="error" className="form-error">{error}</Alert>}
            {isLoading ? (
              <Box className="loading-container">
                <CircularProgress />
                <Typography>Loading skill...</Typography>
              </Box>
            ) : (
              <form onSubmit={handleSave}>
                <Box className="form-section">
                  <Typography variant="h6" className="section-title">
                    Skill Basics
                  </Typography>
                  <Typography variant="body2" className="section-description">
                    Give your Skill a clear name and a short description to help
                    the model decide when to use it.
                  </Typography>
                  <TextField
                    label="Skill Name"
                    value={formData.name}
                    onChange={handleChange("name")}
                    fullWidth
                    required
                    margin="normal"
                  />
                  <TextField
                    label="Description"
                    value={formData.description}
                    onChange={handleChange("description")}
                    fullWidth
                    margin="normal"
                    multiline
                    minRows={2}
                  />
                </Box>

                <Box className="form-section">
                  <Typography variant="h6" className="section-title">
                    Skill Content
                  </Typography>
                  <Typography variant="body2" className="section-description">
                    Provide the full instructions or reference content the model
                    should use after invoking this Skill.
                  </Typography>
                  <TextField
                    label="Skill Content"
                    value={formData.content}
                    onChange={handleChange("content")}
                    fullWidth
                    required
                    multiline
                    minRows={8}
                    margin="normal"
                  />
                </Box>

                <Box className="form-actions">
                  <Button variant="outlined" onClick={handleCancel}>
                    Cancel
                  </Button>
                  <Button
                    variant="contained"
                    color="primary"
                    type="submit"
                    startIcon={isSaving ? <CircularProgress size={16} /> : <SaveIcon />}
                    disabled={isSaving}
                  >
                    {isSaving ? "Saving..." : "Save Skill"}
                  </Button>
                </Box>
              </form>
            )}
          </CardContent>
        </Card>
      </Box>
    </>
  );
}
