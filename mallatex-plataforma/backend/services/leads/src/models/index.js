import { DataTypes } from 'sequelize';

/**
 * Definición de modelos Sequelize del contexto leads, mapeados al esquema
 * relacional (schema `leads`). Un solo lugar para el mapeo ORM; los DAO
 * consumen estos modelos. Se sigue el mismo estilo que identity:
 * `underscored: true` y `field:` explícito por columna.
 */
export function defineModels(sequelize) {
  // ---- Eventos (cada uno con su premio, dinámica, QR…) -------------
  const Event = sequelize.define(
    'Event',
    {
      id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
      name: { type: DataTypes.TEXT, allowNull: false },
      edition: DataTypes.TEXT,
      tipo: DataTypes.TEXT,
      premio: DataTypes.TEXT,
      premioImagen: { type: DataTypes.BOOLEAN, defaultValue: false, field: 'premio_imagen' },
      dinamica: DataTypes.TEXT,
      fecha: DataTypes.DATEONLY,
      hora: DataTypes.TIME,
      lugar: DataTypes.TEXT,
      plazoContactoDias: { type: DataTypes.INTEGER, defaultValue: 30, field: 'plazo_contacto_dias' },
      permiteGanadoresPrevios: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        field: 'permite_ganadores_previos',
      },
      finalizado: { type: DataTypes.BOOLEAN, defaultValue: false },
      activo: { type: DataTypes.BOOLEAN, defaultValue: false },
    },
    // underscored:true mapea el atributo `createdAt` a la columna `created_at`.
    { schema: 'leads', tableName: 'events', underscored: true, timestamps: true, updatedAt: false }
  );

  // ---- Leads (personas capturadas en un evento) --------------------
  const Lead = sequelize.define(
    'Lead',
    {
      id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
      eventId: { type: DataTypes.BIGINT, allowNull: false, field: 'event_id' },
      folio: { type: DataTypes.TEXT, allowNull: false },
      nombre: { type: DataTypes.TEXT, allowNull: false },
      empresa: DataTypes.TEXT,
      estado: DataTypes.TEXT,
      email: DataTypes.TEXT,
      telefono: DataTypes.TEXT,
      cargo: DataTypes.TEXT,
      interes: DataTypes.TEXT,
      volumen: DataTypes.TEXT,
      notas: DataTypes.TEXT,
      consentimiento: { type: DataTypes.BOOLEAN, defaultValue: false },
      fuente: DataTypes.TEXT,
      capturadoPor: { type: DataTypes.TEXT, field: 'capturado_por' },
      metodoCaptura: { type: DataTypes.TEXT, field: 'metodo_captura' },
      tieneFoto: { type: DataTypes.BOOLEAN, defaultValue: false, field: 'tiene_foto' },
      aceptaTerminos: { type: DataTypes.BOOLEAN, field: 'acepta_terminos' },
      aceptaPrivacidad: { type: DataTypes.BOOLEAN, field: 'acepta_privacidad' },
      consentimientoAt: { type: DataTypes.DATE, field: 'consentimiento_at' },
    },
    { schema: 'leads', tableName: 'leads', underscored: true, timestamps: true, updatedAt: false }
  );

  // ---- Sorteos (ganadores de la rifa de cada evento) ---------------
  const Draw = sequelize.define(
    'Draw',
    {
      id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
      eventId: { type: DataTypes.BIGINT, allowNull: false, field: 'event_id' },
      premio: DataTypes.TEXT,
      folio: DataTypes.TEXT,
      leadId: { type: DataTypes.BIGINT, field: 'lead_id' },
      nombre: DataTypes.TEXT,
      empresa: DataTypes.TEXT,
      telefono: DataTypes.TEXT,
      email: DataTypes.TEXT,
      participantes: DataTypes.INTEGER,
      emailEnviado: { type: DataTypes.BOOLEAN, defaultValue: false, field: 'email_enviado' },
      emailEstado: { type: DataTypes.TEXT, field: 'email_estado' },
    },
    { schema: 'leads', tableName: 'draws', underscored: true, timestamps: true, updatedAt: false }
  );

  // ---- Blobs (fotos de gafete e imágenes de premio) ----------------
  const Blob = sequelize.define(
    'Blob',
    {
      key: { type: DataTypes.TEXT, primaryKey: true },
      mime: DataTypes.TEXT,
      data: DataTypes.BLOB,
    },
    // Sólo columna updated_at; underscored:true mapea `updatedAt` a `updated_at`.
    { schema: 'leads', tableName: 'blobs', underscored: true, timestamps: true, createdAt: false }
  );

  return { Event, Lead, Draw, Blob };
}
