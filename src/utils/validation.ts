/**
 * Validation utilities for form inputs and data
 */

import type { LoginForm, RegisterForm, ValidationError } from '@/types';

/**
 * Validate email format
 */
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate password strength
 */
export const validatePassword = (password: string): {
  isValid: boolean;
  errors: string[];
} => {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }

  if (password.length > 128) {
    errors.push('Password must be less than 128 characters long');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Validate username
 */
export const validateUsername = (username: string): {
  isValid: boolean;
  errors: string[];
} => {
  const errors: string[] = [];

  if (!username) {
    errors.push('Username is required');
    return { isValid: false, errors };
  }

  if (username.length < 3) {
    errors.push('Username must be at least 3 characters long');
  }

  if (username.length > 30) {
    errors.push('Username must be less than 30 characters long');
  }

  if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
    errors.push('Username can only contain letters, numbers, underscores, and hyphens');
  }

  if (!/^[a-zA-Z]/.test(username)) {
    errors.push('Username must start with a letter');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Validate login form
 */
export const validateLoginForm = (data: LoginForm): ValidationError[] => {
  const errors: ValidationError[] = [];

  if (!data.username) {
    errors.push({ field: 'username', message: 'Username or email is required' });
  } else if (data.username.includes('@')) {
    if (!validateEmail(data.username)) {
      errors.push({ field: 'username', message: 'Invalid email format' });
    }
  } else {
    const usernameValidation = validateUsername(data.username);
    if (!usernameValidation.isValid) {
      errors.push(...usernameValidation.errors.map(error => ({
        field: 'username',
        message: error,
      })));
    }
  }

  if (!data.password) {
    errors.push({ field: 'password', message: 'Password is required' });
  }

  return errors;
};

/**
 * Validate registration form
 */
export const validateRegisterForm = (data: RegisterForm): ValidationError[] => {
  const errors: ValidationError[] = [];

  // Username validation
  const usernameValidation = validateUsername(data.username);
  if (!usernameValidation.isValid) {
    errors.push(...usernameValidation.errors.map(error => ({
      field: 'username',
      message: error,
    })));
  }

  // Email validation (optional)
  if (data.email) {
    if (!validateEmail(data.email)) {
      errors.push({ field: 'email', message: 'Invalid email format' });
    }
  }

  // Password validation
  if (!data.password) {
    errors.push({ field: 'password', message: 'Password is required' });
  } else {
    const passwordValidation = validatePassword(data.password);
    if (!passwordValidation.isValid) {
      errors.push(...passwordValidation.errors.map(error => ({
        field: 'password',
        message: error,
      })));
    }
  }

  // Confirm password validation
  if (data.confirmPassword !== undefined) {
    if (!data.confirmPassword) {
      errors.push({ field: 'confirmPassword', message: 'Please confirm your password' });
    } else if (data.password !== data.confirmPassword) {
      errors.push({ field: 'confirmPassword', message: 'Passwords do not match' });
    }
  }

  // Terms agreement validation
  if (data.agreeToTerms === false) {
    errors.push({ field: 'agreeToTerms', message: 'You must agree to the terms of service' });
  }

  return errors;
};

/**
 * Validate chat message
 */
export const validateChatMessage = (message: string): {
  isValid: boolean;
  errors: string[];
} => {
  const errors: string[] = [];

  if (!message || message.trim() === '') {
    errors.push('Message cannot be empty');
  }

  if (message.length > 32000) {
    errors.push('Message is too long (maximum 32,000 characters)');
  }

  const trimmedMessage = message.trim();
  if (trimmedMessage.length < 1) {
    errors.push('Message must contain at least one character');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Validate file upload
 */
export const validateFileUpload = (file: File, maxSize: number = 10 * 1024 * 1024): {
  isValid: boolean;
  errors: string[];
} => {
  const errors: string[] = [];

  if (!file) {
    errors.push('No file provided');
    return { isValid: false, errors };
  }

  if (file.size > maxSize) {
    errors.push(`File size exceeds limit of ${formatFileSize(maxSize)}`);
  }

  if (file.size === 0) {
    errors.push('File is empty');
  }

  // Check for potentially dangerous file types
  const dangerousExtensions = ['.exe', '.bat', '.cmd', '.scr', '.pif', '.com'];
  const fileName = file.name.toLowerCase();
  const hasDangerousExtension = dangerousExtensions.some(ext => fileName.endsWith(ext));

  if (hasDangerousExtension) {
    errors.push('File type not allowed');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Validate chat settings
 */
export const validateChatSettings = (settings: any): ValidationError[] => {
  const errors: ValidationError[] = [];

  if (settings.temperature !== undefined) {
    if (typeof settings.temperature !== 'number' ||
        settings.temperature < 0 ||
        settings.temperature > 2) {
      errors.push({
        field: 'temperature',
        message: 'Temperature must be a number between 0 and 2',
      });
    }
  }

  if (settings.maxTokens !== undefined) {
    if (typeof settings.maxTokens !== 'number' ||
        settings.maxTokens < 1 ||
        settings.maxTokens > 32768) {
      errors.push({
        field: 'maxTokens',
        message: 'Max tokens must be a number between 1 and 32768',
      });
    }
  }

  if (settings.systemPrompt !== undefined) {
    if (typeof settings.systemPrompt !== 'string') {
      errors.push({
        field: 'systemPrompt',
        message: 'System prompt must be a string',
      });
    } else if (settings.systemPrompt.length > 4000) {
      errors.push({
        field: 'systemPrompt',
        message: 'System prompt is too long (maximum 4000 characters)',
      });
    }
  }

  return errors;
};

/**
 * Validate memory settings
 */
export const validateMemorySettings = (settings: any): ValidationError[] => {
  const errors: ValidationError[] = [];

  if (settings.maxTokens !== undefined) {
    if (typeof settings.maxTokens !== 'number' ||
        settings.maxTokens < 128 ||
        settings.maxTokens > 4096) {
      errors.push({
        field: 'maxTokens',
        message: 'Memory max tokens must be a number between 128 and 4096',
      });
    }
  }

  if (settings.memoryText !== undefined) {
    if (typeof settings.memoryText !== 'string') {
      errors.push({
        field: 'memoryText',
        message: 'Memory text must be a string',
      });
    } else if (settings.memoryText.length > 10000) {
      errors.push({
        field: 'memoryText',
        message: 'Memory text is too long (maximum 10,000 characters)',
      });
    }
  }

  return errors;
};

/**
 * Sanitize user input
 */
export const sanitizeInput = (input: string): string => {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .slice(0, 10000); // Limit length
};

/**
 * Check if string contains potentially malicious content
 */
export const containsMaliciousContent = (input: string): boolean => {
  const maliciousPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /data:text\/html/i,
    /vbscript:/i,
  ];

  return maliciousPatterns.some(pattern => pattern.test(input));
};

/**
 * Validate URL
 */
export const validateUrl = (url: string): boolean => {
  try {
    const urlObj = new URL(url);
    return ['http:', 'https:'].includes(urlObj.protocol);
  } catch {
    return false;
  }
};

/**
 * Helper function to format file size (used in validation messages)
 */
const formatFileSize = (bytes: number): string => {
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 Bytes';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
};

/**
 * Check if field is required and not empty
 */
export const validateRequired = (value: any, fieldName: string): ValidationError | null => {
  if (value === null || value === undefined || value === '') {
    return {
      field: fieldName,
      message: `${fieldName} is required`,
    };
  }
  return null;
};

/**
 * Validate string length
 */
export const validateLength = (
  value: string,
  fieldName: string,
  minLength: number,
  maxLength: number
): ValidationError | null => {
  if (value.length < minLength) {
    return {
      field: fieldName,
      message: `${fieldName} must be at least ${minLength} characters long`,
    };
  }

  if (value.length > maxLength) {
    return {
      field: fieldName,
      message: `${fieldName} must be less than ${maxLength} characters long`,
    };
  }

  return null;
};

/**
 * Validate numeric range
 */
export const validateRange = (
  value: number,
  fieldName: string,
  min: number,
  max: number
): ValidationError | null => {
  if (typeof value !== 'number' || isNaN(value)) {
    return {
      field: fieldName,
      message: `${fieldName} must be a valid number`,
    };
  }

  if (value < min || value > max) {
    return {
      field: fieldName,
      message: `${fieldName} must be between ${min} and ${max}`,
    };
  }

  return null;
};
