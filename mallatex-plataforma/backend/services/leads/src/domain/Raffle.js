/**
 * Raffle — servicio de dominio del sorteo. Contiene la lógica pura de
 * elegibilidad y selección del ganador, sin dependencias de infraestructura.
 * Opera sobre objetos "lead-like" (id, eventId, email, telefono, folio,
 * consentimiento) y "draw-like" (eventId, leadId).
 */
export class Raffle {
  /**
   * Clave de identidad de una persona, para cruzar ganadores entre eventos.
   * Prioriza email → teléfono → id (mismo criterio que la captura).
   */
  static persona(l) {
    return (l.email || '').toLowerCase() || l.telefono || String(l.id);
  }

  /**
   * Leads elegibles de un evento según opciones y el toggle del evento:
   *  - soloConsentimiento: excluye a quien no dio consentimiento.
   *  - evitarRepetidos: excluye a quien ya ganó en ESTE evento.
   *  - permiteGanadoresPrevios (del evento): si es false, excluye a quien ya
   *    ganó en OTROS eventos (cruce por identidad de persona).
   */
  static elegibles(leads, draws, event, { soloConsentimiento = false, evitarRepetidos = true } = {}) {
    const ganadoresEsteEvento = new Set(
      draws.filter((d) => String(d.eventId) === String(event.id)).map((d) => String(d.leadId))
    );
    // Personas que ya ganaron en OTROS eventos.
    const ganadoresOtros = new Set(
      draws
        .filter((d) => String(d.eventId) !== String(event.id))
        .map((d) => leads.find((l) => String(l.id) === String(d.leadId)))
        .filter(Boolean)
        .map((l) => Raffle.persona(l))
    );

    return leads.filter((l) => {
      if (String(l.eventId) !== String(event.id)) return false;
      if (soloConsentimiento && !l.consentimiento) return false;
      if (evitarRepetidos && ganadoresEsteEvento.has(String(l.id))) return false;
      if (!event.permiteGanadoresPrevios && ganadoresOtros.has(Raffle.persona(l))) return false;
      return true;
    });
  }

  /** Selecciona un ganador al azar del pool (o null si está vacío). */
  static sortear(pool) {
    if (!pool.length) return null;
    return pool[Math.floor(Math.random() * pool.length)];
  }
}
