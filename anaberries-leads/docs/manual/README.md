# Manual del Staff — generación

El manual de usabilidad del personal se arma a partir de un HTML con la identidad
de Mallatex y se exporta a PDF.

## Regenerar

```bash
cd anaberries-leads
# 1) Genera el HTML del manual
node docs/manual/build.cjs        # → docs/manual/manual.html

# 2) Exporta a PDF con Chromium (requiere playwright + chromium)
#    (en este entorno: PLAYWRIGHT_BROWSERS_PATH ya apunta a /opt/pw-browsers)
node - <<'JS'
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  await p.goto('file://' + require('path').resolve('docs/manual/manual.html'), { waitUntil: 'networkidle' });
  await p.emulateMedia({ media: 'print' });
  await p.pdf({
    path: 'docs/Manual_Staff_Anaberries_Mallatex.pdf',
    format: 'A4', printBackground: true,
    margin: { top: '14mm', bottom: '16mm', left: '14mm', right: '14mm' },
    displayHeaderFooter: true,
    headerTemplate: '<div></div>',
    footerTemplate: '<div style="width:100%;font-size:8px;color:#9a9a9a;font-family:Segoe UI,Arial,sans-serif;padding:0 14mm;display:flex;justify-content:space-between"><span>Mallatex · Manual del Staff — Evento Anaberries</span><span>Página <span class="pageNumber"></span> de <span class="totalPages"></span></span></div>',
  });
  await b.close();
})();
JS
```

- El contenido se edita en `build.cjs`.
- Las imágenes provienen de `docs/screenshots/`.
- El logo está en `docs/manual-assets/mallatex-logo.png`.
- Salida final: **`docs/Manual_Staff_Anaberries_Mallatex.pdf`**.
