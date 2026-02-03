import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button, Avatar, IconButton, Menu, MenuItem } from "@mui/material";
import {
  Settings,
  AccountCircle,
  Logout,
  Menu as MenuIcon,
} from "@mui/icons-material";
import { useState } from "react";
import "./AppHeader.css";
import { useAuth } from "@/context/AuthContext";
import shannonRankGif from "../assets/shannon-rank.gif";
import shannonRankWebp from "../assets/shannon-rank.webp";

function AppHeader({ isCollapsed = false }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, token, logout } = useAuth();
  const [anchorEl, setAnchorEl] = useState(null);
  const [mobileMenuAnchor, setMobileMenuAnchor] = useState(null);

  const isActiveLink = (path) => {
    if (location.pathname === path) {
      return "active-link";
    }
    if (path !== "/" && location.pathname.startsWith(`${path}/`)) {
      return "active-link";
    }
    return "";
  };

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
    handleCloseMenu();
  };

  const handleOpenMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
  };

  const handleMobileMenu = (event) => {
    setMobileMenuAnchor(event.currentTarget);
  };

  const handleCloseMobileMenu = () => {
    setMobileMenuAnchor(null);
  };

  const getUserInitials = () => {
    if (user?.displayName) {
      const names = user.displayName.split(" ");
      if (names.length >= 2) {
        return (names[0][0] + names[names.length - 1][0]).toUpperCase();
      }
      return user.displayName.substring(0, 2).toUpperCase();
    }
    if (user?.email) {
      return user.email.substring(0, 2).toUpperCase();
    }
    return "U";
  };

  return (
    <header
      className={`app-header ${isCollapsed ? "collapsed" : ""} ${location.pathname === "/chat" ? "hidden" : ""}`}
    >
      <nav className="nav-container">
        <div className="nav-left">
          <div className="brand-wrapper">
            <div className="brand-icon">
              <picture>
                <source srcSet={shannonRankWebp} type="image/webp" />
                <img
                  src={shannonRankGif}
                  alt="SHANNON A.I. Logo"
                  className="brand-logo-gif"
                  width="75"
                  height="56"
                  decoding="async"
                  loading="eager"
                />
              </picture>
            </div>
            <Link to="/" className="nav-brand">
              <span className="brand-text-main">SHANNON</span>
              <span className="brand-text-sub">A.I.</span>
            </Link>
          </div>
        </div>

        <div className="nav-center">
          <div className="nav-links">
            <Link to="/chat" className={`nav-link ${isActiveLink("/chat")}`}>
              <span className="nav-link-text">Chat</span>
              <span className="nav-link-underline"></span>
            </Link>
            <Link to="/plan" className={`nav-link ${isActiveLink("/plan")}`}>
              <span className="nav-link-text">Pricing</span>
              <span className="nav-link-underline"></span>
            </Link>
            <Link to="/api" className={`nav-link ${isActiveLink("/api")}`}>
              <span className="nav-link-text">API</span>
              <span className="nav-link-underline"></span>
            </Link>
            <Link
              to="/research"
              className={`nav-link ${isActiveLink("/research")}`}
            >
              <span className="nav-link-text">Research</span>
              <span className="nav-link-underline"></span>
            </Link>
            <Link
              to="/company"
              className={`nav-link ${isActiveLink("/company")}`}
            >
              <span className="nav-link-text">Company</span>
              <span className="nav-link-underline"></span>
            </Link>
          </div>
        </div>

        <div className="nav-right">
          <div className="nav-actions">
            {!token ? (
              <Link to="/login" className="login-link">
                <Button
                  variant="outlined"
                  size="small"
                  className="login-button"
                  startIcon={<AccountCircle />}
                >
                  Sign In
                </Button>
              </Link>
            ) : (
              <>
                <IconButton
                  className="user-menu-button"
                  onClick={handleOpenMenu}
                  size="small"
                  aria-label="Open user menu"
                >
                  <Avatar
                    className="user-avatar"
                    sx={{ width: 32, height: 32 }}
                    src={user?.photoURL}
                    alt={user?.displayName || user?.email}
                  >
                    {!user?.photoURL && getUserInitials()}
                  </Avatar>
                </IconButton>
                <Menu
                  anchorEl={anchorEl}
                  open={Boolean(anchorEl)}
                  onClose={handleCloseMenu}
                  className="user-menu"
                  PaperProps={{
                    sx: {
                      bgcolor: "rgba(10, 10, 18, 0.95)",
                      backdropFilter: "blur(12px)",
                      border: "1px solid rgba(255, 23, 68, 0.2)",
                      boxShadow: "0 8px 32px rgba(255, 23, 68, 0.15)",
                      mt: 1.5,
                    },
                  }}
                >
                    <MenuItem
                    onClick={() => {
                      navigate("/plan");
                      handleCloseMenu();
                    }}
                    className="menu-item"
                  >
                    <Settings fontSize="small" sx={{ mr: 1 }} />
                    Plan & Usage
                  </MenuItem>
                  <MenuItem
                    onClick={handleLogout}
                    className="menu-item logout-item"
                  >
                    <Logout fontSize="small" sx={{ mr: 1 }} />
                    Logout
                  </MenuItem>
                </Menu>
              </>
            )}
          </div>

          <IconButton
            className="mobile-menu-toggle"
            onClick={handleMobileMenu}
            size="small"
            aria-label="Open navigation menu"
          >
            <MenuIcon />
          </IconButton>

          <Menu
            anchorEl={mobileMenuAnchor}
            open={Boolean(mobileMenuAnchor)}
            onClose={handleCloseMobileMenu}
            className="mobile-menu"
            PaperProps={{
              sx: {
                bgcolor: "rgba(10, 10, 18, 0.95)",
                backdropFilter: "blur(12px)",
                border: "1px solid rgba(255, 23, 68, 0.2)",
                boxShadow: "0 8px 32px rgba(255, 23, 68, 0.15)",
                mt: 1.5,
                minWidth: 200,
              },
            }}
          >
            <MenuItem
              onClick={() => {
                navigate("/chat");
                handleCloseMobileMenu();
              }}
              className="menu-item"
            >
              Chat
            </MenuItem>
            <MenuItem
              onClick={() => {
                navigate("/plan");
                handleCloseMobileMenu();
              }}
              className="menu-item"
            >
              Pricing
            </MenuItem>
            <MenuItem
              onClick={() => {
                navigate("/api");
                handleCloseMobileMenu();
              }}
              className="menu-item"
            >
              API
            </MenuItem>
            <MenuItem
              onClick={() => {
                navigate("/research");
                handleCloseMobileMenu();
              }}
              className="menu-item"
            >
              Research
            </MenuItem>
            <MenuItem
              onClick={() => {
                navigate("/company");
                handleCloseMobileMenu();
              }}
              className="menu-item"
            >
              Company
            </MenuItem>
            {!token && (
              <MenuItem
                onClick={() => {
                  navigate("/login");
                  handleCloseMobileMenu();
                }}
                className="menu-item"
              >
                Sign In
              </MenuItem>
            )}
            {token && (
              <MenuItem
                onClick={() => {
                  handleLogout();
                  handleCloseMobileMenu();
                }}
                className="menu-item logout-item"
              >
                Logout
              </MenuItem>
            )}
          </Menu>
        </div>
      </nav>
    </header>
  );
}

export default AppHeader;
