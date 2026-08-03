/**
 * Result — patrón Result/Either para el flujo de casos de uso sin excepciones
 * en la capa de aplicación/dominio.
 */
export class Result {
  #isSuccess;
  #error;
  #value;

  constructor(isSuccess, error, value) {
    if (isSuccess && error) {
      throw new Error('Un Result exitoso no puede contener un error.');
    }
    if (!isSuccess && !error) {
      throw new Error('Un Result fallido debe contener un error.');
    }
    this.#isSuccess = isSuccess;
    this.#error = error;
    this.#value = value;
    Object.freeze(this);
  }

  get isSuccess() {
    return this.#isSuccess;
  }

  get isFailure() {
    return !this.#isSuccess;
  }

  get error() {
    return this.#error;
  }

  getValue() {
    if (!this.#isSuccess) {
      throw new Error('No se puede obtener el valor de un Result fallido.');
    }
    return this.#value;
  }

  static ok(value) {
    return new Result(true, null, value);
  }

  static fail(error) {
    return new Result(false, error, null);
  }

  /** Combina múltiples resultados; devuelve el primero fallido o un ok(). */
  static combine(results) {
    for (const r of results) {
      if (r.isFailure) return r;
    }
    return Result.ok();
  }
}

/** Error de dominio con código estable para mapear a HTTP en la capa de interfaces. */
export class DomainError extends Error {
  constructor(message, { code = 'DOMAIN_ERROR', status = 400, details = null } = {}) {
    super(message);
    this.name = 'DomainError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}
