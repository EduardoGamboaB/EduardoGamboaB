import { Logo } from '@/components/Logo'

export default function LoginPage() {
  return (
    <div className="min-h-dvh grid md:grid-cols-2">
      {/* Panel de marca (oculto en móvil) */}
      <div className="hidden md:flex flex-col justify-between bg-mallatex-green-800 text-white p-10 relative overflow-hidden">
        <div className="relative z-10">
          <Logo inverse />
        </div>
        <div className="relative z-10">
          <h1 className="text-4xl font-bold leading-tight">
            Producción confiable para la agricultura protegida.
          </h1>
          <p className="mt-3 text-mallatex-green-100/90 max-w-md">
            Controla pedidos de mallas agrícolas, cubre suelos, mallas antiáfidos y
            agrotextiles desde la planta hasta la entrega.
          </p>
          <ul className="mt-8 space-y-2 text-sm text-mallatex-green-100/90">
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-mallatex-sun-500" />
              Trazabilidad rollo a rollo
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-mallatex-sun-500" />
              Registro de producción desde móvil
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-mallatex-sun-500" />
              OEE, mermas y paros en tiempo real
            </li>
          </ul>
        </div>
        {/* Patrón de malla */}
        <svg
          className="absolute inset-0 w-full h-full opacity-10"
          viewBox="0 0 200 200"
          preserveAspectRatio="none"
          aria-hidden
        >
          <defs>
            <pattern id="malla" x="0" y="0" width="10" height="10" patternUnits="userSpaceOnUse">
              <path d="M0 0H10M0 0V10" stroke="white" strokeWidth="0.3" />
            </pattern>
          </defs>
          <rect width="200" height="200" fill="url(#malla)" />
        </svg>
      </div>

      {/* Formulario */}
      <div className="flex items-center justify-center p-6 md:p-10">
        <div className="w-full max-w-sm">
          <div className="md:hidden mb-8">
            <Logo />
          </div>

          <h2 className="text-2xl font-bold text-mallatex-soil-900">Acceso al sistema</h2>
          <p className="mt-1 text-sm text-mallatex-soil-500">
            Ingresa con tu cuenta corporativa de Mallatex.
          </p>

          <form action="/api/auth/signin" method="post" className="mt-8 space-y-4">
            <div>
              <label htmlFor="email" className="label">
                Correo
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="usuario@mallatex.mx"
                className="input"
                defaultValue="admin@mallatex.mx"
              />
            </div>
            <div>
              <label htmlFor="password" className="label">
                Contraseña
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                placeholder="••••••••"
                className="input"
              />
            </div>

            <button type="submit" className="btn-primary w-full">
              Iniciar sesión
            </button>
          </form>

          <p className="mt-6 text-xs text-mallatex-soil-500 text-center">
            ¿Problemas para acceder? Contacta a TI Mallatex.
          </p>
        </div>
      </div>
    </div>
  )
}
