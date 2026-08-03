import { Entity } from './Entity.js';

/**
 * DomainEvent — hecho de dominio ya ocurrido, en pasado (p.ej. PedidoLiberado).
 */
export class DomainEvent {
  constructor(name, payload = {}) {
    this.name = name;
    this.payload = payload;
    this.occurredAt = new Date();
  }
}

/**
 * AggregateRoot — raíz de un agregado. Punto de entrada transaccional y
 * emisor de eventos de dominio que el bus publica tras persistir.
 */
export class AggregateRoot extends Entity {
  #domainEvents = [];

  addDomainEvent(event) {
    this.#domainEvents.push(event);
  }

  pullDomainEvents() {
    const events = [...this.#domainEvents];
    this.#domainEvents = [];
    return events;
  }

  get domainEvents() {
    return [...this.#domainEvents];
  }
}
