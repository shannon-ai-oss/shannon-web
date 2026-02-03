import React from 'react';
import {
  Box,
  CircularProgress,
  LinearProgress,
  Typography,
  Skeleton,
  Card,
  CardContent,
  Avatar,
  Chip,
} from '@mui/material';
import {
  Psychology as ThinkingIcon,
  CloudUpload as UploadingIcon,
  Search as SearchingIcon,
  Code as ProcessingIcon,
} from '@mui/icons-material';

interface LoadingStateProps {
  type?: 'spinner' | 'linear' | 'skeleton' | 'dots';
  size?: 'small' | 'medium' | 'large';
  message?: string;
  fullScreen?: boolean;
  className?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  type = 'spinner',
  size = 'medium',
  message,
  fullScreen = false,
  className = '',
}) => {
  const getSizeValue = () => {
    switch (size) {
      case 'small': return 24;
      case 'medium': return 40;
      case 'large': return 64;
      default: return 40;
    }
  };

  const getSpinnerColor = () => {
    return size === 'large' ? 'primary' : 'secondary';
  };

  const renderContent = () => {
    switch (type) {
      case 'spinner':
        return (
          <Box className={`loading-spinner ${className}`}>
            <CircularProgress
              size={getSizeValue()}
              color={getSpinnerColor() as any}
              thickness={size === 'small' ? 4 : 3}
            />
            {message && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                {message}
              </Typography>
            )}
          </Box>
        );

      case 'linear':
        return (
          <Box className={`loading-linear ${className}`}>
            <LinearProgress
              sx={{
                height: size === 'small' ? 2 : size === 'large' ? 6 : 4,
                borderRadius: 2,
              }}
            />
            {message && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                {message}
              </Typography>
            )}
          </Box>
        );

      case 'dots':
        return (
          <Box className={`loading-dots ${className}`}>
            <Box className="dots-container">
              <span className="dot" />
              <span className="dot" />
              <span className="dot" />
            </Box>
            {message && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                {message}
              </Typography>
            )}
          </Box>
        );

      default:
        return null;
    }
  };

  if (fullScreen) {
    return (
      <Box
        className={`loading-fullscreen ${className}`}
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          bgcolor: 'background.paper',
          zIndex: 9999,
        }}
      >
        {renderContent()}
      </Box>
    );
  }

  return (
    <Box className={`loading-container ${className}`} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {renderContent()}
    </Box>
  );
};

// Message Loading State
export const MessageLoadingState: React.FC<{
  message?: string;
  showIcon?: boolean;
}> = ({ message = 'Thinking...', showIcon = true }) => {
  return (
    <Box className="message-loading-state">
      <Box className="message-loading-content">
        {showIcon && (
          <Box className="message-loading-icon">
            <ThinkingIcon className="thinking-icon" />
          </Box>
        )}
        <Box className="message-loading-text">
          <Typography variant="body2" color="text.secondary">
            {message}
          </Typography>
          <Box className="thinking-dots">
            <span />
            <span />
            <span />
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

// Chat Loading State
export const ChatLoadingState: React.FC<{
  message?: string;
}> = ({ message = 'Loading conversation...' }) => {
  return (
    <Box className="chat-loading-state">
      <Card variant="outlined" sx={{ mb: 2 }}>
        <CardContent>
          <Box className="chat-loading-content">
            <Skeleton variant="circular" width={40} height={40} />
            <Box className="chat-loading-message">
              <Skeleton variant="text" width="60%" height={20} />
              <Skeleton variant="text" width="80%" height={16} />
              <Skeleton variant="text" width="70%" height={16} />
            </Box>
          </Box>
        </CardContent>
      </Card>
      <Box sx={{ display: 'flex', justifyContent: 'center' }}>
        <LoadingState type="dots" message={message} />
      </Box>
    </Box>
  );
};

// File Upload Loading State
export const FileUploadLoadingState: React.FC<{
  fileName: string;
  progress?: number;
}> = ({ fileName, progress }) => {
  return (
    <Box className="file-upload-loading">
      <Box className="file-upload-content">
        <UploadingIcon className="upload-icon" />
        <Box className="file-upload-info">
          <Typography variant="body2" fontWeight="medium">
            {fileName}
          </Typography>
          {progress !== undefined ? (
            <Box className="upload-progress">
              <LinearProgress
                variant="determinate"
                value={progress}
                sx={{ mt: 1 }}
              />
              <Typography variant="caption" color="text.secondary">
                {Math.round(progress)}%
              </Typography>
            </Box>
          ) : (
            <Typography variant="body2" color="text.secondary">
              Uploading...
            </Typography>
          )}
        </Box>
      </Box>
    </Box>
  );
};

// Search Loading State
export const SearchLoadingState: React.FC<{
  message?: string;
}> = ({ message = 'Searching...' }) => {
  return (
    <Box className="search-loading-state">
      <Box className="search-loading-content">
        <SearchingIcon className="search-icon" />
        <Typography variant="body2" color="text.secondary">
          {message}
        </Typography>
        <LoadingState type="dots" size="small" />
      </Box>
    </Box>
  );
};

// Processing Loading State
export const ProcessingLoadingState: React.FC<{
  message?: string;
  steps?: string[];
  currentStep?: number;
}> = ({ message = 'Processing...', steps = [], currentStep = 0 }) => {
  return (
    <Box className="processing-loading-state">
      <Box className="processing-content">
        <ProcessingIcon className="processing-icon" />
        <Typography variant="body1" fontWeight="medium" sx={{ mb: 2 }}>
          {message}
        </Typography>

        {steps.length > 0 && (
          <Box className="processing-steps">
            {steps.map((step, index) => (
              <Box
                key={index}
                className={`processing-step ${index <= currentStep ? 'completed' : 'pending'}`}
              >
                <Typography variant="body2" color="text.secondary">
                  {index < currentStep ? '✓' : index === currentStep ? '⟳' : '○'} {step}
                </Typography>
              </Box>
            ))}
          </Box>
        )}

        <Box sx={{ mt: 2 }}>
          <LinearProgress
            variant={steps.length > 0 ? 'determinate' : 'indeterminate'}
            value={steps.length > 0 ? ((currentStep + 1) / steps.length) * 100 : undefined}
          />
        </Box>
      </Box>
    </Box>
  );
};

// Skeleton Components
export const MessageSkeleton: React.FC<{ count?: number }> = ({ count = 1 }) => {
  return (
    <Box>
      {Array.from({ length: count }).map((_, index) => (
        <Box key={index} className="message-skeleton" sx={{ mb: 3 }}>
          <Box className="message-skeleton-header" sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <Skeleton variant="circular" width={32} height={32} />
            <Skeleton variant="text" width={120} height={20} sx={{ ml: 2 }} />
          </Box>
          <Box className="message-skeleton-content">
            <Skeleton variant="text" width="100%" height={16} />
            <Skeleton variant="text" width="90%" height={16} />
            <Skeleton variant="text" width="75%" height={16} />
          </Box>
        </Box>
      ))}
    </Box>
  );
};

export const ChatListSkeleton: React.FC<{ count?: number }> = ({ count = 5 }) => {
  return (
    <Box>
      {Array.from({ length: count }).map((_, index) => (
        <Card key={index} variant="outlined" sx={{ mb: 2 }}>
          <CardContent>
            <Box className="chat-list-skeleton">
              <Skeleton variant="text" width="80%" height={20} />
              <Skeleton variant="text" width="60%" height={16} />
              <Skeleton variant="text" width="40%" height={14} />
            </Box>
          </CardContent>
        </Card>
      ))}
    </Box>
  );
};

export const UserSkeleton: React.FC = () => {
  return (
    <Box className="user-skeleton" sx={{ display: 'flex', alignItems: 'center', p: 2 }}>
      <Skeleton variant="circular" width={40} height={40} />
      <Box sx={{ ml: 2, flex: 1 }}>
        <Skeleton variant="text" width={120} height={20} />
        <Skeleton variant="text" width={80} height={16} />
      </Box>
    </Box>
  );
};

export const MetricsSkeleton: React.FC<{ count?: number }> = ({ count = 3 }) => {
  return (
    <Box className="metrics-skeleton" sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
      {Array.from({ length: count }).map((_, index) => (
        <Chip
          key={index}
          variant="outlined"
          sx={{ minWidth: 80 }}
          label={<Skeleton variant="text" width={60} height={16} />}
        />
      ))}
    </Box>
  );
};

// Loading Overlay Component
export const LoadingOverlay: React.FC<{
  loading: boolean;
  message?: string;
  type?: LoadingStateProps['type'];
  children: React.ReactNode;
}> = ({ loading, message, type = 'spinner', children }) => {
  return (
    <Box className="loading-overlay-container" sx={{ position: 'relative' }}>
      {children}
      {loading && (
        <Box
          className="loading-overlay"
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            bgcolor: 'rgba(255, 255, 255, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            zIndex: 1000,
          }}
        >
          <LoadingState type={type} message={message} />
        </Box>
      )}
    </Box>
  );
};

// Custom Hook for Loading States
export const useLoadingState = (initialState = false) => {
  const [isLoading, setIsLoading] = React.useState(initialState);

  const startLoading = React.useCallback(() => {
    setIsLoading(true);
  }, []);

  const stopLoading = React.useCallback(() => {
    setIsLoading(false);
  }, []);

  const toggleLoading = React.useCallback(() => {
    setIsLoading(prev => !prev);
  }, []);

  return {
    isLoading,
    setIsLoading,
    startLoading,
    stopLoading,
    toggleLoading,
  };
};

export default LoadingState;