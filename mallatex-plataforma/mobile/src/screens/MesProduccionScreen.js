// Vista de piso de planta: estado de la línea actual, avance de las órdenes y reporte
// rápido de avance. Lee el tablero unificado (/api/mes/tablero) y reporta eventos de avance.
import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl, ActivityIndicator, Alert, TextInput, Modal } from 'react-native';
import { colors } from '../theme';
import { api } from '../api';

const STATUS = {
  corriendo: { l: 'Corriendo', c: colors.ok, icon: '🟢' },
  paro: { l: 'En paro', c: colors.err, icon: '🔴' },
  setup: { l: 'Preparación', c: colors.warn, icon: '🟡' },
  detenida: { l: 'Detenida', c: colors.gray, icon: '⚪' },
};

export default function MesProduccionScreen() {
  const [board, setBoard] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [advanceOrder, setAdvanceOrder] = useState(null);

  const load = useCallback(async () => {
    setRefreshing(true);
    try { setBoard(await api.mesProductionBoard()); } catch {}
    setRefreshing(false); setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  if (loading) return <View style={st.center}><ActivityIndicator color={colors.red} size="large" /></View>;

  const lines = board?.lines || [];
  const orders = board?.orders || [];

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} />}
      >
        {/* Estado de líneas */}
        <Text style={st.h}>🏭 Estado de líneas</Text>
        {lines.length === 0 && <Text style={st.muted}>Sin líneas activas.</Text>}
        {lines.map((l) => {
          const s = STATUS[l.status] || STATUS.detenida;
          return (
            <View key={l.id} style={[st.lineCard, { borderLeftColor: s.c }]}>
              <View style={st.rowBetween}>
                <Text style={st.lineName}>{l.name}</Text>
                <View style={[st.badge, { backgroundColor: s.c + '22' }]}>
                  <Text style={[st.badgeTxt, { color: s.c }]}>{s.icon} {s.l}</Text>
                </View>
              </View>
              {!!l.currentOrder && <Text style={st.muted}>Orden actual: {l.currentOrder}</Text>}
              {l.oee != null && <Text style={st.muted}>OEE {Math.round(l.oee)}% · {l.speed || '—'} u/h</Text>}
            </View>
          );
        })}

        {/* Avance de órdenes */}
        <Text style={[st.h, { marginTop: 24 }]}>📋 Órdenes en curso</Text>
        {orders.length === 0 && <Text style={st.muted}>No hay órdenes asignadas.</Text>}
        {orders.map((o) => {
          const done = Number(o.produced || 0);
          const goal = Number(o.target || 0) || 1;
          const pct = Math.min(100, Math.round((done / goal) * 100));
          return (
            <View key={o.id} style={st.orderCard}>
              <View style={st.rowBetween}>
                <Text style={st.orderFolio}>🧾 {o.folio || o.id}</Text>
                <Text style={st.orderPct}>{pct}%</Text>
              </View>
              {!!o.product && <Text style={st.muted}>{o.product}</Text>}
              <View style={st.barTrack}><View style={[st.barFill, { width: `${pct}%` }]} /></View>
              <View style={st.rowBetween}>
                <Text style={st.muted}>{done.toLocaleString('es-MX')} / {Number(o.target || 0).toLocaleString('es-MX')} {o.unit || 'u'}</Text>
                <TouchableOpacity style={st.advBtn} onPress={() => setAdvanceOrder(o)}>
                  <Text style={st.advBtnTxt}>➕ Reportar avance</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </ScrollView>

      <AdvanceModal order={advanceOrder} onClose={() => setAdvanceOrder(null)} onDone={() => { setAdvanceOrder(null); load(); }} />
    </View>
  );
}

// Reporta cantidad producida como evento de avance de la línea.
function AdvanceModal({ order, onClose, onDone }) {
  const [qty, setQty] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { setQty(''); }, [order]);
  if (!order) return null;

  async function submit() {
    const n = Number(qty);
    if (!n) return Alert.alert('Cantidad', 'Escribe cuántas piezas se produjeron.');
    setBusy(true);
    try {
      await api.mesReportAlert({ type: 'avance', lineId: order.lineId, orderId: order.id, qty: n });
      onDone();
    } catch (e) {
      Alert.alert(e.offline ? 'Sin conexión' : 'No se reportó', e.offline ? 'Se reintentará al reconectar.' : e.message);
    } finally { setBusy(false); }
  }

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={st.sheetWrap}>
        <View style={st.sheet}>
          <View style={st.sheetHead}>
            <Text style={st.sheetTitle}>Reportar avance</Text>
            <TouchableOpacity onPress={onClose}><Text style={st.close}>✕</Text></TouchableOpacity>
          </View>
          <Text style={st.muted}>{order.folio || order.id} · {order.product || ''}</Text>
          <Text style={st.label}>Piezas producidas</Text>
          <TextInput style={st.qtyInput} value={qty} onChangeText={setQty} keyboardType="number-pad" placeholder="0" placeholderTextColor={colors.gray} />
          <TouchableOpacity style={[st.primary, busy && { opacity: 0.6 }]} onPress={submit} disabled={busy}>
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={st.primaryTxt}>Guardar avance</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const st = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  h: { fontSize: 18, fontWeight: '800', color: colors.black, marginBottom: 12 },
  muted: { color: colors.gray, marginTop: 4 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  lineCard: { backgroundColor: colors.white, borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: colors.lightGray, borderLeftWidth: 5 },
  lineName: { fontWeight: '800', color: colors.black, fontSize: 16 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeTxt: { fontWeight: '700', fontSize: 12 },
  orderCard: { backgroundColor: colors.white, borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: colors.lightGray },
  orderFolio: { fontWeight: '800', color: colors.black, fontSize: 15 },
  orderPct: { fontWeight: '800', color: colors.red, fontSize: 16 },
  barTrack: { height: 10, borderRadius: 6, backgroundColor: colors.bg, marginVertical: 10, overflow: 'hidden' },
  barFill: { height: 10, borderRadius: 6, backgroundColor: colors.ok },
  advBtn: { backgroundColor: colors.red, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 14 },
  advBtnTxt: { color: '#fff', fontWeight: '800', fontSize: 13 },
  // modal
  sheetWrap: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.bg, borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 18 },
  sheetHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  sheetTitle: { fontSize: 18, fontWeight: '800', color: colors.black },
  close: { fontSize: 20, color: colors.gray },
  label: { color: colors.black, fontWeight: '700', marginTop: 14, marginBottom: 6 },
  qtyInput: { backgroundColor: colors.white, borderWidth: 2, borderColor: colors.lightGray, borderRadius: 12, padding: 16, color: colors.black, fontSize: 24, fontWeight: '800', textAlign: 'center' },
  primary: { backgroundColor: colors.red, borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 20, marginBottom: 8 },
  primaryTxt: { color: '#fff', fontWeight: '800', fontSize: 16 },
});
