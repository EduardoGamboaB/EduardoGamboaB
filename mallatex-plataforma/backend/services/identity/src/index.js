import { createServer, startServer } from '@mallatex/shared/http';
import { getSequelize, assertDbConnection, closeDb, BaseDAO } from '@mallatex/shared/persistence';
import { config } from '@mallatex/shared/config';
import { defineModels } from './models/index.js';
import { UserDAO } from './infrastructure/UserDAO.js';
import { ModuleDAO, AccessGrantDAO } from './infrastructure/AccessDAO.js';
import { AccessService } from './application/AccessService.js';
import { AuthService } from './application/AuthService.js';
import { buildRoutes } from './interfaces/routes.js';

const NAME = 'identity';
const PORT = Number(process.env.PORT || 3001);

async function bootstrap() {
  const sequelize = getSequelize();
  const { User, ModuleCatalog, AccessGrant, EmployeeAuth } = defineModels(sequelize);
  await assertDbConnection();
  if (config.db.dialect === 'sqlite') await sequelize.sync();

  const userDAO = new UserDAO(User);
  const moduleDAO = new ModuleDAO(ModuleCatalog);
  const accessGrantDAO = new AccessGrantDAO(AccessGrant);
  const employeeDAO = new BaseDAO(EmployeeAuth); // lectura para login por código+PIN

  const accessService = new AccessService({ moduleDAO, accessGrantDAO });
  const authService = new AuthService({ userDAO, employeeDAO, accessService });

  const app = createServer({
    name: NAME,
    mountApi: (a) => a.use(buildRoutes({ authService, accessService, userDAO })),
  });
  startServer(app, { port: PORT, name: NAME, onClose: closeDb });
}

bootstrap().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(`[${NAME}] fallo al arrancar:`, e);
  process.exit(1);
});
