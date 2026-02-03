import React from "react";
import { Helmet } from "react-helmet-async";
import { Box, Container } from "@mui/material";
import BusinessIcon from "@mui/icons-material/Business";
import "./CompanyPage.css";

const companyFields = [
  { label: "Legal name", value: "SHANNON LAB LLC" },
  { label: "Entity type", value: "LLC" },
  { label: "Formation state", value: "New Mexico" },
  { label: "State status", value: "Active / Good Standing" },
  { label: "Formation date", value: "Dec 02, 2025" },
  { label: "Entity ID", value: "0008065379" },
  {
    label: "NAICS sector",
    value: "54 — Professional, Scientific, and Technical Services",
  },
  { label: "NAICS subcode", value: "541512 — Computer Systems Design Services" },
  {
    label: "Company address",
    value:
      "8206 Louisiana Blvd NE\nSte A #7871\nAlbuquerque, NM 87113\nUnited States",
  },
];

const SITE_ORIGIN = "https://shannon-ai.com";

const CompanyPage = () => {
  const canonicalUrl = `${SITE_ORIGIN}/company`;
  const pageTitle = "Company Info | Shannon AI";
  const pageDescription =
    "Legal entity and registration details for SHANNON LAB LLC, the company behind Shannon AI.";
  const ogImage = `${SITE_ORIGIN}/shannonbanner.png`;

  return (
    <Box className="company-page">
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

      <section className="company-hero">
        <Container maxWidth="md" className="company-hero-content">
          <div className="company-hero-badge">
            <BusinessIcon />
            <span>Legal Entity Details</span>
          </div>
          <h1 className="company-hero-title">Company Information</h1>
          <p className="company-hero-subtitle">
            Copy-ready details for investor programs, invoices, and due
            diligence.
          </p>
        </Container>
      </section>

      <section className="company-section">
        <Container maxWidth="md">
          <div className="company-card">
            <div className="company-grid">
              {companyFields.map((field) => (
                <div key={field.label} className="company-field">
                  <div className="company-label">{field.label}</div>
                  <div className="company-value">{field.value}</div>
                </div>
              ))}
            </div>
          </div>
        </Container>
      </section>
    </Box>
  );
};

export default CompanyPage;

