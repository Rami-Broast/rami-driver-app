import React, { useRef, useState } from 'react';
import { GestureResponderEvent, LayoutChangeEvent, PanResponder, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { PressableScale } from '../motion';
import { useTheme } from '../theme/theme';

/** One freehand stroke, as an SVG path `d` string. */
type Stroke = string;

function pointsToPath(points: { x: number; y: number }[]): string {
  const first = points[0];
  if (!first) {
    return '';
  }
  const rest = points.slice(1);
  return `M ${first.x.toFixed(1)} ${first.y.toFixed(1)}` + rest.map((p) => ` L ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join('');
}

/**
 * A freehand signature capture built on `react-native-svg` + `PanResponder`.
 *
 * No native dependency — the strokes are SVG paths. `onChange` fires with a
 * serialized `<svg>` string whenever the drawing changes, or `null` when it is
 * cleared, so the parent can gate submission on a real signature being present.
 */
export function SignaturePad({
  onChange,
  height = 200,
}: {
  onChange: (svg: string | null) => void;
  height?: number;
}): React.JSX.Element {
  const theme = useTheme();
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [current, setCurrent] = useState<{ x: number; y: number }[]>([]);
  const [size, setSize] = useState({ width: 0, height });
  const pointsRef = useRef<{ x: number; y: number }[]>([]);

  const emit = (all: Stroke[]): void => {
    if (all.length === 0) {
      onChange(null);
      return;
    }
    const paths = all
      .map((d) => `<path d="${d}" fill="none" stroke="black" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>`)
      .join('');
    onChange(`<svg xmlns="http://www.w3.org/2000/svg" width="${size.width}" height="${size.height}">${paths}</svg>`);
  };

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e: GestureResponderEvent) => {
        pointsRef.current = [{ x: e.nativeEvent.locationX, y: e.nativeEvent.locationY }];
        setCurrent(pointsRef.current);
      },
      onPanResponderMove: (e: GestureResponderEvent) => {
        pointsRef.current = [...pointsRef.current, { x: e.nativeEvent.locationX, y: e.nativeEvent.locationY }];
        setCurrent(pointsRef.current);
      },
      onPanResponderRelease: () => {
        const finished = pointsToPath(pointsRef.current);
        pointsRef.current = [];
        setCurrent([]);
        if (finished) {
          setStrokes((prev) => {
            const next = [...prev, finished];
            emit(next);
            return next;
          });
        }
      },
    }),
  ).current;

  const onLayout = (e: LayoutChangeEvent): void => {
    setSize({ width: e.nativeEvent.layout.width, height });
  };

  const clear = (): void => {
    setStrokes([]);
    setCurrent([]);
    pointsRef.current = [];
    onChange(null);
  };

  const currentPath = pointsToPath(current);

  return (
    <View>
      <View
        onLayout={onLayout}
        {...responder.panHandlers}
        style={{
          height,
          backgroundColor: theme.colors.surface,
          borderWidth: 1,
          borderColor: theme.colors.border,
          borderRadius: theme.radius.md,
          overflow: 'hidden',
        }}
      >
        <Svg width="100%" height="100%">
          {strokes.map((d, i) => (
            <Path key={i} d={d} fill="none" stroke={theme.colors.text} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
          ))}
          {currentPath ? (
            <Path d={currentPath} fill="none" stroke={theme.colors.text} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
          ) : null}
        </Svg>
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
        <Text style={{ color: theme.colors.textMuted, fontSize: 13 }}>
          {strokes.length === 0 ? 'Sign above' : 'Signature captured'}
        </Text>
        <PressableScale accessibilityRole="button" onPress={clear} disabled={strokes.length === 0}>
          <Text style={{ color: strokes.length === 0 ? theme.colors.textMuted : theme.colors.accent, fontWeight: '700' }}>Clear</Text>
        </PressableScale>
      </View>
    </View>
  );
}
