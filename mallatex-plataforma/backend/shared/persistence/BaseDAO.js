/**
 * BaseDAO — Data Access Object genérico sobre un modelo Sequelize.
 *
 * Aísla la capa de dominio/aplicación de la persistencia: los servicios
 * trabajan contra esta interfaz (find/save/delete) y opcionalmente mapean
 * filas ORM a entidades de dominio mediante los hooks `toDomain`/`toPersistence`.
 *
 * Cada repositorio de dominio hereda de BaseDAO y define su mapeo.
 */
export class BaseDAO {
  /**
   * @param {import('sequelize').ModelStatic} model  Modelo Sequelize.
   */
  constructor(model) {
    if (!model) throw new Error('BaseDAO requiere un modelo Sequelize.');
    this.model = model;
  }

  /** Hook: fila ORM -> entidad de dominio. Por defecto, objeto plano. */
  toDomain(row) {
    return row ? row.get({ plain: true }) : null;
  }

  /** Hook: entidad de dominio -> atributos persistibles. */
  toPersistence(entity) {
    return entity;
  }

  async findById(id, options = {}) {
    const row = await this.model.findByPk(id, options);
    return this.toDomain(row);
  }

  async findOne(where, options = {}) {
    const row = await this.model.findOne({ where, ...options });
    return this.toDomain(row);
  }

  async findAll(where = {}, options = {}) {
    const rows = await this.model.findAll({ where, ...options });
    return rows.map((r) => this.toDomain(r));
  }

  async paginate(where = {}, { page = 1, pageSize = 25, order, ...rest } = {}) {
    const limit = Math.min(Math.max(pageSize, 1), 200);
    const offset = (Math.max(page, 1) - 1) * limit;
    const { rows, count } = await this.model.findAndCountAll({
      where,
      limit,
      offset,
      order,
      ...rest,
    });
    return {
      items: rows.map((r) => this.toDomain(r)),
      total: count,
      page,
      pageSize: limit,
      pages: Math.ceil(count / limit),
    };
  }

  async count(where = {}) {
    return this.model.count({ where });
  }

  async exists(where) {
    return (await this.model.count({ where })) > 0;
  }

  async create(data, options = {}) {
    const row = await this.model.create(this.toPersistence(data), options);
    return this.toDomain(row);
  }

  async bulkCreate(list, options = {}) {
    const rows = await this.model.bulkCreate(
      list.map((d) => this.toPersistence(d)),
      options
    );
    return rows.map((r) => this.toDomain(r));
  }

  async update(id, data, options = {}) {
    const row = await this.model.findByPk(id, options);
    if (!row) return null;
    await row.update(this.toPersistence(data), options);
    return this.toDomain(row);
  }

  /** Upsert por PK/uniques; devuelve la entidad resultante. */
  async save(data, options = {}) {
    const [row] = await this.model.upsert(this.toPersistence(data), {
      returning: true,
      ...options,
    });
    return this.toDomain(row);
  }

  async delete(id, options = {}) {
    return this.model.destroy({ where: { id }, ...options });
  }

  async deleteWhere(where, options = {}) {
    return this.model.destroy({ where, ...options });
  }
}
