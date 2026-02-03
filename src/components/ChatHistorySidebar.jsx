import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Button,
  TextField,
  useMediaQuery,
  Avatar,
  Menu,
  MenuItem,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import CheckIcon from '@mui/icons-material/Check';
import ClearIcon from '@mui/icons-material/Clear';
import Settings from '@mui/icons-material/Settings';
import Logout from '@mui/icons-material/Logout';
import AccountCircle from '@mui/icons-material/AccountCircle';
import MenuRoundedIcon from '@mui/icons-material/MenuRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import ExploreIcon from '@mui/icons-material/Explore';
import PsychologyOutlinedIcon from '@mui/icons-material/PsychologyOutlined';
import FolderIcon from '@mui/icons-material/Folder';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import ChevronLeftRoundedIcon from '@mui/icons-material/ChevronLeftRounded';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import './ChatHistorySidebar.css';
import { useChat } from '@/hooks/useChat';
import { useAuth } from '@/hooks/useAuth';
import { useCustomShan } from '@/hooks/useCustomShan';
import { useProject } from '@/hooks/useProject';
import shannonRankGif from '../assets/shannon-rank.gif';
import shannonRankWebp from '../assets/shannon-rank.webp';

const ChatHistorySidebar = ({ onCollapsedChange }) => {
  const isSmall = useMediaQuery('(max-width:1024px)');
  const [isOpen, setIsOpen] = useState(!isSmall);
  const [isCollapsed, setIsCollapsed] = useState(false); // Desktop collapsed state
  const [anchorEl, setAnchorEl] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [draftTitle, setDraftTitle] = useState('');
  const [expandedProjects, setExpandedProjects] = useState({});
  const location = useLocation();
  const navigate = useNavigate();
  const { user, token, logout } = useAuth();
  const {
    chats,
    activeChatId,
    setActiveChatId,
    beginNewChat,
    renameChat,
    deleteChat,
    getChatContextIds,
  } = useChat();
  const { customShans, selectCustomShan, activeCustomShan, clearActiveCustomShan } = useCustomShan();
  const { projects, selectProject, activeProject, clearActiveProject } = useProject();

  // Sidebar is shown on chat, custom-shan, and projects pages
  const isChatRoute = location.pathname === '/chat';
  const isCustomShanRoute = location.pathname.startsWith('/custom-shan');
  const isProjectRoute = location.pathname.startsWith('/projects');
  const isSidebarPage = isChatRoute || isCustomShanRoute || isProjectRoute;

  // Get first 3 custom shans for sidebar preview
  const previewCustomShans = customShans.slice(0, 3);
  // Get first 3 projects for sidebar preview
  const previewProjects = projects.slice(0, 3);
  const customShanById = useMemo(() => {
    return customShans.reduce((acc, customShan) => {
      if (customShan?.id) {
        acc[customShan.id] = customShan;
      }
      return acc;
    }, {});
  }, [customShans]);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
    handleCloseMenu();
    setIsOpen(false);
  };

  const handleOpenMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
  };

  const getUserInitials = () => {
    if (user?.displayName) {
      const names = user.displayName.split(' ');
      if (names.length >= 2) {
        return (names[0][0] + names[names.length - 1][0]).toUpperCase();
      }
      return user.displayName.substring(0, 2).toUpperCase();
    }
    if (user?.email) {
      return user.email.substring(0, 2).toUpperCase();
    }
    return 'U';
  };

  // Store callback in ref to avoid re-running effect when callback changes
  const onCollapsedChangeRef = useRef(onCollapsedChange);
  onCollapsedChangeRef.current = onCollapsedChange;

  useEffect(() => {
    // Only reset isOpen when screen size actually changes
    setIsOpen(!isSmall);
    // Reset collapsed state when switching to mobile
    if (isSmall) {
      setIsCollapsed(false);
      onCollapsedChangeRef.current?.(false);
    }
  }, [isSmall]); // ONLY depend on isSmall, not the callback

  // Notify parent when collapsed state changes
  useEffect(() => {
    onCollapsedChangeRef.current?.(isCollapsed);
  }, [isCollapsed]);

  const handleNewChat = () => {
    setIsOpen(false); // Close sidebar FIRST
    clearActiveCustomShan();
    clearActiveProject();
    beginNewChat();
    if (!isChatRoute) {
      navigate('/chat');
    }
  };

  const handleSelectProject = async (project) => {
    setIsOpen(false); // Close sidebar FIRST
    try {
      clearActiveCustomShan();
      await selectProject(project.id);
      beginNewChat();
      if (!isChatRoute) {
        navigate('/chat');
      }
    } catch (err) {
      console.error('Failed to select project:', err);
    }
  };

  const handleSelectCustomShan = async (customShan) => {
    setIsOpen(false); // Close sidebar FIRST
    try {
      clearActiveProject();
      await selectCustomShan(customShan.id);
      beginNewChat();
      if (!isChatRoute) {
        navigate('/chat');
      }
    } catch (err) {
      console.error('Failed to select custom shan:', err);
    }
  };

  const startEditing = (chatId, currentTitle) => {
    setEditingId(chatId);
    setDraftTitle(currentTitle || '');
  };

  const commitRename = (chatId) => {
    const trimmed = draftTitle.trim();
    if (!trimmed) {
      return;
    }
    try {
      renameChat(chatId, trimmed);
      setEditingId(null);
      setDraftTitle('');
    } catch (err) {
      console.error('Rename failed', err);
    }
  };

  const cancelRename = () => {
    setEditingId(null);
    setDraftTitle('');
  };

  const handleDelete = (chatId) => {
    try {
      deleteChat(chatId);
    } catch (err) {
      console.error('Delete failed', err);
    }
  };

  const handleSelectChat = async (chatId) => {
    // CLOSE SIDEBAR FIRST before any async operations
    setIsOpen(false);

    // Clear any existing context first to prevent bleed-over
    clearActiveCustomShan();
    clearActiveProject();

    // Set the active chat
    setActiveChatId(chatId);

    // Restore context from the chat's stored customShanId/projectId
    const contextIds = getChatContextIds(chatId);
    if (contextIds.customShanId) {
      try {
        await selectCustomShan(contextIds.customShanId);
      } catch (err) {
        console.error('Failed to restore custom shan context:', err);
      }
    } else if (contextIds.projectId) {
      try {
        await selectProject(contextIds.projectId);
      } catch (err) {
        console.error('Failed to restore project context:', err);
      }
    }

    if (!isChatRoute) {
      navigate('/chat');
    }
  };

  const handleActionKeyDown = (event, action) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      action();
    }
  };

  // Close sidebar handler - always close, CSS handles desktop visibility
  const closeSidebar = () => {
    setIsOpen(false);
  };

  return (
    <>
      {/* Mobile backdrop - closes sidebar when tapped */}
      <Box
        className={`sidebar-backdrop ${isOpen ? 'is-open' : ''}`}
        onClick={closeSidebar}
        aria-hidden={!isOpen}
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          bgcolor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 1099,
        }}
      />
      <Box
        className={`chat-history-sidebar ${isOpen ? 'is-open' : 'is-closed'} ${isSmall ? 'overlay' : ''} ${!isSmall && isCollapsed ? 'collapsed' : ''}`}
      >
        {/* MOBILE CLOSE BUTTON - positioned absolutely at top right */}
        <IconButton
          aria-label="Close sidebar"
          className="sidebar-close-btn-fixed"
          size="small"
          onClick={closeSidebar}
        >
          <CloseRoundedIcon fontSize="small" />
        </IconButton>
        <Box className="sidebar-navigation">
            <Box className="nav-brand-sidebar">
              {isSmall && (
                <IconButton
                  className="new-chat-mobile-button"
                  aria-label="Start a new chat"
                  size="small"
                  onClick={handleNewChat}
                >
                  <AddIcon fontSize="small" />
                </IconButton>
              )}
              <Box className="brand-identity-sidebar" sx={{ display: isCollapsed ? 'none' : 'flex' }}>
                <div className="brand-icon-sidebar">
                  <picture>
                    <source srcSet={shannonRankWebp} type="image/webp" />
                    <img
                      src={shannonRankGif}
                      alt="SHANNON A.I. Logo"
                      className="brand-logo-gif-sidebar"
                      width="48"
                      height="48"
                      decoding="async"
                      loading="eager"
                    />
                  </picture>
                </div>
                <Link to="/" className="nav-brand-sidebar-link" onClick={closeSidebar}>
                  <span className="brand-text-main-sidebar">SHANNON</span>
                  <span className="brand-text-sub-sidebar">A.I.</span>
                </Link>
              </Box>
              {/* Collapsed logo */}
              {isCollapsed && !isSmall && (
                <div className="brand-icon-sidebar collapsed-logo">
                  <picture>
                    <source srcSet={shannonRankWebp} type="image/webp" />
                    <img
                      src={shannonRankGif}
                      alt="SHANNON A.I. Logo"
                      className="brand-logo-gif-sidebar"
                      width="48"
                      height="48"
                      decoding="async"
                      loading="eager"
                    />
                  </picture>
                </div>
              )}
              <Box className="brand-actions-sidebar" sx={{ display: isCollapsed ? 'none' : 'flex' }}>
                <IconButton
                  component={Link}
                  to="/"
                  className="brand-action-button"
                  size="small"
                  aria-label="Home"
                  onClick={closeSidebar}
                >
                  <HomeOutlinedIcon fontSize="small" />
                </IconButton>
                <IconButton
                  component={Link}
                  to={token ? '/plan' : '/login'}
                  className="brand-action-button"
                  size="small"
                  aria-label={token ? 'Plan and usage' : 'Login'}
                  onClick={closeSidebar}
                >
                  <PersonOutlineIcon fontSize="small" />
                </IconButton>
                {token && (
                  <IconButton
                    className="user-menu-button-sidebar"
                    onClick={handleOpenMenu}
                    size="small"
                    aria-label="Open user menu"
                  >
                    <Avatar
                      className="user-avatar-sidebar"
                      sx={{ width: 28, height: 28 }}
                      src={user?.photoURL}
                      alt={user?.displayName || user?.email}
                    >
                      {!user?.photoURL && getUserInitials()}
                    </Avatar>
                  </IconButton>
                )}
                <Button
                  className="new-chat-button"
                  startIcon={<AddIcon />}
                  onClick={handleNewChat}
                >
                  New Chat
                </Button>
              </Box>
            </Box>

            <Box className="nav-collapse-section" sx={{ display: isCollapsed ? 'none' : 'flex' }}>
              {!token && (
                <Box className="nav-collapsible-content expanded nav-quick-actions">
                  <Box className="nav-actions-sidebar">
                    <Link to="/login" className="login-link-sidebar" onClick={closeSidebar}>
                      <Button
                        variant="outlined"
                        size="small"
                        className="login-button-sidebar"
                        startIcon={<AccountCircle />}
                      >
                        Login
                      </Button>
                    </Link>
                  </Box>
                </Box>
              )}
            </Box>
          </Box>

        {token && (
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleCloseMenu}
            className="user-menu-sidebar"
            PaperProps={{
              sx: {
                bgcolor: 'rgba(10, 10, 18, 0.95)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(255, 23, 68, 0.2)',
                boxShadow: '0 8px 32px rgba(255, 23, 68, 0.15)',
                mt: 1.5,
              }
            }}
          >
            <MenuItem onClick={() => { navigate('/plan'); handleCloseMenu(); setIsOpen(false); }} className="menu-item-sidebar">
              <Settings fontSize="small" sx={{ mr: 1 }} />
              Plan &amp; Usage
            </MenuItem>
            <MenuItem onClick={handleLogout} className="menu-item-sidebar logout-item-sidebar">
              <Logout fontSize="small" sx={{ mr: 1 }} />
              Logout
            </MenuItem>
          </Menu>
        )}

        {/* Custom Shans Section - ChatGPT style */}
        {/* Desktop collapse toggle - edge positioned */}
        {!isSmall && (
          <button
            type="button"
            className="sidebar-edge-toggle"
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            onClick={() => setIsCollapsed(!isCollapsed)}
          >
            {isCollapsed ? <ChevronRightRoundedIcon fontSize="small" /> : <ChevronLeftRoundedIcon fontSize="small" />}
          </button>
        )}

        {token && !isCollapsed && (
          <Box className="gpt-sidebar-content">
            {/* Skills */}
            <Box className="gpt-section">
              <Box
                component={Link}
                to="/skills"
                className="gpt-item gpt-explore"
                onClick={closeSidebar}
              >
                <ExploreIcon className="gpt-item-icon" />
                <span className="gpt-item-text">Skills</span>
              </Box>
            </Box>

            {/* Memory */}
            <Box className="gpt-section">
              <Box
                component={Link}
                to="/memory"
                className="gpt-item gpt-explore"
                onClick={closeSidebar}
              >
                <PsychologyOutlinedIcon className="gpt-item-icon" />
                <span className="gpt-item-text">Memory</span>
              </Box>
            </Box>

            {/* Custom Shans */}
            <Box className="gpt-section">
              <Typography className="gpt-section-label">Custom Shans</Typography>
              {previewCustomShans.map((customShan) => (
                <Box
                  key={customShan.id}
                  className={`gpt-item ${activeCustomShan?.id === customShan.id ? 'active' : ''}`}
                  onClick={() => handleSelectCustomShan(customShan)}
                >
                  {customShan.icon_url && (
                    <Avatar
                      src={customShan.icon_url}
                      alt={customShan.name}
                      className="gpt-item-avatar"
                      sx={{ width: 24, height: 24 }}
                    />
                  )}
                  <span className="gpt-item-text">{customShan.name}</span>
                </Box>
              ))}
              <Box
                component={Link}
                to="/custom-shan"
                className="gpt-item gpt-explore"
                onClick={closeSidebar}
              >
                <ExploreIcon className="gpt-item-icon" />
                <span className="gpt-item-text">Explore Shans</span>
              </Box>
            </Box>

            {/* Projects Section - with nested chats */}
            <Box className="gpt-section gpt-projects-section">
              <Typography className="gpt-section-label">Projects</Typography>
              <Box
                component={Link}
                to="/projects/create"
                className="gpt-item"
                onClick={closeSidebar}
              >
                <AddIcon className="gpt-item-icon" />
                <span className="gpt-item-text">New project</span>
              </Box>
              {previewProjects.map((project) => {
                const projectChats = chats.filter(chat => chat.projectId === project.id);
                const isExpanded = expandedProjects[project.id];
                return (
                  <Box key={project.id} className="gpt-project-group">
                    <Box className={`gpt-item gpt-folder-item ${activeProject?.id === project.id ? 'active' : ''}`}>
                      {projectChats.length > 0 && (
                        <button
                          type="button"
                          className="gpt-folder-toggle"
                          aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${project.name} chats`}
                          aria-expanded={Boolean(isExpanded)}
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedProjects(prev => ({ ...prev, [project.id]: !prev[project.id] }));
                          }}
                        >
                          {isExpanded ? <KeyboardArrowDownIcon fontSize="small" /> : <KeyboardArrowRightIcon fontSize="small" />}
                        </button>
                      )}
                      <Box
                        className="gpt-folder-main"
                        role="button"
                        tabIndex={0}
                        aria-current={activeProject?.id === project.id ? 'page' : undefined}
                        aria-label={`Open project ${project.name}`}
                        onClick={() => handleSelectProject(project)}
                        onKeyDown={(event) => handleActionKeyDown(event, () => handleSelectProject(project))}
                      >
                        <FolderIcon className="gpt-item-icon" />
                        <span className="gpt-item-text">{project.name}</span>
                        {projectChats.length > 0 && (
                          <span className="gpt-item-count">{projectChats.length}</span>
                        )}
                      </Box>
                    </Box>
                    {projectChats.length > 0 && isExpanded && (
                      <Box className="gpt-project-chats">
                        {projectChats.slice(0, 5).map((chat) => {
                          const isActive = chat.id === activeChatId;
                          const isEditing = editingId === chat.id;
                          return (
                            <Box
                              key={chat.id}
                              className={`gpt-chat-item nested ${isActive ? 'active' : ''}`}
                              role="button"
                              tabIndex={isEditing ? -1 : 0}
                              aria-current={isActive ? 'page' : undefined}
                              aria-label={`Open chat ${chat.title || 'New Chat'}`}
                              onClick={() => {
                                if (!isEditing) handleSelectChat(chat.id);
                              }}
                              onKeyDown={(event) => {
                                if (!isEditing) {
                                  handleActionKeyDown(event, () => handleSelectChat(chat.id));
                                }
                              }}
                            >
                              {isEditing ? (
                                <Box className="gpt-edit-row">
                                  <TextField
                                    size="small"
                                    value={draftTitle}
                                    onChange={(e) => setDraftTitle(e.target.value)}
                                    autoFocus
                                    className="gpt-rename-input"
                                    onClick={(e) => e.stopPropagation()}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') commitRename(chat.id);
                                      else if (e.key === 'Escape') cancelRename();
                                    }}
                                  />
                                  <IconButton
                                    size="small"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      commitRename(chat.id);
                                    }}
                                    className="gpt-action-btn"
                                    aria-label="Save chat title"
                                  >
                                    <CheckIcon fontSize="small" />
                                  </IconButton>
                                  <IconButton
                                    size="small"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      cancelRename();
                                    }}
                                    className="gpt-action-btn"
                                    aria-label="Cancel rename"
                                  >
                                    <ClearIcon fontSize="small" />
                                  </IconButton>
                                </Box>
                              ) : (
                                <>
                                  <span className="gpt-chat-title">{chat.title || 'New Chat'}</span>
                                  <Box className="gpt-chat-actions">
                                    <IconButton
                                      size="small"
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        startEditing(chat.id, chat.title);
                                      }}
                                      className="gpt-action-btn"
                                      aria-label="Rename chat"
                                    >
                                      <EditRoundedIcon fontSize="small" />
                                    </IconButton>
                                    <IconButton
                                      size="small"
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        handleDelete(chat.id);
                                      }}
                                      className="gpt-action-btn gpt-delete"
                                      aria-label="Delete chat"
                                    >
                                      <DeleteForeverIcon fontSize="small" />
                                    </IconButton>
                                  </Box>
                                </>
                              )}
                            </Box>
                          );
                        })}
                      </Box>
                    )}
                  </Box>
                );
              })}
            </Box>

            {/* Your Chats Section - only non-project chats */}
            <Box className="gpt-section gpt-chats-section">
              <Typography className="gpt-section-label">Your chats</Typography>
              <Box className="gpt-chats-list">
                {chats.filter(chat => !chat.projectId).map((chat) => {
                  const isActive = chat.id === activeChatId;
                  const isEditing = editingId === chat.id;
                  const customShan = chat.customShanId ? customShanById[chat.customShanId] : null;
                  const customShanIcon = customShan?.icon_url || null;

                  return (
                    <Box
                      key={chat.id}
                      className={`gpt-chat-item ${isActive ? 'active' : ''}`}
                      role="button"
                      tabIndex={isEditing ? -1 : 0}
                      aria-current={isActive ? 'page' : undefined}
                      aria-label={`Open chat ${chat.title || 'New Chat'}`}
                      onClick={() => {
                        if (!isEditing) {
                          handleSelectChat(chat.id);
                        }
                      }}
                      onKeyDown={(event) => {
                        if (!isEditing) {
                          handleActionKeyDown(event, () => handleSelectChat(chat.id));
                        }
                      }}
                    >
                      {isEditing ? (
                        <Box className="gpt-edit-row">
                          <TextField
                            size="small"
                            value={draftTitle}
                            onChange={(e) => setDraftTitle(e.target.value)}
                            autoFocus
                            className="gpt-rename-input"
                            onClick={(e) => e.stopPropagation()}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') commitRename(chat.id);
                              else if (e.key === 'Escape') cancelRename();
                            }}
                          />
                          <IconButton
                            size="small"
                            onClick={(event) => {
                              event.stopPropagation();
                              commitRename(chat.id);
                            }}
                            className="gpt-action-btn"
                            aria-label="Save chat title"
                          >
                            <CheckIcon fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={(event) => {
                              event.stopPropagation();
                              cancelRename();
                            }}
                            className="gpt-action-btn"
                            aria-label="Cancel rename"
                          >
                            <ClearIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      ) : (
                        <>
                          {customShanIcon && (
                            <Avatar
                              src={customShanIcon}
                              alt={customShan?.name || 'Custom Shan'}
                              className="gpt-chat-avatar"
                            />
                          )}
                          <span className="gpt-chat-title">{chat.title || 'New Chat'}</span>
                          <Box className="gpt-chat-actions">
                            <IconButton
                              size="small"
                              onClick={(event) => {
                                event.stopPropagation();
                                startEditing(chat.id, chat.title);
                              }}
                              className="gpt-action-btn"
                              aria-label="Rename chat"
                            >
                              <EditRoundedIcon fontSize="small" />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={(event) => {
                                event.stopPropagation();
                                handleDelete(chat.id);
                              }}
                              className="gpt-action-btn gpt-delete"
                              aria-label="Delete chat"
                            >
                              <DeleteForeverIcon fontSize="small" />
                            </IconButton>
                          </Box>
                        </>
                      )}
                    </Box>
                  );
                })}
              </Box>
            </Box>
          </Box>
        )}
      </Box>
      <IconButton
        className={`sidebar-fab-open ${isOpen ? 'hidden' : ''}`}
        aria-label="Open chat history"
        onClick={() => setIsOpen(true)}
        size="large"
      >
        <MenuRoundedIcon fontSize="medium" />
      </IconButton>
    </>
  );
};

export default ChatHistorySidebar;
