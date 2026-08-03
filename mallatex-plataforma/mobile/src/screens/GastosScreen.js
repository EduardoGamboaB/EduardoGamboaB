import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl, TextInput, Alert, ActivityIndicator, Modal, ScrollView, Switch } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { colors } from '../theme';
import { api } from '../api';

const money = (n) => '$' + Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const CATS = [['hospedaje', 'Hospedaje', '🏨'], ['alimentos', 'Alimentos', '🍽️'], ['combustible', 'Combustible', '⛽'], ['casetas', 'Casetas', '🛣️'], ['transporte', 'Transporte', '🚕'], ['otros', 'Otros', '🧾']];
const CAT_ICON = Object.fromEntries(CATS.map(([k, , i]) => [k, i]));
const STATUS = { pendiente: { l: 'Pendiente', c: colors.warn }, aprobado: { l: 'Aprobado', c: colors.ok }, rechazado: { l: 'Rechazado', c: colors.red } };

export default function GastosScreen() {
  const [items, setItems] = useState([]);
  const [requests, setRequests] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    try { setItems(await api.expenses()); } catch {}
    try { setRequests((await api.expenseRequests()).filter((r) => r.status === 'aprobado')); } catch {}
    setRefreshing(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const total = items.reduce((s, e) => s + Number(e.amount || 0), 0);

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={items}
        keyExtractor={(it) => String(it.id)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} />}
        contentContainerStyle={{ padding: 14, paddingBottom: 90 }}
        ListHeaderComponent={items.length ? <View style={st.sum}><Text style={st.sumL}>Comprobado</Text><Text style={st.sumV}>{money(total)}</Text></View> : null}
        ListEmptyComponent={<Text style={st.empty}>Aún no has comprobado gastos. Toma foto del ticket o factura con “＋ Comprobar”.</Text>}
        renderItem={({ item }) => {
          const s = STATUS[item.status] || {};
          return (
            <View style={st.card}>
              <View style={st.rowTop}>
                <Text style={st.folio}>{CAT_ICON[item.category] || '🧾'}  {item.folio}</Text>
                <View style={[st.tag, { backgroundColor: (s.c || colors.gray) + '22' }]}><Text style={[st.tagTxt, { color: s.c || colors.gray }]}>{s.l || item.status}</Text></View>
              </View>
              <Text style={st.merchant}>{item.merchant || '(sin comercio)'} · {item.date}</Text>
              <View style={st.rowTop}>
                <Text style={st.amount}>{money(item.amount)}</Text>
                <View style={st.flags}>
                  {item.hasInvoice && <Text style={st.flag}>Factura</Text>}
                  {item.hasPhoto && <Text style={st.flag}>📷 Evidencia</Text>}
                </View>
              </View>
            </View>
          );
        }}
      />
      <TouchableOpacity style={st.fab} onPress={() => setOpen(true)}><Text style={st.fabTxt}>＋ Comprobar</Text></TouchableOpacity>
      <ExpenseModal visible={open} requests={requests} onClose={() => setOpen(false)} onDone={() => { setOpen(false); load(); }} />
    </View>
  );
}

function ExpenseModal({ visible, requests, onClose, onDone }) {
  const [camPermission, requestCamPermission] = useCameraPermissions();
  const cameraRef = useRef(null);
  const [category, setCategory] = useState('alimentos');
  const [merchant, setMerchant] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState('');
  const [hasInvoice, setHasInvoice] = useState(false);
  const [rfc, setRfc] = useState('');
  const [requestId, setRequestId] = useState(null);
  const [photo, setPhoto] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (visible) {
    setCategory('alimentos'); setMerchant(''); setAmount(''); setDate(''); setHasInvoice(false); setRfc(''); setRequestId(null); setPhoto(null);
    if (!camPermission?.granted) requestCamPermission();
  } }, [visible]);

  async function takePhoto() {
    try { const s = await cameraRef.current?.takePictureAsync({ base64: true, quality: 0.4, skipProcessing: true }); if (s?.base64) setPhoto('data:image/jpeg;base64,' + s.base64); }
    catch { Alert.alert('Cámara', 'No se pudo tomar la foto.'); }
  }

  async function submit() {
    if (!Number(amount)) return Alert.alert('Falta el monto', 'Captura el importe del gasto.');
    setBusy(true);
    try {
      await api.createExpense({ category, merchant, amount: Number(amount), date, hasInvoice, rfc, requestId, photo: photo || undefined });
      onDone();
    } catch (e) { Alert.alert('No se pudo comprobar', e.message); }
    finally { setBusy(false); }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={st.sheetWrap}>
        <View style={st.sheet}>
          <View style={st.sheetHead}><Text style={st.sheetTitle}>Comprobar gasto</Text><TouchableOpacity onPress={onClose}><Text style={st.close}>✕</Text></TouchableOpacity></View>
          <ScrollView>
            <Text style={st.label}>Categoría</Text>
            <View style={st.chips}>{CATS.map(([v, l, i]) => (
              <TouchableOpacity key={v} style={[st.chip, category === v && st.chipOn]} onPress={() => setCategory(v)}><Text style={[st.chipTxt, category === v && st.chipTxtOn]}>{i} {l}</Text></TouchableOpacity>
            ))}</View>

            {requests.length > 0 && (
              <>
                <Text style={st.label}>Aplicar a viático (opcional)</Text>
                <View style={st.chips}>
                  <TouchableOpacity style={[st.chip, requestId === null && st.chipOn]} onPress={() => setRequestId(null)}><Text style={[st.chipTxt, requestId === null && st.chipTxtOn]}>Ninguno</Text></TouchableOpacity>
                  {requests.map((r) => (
                    <TouchableOpacity key={r.id} style={[st.chip, requestId === r.id && st.chipOn]} onPress={() => setRequestId(r.id)}><Text style={[st.chipTxt, requestId === r.id && st.chipTxtOn]}>{r.folio}</Text></TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            <Text style={st.label}>Comercio</Text>
            <TextInput style={st.input} value={merchant} onChangeText={setMerchant} placeholder="Nombre del establecimiento" placeholderTextColor={colors.gray} />
            <View style={st.row2}>
              <View style={{ flex: 1 }}><Text style={st.label}>Monto *</Text><TextInput style={st.input} value={amount} onChangeText={setAmount} keyboardType="numeric" placeholder="0.00" placeholderTextColor={colors.gray} /></View>
              <View style={{ flex: 1 }}><Text style={st.label}>Fecha</Text><TextInput style={st.input} value={date} onChangeText={setDate} placeholder="AAAA-MM-DD" placeholderTextColor={colors.gray} /></View>
            </View>

            <View style={st.rowBetween}>
              <Text style={st.label}>¿Tiene factura?</Text>
              <Switch value={hasInvoice} onValueChange={setHasInvoice} trackColor={{ true: colors.red, false: colors.lightGray }} thumbColor="#fff" />
            </View>
            {hasInvoice && <TextInput style={st.input} value={rfc} onChangeText={setRfc} autoCapitalize="characters" placeholder="RFC emisor" placeholderTextColor={colors.gray} />}

            <Text style={st.label}>Evidencia (ticket / factura)</Text>
            <View style={st.cameraBox}>
              {camPermission?.granted
                ? (photo ? <View style={st.photoDone}><Text style={{ fontSize: 40 }}>📷</Text><Text style={st.muted}>Evidencia lista</Text></View> : <CameraView ref={cameraRef} style={{ flex: 1 }} facing="back" />)
                : <View style={st.centerBox}><Text style={st.muted}>Permiso de cámara requerido</Text></View>}
            </View>
            <TouchableOpacity style={st.secondary} onPress={photo ? () => setPhoto(null) : takePhoto} disabled={!camPermission?.granted}>
              <Text style={st.secondaryTxt}>{photo ? 'Repetir foto' : '📷 Tomar foto'}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[st.primary, busy && { opacity: 0.6 }]} onPress={submit} disabled={busy}>
              {busy ? <ActivityIndicator color="#fff" /> : <Text style={st.primaryTxt}>Guardar comprobación</Text>}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const st = StyleSheet.create({
  sum: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.white, borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: colors.lightGray },
  sumL: { color: colors.gray, fontWeight: '700' }, sumV: { color: colors.black, fontWeight: '800', fontSize: 18 },
  card: { backgroundColor: colors.white, borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: colors.lightGray },
  rowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  folio: { fontWeight: '800', color: colors.black },
  merchant: { color: colors.gray, fontSize: 12, marginTop: 6 },
  amount: { color: colors.red, fontWeight: '800', fontSize: 16, marginTop: 8 },
  flags: { flexDirection: 'row', gap: 6, marginTop: 8 },
  flag: { fontSize: 10, color: colors.gray, backgroundColor: colors.bg, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, overflow: 'hidden' },
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
  row2: { flexDirection: 'row', gap: 10 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20, borderWidth: 1, borderColor: colors.lightGray, backgroundColor: colors.white },
  chipOn: { backgroundColor: colors.red, borderColor: colors.red },
  chipTxt: { color: colors.gray, fontWeight: '600', fontSize: 13 }, chipTxtOn: { color: '#fff' },
  cameraBox: { height: 190, borderRadius: 14, overflow: 'hidden', backgroundColor: '#000', borderWidth: 1, borderColor: colors.lightGray },
  photoDone: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#141010' },
  centerBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  secondary: { borderWidth: 1, borderColor: colors.red, borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginTop: 10 },
  secondaryTxt: { color: colors.red, fontWeight: '700' },
  muted: { color: colors.gray },
  primary: { backgroundColor: colors.red, borderRadius: 12, paddingVertical: 15, alignItems: 'center', marginTop: 20, marginBottom: 12 },
  primaryTxt: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
