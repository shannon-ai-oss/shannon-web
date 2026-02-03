/**
 * Formatting utilities for the application
 */

const MICRO_FACTOR = 1_000_000;

const microUsdFormatter = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 6,
});

/**
 * Formats micro USD value to standard USD string
 * @param {number} microValue - Value in micro USD
 * @returns {string|null} Formatted USD string or null if invalid
 */
export const formatMicroUsd = (microValue) => {
  if (!Number.isFinite(microValue)) {
    return null;
  }
  return microUsdFormatter.format(microValue / MICRO_FACTOR);
};

/**
 * Formats file size in bytes to human-readable string
 * @param {number} bytes - File size in bytes
 * @returns {string} Formatted file size string
 */
export const formatFileSize = (bytes) => {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return '0 B';
  }
  const thresh = 1024;
  if (bytes < thresh) {
    return `${bytes} B`;
  }
  const units = ['KB', 'MB', 'GB'];
  let unitIndex = -1;
  let value = bytes;
  do {
    value /= thresh;
    unitIndex += 1;
  } while (value >= thresh && unitIndex < units.length - 1);
  const rounded = value >= 10 || unitIndex === 0 ? Math.round(value) : value.toFixed(1);
  return `${rounded} ${units[unitIndex]}`;
};

/**
 * Coerces a value to a valid token count (non-negative integer)
 * @param {*} value - Value to coerce
 * @returns {number|null} Coerced token count or null if invalid
 */
export const coerceTokenCount = (value) =>
  typeof value === 'number' && Number.isFinite(value)
    ? Math.max(0, Math.round(value))
    : null;
