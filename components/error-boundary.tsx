import { Ionicons } from '@expo/vector-icons';
import { Component, ErrorInfo, ReactNode } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { captureError } from '@/lib/sentry';

type Props = {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackText?: string;
};

type State = {
  hasError: boolean;
  error: Error | null;
};

/**
 * アプリ全体をラップするエラー境界。子ツリーが投げた例外を捕捉して
 * フォールバック UI を表示し、Retry でリセットする。
 *
 * 表示テキストは i18n を使えないため (Provider より上にいるため) ハードコード。
 * 日本語と英語の両方を併記して常に何かが読める状態にしている。
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    captureError(error, {
      context: 'ErrorBoundary',
      componentStack: errorInfo.componentStack,
    });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    const title = this.props.fallbackTitle ?? 'Something went wrong';
    const subtitle =
      this.props.fallbackText ??
      'An unexpected error occurred. Please try again.';

    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.inner}>
          <Ionicons
            name="alert-circle-outline"
            size={48}
            color="rgba(255,255,255,0.35)"
          />
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
          <TouchableOpacity
            onPress={this.handleRetry}
            activeOpacity={0.7}
            style={styles.retryButton}
          >
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  inner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 16,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.55)',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 22,
  },
  retryButton: {
    marginTop: 24,
    paddingVertical: 12,
    paddingHorizontal: 32,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderRadius: 10,
  },
  retryText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
