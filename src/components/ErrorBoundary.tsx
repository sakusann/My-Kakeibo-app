// src/components/ErrorBoundary.tsx

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';

interface Props {
    children: ReactNode;
    fallbackTitle?: string;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <Card className="border-destructive">
                    <CardHeader>
                        <CardTitle className="text-destructive">
                            {this.props.fallbackTitle || 'エラーが発生しました'}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                            予期しないエラーが発生しました。再試行してください。
                        </p>
                        <p className="text-xs text-muted-foreground font-mono">
                            {this.state.error?.message}
                        </p>
                        <Button
                            variant="outline"
                            onClick={() => this.setState({ hasError: false, error: null })}
                        >
                            再試行
                        </Button>
                    </CardContent>
                </Card>
            );
        }

        return this.props.children;
    }
}
