import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import { colors } from '../theme';
import { api } from '../api';
import { enqueue } from '../storage';

export default function CheckinScreen({ profile, onQueued }) {
  const [camPermission, requestCamPermission] = useCameraPermissions();
  const cameraRef = useRef(null);
  const [sites, setSites] = useState(profile?.sites || []);
  const [siteId, setSiteId] = useState(profile?.sites?.[0]?.id ?? null);
  const [type, setType] = useState('auto'); // auto | entrada | salida
  const [photo, setPhoto] = useState(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => { (async () => { if (!camPermission?.granted) await requestCamPermission(); })(); }, []);

  async function takeSelfie() {
    try {
      const shot = await cameraRef.current?.takePictureAsync({ base64: true, quality: 0.4, skipProcessing: true });
      if (shot?.base64) setPhoto('data:image/jpeg;base64,' + shot.base64);
    } catch (e) { Alert.alert('Cámara', 'No se pudo tomar la selfie.'); }
  }

  async function getLocation() {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') throw new Error('Se requiere permiso de ubicación para registrar asistencia.');
    const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
    return {
      lat: loc.coords.latitude,
      lng: loc.coords.longitude,
      accuracy: loc.coords.accuracy,
      mocked: loc.mocked === true,
    };
  }

  async function register() {
    setBusy(true); setResult(null);
    try {
      const geo = await getLocation();
      const payload = {
        type: type === 'auto' ? undefined : type,
        siteId: siteId ?? undefined,
        lat: geo.lat, lng: geo.lng, accuracy: geo.accuracy, mocked: geo.mocked,
        photo: photo || undefined,
        deviceInfo: 'app-movil',
      };
      try {
        const r = await api.checkin(payload);
        setResult({ ok: true, ...r });
        setPhoto(null);
      } catch (e) {
        if (e.offline) {
          const n = await enqueue({ ...payload, offline: true });
          setResult({ ok: true, queued: true, headline: 'Guardado sin conexión', statusLabel: `Se enviará al reconectar (${n} en cola)` });
          setPhoto(null);
          onQueued && onQueued();
        } else {
          setResult({ ok: false, headline: 'No se registró', statusLabel: e.message });
        }
      }
    } catch (e) {
      setResult({ ok: false, headline: 'No se registró', statusLabel: e.message });
    } finally { setBusy(false); }
  }

  if (result) {
    const good = result.ok && !result.flags?.length;
    const tone = result.queued ? colors.warn : (good ? colors.ok : colors.err);
    return (
      <View style={[st.center, { padding: 24 }]}>
        <View style={[st.badge, { backgroundColor: tone }]}>
          <Text style={st.badgeIcon}>{result.ok ? (result.queued ? '⏳' : '✓') : '✕'}</Text>
        </View>
        <Text style={st.headline}>{result.headline}</Text>
        {!!result.time && <Text style={st.big}>{result.type === 'salida' ? 'Salida' : 'Entrada'} · {result.time}</Text>}
        {!!result.site && <Text style={st.sub}>{result.site.name}</Text>}
        {result.distanceMeters != null && (
          <Text style={[st.sub, { color: result.withinGeofence === false ? colors.err : colors.gray }]}>
            {result.withinGeofence === false ? '⚠ Fuera de la geocerca' : 'Dentro de la geocerca'} · {result.distanceMeters} m
          </Text>
        )}
        {!!result.statusLabel && <Text style={st.sub}>{result.statusLabel}</Text>}
        {!!result.flags?.length && <Text style={[st.sub, { color: colors.warn }]}>Marcado para revisión: {result.flags.join(', ')}</Text>}
        <TouchableOpacity style={st.primaryBtn} onPress={() => setResult(null)}>
          <Text style={st.primaryBtnTxt}>Registrar otra</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <Text style={st.label}>Cámara (selfie de verificación)</Text>
      <View style={st.cameraBox}>
        {camPermission?.granted ? (
          photo
            ? <View style={st.photoDone}><Text style={{ fontSize: 40 }}>🤳</Text><Text style={st.sub}>Selfie lista</Text></View>
            : <CameraView ref={cameraRef} style={{ flex: 1 }} facing="front" />
        ) : (
          <View style={st.center}><Text style={st.sub}>Se necesita permiso de cámara</Text></View>
        )}
      </View>
      <TouchableOpacity style={st.secondaryBtn} onPress={photo ? () => setPhoto(null) : takeSelfie} disabled={!camPermission?.granted}>
        <Text style={st.secondaryBtnTxt}>{photo ? 'Repetir selfie' : '📷 Tomar selfie'}</Text>
      </TouchableOpacity>

      <Text style={st.label}>Tipo</Text>
      <View style={st.row}>
        {['auto', 'entrada', 'salida'].map((t) => (
          <TouchableOpacity key={t} style={[st.chip, type === t && st.chipOn]} onPress={() => setType(t)}>
            <Text style={[st.chipTxt, type === t && st.chipTxtOn]}>{t === 'auto' ? 'Automático' : t[0].toUpperCase() + t.slice(1)}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={st.label}>Sitio</Text>
      <View style={st.row}>
        <TouchableOpacity style={[st.chip, siteId == null && st.chipOn]} onPress={() => setSiteId(null)}>
          <Text style={[st.chipTxt, siteId == null && st.chipTxtOn]}>Sin sitio</Text>
        </TouchableOpacity>
        {sites.map((s) => (
          <TouchableOpacity key={s.id} style={[st.chip, siteId === s.id && st.chipOn]} onPress={() => setSiteId(s.id)}>
            <Text style={[st.chipTxt, siteId === s.id && st.chipTxtOn]}>{s.name}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={[st.primaryBtn, busy && { opacity: 0.6 }]} onPress={register} disabled={busy}>
        {busy ? <ActivityIndicator color="#fff" /> : <Text style={st.primaryBtnTxt}>Registrar asistencia</Text>}
      </TouchableOpacity>
      <Text style={st.hint}>Se capturará tu ubicación al momento de registrar, para validar el sitio (geocerca).</Text>
    </ScrollView>
  );
}

const st = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  label: { color: colors.black, fontWeight: '700', marginTop: 16, marginBottom: 8 },
  cameraBox: { height: 260, borderRadius: 14, overflow: 'hidden', backgroundColor: '#000', borderWidth: 1, borderColor: colors.lightGray },
  photoDone: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#141010' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1, borderColor: colors.lightGray, backgroundColor: colors.white },
  chipOn: { backgroundColor: colors.red, borderColor: colors.red },
  chipTxt: { color: colors.gray, fontWeight: '600' },
  chipTxtOn: { color: colors.white },
  primaryBtn: { backgroundColor: colors.red, borderRadius: 12, paddingVertical: 15, alignItems: 'center', marginTop: 22 },
  primaryBtnTxt: { color: colors.white, fontWeight: '700', fontSize: 16 },
  secondaryBtn: { borderWidth: 1, borderColor: colors.red, borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginTop: 10 },
  secondaryBtnTxt: { color: colors.red, fontWeight: '700' },
  hint: { color: colors.gray, fontSize: 12, marginTop: 12, textAlign: 'center' },
  badge: { width: 92, height: 92, borderRadius: 46, alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  badgeIcon: { color: '#fff', fontSize: 46, fontWeight: '800' },
  headline: { fontSize: 22, fontWeight: '800', color: colors.black, textAlign: 'center' },
  big: { fontSize: 18, color: colors.black, marginTop: 8, fontWeight: '600' },
  sub: { color: colors.gray, marginTop: 4, textAlign: 'center' },
});
