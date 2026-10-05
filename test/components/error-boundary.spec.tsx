import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import { Text } from 'react-native';

import { ErrorBoundary } from '../../src/components/ErrorBoundary';

function Boom({ shouldThrow }: { shouldThrow: boolean }): React.JSX.Element {
  if (shouldThrow) {
    throw new Error('Cannot read properties of null');
  }
  return <Text>Rendered fine</Text>;
}

describe('ErrorBoundary', () => {
  beforeEach(() => {
    // React logs the caught error itself; silence it so a passing test is not
    // buried in an expected stack trace.
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders its children when nothing throws', () => {
    render(
      <ErrorBoundary>
        <Boom shouldThrow={false} />
      </ErrorBoundary>,
    );

    expect(screen.getByText('Rendered fine')).toBeTruthy();
  });

  it('shows a recoverable screen instead of a blank view', () => {
    render(
      <ErrorBoundary>
        <Boom shouldThrow />
      </ErrorBoundary>,
    );

    expect(screen.getByText('Something went wrong')).toBeTruthy();
    expect(screen.getByText(/Your active delivery is unaffected/)).toBeTruthy();
    expect(screen.getByText('Try again')).toBeTruthy();
  });

  it('never shows the driver a stack trace', () => {
    render(
      <ErrorBoundary>
        <Boom shouldThrow />
      </ErrorBoundary>,
    );

    // The message is kept for support, not put in front of the driver.
    expect(screen.queryByText(/Cannot read properties of null/)).toBeNull();
  });

  it('recovers when the cause is gone', () => {
    function Harness(): React.JSX.Element {
      const [broken, setBroken] = React.useState(true);
      return (
        <ErrorBoundary onReset={() => setBroken(false)}>
          <Boom shouldThrow={broken} />
        </ErrorBoundary>
      );
    }

    render(<Harness />);
    expect(screen.getByText('Something went wrong')).toBeTruthy();

    fireEvent.press(screen.getByText('Try again'));

    expect(screen.getByText('Rendered fine')).toBeTruthy();
  });
});
