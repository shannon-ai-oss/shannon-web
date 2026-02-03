import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import AudiotrackIcon from '@mui/icons-material/Audiotrack';
import SlideshowIcon from '@mui/icons-material/Slideshow';
import ImageIcon from '@mui/icons-material/Image';
import VideoLibraryIcon from '@mui/icons-material/VideoLibrary';
import DescriptionIcon from '@mui/icons-material/Description';
import SummarizeIcon from '@mui/icons-material/Summarize';
import { uploadFile } from '../api/client';
import { formatFileSize } from '../utils/formatting';
import { useAuth } from '@/context/AuthContext';
import './FileUpload.css';

const PREVIEW_HEIGHT = 420;
const TABLE_ROW_LIMIT = 50;
const TABLE_COLUMN_LIMIT = 40;

function resolvePreviewIcon(kind) {
  switch (kind) {
    case 'image':
      return <ImageIcon fontSize="small" />;
    case 'audio':
      return <AudiotrackIcon fontSize="small" />;
    case 'video':
      return <VideoLibraryIcon fontSize="small" />;
    case 'pdf':
      return <DescriptionIcon fontSize="small" />;
    case 'table':
      return <SlideshowIcon fontSize="small" />;
    default:
      return <InsertDriveFileIcon fontSize="small" />;
  }
}

function toAbsoluteUrl(path) {
  if (!path) {
    return null;
  }
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  return `${window.location.origin}${path}`;
}

const FileUpload = () => {
  const { token } = useAuth();
  const inputRef = useRef(null);
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [objectUrl, setObjectUrl] = useState(null);

  useEffect(() => {
    if (!selectedFile) {
      setObjectUrl(null);
      return undefined;
    }
    if (
      selectedFile.type.startsWith('image/')
      || selectedFile.type.startsWith('audio/')
      || selectedFile.type.startsWith('video/')
      || selectedFile.type === 'application/pdf'
    ) {
      const url = URL.createObjectURL(selectedFile);
      setObjectUrl(url);
      return () => {
        URL.revokeObjectURL(url);
      };
    }
    setObjectUrl(null);
    return undefined;
  }, [selectedFile]);

  const handleUpload = useCallback(
    async (file) => {
      if (!file) {
        return;
      }
      setUploading(true);
      setError(null);
      try {
        const response = await uploadFile(token, file);
        setResult(response);
      } catch (err) {
        const message = err?.message || 'Upload failed';
        setError(message);
        setResult(null);
      } finally {
        setUploading(false);
      }
    },
    [token],
  );

  const handleFileList = useCallback(
    (files) => {
      if (!files || files.length === 0) {
        return;
      }
      const file = files[0];
      setSelectedFile(file);
      setResult(null);
      void handleUpload(file);
    },
    [handleUpload],
  );

  const handleBrowseClick = () => {
    if (inputRef.current) {
      inputRef.current.value = '';
      inputRef.current.click();
    }
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (event) => {
    event.preventDefault();
    setDragActive(false);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setDragActive(false);
    if (event.dataTransfer?.files?.length) {
      handleFileList(event.dataTransfer.files);
    }
  };

  const preview = result?.preview || null;
  const resolvedPreviewUrl = useMemo(() => {
    if (!preview?.url) {
      return objectUrl;
    }
    return toAbsoluteUrl(preview.url);
  }, [preview, objectUrl]);

  const renderTextPreview = (text, truncated) => (
    <Box className="file-upload-text-preview">
      <pre>{text || 'No content detected in file.'}</pre>
      {truncated && (
        <Typography variant="caption" color="text.secondary" className="file-upload-truncated">
          Preview truncated for brevity.
        </Typography>
      )}
    </Box>
  );

  const renderTablePreview = (tablePreview) => {
    const headers = Array.isArray(tablePreview.headers) ? tablePreview.headers : [];
    const rows = Array.isArray(tablePreview.rows) ? tablePreview.rows : [];

    return (
      <Box className="file-upload-table">
        {tablePreview.sheet_name && (
          <Typography variant="subtitle2" className="file-upload-table-title">
            {tablePreview.sheet_name}
          </Typography>
        )}
        <Table size="small" stickyHeader aria-label="preview table">
          {headers.length > 0 && (
            <TableHead>
              <TableRow>
                {headers.map((header, idx) => (
                  <TableCell key={`header-${idx}`}>{header}</TableCell>
                ))}
              </TableRow>
            </TableHead>
          )}
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={Math.max(headers.length, 1)}>
                  No rows available for preview.
                </TableCell>
              </TableRow>
            )}
            {rows.map((row, rowIndex) => (
              <TableRow key={`row-${rowIndex}`}>
                {row.map((value, cellIndex) => (
                  <TableCell key={`cell-${rowIndex}-${cellIndex}`}>{value}</TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {tablePreview.truncated && (
          <Typography variant="caption" color="text.secondary" className="file-upload-truncated">
            Preview limited to first
            {' '}
            {TABLE_ROW_LIMIT}
            {' '}
            rows and
            {' '}
            {TABLE_COLUMN_LIMIT}
            {' '}
            columns.
          </Typography>
        )}
      </Box>
    );
  };

  const renderPreview = () => {
    if (!preview) {
      return (
        <Typography variant="body2" color="text.secondary">
          Preview unavailable for this file type.
        </Typography>
      );
    }

    switch (preview.kind) {
      case 'image':
        return resolvedPreviewUrl ? (
          <img
            src={resolvedPreviewUrl}
            alt="Uploaded preview"
            className="file-upload-image"
            style={{ maxHeight: PREVIEW_HEIGHT }}
            loading="lazy"
            decoding="async"
          />
        ) : (
          <Typography>No preview image available.</Typography>
        );
      case 'audio':
        return resolvedPreviewUrl ? (
          <audio
            controls
            src={resolvedPreviewUrl}
            className="file-upload-audio"
            preload="metadata"
          >
            Your browser does not support audio playback.
          </audio>
        ) : (
          <Typography>No audio preview available.</Typography>
        );
      case 'video':
        return resolvedPreviewUrl ? (
          <video
            controls
            src={resolvedPreviewUrl}
            className="file-upload-video"
            style={{ maxHeight: PREVIEW_HEIGHT }}
            preload="metadata"
          >
            Your browser does not support video playback.
          </video>
        ) : (
          <Typography>No video preview available.</Typography>
        );
      case 'pdf':
        return resolvedPreviewUrl ? (
          <iframe
            title="PDF preview"
            src={resolvedPreviewUrl}
            className="file-upload-pdf"
            style={{ height: PREVIEW_HEIGHT }}
            loading="lazy"
          />
        ) : (
          renderTextPreview(preview.text, preview.truncated)
        );
      case 'table':
        return renderTablePreview(preview);
      case 'text':
        return renderTextPreview(preview.text, preview.truncated);
      default:
        return (
          <Typography variant="body2" color="text.secondary">
            Download to view this file:
            {' '}
            {resolvedPreviewUrl ? (
              <a href={resolvedPreviewUrl} target="_blank" rel="noopener noreferrer">
                {result?.file?.filename || 'Download'}
              </a>
            ) : (
              'Preview unavailable.'
            )}
          </Typography>
        );
    }
  };

  const fileDetails = useMemo(() => {
    const targetFile = result?.file || selectedFile;
    if (!targetFile) {
      return null;
    }
    const size = formatFileSize(targetFile.size_bytes ?? targetFile.size ?? 0);
    const type = targetFile.content_type || targetFile.type || 'unknown';
    return (
      <Box className="file-upload-details">
        <Typography variant="subtitle1" className="file-upload-details-title">
          {targetFile.filename || targetFile.name}
        </Typography>
        <Box className="file-upload-detail-row">
          <Chip label={size} size="small" variant="outlined" />
          <Chip label={type} size="small" variant="outlined" />
          {result?.file?.download_url && (
            <Chip
              component="a"
              href={toAbsoluteUrl(result.file.download_url)}
              target="_blank"
              rel="noopener noreferrer"
              clickable
              label="Download"
              size="small"
              icon={<InsertDriveFileIcon fontSize="small" />}
            />
          )}
          {preview?.kind && (
            <Chip
              label={preview.kind.toUpperCase()}
              size="small"
              icon={resolvePreviewIcon(preview.kind)}
            />
          )}
        </Box>
      </Box>
    );
  }, [preview?.kind, result, selectedFile]);

  return (
    <Paper className="file-upload-container" elevation={3}>
      <Box className="file-upload-header">
        <Typography variant="h6">Upload a File</Typography>
        <Typography variant="body2" color="text.secondary">
          Supported files include text, documents, spreadsheets, images, audio, and video.
        </Typography>
      </Box>
      <Paper
        variant="outlined"
        className={`file-upload-dropzone${dragActive ? ' drag-active' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <CloudUploadIcon fontSize="large" className="file-upload-dropzone-icon" />
        <Typography variant="body1">Drag & drop your file</Typography>
        <Typography variant="body2" color="text.secondary">
          or
          {' '}
          <button type="button" className="file-upload-browse" onClick={handleBrowseClick}>
            browse
          </button>
        </Typography>
        <input
          ref={inputRef}
          type="file"
          className="file-upload-input"
          onChange={(event) => handleFileList(event.target.files)}
        />
      </Paper>

      {uploading && (
        <Box className="file-upload-status">
          <CircularProgress size={20} />
          <Typography variant="body2" color="text.secondary">
            Uploading and processing file…
          </Typography>
        </Box>
      )}

      {error && (
        <Alert severity="error" className="file-upload-alert">
          {error}
        </Alert>
      )}

      {fileDetails}

      {preview && (
        <Paper variant="outlined" className="file-upload-preview">
          <Typography variant="subtitle2" className="file-upload-preview-title">
            File Preview
          </Typography>
          {renderPreview()}
        </Paper>
      )}

      {result?.analysis?.summary && (
        <Paper variant="outlined" className="file-upload-summary">
          <Typography variant="subtitle2" className="file-upload-summary-title">
            <SummarizeIcon fontSize="small" className="file-upload-summary-icon" />
            AI Summary
          </Typography>
          <Typography variant="body2" className="file-upload-summary-text">
            {result.analysis.summary}
          </Typography>
        </Paper>
      )}
    </Paper>
  );
};

export default FileUpload;
