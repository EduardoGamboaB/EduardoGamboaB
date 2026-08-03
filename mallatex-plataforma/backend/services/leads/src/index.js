import { createServer, startServer } from '@mallatex/shared/http';
import { getSequelize, assertDbConnection, closeDb } from '@mallatex/shared/persistence';
import { config } from '@mallatex/shared/config';
import { defineModels } from './models/index.js';
import { EventDAO } from './infrastructure/EventDAO.js';
import { LeadDAO } from './infrastructure/LeadDAO.js';
import { DrawDAO } from './infrastructure/DrawDAO.js';
import { BlobDAO } from './infrastructure/BlobDAO.js';
import { createMailer } from './infrastructure/Mailer.js';
import { EventService } from './application/EventService.js';
import { LeadService } from './application/LeadService.js';
import { RaffleService } from './application/RaffleService.js';
import { StatsService } from './application/StatsService.js';
import { buildRoutes } from './interfaces/routes.js';

const NAME = 'leads';
const PORT = Number(process.env.PORT || 3005);

async function bootstrap() {
  const sequelize = getSequelize();
  const { Event, Lead, Draw, Blob } = defineModels(sequelize);
  await assertDbConnection();
  if (config.db.dialect === 'sqlite') await sequelize.sync();

  const eventDAO = new EventDAO(Event);
  const leadDAO = new LeadDAO(Lead);
  const drawDAO = new DrawDAO(Draw);
  const blobDAO = new BlobDAO(Blob);
  const mailer = createMailer();

  const eventService = new EventService({ eventDAO, leadDAO, drawDAO, blobDAO });
  const leadService = new LeadService({ leadDAO, eventService, blobDAO });
  const raffleService = new RaffleService({ leadDAO, drawDAO, eventService, mailer });
  const statsService = new StatsService({ leadDAO, drawDAO });

  const app = createServer({
    name: NAME,
    mountApi: (a) =>
      a.use(buildRoutes({ eventService, leadService, raffleService, statsService })),
  });
  startServer(app, { port: PORT, name: NAME, onClose: closeDb });
}

bootstrap().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(`[${NAME}] fallo al arrancar:`, e);
  process.exit(1);
});
