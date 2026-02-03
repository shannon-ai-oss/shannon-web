import { useState, useRef, useCallback, useMemo } from 'react';
import type { Attachment } from '@/types';
import { apiClient } from '@/api/client';
import { getMaxUploadSizeForPlan, FILE_UPLOAD_LIMITS_MB } from '@/utils/fileHelpers';

interface UseAttachmentsOptions {
  token?: string | null;
  maxFiles?: number;
  maxSize?: number; // in bytes (overrides plan-based limit if provided)
  planSlug?: string; // user's plan slug for plan-based limits
}

interface UseAttachmentsReturn {
  attachments: Attachment[];
  attachmentError: string | null;
  fileInputRef: React.RefObject<HTMLInputElement>;
  handleAttachmentButtonClick: () => void;
  handleAttachmentChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  handleRemoveAttachment: (id: string) => void;
  clearAttachments: () => void;
  setAttachmentError: (error: string | null) => void;
  setAttachments: (attachments: Attachment[]) => void;
  maxFileSizeBytes: number;
  maxFileSizeMB: number;
}

export const useAttachments = ({
  token,
  maxFiles = 10,
  maxSize,
  planSlug = 'free',
}: UseAttachmentsOptions = {}): UseAttachmentsReturn => {
  // Get max file size based on user's plan (or use explicit maxSize if provided)
  const maxFileSizeBytes = useMemo(() => {
    if (maxSize !== undefined) return maxSize;
    return getMaxUploadSizeForPlan(planSlug);
  }, [maxSize, planSlug]);

  const maxFileSizeMB = useMemo(() => {
    const normalized = typeof planSlug === 'string' ? planSlug.toLowerCase() : 'free';
    return (FILE_UPLOAD_LIMITS_MB as Record<string, number>)[normalized] ?? FILE_UPLOAD_LIMITS_MB.free;
  }, [planSlug]);

  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const INLINE_BINARY_LIMIT = Math.min(maxFileSizeBytes, 4 * 1024 * 1024); // keep inline payloads reasonable

  const handleAttachmentButtonClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const processFile = useCallback(async (file: File): Promise<Attachment> => {
    const attachment: Attachment = {
      id: `temp-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      name: file.name,
      type: file.type,
      size: file.size,
      url: '',
      status: 'loading',
      uploadedAt: new Date().toISOString(),
    };

    // Add to attachments immediately with loading status
    setAttachments(prev => [...prev, attachment]);

    try {
      // Check file size
      if (file.size > maxFileSizeBytes) {
        throw new Error(`File size exceeds ${maxFileSizeMB}MB limit for your plan`);
      }

      // Check if file is text
      const isText = file.type.startsWith('text/') ||
                     file.name.endsWith('.txt') ||
                     file.name.endsWith('.md') ||
                     file.name.endsWith('.js') ||
                     file.name.endsWith('.ts') ||
                     file.name.endsWith('.jsx') ||
                     file.name.endsWith('.tsx') ||
                     file.name.endsWith('.py') ||
                     file.name.endsWith('.json') ||
                     file.name.endsWith('.xml') ||
                     file.name.endsWith('.csv');

      let content = '';
      let preview: Attachment['preview'] = null;
      let dataUrl: string | null = null;

      // Read file content if it's text and small enough
      if (isText && file.size <= 1024 * 1024) { // 1MB limit for inline content
        content = await readFileContent(file);
        preview = {
          kind: 'text' as const,
          text: content.slice(0, 500), // Preview first 500 chars
        };
      } else if (!isText && file.size <= INLINE_BINARY_LIMIT) {
        try {
          dataUrl = await readFileDataUrl(file);
          if (file.type.startsWith('image/') && dataUrl) {
            preview = {
              kind: 'image',
              url: dataUrl,
            };
          }
        } catch (err) {
          console.warn('Unable to build data URL for attachment', err);
        }
      }

      // Upload file if token is available
      if (token) {
        const uploadResponse = await apiClient.uploadFile(token, file);

        const updatedAttachment: Attachment = {
          ...attachment,
          id: uploadResponse.id,
          url: uploadResponse.download_url,
          remoteId: uploadResponse.id,
          storageKey: uploadResponse.storage_key,
          isText: uploadResponse.is_text,
          textContent: uploadResponse.text_content,
          truncated: uploadResponse.truncated,
          status: 'ready',
        };
        if (!uploadResponse.download_url && dataUrl) {
          updatedAttachment.dataUrl = dataUrl;
        }
        if (preview) {
          updatedAttachment.preview = preview;
        }

        // Update attachment in state
        setAttachments(prev => prev.map(a => a.id === attachment.id ? updatedAttachment : a));
        return updatedAttachment;
      } else {
        // Fallback for when no token is available
        const updatedAttachment: Attachment = {
          ...attachment,
          isText,
          content,
          preview,
          dataUrl: dataUrl ?? null,
          status: 'ready',
        };

        setAttachments(prev => prev.map(a => a.id === attachment.id ? updatedAttachment : a));
        return updatedAttachment;
      }
    } catch (error) {
      console.error('Failed to process file:', error);

      const errorMessage = error instanceof Error ? error.message : 'Failed to process file';

      const failedAttachment: Attachment = {
        ...attachment,
        status: 'error',
        error: errorMessage,
      };

      setAttachments(prev => prev.map(a => a.id === attachment.id ? failedAttachment : a));
      setAttachmentError(errorMessage);

      throw error;
    }
  }, [token, maxFileSizeBytes, maxFileSizeMB, setAttachmentError]);

  const handleAttachmentChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);

    if (files.length === 0) return;

    // Validate number of files
    if (attachments.length + files.length > maxFiles) {
      setAttachmentError(`Maximum ${maxFiles} files allowed`);
      return;
    }

    // Validate each file
    const validFiles = files.filter(file => {
      if (file.size > maxFileSizeBytes) {
        setAttachmentError(`File ${file.name} exceeds ${maxFileSizeMB}MB limit for your plan`);
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) return;

    setAttachmentError(null);

    try {
      // Process all files
      await Promise.all(validFiles.map(file => processFile(file)));
    } catch (error) {
      // Error handling is done in processFile
      console.error('Some files failed to process:', error);
    }

    // Clear the input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [attachments.length, maxFiles, maxFileSizeBytes, maxFileSizeMB, processFile, setAttachmentError]);

  const handleRemoveAttachment = useCallback((id: string) => {
    setAttachments(prev => prev.filter(attachment => attachment.id !== id));
    setAttachmentError(null);
  }, [setAttachmentError]);

  const clearAttachments = useCallback(() => {
    setAttachments([]);
    setAttachmentError(null);
  }, [setAttachments, setAttachmentError]);

  return {
    attachments,
    attachmentError,
    fileInputRef,
    handleAttachmentButtonClick,
    handleAttachmentChange,
    handleRemoveAttachment,
    clearAttachments,
    setAttachmentError,
    setAttachments,
    maxFileSizeBytes,
    maxFileSizeMB,
  };
};

// Helper function to read file content
const readFileContent = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result;
      if (typeof result === 'string') {
        resolve(result);
      } else {
        reject(new Error('Failed to read file content'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
};

const readFileDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result;
      if (typeof result === 'string') {
        resolve(result);
      } else {
        reject(new Error('Failed to read file as data URL'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file as data URL'));
    reader.readAsDataURL(file);
  });
};

// Helper function to format file size
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};
