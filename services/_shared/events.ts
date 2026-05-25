/**
 * Publicación/subscripción de eventos de dominio en Redis Streams.
 * Stream único `mes:events` con discriminación por `type`.
 */
import Redis from 'ioredis'
import { DomainEvent, EVENT_STREAM } from '@mallatex/shared-types'

const redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379')

export async function publish(evt: DomainEvent): Promise<string> {
  const id = await redis.xadd(EVENT_STREAM, '*', 'data', JSON.stringify(evt))
  return id ?? ''
}

export type Handler = (evt: DomainEvent) => Promise<void> | void

/** Consumidor con grupo · resume desde el último id procesado por el grupo. */
export async function consume(group: string, consumer: string, handler: Handler) {
  try {
    await redis.xgroup('CREATE', EVENT_STREAM, group, '$', 'MKSTREAM')
  } catch (e: any) {
    if (!String(e?.message).includes('BUSYGROUP')) throw e
  }

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const res = (await redis.xreadgroup(
      'GROUP', group, consumer,
      'COUNT', '50',
      'BLOCK', '5000',
      'STREAMS', EVENT_STREAM, '>',
    )) as Array<[string, Array<[string, string[]]>]> | null

    if (!res) continue
    for (const [, entries] of res) {
      for (const [eid, fields] of entries) {
        const idx = fields.indexOf('data')
        if (idx === -1) {
          await redis.xack(EVENT_STREAM, group, eid)
          continue
        }
        const evt = JSON.parse(fields[idx + 1]) as DomainEvent
        try {
          await handler(evt)
          await redis.xack(EVENT_STREAM, group, eid)
        } catch (err) {
          // Dejar pendiente → re-procesar en el siguiente ciclo
          console.error('[events] handler error, will retry', err)
        }
      }
    }
  }
}

export function makeEnvelope<T extends DomainEvent['type']>(
  type: T,
  producer: string,
  payload: Extract<DomainEvent, { type: T }>['payload'],
): DomainEvent {
  return {
    id: `evt_${cryptoRandom()}`,
    type,
    occurredAt: new Date().toISOString(),
    producer,
    payload,
  } as DomainEvent
}

function cryptoRandom() {
  return [...crypto.getRandomValues(new Uint8Array(12))]
    .map((b) => b.toString(36).padStart(2, '0'))
    .join('')
    .slice(0, 18)
}
