// URL del servidor por defecto. Se puede sobreescribir desde la pantalla de acceso de la app
// (queda guardada en el dispositivo) o cambiándola aquí.
// El gateway unificado ahora sirve TODO bajo un solo backend: campo (asistencia/GPS),
// ventas (CRM) y MES (líneas de producción). Un solo dominio, una sola sesión.
// - Producción (Railway, gateway unificado): https://mallatex.up.railway.app
// - Emulador Android contra tu PC:  http://10.0.2.2:3000
// - Dispositivo físico en la misma red: http://IP-DE-TU-PC:3000
export const DEFAULT_SERVER_URL = 'https://mallatex.up.railway.app';
