// Asistente técnico: motor de recomendación de malla por cultivo, clima, terreno y
// necesidad. Basado en reglas (autocontenido, sin servicios externos). En una fase
// posterior puede sustituirse/combinarse con un LLM.

import * as db from './db.js';

// Base de conocimiento: necesidad → categoría de malla + guía.
const NEEDS = {
  sombra: { category: 'sombra', tip: 'Regula temperatura y radiación; el % de sombreo depende del cultivo y clima.' },
  granizo: { category: 'antigranizo', tip: 'Protege el cultivo del impacto del granizo sin bloquear demasiada luz.' },
  insectos: { category: 'antiinsecto', tip: 'Barrera física contra áfidos, mosca blanca y trips; reduce virosis.' },
  pajaros: { category: 'antipajaros', tip: 'Evita daño de aves en frutos; ligera y de fácil manejo.' },
  tutoreo: { category: 'tutora', tip: 'Soporte vertical para cultivos de guía (tomate, pepino, etc.).' },
  maleza: { category: 'groundcover', tip: 'Cubierta de suelo que controla maleza y conserva humedad.' },
};

// Palabras clave → necesidad.
const KW = [
  [/granizo|hielo/i, 'granizo'],
  [/p[aá]jaro|ave|p[aá]jaros/i, 'pajaros'],
  [/insecto|[aá]fido|mosca|trip|plaga|virus/i, 'insectos'],
  [/tutor|espaldera|gu[ií]a|entutorad/i, 'tutoreo'],
  [/maleza|hierba|suelo|cobertura/i, 'maleza'],
  [/sombra|sombreo|sol|calor|temperatura|radiaci[oó]n/i, 'sombra'],
];

// Sugerencia de % de sombreo por cultivo/clima cuando la necesidad es sombra.
function shadeAdvice(cultivo = '', clima = '') {
  const c = (cultivo + ' ' + clima).toLowerCase();
  if (/vivero|ornamental|flor|helecho|orqu/i.test(c)) return { sku: 'MS-70', pct: '70%' };
  if (/caluroso|c[aá]lido|sol intenso|desierto|seco/i.test(c)) return { sku: 'MS-50', pct: '50%' };
  return { sku: 'MS-35', pct: '35%' };
}

// Inferir necesidad a partir de campos + texto libre.
function inferNeed({ objetivo, cultivo, clima, text }) {
  if (objetivo && NEEDS[objetivo]) return objetivo;
  const hay = `${objetivo || ''} ${cultivo || ''} ${clima || ''} ${text || ''}`;
  for (const [re, need] of KW) if (re.test(hay)) return need;
  // Heurística por cultivo
  const c = (cultivo || '').toLowerCase();
  if (/vid|uva|berr|ar[aá]ndano|cereza|frambuesa/i.test(c)) return 'pajaros';
  if (/tomate|pepino|chile|pimiento/i.test(c)) return 'sombra';
  return 'sombra';
}

export function recommend(input = {}) {
  const need = inferNeed(input);
  const meta = NEEDS[need];
  let sku = null, pct = null;
  if (need === 'sombra') { const s = shadeAdvice(input.cultivo, input.clima); sku = s.sku; pct = s.pct; }

  // Producto del catálogo que corresponde
  const products = db.all('products', (p) => p.active !== false && p.category === meta.category);
  const product = (sku && products.find((p) => p.sku === sku)) || products.sort((a, b) => b.stock - a.stock)[0] || null;

  const reasons = [];
  if (input.cultivo) reasons.push(`cultivo: ${input.cultivo}`);
  if (input.clima) reasons.push(`clima: ${input.clima}`);
  if (input.terreno) reasons.push(`terreno: ${input.terreno}`);

  return {
    need,
    title: product ? product.name : meta.category,
    category: meta.category,
    shadePct: pct,
    recommendation: product
      ? { productId: product.id, sku: product.sku, name: product.name, price: product.price, unit: product.unit, stock: product.stock, specs: product.specs }
      : null,
    rationale: `${meta.tip}${pct ? ` Se sugiere sombreo ${pct}.` : ''}${reasons.length ? ' Considerando ' + reasons.join(', ') + '.' : ''}`,
    alternatives: products.filter((p) => !product || p.id !== product.id).slice(0, 3).map((p) => ({ sku: p.sku, name: p.name, price: p.price, unit: p.unit })),
    disclaimer: 'Recomendación orientativa. Confirma con la ficha técnica y las condiciones específicas del predio.',
  };
}
