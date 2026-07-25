# Checklist de puesta en producción (Go-Live)

Mallatex · Plataforma de Asistencia (NOI) — *powered by Evorgyn*

Lista de verificación para llevar la plataforma a producción de forma ordenada y segura.
Marca cada punto (`[x]`) cuando esté hecho y verificado. Referencias:
[`DEPLOY.md`](../DEPLOY.md) · [`docs/integraciones.md`](integraciones.md) · manual de usuario.

**Leyenda de responsables:** 🖥️ TI/Infra · 🧮 Nómina/Contabilidad · 🔌 Integraciones ·
🔐 Seguridad · 👤 Dirección/RH.

---

## 0. Gate de Go / No-Go (resumen)

No se sale a producción hasta que **todo** esto esté en verde:

- [ ] Infraestructura y TLS operativos (§1)
- [ ] Configuración de producción aplicada y secretos rotados (§2)
- [ ] PostgreSQL provisionado, con respaldos **y restauración probada** (§3)
- [ ] Datos maestros reales cargados (§4)
- [ ] Exportación NOI **importada con éxito en Aspel** en una prueba real (§5)
- [ ] UAT / corrida en paralelo de un periodo conciliada al 100 % (§7)
- [ ] Aviso de privacidad biométrico y respaldos legales listos (§6)
- [ ] Plan de corte y rollback aprobado (§9)

---

## 1. Infraestructura y red 🖥️

- [ ] Servidor/host definido (Node.js ≥ 20 o Docker) con recursos suficientes.
- [ ] Dominio definido (p. ej. `asistencia.mallatex.mx`) y **DNS** apuntando al servidor.
- [ ] **Certificado TLS** emitido e instalado (Let's Encrypt o corporativo).
- [ ] **HTTPS obligatorio** (redirección 80→443). *Requisito para la cámara del kiosco.*
- [ ] Reverse-proxy configurado (`deploy/nginx.conf`) con `X-Forwarded-Proto`.
- [ ] Firewall: sólo 80/443 públicos; la app y PostgreSQL **no** expuestos directamente.
- [ ] Las **tabletas/kioscos** tienen acceso de red (LAN/VPN) al dominio por HTTPS.
- [ ] **Zona horaria del servidor = `America/Mexico_City`** (crítico para asistencia y
      cálculo de retardos/horas extra). Verificar reloj/NTP.

## 2. Configuración y secretos 🔐

- [ ] `.env` creado a partir de `.env.example`.
- [ ] `NODE_ENV=production` y `SEED_DEMO=false` (no cargar datos demo).
- [ ] `BOOTSTRAP_ADMIN_EMAIL` / `BOOTSTRAP_ADMIN_PASSWORD` con **contraseña larga**.
- [ ] `STORAGE=postgres` y `DATABASE_URL` configurados (§3).
- [ ] `TRUST_PROXY=1`, `ENABLE_HSTS=true`, `ENABLE_CSP=true`.
- [ ] `POSTGRES_PASSWORD` y toda credencial por defecto **cambiadas**.
- [ ] `CORS_ORIGINS` acotado si aplica; `SESSION_TTL_HOURS` y límites de acceso revisados.
- [ ] Secretos fuera del repositorio (gestor de secretos / variables del orquestador).

## 3. Base de datos y respaldos 🖥️

- [ ] PostgreSQL provisionado (gestionado o contenedor) y accesible por la app.
- [ ] Esquema creado automáticamente al primer arranque (tablas `store`/`meta`).
- [ ] Si se viene de una prueba en archivo: `npm run migrate:pg` ejecutado y verificado.
- [ ] **Respaldos automáticos** configurados (respaldo gestionado o `pg_dump` programado).
- [ ] **Restauración probada** (drill): restaurar un respaldo en un entorno aparte.
- [ ] Definidos RPO/RTO (cuánto dato se puede perder / cuánto tarda recuperar).

## 4. Datos maestros (carga inicial) 🧮👤

- [ ] **Empresa / ajustes**: razón social, sucursal, empresa NOI.
- [ ] **Reglas globales**: tolerancia, umbral de retardo/falta, tiempo extra, importe de bono.
- [ ] **Usuarios administrativos** reales (Administrador, Contador, Nómina; hasta 5).
      Contraseña del administrador **cambiada** tras el primer acceso.
- [ ] **Horarios/turnos** reales (entradas/salidas, comida, días laborables).
- [ ] **Catálogo de empleados**: código, **clave NOI**, RFC, área, puesto, horario, salario
      diario, ID en checador, elegibilidad de bono. PIN de portal asignado si aplica.
- [ ] **Dispositivos checador** (Hikvision) dados de alta.
- [ ] **Enrolamiento biométrico** de rostros (o plan de enrolamiento por etapas).
- [ ] **Conceptos NOI** con los **números reales de Aspel** del cliente.
- [ ] **Percepciones variables**: tarifas reales ($/km, $/m², % de comisión) y su concepto NOI.
- [ ] **Periodos de nómina** creados según el calendario quincenal real.

## 5. Integración con Aspel NOI 🔌🧮

- [ ] Números de concepto de la exportación = los del catálogo de Aspel NOI del cliente.
- [ ] **Layout del archivo** validado (separador, columnas, formato de importes/fechas).
- [ ] **Prueba de importación real**: exportar un periodo y **cargarlo en Aspel NOI** sin
      errores; conciliar montos contra el proceso actual.
- [ ] Ver [`docs/integraciones.md`](integraciones.md) §5 para el contrato.

## 5.1 Otras integraciones (definir alcance de fase 1) 🔌

Para cada una: **conectar ahora** o **iniciar con captura/registro manual** (soportado hoy).

- [ ] **Hikvision (checador)**: ¿ISAPI conectado o captura/sincronización asistida?
      Si se conecta: credenciales, IP, conectividad y prueba de descarga (integraciones §1).
- [ ] **G3 (kilometraje)**: ¿conectado o captura manual? Mapeo conductor→empleado.
- [ ] **MES (m² fabricación)**: ¿conectado o captura manual? Mapeo operador→empleado.
- [ ] **Aspel CxC (comisiones)**: ¿webhook de pago de facturas o captura manual? Mapeo
      vendedor→empleado y regla (cobrado vs facturado).

> Recomendación: **fase 1 en producción con captura manual** de percepciones variables y,
> si es viable, Hikvision por ISAPI; el resto de conectores en una fase 2 controlada.

## 6. Seguridad, privacidad y cumplimiento 🔐👤

- [ ] HTTPS/HSTS activos; cabeceras de seguridad verificadas (CSP, X-Frame-Options…).
- [ ] Roles y permisos (RBAC) validados por rol (admin/contador/nómina/empleado).
- [ ] **Datos biométricos**: aviso de privacidad y **consentimiento** de los colaboradores
      (LFPDPPP). Definir **retención**, resguardo y baja de plantillas faciales.
- [ ] Política de contraseñas/PIN comunicada; contraseñas demo eliminadas.
- [ ] Bitácora (trazabilidad) revisada: registra usuario, fecha y motivo de cada ajuste.
- [ ] Acceso al servidor/BD restringido y auditado.

## 7. Pruebas de aceptación (UAT) 🧮🔌

- [ ] **Corrida en paralelo** de al menos **un periodo completo** contra el proceso actual.
- [ ] Conciliación: faltas, retardos, incidencias, horas extra, bono y percepciones variables.
- [ ] **Kiosco en tableta real**: check-in/out por reconocimiento facial sobre HTTPS.
- [ ] **Portal del empleado**: acceso con código + PIN, consulta de asistencia/recibos.
- [ ] Flujo completo: sincronizar → revisar → corregir → autorizar → cerrar → exportar NOI.
- [ ] Prueba de **respaldo y restauración** durante la UAT.
- [ ] Prueba de reinicio/actualización del servicio sin pérdida de datos.

## 8. Capacitación y soporte 👤

- [ ] **Manual de usuario** entregado (PDF y Word) al equipo.
- [ ] Capacitación a Nómina, Contabilidad y Administración.
- [ ] Instrucciones del **kiosco** para colaboradores (cómo checar).
- [ ] Canal y **contacto de soporte** / escalamiento definido.

## 9. Corte (cutover) y contingencia 👤🖥️

- [ ] **Fecha de corte** acordada (idealmente al inicio de un periodo de nómina).
- [ ] **Criterios de Go/No-Go** aprobados (§0).
- [ ] **Plan de rollback** documentado (volver al proceso anterior si algo falla).
- [ ] Duración del **acompañamiento post-arranque** (hypercare) definida.
- [ ] Responsables y ventana de mantenimiento comunicados.

## 10. Post go-live (primeras 2 semanas) 🖥️🧮

- [ ] Monitorear el **primer periodo completo** de punta a punta.
- [ ] Verificar que los **respaldos** corren y son restaurables.
- [ ] Revisar salud (`/api/health`, `/api/ready`) y logs.
- [ ] Recoger retroalimentación y ajustar reglas/conceptos si es necesario.
- [ ] Cierre formal del proyecto y plan de fase 2 (conectores G3/MES/Aspel).

---

### Estado técnico ya cubierto por la plataforma

Para dar contexto al gate, esto **ya está implementado y probado** (no requiere desarrollo
para el go-live, sólo configuración/datos):

- Persistencia **PostgreSQL** con escritor único y migración desde archivo.
- Endurecimiento de seguridad (scrypt, sesiones con caducidad, límite de accesos, CSP/HSTS…).
- Empaquetado Docker + reverse-proxy TLS, health/ready checks, apagado ordenado, respaldos.
- Motor de reglas, incidencias, horas extra, **percepciones variables**, cierre y
  **exportación NOI**; kiosco biométrico; portal del empleado; módulos de RH.
- Pruebas automatizadas: 34 unitarias/QA + 5 end-to-end.

Lo pendiente para el go-live es **operativo y de datos** (infra, TLS, datos maestros,
validación con Aspel real, UAT y las integraciones que se decidan conectar en fase 1).
