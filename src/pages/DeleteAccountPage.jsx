import React, { useState } from "react";
import { Helmet } from "react-helmet-async";
import { Box, Container, TextField, Button, Alert, CircularProgress } from "@mui/material";
import DeleteForeverIcon from "@mui/icons-material/DeleteForever";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { httpsCallable } from "@/lib/localFunctions";
import { functions } from "@/config/backend";
import "./DeleteAccountPage.css";

const SITE_ORIGIN = "https://shannon-ai.com";

const DeleteAccountPage = () => {
  const [email, setEmail] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const canonicalUrl = `${SITE_ORIGIN}/delete-account`;
  const pageTitle = "Delete Account | Shannon AI";
  const pageDescription =
    "Request deletion of your Shannon AI account and all associated data.";
  const ogImage = `${SITE_ORIGIN}/shannonbanner.png`;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!email) {
      setError("Please enter your account email address.");
      return;
    }

    if (confirmText !== "DELETE") {
      setError("Please type DELETE to confirm.");
      return;
    }

    setLoading(true);

    try {
      const requestAccountDeletion = httpsCallable(functions, "requestAccountDeletion");
      await requestAccountDeletion({ email });
      setSuccess(true);
    } catch (err) {
      console.error("Deletion request error:", err);
      // Still show success to prevent email enumeration
      setSuccess(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box className="delete-account-page">
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:image" content={ogImage} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={pageTitle} />
        <meta name="twitter:description" content={pageDescription} />
        <meta name="twitter:image" content={ogImage} />
      </Helmet>

      <section className="delete-account-hero">
        <Container maxWidth="sm" className="delete-account-hero-content">
          <div className="delete-account-hero-badge">
            <DeleteForeverIcon />
            <span>Account</span>
          </div>
          <h1 className="delete-account-hero-title">Delete Your Account</h1>
          <p className="delete-account-hero-subtitle">
            Request permanent deletion of your account and all associated data
          </p>
        </Container>
      </section>

      <section className="delete-account-section">
        <Container maxWidth="sm">
          {success ? (
            <div className="delete-account-card delete-account-success">
              <CheckCircleIcon className="success-icon" />
              <h2>Request Submitted</h2>
              <p>
                If an account exists with that email address, you will receive a confirmation
                email with further instructions. Please check your inbox and spam folder.
              </p>
              <p className="success-note">
                Account deletion requests are typically processed within 7 business days.
              </p>
            </div>
          ) : (
            <div className="delete-account-card">
              <div className="delete-account-warning">
                <WarningAmberIcon />
                <div>
                  <strong>This action is permanent</strong>
                  <p>Once your account is deleted, all data will be permanently removed and cannot be recovered.</p>
                </div>
              </div>

              <div className="delete-account-info">
                <h3>What will be deleted:</h3>
                <ul>
                  <li>Your account and profile information</li>
                  <li>All chat history and conversations</li>
                  <li>Saved preferences and settings</li>
                  <li>Usage data and analytics</li>
                  <li>Any subscription data (subscriptions will be cancelled)</li>
                </ul>
              </div>

              <form onSubmit={handleSubmit} className="delete-account-form">
                <div className="form-field">
                  <label htmlFor="email">Account Email Address</label>
                  <TextField
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your account email"
                    fullWidth
                    variant="outlined"
                    disabled={loading}
                    className="delete-input"
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="confirm">
                    Type <strong>DELETE</strong> to confirm
                  </label>
                  <TextField
                    id="confirm"
                    type="text"
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    placeholder="Type DELETE"
                    fullWidth
                    variant="outlined"
                    disabled={loading}
                    className="delete-input"
                  />
                </div>

                {error && (
                  <Alert severity="error" className="delete-error">
                    {error}
                  </Alert>
                )}

                <Button
                  type="submit"
                  variant="contained"
                  fullWidth
                  disabled={loading || confirmText !== "DELETE"}
                  className="delete-submit-button"
                >
                  {loading ? (
                    <CircularProgress size={24} color="inherit" />
                  ) : (
                    "Request Account Deletion"
                  )}
                </Button>

                <p className="delete-footer-note">
                  By submitting this request, you confirm that you understand this action
                  is permanent and irreversible.
                </p>
              </form>
            </div>
          )}
        </Container>
      </section>
    </Box>
  );
};

export default DeleteAccountPage;
