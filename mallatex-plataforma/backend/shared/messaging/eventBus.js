/**
 * EventBus — bus de eventos de dominio en proceso (patrón pub/sub).
 * Punto de extensión: en producción puede sustituirse por NATS/RabbitMQ/Kafka
 * sin tocar la capa de dominio; los servicios sólo publican eventos ya ocurridos.
 */
class InProcessEventBus {
  #handlers = new Map();

  subscribe(eventName, handler) {
    if (!this.#handlers.has(eventName)) this.#handlers.set(eventName, new Set());
    this.#handlers.get(eventName).add(handler);
    return () => this.#handlers.get(eventName)?.delete(handler);
  }

  async publish(event) {
    const handlers = this.#handlers.get(event.name);
    if (!handlers) return;
    await Promise.all([...handlers].map((h) => Promise.resolve(h(event))));
  }

  async publishAll(events = []) {
    for (const e of events) await this.publish(e);
  }
}

export const eventBus = new InProcessEventBus();
