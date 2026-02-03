import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Box,
  Button,
  TextField,
  Typography,
  InputAdornment,
  Divider,
  IconButton,
} from "@mui/material";
import EmailIcon from "@mui/icons-material/Email";
import LockIcon from "@mui/icons-material/Lock";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import GoogleIcon from "@mui/icons-material/Google";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import SecurityIcon from "@mui/icons-material/Security";
import SpeedIcon from "@mui/icons-material/Speed";
import VerifiedUserIcon from "@mui/icons-material/VerifiedUser";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { useAuth } from "@/context/AuthContext";
import { Helmet } from "react-helmet-async";
import BackgroundVideo from "@/components/BackgroundVideo";
import backgroundMp4 from "../assets/background.mp4";
import backgroundWebm from "../assets/background.webm";
import backgroundPoster from "../assets/background-poster.webp";
import "./LoginPage.css";

const trustFeatures = [
  {
    icon: SecurityIcon,
    title: "Private by Design",
    description: "Conversations stay isolated and are never used for training.",
  },
  {
    icon: SpeedIcon,
    title: "Fast Onboarding",
    description: "Start testing immediately with email or Google sign-in.",
  },
  {
    icon: VerifiedUserIcon,
    title: "Built for Security Teams",
    description: "Audit-friendly logging and compliance-ready workflows.",
  },
];

const socialProofStats = [
  { value: "120+", label: "Security Teams" },
  { value: "99.9%", label: "Uptime (90d)" },
  { value: "SOC 2", label: "Type II Attested" },
];

const backgroundSources = {
  webm: backgroundWebm,
  mp4: backgroundMp4,
};

const LoginPage = () => {
  const navigate = useNavigate();
  const {
    user,
    login,
    register,
    signInWithGoogle,
    resetPassword,
    loading: authLoading,
    error: authError,
  } = useAuth();

  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [googleSubmitting, setGoogleSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [resetEmail, setResetEmail] = useState("");

  const siteOrigin = "https://shannon-ai.com";
  const canonicalUrl = `${siteOrigin}/login`;
  const socialImage = `${siteOrigin}/shannonbanner.png`;
  const pageTitle = "Sign In | Shannon AI - The AI That Actually Helps";
  const pageDescription =
    "Sign in to Shannon AI for smarter conversations without the usual restrictions. Get real answers, write freely, explore any topic.";

  useEffect(() => {
    if (authError) {
      setError(authError);
    }
  }, [authError]);

  useEffect(() => {
    if (authLoading) return;
    if (user?.uid) {
      navigate("/chat", { replace: true });
    }
  }, [user?.uid, authLoading, navigate]);

  const handleChange = (evt) => {
    const { name, value } = evt.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setError(null);
  };

  const validateForm = () => {
    const email = form.email.trim();
    const password = form.password.trim();

    if (!email) {
      setError("Email is required");
      return false;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address");
      return false;
    }

    if (!password) {
      setError("Password is required");
      return false;
    }

    if (mode === "register") {
      if (password.length < 6) {
        setError("Password must be at least 6 characters");
        return false;
      }
      if (form.confirmPassword !== password) {
        setError("Passwords do not match");
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (evt) => {
    evt.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    setError(null);

    try {
      if (mode === "register") {
        await register({
          email: form.email.trim(),
          password: form.password.trim(),
        });
      } else {
        await login({
          email: form.email.trim(),
          password: form.password.trim(),
        });
      }
      navigate("/chat", { replace: true });
    } catch (err) {
      setError(err.message || "Authentication failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleSubmitting(true);
    setError(null);
    try {
      await signInWithGoogle();
      navigate("/chat", { replace: true });
    } catch (err) {
      setError(err.message || "Google sign-in failed. Please try again.");
    } finally {
      setGoogleSubmitting(false);
    }
  };

  const handlePasswordReset = async (evt) => {
    evt.preventDefault();
    if (!resetEmail.trim()) {
      setError("Please enter your email address");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await resetPassword(resetEmail);
      setSuccess("Password reset email sent! Check your inbox.");
      setShowPasswordReset(false);
      setResetEmail("");
    } catch (err) {
      setError(err.message || "Failed to send reset email. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const switchMode = (newMode) => {
    setMode(newMode);
    setError(null);
    setSuccess(null);
    setForm({ email: "", password: "", confirmPassword: "" });
  };

  return (
    <Box className="auth-page">
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:image" content={socialImage} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={pageTitle} />
        <meta name="twitter:description" content={pageDescription} />
        <meta name="twitter:image" content={socialImage} />
      </Helmet>

      {/* Video Background */}
      <BackgroundVideo
        className="auth-video-bg"
        poster={backgroundPoster}
        sources={backgroundSources}
        playbackRate={0.75}
        forceLoad
      />
      <div className="auth-video-overlay" />

      {/* Back to Home */}
      <Link to="/" className="auth-back-link">
        <ArrowBackIcon />
        <span>Back to Home</span>
      </Link>

      <div className="auth-container">
        {/* Left Panel - Branding & Trust */}
        <div className="auth-brand-panel">
          <div className="auth-brand-content">
            <Link to="/" className="auth-logo">
              <Typography variant="h4" className="auth-logo-text">
                SHANNON<span>AI</span>
              </Typography>
            </Link>
            <Typography className="auth-brand-tagline">
              The AI That Actually Helps
            </Typography>

            <div className="auth-stats-row">
              {socialProofStats.map((stat) => (
                <div key={stat.label} className="auth-stat">
                  <span className="auth-stat-value">{stat.value}</span>
                  <span className="auth-stat-label">{stat.label}</span>
                </div>
              ))}
            </div>

            <div className="auth-features">
              {trustFeatures.map((feature) => {
                const IconComponent = feature.icon;
                return (
                  <div key={feature.title} className="auth-feature">
                    <div className="auth-feature-icon">
                      <IconComponent />
                    </div>
                    <div className="auth-feature-content">
                      <Typography className="auth-feature-title">
                        {feature.title}
                      </Typography>
                      <Typography className="auth-feature-desc">
                        {feature.description}
                      </Typography>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="auth-trust-badges">
              <span className="auth-trust-badge">
                <CheckCircleIcon /> SOC 2 Type II
              </span>
              <span className="auth-trust-badge">
                <CheckCircleIcon /> NIST AI RMF
              </span>
              <span className="auth-trust-badge">
                <CheckCircleIcon /> ISO 23894
              </span>
            </div>
          </div>
        </div>

        {/* Right Panel - Auth Form */}
        <div className="auth-form-panel">
          <div className="auth-form-container">
            {showPasswordReset ? (
              /* Password Reset Form */
              <div className="auth-form-inner">
                <div className="auth-form-header">
                  <Typography variant="h4" className="auth-form-title">
                    Reset Password
                  </Typography>
                  <Typography className="auth-form-subtitle">
                    Enter your email and we'll send you a reset link
                  </Typography>
                </div>

                <form onSubmit={handlePasswordReset} className="auth-form">
                  <TextField
                    fullWidth
                    name="resetEmail"
                    label="Email Address"
                    type="email"
                    value={resetEmail}
                    onChange={(e) => {
                      setResetEmail(e.target.value);
                      setError(null);
                    }}
                    autoComplete="email"
                    className="auth-input"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <EmailIcon className="auth-input-icon" />
                        </InputAdornment>
                      ),
                    }}
                  />

                  {error && <div className="auth-error">{error}</div>}
                  {success && <div className="auth-success">{success}</div>}

                  <Button
                    fullWidth
                    variant="contained"
                    type="submit"
                    className="auth-submit-btn"
                    disabled={submitting}
                  >
                    {submitting ? "Sending..." : "Send Reset Link"}
                  </Button>

                  <Button
                    fullWidth
                    variant="text"
                    onClick={() => {
                      setShowPasswordReset(false);
                      setError(null);
                      setResetEmail("");
                    }}
                    className="auth-text-btn"
                  >
                    Back to Sign In
                  </Button>
                </form>
              </div>
            ) : (
              /* Login/Register Form */
              <div className="auth-form-inner">
                <div className="auth-form-header">
                  <Typography variant="h4" className="auth-form-title">
                    {mode === "login" ? "Welcome Back" : "Join Shannon"}
                  </Typography>
                  <Typography className="auth-form-subtitle">
                    {mode === "login"
                      ? "Sign in to continue your conversations"
                      : "Start chatting free - no credit card needed"}
                  </Typography>
                </div>

                {/* Mode Tabs */}
                <div className="auth-mode-tabs">
                  <button
                    type="button"
                    className={`auth-mode-tab ${mode === "login" ? "active" : ""}`}
                    onClick={() => switchMode("login")}
                  >
                    Sign In
                  </button>
                  <button
                    type="button"
                    className={`auth-mode-tab ${mode === "register" ? "active" : ""}`}
                    onClick={() => switchMode("register")}
                  >
                    Create Account
                  </button>
                </div>

                {/* Google Sign In */}
                <Button
                  fullWidth
                  variant="outlined"
                  onClick={handleGoogleSignIn}
                  disabled={googleSubmitting || authLoading}
                  className="auth-google-btn"
                  startIcon={<GoogleIcon />}
                >
                  {googleSubmitting ? "Signing in..." : `Continue with Google`}
                </Button>

                <Divider className="auth-divider">
                  <span>or continue with email</span>
                </Divider>

                <form onSubmit={handleSubmit} className="auth-form">
                  <TextField
                    fullWidth
                    name="email"
                    label="Email Address"
                    type="email"
                    value={form.email}
                    onChange={handleChange}
                    autoComplete="email"
                    className="auth-input"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <EmailIcon className="auth-input-icon" />
                        </InputAdornment>
                      ),
                    }}
                  />

                  <TextField
                    fullWidth
                    name="password"
                    label="Password"
                    type={showPassword ? "text" : "password"}
                    value={form.password}
                    onChange={handleChange}
                    autoComplete={
                      mode === "login" ? "current-password" : "new-password"
                    }
                    className="auth-input"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <LockIcon className="auth-input-icon" />
                        </InputAdornment>
                      ),
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            onClick={() => setShowPassword(!showPassword)}
                            edge="end"
                            size="small"
                            className="auth-visibility-btn"
                            aria-label={showPassword ? "Hide password" : "Show password"}
                          >
                            {showPassword ? (
                              <VisibilityOffIcon />
                            ) : (
                              <VisibilityIcon />
                            )}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />

                  {mode === "register" && (
                    <TextField
                      fullWidth
                      name="confirmPassword"
                      label="Confirm Password"
                      type={showPassword ? "text" : "password"}
                      value={form.confirmPassword}
                      onChange={handleChange}
                      autoComplete="new-password"
                      className="auth-input"
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <LockIcon className="auth-input-icon" />
                          </InputAdornment>
                        ),
                      }}
                    />
                  )}

                  {error && <div className="auth-error">{error}</div>}
                  {success && <div className="auth-success">{success}</div>}

                  {mode === "login" && (
                    <button
                      type="button"
                      className="auth-forgot-link"
                      onClick={() => {
                        setShowPasswordReset(true);
                        setError(null);
                      }}
                    >
                      Forgot your password?
                    </button>
                  )}

                  <Button
                    fullWidth
                    variant="contained"
                    type="submit"
                    className="auth-submit-btn"
                    disabled={submitting || authLoading}
                  >
                    {submitting || authLoading
                      ? "Please wait..."
                      : mode === "login"
                        ? "Sign In"
                        : "Create Account"}
                  </Button>
                </form>

                <Typography className="auth-legal">
                  By continuing, you agree to Shannon AI's{" "}
                  <a href="mailto:legal@shannonai.app">Terms of Service</a> and{" "}
                  <a href="mailto:legal@shannonai.app">Privacy Policy</a>
                </Typography>

                {mode === "register" && (
                  <div className="auth-benefits">
                    <div className="auth-benefit">
                      <CheckCircleIcon />
                      <span>Free messages included</span>
                    </div>
                    <div className="auth-benefit">
                      <CheckCircleIcon />
                      <span>No credit card needed</span>
                    </div>
                    <div className="auth-benefit">
                      <CheckCircleIcon />
                      <span>Fast Onboarding</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            <Typography className="auth-support">
              Need help?{" "}
              <a href="mailto:support@shannonai.app">Contact Support</a>
            </Typography>
          </div>
        </div>
      </div>
    </Box>
  );
};

export default LoginPage;
