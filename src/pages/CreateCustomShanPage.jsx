import React, { useState, useRef, useEffect, useCallback } from "react";
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
  IconButton,
  Chip,
  Avatar,
  Tabs,
  Tab,
  Paper,
  Divider,
} from "@mui/material";
import {
  ArrowBack as BackIcon,
  CloudUpload as UploadIcon,
  Close as CloseIcon,
  Description as FileIcon,
  AddAPhoto as AddPhotoIcon,
  SmartToy as BotIcon,
  Send as SendIcon,
  Refresh as RefreshIcon,
  Settings as SettingsIcon,
  PlayArrow as PlayIcon,
} from "@mui/icons-material";
import { useCustomShan } from "@/hooks/useCustomShan";
import { useAuth } from "@/hooks/useAuth";
import "./CreateCustomShanPage.css";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const MAX_ICON_SIZE = 256; // Icon will be resized to 256x256 pixels
const SUPPORTED_FILE_TYPES = [
  "application/pdf",
  "text/plain",
  "text/markdown",
  "text/x-markdown",
  "application/json",
  "text/csv",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/gif",
  "image/webp",
  "image/bmp",
  "image/tiff",
  "image/svg+xml",
  "image/heic",
  "image/heif",
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/wave",
  "audio/mp4",
  "audio/x-m4a",
  "audio/aac",
  "audio/ogg",
  "audio/webm",
  "audio/flac",
  "audio/x-flac",
  "video/mp4",
  "video/webm",
  "video/ogg",
  "video/quicktime",
];

const SUPPORTED_EXTENSIONS = [
  ".pdf",
  ".txt",
  ".md",
  ".json",
  ".csv",
  ".docx",
  ".xlsx",
  ".xls",
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".bmp",
  ".tiff",
  ".svg",
  ".heic",
  ".heif",
  ".mp3",
  ".wav",
  ".m4a",
  ".aac",
  ".ogg",
  ".webm",
  ".flac",
  ".mp4",
  ".mov",
  ".ogv",
];

const CHAT_ENDPOINT =
  import.meta.env?.VITE_CHAT_API_URL?.replace(/\/$/, "") ||
  "http://localhost:8080/v1/chat/completions";

const readFileAsText = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => reject(reader.error || new Error("Failed to read file"));
    reader.readAsText(file);
  });

function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`custom-shan-tabpanel-${index}`}
      aria-labelledby={`custom-shan-tab-${index}`}
      {...other}
    >
      {value === index && <Box>{children}</Box>}
    </div>
  );
}

function ChatPreview({ formData, iconPreview }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const messagesEndRef = useRef(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingContent, scrollToBottom]);

  // Initialize with starter prompt if available
  useEffect(() => {
    if (formData.starterPrompt && messages.length === 0) {
      setMessages([
        {
          id: "starter",
          role: "assistant",
          content: formData.starterPrompt,
        },
      ]);
    }
  }, [formData.starterPrompt, messages.length]);

  const handleClearChat = () => {
    setMessages([]);
    setStreamingContent("");
    if (formData.starterPrompt) {
      setMessages([
        {
          id: "starter",
          role: "assistant",
          content: formData.starterPrompt,
        },
      ]);
    }
  };

  const handleSendMessage = async () => {
    const trimmed = inputValue.trim();
    if (!trimmed || isLoading) return;

    const userMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: trimmed,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);
    setStreamingContent("");

    try {
      // Build history for context
      const historyPayload = messages
        .filter((msg) => msg.id !== "starter" || messages.length === 1)
        .map((msg) => ({
          role: msg.role,
          content: msg.content,
        }));
      const systemBlocks = [];
      if (formData.systemPrompt) {
        systemBlocks.push({
          role: "system",
          content: formData.systemPrompt,
        });
      }
      if (formData.knowledgeFile && formData.knowledgeFile.type?.startsWith("text/")) {
        try {
          const knowledgeText = await readFileAsText(formData.knowledgeFile);
          if (knowledgeText.trim()) {
            systemBlocks.push({
              role: "system",
              content: `Knowledge Base:\n${knowledgeText.trim()}`,
            });
          }
        } catch (err) {
          console.warn("Failed to read knowledge file for preview", err);
        }
      }
      const fullHistory = [...systemBlocks, ...historyPayload];

      // Use SSE streaming for preview
      const streamUrl = `${CHAT_ENDPOINT}?stream=true`;
      const response = await fetch(streamUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: trimmed,
          history: fullHistory,
          max_tokens: 2048,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Failed to get response");
      }

      const contentType = response.headers.get("content-type") || "";

      // Handle JSON response (non-streaming fallback)
      if (contentType.includes("application/json")) {
        const data = await response.json();
        const assistantContent =
          data.messages?.find((m) => m.role === "assistant")?.content ||
          data.content ||
          "No response";
        setMessages((prev) => [
          ...prev,
          {
            id: `assistant-${Date.now()}`,
            role: "assistant",
            content: assistantContent,
          },
        ]);
        setIsLoading(false);
        return;
      }

      // Handle SSE streaming
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let fullContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;

        const events = buffer.split("\n\n");
        buffer = events.pop() || "";

        for (const eventBlock of events) {
          const lines = eventBlock.split("\n");
          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const jsonStr = line.slice(6).trim();
            if (!jsonStr) continue;

            try {
              const event = JSON.parse(jsonStr);

              if (event.type === "chunk") {
                const chunkText = event.content || "";
                fullContent += chunkText;
                setStreamingContent(fullContent);
              } else if (event.type === "done") {
                fullContent = event.content || fullContent;
              } else if (event.type === "error") {
                throw new Error(event.message || "Stream error");
              }
            } catch (parseErr) {
              console.warn("Failed to parse SSE event:", parseErr);
            }
          }
        }
      }

      reader.releaseLock();

      // Add final assistant message
      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: fullContent,
        },
      ]);
      setStreamingContent("");
    } catch (error) {
      console.error("Preview chat error:", error);
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: "assistant",
          content: `Error: ${error.message}`,
          isError: true,
        },
      ]);
      setStreamingContent("");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const hasSystemPrompt = formData.systemPrompt?.trim();

  return (
    <Box className="chat-preview-container">
      <Box className="chat-preview-header">
        <Box className="chat-preview-title">
          <Avatar
            src={iconPreview}
            alt={formData.name || "Custom Shan"}
            className="chat-preview-avatar"
          >
            {!iconPreview && <BotIcon />}
          </Avatar>
          <Box>
            <Typography variant="subtitle1" fontWeight={600}>
              {formData.name || "Untitled Custom Shan"}
            </Typography>
            <Typography variant="caption" color="textSecondary">
              Live Preview
            </Typography>
          </Box>
        </Box>
        <IconButton
          size="small"
          onClick={handleClearChat}
          title="Clear chat"
          className="chat-preview-clear-btn"
          aria-label="Clear preview chat"
        >
          <RefreshIcon fontSize="small" />
        </IconButton>
      </Box>

      {!hasSystemPrompt && (
        <Alert severity="info" className="chat-preview-alert">
          Add a System Instruction in the Settings tab to see how your Custom Shan
          will behave.
        </Alert>
      )}

      <Box className="chat-preview-messages">
        {messages.map((msg) => (
          <Box
            key={msg.id}
            className={`chat-preview-message ${msg.role === "user" ? "user" : "assistant"} ${msg.isError ? "error" : ""}`}
          >
            {msg.role === "assistant" && (
              <Avatar
                src={iconPreview}
                alt={formData.name}
                className="chat-preview-msg-avatar"
              >
                {!iconPreview && <BotIcon fontSize="small" />}
              </Avatar>
            )}
            <Box className="chat-preview-msg-content">
              <Typography variant="body2">{msg.content}</Typography>
            </Box>
          </Box>
        ))}

        {streamingContent && (
          <Box className="chat-preview-message assistant">
            <Avatar
              src={iconPreview}
              alt={formData.name}
              className="chat-preview-msg-avatar"
            >
              {!iconPreview && <BotIcon fontSize="small" />}
            </Avatar>
            <Box className="chat-preview-msg-content">
              <Typography variant="body2">{streamingContent}</Typography>
              <span className="streaming-cursor" />
            </Box>
          </Box>
        )}

        {isLoading && !streamingContent && (
          <Box className="chat-preview-message assistant">
            <Avatar
              src={iconPreview}
              alt={formData.name}
              className="chat-preview-msg-avatar"
            >
              {!iconPreview && <BotIcon fontSize="small" />}
            </Avatar>
            <Box className="chat-preview-msg-content loading">
              <CircularProgress size={16} />
              <Typography variant="body2" color="textSecondary">
                Running on 12 H100 GPU
              </Typography>
            </Box>
          </Box>
        )}

        <div ref={messagesEndRef} />
      </Box>

      <Box className="chat-preview-input-container">
        <TextField
          fullWidth
          multiline
          maxRows={4}
          placeholder={hasSystemPrompt ? "Test your Custom Shan..." : "Add a system prompt first..."}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={isLoading || !hasSystemPrompt}
          className="chat-preview-input"
          inputProps={{ 'aria-label': 'Test message' }}
          InputProps={{
            endAdornment: (
              <IconButton
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || isLoading || !hasSystemPrompt}
                color="primary"
                className="chat-preview-send-btn"
                aria-label="Send test message"
              >
                <SendIcon />
              </IconButton>
            ),
          }}
        />
      </Box>
    </Box>
  );
}

export default function CreateCustomShanPage() {
  const navigate = useNavigate();
  const { id: editId } = useParams();
  const { user, token } = useAuth();
  const { createCustomShan, updateCustomShan, fetchCustomShan, selectCustomShan, isLoading } = useCustomShan();
  const fileInputRef = useRef(null);
  const iconInputRef = useRef(null);

  const isEditMode = !!editId;

  const [activeTab, setActiveTab] = useState(0);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    systemPrompt: "",
    starterPrompt: "",
  });
  const [knowledgeFile, setKnowledgeFile] = useState(null);
  const [iconFile, setIconFile] = useState(null);
  const [iconPreview, setIconPreview] = useState(null);
  const [removeIcon, setRemoveIcon] = useState(false);
  const [existingKnowledgeFile, setExistingKnowledgeFile] = useState(null);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);

  // Load existing data in edit mode
  useEffect(() => {
    const loadCustomShan = async () => {
      // Ensure editId, user, and token are all available before fetching
      if (!editId || !user || !token) return;

      setIsLoadingData(true);
      setError(null);

      try {
        const data = await fetchCustomShan(editId);
        if (data) {
          setFormData({
            name: data.name || "",
            description: data.description || "",
            systemPrompt: data.system_prompt || "",
            starterPrompt: data.starter_prompt || "",
          });
          setKnowledgeFile(null);
          setIconFile(null);
          setRemoveIcon(false);
          setIconPreview(data.icon_url || null);
          if (data.has_knowledge_file) {
            setExistingKnowledgeFile(data.knowledge_file_name || "Knowledge file attached");
          } else {
            setExistingKnowledgeFile(null);
          }
        } else {
          // fetchCustomShan returned null - likely token issue, will retry
          console.warn("fetchCustomShan returned null, will retry when token is available");
        }
      } catch (err) {
        console.error("Error loading custom shan:", err);
        setError("Failed to load Custom Shan data");
      } finally {
        setIsLoadingData(false);
      }
    };

    loadCustomShan();
  }, [editId, user, token, fetchCustomShan]);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleInputChange = (field) => (event) => {
    setFormData((prev) => ({
      ...prev,
      [field]: event.target.value,
    }));
    setError(null);
  };

  const handleFileSelect = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      setError(`File size exceeds maximum of ${MAX_FILE_SIZE / (1024 * 1024)} MB`);
      return;
    }

    // Validate file type
    const isValidType = SUPPORTED_FILE_TYPES.includes(file.type) ||
      SUPPORTED_EXTENSIONS.some((ext) => file.name.toLowerCase().endsWith(ext));

    if (!isValidType) {
      setError(`Unsupported file type. Supported: ${SUPPORTED_EXTENSIONS.join(", ")}`);
      return;
    }

    setKnowledgeFile(file);
    setError(null);
  };

  const handleRemoveFile = () => {
    setKnowledgeFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const resizeImage = (file, maxSize) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      img.onload = () => {
        // Calculate new dimensions (square, centered crop)
        let srcX = 0, srcY = 0, srcSize = Math.min(img.width, img.height);

        // Center the crop
        if (img.width > img.height) {
          srcX = (img.width - srcSize) / 2;
        } else {
          srcY = (img.height - srcSize) / 2;
        }

        // Set canvas to target size
        canvas.width = maxSize;
        canvas.height = maxSize;

        // Draw resized image
        ctx.drawImage(img, srcX, srcY, srcSize, srcSize, 0, 0, maxSize, maxSize);

        // Convert to blob
        canvas.toBlob(
          (blob) => {
            if (blob) {
              // Create a new File from the blob
              const resizedFile = new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });
              resolve({ file: resizedFile, dataUrl: canvas.toDataURL('image/jpeg', 0.9) });
            } else {
              reject(new Error('Failed to resize image'));
            }
          },
          'image/jpeg',
          0.9
        );
      };

      img.onerror = () => reject(new Error('Failed to load image'));

      // Load the image
      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target.result;
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  };

  const handleIconSelect = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type (images only)
    if (!file.type.startsWith("image/")) {
      setError("Icon must be an image file (PNG, JPG, GIF, etc.)");
      return;
    }

    setError(null);

    try {
      // Auto-resize the image to icon size
      const { file: resizedFile, dataUrl } = await resizeImage(file, MAX_ICON_SIZE);
      setIconFile(resizedFile);
      setIconPreview(dataUrl);
      setRemoveIcon(false);
    } catch (err) {
      console.error('Error resizing image:', err);
      setError("Failed to process image. Please try another file.");
    }
  };

  const handleRemoveIcon = () => {
    setIconFile(null);
    setIconPreview(null);
    setRemoveIcon(isEditMode);
    if (iconInputRef.current) {
      iconInputRef.current.value = "";
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!formData.name.trim()) {
      setError("Name is required");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      let result;

      if (isEditMode) {
        // Update existing Custom Shan
        const updates = {
          name: formData.name.trim(),
          description: formData.description.trim(),
          system_prompt: formData.systemPrompt.trim(),
          starter_prompt: formData.starterPrompt.trim(),
        };
        if (knowledgeFile) {
          updates.knowledgeFile = knowledgeFile;
        }
        if (iconFile) {
          updates.iconFile = iconFile;
        }
        if (removeIcon) {
          updates.removeIcon = true;
        }

        result = await updateCustomShan(editId, updates);
        // After edit, go to chat with this Custom Shan
        await selectCustomShan(editId);
        navigate("/chat");
      } else {
        // Create new Custom Shan
        result = await createCustomShan({
          name: formData.name.trim(),
          description: formData.description.trim(),
          systemPrompt: formData.systemPrompt.trim(),
          starterPrompt: formData.starterPrompt.trim(),
          knowledgeFile,
          iconFile,
        });
        // Navigate to chat with the new custom shan
        if (result?.id) {
          await selectCustomShan(result.id);
          navigate("/chat");
        } else {
          navigate("/custom-shan");
        }
      }
    } catch (err) {
      setError(err.message || `Failed to ${isEditMode ? "update" : "create"} Custom Shan`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    navigate("/custom-shan");
  };

  if (!user) {
    return (
      <Box className="create-custom-shan-page">
        <Alert severity="warning">
          Please log in to {isEditMode ? "edit" : "create"} a Custom Shan.
        </Alert>
      </Box>
    );
  }

  // Show loading state while waiting for token in edit mode, or while loading data
  if (isLoadingData || (isEditMode && !token)) {
    return (
      <Box className="create-custom-shan-page">
        <Box className="loading-container" sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, py: 8 }}>
          <CircularProgress />
          <Typography>Loading Custom Shan data...</Typography>
        </Box>
      </Box>
    );
  }

  return (
    <>
      <Helmet>
        <title>{isEditMode ? "Edit" : "Create"} Custom Shan - Shannon AI</title>
        <meta
          name="description"
          content={isEditMode ? "Edit your personalized AI assistant" : "Create a personalized AI assistant with custom instructions"}
        />
      </Helmet>

      <Box className="create-custom-shan-page with-preview">
        <Box className="page-header">
          <Button
            startIcon={<BackIcon />}
            onClick={handleBack}
            className="back-button"
          >
            Back
          </Button>
          <Typography variant="h4" className="page-title">
            {isEditMode ? "Edit" : "Create"} Custom Shan
          </Typography>
          <Typography variant="body1" className="page-subtitle">
            {isEditMode ? "Update your AI assistant's settings" : "Define your AI assistant's personality and knowledge"}
          </Typography>
        </Box>

        <Paper className="tabs-container" elevation={0}>
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            className="custom-shan-tabs"
            variant="fullWidth"
          >
            <Tab
              icon={<SettingsIcon />}
              iconPosition="start"
              label="Settings"
              className="custom-shan-tab"
            />
            <Tab
              icon={<PlayIcon />}
              iconPosition="start"
              label="Preview"
              className="custom-shan-tab"
            />
          </Tabs>
        </Paper>

        <TabPanel value={activeTab} index={0}>
          <Card className="form-card">
            <CardContent>
              <form onSubmit={handleSubmit}>
                {error && (
                  <Alert severity="error" className="form-error" onClose={() => setError(null)}>
                    {error}
                  </Alert>
                )}

                <Box className="form-section">
                  <Typography variant="h6" className="section-title">
                    Basic Information
                  </Typography>

                  <Box className="icon-upload-section">
                    <input
                      type="file"
                      ref={iconInputRef}
                      onChange={handleIconSelect}
                      accept="image/*"
                      style={{ display: "none" }}
                      disabled={isSubmitting}
                    />
                    <Box className="icon-preview-container">
                      {iconPreview ? (
                        <Box className="icon-preview-wrapper">
                          <Avatar
                            src={iconPreview}
                            alt="Custom Shan icon"
                            className="icon-preview"
                            sx={{ width: 80, height: 80 }}
                          />
                          <IconButton
                            className="icon-remove-btn"
                            size="small"
                            onClick={handleRemoveIcon}
                            disabled={isSubmitting}
                            aria-label="Remove custom icon"
                          >
                            <CloseIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      ) : (
                        <Box
                          className="icon-placeholder"
                          component="button"
                          type="button"
                          onClick={() => iconInputRef.current?.click()}
                          aria-label="Upload custom icon"
                        >
                          <BotIcon className="icon-placeholder-icon" />
                          <AddPhotoIcon className="icon-add-badge" />
                        </Box>
                      )}
                    </Box>
                    <Box className="icon-upload-info">
                      <Typography variant="body2" className="icon-upload-label">
                        Custom Icon
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        Upload an image (auto-resized to 256x256)
                      </Typography>
                      {!iconPreview && (
                        <Button
                          size="small"
                          onClick={() => iconInputRef.current?.click()}
                          disabled={isSubmitting}
                          className="icon-upload-btn"
                        >
                          Upload Icon
                        </Button>
                      )}
                    </Box>
                  </Box>

                  <TextField
                    label="Name"
                    placeholder="e.g., Travel Guide, Coding Assistant, Writing Coach"
                    value={formData.name}
                    onChange={handleInputChange("name")}
                    fullWidth
                    required
                    className="form-field"
                    disabled={isSubmitting}
                  />

                  <TextField
                    label="Description"
                    placeholder="A brief description of what this assistant does"
                    value={formData.description}
                    onChange={handleInputChange("description")}
                    fullWidth
                    multiline
                    rows={2}
                    className="form-field"
                    disabled={isSubmitting}
                  />
                </Box>

                <Box className="form-section">
                  <Typography variant="h6" className="section-title">
                    Instructions
                  </Typography>

                  <TextField
                    label="System Instructions"
                    placeholder="Define how the AI should behave, its tone, personality, and any restrictions. For example: 'You are a friendly travel guide who specializes in European destinations. Always provide practical tips and local recommendations.'"
                    value={formData.systemPrompt}
                    onChange={handleInputChange("systemPrompt")}
                    fullWidth
                    multiline
                    rows={6}
                    className="form-field"
                    disabled={isSubmitting}
                    helperText="These instructions will guide how the AI responds in conversations"
                  />

                  <TextField
                    label="Conversation Starter (Optional)"
                    placeholder="e.g., 'Hi! I'm your travel guide. Where would you like to explore today?'"
                    value={formData.starterPrompt}
                    onChange={handleInputChange("starterPrompt")}
                    fullWidth
                    multiline
                    rows={2}
                    className="form-field"
                    disabled={isSubmitting}
                    helperText="The AI will use this to start the conversation"
                  />
                </Box>

                <Box className="form-section">
                  <Typography variant="h6" className="section-title">
                    Knowledge File (Optional)
                  </Typography>
                  <Typography variant="body2" color="textSecondary" className="section-description">
                    Upload a file with domain-specific content the AI can reference.
                    Supported formats: PDF, TXT, MD, JSON, CSV, DOCX, XLSX, images, audio, video (max 10 MB)
                  </Typography>

                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    accept={SUPPORTED_EXTENSIONS.join(",")}
                    style={{ display: "none" }}
                    disabled={isSubmitting}
                  />

                  {knowledgeFile ? (
                    <Box className="file-preview">
                      <Chip
                        icon={<FileIcon />}
                        label={knowledgeFile.name}
                        onDelete={handleRemoveFile}
                        deleteIcon={<CloseIcon />}
                        className="file-chip"
                      />
                      <Typography variant="caption" color="textSecondary">
                        {(knowledgeFile.size / 1024).toFixed(1)} KB
                      </Typography>
                    </Box>
                  ) : existingKnowledgeFile ? (
                    <Box className="file-preview">
                      <Chip
                        icon={<FileIcon />}
                        label={existingKnowledgeFile}
                        className="file-chip"
                        color="primary"
                        variant="outlined"
                      />
                      <Typography variant="caption" color="textSecondary" sx={{ ml: 1 }}>
                        (existing file)
                      </Typography>
                      <Button
                        size="small"
                        startIcon={<UploadIcon />}
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isSubmitting}
                        sx={{ ml: 2 }}
                      >
                        Replace
                      </Button>
                    </Box>
                  ) : (
                    <Button
                      variant="outlined"
                      startIcon={<UploadIcon />}
                      onClick={() => fileInputRef.current?.click()}
                      className="upload-button"
                      disabled={isSubmitting}
                    >
                      Upload Knowledge File
                    </Button>
                  )}
                </Box>

                <Box className="form-actions">
                  <Button
                    variant="outlined"
                    onClick={handleBack}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="contained"
                    color="primary"
                    disabled={isSubmitting || !formData.name.trim()}
                    startIcon={isSubmitting ? <CircularProgress size={16} /> : null}
                    className="submit-button"
                  >
                    {isSubmitting
                      ? (isEditMode ? "Saving..." : "Creating...")
                      : (isEditMode ? "Save Changes" : "Create Custom Shan")}
                  </Button>
                </Box>
              </form>
            </CardContent>
          </Card>
        </TabPanel>

        <TabPanel value={activeTab} index={1}>
          <Card className="form-card preview-card">
            <CardContent sx={{ p: 0, "&:last-child": { pb: 0 } }}>
              <ChatPreview formData={formData} iconPreview={iconPreview} />
            </CardContent>
          </Card>
        </TabPanel>
      </Box>
    </>
  );
}
