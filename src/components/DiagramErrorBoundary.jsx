import React from 'react';

const MERMAID_ERROR_MESSAGE =
  'mermaid error. the fixer system is broken. you can try manual fix, regenerate. we gonna make the new concise functional fixer next week';

/**
 * Error boundary tailored for the diagram tooling. Resets automatically
 * whenever the backing data changes and exposes a consistent fallback UI.
 */
export default class DiagramErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('[DiagramErrorBoundary] render failure', error, info);
  }

  componentDidUpdate(prevProps) {
    if (prevProps.resetKey !== this.props.resetKey && this.state.hasError) {
      this.setState({ hasError: false, error: null });
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (typeof this.props.onReset === 'function') {
      this.props.onReset();
    }
  };

  render() {
    const { hasError, error } = this.state;
    const { children, fallback, fallbackRender } = this.props;

    if (!hasError) {
      return children;
    }

    if (typeof fallbackRender === 'function') {
      return fallbackRender({ error, resetError: this.handleReset });
    }

    if (typeof fallback === 'function') {
      return fallback({ error, resetError: this.handleReset });
    }

    if (React.isValidElement(fallback)) {
      return fallback;
    }

    return (
      <div className="claude-mermaid-error" role="alert">
        <span className="claude-mermaid-error-message">{MERMAID_ERROR_MESSAGE}</span>
        {error?.message && (
          <span className="claude-mermaid-error-debug" aria-hidden="true" style={{ display: 'none' }}>
            {error.message}
          </span>
        )}
        <button type="button" className="claude-code-copy" onClick={this.handleReset}>
          Try again
        </button>
      </div>
    );
  }
}
