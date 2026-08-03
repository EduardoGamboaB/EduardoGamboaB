/**
 * WarehouseService — casos de uso de almacén: recepción de material
 * (MT-DT-001), egreso a producción (MT-DT-002), pesaje de producto terminado
 * (MT-DT-006, teórico vs real) y catálogo de ubicaciones.
 */
export class WarehouseService {
  constructor({ recepcionDAO, egresoDAO, productoTerminadoDAO, locationDAO }) {
    this.recepcionDAO = recepcionDAO;
    this.egresoDAO = egresoDAO;
    this.productoTerminadoDAO = productoTerminadoDAO;
    this.locationDAO = locationDAO;
  }

  // ---- Recepciones (MT-DT-001) -------------------------------------
  recepciones() {
    return this.recepcionDAO.list();
  }

  createRecepcion(data) {
    return this.recepcionDAO.create({ ...data, ts: data.ts || new Date() });
  }

  // ---- Egresos (MT-DT-002) -----------------------------------------
  egresos(filters) {
    return this.egresoDAO.list(filters);
  }

  createEgreso(data) {
    return this.egresoDAO.create({ ...data, ts: data.ts || new Date() });
  }

  // ---- Producto terminado / pesaje (MT-DT-006) ---------------------
  productosTerminados(filters) {
    return this.productoTerminadoDAO.list(filters);
  }

  /** Registra el pesaje final y expone la diferencia teórico vs real. */
  async createProductoTerminado(data) {
    const teorico = Number(data.pesoTeorico ?? 0);
    const real = Number(data.pesoReal ?? 0);
    const row = await this.productoTerminadoDAO.create({ ...data, ts: data.ts || new Date() });
    return { ...row, diferencia: Number((real - teorico).toFixed(2)) };
  }

  // ---- Ubicaciones --------------------------------------------------
  locations() {
    return this.locationDAO.list();
  }

  createLocation(data) {
    return this.locationDAO.create(data);
  }
}
