/**
 * StatsService — métricas del dashboard de seguimiento de leads. Agrega totales,
 * captura de hoy, tasa de consentimiento, desgloses (interés/fuente/captador) y
 * la línea de tiempo por hora de la jornada del evento.
 */
export class StatsService {
  constructor({ leadDAO, drawDAO }) {
    this.leadDAO = leadDAO;
    this.drawDAO = drawDAO;
  }

  /** Cuenta ocurrencias por campo y devuelve pares {label, value} ordenados. */
  static contarPor(items, key) {
    const map = new Map();
    for (const it of items) {
      const k = it[key] || 'Sin especificar';
      map.set(k, (map.get(k) || 0) + 1);
    }
    return [...map.entries()]
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value);
  }

  /** Resumen del dashboard (opcionalmente por evento). */
  async dashboard({ event } = {}) {
    const leads = event ? await this.leadDAO.porEvento(event) : await this.leadDAO.todos();
    const draws = event ? await this.drawDAO.porEvento(event) : await this.drawDAO.todos();

    const iso = (v) => (v ? new Date(v).toISOString() : '');
    const hoy = new Date().toISOString().slice(0, 10);
    const leadsHoy = leads.filter((l) => iso(l.createdAt).slice(0, 10) === hoy).length;
    const conConsentimiento = leads.filter((l) => l.consentimiento).length;

    // Línea de tiempo por hora (YYYY-MM-DDTHH).
    const porHora = new Map();
    for (const l of leads) {
      const h = iso(l.createdAt).slice(0, 13);
      if (!h) continue;
      porHora.set(h, (porHora.get(h) || 0) + 1);
    }
    const timeline = [...porHora.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([k, value]) => ({ label: k.slice(11) + ':00', value }));

    return {
      total: leads.length,
      hoy: leadsHoy,
      conConsentimiento,
      tasaConsentimiento: leads.length ? Math.round((conConsentimiento / leads.length) * 100) : 0,
      ganadores: draws.length,
      porInteres: StatsService.contarPor(leads, 'interes'),
      porFuente: StatsService.contarPor(leads, 'fuente'),
      porCaptador: StatsService.contarPor(leads.filter((l) => l.capturadoPor), 'capturadoPor'),
      timeline,
    };
  }
}
