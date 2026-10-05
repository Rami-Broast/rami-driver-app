import Constants from 'expo-constants';
import React from 'react';
import { Platform, StyleProp, ViewStyle } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, Region } from 'react-native-maps';

/**
 * The one place the app talks to the map SDK.
 *
 * Delivery is the platform's focus, so maps appear in address entry and live
 * tracking. This wrapper picks the provider: Google on Android (needs a key set
 * in `app.json → android.config.googleMaps.apiKey`), and on iOS it uses Google
 * only when a JS key is present, otherwise the built-in Apple map — so the app
 * runs with or without a key, and never hard-codes one. No key lives in the
 * repo; you supply it per environment.
 */
export interface MapMarker {
  id: string;
  latitude: number;
  longitude: number;
  title?: string;
  /** A tint hint the map may use for the pin. */
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

const hasGoogleKey = Boolean(Constants.expoConfig?.extra?.googleMapsApiKey);

export function AppMap({
  region,
  markers = [],
  onPress,
  onRegionChangeComplete,
  scrollEnabled = true,
  style,
}: AppMapProps): React.JSX.Element {
  // Google on Android always; on iOS only if a JS key was supplied.
  const provider = Platform.OS === 'android' || hasGoogleKey ? PROVIDER_GOOGLE : undefined;

  return (
    <MapView
      provider={provider}
      style={[{ width: '100%', height: '100%' }, style]}
      initialRegion={region}
      region={region}
      scrollEnabled={scrollEnabled}
      onPress={onPress ? (e) => onPress(e.nativeEvent.coordinate) : undefined}
      onRegionChangeComplete={onRegionChangeComplete}
    >
      {markers.map((m) => (
        <Marker
          key={m.id}
          coordinate={{ latitude: m.latitude, longitude: m.longitude }}
          title={m.title}
          pinColor={m.kind === 'driver' ? '#E5178B' : m.kind === 'branch' ? '#F47C20' : '#2E63A6'}
        />
      ))}
    </MapView>
  );
}

/** A sensible default region (Riyadh) when we have no coordinate yet. */
export const DEFAULT_REGION: Region = {
  latitude: 24.7136,
  longitude: 46.6753,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};
