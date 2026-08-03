import { DomainError } from '@mallatex/shared/ddd';
import { config } from '@mallatex/shared/config';
import { mockUuid, normalizeAspelPayment } from '../domain/Cfdi.js';

const notFound = (msg) => new DomainError(msg, { code: 'NOT_FOUND', status: 404 });

/**
 * IntegrationService — integración con el ERP Aspel (facturación CFDI y cobro).
 * Mantiene la lógica simple: timbrado en modo mock (UUID determinista) y webhook
 * de pago idempotente. El secreto compartido del webhook se toma del entorno.
 */
export class IntegrationService {
  constructor({ invoiceDAO }) {
    this.invoiceDAO = invoiceDAO;
    this.webhookSecret = process.env.ASPEL_WEBHOOK_SECRET || '';
  }

  /** Estado de los conectores para el panel de diagnóstico del gerente. */
  status() {
    return [
      {
        id: 'aspel',
        mode: 'mock',
        configured: true,
        note: 'Timbrado CFDI simulado (UUID determinista).',
      },
      {
        id: 'aspelWebhook',
        mode: this.webhookSecret ? 'seguro' : 'abierto',
        configured: !!this.webhookSecret,
      },
    ];
  }

  /** Timbra (emite) el CFDI. Mock: UUID determinista y estable por factura. */
  async timbrar(invoice, { uuidOverride } = {}) {
    if (uuidOverride) return { uuid: uuidOverride, mode: 'manual' };
    return { uuid: mockUuid(invoice.id), mode: 'mock' };
  }

  /** Valida el secreto compartido del webhook (si está configurado). */
  assertWebhookSecret(provided) {
    if (this.webhookSecret) {
      if (provided !== this.webhookSecret) {
        throw new DomainError('Secreto de webhook inválido', { code: 'WEBHOOK_UNAUTHORIZED', status: 401 });
      }
      return;
    }
    // Sin secreto configurado sólo se permite fuera de producción (demo).
    if (config.isProd) {
      throw new DomainError('Configura ASPEL_WEBHOOK_SECRET para habilitar el webhook en producción', {
        code: 'WEBHOOK_DISABLED',
        status: 403,
      });
    }
  }

  /**
   * Registra el pago de una factura desde el webhook de Aspel. Idempotente:
   * si ya está pagada devuelve el estado actual sin re-aplicar.
   */
  async registerAspelPayment(body) {
    const p = normalizeAspelPayment(body);
    let invoice = null;
    if (p.invoiceId) invoice = await this.invoiceDAO.findById(p.invoiceId);
    else if (p.folio) invoice = await this.invoiceDAO.findByFolio(p.folio);
    else if (p.uuid) invoice = await this.invoiceDAO.findByUuid(p.uuid);
    if (!invoice) throw notFound('Factura no encontrada (envía invoiceId, folio o uuid)');

    if (invoice.status === 'pagada') {
      return { ok: true, alreadyPaid: true, invoice: { id: invoice.id, folio: invoice.folio, status: invoice.status } };
    }
    const updated = await this.invoiceDAO.update(invoice.id, {
      status: 'pagada',
      paidAt: p.paidAt || new Date().toISOString(),
      paymentRef: p.paymentRef || '',
    });
    return { ok: true, invoice: { id: updated.id, folio: updated.folio, status: updated.status } };
  }
}
