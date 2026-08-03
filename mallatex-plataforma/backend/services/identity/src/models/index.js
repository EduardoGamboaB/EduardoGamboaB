import { DataTypes } from 'sequelize';

/**
 * Definición de modelos Sequelize del contexto identity, mapeados al esquema
 * relacional (schema `identity`). Un solo lugar para el mapeo ORM; los DAO
 * consumen estos modelos.
 */
export function defineModels(sequelize) {
  const User = sequelize.define(
    'User',
    {
      id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
      name: { type: DataTypes.TEXT, allowNull: false },
      email: { type: DataTypes.TEXT, allowNull: false, unique: true },
      role: { type: DataTypes.TEXT, allowNull: false, defaultValue: 'comercial' },
      position: DataTypes.TEXT,
      passwordHash: { type: DataTypes.TEXT, allowNull: false, field: 'password_hash' },
      active: { type: DataTypes.BOOLEAN, defaultValue: true },
      extraModules: { type: DataTypes.JSONB, defaultValue: [], field: 'extra_modules' },
      revokedModules: { type: DataTypes.JSONB, defaultValue: [], field: 'revoked_modules' },
    },
    { schema: 'identity', tableName: 'users', underscored: true, timestamps: true }
  );

  const ModuleCatalog = sequelize.define(
    'ModuleCatalog',
    {
      key: { type: DataTypes.TEXT, primaryKey: true },
      surface: { type: DataTypes.TEXT, primaryKey: true },
      grp: DataTypes.TEXT,
      label: { type: DataTypes.TEXT, allowNull: false },
      sort: { type: DataTypes.INTEGER, defaultValue: 0 },
    },
    { schema: 'identity', tableName: 'module_catalog', underscored: true, timestamps: false }
  );

  const AccessGrant = sequelize.define(
    'AccessGrant',
    {
      subjectType: { type: DataTypes.TEXT, primaryKey: true, field: 'subject_type' },
      subjectKey: { type: DataTypes.TEXT, primaryKey: true, field: 'subject_key' },
      surface: { type: DataTypes.TEXT, primaryKey: true },
      moduleKey: { type: DataTypes.TEXT, primaryKey: true, field: 'module_key' },
    },
    { schema: 'identity', tableName: 'access_grant', underscored: true, timestamps: false }
  );

  // Modelo de lectura de empleados (propiedad del contexto attendance) usado
  // aquí sólo para el login unificado por código+PIN y la resolución de módulos.
  const EmployeeAuth = sequelize.define(
    'EmployeeAuth',
    {
      id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
      code: { type: DataTypes.TEXT, allowNull: false, unique: true },
      name: DataTypes.TEXT,
      department: DataTypes.TEXT,
      position: DataTypes.TEXT,
      pinHash: { type: DataTypes.TEXT, field: 'pin_hash' },
      workMode: { type: DataTypes.TEXT, field: 'work_mode' },
      appProfile: { type: DataTypes.TEXT, field: 'app_profile' },
      active: { type: DataTypes.BOOLEAN, defaultValue: true },
      extraModules: { type: DataTypes.JSONB, defaultValue: [], field: 'extra_modules' },
      revokedModules: { type: DataTypes.JSONB, defaultValue: [], field: 'revoked_modules' },
      portalExtraModules: { type: DataTypes.JSONB, defaultValue: [], field: 'portal_extra_modules' },
      portalRevokedModules: { type: DataTypes.JSONB, defaultValue: [], field: 'portal_revoked_modules' },
    },
    { schema: 'attendance', tableName: 'employees', underscored: true, timestamps: true }
  );

  return { User, ModuleCatalog, AccessGrant, EmployeeAuth };
}
