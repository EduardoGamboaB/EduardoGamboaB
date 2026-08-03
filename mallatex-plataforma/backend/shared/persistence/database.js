import { Sequelize } from 'sequelize';
import { config } from '../config/index.js';

/**
 * Instancia única de Sequelize por proceso (cada microservicio tiene la suya,
 * apuntando al mismo esquema relacional PostgreSQL). Soporta también SQLite
 * para desarrollo/pruebas locales sin infraestructura.
 */
let sequelize = null;

export function getSequelize() {
  if (sequelize) return sequelize;

  const { dialect, url, storage, logging, ssl } = config.db;

  if (dialect === 'sqlite') {
    sequelize = new Sequelize({
      dialect: 'sqlite',
      storage: storage || ':memory:',
      logging: logging ? console.log : false,
    });
  } else {
    sequelize = new Sequelize(url, {
      dialect: 'postgres',
      logging: logging ? console.log : false,
      dialectOptions: ssl
        ? { ssl: { require: true, rejectUnauthorized: false } }
        : {},
      pool: { max: 10, min: 0, idle: 10000, acquire: 30000 },
      define: {
        underscored: true,
        freezeTableName: false,
      },
    });
  }
  return sequelize;
}

export async function assertDbConnection() {
  const db = getSequelize();
  await db.authenticate();
  return db;
}

/** Ejecuta trabajo dentro de una transacción (Unit of Work). */
export async function withTransaction(work) {
  const db = getSequelize();
  return db.transaction(async (tx) => work(tx));
}

export async function closeDb() {
  if (sequelize) {
    await sequelize.close();
    sequelize = null;
  }
}
