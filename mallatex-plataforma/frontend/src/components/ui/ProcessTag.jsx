// ProcessTag — convención MES para etiquetar procesos (p. ej. MT-PC-001).
export function ProcessTag({ code }) {
  if (!code) return null
  return <span className="processtag">{code}</span>
}
