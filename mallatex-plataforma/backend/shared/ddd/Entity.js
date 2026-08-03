import { randomUUID } from 'node:crypto';

/**
 * Entity — objeto de dominio con identidad. La igualdad se basa en el id,
 * no en los atributos.
 */
export class Entity {
  #id;

  constructor(id) {
    this.#id = id ?? randomUUID();
  }

  get id() {
    return this.#id;
  }

  equals(other) {
    if (other == null || !(other instanceof Entity)) return false;
    if (other === this) return true;
    return this.#id === other.id;
  }
}

/**
 * ValueObject — objeto sin identidad; la igualdad es estructural.
 * Extiende y expón sus props vía un getter `props`.
 */
export class ValueObject {
  constructor(props) {
    this.props = Object.freeze({ ...props });
  }

  equals(other) {
    if (other == null || !(other instanceof ValueObject)) return false;
    return JSON.stringify(this.props) === JSON.stringify(other.props);
  }
}
