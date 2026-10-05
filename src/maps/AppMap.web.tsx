import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

/**
 * Web fallback for `AppMap`.
 *
 * `react-native-maps` has no web build — importing it in a web bundle throws
 * at load time — so this platform-suffix (`.web.tsx`) sibling stands in when
 * Metro bundles for web. It renders a labelled placeholder plus the marker
 * list so map-bearing screens still lay out and their state-driven surrounds
 * (chips, action rows, ETAs) stay previewable in a browser. The real map is
 * back the moment the app runs on iOS or Android.
 *
 * Keep this file's public shape (`AppMapProps`, `MapMarker`, `DEFAULT_REGION`)
 * identical to `AppMap.tsx` — screens import from `./maps/AppMap` blind to
 * which build resolved.
 */

// A structural copy of `react-native-maps`' `Region`, so the web build does not
// import from the native-only package just to reuse the type.
export interface Region {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

export interface MapMarker {
  id: string;
  latitude: number;
  longitude: number;
  title?: string;
  kind?: 'customer' | 'driver' | 'branch';
}

export interface AppMapProps {
  region: Region;
  markers?: MapMarker[];
  onPress?: (coord: { latitude: number; longitude: number }) => void;
  onRegionChangeComplete?: (region: Region) => void;
  scrollEnabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function AppMap({ region, markers = [], style }: AppMapProps): React.JSX.Element {
  return (
    <View style={[styles.container, style]} accessibilityRole="image" accessibilityLabel="Map preview (web)">
      <View style={styles.badge}>
        <Text style={styles.badgeText}>Map preview only on device</Text>
      </View>

      <View style={styles.centerCoord}>
        <Text style={styles.centerLabel}>Center</Text>
        <Text style={styles.centerValue}>
          {region.latitude.toFixed(4)}, {region.longitude.toFixed(4)}
        </Text>
      </View>

      {markers.length > 0 ? (
        <View style={styles.markerList}>
          {markers.map((m) => (
            <View key={m.id} style={styles.markerRow}>
              <View style={[styles.markerDot, { backgroundColor: pinColor(m.kind) }]} />
              <View style={styles.markerText}>
                <Text style={styles.markerTitle}>{m.title ?? m.id}</Text>
                <Text style={styles.markerCoord}>
                  {m.latitude.toFixed(4)}, {m.longitude.toFixed(4)}
                </Text>
              </View>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function pinColor(kind: MapMarker['kind']): string {
  if (kind === 'driver') return '#E5178B';
  if (kind === 'branch') return '#F47C20';
  return '#2E63A6';
}

export const DEFAULT_REGION: Region = {
  latitude: 24.7136,
  longitude: 46.6753,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: '100%',
    minHeight: 200,
    backgroundColor: '#EEF2F7',
    borderRadius: 8,
    padding: 12,
    justifyContent: 'flex-start',
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderColor: '#CBD5E0',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 8,
  },
  badgeText: { fontSize: 12, color: '#4A5568' },
  centerCoord: { marginBottom: 12 },
  centerLabel: { fontSize: 11, color: '#718096', textTransform: 'uppercase', letterSpacing: 0.5 },
  centerValue: { fontSize: 14, color: '#1A202C', fontWeight: '600' },
  markerList: { gap: 6 },
  markerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  markerDot: { width: 10, height: 10, borderRadius: 5 },
  markerText: { flexShrink: 1 },
  markerTitle: { fontSize: 13, color: '#1A202C' },
  markerCoord: { fontSize: 11, color: '#718096' },
});
