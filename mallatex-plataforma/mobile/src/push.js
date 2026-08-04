// Notificaciones push (Expo). Todo el módulo es tolerante a la ausencia de
// expo-notifications (web/preview o build sin la dependencia): cada función
// falla en silencio devolviendo null/función vacía.
import { Platform } from 'react-native';

let Notifications = null;
try { Notifications = require('expo-notifications'); } catch { /* no disponible */ }

let handlerReady = false;
function ensureHandler() {
  if (!Notifications || handlerReady) return;
  handlerReady = true;
  // Con la app abierta, mostrar la notificación como banner (sin badge del SO).
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

/**
 * Pide permiso y devuelve el ExponentPushToken del dispositivo, o null si no
 * hay soporte (web, emulador sin Google Play, permiso denegado, sin projectId).
 */
export async function registerPushToken() {
  if (!Notifications || Platform.OS === 'web') return null;
  try {
    ensureHandler();
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'General',
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 250],
        lightColor: '#ED3237',
      });
    }
    const { status } = await Notifications.getPermissionsAsync();
    let granted = status === 'granted';
    if (!granted) {
      const req = await Notifications.requestPermissionsAsync();
      granted = req.status === 'granted';
    }
    if (!granted) return null;
    // En builds EAS el projectId viene de app.json (extra.eas.projectId).
    let projectId;
    try {
      const Constants = require('expo-constants').default;
      projectId = Constants?.expoConfig?.extra?.eas?.projectId || Constants?.easConfig?.projectId;
    } catch { /* opcional */ }
    const token = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
    return token?.data || null;
  } catch {
    return null;
  }
}

/**
 * Suscribe un callback a las notificaciones recibidas con la app abierta
 * (p. ej. refrescar el badge de Material de venta). Devuelve el unsubscribe.
 */
export function onPushReceived(cb) {
  if (!Notifications) return () => {};
  try {
    const sub = Notifications.addNotificationReceivedListener(() => { try { cb(); } catch { /* noop */ } });
    return () => sub.remove();
  } catch {
    return () => {};
  }
}
