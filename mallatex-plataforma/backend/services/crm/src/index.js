import { createServer, startServer } from '@mallatex/shared/http';
import { getSequelize, assertDbConnection, closeDb } from '@mallatex/shared/persistence';
import { config } from '@mallatex/shared/config';
import { defineModels } from './models/index.js';
import { ClientDAO } from './infrastructure/ClientDAO.js';
import { SalesRouteDAO } from './infrastructure/SalesRouteDAO.js';
import { VisitDAO } from './infrastructure/VisitDAO.js';
import { QuoteDAO } from './infrastructure/QuoteDAO.js';
import { OrderDAO } from './infrastructure/OrderDAO.js';
import { ProductDAO } from './infrastructure/ProductDAO.js';
import { ObjectiveDAO, ExpenseRequestDAO, ExpenseDAO, InvoiceDAO, EmployeeReadDAO } from './infrastructure/BillingDAO.js';
import { SalesService } from './application/SalesService.js';
import { CommercialService } from './application/CommercialService.js';
import { ProductService } from './application/ProductService.js';
import { IntegrationService } from './application/IntegrationService.js';
import { buildRoutes } from './interfaces/routes.js';

const NAME = 'crm';
const PORT = Number(process.env.PORT || 3003);

async function bootstrap() {
  const sequelize = getSequelize();
  const models = defineModels(sequelize);
  await assertDbConnection();
  if (config.db.dialect === 'sqlite') await sequelize.sync();

  // ---- Repositorios (DAO) ------------------------------------------
  const clientDAO = new ClientDAO(models.Client);
  const routeDAO = new SalesRouteDAO(models.SalesRoute);
  const visitDAO = new VisitDAO(models.Visit);
  const quoteDAO = new QuoteDAO(models.Quote);
  const orderDAO = new OrderDAO(models.Order);
  const productDAO = new ProductDAO(models.Product);
  const objectiveDAO = new ObjectiveDAO(models.SalesObjective);
  const expenseRequestDAO = new ExpenseRequestDAO(models.ExpenseRequest);
  const expenseDAO = new ExpenseDAO(models.Expense);
  const invoiceDAO = new InvoiceDAO(models.Invoice);
  const employeeDAO = new EmployeeReadDAO(models.EmployeeRead); // lectura de empleados (attendance)

  // ---- Casos de uso -------------------------------------------------
  const integrationService = new IntegrationService({ invoiceDAO });
  const salesService = new SalesService({
    clientDAO, routeDAO, visitDAO, quoteDAO, orderDAO, productDAO,
    objectiveDAO, expenseRequestDAO, expenseDAO, invoiceDAO,
  });
  const commercialService = new CommercialService({
    clientDAO, visitDAO, objectiveDAO, expenseRequestDAO, expenseDAO,
    invoiceDAO, employeeDAO, integrationService,
  });
  const productService = new ProductService({ productDAO });

  const app = createServer({
    name: NAME,
    mountApi: (a) => a.use(buildRoutes({ salesService, commercialService, productService, integrationService })),
  });
  startServer(app, { port: PORT, name: NAME, onClose: closeDb });
}

bootstrap().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(`[${NAME}] fallo al arrancar:`, e);
  process.exit(1);
});
