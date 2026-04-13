import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-page">
          <div className="error-card">
            <h1>🐐 Baaaa-d News!</h1>
            <p>Something went wrong and the app tripped over its own hooves.</p>
            <p>
              Don't worry — message <strong>The GOAT</strong> on Microsoft Teams
              and they'll get things back on track! 🏃‍♂️
            </p>
            <button onClick={() => window.location.reload()}>
              Try Again (Optimistically)
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
