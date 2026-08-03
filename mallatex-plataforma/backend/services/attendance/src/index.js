import { createServer, startServer } from '@mallatex/shared/http';
import { getSequelize, assertDbConnection, closeDb } from '@mallatex/shared/persistence';
import { config } from '@mallatex/shared/config';
import { defineModels } from './models/index.js';
import { EmployeeDAO } from './infrastructure/EmployeeDAO.js';
import { ScheduleDAO, DeviceDAO, SiteDAO } from './infrastructure/CatalogDAO.js';
import { ChecadaDAO, AttendanceDayDAO, IncidentDAO, OvertimeDAO } from './infrastructure/AttendanceDAO.js';
import { PeriodDAO, NoiConceptDAO, VariableConceptDAO, VariableEntryDAO, PayslipDAO } from './infrastructure/PayrollDAO.js';
import { TicketDAO, AuditLogDAO } from './infrastructure/SupportDAO.js';
import { EmployeeService } from './application/EmployeeService.js';
import { AttendanceService } from './application/AttendanceService.js';
import { PeriodService } from './application/PeriodService.js';
import { VariablePayService } from './application/VariablePayService.js';
import { RhService } from './application/RhService.js';
import { FieldService } from './application/FieldService.js';
import { PortalService } from './application/PortalService.js';
import { buildRoutes } from './interfaces/routes.js';

const NAME = 'attendance';
const PORT = Number(process.env.PORT || 3002);

async function bootstrap() {
  const sequelize = getSequelize();
  const m = defineModels(sequelize);
  await assertDbConnection();
  if (config.db.dialect === 'sqlite') await sequelize.sync();

  // DAOs (uno por tabla del esquema attendance)
  const employeeDAO = new EmployeeDAO(m.Employee);
  const scheduleDAO = new ScheduleDAO(m.Schedule);
  const deviceDAO = new DeviceDAO(m.Device);
  const siteDAO = new SiteDAO(m.Site);
  const checadaDAO = new ChecadaDAO(m.Checada);
  const attendanceDayDAO = new AttendanceDayDAO(m.AttendanceDay);
  const incidentDAO = new IncidentDAO(m.Incident);
  const overtimeDAO = new OvertimeDAO(m.Overtime);
  const periodDAO = new PeriodDAO(m.Period);
  const noiConceptDAO = new NoiConceptDAO(m.NoiConcept);
  const variableConceptDAO = new VariableConceptDAO(m.VariableConcept);
  const variableEntryDAO = new VariableEntryDAO(m.VariableEntry);
  const payslipDAO = new PayslipDAO(m.Payslip);
  const ticketDAO = new TicketDAO(m.Ticket);
  const audit = new AuditLogDAO(m.AuditLog);

  // Servicios de aplicación (orquestan DAOs + lógica de dominio)
  const employeeService = new EmployeeService({ employeeDAO, scheduleDAO, audit });
  const attendanceService = new AttendanceService({
    employeeDAO, scheduleDAO, checadaDAO, attendanceDayDAO, incidentDAO, overtimeDAO, periodDAO, audit,
  });
  const periodService = new PeriodService({
    periodDAO, employeeDAO, attendanceDayDAO, overtimeDAO, incidentDAO, deviceDAO,
    variableEntryDAO, variableConceptDAO, noiConceptDAO, attendanceService, audit,
  });
  const variablePayService = new VariablePayService({ variableConceptDAO, variableEntryDAO, periodDAO, employeeDAO, audit });
  const rhService = new RhService({ employeeDAO, periodDAO, attendanceDayDAO, overtimeDAO, incidentDAO, payslipDAO, ticketDAO, audit });
  const fieldService = new FieldService({ employeeDAO, siteDAO, checadaDAO, attendanceDayDAO, deviceDAO, attendanceService });
  const portalService = new PortalService({ employeeDAO, scheduleDAO, periodDAO, attendanceDayDAO, overtimeDAO, incidentDAO, checadaDAO });

  const app = createServer({
    name: NAME,
    mountApi: (a) => a.use(buildRoutes({
      employeeService, attendanceService, periodService, variablePayService,
      rhService, fieldService, portalService, scheduleDAO, deviceDAO, siteDAO, employeeDAO,
      audit,
    })),
  });
  startServer(app, { port: PORT, name: NAME, onClose: closeDb });
}

bootstrap().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(`[${NAME}] fallo al arrancar:`, e);
  process.exit(1);
});
