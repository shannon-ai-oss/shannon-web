import React, { useEffect, useState, startTransition, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
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
  Avatar,
  Tooltip,
  Snackbar,
  Tabs,
  Tab,
} from "@mui/material";
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Chat as ChatIcon,
  Description as DescriptionIcon,
  SmartToy as BotIcon,
  Public as PublicIcon,
  PublicOff as PrivateIcon,
  TrendingUp as UsageIcon,
  Person as PersonIcon,
  Explore as ExploreIcon,
} from "@mui/icons-material";
import { useCustomShan } from "@/hooks/useCustomShan";
import { useAuth } from "@/hooks/useAuth";
import "./CustomShanPage.css";

export default function CustomShanPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const {
    customShans,
    publicCustomShans,
    fetchPublicCustomShans,
    isLoading,
    error,
    deleteCustomShan,
    selectCustomShan,
    togglePublic,
  } = useCustomShan();

  // Determine initial tab based on route
  const isDiscoverRoute = location.pathname === "/custom-shan/discover";
  const [tabValue, setTabValue] = useState(isDiscoverRoute ? 1 : 0);
  const [discoverSubTab, setDiscoverSubTab] = useState(0);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedForDelete, setSelectedForDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [togglingPublicId, setTogglingPublicId] = useState(null);
  const [loadingChatId, setLoadingChatId] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: "" });

  useEffect(() => {
    if (user && tabValue === 1) {
      fetchPublicCustomShans();
    }
  }, [user, tabValue, fetchPublicCustomShans]);

  // Update URL when tab changes
  useEffect(() => {
    const newPath = tabValue === 1 ? "/custom-shan/discover" : "/custom-shan";
    if (location.pathname !== newPath) {
      navigate(newPath, { replace: true });
    }
  }, [tabValue, navigate, location.pathname]);

  const handleTabChange = useCallback((event, newValue) => {
    startTransition(() => {
      setTabValue(newValue);
    });
  }, []);

  const handleDiscoverSubTabChange = useCallback((event, newValue) => {
    startTransition(() => {
      setDiscoverSubTab(newValue);
    });
  }, []);

  const handleCreateNew = () => {
    navigate("/custom-shan/create");
  };

  const handleStartChat = async (customShan) => {
    setLoadingChatId(customShan.id);
    try {
      await selectCustomShan(customShan.id);
      navigate("/chat");
    } catch (err) {
      console.error("Error starting chat with custom shan:", err);
    } finally {
      setLoadingChatId(null);
    }
  };

  const handleEdit = (customShan, event) => {
    event.stopPropagation();
    navigate(`/custom-shan/${customShan.id}/edit`);
  };

  const handleTogglePublic = async (customShan, event) => {
    event.stopPropagation();
    setTogglingPublicId(customShan.id);
    try {
      await togglePublic(customShan.id);
      setSnackbar({
        open: true,
        message: customShan.is_public ? "Custom Shan is now private" : "Custom Shan is now public",
      });
    } catch (err) {
      console.error("Error toggling public status:", err);
      setSnackbar({ open: true, message: "Failed to update visibility" });
    } finally {
      setTogglingPublicId(null);
    }
  };

  const handleDeleteClick = (customShan, event) => {
    event.stopPropagation();
    setSelectedForDelete(customShan);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedForDelete) return;

    setIsDeleting(true);
    try {
      await deleteCustomShan(selectedForDelete.id);
      setDeleteDialogOpen(false);
      setSelectedForDelete(null);
      setSnackbar({ open: true, message: "Custom Shan deleted" });
    } catch (err) {
      console.error("Error deleting custom shan:", err);
      setSnackbar({ open: true, message: "Failed to delete Custom Shan" });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setSelectedForDelete(null);
  };

  // Filter discover shans based on sub-tab
  const filteredDiscoverShans = publicCustomShans.filter((shan) => {
    if (discoverSubTab === 0) return true; // All
    if (discoverSubTab === 1) return !shan.is_owner; // Discover (not mine)
    if (discoverSubTab === 2) return shan.is_owner; // My Public
    return true;
  });

  // Sort by usage count
  const sortedDiscoverShans = [...filteredDiscoverShans].sort(
    (a, b) => (b.usage_count || 0) - (a.usage_count || 0)
  );

  if (!user) {
    return (
      <Box className="custom-shan-page">
        <Box className="custom-shan-content">
          <Alert severity="warning">
            Please log in to view Custom Shans.
          </Alert>
        </Box>
      </Box>
    );
  }

  const renderMyCustomShans = () => (
    <>
      {isLoading && customShans.length === 0 ? (
        <Box className="loading-container">
          <CircularProgress />
          <Typography>Loading your Custom Shans...</Typography>
        </Box>
      ) : error ? (
        <Alert severity="error" className="error-alert">
          {error}
        </Alert>
      ) : customShans.length === 0 ? (
        <Box className="empty-state">
          <BotIcon className="empty-icon" />
          <Typography variant="h6">No Custom Shans yet</Typography>
          <Typography variant="body2" color="textSecondary">
            Create your first personalized AI assistant to get started
          </Typography>
          <Button
            variant="outlined"
            color="primary"
            startIcon={<AddIcon />}
            onClick={handleCreateNew}
            sx={{ mt: 2 }}
          >
            Create Your First Custom Shan
          </Button>
        </Box>
      ) : (
        <Grid container spacing={3}>
          {customShans.map((customShan) => (
            <Grid item xs={12} sm={6} md={4} key={customShan.id}>
              <Card className="custom-shan-card" sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
                <CardActionArea
                  onClick={() => handleStartChat(customShan)}
                  sx={{ flexGrow: 1, display: "flex", flexDirection: "column", alignItems: "stretch" }}
                >
                  <CardContent sx={{ flexGrow: 1 }}>
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
                          {customShan.is_public && (
                            <Chip
                              icon={<PublicIcon />}
                              label="Public"
                              size="small"
                              color="success"
                              className="public-chip"
                            />
                          )}
                          {customShan.has_knowledge_file && (
                            <Chip
                              icon={<DescriptionIcon />}
                              label="Knowledge"
                              size="small"
                              variant="outlined"
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
                    <Box className="card-click-hint">
                      <ChatIcon fontSize="small" />
                      <Typography variant="caption">Click to start chatting</Typography>
                    </Box>
                  </CardContent>
                </CardActionArea>
                <CardActions className="card-actions">
                  <Button
                    size="medium"
                    color="primary"
                    variant="contained"
                    startIcon={
                      loadingChatId === customShan.id ? (
                        <CircularProgress size={16} color="inherit" />
                      ) : (
                        <ChatIcon />
                      )
                    }
                    onClick={() => handleStartChat(customShan)}
                    className="start-chat-button"
                    disabled={loadingChatId === customShan.id}
                    fullWidth
                  >
                    {loadingChatId === customShan.id ? "Starting..." : "Start Chat"}
                  </Button>
                  <Box className="card-action-buttons">
                    <Tooltip title={customShan.is_public ? "Make Private" : "Make Public"}>
                      <IconButton
                        size="small"
                        onClick={(e) => handleTogglePublic(customShan, e)}
                        disabled={togglingPublicId === customShan.id}
                        color={customShan.is_public ? "success" : "default"}
                        aria-label={customShan.is_public ? "Make Custom Shan private" : "Make Custom Shan public"}
                      >
                        {togglingPublicId === customShan.id ? (
                          <CircularProgress size={18} />
                        ) : customShan.is_public ? (
                          <PublicIcon fontSize="small" />
                        ) : (
                          <PrivateIcon fontSize="small" />
                        )}
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Edit">
                      <IconButton
                        size="small"
                        onClick={(e) => handleEdit(customShan, e)}
                        aria-label="Edit Custom Shan"
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton
                        size="small"
                        onClick={(e) => handleDeleteClick(customShan, e)}
                        color="error"
                        aria-label="Delete Custom Shan"
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
    </>
  );

  const renderDiscoverShans = () => (
    <>
      <Box className="discover-sub-tabs">
        <Tabs
          value={discoverSubTab}
          onChange={handleDiscoverSubTabChange}
          textColor="inherit"
          indicatorColor="primary"
        >
          <Tab label="All" />
          <Tab label="Community" />
          <Tab label="My Public" />
        </Tabs>
      </Box>

      {isLoading && publicCustomShans.length === 0 ? (
        <Box className="loading-container">
          <CircularProgress />
          <Typography>Loading public Custom Shans...</Typography>
        </Box>
      ) : sortedDiscoverShans.length === 0 ? (
        <Box className="empty-state">
          <ExploreIcon className="empty-icon" />
          <Typography variant="h6">No public Custom Shans yet</Typography>
          <Typography variant="body2" color="textSecondary">
            {discoverSubTab === 2
              ? "Make your Custom Shans public to share them with the community"
              : "Be the first to share a Custom Shan with the community"}
          </Typography>
        </Box>
      ) : (
        <Grid container spacing={3}>
          {sortedDiscoverShans.map((customShan) => (
            <Grid item xs={12} sm={6} md={4} key={customShan.id}>
              <Card className="custom-shan-card discover-card">
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
                      loadingChatId === customShan.id ? (
                        <CircularProgress size={16} color="inherit" />
                      ) : (
                        <ChatIcon />
                      )
                    }
                    onClick={() => handleStartChat(customShan)}
                    disabled={loadingChatId === customShan.id}
                    fullWidth
                    className="start-chat-button"
                  >
                    {loadingChatId === customShan.id ? "Starting..." : "Start Chat"}
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </>
  );

  return (
    <>
      <Helmet>
        <title>Custom Shan - Shannon AI</title>
        <meta
          name="description"
          content="Create and manage your personalized AI assistants"
        />
      </Helmet>

      <Box className="custom-shan-page">
        <Box className="custom-shan-header">
          <Box className="custom-shan-title-section">
            <Typography variant="h4" className="custom-shan-title">
              Custom Shan
            </Typography>
            <Typography variant="body1" className="custom-shan-subtitle">
              Create personalized AI assistants with custom instructions and knowledge
            </Typography>
          </Box>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={handleCreateNew}
            className="create-button"
          >
            Create Custom Shan
          </Button>
        </Box>

        <Box className="custom-shan-tabs">
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            textColor="inherit"
            indicatorColor="primary"
          >
            <Tab label="My Custom Shans" />
            <Tab label="Discover" icon={<ExploreIcon />} iconPosition="start" />
          </Tabs>
        </Box>

        <Box className="custom-shan-content">
          {tabValue === 0 && renderMyCustomShans()}
          {tabValue === 1 && renderDiscoverShans()}
        </Box>
      </Box>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={handleDeleteCancel}>
        <DialogTitle>Delete Custom Shan</DialogTitle>
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
