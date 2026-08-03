import { DataTypes } from 'sequelize';

/**
 * Modelos Sequelize del contexto MES, mapeados al esquema relacional
 * (schema `mes`). Un solo lugar para el mapeo ORM; los DAO consumen estos
 * modelos. Sin `updated_at` en el esquema, todos los modelos van con
 * timestamps:false y las columnas de tiempo (ts/fecha/created_at) se exponen
 * como atributos gestionados por la base de datos.
 */
export function defineModels(sequelize) {
  const opts = (tableName) => ({
    schema: 'mes',
    tableName,
    underscored: true,
    timestamps: false,
  });

  const ProductionLine = sequelize.define(
    'ProductionLine',
    {
      id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
      code: { type: DataTypes.TEXT, allowNull: false, unique: true },
      name: { type: DataTypes.TEXT, allowNull: false },
      type: DataTypes.TEXT,
      active: { type: DataTypes.BOOLEAN, defaultValue: true },
    },
    opts('production_lines')
  );

  const Operator = sequelize.define(
    'Operator',
    {
      id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
      employeeId: { type: DataTypes.BIGINT, field: 'employee_id' },
      name: { type: DataTypes.TEXT, allowNull: false },
      role: DataTypes.TEXT,
      tipo: DataTypes.TEXT, // A|B|C|D (competencia)
      machines: { type: DataTypes.JSONB, defaultValue: [] },
      lineId: { type: DataTypes.BIGINT, field: 'line_id' },
      promedioMlHr: { type: DataTypes.DECIMAL(10, 2), field: 'promedio_ml_hr' },
      color: DataTypes.TEXT,
      initial: DataTypes.TEXT,
    },
    opts('operators')
  );

  const ProductionOrder = sequelize.define(
    'ProductionOrder',
    {
      id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
      code: { type: DataTypes.TEXT, allowNull: false, unique: true },
      cliente: DataTypes.TEXT,
      material: DataTypes.TEXT,
      medida: DataTypes.TEXT,
      rollos: { type: DataTypes.INTEGER, defaultValue: 0 },
      ancho: DataTypes.DECIMAL(8, 2),
      largo: DataTypes.DECIMAL(8, 2),
      procesos: { type: DataTypes.JSONB, defaultValue: [] },
      procesoActual: { type: DataTypes.TEXT, field: 'proceso_actual' },
      lineId: { type: DataTypes.BIGINT, field: 'line_id' },
      meta: { type: DataTypes.INTEGER, defaultValue: 0 },
      hechas: { type: DataTypes.INTEGER, defaultValue: 0 },
      m2: { type: DataTypes.DECIMAL(14, 2), defaultValue: 0 },
      terminados: { type: DataTypes.INTEGER, defaultValue: 0 },
      entregados: { type: DataTypes.INTEGER, defaultValue: 0 },
      pendientes: { type: DataTypes.INTEGER, defaultValue: 0 },
      enPiso: { type: DataTypes.INTEGER, defaultValue: 0, field: 'en_piso' },
      fechaPedido: { type: DataTypes.DATEONLY, field: 'fecha_pedido' },
      compromiso: DataTypes.DATEONLY,
      formaEntrega: { type: DataTypes.TEXT, field: 'forma_entrega' },
      estado: { type: DataTypes.TEXT, allowNull: false, defaultValue: 'cobranza-pendiente' },
      pagoConfirmado: { type: DataTypes.BOOLEAN, defaultValue: false, field: 'pago_confirmado' },
      materialEgresado: { type: DataTypes.BOOLEAN, defaultValue: false, field: 'material_egresado' },
      observaciones: DataTypes.TEXT,
      createdAt: { type: DataTypes.DATE, field: 'created_at' },
    },
    opts('production_orders')
  );

  const ProductionSuborder = sequelize.define(
    'ProductionSuborder',
    {
      id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
      orderId: { type: DataTypes.BIGINT, allowNull: false, field: 'order_id' },
      name: { type: DataTypes.TEXT, allowNull: false },
      rollos: { type: DataTypes.INTEGER, defaultValue: 0 },
      medida: DataTypes.TEXT,
      estado: DataTypes.TEXT,
    },
    opts('production_suborders')
  );

  const Roll = sequelize.define(
    'Roll',
    {
      id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
      code: { type: DataTypes.TEXT, allowNull: false, unique: true },
      material: DataTypes.TEXT,
      medida: DataTypes.TEXT,
      lote: DataTypes.TEXT,
      peso: DataTypes.DECIMAL(10, 2),
      ubicacion: DataTypes.TEXT,
      orderId: { type: DataTypes.BIGINT, field: 'order_id' },
      estado: { type: DataTypes.TEXT, allowNull: false, defaultValue: 'almacen' },
      empezado: { type: DataTypes.BOOLEAN, defaultValue: false },
    },
    opts('rolls')
  );

  const Aviso = sequelize.define(
    'Aviso',
    {
      id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
      ts: DataTypes.DATE,
      lineId: { type: DataTypes.BIGINT, field: 'line_id' },
      operatorId: { type: DataTypes.BIGINT, field: 'operator_id' },
      tipo: DataTypes.TEXT,
      descripcion: DataTypes.TEXT,
      tiempo: DataTypes.TEXT,
      estado: { type: DataTypes.TEXT, allowNull: false, defaultValue: 'abierto' },
    },
    opts('avisos')
  );

  const Merma = sequelize.define(
    'Merma',
    {
      id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
      fecha: DataTypes.DATEONLY,
      operatorId: { type: DataTypes.BIGINT, field: 'operator_id' },
      lineId: { type: DataTypes.BIGINT, field: 'line_id' },
      material: DataTypes.TEXT,
      metros: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
      categoria: DataTypes.TEXT, // prima|sobrante|defecto|desperdicio
      defecto: DataTypes.TEXT,
      orderId: { type: DataTypes.BIGINT, field: 'order_id' },
    },
    opts('mermas')
  );

  const Recepcion = sequelize.define(
    'Recepcion',
    {
      id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
      ts: DataTypes.DATE,
      proveedor: DataTypes.TEXT,
      material: DataTypes.TEXT,
      cantidad: DataTypes.DECIMAL(14, 2),
      unidad: DataTypes.TEXT,
      lote: DataTypes.TEXT,
      incidencia: DataTypes.TEXT,
      recibidoPor: { type: DataTypes.TEXT, field: 'recibido_por' },
    },
    opts('recepciones')
  );

  const Egreso = sequelize.define(
    'Egreso',
    {
      id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
      ts: DataTypes.DATE,
      orderId: { type: DataTypes.BIGINT, field: 'order_id' },
      material: DataTypes.TEXT,
      cantidad: DataTypes.DECIMAL(14, 2),
      unidad: DataTypes.TEXT,
      entregadoPor: { type: DataTypes.TEXT, field: 'entregado_por' },
    },
    opts('egresos')
  );

  const ProductoTerminado = sequelize.define(
    'ProductoTerminado',
    {
      id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
      ts: DataTypes.DATE,
      orderId: { type: DataTypes.BIGINT, field: 'order_id' },
      rollos: DataTypes.INTEGER,
      pesoTeorico: { type: DataTypes.DECIMAL(12, 2), field: 'peso_teorico' },
      pesoReal: { type: DataTypes.DECIMAL(12, 2), field: 'peso_real' },
      verificadoPor: { type: DataTypes.TEXT, field: 'verificado_por' },
    },
    opts('productos_terminados')
  );

  const Productividad = sequelize.define(
    'Productividad',
    {
      id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
      fecha: DataTypes.DATEONLY,
      turno: DataTypes.TEXT,
      lineId: { type: DataTypes.BIGINT, field: 'line_id' },
      operatorId: { type: DataTypes.BIGINT, field: 'operator_id' },
      metros: DataTypes.DECIMAL(12, 2),
      piezas: DataTypes.INTEGER,
      horas: DataTypes.DECIMAL(6, 2),
      mlHr: { type: DataTypes.DECIMAL(10, 2), field: 'ml_hr' },
      pzHr: { type: DataTypes.DECIMAL(10, 2), field: 'pz_hr' },
    },
    opts('productividad')
  );

  const Location = sequelize.define(
    'Location',
    {
      id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
      code: { type: DataTypes.TEXT, allowNull: false, unique: true },
      zona: DataTypes.TEXT,
      descripcion: DataTypes.TEXT,
      ocupada: { type: DataTypes.BOOLEAN, defaultValue: false },
    },
    opts('locations')
  );

  // Asociaciones: un pedido tiene sub-pedidos (caso real EZE 503 / Driscolls).
  ProductionOrder.hasMany(ProductionSuborder, { foreignKey: 'order_id', as: 'suborders' });
  ProductionSuborder.belongsTo(ProductionOrder, { foreignKey: 'order_id', as: 'order' });

  return {
    ProductionLine,
    Operator,
    ProductionOrder,
    ProductionSuborder,
    Roll,
    Aviso,
    Merma,
    Recepcion,
    Egreso,
    ProductoTerminado,
    Productividad,
    Location,
  };
}
