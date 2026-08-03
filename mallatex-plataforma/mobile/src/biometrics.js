// Autenticación biométrica del dispositivo (Face ID / huella) vía expo-local-authentication.
// Degrada con elegancia donde no está disponible (p. ej. web o dispositivos sin sensor).
import * as LocalAuthentication from 'expo-local-authentication';

export async function biometricAvailable() {
  try {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    return !!(hasHardware && enrolled);
  } catch {
    return false;
  }
}

export async function biometricLabel() {
  try {
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
    if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) return 'Face ID';
    if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) return 'huella';
    if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) return 'iris';
    return 'biometría';
  } catch {
    return 'biometría';
  }
}

export async function biometricAuthenticate(reason = 'Confirma tu identidad') {
  try {
    const r = await LocalAuthentication.authenticateAsync({
      promptMessage: reason,
      cancelLabel: 'Cancelar',
      disableDeviceFallback: false,
    });
    return r.success === true;
  } catch {
    return false;
  }
}
