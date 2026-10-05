import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

interface Props {
  children: React.ReactNode;
  /** Called when the driver taps "Try again", to send them somewhere safe. */
  onReset?: () => void;
}

interface State {
  error: Error | null;
}

/**
 * Catches a render-time exception and shows something the customer can act on.
 *
 * React unmounts the **entire tree** when a render throws and nothing catches
 * it. On the web that is a white screen; in a React Native app it is a blank
 * view the customer can only escape by force-quitting — and on a release build
 * there is no red box explaining why. One undefined field from an API response
 * is enough to cause it.
 *
 * The fallback deliberately says nothing technical about *why*, only what it
 * means for them (the delivery in hand is unaffected) and how to get out. A
 * driver hitting this is standing at a door with a bag of food — the screen has
 * to be readable and recoverable, not a stack trace.
 *
 * It must be a class: `componentDidCatch` / `getDerivedStateFromError` have no
 * hook equivalent.
 *
 * Colours are hard-coded rather than read from the theme on purpose: the theme
 * provider is one of the things that can throw, and a fallback that needs a
 * working provider is no fallback.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: React.ErrorInfo): void {
    // No crash-reporting service is configured and inventing one is not this
    // component's decision, so the trace goes to the console for a dev build.
    console.error('Unhandled render error:', error, info.componentStack);
  }

  private readonly reset = (): void => {
    this.setState({ error: null });
    this.props.onReset?.();
  };

  override render(): React.ReactNode {
    const { error } = this.state;
    if (!error) {
      return this.props.children;
    }

    return (
      <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}>
          <Text
            accessibilityRole="header"
            style={{ fontSize: 22, fontWeight: '800', color: '#1B1820', marginBottom: 8 }}
          >
            Something went wrong
          </Text>
          <Text style={{ fontSize: 15, color: '#5C5666', lineHeight: 22, marginBottom: 24 }}>
            We couldn’t show this screen. Your active delivery is unaffected — this is a problem
            displaying the app, and nothing you have recorded is lost.
          </Text>

          <Pressable
            accessibilityRole="button"
            onPress={this.reset}
            style={{
              backgroundColor: '#A3195B',
              borderRadius: 12,
              paddingVertical: 14,
              alignItems: 'center',
            }}
          >
            <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 16 }}>Try again</Text>
          </Pressable>
        </ScrollView>
      </View>
    );
  }
}
