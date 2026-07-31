// Helper de ubicación (GPS) compartido.
import * as Location from 'expo-location';

export async function getLocation() {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') throw new Error('Se requiere permiso de ubicación.');
  const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
  return {
    lat: loc.coords.latitude,
    lng: loc.coords.longitude,
    accuracy: loc.coords.accuracy,
    mocked: loc.mocked === true,
  };
}
