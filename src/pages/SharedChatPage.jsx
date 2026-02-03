import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  Alert,
  Box,
  Breadcrumbs,
  Chip,
  CircularProgress,
  Typography,
} from "@mui/material";
import NavigateNextIcon from "@mui/icons-material/NavigateNext";
import { Helmet } from "react-helmet-async";
import { fetchSharedChat } from "@/api/share";
import { useAuth } from "@/context/AuthContext";
import { useInitialData } from "@/context/InitialDataContext.jsx";
import { renderMarkdownSafely } from "../components/MarkdownComponents.jsx";
import "./SharedChatPage.css";

function formatDate(value) {
  if (!value) {
    return null;
  }
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

const flattenContent = (input) => {
  if (!input) return "";
  if (typeof input === "string") {
    return input;
  }
  if (Array.isArray(input)) {
    return input
      .map((entry) => flattenContent(entry))
      .filter((chunk) => typeof chunk === "string" && chunk.trim())
      .join("\n\n");
  }
  if (typeof input === "object") {
    const candidateKeys = [
      "text",
      "content",
      "parts",
      "messages",
      "value",
      "message",
      "body",
      "delta",
      "output_text",
      "outputText",
      "segments",
      "result",
      "response_text",
      "responseText",
    ];
    for (const key of candidateKeys) {
      if (!(key in input)) {
        continue;
      }
      const flattened = flattenContent(input[key]);
      if (flattened && flattened.trim()) {
        return flattened;
      }
    }
    const stringValues = Object.values(input).filter(
      (value) => typeof value === "string" && value.trim(),
    );
    if (stringValues.length > 0) {
      return stringValues[0];
    }
  }
  return "";
};

const extractMessageContent = (message) => {
  if (!message || typeof message !== "object") {
    return "";
  }
  const {
    content,
    text,
    response_text: responseText,
    responseText: responseTextCamel,
    answer,
    delta,
    response,
    body,
    value,
    message: nestedMessage,
  } = message;
  const candidates = [
    content,
    text,
    responseText,
    responseTextCamel,
    answer,
    delta,
    response,
    body,
    value,
    nestedMessage,
  ];
  const match = candidates.find((item) => {
    const flattened = flattenContent(item);
    return flattened.trim().length > 0;
  });
  const resolved = match ? flattenContent(match) : "";
  return typeof resolved === "string" ? resolved : "";
};

export default function SharedChatPage() {
  const { slug } = useParams();
  const { token } = useAuth();
  const initialData = useInitialData();
  const initialShare =
    initialData?.share && initialData.share.slug === slug
      ? initialData.share
      : null;
  const normalizedInitialShare =
    initialShare && initialShare.fallback ? null : initialShare;
  const initialShouldFetch =
    !normalizedInitialShare ||
    (!normalizedInitialShare.notFound &&
      !normalizedInitialShare.requiresLogin &&
      !Array.isArray(normalizedInitialShare?.chat?.messages));
  const [share, setShare] = useState(normalizedInitialShare);
  const [loading, setLoading] = useState(initialShouldFetch);
  const [error, setError] = useState(
    normalizedInitialShare?.notFound ? "Conversation not found." : null,
  );
  const [requiresLogin, setRequiresLogin] = useState(
    normalizedInitialShare?.requiresLogin || false,
  );

  useEffect(() => {
    if (!slug) {
      return;
    }
    let ignore = false;
    const shouldAttemptFetch =
      (!share && !requiresLogin) ||
      (share?.fallback && !requiresLogin) ||
      (requiresLogin && token);
    if (!shouldAttemptFetch) {
      return undefined;
    }
    const loadShare = async () => {
      setLoading(true);
      try {
        const response = await fetchSharedChat(slug);
        if (!ignore) {
          setShare(response);
          setError(null);
          setRequiresLogin(false);
        }
      } catch (err) {
        if (!ignore) {
          if (err?.status === 401) {
            setRequiresLogin(true);
            setShare(null);
          } else {
            setError(err.message || "Failed to load chat");
            setShare(null);
          }
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };
    loadShare();
    return () => {
      ignore = true;
    };
  }, [slug, token, share, requiresLogin]);

  const chat = share?.chat || null;
  const notFound = Boolean(share?.notFound);
  const isPrivate =
    (share?.visibility ||
      normalizedInitialShare?.visibility ||
      initialShare?.visibility) === "private";
  const lastUpdated = formatDate(
    share?.updatedAt ||
      normalizedInitialShare?.updatedAt ||
      initialShare?.updatedAt,
  );

  const meta = useMemo(() => {
    const rawTitle = chat?.title?.trim() || "Shared AI Conversation";
    const title = `${rawTitle} | Shannon AI Chat`;
    const safeMessages = Array.isArray(chat?.messages) ? chat.messages : [];
    const messageCount = safeMessages.length;
    const firstMessage = safeMessages.find((message) => {
      const body = extractMessageContent(message);
      return Boolean(body.trim());
    });
    const summary =
      chat?.summary?.trim() || extractMessageContent(firstMessage).trim() || "";
    const description =
      summary.length > 200
        ? `${summary.slice(0, 197).trimEnd()}… - Shared AI conversation on Shannon AI`
        : summary
          ? `${summary} - Shared AI conversation on Shannon AI`
          : "A shared AI conversation from Shannon AI. Explore real examples of AI interactions and learn from community-shared discussions.";
    const hostOrigin = "https://shannon-ai.com";
    const canonical = `${hostOrigin}/share/${slug}`;
    const socialImage = `${hostOrigin}/shannonbanner.png`;

    // Extract keywords from conversation
    const keywords = [
      "AI conversation",
      "Shannon AI",
      "shared chat",
      "AI assistant",
      "chatbot conversation",
      rawTitle.split(" ").slice(0, 3).join(" "),
    ].filter(Boolean).join(", ");

    const previewMessages = safeMessages
      .slice(0, 4)
      .map((message, idx) => {
        const body = extractMessageContent(message);
        const truncated =
          body && body.length > 300
            ? `${body.slice(0, 297).trimEnd()}…`
            : body || "";
        return {
          "@type": "Comment",
          position: idx + 1,
          author: {
            "@type": message.role === "assistant" ? "Organization" : "Person",
            name: message.role === "assistant" ? "Shannon AI" : "User",
          },
          text: truncated,
        };
      })
      .filter((entry) => entry.text);

    const allowStructuredData =
      Boolean(chat) && !isPrivate && !requiresLogin && !notFound;

    // Enhanced JSON-LD with DiscussionForumPosting schema
    const jsonLd = allowStructuredData
      ? {
          "@context": "https://schema.org",
          "@type": "DiscussionForumPosting",
          "@id": canonical,
          headline: rawTitle,
          name: rawTitle,
          description,
          url: canonical,
          datePublished: share?.createdAt || new Date().toISOString(),
          dateModified: share?.updatedAt || share?.createdAt || new Date().toISOString(),
          author: {
            "@type": "Person",
            name: "Shannon AI User",
          },
          publisher: {
            "@type": "Organization",
            name: "Shannon AI",
            url: "https://shannon-ai.com",
            logo: {
              "@type": "ImageObject",
              url: "https://shannon-ai.com/SHANNONICO.ico",
            },
          },
          mainEntityOfPage: {
            "@type": "WebPage",
            "@id": canonical,
          },
          image: socialImage,
          interactionStatistic: {
            "@type": "InteractionCounter",
            interactionType: "https://schema.org/CommentAction",
            userInteractionCount: messageCount,
          },
          comment: previewMessages,
          about: {
            "@type": "Thing",
            name: "AI Conversation",
            description: "A conversation with Shannon AI assistant",
          },
        }
      : null;

    return {
      title,
      rawTitle,
      description,
      canonical,
      socialImage,
      keywords,
      messageCount,
      jsonLd,
    };
  }, [chat, slug, isPrivate, requiresLogin, notFound, share]);

  return (
    <Box className="shared-chat-page" component="article" itemScope itemType="https://schema.org/DiscussionForumPosting">
      <Helmet>
        <title>{meta.title}</title>
        <meta name="description" content={meta.description} />
        <meta name="keywords" content={meta.keywords} />
        <link rel="canonical" href={meta.canonical} />
        {isPrivate || notFound ? (
          <meta name="robots" content="noindex" />
        ) : null}

        {/* OpenGraph */}
        <meta property="og:type" content="article" />
        <meta property="og:title" content={meta.title} />
        <meta property="og:description" content={meta.description} />
        <meta property="og:url" content={meta.canonical} />
        <meta property="og:image" content={meta.socialImage} />
        <meta property="og:image:alt" content={`${meta.rawTitle} - Shannon AI Conversation`} />
        <meta property="og:site_name" content="Shannon AI" />
        <meta property="article:publisher" content="https://shannon-ai.com" />

        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={meta.title} />
        <meta name="twitter:description" content={meta.description} />
        <meta name="twitter:image" content={meta.socialImage} />
        <meta name="twitter:image:alt" content={`${meta.rawTitle} - Shannon AI Conversation`} />
        <meta name="twitter:site" content="@ShannonAI" />

        {/* Structured Data */}
        {meta.jsonLd ? (
          <script type="application/ld+json">
            {JSON.stringify(meta.jsonLd)}
          </script>
        ) : null}
      </Helmet>
      <Box sx={{ mb: 2 }}>
        <Breadcrumbs
          separator={<NavigateNextIcon fontSize="small" />}
          aria-label="breadcrumb"
        >
          <Link to="/" style={{ color: "inherit", textDecoration: "none" }}>
            Home
          </Link>
          <Link to="/chat" style={{ color: "inherit", textDecoration: "none" }}>
            Chat
          </Link>
          <Typography color="text.primary">Shared conversation</Typography>
        </Breadcrumbs>
      </Box>

      {loading && (
        <Box
          sx={{ display: "flex", justifyContent: "center", padding: "2rem 0" }}
        >
          <CircularProgress size={32} />
        </Box>
      )}

      {requiresLogin && !notFound && (
        <Alert severity="info" sx={{ mb: 2 }}>
          This conversation is private.{" "}
          <Link to="/login" style={{ color: "inherit" }}>
            Sign in
          </Link>{" "}
          with your Shannon account to view it.
        </Alert>
      )}

      {notFound && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          This conversation link could not be found.
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {chat && !requiresLogin && !notFound && !loading && !error && (
        <>
          <div className="shared-chat-header">
            <Typography variant="h4" gutterBottom>
              {chat.title}
            </Typography>
            <Box sx={{ mt: 1 }}>
              <Chip
                label={isPrivate ? "Private" : "Public"}
                color="secondary"
                variant="outlined"
              />
              {lastUpdated ? (
                <Typography variant="body2" sx={{ opacity: 0.7, mt: 1 }}>
                  Last updated {lastUpdated}
                </Typography>
              ) : null}
            </Box>
          </div>

          {chat.messages.map((message, index) => {
            const body = extractMessageContent(message);
            const timestamp =
              message.createdAt ||
              message.created_at ||
              message.updatedAt ||
              message.updated_at ||
              message.timestamp;
            return (
              <div
                key={`${message.createdAt || message.created_at || index}-${index}`}
                className={`shared-chat-message ${message.role}`}
              >
                <Typography
                  variant="subtitle2"
                  gutterBottom
                  className="shared-chat-author"
                >
                  {message.role === "user" ? "User" : "Assistant"}
                </Typography>
                <div className="shared-chat-body">
                  {renderMarkdownSafely(body)}
                </div>
                <div className="timestamp">{formatDate(timestamp)}</div>
              </div>
            );
          })}
        </>
      )}
    </Box>
  );
}
