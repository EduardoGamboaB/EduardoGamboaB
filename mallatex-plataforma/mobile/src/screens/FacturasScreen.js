import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl, TextInput, Alert, ActivityIndicator, Modal, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { colors } from '../theme';
import { api } from '../api';

const money = (n) => '$' + Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const STATUS = { solicitada: { l: 'Solicitada', c: colors.warn }, emitida: { l: 'Emitida', c: colors.ok }, pagada: { l: 'Pagada', c: '#2563eb' }, cancelada: { l: 'Cancelada', c: colors.red } };
const USOS = [['G03', 'G03 · Gastos en general'], ['G01', 'G01 · Adquisición de mercancías'], ['I08', 'I08 · Maquinaria/equipo'], ['P01', 'P01 · Por definir']];

export default function FacturasScreen() {
  const [items, setItems] = useState([]);
  const [orders, setOrders] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    try { setItems(await api.invoices()); } catch {}
    try { setOrders(await api.orders()); } catch {}
    setRefreshing(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={items}
        keyExtractor={(it) => String(it.id)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} />}
        contentContainerStyle={{ padding: 14, paddingBottom: 90 }}
        ListEmptyComponent={<Text style={st.empty}>Aún no has solicitado facturas. Genera una desde un pedido con “＋ Solicitar factura”.</Text>}
        renderItem={({ item }) => {
          const s = STATUS[item.status] || {};
          return (
            <View style={st.card}>
              <View style={st.rowTop}>
                <Text style={st.folio}>{item.folio}</Text>
                <View style={[st.tag, { backgroundColor: (s.c || colors.gray) + '22' }]}><Text style={[st.tagTxt, { color: s.c || colors.gray }]}>{s.l || item.status}</Text></View>
              </View>
              <Text style={st.client}>{item.clientName || item.razonSocial}</Text>
              <Text style={st.meta}>RFC {item.rfc} · Uso {item.usoCfdi}</Text>
              <Text style={st.amount}>{money(item.amount)}</Text>
              {!!item.uuid && <Text style={st.uuid}>UUID {item.uuid}</Text>}
            </View>
          );
        }}
      />
      <TouchableOpacity style={st.fab} onPress={() => setOpen(true)}><Text style={st.fabTxt}>＋ Solicitar factura</Text></TouchableOpacity>
      <InvoiceModal visible={open} orders={orders} onClose={() => setOpen(false)} onDone={() => { setOpen(false); load(); }} />
    </View>
  );
}

function InvoiceModal({ visible, orders, onClose, onDone }) {
  const [orderId, setOrderId] = useState(null);
  const [rfc, setRfc] = useState('');
  const [razonSocial, setRazonSocial] = useState('');
  const [usoCfdi, setUsoCfdi] = useState('G03');
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (visible) { setOrderId(null); setRfc(''); setRazonSocial(''); setUsoCfdi('G03'); setAmount(''); } }, [visible]);

  const selectedOrder = orders.find((o) => o.id === orderId);

  async function submit() {
    if (!rfc.trim()) return Alert.alert('Falta el RFC', 'Captura el RFC receptor.');
    const amt = Number(String(amount).replace(',', '.').replace(/[^0-9.]/g, ''));
    if (!orderId && !amount.trim()) return Alert.alert('Falta el importe', 'Elige un pedido o captura el importe.');
    if (!orderId && !amt) return Alert.alert('Importe inválido', 'Revisa el importe capturado.');
    setBusy(true);
    try {
      await api.createInvoice({ orderId: orderId || undefined, rfc, razonSocial, usoCfdi, amount: orderId ? undefined : amt });
      onDone();
    } catch (e) { Alert.alert('No se pudo solicitar', e.message); }
    finally { setBusy(false); }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={st.sheetWrap}>
        <View style={st.sheet}>
          <View style={st.sheetHead}><Text style={st.sheetTitle}>Solicitar factura</Text><TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityRole="button" accessibilityLabel="Cerrar"><Text style={st.close}>✕</Text></TouchableOpacity></View>
          <ScrollView>
            <Text style={st.label}>Pedido a facturar (opcional)</Text>
            <View style={st.chips}>
              <TouchableOpacity style={[st.chip, orderId === null && st.chipOn]} onPress={() => setOrderId(null)}><Text style={[st.chipTxt, orderId === null && st.chipTxtOn]}>Manual</Text></TouchableOpacity>
              {orders.map((o) => (
                <TouchableOpacity key={o.id} style={[st.chip, orderId === o.id && st.chipOn]} onPress={() => setOrderId(o.id)}><Text style={[st.chipTxt, orderId === o.id && st.chipTxtOn]}>{o.folio}</Text></TouchableOpacity>
              ))}
            </View>
            {selectedOrder && <Text style={st.pick}>{selectedOrder.clientName} · {money(selectedOrder.total)}</Text>}

            <Text style={st.label}>RFC receptor *</Text>
            <TextInput style={st.input} value={rfc} onChangeText={setRfc} autoCapitalize="characters" placeholder="XAXX010101000" placeholderTextColor={colors.gray} />
            <Text style={st.label}>Razón social</Text>
            <TextInput style={st.input} value={razonSocial} onChangeText={setRazonSocial} placeholder="Nombre / empresa" placeholderTextColor={colors.gray} />
            <Text style={st.label}>Uso de CFDI</Text>
            <View style={st.chips}>{USOS.map(([v, l]) => (
              <TouchableOpacity key={v} style={[st.chip, usoCfdi === v && st.chipOn]} onPress={() => setUsoCfdi(v)}><Text style={[st.chipTxt, usoCfdi === v && st.chipTxtOn]}>{l}</Text></TouchableOpacity>
            ))}</View>
            {!orderId && (<>
              <Text style={st.label}>Importe *</Text>
              <TextInput style={st.input} value={amount} onChangeText={setAmount} keyboardType="numeric" placeholder="0.00" placeholderTextColor={colors.gray} />
            </>)}

            <TouchableOpacity style={[st.primary, busy && { opacity: 0.6 }]} onPress={submit} disabled={busy}>
              {busy ? <ActivityIndicator color="#fff" /> : <Text style={st.primaryTxt}>Enviar solicitud</Text>}
            </TouchableOpacity>
            <Text style={st.hint}>La emisión del CFDI se timbra desde administración (integración Aspel).</Text>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const st = StyleSheet.create({
  card: { backgroundColor: colors.white, borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: colors.lightGray },
  rowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  folio: { fontWeight: '800', color: colors.black },
  client: { color: colors.black, marginTop: 6, fontWeight: '600' },
  meta: { color: colors.gray, fontSize: 12, marginTop: 2 },
  amount: { color: colors.red, fontWeight: '800', fontSize: 16, marginTop: 8 },
  uuid: { color: colors.gray, fontSize: 10, marginTop: 6 },
  tag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 }, tagTxt: { fontWeight: '700', fontSize: 11 },
  empty: { textAlign: 'center', color: colors.gray, marginTop: 40, paddingHorizontal: 20 },
  fab: { position: 'absolute', right: 18, bottom: 22, backgroundColor: colors.red, borderRadius: 26, paddingHorizontal: 20, paddingVertical: 14, elevation: 4, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 6, shadowOffset: { width: 0, height: 3 } },
  fabTxt: { color: '#fff', fontWeight: '800' },
  sheetWrap: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.bg, borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 18, maxHeight: '92%' },
  sheetHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  sheetTitle: { fontSize: 18, fontWeight: '800', color: colors.black }, close: { fontSize: 20, color: colors.gray },
  label: { color: colors.black, fontWeight: '700', marginTop: 12, marginBottom: 6 },
  input: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.lightGray, borderRadius: 10, padding: 12, color: colors.black },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20, borderWidth: 1, borderColor: colors.lightGray, backgroundColor: colors.white },
  chipOn: { backgroundColor: colors.red, borderColor: colors.red },
  chipTxt: { color: colors.gray, fontWeight: '600', fontSize: 13 }, chipTxtOn: { color: '#fff' },
  pick: { color: colors.black, marginTop: 8, fontWeight: '600' },
  primary: { backgroundColor: colors.red, borderRadius: 12, paddingVertical: 15, alignItems: 'center', marginTop: 20 },
  primaryTxt: { color: '#fff', fontWeight: '700', fontSize: 16 },
  hint: { color: colors.gray, fontSize: 12, textAlign: 'center', marginTop: 12, marginBottom: 10 },
});
