# Checklist de salida a producción

## Infraestructura
- [ ] PostgreSQL gestionado aprovisionado; `DATABASE_URL` y `DATABASE_SSL=true`.
- [ ] `node database/migrate.js up` aplicado sobre la base de producción.
- [ ] `node database/seed.js` **sólo** para catálogos/matriz de acceso; revisar
      antes de sembrar datos demo (usuarios/empleados de ejemplo).
- [ ] Los 5 microservicios + gateway desplegados y con healthcheck en verde
      (`/api/health`).
- [ ] Gateway con las `*_URL` internas correctas.

## Seguridad
- [ ] `JWT_SECRET` fuerte y **idéntico** en todos los servicios (rotación planeada).
- [ ] Cambiar contraseñas demo (`mallatex2026`) y PIN (`1234`).
- [ ] `CORS_ORIGINS` restringido a los dominios reales.
- [ ] `TRUST_PROXY=true` detrás de balanceador; TLS terminado en el borde.
- [ ] `ASPEL_WEBHOOK_SECRET` configurado para el webhook de pagos.

## Integraciones
- [ ] G3 / MES / Aspel en modo `http` con `*_BASE_URL` y `*_TOKEN` reales
      (por defecto `mock`).
- [ ] Correo del sorteo (Mandrill/SMTP) configurado si se requiere envío real.

## Frontend / Móvil
- [ ] `NEXT_PUBLIC_API_BASE` apuntando al gateway público.
- [ ] App móvil: `DEFAULT_SERVER_URL` al gateway; build EAS
      (`eas build --profile production`).

## Operación
- [ ] Respaldos automáticos de la base activados.
- [ ] Logs/őmétricas de cada servicio monitorizados.
- [ ] Prueba de humo end-to-end: login web, login móvil, checada de campo,
      alta de pedido MES, captura de lead.
