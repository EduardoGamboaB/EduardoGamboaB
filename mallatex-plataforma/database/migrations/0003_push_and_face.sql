-- 0003 · Fase 2 móvil: token de notificaciones push por colaborador.
-- (face_descriptor/face_photo ya existen en el baseline; aquí solo push.)
ALTER TABLE attendance.employees
  ADD COLUMN IF NOT EXISTS push_token TEXT;

COMMENT ON COLUMN attendance.employees.push_token IS
  'Expo push token del último dispositivo con sesión (ExponentPushToken[...]); NULL si no ha aceptado notificaciones.';
