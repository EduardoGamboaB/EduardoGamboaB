import { createServer, startServer } from '@mallatex/shared/http';
import { getSequelize, assertDbConnection, closeDb } from '@mallatex/shared/persistence';
import { config } from '@mallatex/shared/config';
import { defineModels } from './models/index.js';
import { AssetDAO } from './infrastructure/AssetDAO.js';
import { FormatRequestDAO } from './infrastructure/FormatRequestDAO.js';
import { PostDAO } from './infrastructure/PostDAO.js';
import { PostViewDAO } from './infrastructure/PostViewDAO.js';
import { CampaignDAO } from './infrastructure/CampaignDAO.js';
import { PrintItemDAO } from './infrastructure/PrintItemDAO.js';
import { PrintMovementDAO } from './infrastructure/PrintMovementDAO.js';
import { S3Storage } from './infrastructure/S3Storage.js';
import { AssetService } from './application/AssetService.js';
import { FormatRequestService } from './application/FormatRequestService.js';
import { PostService } from './application/PostService.js';
import { CampaignService } from './application/CampaignService.js';
import { PrintService } from './application/PrintService.js';
import { buildRoutes } from './interfaces/routes.js';

const NAME = 'marketing';
const PORT = Number(process.env.PORT || 3006);

async function bootstrap() {
  const sequelize = getSequelize();
  const { Campaign, Asset, FormatRequest, Post, PostView, PrintItem, PrintMovement } =
    defineModels(sequelize);
  await assertDbConnection();
  if (config.db.dialect === 'sqlite') await sequelize.sync();

  const assetDAO = new AssetDAO(Asset);
  const formatRequestDAO = new FormatRequestDAO(FormatRequest);
  const postDAO = new PostDAO(Post);
  const postViewDAO = new PostViewDAO(PostView);
  const campaignDAO = new CampaignDAO(Campaign);
  const printItemDAO = new PrintItemDAO(PrintItem);
  const printMovementDAO = new PrintMovementDAO(PrintMovement);
  const s3 = new S3Storage();

  const assetService = new AssetService({ assetDAO, s3 });
  const formatRequestService = new FormatRequestService({ formatRequestDAO, assetDAO });
  const postService = new PostService({ postDAO, postViewDAO, assetDAO });
  const campaignService = new CampaignService({ campaignDAO });
  const printService = new PrintService({ printItemDAO, printMovementDAO });

  const app = createServer({
    name: NAME,
    mountApi: (a) =>
      a.use(
        buildRoutes({ assetService, formatRequestService, postService, campaignService, printService })
      ),
  });
  startServer(app, { port: PORT, name: NAME, onClose: closeDb });
}

bootstrap().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(`[${NAME}] fallo al arrancar:`, e);
  process.exit(1);
});
