# QA Suite · Mallatex Production Suite

Pruebas automatizadas de UX/UI con **Playwright** que validan:

| ID | Test | Qué valida |
|---|---|---|
| **QA-01** | `ui-overlap.spec.ts` | Que ningún botón, enlace, input o select se monte encima de otro (>6 % de área compartida). |
| **QA-02** | `responsive.spec.ts` | Sin overflow horizontal. Shell adaptativo: sidebar en desktop, bottom-nav en móvil. Captura evidencia visual de cada ruta en cada breakpoint. |
| **QA-03** | `responsive.spec.ts` | Target táctil mínimo en móvil (≥32 px) para botones del bottom-nav. |
| **QA-04** | `navigation.spec.ts` | Cada ruta responde con HTTP <400, renderiza un H1/H2. Navegación entre módulos vía sidebar/bottom-nav funciona. |
| **QA-05** | `alignment.spec.ts` | Alineación píxel-perfecta (tolerancia 2 px) de KPIs, items del nav y tarjetas del catálogo. |

## Breakpoints cubiertos

| Proyecto | Viewport | Dispositivo de referencia |
|---|---|---|
| `mobile-sm` | 320 × 568 | iPhone SE (extremo) |
| `mobile` | 390 × 844 | iPhone 13 |
| `tablet` | 768 × 1024 | iPad Mini |
| `desktop` | 1280 × 800 | Laptop estándar |
| `desktop-xl` | 1920 × 1080 | Monitor Full HD |

## Ejecución

```bash
# 1. Instalar navegadores Playwright (primera vez)
npx playwright install chromium

# 2. Construir y arrancar la app en modo producción
npm run build && npm run start &

# 3. Ejecutar toda la suite
npx playwright test

# 4. Abrir el reporte HTML
npx playwright show-report qa/output/report
```

## Evidencia generada

```
qa/output/
├── report/                # Reporte HTML interactivo
├── evidence/              # Screenshots full-page por viewport y ruta
│   ├── mobile-sm/
│   ├── mobile/
│   ├── tablet/
│   ├── desktop/
│   └── desktop-xl/
├── results.json           # Resultados estructurados para CI
└── contact-sheet.png      # Collage 5×N con todas las vistas
```

## Integración CI (GitHub Actions)

Recomendado: ver `.github/workflows/qa.yml` (pendiente) para correr la
suite en cada PR y subir el reporte como artefacto.
