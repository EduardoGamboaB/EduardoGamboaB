import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, TextInput } from 'react-native';
import { colors, buttons } from '../theme';
import { api } from '../api';

const money = (n) => '$' + Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function QuoteScreen() {
  const [clients, setClients] = useState([]);
  const [products, setProducts] = useState([]);
  const [clientId, setClientId] = useState(null);
  const [cart, setCart] = useState({}); // productId -> qty
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null); // cotización guardada

  useEffect(() => { (async () => {
    try { setClients(await api.myClients()); } catch {}
    try { setProducts(await api.products('')); } catch {}
  })(); }, []);

  const setQty = (id, delta) => setCart((c) => {
    const q = Math.max(0, (c[id] || 0) + delta);
    const next = { ...c }; if (q) next[id] = q; else delete next[id]; return next;
  });
  const setQtyText = (id, t) => setCart((c) => {
    const q = Number(String(t).replace(/[^0-9]/g, '')) || 0;
    const next = { ...c }; if (q) next[id] = q; else delete next[id]; return next;
  });

  const lines = Object.entries(cart).map(([id, qty]) => { const p = products.find((x) => x.id === Number(id)); return p ? { p, qty } : null; }).filter(Boolean);
  const subtotal = lines.reduce((s, l) => s + l.p.price * l.qty, 0);
  const iva = subtotal * 0.16;
  const total = subtotal + iva;

  async function save(convert) {
    if (!clientId) return Alert.alert('Falta el cliente', 'Selecciona un cliente para cotizar.');
    if (!lines.length) return Alert.alert('Carrito vacío', 'Agrega al menos un producto.');
    setBusy(true);
    try {
      const items = lines.map((l) => ({ productId: l.p.id, qty: l.qty }));
      const quote = await api.createQuote({ clientId, items });
      if (convert) {
        const order = await api.createOrder({ quoteId: quote.id });
        setDone({ kind: 'pedido', folio: order.folio, total: order.total });
      } else {
        setDone({ kind: 'cotización', folio: quote.folio, total: quote.total, quoteId: quote.id });
      }
      setCart({});
    } catch (e) { Alert.alert('No se pudo guardar', e.message); }
    setBusy(false);
  }

  async function toOrder() {
    setBusy(true);
    try { const order = await api.createOrder({ quoteId: done.quoteId }); setDone({ kind: 'pedido', folio: order.folio, total: order.total }); }
    catch (e) { Alert.alert('No se pudo levantar el pedido', e.message); }
    setBusy(false);
  }

  if (done) return (
    <View style={st.center}>
      <View style={st.badge}><Text style={st.badgeTxt}>✓</Text></View>
      <Text style={st.h}>{done.kind === 'pedido' ? 'Pedido levantado' : 'Cotización guardada'}</Text>
      <Text style={st.folio}>{done.folio}</Text>
      <Text style={st.sub}>Total {money(done.total)}</Text>
      {done.quoteId && <TouchableOpacity style={st.primary} onPress={toOrder} disabled={busy}>{busy ? <ActivityIndicator color="#fff" /> : <Text style={st.primaryTxt}>Levantar pedido</Text>}</TouchableOpacity>}
      <TouchableOpacity style={st.secondary} onPress={() => { setDone(null); setClientId(null); }}><Text style={st.secondaryTxt}>Nueva cotización</Text></TouchableOpacity>
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 180 }}>
        <Text style={st.label}>Cliente</Text>
        <View style={st.chips}>
          {clients.map((c) => (
            <TouchableOpacity key={c.id} style={[st.chip, clientId === c.id && st.chipOn]} onPress={() => setClientId(c.id)}>
              <Text style={[st.chipTxt, clientId === c.id && st.chipTxtOn]}>{c.name}</Text>
            </TouchableOpacity>
          ))}
          {clients.length === 0 && <Text style={st.emptyTxt}>Aún no tienes cartera asignada.</Text>}
        </View>

        <Text style={st.label}>Productos</Text>
        {products.length === 0 && <Text style={st.emptyTxt}>Sin productos disponibles.</Text>}
        {products.map((p) => {
          const qty = cart[p.id] || 0;
          return (
            <View key={p.id} style={st.prod}>
              <View style={{ flex: 1 }}>
                <Text style={st.pName}>{p.name}</Text>
                <Text style={st.pMeta}>{money(p.price)} / {p.unit} · stock {Number(p.stock || 0).toLocaleString('es-MX')}</Text>
              </View>
              <View style={st.stepper}>
                <TouchableOpacity style={st.step} onPress={() => setQty(p.id, -10)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityRole="button" accessibilityLabel="Disminuir cantidad"><Text style={st.stepTxt}>−</Text></TouchableOpacity>
                <TextInput
                  style={st.qtyInput}
                  value={qty ? String(qty) : ''}
                  onChangeText={(t) => setQtyText(p.id, t)}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor={colors.gray}
                  accessibilityLabel={`Cantidad de ${p.name}`}
                />
                <TouchableOpacity style={st.step} onPress={() => setQty(p.id, +10)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityRole="button" accessibilityLabel="Aumentar cantidad"><Text style={st.stepTxt}>＋</Text></TouchableOpacity>
              </View>
            </View>
          );
        })}
      </ScrollView>

      <View style={st.footer}>
        <View style={st.totals}>
          <Text style={st.tLabel}>Subtotal <Text style={st.tVal}>{money(subtotal)}</Text></Text>
          <Text style={st.tLabel}>IVA 16% <Text style={st.tVal}>{money(iva)}</Text></Text>
          <Text style={st.tTotal}>Total {money(total)}</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <TouchableOpacity style={[st.secondary, { flex: 1, marginTop: 0 }, busy && { opacity: 0.6 }]} onPress={() => save(false)} disabled={busy}>{busy ? <ActivityIndicator color={colors.red} /> : <Text style={st.secondaryTxt}>Guardar cotización</Text>}</TouchableOpacity>
          <TouchableOpacity style={[st.primary, { flex: 1, marginTop: 0 }, busy && { opacity: 0.6 }]} onPress={() => save(true)} disabled={busy}>{busy ? <ActivityIndicator color="#fff" /> : <Text style={st.primaryTxt}>Levantar pedido</Text>}</TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  label: { color: colors.black, fontWeight: '700', marginTop: 12, marginBottom: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingVertical: 8, paddingHorizontal: 13, borderRadius: 20, borderWidth: 1, borderColor: colors.lightGray, backgroundColor: colors.white },
  chipOn: { backgroundColor: colors.red, borderColor: colors.red },
  chipTxt: { color: colors.gray, fontWeight: '600', fontSize: 13 }, chipTxtOn: { color: '#fff' },
  prod: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: colors.lightGray },
  pName: { fontWeight: '600', color: colors.black }, pMeta: { color: colors.gray, fontSize: 12, marginTop: 2 },
  stepper: { flexDirection: 'row', alignItems: 'center' },
  step: { width: 34, height: 34, minHeight: 44, borderRadius: 8, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  stepTxt: { fontSize: 20, color: colors.red, fontWeight: '700' },
  qtyInput: { minWidth: 48, textAlign: 'center', fontWeight: '700', color: colors.black, paddingVertical: 4, paddingHorizontal: 2 },
  emptyTxt: { color: colors.gray, marginTop: 4 },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: colors.lightGray, padding: 14 },
  totals: { marginBottom: 10 },
  tLabel: { color: colors.gray, fontSize: 13, textAlign: 'right' }, tVal: { color: colors.black, fontWeight: '600' },
  tTotal: { color: colors.black, fontWeight: '800', fontSize: 18, textAlign: 'right', marginTop: 2 },
  primary: { ...buttons.primary, marginTop: 14 },
  primaryTxt: { color: '#fff', fontWeight: '700' },
  secondary: { borderWidth: 1, borderColor: colors.red, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 10 },
  secondaryTxt: { color: colors.red, fontWeight: '700' },
  badge: { width: 84, height: 84, borderRadius: 42, backgroundColor: colors.ok, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  badgeTxt: { color: '#fff', fontSize: 42, fontWeight: '800' },
  h: { fontSize: 20, fontWeight: '800', color: colors.black }, folio: { color: colors.red, fontWeight: '800', fontSize: 18, marginTop: 6 },
  sub: { color: colors.gray, marginTop: 4 },
});
