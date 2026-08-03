import { DataTypes } from 'sequelize';

/**
 * Definición de modelos Sequelize del contexto marketing, mapeados al esquema
 * relacional (schema `marketing`, migración 0002_marketing.sql). Un solo lugar
 * para el mapeo ORM; los DAO consumen estos modelos. Se sigue el mismo estilo
 * que leads: `underscored: true` y `field:` explícito por columna.
 */
export function defineModels(sequelize) {
  // ---- Campañas (temporalidades de producto/promoción) -------------
  const Campaign = sequelize.define(
    'Campaign',
    {
      id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
      nombre: { type: DataTypes.TEXT, allowNull: false },
      descripcion: DataTypes.TEXT,
      color: { type: DataTypes.TEXT, allowNull: false, defaultValue: '#ED3237' },
      canal: DataTypes.TEXT, // redes|impresos|expo|mixto
      fechaInicio: { type: DataTypes.DATEONLY, allowNull: false, field: 'fecha_inicio' },
      fechaFin: { type: DataTypes.DATEONLY, allowNull: false, field: 'fecha_fin' },
      productos: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
      estado: { type: DataTypes.TEXT, allowNull: false, defaultValue: 'planeada' }, // planeada|vigente|cerrada
      createdBy: { type: DataTypes.TEXT, field: 'created_by' },
    },
    // underscored:true mapea el atributo `createdAt` a la columna `created_at`.
    { schema: 'marketing', tableName: 'campaigns', underscored: true, timestamps: true, updatedAt: false }
  );

  // ---- Banco de activos (imágenes / video / documentos) ------------
  const Asset = sequelize.define(
    'Asset',
    {
      id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
      tipo: { type: DataTypes.TEXT, allowNull: false }, // imagen|video|documento
      titulo: { type: DataTypes.TEXT, allowNull: false },
      descripcion: DataTypes.TEXT,
      categoria: DataTypes.TEXT, // sombra|antigranizo|antiinsecto|...
      productSku: { type: DataTypes.TEXT, field: 'product_sku' },
      campaignId: { type: DataTypes.BIGINT, field: 'campaign_id' },
      mime: DataTypes.TEXT,
      sizeBytes: { type: DataTypes.BIGINT, allowNull: false, defaultValue: 0, field: 'size_bytes' },
      storage: { type: DataTypes.TEXT, allowNull: false, defaultValue: 'db' }, // db|s3|external
      blob: DataTypes.BLOB, // cuando storage='db' (BYTEA)
      s3Key: { type: DataTypes.TEXT, field: 's3_key' }, // cuando storage='s3'
      externalUrl: { type: DataTypes.TEXT, field: 'external_url' }, // ligas externas (YouTube, etc.)
      pendingSync: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'pending_sync' },
      uploadedBy: { type: DataTypes.TEXT, field: 'uploaded_by' },
      activo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    },
    { schema: 'marketing', tableName: 'assets', underscored: true, timestamps: true, updatedAt: false }
  );

  // ---- Solicitudes de formato (vendedor -> marketing) --------------
  const FormatRequest = sequelize.define(
    'FormatRequest',
    {
      id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
      folio: { type: DataTypes.TEXT, unique: true }, // FMT-XXXX
      solicitanteId: { type: DataTypes.BIGINT, field: 'solicitante_id' }, // attendance.employees.id
      solicitante: { type: DataTypes.TEXT, allowNull: false },
      titulo: { type: DataTypes.TEXT, allowNull: false },
      descripcion: DataTypes.TEXT,
      referenciaAssetId: { type: DataTypes.BIGINT, field: 'referencia_asset_id' },
      estado: { type: DataTypes.TEXT, allowNull: false, defaultValue: 'solicitado' }, // solicitado|en_diseno|entregado|rechazado
      mensajes: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] }, // [{by, role, message, at}]
      entregableAssetId: { type: DataTypes.BIGINT, field: 'entregable_asset_id' },
    },
    // Tiene created_at Y updated_at.
    { schema: 'marketing', tableName: 'format_requests', underscored: true, timestamps: true }
  );

  // ---- Publicaciones listas para compartir en redes ----------------
  const Post = sequelize.define(
    'Post',
    {
      id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
      titulo: { type: DataTypes.TEXT, allowNull: false },
      copyTexto: { type: DataTypes.TEXT, field: 'copy_texto' }, // texto sugerido para acompañar
      red: DataTypes.TEXT, // facebook|instagram|whatsapp|tiktok|otro
      assetId: { type: DataTypes.BIGINT, field: 'asset_id' },
      campaignId: { type: DataTypes.BIGINT, field: 'campaign_id' },
      publicadoPor: { type: DataTypes.TEXT, field: 'publicado_por' },
      activo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    },
    { schema: 'marketing', tableName: 'posts', underscored: true, timestamps: true, updatedAt: false }
  );

  // ---- Vistas por empleado (contador de "nuevo" en la app) ---------
  const PostView = sequelize.define(
    'PostView',
    {
      postId: { type: DataTypes.BIGINT, primaryKey: true, field: 'post_id' },
      employeeId: { type: DataTypes.BIGINT, primaryKey: true, field: 'employee_id' },
      seenAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: 'seen_at' },
    },
    { schema: 'marketing', tableName: 'post_views', underscored: true, timestamps: false }
  );

  // ---- Inventario de artículos impresos ----------------------------
  const PrintItem = sequelize.define(
    'PrintItem',
    {
      id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
      nombre: { type: DataTypes.TEXT, allowNull: false },
      categoria: { type: DataTypes.TEXT, allowNull: false, defaultValue: 'otro' }, // muestrario|tarjeta|carpeta|souvenir|otro
      unidad: { type: DataTypes.TEXT, allowNull: false, defaultValue: 'pieza' },
      minimo: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      notas: DataTypes.TEXT,
      activo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    },
    { schema: 'marketing', tableName: 'print_items', underscored: true, timestamps: true, updatedAt: false }
  );

  const PrintMovement = sequelize.define(
    'PrintMovement',
    {
      id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
      itemId: { type: DataTypes.BIGINT, allowNull: false, field: 'item_id' },
      tipo: { type: DataTypes.TEXT, allowNull: false }, // entrada|salida|ajuste
      cantidad: { type: DataTypes.INTEGER, allowNull: false },
      persona: DataTypes.TEXT, // quién entrega/recibe
      motivo: DataTypes.TEXT,
      createdBy: { type: DataTypes.TEXT, field: 'created_by' },
    },
    { schema: 'marketing', tableName: 'print_movements', underscored: true, timestamps: true, updatedAt: false }
  );

  return { Campaign, Asset, FormatRequest, Post, PostView, PrintItem, PrintMovement };
}
