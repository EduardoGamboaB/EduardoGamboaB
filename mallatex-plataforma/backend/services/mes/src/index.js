import { createServer, startServer } from '@mallatex/shared/http';
import { getSequelize, assertDbConnection, closeDb } from '@mallatex/shared/persistence';
import { config } from '@mallatex/shared/config';
import { defineModels } from './models/index.js';
import { ProductionOrderDAO, SuborderDAO } from './infrastructure/ProductionOrderDAO.js';
import { LineDAO, OperatorDAO, LocationDAO } from './infrastructure/CatalogDAO.js';
import { RollDAO, AvisoDAO, MermaDAO, ProductividadDAO } from './infrastructure/ShopFloorDAO.js';
import { RecepcionDAO, EgresoDAO, ProductoTerminadoDAO } from './infrastructure/WarehouseDAO.js';
import { ProductionService } from './application/ProductionService.js';
import { ShopFloorService } from './application/ShopFloorService.js';
import { WarehouseService } from './application/WarehouseService.js';
import { BoardService } from './application/BoardService.js';
import { buildRoutes } from './interfaces/routes.js';

const NAME = 'mes';
const PORT = Number(process.env.PORT || 3004);

async function bootstrap() {
  const sequelize = getSequelize();
  const models = defineModels(sequelize);
  await assertDbConnection();
  if (config.db.dialect === 'sqlite') await sequelize.sync();

  // ---- DAOs ----------------------------------------------------------
  const orderDAO = new ProductionOrderDAO(models.ProductionOrder);
  const suborderDAO = new SuborderDAO(models.ProductionSuborder);
  const lineDAO = new LineDAO(models.ProductionLine);
  const operatorDAO = new OperatorDAO(models.Operator);
  const locationDAO = new LocationDAO(models.Location);
  const rollDAO = new RollDAO(models.Roll);
  const avisoDAO = new AvisoDAO(models.Aviso);
  const mermaDAO = new MermaDAO(models.Merma);
  const productividadDAO = new ProductividadDAO(models.Productividad);
  const recepcionDAO = new RecepcionDAO(models.Recepcion);
  const egresoDAO = new EgresoDAO(models.Egreso);
  const productoTerminadoDAO = new ProductoTerminadoDAO(models.ProductoTerminado);

  // ---- Servicios de aplicación --------------------------------------
  const productionService = new ProductionService({ orderDAO, suborderDAO });
  const shopFloorService = new ShopFloorService({
    lineDAO,
    operatorDAO,
    rollDAO,
    avisoDAO,
    mermaDAO,
    productividadDAO,
  });
  const warehouseService = new WarehouseService({ recepcionDAO, egresoDAO, productoTerminadoDAO, locationDAO });
  const boardService = new BoardService({
    orderDAO,
    lineDAO,
    avisoDAO,
    productividadDAO,
    mermaDAO,
    recepcionDAO,
    egresoDAO,
    productoTerminadoDAO,
  });

  const app = createServer({
    name: NAME,
    mountApi: (a) =>
      a.use(buildRoutes({ productionService, shopFloorService, warehouseService, boardService })),
  });
  startServer(app, { port: PORT, name: NAME, onClose: closeDb });
}

bootstrap().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(`[${NAME}] fallo al arrancar:`, e);
  process.exit(1);
});
