'use client'

// ---------------------------------------------------------------------------
// KIOSKO DE PLANTA — tablet fija en cada línea de producción (LC1..LC4, LK,
// LP, LE). Página pública fuera del shell administrativo (como /login), con
// máquina de estados interna: la tablet permanece siempre en /kiosko.
//
// Seguridad (dispositivo COMPARTIDO):
//   - La sesión RH del empleado vive SOLO en estado de React (nunca en
//     localStorage): al recargar o salir, desaparece.
//   - No se toca 'mtx_token' (sesión admin de api.js); los fetch del kiosko
//     son locales a esta página con Authorization explícito.
//   - Logout server-side (revocación del jti) + autologout por inactividad
//     a los 90 s con aviso visible en los últimos 20 s.
// ---------------------------------------------------------------------------

import { useCallback, useEffect, useRef, useState } from 'react'
import { API_BASE } from '@/lib/api'

// Clave PROPIA del kiosko (configuración de línea, dato no sensible).
// Nunca usar 'mtx_token'/'mtx_user' aquí: son de la sesión administrativa.
const LINE_KEY = 'mtx_kiosko_linea'

const INACTIVITY_SECONDS = 90 // autologout autoservicio RH
const RESULT_SECONDS = 6 // pantalla de resultado de checada

const LINE_EMOJI = { costura: '🧵', corte: '✂️', perforadora: '🔨', embobinado: '📦' }
const lineEmoji = (type) => LINE_EMOJI[type] || '🏭'

// Etiquetas amigables de tipos de solicitud (valores EXACTOS del backend:
// REQUEST_TYPES en attendance/PortalService.js).
const REQUEST_TYPE_LABELS = {
  vacaciones: '🏖️ Vacaciones',
  permiso_goce: '📝 Permiso con goce de sueldo',
  permiso_singoce: '📄 Permiso sin goce de sueldo',
}

const ATT_STATUS = {
  asistencia: { label: 'Asistencia', tone: 'ok', icon: '✅' },
  retardo: { label: 'Retardo', tone: 'warn', icon: '⚠️' },
  falta: { label: 'Falta', tone: 'bad', icon: '❌' },
  descanso: { label: 'Descanso', tone: 'muted', icon: '🛌' },
  vacaciones: { label: 'Vacaciones', tone: 'info', icon: '🏖️' },
  permiso: { label: 'Permiso', tone: 'info', icon: '📝' },
  incapacidad: { label: 'Incapacidad', tone: 'info', icon: '🏥' },
  justificada: { label: 'Justificada', tone: 'info', icon: '📄' },
  festivo: { label: 'Festivo', tone: 'info', icon: '🎉' },
  omision: { label: 'Omisión', tone: 'warn', icon: '❔' },
  pendiente: { label: 'Pendiente', tone: 'muted', icon: '⏳' },
}

const REQ_STATUS = {
  pendiente: { label: 'Pendiente', tone: 'warn', icon: '⏳' },
  autorizada: { label: 'Autorizada', tone: 'ok', icon: '✅' },
  rechazada: { label: 'Rechazada', tone: 'bad', icon: '❌' },
}

const TICKET_STATUS = {
  abierto: { label: 'Abierto', tone: 'info', icon: '📬' },
  en_proceso: { label: 'En proceso', tone: 'warn', icon: '🔄' },
  resuelto: { label: 'Resuelto', tone: 'ok', icon: '✅' },
}

// ---------- Fetch local del kiosko (NO usa el token admin de api.js) --------
class KioskError extends Error {
  constructor(message, status) {
    super(message)
    this.status = status
  }
}

async function kfetch(path, { method = 'GET', body, token } = {}) {
  const headers = { Accept: 'application/json' }
  if (body != null) headers['Content-Type'] = 'application/json'
  if (token) headers.Authorization = `Bearer ${token}`
  let res
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body != null ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new KioskError('Sin conexión con el servidor. Avisa a Sistemas. 📡', 0)
  }
  const text = await res.text()
  let data = null
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      data = null
    }
  }
  if (!res.ok) {
    const msg = (data && (data.error || data.message)) || `Error ${res.status}`
    throw new KioskError(msg, res.status)
  }
  return data
}

// ---------- Formateadores ---------------------------------------------------
const fmtMoney = (n) =>
  Number(n || 0).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })

// Fecha 'YYYY-MM-DD' → texto es-MX (mediodía local para evitar corrimiento TZ)
function fmtDate(d, opts = { weekday: 'short', day: '2-digit', month: 'short' }) {
  if (!d) return '—'
  const date = new Date(`${String(d).slice(0, 10)}T12:00:00`)
  if (Number.isNaN(date.getTime())) return String(d)
  return date.toLocaleDateString('es-MX', opts)
}

function fmtDateTime(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return String(iso)
  return `${d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })} ${d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}`
}

// ---------- Piezas UI -------------------------------------------------------
function Chip({ tone = 'muted', children }) {
  return <span className={`kiosk-chip kiosk-chip-${tone}`}>{children}</span>
}

function Spinner({ label = 'Cargando…' }) {
  return (
    <div className="kiosk-loading">
      <div className="spinner" />
      <p>{label}</p>
    </div>
  )
}

// Reloj gigante (cliente puro: se monta en efecto para evitar hidratación).
function Clock() {
  const [now, setNow] = useState(null)
  useEffect(() => {
    setNow(new Date())
    const iv = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(iv)
  }, [])
  if (!now) return <div className="kiosk-clock">--:--</div>
  const hh = String(now.getHours()).padStart(2, '0')
  const mm = String(now.getMinutes()).padStart(2, '0')
  const ss = String(now.getSeconds()).padStart(2, '0')
  return (
    <div className="kiosk-clock-wrap">
      <div className="kiosk-clock">
        {hh}:{mm}
        <span className="kiosk-clock-ss">:{ss}</span>
      </div>
      <div className="kiosk-date">
        {now.toLocaleDateString('es-MX', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })}
      </div>
    </div>
  )
}

// ---------- Config de línea (primer arranque) ------------------------------
function LineSetup({ onSelect }) {
  const [lines, setLines] = useState(null)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setError('')
    setLines(null)
    try {
      setLines(await kfetch('/api/mes/kiosk/lines'))
    } catch (e) {
      setError(e.message)
      setLines([])
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return (
    <div className="kiosk-screen">
      <img src="/logos/mallatex-full.png" alt="Mallatex" className="kiosk-logo" />
      <h1 className="kiosk-title">🏭 Configura este kiosko</h1>
      <p className="kiosk-sub">¿En qué línea de producción está esta tablet?</p>
      {lines === null && <Spinner label="Buscando líneas…" />}
      {error && (
        <div className="kiosk-error-box">
          <p>😕 {error}</p>
          <button type="button" className="kiosk-btn" onClick={load}>
            🔄 Reintentar
          </button>
        </div>
      )}
      {Array.isArray(lines) && lines.length > 0 && (
        <div className="kiosk-lines-grid">
          {lines.map((l) => (
            <button
              key={l.code}
              type="button"
              className="kiosk-line-card"
              onClick={() => onSelect({ code: l.code, name: l.name, type: l.type })}
            >
              <span className="kiosk-line-emoji">{lineEmoji(l.type)}</span>
              <span className="kiosk-line-code">{l.code}</span>
              <span className="kiosk-line-name">{l.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ---------- Home ------------------------------------------------------------
function Home({ line, onChecar, onRh, onChangeLine }) {
  return (
    <div className="kiosk-screen kiosk-home">
      <div className="kiosk-home-head">
        <img src="/logos/mallatex-full.png" alt="Mallatex" className="kiosk-logo" />
        <div className="kiosk-line-badge">
          {lineEmoji(line.type)} {line.code} · {line.name}
        </div>
      </div>
      <Clock />
      <div className="kiosk-actions">
        <button type="button" className="kiosk-btn-giant kiosk-btn-red" onClick={onChecar}>
          <span className="kiosk-giant-emoji">✅</span>
          CHECAR ENTRADA / SALIDA
        </button>
        <button type="button" className="kiosk-btn-giant kiosk-btn-dark" onClick={onRh}>
          <span className="kiosk-giant-emoji">🧑‍💼</span>
          AUTOSERVICIO RH
        </button>
      </div>
      <button
        type="button"
        className="kiosk-change-line"
        onClick={() => {
          if (window.confirm('¿Cambiar la línea configurada en esta tablet?')) onChangeLine()
        }}
      >
        ⚙️ Cambiar línea
      </button>
    </div>
  )
}

// ---------- Checar entrada / salida ----------------------------------------
function CheckScreen({ line, onHome }) {
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState(null) // respuesta rica del backend
  const [error, setError] = useState(null)
  const [countdown, setCountdown] = useState(RESULT_SECONDS)
  const inputRef = useRef(null)

  useEffect(() => {
    if (!result && !error) inputRef.current?.focus()
  }, [result, error])

  // Regreso automático al home tras el resultado (contador visible).
  useEffect(() => {
    if (!result) return undefined
    setCountdown(RESULT_SECONDS)
    const iv = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(iv)
          onHome()
          return 0
        }
        return c - 1
      })
    }, 1000)
    return () => clearInterval(iv)
  }, [result, onHome])

  async function submit(e) {
    e?.preventDefault()
    const clean = code.trim().toUpperCase()
    if (!clean || busy) return
    setBusy(true)
    setError(null)
    try {
      const out = await kfetch('/api/kiosk/checkin', {
        method: 'POST',
        body: { code: clean, kiosk: { line: line.code, label: `Kiosko ${line.code}` } },
      })
      setResult(out)
      setCode('')
    } catch (err) {
      if (err.status === 404) {
        setError({
          icon: '🔍',
          title: 'No te encontramos',
          detail: `Verifica tu código de empleado (${clean}) e inténtalo de nuevo. Si sigue sin funcionar, avisa a RH.`,
        })
      } else if (err.status === 429) {
        setError({
          icon: '⏳',
          title: 'Muchos intentos seguidos',
          detail: 'Espera un momento e inténtalo otra vez.',
        })
      } else {
        setError({
          icon: '😕',
          title: 'No se pudo registrar tu checada',
          detail: err.message,
        })
      }
    } finally {
      setBusy(false)
    }
  }

  // -------- Pantalla de RESULTADO (pantalla completa) --------
  if (result) {
    const tone = result.tone || 'ok'
    const icon = tone === 'warn' ? '⚠️' : result.type === 'entrada' ? '✅' : '👋'
    return (
      <div className={`kiosk-screen kiosk-result kiosk-result-${tone}`}>
        <div className="kiosk-result-icon">{icon}</div>
        <h1 className="kiosk-result-headline">{result.headline}</h1>
        <p className="kiosk-result-emp">
          {result.employee?.name} · <span className="mono">{result.employee?.code}</span>
        </p>
        <div className="kiosk-result-time">{result.time}</div>
        <p className="kiosk-result-date">{result.dateLabel}</p>
        <Chip tone={tone}>
          {result.statusLabel || result.detail}
        </Chip>
        {result.detail && result.statusLabel && (
          <p className="kiosk-result-detail">{result.detail}</p>
        )}
        <button type="button" className="kiosk-btn kiosk-btn-red kiosk-btn-wide" onClick={onHome}>
          👍 Listo ({countdown})
        </button>
      </div>
    )
  }

  // -------- Pantalla de ERROR amigable --------
  if (error) {
    return (
      <div className="kiosk-screen kiosk-result kiosk-result-warn">
        <div className="kiosk-result-icon">{error.icon}</div>
        <h1 className="kiosk-result-headline">{error.title}</h1>
        <p className="kiosk-result-detail">{error.detail}</p>
        <div className="kiosk-btn-row">
          <button
            type="button"
            className="kiosk-btn kiosk-btn-red kiosk-btn-wide"
            onClick={() => {
              setError(null)
              setCode('')
            }}
          >
            🔄 Intentar de nuevo
          </button>
          <button type="button" className="kiosk-btn kiosk-btn-wide" onClick={onHome}>
            🏠 Inicio
          </button>
        </div>
      </div>
    )
  }

  // -------- Captura de código (teclado o lector USB de gafete) --------
  return (
    <div className="kiosk-screen">
      <div className="kiosk-line-badge">
        {lineEmoji(line.type)} {line.code} · {line.name}
      </div>
      <h1 className="kiosk-title">✅ Checar entrada / salida</h1>
      <p className="kiosk-sub">
        Escribe tu código de empleado o pasa tu gafete por el lector 🪪
      </p>
      <form className="kiosk-check-form" onSubmit={submit}>
        <input
          ref={inputRef}
          className="kiosk-code-input"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="MTX000"
          autoFocus
          autoCapitalize="characters"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="done"
          aria-label="Código de empleado"
          disabled={busy}
        />
        <button
          type="submit"
          className="kiosk-btn-giant kiosk-btn-red"
          disabled={busy || !code.trim()}
        >
          {busy ? '⏳ Registrando…' : '✅ CHECAR AHORA'}
        </button>
      </form>
      <button type="button" className="kiosk-btn kiosk-btn-wide" onClick={onHome}>
        ⬅️ Regresar
      </button>
    </div>
  )
}

// ---------- Autoservicio RH: login código + PIN -----------------------------
function RhLogin({ onLogin, onHome }) {
  const [code, setCode] = useState('')
  const [pin, setPin] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(e) {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    setError('')
    try {
      // El token queda SOLO en memoria (estado React): dispositivo compartido.
      const out = await kfetch('/api/auth/login', {
        method: 'POST',
        body: { code: code.trim().toUpperCase(), pin: pin.trim() },
      })
      onLogin(out)
    } catch (err) {
      if (err.status === 401) setError('Código o PIN incorrectos. Inténtalo de nuevo. 🔑')
      else if (err.status === 429) setError('Muchos intentos. Espera unos minutos e inténtalo otra vez. ⏳')
      else setError(err.message)
      setBusy(false)
    }
  }

  return (
    <div className="kiosk-screen">
      <h1 className="kiosk-title">🧑‍💼 Autoservicio RH</h1>
      <p className="kiosk-sub">Entra con tu código de empleado y tu PIN (el mismo de la app móvil)</p>
      <form className="kiosk-check-form" onSubmit={submit}>
        <label className="kiosk-label">
          🪪 Código de empleado
          <input
            className="kiosk-code-input"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="MTX000"
            autoFocus
            autoCapitalize="characters"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            required
          />
        </label>
        <label className="kiosk-label">
          🔑 PIN
          <input
            className="kiosk-code-input"
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="••••"
            autoComplete="off"
            required
          />
        </label>
        {error && <p className="kiosk-inline-error">😕 {error}</p>}
        <button type="submit" className="kiosk-btn-giant kiosk-btn-red" disabled={busy}>
          {busy ? '⏳ Entrando…' : '🔓 ENTRAR'}
        </button>
      </form>
      <button type="button" className="kiosk-btn kiosk-btn-wide" onClick={onHome}>
        ⬅️ Regresar
      </button>
    </div>
  )
}

// ---------- Autoservicio RH: pestañas ---------------------------------------
function TabAsistencia({ token, me }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    kfetch('/api/portal/me/attendance', { token })
      .then((d) => alive && setData(d))
      .catch((e) => alive && setError(e.message))
    return () => {
      alive = false
    }
  }, [token])

  if (error) return <p className="kiosk-inline-error">😕 {error}</p>
  if (!data) return <Spinner label="Cargando tu asistencia…" />

  const rows = data.rows || []
  const c = data.summary?.counters
  return (
    <div className="kiosk-panel-body">
      {me && (
        <div className="kiosk-me-card">
          <div className="kiosk-me-name">👤 {me.employee?.name}</div>
          <div className="kiosk-me-meta">
            <span className="mono">{me.employee?.code}</span> · {me.employee?.department || 'Sin departamento'}
            {me.scheduleName ? ` · 🕐 ${me.scheduleName}` : ''}
          </div>
          {me.vacation && (
            <Chip tone="info">
              🏖️ Vacaciones disponibles: {me.vacation.available} día(s)
            </Chip>
          )}
        </div>
      )}
      {data.period && (
        <p className="kiosk-panel-hint">
          📅 Periodo: <b>{data.period.name || `${fmtDate(data.period.startDate)} – ${fmtDate(data.period.endDate)}`}</b>
        </p>
      )}
      {c && (
        <div className="kiosk-chip-row">
          <Chip tone="ok">✅ Asistencias: {c.asistencias ?? '—'}</Chip>
          <Chip tone="warn">⚠️ Retardos: {c.retardos ?? 0}</Chip>
          <Chip tone="bad">❌ Faltas: {c.faltas ?? 0}</Chip>
        </div>
      )}
      {rows.length === 0 && <p className="kiosk-empty">📭 Aún no hay días registrados en este periodo.</p>}
      <ul className="kiosk-list">
        {rows.map((r) => {
          const meta = ATT_STATUS[r.status] || ATT_STATUS.pendiente
          return (
            <li key={r.id || r.date} className="kiosk-list-item">
              <span className="kiosk-list-main">
                {meta.icon} {fmtDate(r.date, { weekday: 'long', day: '2-digit', month: 'short' })}
              </span>
              <span className="kiosk-list-side">
                {r.lateMinutes > 0 && <Chip tone="warn">+{r.lateMinutes} min</Chip>}
                <Chip tone={meta.tone}>{meta.label}</Chip>
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function TabSolicitudes({ token }) {
  const [items, setItems] = useState(null)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ type: 'vacaciones', startDate: '', endDate: '', reason: '' })
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState('')

  const load = useCallback(() => {
    setError('')
    kfetch('/api/portal/me/requests', { token })
      .then(setItems)
      .catch((e) => setError(e.message))
  }, [token])

  useEffect(() => {
    load()
  }, [load])

  async function submit(e) {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    setFormError('')
    try {
      await kfetch('/api/portal/me/requests', { method: 'POST', body: form, token })
      setShowForm(false)
      setForm({ type: 'vacaciones', startDate: '', endDate: '', reason: '' })
      load()
    } catch (err) {
      setFormError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function cancel(id) {
    if (!window.confirm('¿Cancelar esta solicitud pendiente?')) return
    try {
      await kfetch(`/api/portal/me/requests/${id}`, { method: 'DELETE', token })
      load()
    } catch (err) {
      window.alert(`No se pudo cancelar: ${err.message}`)
    }
  }

  if (error) return <p className="kiosk-inline-error">😕 {error}</p>
  if (!items) return <Spinner label="Cargando tus solicitudes…" />

  return (
    <div className="kiosk-panel-body">
      {!showForm && (
        <button type="button" className="kiosk-btn kiosk-btn-red kiosk-btn-wide" onClick={() => setShowForm(true)}>
          ➕ Solicitar vacaciones o permiso
        </button>
      )}
      {showForm && (
        <form className="kiosk-form-card" onSubmit={submit}>
          <h3>📝 Nueva solicitud</h3>
          <label className="kiosk-label">
            Tipo
            <select
              className="kiosk-select"
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
            >
              <option value="vacaciones">Vacaciones</option>
              <option value="permiso_goce">Permiso con goce de sueldo</option>
              <option value="permiso_singoce">Permiso sin goce de sueldo</option>
            </select>
          </label>
          <div className="kiosk-form-grid">
            <label className="kiosk-label">
              Fecha inicio
              <input
                type="date"
                className="kiosk-select"
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                required
              />
            </label>
            <label className="kiosk-label">
              Fecha fin
              <input
                type="date"
                className="kiosk-select"
                value={form.endDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                required
              />
            </label>
          </div>
          <label className="kiosk-label">
            Motivo
            <textarea
              className="kiosk-textarea"
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
              placeholder="Cuéntanos brevemente el motivo…"
            />
          </label>
          {formError && <p className="kiosk-inline-error">😕 {formError}</p>}
          <div className="kiosk-btn-row">
            <button type="submit" className="kiosk-btn kiosk-btn-red kiosk-btn-wide" disabled={busy}>
              {busy ? '⏳ Enviando…' : '📨 Enviar solicitud'}
            </button>
            <button type="button" className="kiosk-btn kiosk-btn-wide" onClick={() => setShowForm(false)}>
              ✖️ Cancelar
            </button>
          </div>
        </form>
      )}
      {items.length === 0 && !showForm && (
        <p className="kiosk-empty">📭 No tienes solicitudes registradas.</p>
      )}
      <ul className="kiosk-list">
        {items.map((r) => {
          const meta = REQ_STATUS[r.status] || { label: r.status, tone: 'muted', icon: '❔' }
          return (
            <li key={r.id} className="kiosk-list-item kiosk-list-item-tall">
              <span className="kiosk-list-main">
                {REQUEST_TYPE_LABELS[r.type] || r.type}
                <small className="kiosk-list-sub">
                  📅 {fmtDate(r.startDate)} → {fmtDate(r.endDate)}
                  {r.reason ? ` · ${r.reason}` : ''}
                </small>
              </span>
              <span className="kiosk-list-side">
                <Chip tone={meta.tone}>
                  {meta.icon} {meta.label}
                </Chip>
                {r.status === 'pendiente' && (
                  <button type="button" className="kiosk-btn kiosk-btn-sm" onClick={() => cancel(r.id)}>
                    🗑️ Cancelar
                  </button>
                )}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function TabRecibos({ token, me }) {
  const [items, setItems] = useState(null)
  const [error, setError] = useState('')
  const [detail, setDetail] = useState(null)
  const [detailBusy, setDetailBusy] = useState(false)

  useEffect(() => {
    let alive = true
    kfetch('/api/portal/me/payslips', { token })
      .then((d) => alive && setItems(d))
      .catch((e) => alive && setError(e.message))
    return () => {
      alive = false
    }
  }, [token])

  const periodName = (id) => {
    const p = (me?.periods || []).find((x) => String(x.id) === String(id))
    return p ? p.name || `${fmtDate(p.startDate)} – ${fmtDate(p.endDate)}` : `Periodo ${id}`
  }

  async function open(id) {
    setDetailBusy(true)
    try {
      setDetail(await kfetch(`/api/portal/me/payslips/${id}`, { token }))
    } catch (err) {
      window.alert(`No se pudo abrir el recibo: ${err.message}`)
    } finally {
      setDetailBusy(false)
    }
  }

  if (error) return <p className="kiosk-inline-error">😕 {error}</p>
  if (!items) return <Spinner label="Cargando tus recibos…" />

  if (detail) {
    return (
      <div className="kiosk-panel-body">
        <button type="button" className="kiosk-btn kiosk-btn-wide" onClick={() => setDetail(null)}>
          ⬅️ Regresar a mis recibos
        </button>
        <div className="kiosk-form-card">
          <h3>💵 {periodName(detail.periodId)}</h3>
          <p className="kiosk-panel-hint">Emitido: {fmtDateTime(detail.emittedAt)} · Recibo preliminar (el cálculo fiscal definitivo se hace en NOI)</p>
          <h4 className="kiosk-slip-h">➕ Percepciones</h4>
          <ul className="kiosk-slip-list">
            {(detail.perceptions || []).map((p, i) => (
              <li key={i}>
                <span>
                  {p.concepto}
                  {p.dias != null ? ` (${p.dias} día(s))` : ''}
                  {p.horas != null ? ` (${p.horas} h)` : ''}
                </span>
                <b>{fmtMoney(p.importe)}</b>
              </li>
            ))}
            <li className="kiosk-slip-total">
              <span>Total percepciones</span>
              <b>{fmtMoney(detail.totalP)}</b>
            </li>
          </ul>
          <h4 className="kiosk-slip-h">➖ Deducciones</h4>
          <ul className="kiosk-slip-list">
            {(detail.deductions || []).length === 0 && <li><span>Sin deducciones</span><b>{fmtMoney(0)}</b></li>}
            {(detail.deductions || []).map((d, i) => (
              <li key={i}>
                <span>
                  {d.concepto}
                  {d.dias != null ? ` (${d.dias} día(s))` : ''}
                </span>
                <b>{fmtMoney(d.importe)}</b>
              </li>
            ))}
            <li className="kiosk-slip-total">
              <span>Total deducciones</span>
              <b>{fmtMoney(detail.totalD)}</b>
            </li>
          </ul>
          <div className="kiosk-slip-neto">
            <span>💰 NETO A PAGAR</span>
            <b>{fmtMoney(detail.neto)}</b>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="kiosk-panel-body">
      {items.length === 0 && <p className="kiosk-empty">📭 Aún no tienes recibos emitidos.</p>}
      <ul className="kiosk-list">
        {items.map((p) => (
          <li key={p.id}>
            <button
              type="button"
              className="kiosk-list-item kiosk-list-btn"
              onClick={() => open(p.id)}
              disabled={detailBusy}
            >
              <span className="kiosk-list-main">
                🧾 {periodName(p.periodId)}
                <small className="kiosk-list-sub">Emitido: {fmtDateTime(p.emittedAt)}</small>
              </span>
              <span className="kiosk-list-side">
                <b className="kiosk-money">{fmtMoney(p.neto)}</b>
                <span aria-hidden>👉</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

function TabTickets({ token }) {
  const [items, setItems] = useState(null)
  const [error, setError] = useState('')
  const [openTicket, setOpenTicket] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ category: 'nomina', subject: '', message: '' })
  const [reply, setReply] = useState('')
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState('')

  const load = useCallback(
    (keepOpenId) => {
      setError('')
      kfetch('/api/portal/me/tickets', { token })
        .then((list) => {
          setItems(list)
          if (keepOpenId != null) {
            setOpenTicket(list.find((t) => String(t.id) === String(keepOpenId)) || null)
          }
        })
        .catch((e) => setError(e.message))
    },
    [token]
  )

  useEffect(() => {
    load()
  }, [load])

  async function submitNew(e) {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    setFormError('')
    try {
      await kfetch('/api/portal/me/tickets', { method: 'POST', body: form, token })
      setShowForm(false)
      setForm({ category: 'nomina', subject: '', message: '' })
      load()
    } catch (err) {
      setFormError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function submitReply(e) {
    e.preventDefault()
    if (busy || !reply.trim()) return
    setBusy(true)
    try {
      await kfetch(`/api/portal/me/tickets/${openTicket.id}/reply`, {
        method: 'POST',
        body: { message: reply.trim() },
        token,
      })
      setReply('')
      load(openTicket.id)
    } catch (err) {
      window.alert(`No se pudo enviar: ${err.message}`)
    } finally {
      setBusy(false)
    }
  }

  if (error) return <p className="kiosk-inline-error">😕 {error}</p>
  if (!items) return <Spinner label="Cargando tus tickets…" />

  if (openTicket) {
    const meta = TICKET_STATUS[openTicket.status] || { label: openTicket.status, tone: 'muted', icon: '❔' }
    return (
      <div className="kiosk-panel-body">
        <button type="button" className="kiosk-btn kiosk-btn-wide" onClick={() => setOpenTicket(null)}>
          ⬅️ Regresar a mis tickets
        </button>
        <div className="kiosk-form-card">
          <h3>🎫 {openTicket.subject}</h3>
          <p className="kiosk-panel-hint">
            <Chip tone={meta.tone}>
              {meta.icon} {meta.label}
            </Chip>{' '}
            · Categoría: {openTicket.category || 'General'}
          </p>
          <div className="kiosk-thread">
            {(openTicket.messages || []).map((m, i) => (
              <div key={i} className={`kiosk-msg ${m.role === 'empleado' ? 'kiosk-msg-mine' : 'kiosk-msg-rh'}`}>
                <div className="kiosk-msg-by">
                  {m.role === 'empleado' ? '🧑‍🏭' : '🧑‍💼'} {m.by} · {fmtDateTime(m.at)}
                </div>
                <div className="kiosk-msg-text">{m.message}</div>
              </div>
            ))}
          </div>
          <form className="kiosk-reply-form" onSubmit={submitReply}>
            <textarea
              className="kiosk-textarea"
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              placeholder="Escribe tu respuesta…"
            />
            <button type="submit" className="kiosk-btn kiosk-btn-red kiosk-btn-wide" disabled={busy || !reply.trim()}>
              {busy ? '⏳ Enviando…' : '📨 Responder'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="kiosk-panel-body">
      {!showForm && (
        <button type="button" className="kiosk-btn kiosk-btn-red kiosk-btn-wide" onClick={() => setShowForm(true)}>
          ➕ Nuevo ticket
        </button>
      )}
      {showForm && (
        <form className="kiosk-form-card" onSubmit={submitNew}>
          <h3>🎫 Nuevo ticket</h3>
          <label className="kiosk-label">
            Categoría
            <select
              className="kiosk-select"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            >
              <option value="nomina">💵 Nómina</option>
              <option value="rh">🧑‍💼 Recursos Humanos</option>
              <option value="otro">📋 Otro</option>
            </select>
          </label>
          <label className="kiosk-label">
            Asunto
            <input
              className="kiosk-select"
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
              placeholder="Ej. Duda con mi recibo"
              required
            />
          </label>
          <label className="kiosk-label">
            Mensaje
            <textarea
              className="kiosk-textarea"
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              placeholder="Cuéntanos tu duda o problema…"
              required
            />
          </label>
          {formError && <p className="kiosk-inline-error">😕 {formError}</p>}
          <div className="kiosk-btn-row">
            <button type="submit" className="kiosk-btn kiosk-btn-red kiosk-btn-wide" disabled={busy}>
              {busy ? '⏳ Enviando…' : '📨 Crear ticket'}
            </button>
            <button type="button" className="kiosk-btn kiosk-btn-wide" onClick={() => setShowForm(false)}>
              ✖️ Cancelar
            </button>
          </div>
        </form>
      )}
      {items.length === 0 && !showForm && <p className="kiosk-empty">📭 No tienes tickets.</p>}
      <ul className="kiosk-list">
        {items.map((t) => {
          const meta = TICKET_STATUS[t.status] || { label: t.status, tone: 'muted', icon: '❔' }
          return (
            <li key={t.id}>
              <button type="button" className="kiosk-list-item kiosk-list-btn" onClick={() => setOpenTicket(t)}>
                <span className="kiosk-list-main">
                  🎫 {t.subject}
                  <small className="kiosk-list-sub">
                    {t.category || 'General'} · {(t.messages || []).length} mensaje(s)
                  </small>
                </span>
                <span className="kiosk-list-side">
                  <Chip tone={meta.tone}>
                    {meta.icon} {meta.label}
                  </Chip>
                  <span aria-hidden>👉</span>
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

// ---------- Autoservicio RH: contenedor con sesión en memoria ---------------
const RH_TABS = [
  { id: 'asistencia', label: '📅 Mi asistencia' },
  { id: 'solicitudes', label: '🏖️ Vacaciones y permisos' },
  { id: 'recibos', label: '🧾 Mis recibos' },
  { id: 'tickets', label: '🎫 Tickets' },
]

function RhPortal({ session, onExit }) {
  const { token } = session
  const [tab, setTab] = useState('asistencia')
  const [me, setMe] = useState(null)
  const [secondsLeft, setSecondsLeft] = useState(INACTIVITY_SECONDS)
  const lastActivityRef = useRef(Date.now())
  const exitedRef = useRef(false)

  // Cierre de sesión: revoca el token en el servidor y limpia el estado.
  const logout = useCallback(() => {
    if (exitedRef.current) return
    exitedRef.current = true
    // Revocación server-side (denylist del jti); no bloqueamos la UI.
    kfetch('/api/auth/logout', { method: 'POST', token }).catch(() => {})
    onExit()
  }, [token, onExit])

  // Autologout por inactividad (90 s). Cualquier toque/tecla/scroll reinicia.
  useEffect(() => {
    const bump = () => {
      lastActivityRef.current = Date.now()
    }
    const events = ['pointerdown', 'keydown', 'touchstart', 'scroll', 'wheel']
    events.forEach((ev) => window.addEventListener(ev, bump, true))
    const iv = setInterval(() => {
      const left = INACTIVITY_SECONDS - Math.floor((Date.now() - lastActivityRef.current) / 1000)
      setSecondsLeft(left)
      if (left <= 0) logout()
    }, 1000)
    return () => {
      events.forEach((ev) => window.removeEventListener(ev, bump, true))
      clearInterval(iv)
    }
  }, [logout])

  // Perfil (cabecera + catálogo de periodos para nombrar recibos).
  useEffect(() => {
    let alive = true
    kfetch('/api/portal/me', { token })
      .then((d) => alive && setMe(d))
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [token])

  return (
    <div className="kiosk-rh">
      <div className="kiosk-rh-head">
        <div className="kiosk-rh-who">
          <span className="kiosk-rh-emoji">🧑‍💼</span>
          <span>
            <b>{session.employee?.name}</b>
            <small className="mono"> · {session.employee?.code}</small>
          </span>
        </div>
        <button type="button" className="kiosk-btn kiosk-btn-red kiosk-exit-btn" onClick={logout}>
          🚪 SALIR
        </button>
      </div>
      <div className="kiosk-tabs" role="tablist">
        {RH_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            className={`kiosk-tab ${tab === t.id ? 'active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="kiosk-rh-panel">
        {tab === 'asistencia' && <TabAsistencia token={token} me={me} />}
        {tab === 'solicitudes' && <TabSolicitudes token={token} />}
        {tab === 'recibos' && <TabRecibos token={token} me={me} />}
        {tab === 'tickets' && <TabTickets token={token} />}
      </div>
      {secondsLeft <= 20 && secondsLeft > 0 && (
        <div className="kiosk-timeout-chip" role="status">
          ⏳ Tu sesión se cerrará en {secondsLeft}s — toca la pantalla para continuar
        </div>
      )}
    </div>
  )
}

// ---------- Página principal (máquina de estados) ---------------------------
export default function KioskoPage() {
  const [ready, setReady] = useState(false)
  const [line, setLine] = useState(null)
  const [view, setView] = useState('home') // home | checar | rh
  const [rhSession, setRhSession] = useState(null) // {token, employee} SOLO en memoria

  // Configuración de línea persistida en el dispositivo (no sensible).
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(LINE_KEY)
      if (raw) setLine(JSON.parse(raw))
    } catch {
      /* config corrupta → volver a configurar */
    }
    setReady(true)
  }, [])

  const goHome = useCallback(() => {
    setRhSession(null) // nunca conservar sesión RH fuera del panel
    setView('home')
  }, [])

  function selectLine(l) {
    window.localStorage.setItem(LINE_KEY, JSON.stringify(l))
    setLine(l)
    setView('home')
  }

  function changeLine() {
    window.localStorage.removeItem(LINE_KEY)
    setRhSession(null)
    setLine(null)
  }

  if (!ready) return <div className="kiosk" />

  return (
    <div className="kiosk">
      {!line && <LineSetup onSelect={selectLine} />}
      {line && view === 'home' && (
        <Home line={line} onChecar={() => setView('checar')} onRh={() => setView('rh')} onChangeLine={changeLine} />
      )}
      {line && view === 'checar' && <CheckScreen line={line} onHome={goHome} />}
      {line && view === 'rh' && !rhSession && (
        <RhLogin onLogin={(out) => setRhSession(out)} onHome={goHome} />
      )}
      {line && view === 'rh' && rhSession && <RhPortal session={rhSession} onExit={goHome} />}
    </div>
  )
}
