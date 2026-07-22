# Manual de usuario — fuentes

Documentos entregables (en `docs/`):

- **`Manual_Mallatex_Plataforma_Asistencia.pdf`** — manual completo (PDF, recomendado para distribución).
- **`Manual_Mallatex_Plataforma_Asistencia.docx`** — versión editable (Word).

## Regenerar

Las capturas viven en `docs/screenshots/` y el isotipo en `docs/manual-assets/logo.png`.

### PDF (vía HTML + Chromium)

```bash
node docs/manual/build.cjs          # genera docs/manual/manual.html
# imprimir a PDF con un navegador basado en Chromium:
#   abrir manual.html e imprimir a PDF tamaño Carta, o usar Playwright/puppeteer page.pdf()
```

### DOCX (editable)

```bash
npm i docx           # dependencia sólo para generar el manual
node docs/manual/build_docx.cjs     # genera docs/Manual_..._.docx
```

> El contenido de ambos generadores es equivalente; edite el texto en el `.cjs`
> correspondiente y vuelva a ejecutarlo.
