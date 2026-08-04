import { Router } from 'express';
import { asyncHandler } from '@mallatex/shared/http';
import { requireAuth, adminOnly, requireEmployee } from '@mallatex/shared/auth';

/**
 * Rutas HTTP del contexto attendance. Reciben los casos de uso ya construidos
 * (inyección de dependencias desde index.js), en el mismo estilo que identity.
 */
export function buildRoutes(deps) {
  const {
    employeeService, attendanceService, periodService, variablePayService,
    rhService, fieldService, portalService, scheduleDAO, deviceDAO, siteDAO, employeeDAO,
  } = deps;

  const router = Router();
  const empId = (req) => Number(req.auth.sub);

  // ================================================================
  //  ADMINISTRACIÓN (principal admin)
  // ================================================================
  const admin = Router();
  admin.use(requireAuth, adminOnly);

  // ---- Auditoría ---------------------------------------------------
  admin.get(
    '/audit',
    asyncHandler(async (req, res) => res.json(await attendanceService.listAudit(req.query)))
  );

  // ---- Empleados ---------------------------------------------------
  admin.get('/employees', asyncHandler(async (req, res) => res.json(await employeeService.list(req.query))));
  admin.get('/employees/:id', asyncHandler(async (req, res) => res.json((await employeeService.get(req.params.id)).toPublic())));
  admin.post('/employees', asyncHandler(async (req, res) => res.status(201).json((await employeeService.create(req.body)).toPublic())));
  admin.put('/employees/:id', asyncHandler(async (req, res) => res.json((await employeeService.update(req.params.id, req.body)).toPublic())));
  admin.delete('/employees/:id', asyncHandler(async (req, res) => res.json(await employeeService.deactivate(req.params.id))));
  admin.post('/employees/:id/face', asyncHandler(async (req, res) => {
    const { descriptor, photo } = req.body || {};
    res.json(await employeeService.enrollFace(req.params.id, descriptor, photo));
  }));
  admin.delete('/employees/:id/face', asyncHandler(async (req, res) => res.json(await employeeService.unenrollFace(req.params.id))));

  // ---- Horarios / turnos ------------------------------------------
  admin.get('/schedules', asyncHandler(async (_req, res) => res.json(await scheduleDAO.findAll({}, { order: [['id', 'ASC']] }))));
  admin.post('/schedules', asyncHandler(async (req, res) => {
    const b = req.body || {};
    const created = await scheduleDAO.create({
      name: b.name || 'Nuevo turno',
      entryTime: b.entryTime || '08:00', exitTime: b.exitTime || '18:00',
      lunchMinutes: Number(b.lunchMinutes) || 60,
      toleranceMinutes: b.toleranceMinutes != null ? Number(b.toleranceMinutes) : 10,
      lateAfterMinutes: b.lateAfterMinutes != null ? Number(b.lateAfterMinutes) : 15,
      hoursPerDay: Number(b.hoursPerDay) || 8,
      workDays: Array.isArray(b.workDays) ? b.workDays.map(Number) : [1, 2, 3, 4, 5],
    });
    res.status(201).json(created);
  }));
  admin.put('/schedules/:id', asyncHandler(async (req, res) => {
    const b = req.body || {};
    const patch = {};
    for (const k of ['name', 'entryTime', 'exitTime']) if (k in b) patch[k] = b[k];
    for (const k of ['lunchMinutes', 'toleranceMinutes', 'lateAfterMinutes', 'hoursPerDay']) if (k in b) patch[k] = Number(b[k]);
    if ('workDays' in b) patch.workDays = b.workDays.map(Number);
    const updated = await scheduleDAO.update(req.params.id, patch);
    if (!updated) return res.status(404).json({ error: 'Turno no encontrado' });
    res.json(updated);
  }));
  admin.delete('/schedules/:id', asyncHandler(async (req, res) => {
    const inUse = await employeeDAO.count({ scheduleId: Number(req.params.id), active: true });
    if (inUse) return res.status(409).json({ error: `El turno tiene ${inUse} empleado(s) asignado(s)` });
    await scheduleDAO.delete(req.params.id);
    res.json({ ok: true });
  }));

  // ---- Dispositivos (checador) ------------------------------------
  admin.get('/devices', asyncHandler(async (_req, res) => res.json(await deviceDAO.findAll({}, { order: [['id', 'ASC']] }))));
  admin.post('/devices', asyncHandler(async (req, res) => {
    const b = req.body || {};
    if (!b.name) return res.status(400).json({ error: 'El nombre es obligatorio' });
    res.status(201).json(await deviceDAO.create({
      name: b.name, brand: b.brand || null, model: b.model || null, serial: b.serial || null,
      ip: b.ip || null, location: b.location || null, active: b.active !== false,
    }));
  }));
  admin.put('/devices/:id', asyncHandler(async (req, res) => {
    const b = req.body || {};
    const patch = {};
    for (const k of ['name', 'brand', 'model', 'serial', 'ip', 'location', 'active']) if (k in b) patch[k] = b[k];
    const updated = await deviceDAO.update(req.params.id, patch);
    if (!updated) return res.status(404).json({ error: 'Dispositivo no encontrado' });
    res.json(updated);
  }));
  admin.delete('/devices/:id', asyncHandler(async (req, res) => { await deviceDAO.delete(req.params.id); res.json({ ok: true }); }));

  // ---- Sitios / obras (geocerca) ----------------------------------
  admin.get('/sites', asyncHandler(async (req, res) => {
    const where = req.query.active === 'true' ? { active: true } : {};
    res.json(await siteDAO.findAll(where, { order: [['name', 'ASC']] }));
  }));
  admin.post('/sites', asyncHandler(async (req, res) => {
    const b = req.body || {};
    if (!b.name || b.lat == null || b.lng == null) return res.status(400).json({ error: 'Nombre, latitud y longitud son obligatorios' });
    res.status(201).json(await siteDAO.create({
      name: b.name, client: b.client || '', lat: Number(b.lat), lng: Number(b.lng),
      radiusMeters: Number(b.radiusMeters) || 150, active: b.active !== false,
    }));
  }));
  admin.put('/sites/:id', asyncHandler(async (req, res) => {
    const b = req.body || {};
    const patch = {};
    for (const k of ['name', 'client', 'active']) if (k in b) patch[k] = b[k];
    for (const k of ['lat', 'lng', 'radiusMeters']) if (k in b) patch[k] = Number(b[k]);
    const updated = await siteDAO.update(req.params.id, patch);
    if (!updated) return res.status(404).json({ error: 'Sitio no encontrado' });
    res.json(updated);
  }));
  admin.delete('/sites/:id', asyncHandler(async (req, res) => { await siteDAO.update(req.params.id, { active: false }); res.json({ ok: true }); }));

  // ---- Checadas ----------------------------------------------------
  admin.get('/checadas', asyncHandler(async (req, res) => res.json(await attendanceService.listChecadas(req.query))));
  admin.post('/checadas', asyncHandler(async (req, res) => res.status(201).json(await attendanceService.createChecada(req.body, req.auth.name))));

  // ---- Asistencia (revisión) --------------------------------------
  admin.get('/attendance', asyncHandler(async (req, res) => res.json(await attendanceService.listAttendance(req.query))));
  admin.post('/attendance/reprocess', asyncHandler(async (req, res) => {
    const { start, end, employeeIds } = req.body || {};
    const count = await attendanceService.reprocess({ startDate: start, endDate: end, employeeIds });
    res.json({ ok: true, count });
  }));
  admin.put('/attendance/:id', asyncHandler(async (req, res) => res.json(await attendanceService.correctAttendance(req.params.id, req.body, req.auth.name))));

  // ---- Incidencias -------------------------------------------------
  admin.get('/incidents', asyncHandler(async (req, res) => res.json(await attendanceService.listIncidents(req.query))));
  admin.post('/incidents', asyncHandler(async (req, res) => res.status(201).json(await attendanceService.createIncident(req.body, req.auth.name))));
  admin.put('/incidents/:id', asyncHandler(async (req, res) => res.json(await attendanceService.updateIncident(req.params.id, req.body))));
  admin.delete('/incidents/:id', asyncHandler(async (req, res) => res.json(await attendanceService.deleteIncident(req.params.id))));
  admin.post('/incidents/:id/authorize', asyncHandler(async (req, res) => res.json(await attendanceService.authorizeIncident(req.params.id, req.auth.name))));
  admin.post('/incidents/:id/reject', asyncHandler(async (req, res) => res.json(await attendanceService.rejectIncident(req.params.id, req.body?.reason, req.auth.name))));

  // ---- Tiempo extra ------------------------------------------------
  admin.get('/overtime', asyncHandler(async (req, res) => res.json(await attendanceService.listOvertime(req.query))));
  admin.put('/overtime/:id', asyncHandler(async (req, res) => res.json(await attendanceService.updateOvertime(req.params.id, req.body))));
  admin.post('/overtime/:id/authorize', asyncHandler(async (req, res) => res.json(await attendanceService.authorizeOvertime(req.params.id, req.body, req.auth.name))));
  admin.post('/overtime/:id/reject', asyncHandler(async (req, res) => res.json(await attendanceService.rejectOvertime(req.params.id, req.auth.name))));

  // ---- Periodos / tablero / NOI -----------------------------------
  admin.get('/periods', asyncHandler(async (_req, res) => res.json(await periodService.list())));
  admin.post('/periods', asyncHandler(async (req, res) => res.status(201).json(await periodService.create(req.body, req.auth.name))));
  admin.get('/periods/:id/summary', asyncHandler(async (req, res) => res.json(await periodService.summary(req.params.id))));
  admin.post('/periods/:id/close', asyncHandler(async (req, res) => res.json(await periodService.close(req.params.id, req.body?.force, req.auth.name))));
  admin.post('/periods/:id/reopen', asyncHandler(async (req, res) => res.json(await periodService.reopen(req.params.id, req.auth.name))));
  admin.get('/dashboard', asyncHandler(async (req, res) => res.json(await periodService.dashboard(req.query.periodId))));
  admin.get('/periods/:id/noi/preview', asyncHandler(async (req, res) => res.json(await periodService.noiPreview(req.params.id))));
  admin.get('/periods/:id/noi/export', asyncHandler(async (req, res) => {
    const { content, filename, mime } = await periodService.noiExport(req.params.id, req.query.format, req.query.force);
    res.setHeader('Content-Type', mime);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(content);
  }));

  // ---- Percepciones variables -------------------------------------
  admin.get('/variable-sources', asyncHandler(async (_req, res) => res.json(variablePayService.listSources())));
  admin.post('/variable-sync', asyncHandler(async (req, res) => {
    const { source, periodId } = req.body || {};
    res.json(await variablePayService.syncVariable(source, periodId, req.auth.name));
  }));
  admin.get('/variable-concepts', asyncHandler(async (_req, res) => res.json(await variablePayService.listConcepts())));
  admin.post('/variable-concepts', asyncHandler(async (req, res) => res.status(201).json(await variablePayService.createConcept(req.body, req.auth.name))));
  admin.put('/variable-concepts/:id', asyncHandler(async (req, res) => res.json(await variablePayService.updateConcept(req.params.id, req.body))));
  admin.delete('/variable-concepts/:id', asyncHandler(async (req, res) => res.json(await variablePayService.deleteConcept(req.params.id))));
  admin.get('/variable-entries', asyncHandler(async (req, res) => res.json(await variablePayService.listEntries(req.query))));
  admin.post('/variable-entries', asyncHandler(async (req, res) => res.status(201).json(await variablePayService.createEntry(req.body, req.auth.name))));
  admin.put('/variable-entries/:id', asyncHandler(async (req, res) => res.json(await variablePayService.updateEntry(req.params.id, req.body))));
  admin.delete('/variable-entries/:id', asyncHandler(async (req, res) => res.json(await variablePayService.deleteEntry(req.params.id))));

  // ---- RH ----------------------------------------------------------
  admin.get('/rh/vacation-balances', asyncHandler(async (_req, res) => res.json(await rhService.vacationBalances())));
  admin.post('/rh/payslips/generate', asyncHandler(async (req, res) => res.json(await rhService.generatePayslips(req.body?.periodId, req.auth.name))));
  admin.get('/rh/payslips', asyncHandler(async (req, res) => res.json(await rhService.listPayslips(req.query))));
  admin.get('/rh/payslips/:id', asyncHandler(async (req, res) => res.json(await rhService.getPayslip(req.params.id))));
  admin.get('/rh/tickets', asyncHandler(async (req, res) => res.json(await rhService.listTickets(req.query))));
  admin.post('/rh/tickets/:id/reply', asyncHandler(async (req, res) => res.json(await rhService.replyTicket(req.params.id, req.body, { by: req.auth.name, role: 'rh' }))));
  admin.put('/rh/tickets/:id', asyncHandler(async (req, res) => res.json(await rhService.updateTicket(req.params.id, req.body?.status))));
  admin.get('/rh/indicators', asyncHandler(async (req, res) => res.json(await rhService.indicators(req.query.periodId))));

  // NOTA: el router admin se monta en '/api' AL FINAL, después de portal/field/
  // kiosk, para que su middleware adminOnly no intercepte esas superficies
  // (comparten el prefijo '/api'). Express resuelve por orden de registro.

  // ================================================================
  //  PORTAL DEL EMPLEADO (sesión de empleado)
  // ================================================================
  const portal = Router();
  portal.use(requireAuth, requireEmployee);
  portal.get('/me', asyncHandler(async (req, res) => res.json(await portalService.me(empId(req)))));
  portal.get('/me/attendance', asyncHandler(async (req, res) => res.json(await portalService.attendance(empId(req), req.query.periodId))));
  portal.get('/me/checadas', asyncHandler(async (req, res) => res.json(await portalService.checadas(empId(req), req.query.periodId))));
  portal.get('/me/requests', asyncHandler(async (req, res) => res.json(await portalService.requests(empId(req)))));
  portal.post('/me/requests', asyncHandler(async (req, res) => res.status(201).json(await portalService.createRequest(empId(req), req.body))));
  portal.delete('/me/requests/:id', asyncHandler(async (req, res) => res.json(await portalService.deleteRequest(empId(req), req.params.id))));
  portal.get('/me/payslips', asyncHandler(async (req, res) => res.json(await rhService.payslipsForEmployee(empId(req)))));
  portal.get('/me/payslips/:id', asyncHandler(async (req, res) => res.json(await rhService.getPayslip(req.params.id, empId(req)))));
  portal.get('/me/tickets', asyncHandler(async (req, res) => res.json(await rhService.ticketsForEmployee(empId(req)))));
  portal.post('/me/tickets', asyncHandler(async (req, res) => {
    const me = await portalService.me(empId(req));
    res.status(201).json(await rhService.createTicket(empId(req), me.employee.name, req.body));
  }));
  portal.post('/me/tickets/:id/reply', asyncHandler(async (req, res) => {
    const me = await portalService.me(empId(req));
    res.json(await rhService.replyTicket(req.params.id, req.body, { by: me.employee.name, role: 'empleado' }, empId(req)));
  }));
  router.use('/api/portal', portal);

  // ================================================================
  //  CAMPO (app móvil, sesión de empleado)
  // ================================================================
  const field = Router();
  field.use(requireAuth, requireEmployee);
  // El perfil de campo incluye los módulos efectivos del JWT: la app arma su
  // menú con esta lista (misma matriz de acceso que resolvió el login).
  field.get('/me', asyncHandler(async (req, res) => res.json({
    ...(await fieldService.fieldMe(empId(req))),
    profile: req.auth.profile || null,
    modules: req.auth.modules || [],
  })));
  field.get('/sites', asyncHandler(async (req, res) => res.json(await fieldService.fieldSites(empId(req)))));
  field.get('/checkins', asyncHandler(async (req, res) => res.json(await fieldService.fieldCheckins(empId(req)))));
  field.post('/checkin', asyncHandler(async (req, res) => res.status(201).json(await fieldService.fieldCheckin(empId(req), req.body))));
  // Fase 2 móvil: token push del dispositivo y autoenrolamiento facial.
  field.post('/push-token', asyncHandler(async (req, res) => res.json(await employeeService.savePushToken(empId(req), req.body?.token))));
  field.post('/face', asyncHandler(async (req, res) => res.json(await employeeService.selfFace(empId(req), req.body || {}))));
  router.use('/api/field', field);

  // ================================================================
  //  KIOSCO (público)
  // ================================================================
  const kiosk = Router();
  kiosk.get('/status', asyncHandler(async (_req, res) => res.json(await fieldService.kioskStatus())));
  kiosk.get('/employees', asyncHandler(async (_req, res) => res.json(await fieldService.kioskEmployees())));
  kiosk.post('/checkin', asyncHandler(async (req, res) => res.json(await fieldService.kioskCheckin(req.body))));
  router.use('/api/kiosk', kiosk);

  // Router administrativo al final (ver nota arriba).
  router.use('/api', admin);

  return router;
}
