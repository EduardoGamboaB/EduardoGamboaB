// Confirmación multiplataforma: Alert nativo en iOS/Android y window.confirm
// en el modo web (Alert.alert con botones no se renderiza en react-native-web).
import { Alert, Platform } from 'react-native';

export function confirmAction(title, message, onConfirm, confirmLabel = 'Aceptar') {
  if (Platform.OS === 'web') {
    // eslint-disable-next-line no-alert
    if (typeof window !== 'undefined' && window.confirm(`${title}\n\n${message}`)) onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: 'Cancelar', style: 'cancel' },
    { text: confirmLabel, style: 'destructive', onPress: onConfirm },
  ]);
}
