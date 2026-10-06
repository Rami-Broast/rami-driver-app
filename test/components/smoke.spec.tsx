import { render } from '@testing-library/react-native';
import React from 'react';
import { Text } from 'react-native';

import { MotionProvider, PressableScale, Skeleton } from '../../src/motion';

const wrap = (ui: React.ReactElement) => render(<MotionProvider>{ui}</MotionProvider>);

describe('driver motion smoke', () => {
  it('mounts shared motion primitives without throwing', () => {
    expect(() =>
      wrap(
        <PressableScale onPress={() => undefined}>
          <Text>go</Text>
        </PressableScale>,
      ),
    ).not.toThrow();
    expect(() => wrap(<Skeleton width={100} height={20} />)).not.toThrow();
  });
});
