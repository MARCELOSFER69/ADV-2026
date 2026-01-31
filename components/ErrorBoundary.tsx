import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';

interface Props {
    children?: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-xl m-4">
                    <div className="flex items-center gap-3 text-red-500 mb-2">
                        <AlertCircle size={24} />
                        <h2 className="text-lg font-bold">Algo deu errado neste componente.</h2>
                    </div>
                    <p className="text-red-400 text-sm mb-4">
                        Ocorreu um erro ao renderizar esta visualização via ErrorBoundary.
                    </p>
                    <div className="bg-black/30 p-4 rounded-lg overflow-auto max-h-40">
                        <code className="text-xs font-mono text-red-300">
                            {this.state.error?.toString()}
                        </code>
                    </div>
                    <button
                        onClick={() => this.setState({ hasError: false })}
                        className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-bold transition-colors"
                    >
                        Tentar Novamente
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
