import { DataTypes } from 'sequelize';

/**
 * Definición de modelos Sequelize del contexto attendance, mapeados al esquema
 * relacional `attendance` (ver database/schema.sql). Un único lugar para el
 * mapeo ORM camelCase -> snake_case; los DAO consumen estos modelos.
 */
export function defineModels(sequelize) {
  const Schedule = sequelize.define(
    'Schedule',
    {
      id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
      name: { type: DataTypes.TEXT, allowNull: false },
      entryTime: { type: DataTypes.TIME, allowNull: false, defaultValue: '08:00', field: 'entry_time' },
      exitTime: { type: DataTypes.TIME, allowNull: false, defaultValue: '18:00', field: 'exit_time' },
      lunchMinutes: { type: DataTypes.INTEGER, defaultValue: 60, field: 'lunch_minutes' },
      toleranceMinutes: { type: DataTypes.INTEGER, defaultValue: 10, field: 'tolerance_minutes' },
      lateAfterMinutes: { type: DataTypes.INTEGER, defaultValue: 15, field: 'late_after_minutes' },
      hoursPerDay: { type: DataTypes.DECIMAL(4, 2), defaultValue: 8, field: 'hours_per_day' },
      workDays: { type: DataTypes.JSONB, defaultValue: [1, 2, 3, 4, 5], field: 'work_days' },
    },
    { schema: 'attendance', tableName: 'schedules', underscored: true, timestamps: true, updatedAt: false }
  );

  const Device = sequelize.define(
    'Device',
    {
      id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
      name: { type: DataTypes.TEXT, allowNull: false },
      brand: DataTypes.TEXT,
      model: DataTypes.TEXT,
      serial: DataTypes.TEXT,
      ip: DataTypes.TEXT,
      location: DataTypes.TEXT,
      lastSync: { type: DataTypes.DATE, field: 'last_sync' },
      active: { type: DataTypes.BOOLEAN, defaultValue: true },
    },
    { schema: 'attendance', tableName: 'devices', underscored: true, timestamps: false }
  );

  const Site = sequelize.define(
    'Site',
    {
      id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
      name: { type: DataTypes.TEXT, allowNull: false },
      client: DataTypes.TEXT,
      lat: DataTypes.DECIMAL(10, 7),
      lng: DataTypes.DECIMAL(10, 7),
      radiusMeters: { type: DataTypes.INTEGER, defaultValue: 150, field: 'radius_meters' },
      active: { type: DataTypes.BOOLEAN, defaultValue: true },
    },
    { schema: 'attendance', tableName: 'sites', underscored: true, timestamps: false }
  );

  const Employee = sequelize.define(
    'Employee',
    {
      id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
      code: { type: DataTypes.TEXT, allowNull: false, unique: true },
      noiKey: { type: DataTypes.TEXT, field: 'noi_key' },
      name: { type: DataTypes.TEXT, allowNull: false },
      rfc: DataTypes.TEXT,
      department: DataTypes.TEXT,
      position: DataTypes.TEXT,
      scheduleId: { type: DataTypes.BIGINT, field: 'schedule_id' },
      deviceId: { type: DataTypes.BIGINT, field: 'device_id' },
      checadorUserId: { type: DataTypes.TEXT, field: 'checador_user_id' },
      pinHash: { type: DataTypes.TEXT, field: 'pin_hash' },
      dailySalary: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0, field: 'daily_salary' },
      hireDate: { type: DataTypes.DATEONLY, field: 'hire_date' },
      bonusEligible: { type: DataTypes.BOOLEAN, defaultValue: true, field: 'bonus_eligible' },
      workMode: { type: DataTypes.TEXT, defaultValue: 'planta', field: 'work_mode' },
      appProfile: { type: DataTypes.TEXT, field: 'app_profile' },
      allowedSiteIds: { type: DataTypes.JSONB, defaultValue: [], field: 'allowed_site_ids' },
      faceDescriptor: { type: DataTypes.JSONB, field: 'face_descriptor' },
      facePhoto: { type: DataTypes.TEXT, field: 'face_photo' },
      active: { type: DataTypes.BOOLEAN, defaultValue: true },
      extraModules: { type: DataTypes.JSONB, defaultValue: [], field: 'extra_modules' },
      revokedModules: { type: DataTypes.JSONB, defaultValue: [], field: 'revoked_modules' },
      portalExtraModules: { type: DataTypes.JSONB, defaultValue: [], field: 'portal_extra_modules' },
      portalRevokedModules: { type: DataTypes.JSONB, defaultValue: [], field: 'portal_revoked_modules' },
    },
    { schema: 'attendance', tableName: 'employees', underscored: true, timestamps: true }
  );

  const Checada = sequelize.define(
    'Checada',
    {
      id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
      employeeId: { type: DataTypes.BIGINT, allowNull: false, field: 'employee_id' },
      deviceId: { type: DataTypes.BIGINT, field: 'device_id' },
      // Se expone como `timestamp` en el dominio; la columna física es `ts`.
      timestamp: { type: DataTypes.DATE, allowNull: false, field: 'ts' },
      type: { type: DataTypes.TEXT, allowNull: false },
      method: { type: DataTypes.TEXT, defaultValue: 'facial' },
      raw: DataTypes.JSONB,
      lat: DataTypes.DECIMAL(10, 7),
      lng: DataTypes.DECIMAL(10, 7),
      siteId: { type: DataTypes.BIGINT, field: 'site_id' },
      distanceMeters: { type: DataTypes.DECIMAL(10, 2), field: 'distance_meters' },
      withinGeofence: { type: DataTypes.BOOLEAN, field: 'within_geofence' },
      faceMatchDistance: { type: DataTypes.DECIMAL(6, 4), field: 'face_match_distance' },
      faceVerified: { type: DataTypes.BOOLEAN, field: 'face_verified' },
      mocked: { type: DataTypes.BOOLEAN, defaultValue: false },
      offline: { type: DataTypes.BOOLEAN, defaultValue: false },
    },
    { schema: 'attendance', tableName: 'checadas', underscored: true, timestamps: true, updatedAt: false }
  );

  const Incident = sequelize.define(
    'Incident',
    {
      id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
      employeeId: { type: DataTypes.BIGINT, allowNull: false, field: 'employee_id' },
      type: { type: DataTypes.TEXT, allowNull: false },
      startDate: { type: DataTypes.DATEONLY, allowNull: false, field: 'start_date' },
      endDate: { type: DataTypes.DATEONLY, allowNull: false, field: 'end_date' },
      reason: DataTypes.TEXT,
      status: { type: DataTypes.TEXT, defaultValue: 'pendiente' },
      createdBy: { type: DataTypes.TEXT, field: 'created_by' },
      authorizedBy: { type: DataTypes.TEXT, field: 'authorized_by' },
      selfService: { type: DataTypes.BOOLEAN, defaultValue: false, field: 'self_service' },
    },
    { schema: 'attendance', tableName: 'incidents', underscored: true, timestamps: true, updatedAt: false }
  );

  const AttendanceDay = sequelize.define(
    'AttendanceDay',
    {
      id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
      employeeId: { type: DataTypes.BIGINT, allowNull: false, field: 'employee_id' },
      date: { type: DataTypes.DATEONLY, allowNull: false },
      scheduleId: { type: DataTypes.BIGINT, field: 'schedule_id' },
      firstIn: { type: DataTypes.DATE, field: 'first_in' },
      lastOut: { type: DataTypes.DATE, field: 'last_out' },
      checadaCount: { type: DataTypes.INTEGER, defaultValue: 0, field: 'checada_count' },
      workedMinutes: { type: DataTypes.INTEGER, defaultValue: 0, field: 'worked_minutes' },
      lateMinutes: { type: DataTypes.INTEGER, defaultValue: 0, field: 'late_minutes' },
      earlyLeaveMinutes: { type: DataTypes.INTEGER, defaultValue: 0, field: 'early_leave_minutes' },
      overtimeMinutes: { type: DataTypes.INTEGER, defaultValue: 0, field: 'overtime_minutes' },
      status: { type: DataTypes.TEXT, defaultValue: 'pendiente' },
      incidentId: { type: DataTypes.BIGINT, field: 'incident_id' },
      manualStatus: { type: DataTypes.TEXT, field: 'manual_status' },
      manualNote: { type: DataTypes.TEXT, field: 'manual_note' },
      autoNote: { type: DataTypes.TEXT, field: 'auto_note' },
    },
    { schema: 'attendance', tableName: 'attendance_day', underscored: true, timestamps: false }
  );

  const Overtime = sequelize.define(
    'Overtime',
    {
      id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
      employeeId: { type: DataTypes.BIGINT, allowNull: false, field: 'employee_id' },
      date: { type: DataTypes.DATEONLY, allowNull: false },
      calculatedMinutes: { type: DataTypes.INTEGER, defaultValue: 0, field: 'calculated_minutes' },
      authorizedMinutes: { type: DataTypes.INTEGER, defaultValue: 0, field: 'authorized_minutes' },
      type: { type: DataTypes.TEXT, defaultValue: 'ordinario' },
      status: { type: DataTypes.TEXT, defaultValue: 'pendiente' },
      authorizedBy: { type: DataTypes.TEXT, field: 'authorized_by' },
    },
    { schema: 'attendance', tableName: 'overtime', underscored: true, timestamps: false }
  );

  const Period = sequelize.define(
    'Period',
    {
      id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
      name: { type: DataTypes.TEXT, allowNull: false },
      startDate: { type: DataTypes.DATEONLY, allowNull: false, field: 'start_date' },
      endDate: { type: DataTypes.DATEONLY, allowNull: false, field: 'end_date' },
      status: { type: DataTypes.TEXT, defaultValue: 'abierto' },
      closedBy: { type: DataTypes.TEXT, field: 'closed_by' },
      closedAt: { type: DataTypes.DATE, field: 'closed_at' },
    },
    { schema: 'attendance', tableName: 'periods', underscored: true, timestamps: false }
  );

  const NoiConcept = sequelize.define(
    'NoiConcept',
    {
      id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
      key: { type: DataTypes.TEXT, allowNull: false, unique: true },
      noiNumber: { type: DataTypes.INTEGER, field: 'noi_number' },
      tipo: DataTypes.TEXT,
      descripcion: DataTypes.TEXT,
      unidad: DataTypes.TEXT,
      enabled: { type: DataTypes.BOOLEAN, defaultValue: true },
    },
    { schema: 'attendance', tableName: 'noi_concepts', underscored: true, timestamps: false }
  );

  const VariableConcept = sequelize.define(
    'VariableConcept',
    {
      id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
      key: { type: DataTypes.TEXT, allowNull: false, unique: true },
      name: { type: DataTypes.TEXT, allowNull: false },
      noiNumber: { type: DataTypes.INTEGER, field: 'noi_number' },
      tipo: DataTypes.TEXT,
      unidad: DataTypes.TEXT,
      modo: { type: DataTypes.TEXT, defaultValue: 'tarifa' },
      rate: { type: DataTypes.DECIMAL(12, 4), defaultValue: 0 },
      department: DataTypes.TEXT,
      source: { type: DataTypes.TEXT, defaultValue: 'manual' },
      enabled: { type: DataTypes.BOOLEAN, defaultValue: true },
    },
    { schema: 'attendance', tableName: 'variable_concepts', underscored: true, timestamps: false }
  );

  const VariableEntry = sequelize.define(
    'VariableEntry',
    {
      id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
      periodId: { type: DataTypes.BIGINT, allowNull: false, field: 'period_id' },
      employeeId: { type: DataTypes.BIGINT, allowNull: false, field: 'employee_id' },
      conceptId: { type: DataTypes.BIGINT, allowNull: false, field: 'concept_id' },
      cantidad: { type: DataTypes.DECIMAL(14, 4), defaultValue: 0 },
      rate: DataTypes.DECIMAL(12, 4),
      importe: { type: DataTypes.DECIMAL(14, 2), defaultValue: 0 },
      note: DataTypes.TEXT,
      source: { type: DataTypes.TEXT, defaultValue: 'manual' },
      externalId: { type: DataTypes.TEXT, field: 'external_id' },
      createdBy: { type: DataTypes.TEXT, field: 'created_by' },
      syncedAt: { type: DataTypes.DATE, field: 'synced_at' },
    },
    { schema: 'attendance', tableName: 'variable_entries', underscored: true, timestamps: true, updatedAt: false }
  );

  const Payslip = sequelize.define(
    'Payslip',
    {
      id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
      employeeId: { type: DataTypes.BIGINT, allowNull: false, field: 'employee_id' },
      periodId: { type: DataTypes.BIGINT, allowNull: false, field: 'period_id' },
      perceptions: { type: DataTypes.JSONB, defaultValue: [] },
      deductions: { type: DataTypes.JSONB, defaultValue: [] },
      totalP: { type: DataTypes.DECIMAL(14, 2), defaultValue: 0, field: 'total_p' },
      totalD: { type: DataTypes.DECIMAL(14, 2), defaultValue: 0, field: 'total_d' },
      neto: { type: DataTypes.DECIMAL(14, 2), defaultValue: 0 },
      emittedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, field: 'emitted_at' },
    },
    { schema: 'attendance', tableName: 'payslips', underscored: true, timestamps: false }
  );

  const Ticket = sequelize.define(
    'Ticket',
    {
      id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
      employeeId: { type: DataTypes.BIGINT, allowNull: false, field: 'employee_id' },
      employeeName: { type: DataTypes.TEXT, field: 'employee_name' },
      category: DataTypes.TEXT,
      subject: { type: DataTypes.TEXT, allowNull: false },
      status: { type: DataTypes.TEXT, defaultValue: 'abierto' },
      messages: { type: DataTypes.JSONB, defaultValue: [] },
    },
    { schema: 'attendance', tableName: 'tickets', underscored: true, timestamps: true, updatedAt: false }
  );

  const AuditLog = sequelize.define(
    'AuditLog',
    {
      id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
      ts: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
      userId: { type: DataTypes.TEXT, field: 'user_id' },
      userName: { type: DataTypes.TEXT, field: 'user_name' },
      role: DataTypes.TEXT,
      action: DataTypes.TEXT,
      entity: DataTypes.TEXT,
      entityId: { type: DataTypes.TEXT, field: 'entity_id' },
      detail: DataTypes.JSONB,
    },
    { schema: 'attendance', tableName: 'audit_log', underscored: true, timestamps: false }
  );

  return {
    Schedule, Device, Site, Employee, Checada, Incident, AttendanceDay,
    Overtime, Period, NoiConcept, VariableConcept, VariableEntry, Payslip,
    Ticket, AuditLog,
  };
}
