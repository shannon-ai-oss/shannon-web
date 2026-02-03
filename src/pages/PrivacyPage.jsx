import React from "react";
import { Helmet } from "react-helmet-async";
import { Box, Container } from "@mui/material";
import SecurityIcon from "@mui/icons-material/Security";
import { Link } from "react-router-dom";
import "./PrivacyPage.css";

const SITE_ORIGIN = "https://shannon-ai.com";

const PrivacyPage = () => {
  const canonicalUrl = `${SITE_ORIGIN}/privacy`;
  const pageTitle = "Privacy Policy | Shannon AI";
  const pageDescription =
    "Privacy Policy for Shannon AI. Learn how we collect, use, and protect your personal information.";
  const ogImage = `${SITE_ORIGIN}/shannonbanner.png`;

  return (
    <Box className="privacy-page">
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

      <section className="privacy-hero">
        <Container maxWidth="md" className="privacy-hero-content">
          <div className="privacy-hero-badge">
            <SecurityIcon />
            <span>Legal</span>
          </div>
          <h1 className="privacy-hero-title">Privacy Policy</h1>
          <p className="privacy-hero-subtitle">
            Last updated: December 19, 2025
          </p>
        </Container>
      </section>

      <section className="privacy-section">
        <Container maxWidth="md">
          <div className="privacy-card">
            <div className="privacy-content">
              <h2>1. Introduction</h2>
              <p>
                SHANNON LAB LLC ("Shannon AI," "we," "us," or "our") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our AI-powered services and website at shannon-ai.com.
              </p>

              <h2>2. Information We Collect</h2>
              <h3>2.1 Information You Provide</h3>
              <ul>
                <li><strong>Account Information:</strong> When you create an account, we collect your email address and authentication credentials.</li>
                <li><strong>Chat Data:</strong> Messages and queries you submit to our AI services.</li>
                <li><strong>Payment Information:</strong> If you subscribe to paid services, payment details are processed by our third-party payment processors.</li>
              </ul>

              <h3>2.2 Automatically Collected Information</h3>
              <ul>
                <li><strong>Usage Data:</strong> Information about how you interact with our services, including features used and time spent.</li>
                <li><strong>Device Information:</strong> Browser type, operating system, and device identifiers.</li>
                <li><strong>Log Data:</strong> IP addresses, access times, and referring URLs.</li>
              </ul>

              <h2>3. How We Use Your Information</h2>
              <p>We use the collected information to:</p>
              <ul>
                <li>Provide, maintain, and improve our AI services</li>
                <li>Process transactions and manage your account</li>
                <li>Respond to your inquiries and provide customer support</li>
                <li>Send service-related communications</li>
                <li>Monitor and analyze usage patterns to enhance user experience</li>
                <li>Protect against unauthorized access and ensure security</li>
                <li>Comply with legal obligations</li>
              </ul>

              <h2>4. Data Sharing and Disclosure</h2>
              <p>We do not sell your personal information. We may share your information with:</p>
              <ul>
                <li><strong>Service Providers:</strong> Third parties that help us operate our services (hosting, analytics, payment processing).</li>
                <li><strong>Legal Requirements:</strong> When required by law or to protect our rights and safety.</li>
                <li><strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets.</li>
              </ul>

              <h2>5. Data Security</h2>
              <p>
                We implement industry-standard security measures to protect your information, including encryption in transit and at rest, secure authentication, and regular security assessments. However, no method of transmission over the Internet is 100% secure.
              </p>

              <h2>6. Data Retention</h2>
              <p>
                We retain your information for as long as your account is active or as needed to provide services. You may request deletion of your data at any time using the link below.
              </p>

              <h2>7. Delete Your Account</h2>
              <p>
                You have the right to request deletion of your account and all associated data at any time. When you request account deletion, we will permanently remove:
              </p>
              <ul>
                <li>Your account information and profile</li>
                <li>All chat history and conversations</li>
                <li>Any stored preferences and settings</li>
                <li>Usage data associated with your account</li>
              </ul>
              <p>
                Please note that deletion is permanent and cannot be undone. Some information may be retained as required by law or for legitimate business purposes (e.g., fraud prevention, legal compliance).
              </p>
              <div className="privacy-delete-action">
                <Link to="/delete-account" className="privacy-delete-button">
                  Request Account Deletion
                </Link>
              </div>

              <h2>8. Your Rights</h2>
              <p>Depending on your location, you may have the right to:</p>
              <ul>
                <li>Access the personal information we hold about you</li>
                <li>Request correction of inaccurate data</li>
                <li>Request deletion of your data</li>
                <li>Object to or restrict certain processing</li>
                <li>Data portability</li>
                <li>Withdraw consent where processing is based on consent</li>
              </ul>

              <h2>9. Cookies and Tracking</h2>
              <p>
                We use cookies and similar technologies to maintain sessions, remember preferences, and analyze usage. You can control cookies through your browser settings.
              </p>

              <h2>10. Third-Party Services</h2>
              <p>
                Our services may integrate with third-party AI providers and services. These third parties have their own privacy policies, and we encourage you to review them.
              </p>

              <h2>11. Children's Privacy</h2>
              <p>
                Our services are not intended for children under 13. We do not knowingly collect information from children under 13. If we learn we have collected such information, we will delete it promptly.
              </p>

              <h2>12. International Data Transfers</h2>
              <p>
                Your information may be transferred to and processed in countries other than your own. We ensure appropriate safeguards are in place for such transfers.
              </p>

              <h2>13. Changes to This Policy</h2>
              <p>
                We may update this Privacy Policy from time to time. We will notify you of significant changes by posting the new policy on this page and updating the "Last updated" date.
              </p>

              <h2>14. Contact Us</h2>
              <p>
                If you have questions about this Privacy Policy or our privacy practices, please contact us at:
              </p>
              <div className="privacy-contact">
                <p>
                  <strong>SHANNON LAB LLC</strong><br />
                  8206 Louisiana Blvd NE<br />
                  Ste A #7871<br />
                  Albuquerque, NM 87113<br />
                  United States
                </p>
              </div>
            </div>
          </div>
        </Container>
      </section>
    </Box>
  );
};

export default PrivacyPage;
