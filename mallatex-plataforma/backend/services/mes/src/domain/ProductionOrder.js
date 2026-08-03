import { AggregateRoot, DomainEvent, DomainError } from '@mallatex/shared/ddd';
import { ESTADOS_PEDIDO } from './constants.js';

/**
 * ProductionOrder — raíz de agregado del contexto MES. Modela un pedido de
 * producción (bitácora que reemplaza el Excel PLANEACION_DE_PEDIDOS) con sus
 * invariantes: avance por procesos, control de piezas terminadas y — sobre
 * todo — la compuerta de cobranza (MT-PC-003): un pedido no puede liberarse a
 * producción sin el pago confirmado.
 */
export class ProductionOrder extends AggregateRoot {
  constructor(props) {
    super(props.id);
    this.code = props.code;
    this.cliente = props.cliente || null;
    this.material = props.material || null;
    this.medida = props.medida || null;
    this.rollos = Number(props.rollos ?? 0);
    this.ancho = props.ancho ?? null;
    this.largo = props.largo ?? null;
    this.procesos = props.procesos || [];
    this.procesoActual = props.procesoActual ?? null;
    this.lineId = props.lineId ?? null;
    this.meta = Number(props.meta ?? 0);
    this.hechas = Number(props.hechas ?? 0);
    this.m2 = Number(props.m2 ?? 0);
    this.terminados = Number(props.terminados ?? 0);
    this.entregados = Number(props.entregados ?? 0);
    this.pendientes = Number(props.pendientes ?? Math.max(this.meta - this.terminados, 0));
    this.enPiso = Number(props.enPiso ?? 0);
    this.fechaPedido = props.fechaPedido ?? null;
    this.compromiso = props.compromiso ?? null;
    this.formaEntrega = props.formaEntrega ?? null;
    this.estado = props.estado || 'cobranza-pendiente';
    this.pagoConfirmado = props.pagoConfirmado ?? false;
    this.materialEgresado = props.materialEgresado ?? false;
    this.observaciones = props.observaciones ?? null;
    this.createdAt = props.createdAt ?? null;
  }

  static create(props) {
    if (!props.code) {
      throw new DomainError('El código de pedido es obligatorio', { code: 'ORDER_CODE_REQUIRED' });
    }
    if (props.estado && !ESTADOS_PEDIDO.includes(props.estado)) {
      throw new DomainError(`Estado inválido: ${props.estado}`, { code: 'ORDER_ESTADO_INVALID' });
    }
    if (Number(props.meta ?? 0) < 0) {
      throw new DomainError('La meta no puede ser negativa', { code: 'ORDER_META_INVALID' });
    }
    const order = new ProductionOrder(props);
    order.addDomainEvent(
      new DomainEvent('PedidoRegistrado', { code: order.code, cliente: order.cliente, meta: order.meta })
    );
    return order;
  }

  /**
   * Compuerta de cobranza (MT-PC-003): libera el pedido a producción. Requiere
   * que el pago esté confirmado; de lo contrario la operación se rechaza y el
   * pedido permanece pendiente de cobranza.
   */
  liberarPedido() {
    if (this.estado === 'entregado' || this.estado === 'terminado') {
      throw new DomainError('El pedido ya fue producido', { code: 'ORDER_ALREADY_DONE', status: 409 });
    }
    if (!this.pagoConfirmado) {
      throw new DomainError('No se puede liberar: pago no confirmado por cobranza', {
        code: 'ORDER_COBRANZA_PENDIENTE',
        status: 409,
      });
    }
    this.estado = 'liberado';
    this.addDomainEvent(new DomainEvent('PedidoLiberado', { code: this.code }));
    return this;
  }

  /** Confirma el pago (rol cobranza). Habilita la posterior liberación. */
  confirmarPago() {
    this.pagoConfirmado = true;
    this.addDomainEvent(new DomainEvent('PagoConfirmado', { code: this.code }));
    return this;
  }

  /** Marca el material como egresado de almacén (MT-PC-002) y pasa a piso. */
  marcarMaterialEgresado() {
    if (!this.pagoConfirmado) {
      throw new DomainError('No se puede egresar material sin pago confirmado', {
        code: 'ORDER_COBRANZA_PENDIENTE',
        status: 409,
      });
    }
    this.materialEgresado = true;
    if (this.estado === 'liberado') this.estado = 'material-egresado';
    this.addDomainEvent(new DomainEvent('MaterialEgresado', { code: this.code }));
    return this;
  }

  /**
   * Avanza el pedido al siguiente proceso de su ruta (procesos[]). Al arrancar
   * pone el pedido en producción; al superar el último proceso lo marca como
   * terminado. Emite ProcesoAvanzado / PedidoTerminado.
   */
  avanzarProceso() {
    if (!this.pagoConfirmado) {
      throw new DomainError('No se puede producir sin pago confirmado', {
        code: 'ORDER_COBRANZA_PENDIENTE',
        status: 409,
      });
    }
    const ruta = this.procesos || [];
    if (ruta.length === 0) {
      throw new DomainError('El pedido no tiene ruta de procesos definida', {
        code: 'ORDER_SIN_RUTA',
        status: 409,
      });
    }
    const idx = this.procesoActual ? ruta.indexOf(this.procesoActual) : -1;
    const next = idx + 1;
    if (next >= ruta.length) {
      this.procesoActual = null;
      this.estado = 'terminado';
      this.addDomainEvent(new DomainEvent('PedidoTerminado', { code: this.code }));
      return this;
    }
    this.procesoActual = ruta[next];
    if (this.estado !== 'en-produccion') this.estado = 'en-produccion';
    this.addDomainEvent(
      new DomainEvent('ProcesoAvanzado', { code: this.code, proceso: this.procesoActual })
    );
    return this;
  }

  /**
   * Registra n piezas terminadas en el proceso actual. Recalcula pendientes y
   * marca el pedido como terminado si alcanza la meta.
   */
  registrarTerminados(n) {
    const cant = Number(n);
    if (!Number.isFinite(cant) || cant <= 0) {
      throw new DomainError('La cantidad debe ser un número positivo', { code: 'ORDER_QTY_INVALID' });
    }
    if (this.terminados + cant > this.meta && this.meta > 0) {
      throw new DomainError('No se pueden registrar más piezas que la meta', {
        code: 'ORDER_META_EXCEDIDA',
        status: 409,
      });
    }
    this.terminados += cant;
    this.hechas += cant;
    this.pendientes = Math.max(this.meta - this.terminados, 0);
    this.addDomainEvent(
      new DomainEvent('TerminadosRegistrados', { code: this.code, cantidad: cant, terminados: this.terminados })
    );
    if (this.meta > 0 && this.terminados >= this.meta) {
      this.estado = 'terminado';
      this.addDomainEvent(new DomainEvent('PedidoTerminado', { code: this.code }));
    }
    return this;
  }

  get progreso() {
    if (!this.meta) return 0;
    return Math.min(Math.round((this.terminados / this.meta) * 100), 100);
  }

  toPlain() {
    return {
      id: this.id,
      code: this.code,
      cliente: this.cliente,
      material: this.material,
      medida: this.medida,
      rollos: this.rollos,
      ancho: this.ancho,
      largo: this.largo,
      procesos: this.procesos,
      procesoActual: this.procesoActual,
      lineId: this.lineId,
      meta: this.meta,
      hechas: this.hechas,
      m2: this.m2,
      terminados: this.terminados,
      entregados: this.entregados,
      pendientes: this.pendientes,
      enPiso: this.enPiso,
      fechaPedido: this.fechaPedido,
      compromiso: this.compromiso,
      formaEntrega: this.formaEntrega,
      estado: this.estado,
      pagoConfirmado: this.pagoConfirmado,
      materialEgresado: this.materialEgresado,
      observaciones: this.observaciones,
      createdAt: this.createdAt,
    };
  }

  toPublic() {
    return { ...this.toPlain(), progreso: this.progreso };
  }
}
