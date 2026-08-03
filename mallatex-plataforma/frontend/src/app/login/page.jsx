'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { LogIn } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { getToken } from '@/lib/api'

// Login administrativo (email + password). Los EMPLEADOS acceden por la app
// móvil con código + PIN; aquí sólo entran usuarios administrativos.
export default function LoginPage() {
  const router = useRouter()
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (getToken()) router.replace('/dashboard')
  }, [router])

  async function onSubmit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await login(email.trim(), password)
      router.replace('/dashboard')
    } catch (err) {
      setError(err?.message || 'No se pudo iniciar sesión')
      setBusy(false)
    }
  }

  function demo(mail) {
    setEmail(mail)
    setPassword('mallatex2026')
  }

  return (
    <div className="login-screen">
      <form className="login-card" onSubmit={onSubmit}>
        <div className="login-brand">
          {/* Logo oficial Mallatex (wordmark + eslogan) — assets del manual de marca */}
          <img
            src="/logos/mallatex-full.png"
            alt="Mallatex — Protegemos lo que siembras"
            className="login-logo-img"
          />
          <p className="login-sub">Plataforma unificada · Asistencia · CRM · MES · Leads</p>
        </div>

        <div className="login-form">
          <label>
            Correo electrónico
            <input
              type="email"
              autoComplete="username"
              placeholder="usuario@mallatex.mx"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>
          <label>
            Contraseña
            <input
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>

          <p className="login-error">{error}</p>

          <button className="btn btn-primary btn-block" type="submit" disabled={busy}>
            <LogIn size={18} />
            {busy ? 'Ingresando…' : 'Ingresar'}
          </button>
        </div>

        <div className="login-hint">
          <b>Cuentas demo</b> (contraseña <b>mallatex2026</b>):
          <div className="page-actions">
            <button type="button" className="btn btn-sm" onClick={() => demo('admin@mallatex.mx')}>Admin</button>
            <button type="button" className="btn btn-sm" onClick={() => demo('nomina@mallatex.mx')}>Nómina</button>
            <button type="button" className="btn btn-sm" onClick={() => demo('comercial@mallatex.mx')}>Comercial</button>
            <button type="button" className="btn btn-sm" onClick={() => demo('contabilidad@mallatex.mx')}>Contador</button>
          </div>
        </div>
      </form>
      <p className="login-foot">Los empleados acceden por la app móvil (código + PIN).</p>
    </div>
  )
}
