import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert, ActivityIndicator, Switch, TextInput, Linking } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { colors } from '../theme';
import { api } from '../api';
import { getLocation } from '../location';
import { enqueue } from '../storage';

const TYPES = [['prospeccion', 'Prospección'], ['seguimiento', 'Seguimiento'], ['cierre', 'Cierre'], ['cobranza', 'Cobranza'], ['entrega', 'Entrega'], ['postventa', 'Postventa']];
const STATUSES = [['realizada', 'Realizada'], ['no_localizado', 'No localizado'], ['reagendada', 'Reagendada']];

export default function VisitScreen() {
  const [camPermission, requestCamPermission] = useCameraPermissions();
  const cameraRef = useRef(null);
  const [clients, setClients] = useState([]);
  const [route, setRoute] = useState(null);
  const [clientId, setClientId] = useState(null);
  const [type, setType] = useState('seguimiento');
  const [status, setStatus] = useState('realizada');
  const [found, setFound] = useState(true);
  const [notes, setNotes] = useState('');
  const [photo, setPhoto] = useState(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [loadError, setLoadError] = useState(false);

  // El permiso de cámara solo se consulta al montar (el hook expone el estado);
  // el diálogo del sistema se dispara hasta la primera acción que lo necesita.
  const loadData = async () => {
    let err = false;
    try { setClients(await api.myClients()); } catch { err = true; }
    try { setRoute(await api.activeRoute()); } catch {}
    setLoadError(err);
  };
  useEffect(() => { loadData(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function takePhoto() {
    if (!camPermission?.granted) { await requestCamPermission(); return; }
    try { const s = await cameraRef.current?.takePictureAsync({ base64: true, quality: 0.4, skipProcessing: true }); if (s?.base64) setPhoto('data:image/jpeg;base64,' + s.base64); }
    catch { Alert.alert('Cámara', 'No se pudo tomar la foto.'); }
  }

  async function submit() {
    if (!clientId) return Alert.alert('Falta el cliente', 'Selecciona un cliente o prospecto.');
    let geo = null;
    try { geo = await getLocation(); } catch {}
    if (!geo) {
      Alert.alert('Sin ubicación', '¿Registrar la visita sin coordenadas?', [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Registrar', onPress: () => doSubmit({}) },
      ]);
      return;
    }
    await doSubmit(geo);
  }

  async function doSubmit(geo) {
    setBusy(true);
    try {
      const payload = {
        kind: 'visit', clientId, routeId: route?.id || undefined, type, status, found,
        lat: geo.lat, lng: geo.lng, notes, photos: photo ? [photo] : [],
      };
      try {
        await api.createVisit(payload);
        setResult({ ok: true, offline: false });
      } catch (e) {
        if (e.offline) { const n = await enqueue(payload); setResult({ ok: true, offline: true, n }); }
        else { Alert.alert('No se registró', e.message); }
      }
    } finally { setBusy(false); }
  }

  if (result) return (
    <View style={st.center}>
      <View style={[st.badge, { backgroundColor: result.offline ? colors.warn : colors.ok }]}><Text style={st.badgeTxt}>{result.offline ? '⏳' : '✓'}</Text></View>
      <Text style={st.h}>{result.offline ? 'Guardada sin conexión' : 'Visita registrada'}</Text>
      <Text style={st.sub}>{result.offline ? `Se enviará al reconectar (${result.n} en cola)` : 'Se agregó a tu seguimiento y a la ruta.'}</Text>
      <TouchableOpacity style={st.primary} onPress={() => { setResult(null); setPhoto(null); setNotes(''); setClientId(null); }}><Text style={st.primaryTxt}>Registrar otra</Text></TouchableOpacity>
    </View>
  );

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      {loadError && (
        <TouchableOpacity style={st.errBanner} onPress={loadData} accessibilityRole="button" accessibilityLabel="Reintentar carga">
          <Text style={st.errBannerTxt}>Sin conexión · toca para reintentar</Text>
        </TouchableOpacity>
      )}
      {!route && <View style={st.warn}><Text style={st.warnTxt}>No tienes una ruta activa. Puedes registrar la visita igual; inicia ruta para asociarla al recorrido.</Text></View>}

      <Text style={st.label}>Cliente / prospecto</Text>
      <View style={st.chips}>
        {clients.map((c) => (
          <TouchableOpacity key={c.id} style={[st.chip, clientId === c.id && st.chipOn]} onPress={() => setClientId(c.id)}>
            <Text style={[st.chipTxt, clientId === c.id && st.chipTxtOn]}>{c.name}</Text>
          </TouchableOpacity>
        ))}
        {clients.length === 0 && <Text style={st.muted}>Sin cartera. Agrega prospectos en “Mis clientes”.</Text>}
      </View>

      <Text style={st.label}>Tipo de visita</Text>
      <View style={st.chips}>{TYPES.map(([v, l]) => (
        <TouchableOpacity key={v} style={[st.chip, type === v && st.chipOn]} onPress={() => setType(v)}><Text style={[st.chipTxt, type === v && st.chipTxtOn]}>{l}</Text></TouchableOpacity>
      ))}</View>

      <Text style={st.label}>Estatus</Text>
      <View style={st.chips}>{STATUSES.map(([v, l]) => (
        <TouchableOpacity key={v} style={[st.chip, status === v && st.chipOn]} onPress={() => setStatus(v)}><Text style={[st.chipTxt, status === v && st.chipTxtOn]}>{l}</Text></TouchableOpacity>
      ))}</View>

      <View style={st.rowBetween}>
        <Text style={st.label}>¿Encontraste al cliente?</Text>
        <Switch value={found} onValueChange={setFound} trackColor={{ true: colors.red, false: colors.lightGray }} thumbColor="#fff" />
      </View>

      <Text style={st.label}>Evidencia (foto)</Text>
      <View style={st.cameraBox}>
        {camPermission?.granted
          ? (photo ? <View style={st.photoDone}><Text style={{ fontSize: 40 }}>📷</Text><Text style={st.muted}>Foto lista</Text></View> : <CameraView ref={cameraRef} style={{ flex: 1 }} facing="back" />)
          : (
            <View style={st.center}>
              <Text style={st.muted}>Permiso de cámara requerido</Text>
              {camPermission && !camPermission.canAskAgain
                ? <TouchableOpacity style={st.permBtn} onPress={() => Linking.openSettings()}><Text style={st.permBtnTxt}>Abrir ajustes</Text></TouchableOpacity>
                : <TouchableOpacity style={st.permBtn} onPress={requestCamPermission}><Text style={st.permBtnTxt}>Permitir cámara</Text></TouchableOpacity>}
            </View>
          )}
      </View>
      <TouchableOpacity style={st.secondary} onPress={photo ? () => setPhoto(null) : takePhoto} disabled={!camPermission?.granted}>
        <Text style={st.secondaryTxt}>{photo ? 'Repetir foto' : '📷 Tomar foto'}</Text>
      </TouchableOpacity>

      <Text style={st.label}>Notas</Text>
      <TextInput style={st.notes} value={notes} onChangeText={setNotes} multiline placeholder="Comentarios de la visita…" placeholderTextColor={colors.gray} />

      <TouchableOpacity style={[st.primary, busy && { opacity: 0.6 }]} onPress={submit} disabled={busy}>
        {busy ? <ActivityIndicator color="#fff" /> : <Text style={st.primaryTxt}>Registrar visita</Text>}
      </TouchableOpacity>
      <Text style={st.muted2}>Se capturará tu ubicación al registrar.</Text>
    </ScrollView>
  );
}

const st = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  label: { color: colors.black, fontWeight: '700', marginTop: 16, marginBottom: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingVertical: 8, paddingHorizontal: 13, borderRadius: 20, borderWidth: 1, borderColor: colors.lightGray, backgroundColor: colors.white },
  chipOn: { backgroundColor: colors.red, borderColor: colors.red },
  chipTxt: { color: colors.gray, fontWeight: '600', fontSize: 13 },
  chipTxtOn: { color: '#fff' },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  cameraBox: { height: 200, borderRadius: 14, overflow: 'hidden', backgroundColor: '#000', borderWidth: 1, borderColor: colors.lightGray },
  photoDone: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#141010' },
  secondary: { borderWidth: 1, borderColor: colors.red, borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginTop: 10 },
  secondaryTxt: { color: colors.red, fontWeight: '700' },
  notes: { borderWidth: 1, borderColor: colors.lightGray, borderRadius: 10, padding: 12, minHeight: 70, color: colors.black, textAlignVertical: 'top' },
  primary: { backgroundColor: colors.red, borderRadius: 12, paddingVertical: 15, alignItems: 'center', marginTop: 20 },
  primaryTxt: { color: '#fff', fontWeight: '700', fontSize: 16 },
  muted: { color: colors.gray },
  muted2: { color: colors.gray, fontSize: 12, textAlign: 'center', marginTop: 10 },
  warn: { backgroundColor: '#fff7e6', borderRadius: 10, padding: 12, marginBottom: 4 },
  warnTxt: { color: '#92400E', fontSize: 12 },
  errBanner: { backgroundColor: '#fff7e6', borderRadius: 10, paddingVertical: 12, paddingHorizontal: 14, marginBottom: 8 },
  errBannerTxt: { color: '#92400E', textAlign: 'center', fontWeight: '700', fontSize: 12 },
  permBtn: { backgroundColor: colors.red, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 18, marginTop: 12 },
  permBtnTxt: { color: '#fff', fontWeight: '700' },
  badge: { width: 84, height: 84, borderRadius: 42, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  badgeTxt: { color: '#fff', fontSize: 42, fontWeight: '800' },
  h: { fontSize: 20, fontWeight: '800', color: colors.black },
  sub: { color: colors.gray, marginTop: 6, textAlign: 'center' },
});
