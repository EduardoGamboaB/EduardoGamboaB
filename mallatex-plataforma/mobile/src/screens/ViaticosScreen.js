import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl, TextInput, Alert, ActivityIndicator, Modal, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { colors } from '../theme';
import { api } from '../api';

const money = (n) => '$' + Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const STATUS = {
  solicitado: { l: 'Solicitado', c: colors.warn },
  aprobado: { l: 'Aprobado', c: colors.ok },
  rechazado: { l: 'Rechazado', c: colors.red },
  comprobado: { l: 'Comprobado', c: '#2563eb' },
};

export default function ViaticosScreen() {
  const [items, setItems] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [firstLoad, setFirstLoad] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    try { setItems(await api.expenseRequests()); setLoadError(false); } catch { setLoadError(true); }
    setRefreshing(false); setFirstLoad(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  return (
    <View style={{ flex: 1 }}>
      {loadError && <View style={st.errBanner}><Text style={st.errBannerTxt}>Sin conexión · desliza para reintentar</Text></View>}
      <FlatList
        data={items}
        keyExtractor={(it) => String(it.id)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} />}
        contentContainerStyle={{ padding: 14, paddingBottom: 90 }}
        ListEmptyComponent={firstLoad
          ? <ActivityIndicator style={{ marginTop: 40 }} color={colors.red} />
          : (loadError ? null : <Text style={st.empty}>Aún no has solicitado viáticos. Usa el botón “＋ Solicitar”.</Text>)}
        renderItem={({ item }) => {
          const s = STATUS[item.status] || {};
          return (
            <View style={st.card}>
              <View style={st.rowTop}>
                <Text style={st.folio}>{item.folio}</Text>
                <View style={[st.tag, { backgroundColor: (s.c || colors.gray) + '22' }]}><Text style={[st.tagTxt, { color: s.c || colors.gray }]}>{s.l || item.status}</Text></View>
              </View>
              <Text style={st.concept}>{item.concept}</Text>
              {!!item.destination && <Text style={st.meta}>📍 {item.destination}</Text>}
              {(item.fromDate || item.toDate) && <Text style={st.meta}>{item.fromDate || '—'} → {item.toDate || '—'}</Text>}
              <Text style={st.amount}>{money(item.amount)}</Text>
              {!!item.decisionNote && <Text style={st.note}>“{item.decisionNote}”</Text>}
            </View>
          );
        }}
      />
      <TouchableOpacity style={st.fab} onPress={() => setOpen(true)}><Text style={st.fabTxt}>＋ Solicitar</Text></TouchableOpacity>
      <RequestModal visible={open} onClose={() => setOpen(false)} onDone={() => { setOpen(false); load(); }} />
    </View>
  );
}

function RequestModal({ visible, onClose, onDone }) {
  const [concept, setConcept] = useState('');
  const [destination, setDestination] = useState('');
  const [amount, setAmount] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (visible) { setConcept(''); setDestination(''); setAmount(''); setFromDate(''); setToDate(''); setDescription(''); } }, [visible]);

  async function submit() {
    if (!concept.trim() || !amount.trim()) return Alert.alert('Faltan datos', 'Concepto y monto son obligatorios.');
    const amt = Number(String(amount).replace(',', '.').replace(/[^0-9.]/g, ''));
    if (!amt) return Alert.alert('Monto inválido', 'Revisa el monto capturado.');
    const validDate = (v) => /^\d{4}-\d{2}-\d{2}$/.test(v) && !isNaN(new Date(v).getTime());
    for (const v of [fromDate, toDate]) {
      if (v.trim() && !validDate(v.trim())) return Alert.alert('Fecha inválida (formato AAAA-MM-DD)', 'Revisa las fechas capturadas.');
    }
    setBusy(true);
    try {
      const r = await api.createExpenseRequest({ concept, destination, amount: amt, fromDate, toDate, description });
      Alert.alert('Solicitud enviada', 'Folio ' + (r.folio || '—'));
      onDone();
    }
    catch (e) { Alert.alert('No se pudo solicitar', e.message); }
    finally { setBusy(false); }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={st.sheetWrap}>
        <View style={st.sheet}>
          <View style={st.sheetHead}><Text style={st.sheetTitle}>Solicitar viáticos</Text><TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityRole="button" accessibilityLabel="Cerrar"><Text style={st.close}>✕</Text></TouchableOpacity></View>
          <ScrollView>
            <Text style={st.label}>Concepto *</Text>
            <TextInput style={st.input} value={concept} onChangeText={setConcept} placeholder="p. ej. Visita a cliente en Zamora" placeholderTextColor={colors.gray} />
            <Text style={st.label}>Destino</Text>
            <TextInput style={st.input} value={destination} onChangeText={setDestination} placeholder="Ciudad / zona" placeholderTextColor={colors.gray} />
            <Text style={st.label}>Monto solicitado *</Text>
            <TextInput style={st.input} value={amount} onChangeText={setAmount} keyboardType="numeric" placeholder="0.00" placeholderTextColor={colors.gray} />
            <View style={st.row2}>
              <View style={{ flex: 1 }}><Text style={st.label}>Desde</Text><TextInput style={st.input} value={fromDate} onChangeText={setFromDate} autoCorrect={false} placeholder="AAAA-MM-DD" placeholderTextColor={colors.gray} /></View>
              <View style={{ flex: 1 }}><Text style={st.label}>Hasta</Text><TextInput style={st.input} value={toDate} onChangeText={setToDate} autoCorrect={false} placeholder="AAAA-MM-DD" placeholderTextColor={colors.gray} /></View>
            </View>
            <Text style={st.label}>Detalle</Text>
            <TextInput style={[st.input, { minHeight: 70, textAlignVertical: 'top' }]} value={description} onChangeText={setDescription} multiline placeholder="Desglose estimado…" placeholderTextColor={colors.gray} />
            <TouchableOpacity style={[st.primary, busy && { opacity: 0.6 }]} onPress={submit} disabled={busy}>
              {busy ? <ActivityIndicator color="#fff" /> : <Text style={st.primaryTxt}>Enviar solicitud</Text>}
            </TouchableOpacity>
            <Text style={st.hint}>El gerente comercial revisará y aprobará tu solicitud.</Text>
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
  concept: { color: colors.black, marginTop: 6, fontWeight: '600' },
  meta: { color: colors.gray, fontSize: 12, marginTop: 2 },
  amount: { color: colors.red, fontWeight: '800', fontSize: 16, marginTop: 8 },
  note: { color: colors.gray, fontStyle: 'italic', fontSize: 12, marginTop: 6 },
  tag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 }, tagTxt: { fontWeight: '700', fontSize: 12 },
  empty: { textAlign: 'center', color: colors.gray, marginTop: 40, paddingHorizontal: 20 },
  errBanner: { backgroundColor: '#fff7e6', paddingVertical: 10, paddingHorizontal: 14 },
  errBannerTxt: { color: '#92400E', textAlign: 'center', fontSize: 12, fontWeight: '600' },
  fab: { position: 'absolute', right: 18, bottom: 22, backgroundColor: colors.red, borderRadius: 26, paddingHorizontal: 20, paddingVertical: 14, elevation: 4, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 6, shadowOffset: { width: 0, height: 3 } },
  fabTxt: { color: '#fff', fontWeight: '800' },
  sheetWrap: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.bg, borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 18, maxHeight: '90%' },
  sheetHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  sheetTitle: { fontSize: 18, fontWeight: '800', color: colors.black }, close: { fontSize: 20, color: colors.gray },
  label: { color: colors.black, fontWeight: '700', marginTop: 12, marginBottom: 6 },
  input: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.lightGray, borderRadius: 10, padding: 12, color: colors.black },
  row2: { flexDirection: 'row', gap: 10 },
  primary: { backgroundColor: colors.red, borderRadius: 12, paddingVertical: 15, alignItems: 'center', marginTop: 20 },
  primaryTxt: { color: '#fff', fontWeight: '700', fontSize: 16 },
  hint: { color: colors.gray, fontSize: 12, textAlign: 'center', marginTop: 12, marginBottom: 10 },
});
