import { ESTADOS_PEDIDO, ESTADOS_ACTIVOS } from '../domain/constants.js';

/**
 * BoardService — tableros y KPIs del MES. Agrega el estado del piso para
 * producción/dirección: pedidos por estado, avance por línea, alertas urgentes
 * y KPIs por proceso formal (MT-PC-001 ingreso, MT-PC-002 egreso, MT-PC-003
 * producción) más un indicador tipo OEE.
 */
export class BoardService {
  constructor({
    orderDAO,
    lineDAO,
    avisoDAO,
    productividadDAO,
    mermaDAO,
    recepcionDAO,
    egresoDAO,
    productoTerminadoDAO,
  }) {
    this.orderDAO = orderDAO;
    this.lineDAO = lineDAO;
    this.avisoDAO = avisoDAO;
    this.productividadDAO = productividadDAO;
    this.mermaDAO = mermaDAO;
    this.recepcionDAO = recepcionDAO;
    this.egresoDAO = egresoDAO;
    this.productoTerminadoDAO = productoTerminadoDAO;
  }

  /** Tablero operativo: pedidos por estado, líneas con avance y alertas. */
  async tablero() {
    const [orders, lines, avisos] = await Promise.all([
      this.orderDAO.findAll(),
      this.lineDAO.list(),
      this.avisoDAO.list(),
    ]);

    const ordersByEstado = Object.fromEntries(ESTADOS_PEDIDO.map((e) => [e, 0]));
    for (const o of orders) ordersByEstado[o.estado] = (ordersByEstado[o.estado] || 0) + 1;

    const activos = orders.filter((o) => ESTADOS_ACTIVOS.includes(o.estado));
    const lineStatus = lines.map((l) => {
      const enLinea = activos.filter((o) => String(o.lineId) === String(l.id));
      const meta = enLinea.reduce((s, o) => s + (o.meta || 0), 0);
      const hechas = enLinea.reduce((s, o) => s + (o.terminados || 0), 0);
      return {
        id: l.id,
        code: l.code,
        name: l.name,
        type: l.type,
        active: l.active,
        pedidos: enLinea.map((o) => ({ id: o.id, code: o.code, procesoActual: o.procesoActual })),
        meta,
        hechas,
        progreso: meta ? Math.min(Math.round((hechas / meta) * 100), 100) : 0,
      };
    });

    const urgentAlerts = avisos
      .filter((a) => a.estado !== 'resuelto')
      .map((a) => ({ id: a.id, lineId: a.lineId, tipo: a.tipo, descripcion: a.descripcion, estado: a.estado }));

    return {
      ordersByEstado,
      totalPedidos: orders.length,
      enProduccion: activos.length,
      lines: lineStatus,
      urgentAlerts,
    };
  }

  /** KPIs por proceso formal + indicador tipo OEE. */
  async kpis() {
    const [orders, prod, mermas, recepciones, egresos, terminados] = await Promise.all([
      this.orderDAO.findAll(),
      this.productividadDAO.list(),
      this.mermaDAO.list(),
      this.recepcionDAO.list(),
      this.egresoDAO.list(),
      this.productoTerminadoDAO.list(),
    ]);

    // Producción por línea (a partir de la productividad por turno).
    const porLinea = {};
    for (const p of prod) {
      const key = p.lineId ?? 'sin-linea';
      const acc = (porLinea[key] ||= { lineId: p.lineId, metros: 0, piezas: 0, horas: 0 });
      acc.metros += Number(p.metros || 0);
      acc.piezas += Number(p.piezas || 0);
      acc.horas += Number(p.horas || 0);
    }
    const produccionPorLinea = Object.values(porLinea).map((a) => ({
      ...a,
      mlHr: a.horas ? Number((a.metros / a.horas).toFixed(2)) : 0,
      pzHr: a.horas ? Number((a.piezas / a.horas).toFixed(2)) : 0,
    }));

    const metrosProducidos = prod.reduce((s, p) => s + Number(p.metros || 0), 0);
    const metrosMerma = mermas.reduce((s, m) => s + Number(m.metros || 0), 0);
    const metaTotal = orders.reduce((s, o) => s + (o.meta || 0), 0);
    const terminadosTotal = orders.reduce((s, o) => s + (o.terminados || 0), 0);

    // OEE-ish: calidad (merma), cumplimiento (avance de meta) y su composición.
    const calidad = metrosProducidos > 0 ? (metrosProducidos - metrosMerma) / metrosProducidos : 0;
    const cumplimiento = metaTotal > 0 ? terminadosTotal / metaTotal : 0;
    const oee = Number((calidad * cumplimiento * 100).toFixed(1));

    return {
      oee,
      calidad: Number((calidad * 100).toFixed(1)),
      cumplimiento: Number((cumplimiento * 100).toFixed(1)),
      produccionPorLinea,
      procesos: {
        // MT-PC-001 — Ingreso de material
        'MT-PC-001': {
          recepciones: recepciones.length,
          cantidad: recepciones.reduce((s, r) => s + Number(r.cantidad || 0), 0),
        },
        // MT-PC-002 — Egreso de material
        'MT-PC-002': {
          egresos: egresos.length,
          cantidad: egresos.reduce((s, e) => s + Number(e.cantidad || 0), 0),
        },
        // MT-PC-003 — Producción
        'MT-PC-003': {
          metrosProducidos,
          metrosMerma,
          piezasTerminadas: terminadosTotal,
          metaTotal,
          pesajes: terminados.length,
        },
      },
    };
  }
}
