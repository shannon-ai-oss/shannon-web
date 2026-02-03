/**
 * File handling utilities type declarations
 */

export const MAX_ATTACHMENT_BYTES: number;
export const MAX_ATTACHMENT_CHARS: number;
export const MAX_ATTACHMENTS: number;

export const FILE_UPLOAD_LIMITS: {
  free: number;
  starter: number;
  plus: number;
  pro: number;
};

export const FILE_UPLOAD_LIMITS_MB: {
  free: number;
  starter: number;
  plus: number;
  pro: number;
};

export const TEXT_MIME_PREFIXES: string[];
export const TEXT_EXTENSIONS: string[];

export function getMaxUploadSizeForPlan(planSlug: string): number;
export function isProbablyTextFile(file: File): boolean;
