import React, { useEffect, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import {
  Box,
  Typography,
  Button,
  Paper,
  IconButton,
  CircularProgress,
  Alert,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  Chip,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions as MuiDialogActions,
  InputAdornment,
  Collapse,
  Snackbar,
  Tooltip,
} from "@mui/material";
import {
  ArrowBack as BackIcon,
  Folder as FolderIcon,
  InsertDriveFile as FileIcon,
  CloudUpload as UploadIcon,
  Delete as DeleteIcon,
  Download as DownloadIcon,
  Chat as ChatIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Description as DocIcon,
  Code as CodeIcon,
  Image as ImageIcon,
  PictureAsPdf as PdfIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
} from "@mui/icons-material";
import { useProject } from "@/hooks/useProject";
import { useAuth } from "@/hooks/useAuth";
import "./ProjectDetailPage.css";

const getFileIcon = (contentType) => {
  if (contentType?.startsWith("image/")) return <ImageIcon />;
  if (contentType === "application/pdf") return <PdfIcon />;
  if (contentType?.includes("javascript") || contentType?.includes("python") || contentType?.includes("typescript")) return <CodeIcon />;
  if (contentType?.startsWith("text/")) return <DocIcon />;
  return <FileIcon />;
};

const formatFileSize = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export default function ProjectDetailPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    fetchProject,
    updateProject,
    uploadFile,
    deleteFile,
    getFileDownloadUrl,
    selectProject,
    searchProjectFiles,
  } = useProject();

  const [project, setProject] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [editingInstructions, setEditingInstructions] = useState(false);
  const [instructionsValue, setInstructionsValue] = useState("");
  const [deleteFileDialog, setDeleteFileDialog] = useState(null);
  const [isDeletingFile, setIsDeletingFile] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: "" });
  const fileInputRef = useRef(null);

  useEffect(() => {
    const loadProject = async () => {
      if (!user || !projectId) return;

      setIsLoading(true);
      setError(null);

      try {
        const data = await fetchProject(projectId);
        setProject(data);
        setInstructionsValue(data?.instructions || "");
      } catch (err) {
        setError(err.message || "Failed to load project");
      } finally {
        setIsLoading(false);
      }
    };

    loadProject();
  }, [user, projectId, fetchProject]);

  const handleBack = () => {
    navigate("/projects");
  };

  const handleStartChat = async () => {
    try {
      await selectProject(projectId);
      navigate("/chat");
    } catch (err) {
      console.error("Error starting chat:", err);
    }
  };

  const handleFileSelect = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setUploadError(null);

    try {
      let uploadedCount = 0;
      for (const file of files) {
        await uploadFile(projectId, file);
        uploadedCount++;
      }
      // Refresh project data
      const updated = await fetchProject(projectId);
      setProject(updated);
      setSnackbar({
        open: true,
        message: uploadedCount === 1 ? "File uploaded successfully" : `${uploadedCount} files uploaded`,
      });
    } catch (err) {
      setUploadError(err.message || "Failed to upload file");
    } finally {
      setIsUploading(false);
      // Clear the input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleDownloadFile = async (fileId, fileName) => {
    try {
      const data = await getFileDownloadUrl(projectId, fileId);
      if (data?.url) {
        const link = document.createElement("a");
        link.href = data.url;
        link.download = fileName;
        link.target = "_blank";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (err) {
      console.error("Error downloading file:", err);
    }
  };

  const handleDeleteFileConfirm = async () => {
    if (!deleteFileDialog) return;

    setIsDeletingFile(true);
    try {
      await deleteFile(projectId, deleteFileDialog.id);
      // Refresh project data
      const updated = await fetchProject(projectId);
      setProject(updated);
      setDeleteFileDialog(null);
      setSnackbar({ open: true, message: "File deleted" });
    } catch (err) {
      console.error("Error deleting file:", err);
      setSnackbar({ open: true, message: "Failed to delete file" });
    } finally {
      setIsDeletingFile(false);
    }
  };

  const handleSaveInstructions = async () => {
    try {
      await updateProject(projectId, { instructions: instructionsValue });
      setProject((prev) => ({ ...prev, instructions: instructionsValue }));
      setEditingInstructions(false);
      setSnackbar({ open: true, message: "Instructions saved" });
    } catch (err) {
      console.error("Error saving instructions:", err);
      setSnackbar({ open: true, message: "Failed to save instructions" });
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const results = await searchProjectFiles(projectId, searchQuery.trim());
      setSearchResults(results);
    } catch (err) {
      console.error("Error searching files:", err);
      setSnackbar({ open: true, message: "Search failed" });
    } finally {
      setIsSearching(false);
    }
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    setSearchResults(null);
  };

  const getSearchSnippet = (result) => {
    if (!result) return null;
    const rawSnippet =
      result.snippet ||
      result.excerpt ||
      result.matches?.[0]?.snippet ||
      result.matches?.[0]?.excerpt;
    if (!rawSnippet) return null;
    const normalized = String(rawSnippet).replace(/\s+/g, " ").trim();
    if (!normalized) return null;
    const lineNumber = result.matches?.[0]?.lineNumber;
    return lineNumber ? `Line ${lineNumber}: ${normalized}` : normalized;
  };

  if (!user) {
    return (
      <Box className="project-detail-page">
        <Alert severity="warning">Please log in to view this project.</Alert>
      </Box>
    );
  }

  if (isLoading) {
    return (
      <Box className="project-detail-page">
        <Box className="loading-container">
          <CircularProgress />
          <Typography>Loading project...</Typography>
        </Box>
      </Box>
    );
  }

  if (error || !project) {
    return (
      <Box className="project-detail-page">
        <Alert severity="error">{error || "Project not found"}</Alert>
        <Button onClick={handleBack} sx={{ mt: 2 }}>
          Back to Projects
        </Button>
      </Box>
    );
  }

  return (
    <>
      <Helmet>
        <title>{project.name} - Shannon AI</title>
      </Helmet>

      <Box className="project-detail-page">
        <Box className="detail-header">
          <IconButton onClick={handleBack} className="back-button" aria-label="Back to projects">
            <BackIcon />
          </IconButton>
          <Box className="header-content">
            <Typography variant="h5" className="project-name">
              <FolderIcon className="title-icon" /> {project.name}
            </Typography>
            {project.description && (
              <Typography variant="body2" className="project-description">
                {project.description}
              </Typography>
            )}
          </Box>
          <Button
            variant="contained"
            color="primary"
            startIcon={<ChatIcon />}
            onClick={handleStartChat}
            className="chat-button"
          >
            Chat with Project
          </Button>
        </Box>

        {/* Instructions Section */}
        <Paper className="section-card">
          <Box className="section-header">
            <Typography variant="h6">Custom Instructions</Typography>
            {!editingInstructions ? (
              <IconButton
                size="small"
                onClick={() => setEditingInstructions(true)}
                aria-label="Edit instructions"
              >
                <EditIcon fontSize="small" />
              </IconButton>
            ) : (
              <Box className="edit-actions">
                <IconButton
                  size="small"
                  onClick={handleSaveInstructions}
                  aria-label="Save instructions"
                >
                  <SaveIcon fontSize="small" />
                </IconButton>
                <IconButton
                  size="small"
                  onClick={() => {
                    setEditingInstructions(false);
                    setInstructionsValue(project.instructions || "");
                  }}
                  aria-label="Cancel editing instructions"
                >
                  <CancelIcon fontSize="small" />
                </IconButton>
              </Box>
            )}
          </Box>
          {editingInstructions ? (
            <TextField
              fullWidth
              multiline
              rows={4}
              value={instructionsValue}
              onChange={(e) => setInstructionsValue(e.target.value)}
              placeholder="Add custom instructions for how the AI should behave..."
              className="instructions-input"
              inputProps={{ 'aria-label': 'Custom instructions' }}
            />
          ) : (
            <Typography
              variant="body2"
              className={`instructions-text ${!project.instructions ? "empty" : ""}`}
            >
              {project.instructions || "No custom instructions set"}
            </Typography>
          )}
        </Paper>

        {/* Files Section */}
        <Paper className="section-card">
          <Box className="section-header">
            <Typography variant="h6">
              Files ({project.files?.length || 0})
            </Typography>
            <Button
              variant="outlined"
              size="small"
              startIcon={isUploading ? <CircularProgress size={16} /> : <UploadIcon />}
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              {isUploading ? "Uploading..." : "Upload Files"}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileSelect}
              style={{ display: "none" }}
            />
          </Box>

          {uploadError && (
            <Alert severity="error" onClose={() => setUploadError(null)} sx={{ mb: 2 }}>
              {uploadError}
            </Alert>
          )}

          {/* Search bar for files */}
          {project.files && project.files.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <form onSubmit={handleSearch}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Search within files..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  inputProps={{ 'aria-label': 'Search files' }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon color="action" />
                      </InputAdornment>
                    ),
                    endAdornment: searchQuery && (
                      <InputAdornment position="end">
                        <IconButton size="small" onClick={handleClearSearch} aria-label="Clear search">
                          <ClearIcon fontSize="small" />
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              </form>

              {/* Search results */}
              <Collapse in={!!searchResults}>
                <Paper variant="outlined" sx={{ mt: 2, p: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Search Results {isSearching && <CircularProgress size={14} sx={{ ml: 1 }} />}
                  </Typography>
                  {searchResults?.results?.length > 0 ? (
                    <List dense>
                      {searchResults.results.map((result, index) => {
                        const snippet = getSearchSnippet(result);
                        return (
                          <ListItem key={index} sx={{ py: 0.5 }}>
                            <ListItemIcon sx={{ minWidth: 32 }}>
                              <DocIcon fontSize="small" />
                            </ListItemIcon>
                            <ListItemText
                              primary={result.fileName || result.file_name}
                              secondary={snippet ? `...${snippet}...` : null}
                              secondaryTypographyProps={{ variant: "caption" }}
                            />
                          </ListItem>
                        );
                      })}
                    </List>
                  ) : searchResults && !isSearching ? (
                    <Typography variant="body2" color="textSecondary">
                      No matches found for "{searchQuery}"
                    </Typography>
                  ) : null}
                </Paper>
              </Collapse>
            </Box>
          )}

          {!project.files || project.files.length === 0 ? (
            <Box className="empty-files">
              <FileIcon className="empty-icon" />
              <Typography>No files uploaded yet</Typography>
              <Typography variant="caption" color="textSecondary">
                Upload files to enable AI to reference them in chats
              </Typography>
            </Box>
          ) : (
            <List className="files-list">
              {project.files.map((file) => (
                <ListItem key={file.id} className="file-item">
                  <ListItemIcon className="file-icon">
                    {getFileIcon(file.contentType)}
                  </ListItemIcon>
                  <ListItemText
                    primary={file.fileName}
                    secondary={
                      <Box className="file-meta">
                        <span>{formatFileSize(file.size)}</span>
                        {file.hasTextContent && (
                          <Chip label="Searchable" size="small" className="searchable-chip" />
                        )}
                      </Box>
                    }
                  />
                  <ListItemSecondaryAction>
                    <Tooltip title="Download">
                      <IconButton
                        size="small"
                        onClick={() => handleDownloadFile(file.id, file.fileName)}
                        aria-label={`Download ${file.fileName}`}
                      >
                        <DownloadIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton
                        size="small"
                        onClick={() => setDeleteFileDialog(file)}
                        color="error"
                        aria-label={`Delete ${file.fileName}`}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          )}
        </Paper>
      </Box>

      {/* Delete File Dialog */}
      <Dialog open={!!deleteFileDialog} onClose={() => setDeleteFileDialog(null)}>
        <DialogTitle>Delete File</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete "{deleteFileDialog?.fileName}"?
          </Typography>
        </DialogContent>
        <MuiDialogActions>
          <Button onClick={() => setDeleteFileDialog(null)} disabled={isDeletingFile}>
            Cancel
          </Button>
          <Button
            onClick={handleDeleteFileConfirm}
            color="error"
            disabled={isDeletingFile}
            startIcon={isDeletingFile ? <CircularProgress size={16} /> : null}
          >
            {isDeletingFile ? "Deleting..." : "Delete"}
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
