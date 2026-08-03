import { DataTypes } from 'sequelize';

/**
 * Definición de modelos Sequelize del contexto crm, mapeados al esquema
 * relacional (schema `crm`). Un solo lugar para el mapeo ORM; los DAO
 * consumen estos modelos. Las tablas del CRM sólo tienen `created_at`
 * (no `updated_at`), por lo que se desactivan los timestamps automáticos y
 * se mapea `createdAt` de forma explícita donde la tabla lo tiene.
 *
 * Las FK a empleados (assigned_to, employee_id) referencian
 * attendance.employees(id): se guarda sólo el BIGINT, sin asociación
 * entre esquemas. Se define además un modelo de LECTURA de empleados para
 * enriquecer respuestas con el nombre y validar asignaciones.
 */
export function defineModels(sequelize) {
  const common = { schema: 'crm', underscored: true, timestamps: false };

  const Client = sequelize.define(
    'Client',
    {
      id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
      name: { type: DataTypes.TEXT, allowNull: false },
      type: { type: DataTypes.TEXT, allowNull: false, defaultValue: 'prospecto' },
      stage: DataTypes.TEXT,
      contactName: { type: DataTypes.TEXT, field: 'contact_name' },
      phone: DataTypes.TEXT,
      email: DataTypes.TEXT,
      address: DataTypes.TEXT,
      lat: DataTypes.DECIMAL(10, 7),
      lng: DataTypes.DECIMAL(10, 7),
      cultivo: DataTypes.TEXT,
      assignedTo: { type: DataTypes.BIGINT, field: 'assigned_to' },
      notes: DataTypes.TEXT,
      active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      createdAt: { type: DataTypes.DATE, field: 'created_at', defaultValue: DataTypes.NOW },
    },
    { ...common, tableName: 'clients' }
  );

  const SalesRoute = sequelize.define(
    'SalesRoute',
    {
      id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
      employeeId: { type: DataTypes.BIGINT, allowNull: false, field: 'employee_id' },
      date: { type: DataTypes.DATEONLY, defaultValue: DataTypes.NOW },
      status: { type: DataTypes.TEXT, allowNull: false, defaultValue: 'activa' },
      startedAt: { type: DataTypes.DATE, field: 'started_at' },
      endedAt: { type: DataTypes.DATE, field: 'ended_at' },
      plannedClientIds: { type: DataTypes.JSONB, allowNull: false, defaultValue: [], field: 'planned_client_ids' },
      track: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
    },
    { ...common, tableName: 'sales_routes' }
  );

  const Visit = sequelize.define(
    'Visit',
    {
      id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
      employeeId: { type: DataTypes.BIGINT, allowNull: false, field: 'employee_id' },
      clientId: { type: DataTypes.BIGINT, field: 'client_id' },
      routeId: { type: DataTypes.BIGINT, field: 'route_id' },
      ts: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
      lat: DataTypes.DECIMAL(10, 7),
      lng: DataTypes.DECIMAL(10, 7),
      found: DataTypes.BOOLEAN,
      status: DataTypes.TEXT,
      type: DataTypes.TEXT,
      notes: DataTypes.TEXT,
      photos: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
      offline: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    },
    { ...common, tableName: 'visits' }
  );

  const SalesObjective = sequelize.define(
    'SalesObjective',
    {
      id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
      employeeId: { type: DataTypes.BIGINT, allowNull: false, field: 'employee_id' },
      period: { type: DataTypes.TEXT, allowNull: false },
      targetAmount: { type: DataTypes.DECIMAL(14, 2), allowNull: false, defaultValue: 0, field: 'target_amount' },
      achievedAmount: { type: DataTypes.DECIMAL(14, 2), allowNull: false, defaultValue: 0, field: 'achieved_amount' },
    },
    { ...common, tableName: 'sales_objectives' }
  );

  const Product = sequelize.define(
    'Product',
    {
      id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
      sku: { type: DataTypes.TEXT, allowNull: false, unique: true },
      name: { type: DataTypes.TEXT, allowNull: false },
      category: DataTypes.TEXT,
      unit: { type: DataTypes.TEXT, allowNull: false, defaultValue: 'm2' },
      price: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      stock: { type: DataTypes.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
      warehouse: DataTypes.TEXT,
      specs: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
      active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    },
    { ...common, tableName: 'products' }
  );

  const Quote = sequelize.define(
    'Quote',
    {
      id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
      employeeId: { type: DataTypes.BIGINT, allowNull: false, field: 'employee_id' },
      clientId: { type: DataTypes.BIGINT, field: 'client_id' },
      items: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
      subtotal: { type: DataTypes.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
      iva: { type: DataTypes.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
      total: { type: DataTypes.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
      folio: { type: DataTypes.TEXT, unique: true },
      status: { type: DataTypes.TEXT, allowNull: false, defaultValue: 'borrador' },
      createdAt: { type: DataTypes.DATE, field: 'created_at', defaultValue: DataTypes.NOW },
    },
    { ...common, tableName: 'quotes' }
  );

  const Order = sequelize.define(
    'Order',
    {
      id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
      employeeId: { type: DataTypes.BIGINT, allowNull: false, field: 'employee_id' },
      clientId: { type: DataTypes.BIGINT, field: 'client_id' },
      quoteId: { type: DataTypes.BIGINT, field: 'quote_id' },
      items: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
      subtotal: { type: DataTypes.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
      iva: { type: DataTypes.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
      total: { type: DataTypes.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
      folio: { type: DataTypes.TEXT, unique: true },
      status: { type: DataTypes.TEXT, allowNull: false, defaultValue: 'nuevo' },
      createdAt: { type: DataTypes.DATE, field: 'created_at', defaultValue: DataTypes.NOW },
    },
    { ...common, tableName: 'orders' }
  );

  const ExpenseRequest = sequelize.define(
    'ExpenseRequest',
    {
      id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
      employeeId: { type: DataTypes.BIGINT, allowNull: false, field: 'employee_id' },
      concept: DataTypes.TEXT,
      destination: DataTypes.TEXT,
      amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      fromDate: { type: DataTypes.DATEONLY, field: 'from_date' },
      toDate: { type: DataTypes.DATEONLY, field: 'to_date' },
      status: { type: DataTypes.TEXT, allowNull: false, defaultValue: 'solicitada' },
      folio: { type: DataTypes.TEXT, unique: true },
      decidedBy: { type: DataTypes.TEXT, field: 'decided_by' },
      createdAt: { type: DataTypes.DATE, field: 'created_at', defaultValue: DataTypes.NOW },
    },
    { ...common, tableName: 'expense_requests' }
  );

  const Expense = sequelize.define(
    'Expense',
    {
      id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
      employeeId: { type: DataTypes.BIGINT, allowNull: false, field: 'employee_id' },
      requestId: { type: DataTypes.BIGINT, field: 'request_id' },
      category: DataTypes.TEXT,
      merchant: DataTypes.TEXT,
      amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      date: DataTypes.DATEONLY,
      hasInvoice: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'has_invoice' },
      rfc: DataTypes.TEXT,
      photo: DataTypes.TEXT,
      status: { type: DataTypes.TEXT, allowNull: false, defaultValue: 'solicitada' },
      folio: { type: DataTypes.TEXT, unique: true },
      createdAt: { type: DataTypes.DATE, field: 'created_at', defaultValue: DataTypes.NOW },
    },
    { ...common, tableName: 'expenses' }
  );

  const Invoice = sequelize.define(
    'Invoice',
    {
      id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
      employeeId: { type: DataTypes.BIGINT, field: 'employee_id' },
      clientId: { type: DataTypes.BIGINT, field: 'client_id' },
      orderId: { type: DataTypes.BIGINT, field: 'order_id' },
      rfc: DataTypes.TEXT,
      razonSocial: { type: DataTypes.TEXT, field: 'razon_social' },
      usoCfdi: { type: DataTypes.TEXT, field: 'uso_cfdi' },
      amount: { type: DataTypes.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
      status: { type: DataTypes.TEXT, allowNull: false, defaultValue: 'solicitada' },
      uuid: DataTypes.TEXT,
      folio: { type: DataTypes.TEXT, unique: true },
      paidAt: { type: DataTypes.DATE, field: 'paid_at' },
      paymentRef: { type: DataTypes.TEXT, field: 'payment_ref' },
      createdAt: { type: DataTypes.DATE, field: 'created_at', defaultValue: DataTypes.NOW },
    },
    { ...common, tableName: 'invoices' }
  );

  // Modelo de LECTURA de empleados (propiedad del contexto attendance) usado
  // sólo para enriquecer con el nombre del vendedor y validar asignaciones.
  const EmployeeRead = sequelize.define(
    'EmployeeRead',
    {
      id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
      code: DataTypes.TEXT,
      name: DataTypes.TEXT,
      department: DataTypes.TEXT,
      position: DataTypes.TEXT,
      active: { type: DataTypes.BOOLEAN, defaultValue: true },
    },
    { schema: 'attendance', tableName: 'employees', underscored: true, timestamps: false }
  );

  return {
    Client,
    SalesRoute,
    Visit,
    SalesObjective,
    Product,
    Quote,
    Order,
    ExpenseRequest,
    Expense,
    Invoice,
    EmployeeRead,
  };
}
