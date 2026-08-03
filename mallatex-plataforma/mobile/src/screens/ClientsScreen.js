import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl, Modal, TextInput, ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { colors } from '../theme';
import { api } from '../api';
import { enqueue } from '../storage';

const STAGE = {
  prospecto: { label: 'Prospecto', color: colors.warn, bg: '#fff7e6' },
  negociacion: { label: 'Negociación', color: '#2563eb', bg: '#eaf1ff' },
  cliente: { label: 'Cliente', color: colors.ok, bg: '#e8f5ee' },
};

export default function ClientsScreen() {
  const [items, setItems] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [firstLoad, setFirstLoad] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [detail, setDetail] = useState(null);
  const [form, setForm] = useState(null); // objeto de alta de prospecto
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    try { setItems(await api.myClients()); setLoadError(false); } catch { setLoadError(true); }
    setRefreshing(false); setFirstLoad(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function openDetail(c) {
    try { setDetail(await api.client(c.id)); } catch { setDetail(c); }
  }

  async function saveProspect() {
    if (busy) return;
    if (!form.name?.trim()) return Alert.alert('Falta el nombre', 'Escribe el nombre o empresa del prospecto.');
    const payload = { ...form };
    setBusy(true);
    try {
      await api.createProspect(payload);
      setForm(null);
      Alert.alert('Prospecto guardado', payload.name);
      load();
    } catch (e) {
      if (e.offline) {
        await enqueue({ kind: 'client', payload });
        setForm(null);
        Alert.alert('Guardado sin conexión', 'Se sincronizará al reconectar.');
      } else {
        Alert.alert('No se pudo guardar', e.message);
      }
    } finally { setBusy(false); }
  }

  return (
    <View style={{ flex: 1 }}>
      <TouchableOpacity style={st.addBar} onPress={() => setForm({ name: '', cultivo: '', phone: '', contactName: '' })}>
        <Text style={st.addTxt}>＋ Nuevo prospecto</Text>
      </TouchableOpacity>
      {loadError && <View style={st.errBanner}><Text style={st.errBannerTxt}>Sin conexión · desliza para reintentar</Text></View>}
      <FlatList
        data={items}
        keyExtractor={(it) => String(it.id)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} />}
        contentContainerStyle={{ padding: 14 }}
        ListEmptyComponent={firstLoad
          ? <ActivityIndicator style={{ marginTop: 40 }} color={colors.red} />
          : (loadError ? null : <Text style={st.empty}>Aún no tienes cartera asignada.</Text>)}
        renderItem={({ item }) => {
          const s = STAGE[item.stage] || STAGE.cliente;
          return (
            <TouchableOpacity style={st.card} onPress={() => openDetail(item)}>
              <View style={{ flex: 1 }}>
                <Text style={st.name}>{item.name}</Text>
                <Text style={st.meta}>{item.cultivo || 'Sin cultivo'}{item.contactName ? ' · ' + item.contactName : ''}</Text>
              </View>
              <View style={[st.tag, { backgroundColor: s.bg }]}><Text style={[st.tagTxt, { color: s.color }]}>{s.label}</Text></View>
            </TouchableOpacity>
          );
        }}
      />

      {/* Detalle */}
      <Modal visible={!!detail} transparent animationType="slide" onRequestClose={() => setDetail(null)}>
        <View style={st.sheetWrap}>
          <View style={st.sheet}>
            {detail && (<>
              <Text style={st.sheetTitle}>{detail.name}</Text>
              <Text style={st.sheetSub}>{(STAGE[detail.stage] || {}).label} · {detail.cultivo || '—'}</Text>
              <ScrollView style={{ maxHeight: 360 }}>
                <Field k="Contacto" v={detail.contactName} />
                <Field k="Teléfono" v={detail.phone} />
                <Field k="Dirección" v={detail.address} />
                <Text style={st.histTitle}>Visitas recientes</Text>
                {(detail.visits || []).length === 0 && <Text style={st.meta}>Sin visitas registradas.</Text>}
                {(detail.visits || []).map((v) => (
                  <View key={v.id} style={st.hist}>
                    <Text style={st.histType}>{v.type} · {v.status}</Text>
                    <Text style={st.meta}>{new Date(v.timestamp).toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</Text>
                  </View>
                ))}
              </ScrollView>
              <TouchableOpacity style={st.closeBtn} onPress={() => setDetail(null)}><Text style={st.closeTxt}>Cerrar</Text></TouchableOpacity>
            </>)}
          </View>
        </View>
      </Modal>

      {/* Alta de prospecto */}
      <Modal visible={!!form} transparent animationType="slide" onRequestClose={() => setForm(null)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={st.sheetWrap}>
          <View style={st.sheet}>
            <Text style={st.sheetTitle}>Nuevo prospecto</Text>
            {form && (<>
              <Input label="Nombre / empresa" value={form.name} onChange={(t) => setForm({ ...form, name: t })} />
              <Input label="Cultivo" value={form.cultivo} onChange={(t) => setForm({ ...form, cultivo: t })} />
              <Input label="Contacto" value={form.contactName} onChange={(t) => setForm({ ...form, contactName: t })} />
              <Input label="Teléfono" value={form.phone} onChange={(t) => setForm({ ...form, phone: t })} keyboardType="phone-pad" />
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
                <TouchableOpacity style={[st.closeBtn, { flex: 1 }]} onPress={() => setForm(null)} disabled={busy}><Text style={st.closeTxt}>Cancelar</Text></TouchableOpacity>
                <TouchableOpacity style={[st.saveBtn, { flex: 1 }, busy && { opacity: 0.6 }]} onPress={saveProspect} disabled={busy}>
                  {busy ? <ActivityIndicator color="#fff" /> : <Text style={st.saveTxt}>Guardar</Text>}
                </TouchableOpacity>
              </View>
            </>)}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const Field = ({ k, v }) => (<View style={st.field}><Text style={st.fieldK}>{k}</Text><Text style={st.fieldV}>{v || '—'}</Text></View>);
const Input = ({ label, value, onChange, keyboardType }) => (
  <View style={{ marginBottom: 10 }}>
    <Text style={st.inLabel}>{label}</Text>
    <TextInput style={st.input} value={value} onChangeText={onChange} keyboardType={keyboardType} placeholderTextColor={colors.gray} />
  </View>
);

const st = StyleSheet.create({
  addBar: { backgroundColor: colors.white, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: colors.lightGray },
  addTxt: { color: colors.red, fontWeight: '700' },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: colors.lightGray },
  name: { fontWeight: '700', color: colors.black, fontSize: 15 },
  meta: { color: colors.gray, marginTop: 2, fontSize: 12 },
  tag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  tagTxt: { fontWeight: '700', fontSize: 12 },
  empty: { textAlign: 'center', color: colors.gray, marginTop: 40 },
  errBanner: { backgroundColor: '#fff7e6', paddingVertical: 10, paddingHorizontal: 14 },
  errBannerTxt: { color: '#92400E', textAlign: 'center', fontSize: 12, fontWeight: '600' },
  sheetWrap: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.white, borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 20, paddingBottom: 30 },
  sheetTitle: { fontSize: 18, fontWeight: '800', color: colors.black },
  sheetSub: { color: colors.gray, marginTop: 2, marginBottom: 12 },
  field: { flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.bg },
  fieldK: { color: colors.black, fontWeight: '600', width: 110 },
  fieldV: { color: colors.gray, flex: 1 },
  histTitle: { fontWeight: '800', color: colors.black, marginTop: 16, marginBottom: 6 },
  hist: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.bg },
  histType: { color: colors.black, fontWeight: '600', textTransform: 'capitalize' },
  closeBtn: { marginTop: 14, borderWidth: 1, borderColor: colors.lightGray, borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  closeTxt: { color: colors.gray, fontWeight: '700' },
  saveBtn: { marginTop: 14, backgroundColor: colors.red, borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  saveTxt: { color: '#fff', fontWeight: '700' },
  inLabel: { color: colors.black, fontWeight: '600', marginBottom: 5 },
  input: { borderWidth: 1, borderColor: colors.lightGray, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: colors.black },
});
