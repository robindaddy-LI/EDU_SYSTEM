
import React, { ErrorInfo, ReactNode } from "react";

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null
        };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error, errorInfo: null };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
        this.setState({ error, errorInfo });
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="p-8 bg-red-50 min-h-screen flex flex-col items-center justify-center text-red-900">
                    <h1 className="text-4xl font-bold mb-4">Something went wrong</h1>
                    <p className="text-xl mb-8">
                        應用程式發生錯誤。請截圖此畫面並回報給開發者。
                    </p>
                    <div className="bg-white p-6 rounded-lg shadow-lg max-w-2xl w-full overflow-auto text-left border border-red-200">
                        <h2 className="text-lg font-bold text-red-600 mb-2">Error:</h2>
                        <pre className="text-sm bg-gray-100 p-4 rounded mb-4 whitespace-pre-wrap font-mono">
                            {this.state.error && this.state.error.toString()}
                        </pre>
                        <h2 className="text-lg font-bold text-red-600 mb-2">Component Stack:</h2>
                        <pre className="text-xs bg-gray-100 p-4 rounded whitespace-pre-wrap font-mono text-gray-600">
                            {this.state.errorInfo?.componentStack}
                        </pre>
                    </div>
                    <button
                        onClick={() => window.location.reload()}
                        className="mt-8 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-bold shadow-lg"
                    >
                        重新整理頁面
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
