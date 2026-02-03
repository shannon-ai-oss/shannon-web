import React, { Component, ErrorInfo, ReactNode } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Alert,
  Collapse,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Refresh as RefreshIcon,
  BugReport as BugReportIcon,
} from '@mui/icons-material';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showRetry?: boolean;
  showDetails?: boolean;
  title?: string;
  description?: string;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private retryCount = 0;
  private maxRetries = 3;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo,
    });

    // Call error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    // Log to external service in production
    if (process.env.NODE_ENV === 'production') {
      this.logErrorToService(error, errorInfo);
    }
  }

  private logErrorToService = (error: Error, errorInfo: ErrorInfo) => {
    // In a real implementation, this would send to an error reporting service
    try {
      const errorData = {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
      };

      // Example: Send to logging service
      // fetch('/api/errors', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(errorData),
      // });

      console.error('Error logged:', errorData);
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }
  };

  private handleRetry = () => {
    if (this.retryCount < this.maxRetries) {
      this.retryCount++;
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        showDetails: false,
      });
    }
  };

  private handleToggleDetails = () => {
    this.setState(prevState => ({
      showDetails: !prevState.showDetails,
    }));
  };

  private handleReload = () => {
    window.location.reload();
  };

  render() {
    const { hasError, error, errorInfo, showDetails } = this.state;
    const {
      children,
      fallback,
      showRetry = true,
      showDetails: allowDetails = true,
      title = 'Something went wrong',
      description = 'An unexpected error occurred. Please try again or contact support if the problem persists.',
    } = this.props;

    if (hasError) {
      // Custom fallback component
      if (fallback) {
        return fallback;
      }

      // Default error UI
      return (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '50vh',
            p: 3,
          }}
        >
          <Paper
            elevation={3}
            sx={{
              p: 4,
              maxWidth: 600,
              width: '100%',
              textAlign: 'center',
            }}
          >
            {/* Error Icon */}
            <Box sx={{ mb: 2, color: 'error.main' }}>
              <BugReportIcon sx={{ fontSize: 64 }} />
            </Box>

            {/* Error Title */}
            <Typography variant="h5" component="h2" gutterBottom color="error.main">
              {title}
            </Typography>

            {/* Error Description */}
            <Typography variant="body1" color="text.secondary" paragraph>
              {description}
            </Typography>

            {/* Error Message (in development) */}
            {process.env.NODE_ENV === 'development' && error?.message && (
              <Alert severity="error" sx={{ mt: 2, mb: 2, textAlign: 'left' }}>
                <Typography variant="body2" component="pre" sx={{ fontSize: '0.75rem', overflow: 'auto' }}>
                  {error.message}
                </Typography>
              </Alert>
            )}

            {/* Action Buttons */}
            <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
              {showRetry && this.retryCount < this.maxRetries && (
                <Button
                  variant="contained"
                  startIcon={<RefreshIcon />}
                  onClick={this.handleRetry}
                >
                  Try Again
                </Button>
              )}

              <Button
                variant="outlined"
                onClick={this.handleReload}
              >
                Reload Page
              </Button>

              {allowDetails && (error || errorInfo) && (
                <Button
                  variant="text"
                  onClick={this.handleToggleDetails}
                  endIcon={<ExpandMoreIcon />}
                >
                  {showDetails ? 'Hide' : 'Show'} Details
                </Button>
              )}
            </Box>

            {/* Retry Limit Message */}
            {this.retryCount >= this.maxRetries && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                Maximum retry attempts reached. Please reload the page.
              </Typography>
            )}

            {/* Error Details */}
            <Collapse in={showDetails}>
              <Box sx={{ mt: 3, textAlign: 'left' }}>
                {error && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Error Message:
                    </Typography>
                    <Paper
                      variant="outlined"
                      sx={{
                        p: 2,
                        bgcolor: 'grey.50',
                        maxHeight: 200,
                        overflow: 'auto',
                      }}
                    >
                      <Typography variant="body2" component="pre" sx={{ fontSize: '0.75rem' }}>
                        {error.message}
                      </Typography>
                    </Paper>
                  </Box>
                )}

                {error?.stack && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Stack Trace:
                    </Typography>
                    <Paper
                      variant="outlined"
                      sx={{
                        p: 2,
                        bgcolor: 'grey.50',
                        maxHeight: 300,
                        overflow: 'auto',
                      }}
                    >
                      <Typography variant="body2" component="pre" sx={{ fontSize: '0.75rem' }}>
                        {error.stack}
                      </Typography>
                    </Paper>
                  </Box>
                )}

                {errorInfo?.componentStack && (
                  <Box>
                    <Typography variant="subtitle2" gutterBottom>
                      Component Stack:
                    </Typography>
                    <Paper
                      variant="outlined"
                      sx={{
                        p: 2,
                        bgcolor: 'grey.50',
                        maxHeight: 200,
                        overflow: 'auto',
                      }}
                    >
                      <Typography variant="body2" component="pre" sx={{ fontSize: '0.75rem' }}>
                        {errorInfo.componentStack}
                      </Typography>
                    </Paper>
                  </Box>
                )}
              </Box>
            </Collapse>
          </Paper>
        </Box>
      );
    }

    return children;
  }
}

// Functional wrapper for easier usage
interface ErrorBoundaryWrapperProps {
  children: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  fallback?: ReactNode;
  showRetry?: boolean;
  showDetails?: boolean;
  title?: string;
  description?: string;
}

export const ErrorBoundaryWrapper: React.FC<ErrorBoundaryWrapperProps> = ({
  children,
  ...props
}) => {
  return <ErrorBoundary {...props}>{children}</ErrorBoundary>;
};

// Hook for handling errors in functional components
export const useErrorHandler = () => {
  const [error, setError] = React.useState<Error | null>(null);

  const resetError = React.useCallback(() => {
    setError(null);
  }, []);

  const captureError = React.useCallback((error: Error) => {
    setError(error);
  }, []);

  React.useEffect(() => {
    if (error) {
      // Log error to service
      if (process.env.NODE_ENV === 'production') {
        console.error('Error caught by useErrorHandler:', error);
      }
    }
  }, [error]);

  return {
    error,
    captureError,
    resetError,
  };
};

// Higher-order component for wrapping components with error boundary
export const withErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
) => {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;

  return WrappedComponent;
};

export default ErrorBoundary;
