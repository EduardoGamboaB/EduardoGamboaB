import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity, ScrollView, Image, Alert } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { colors } from '../theme';
import { api } from '../api';
import { confirmAction } from '../confirm';
import { getBiometricEnabled, setBiometricEnabled } from '../storage';
import { biometricAvailable, biometricLabel, biometricAuthenticate } from '../biometrics';

export default function ProfileScreen({ profile, onLogout }) {
  const emp = profile?.employee || {};
  const [bioOn, setBioOn] = useState(false);
  const [bioReady, setBioReady] = useState(false);
  const [bioName, setBioName] = useState('biometría');
  // Enrolamiento facial: captura de selfie de referencia.
  const [faceOpen, setFaceOpen] = useState(false);
  const [faceSending, setFaceSending] = useState(false);
  const [faceState, setFaceState] = useState({ enrolled: !!emp.faceEnrolled, reference: false });
  const [camPermission, requestCamPermission] = useCameraPermissions();
  const cameraRef = useRef(null);

  useEffect(() => { (async () => {
    setBioOn(await getBiometricEnabled());
    setBioReady(await biometricAvailable());
    setBioName(await biometricLabel());
  })(); }, []);

  async function toggleBio(next) {
    if (next) {
      if (!bioReady) { Alert.alert('No disponible', 'Este dispositivo no tiene biometría configurada.'); return; }
      const ok = await biometricAuthenticate(`Activa el acceso con ${bioName}`);
      if (!ok) return;
    }
    await setBiometricEnabled(next);
    setBioOn(next);
  }

  async function captureFace() {
    try {
      const shot = await cameraRef.current?.takePictureAsync({ base64: true, quality: 0.5, skipProcessing: true });
      if (!shot?.base64) { Alert.alert('Cámara', 'No se pudo tomar la foto.'); return; }
      setFaceSending(true);
      const r = await api.enrollFace({ photo: `data:image/jpeg;base64,${shot.base64}` });
      setFaceState({ enrolled: !!r?.faceEnrolled, reference: !!r?.reference });
      setFaceOpen(false);
      Alert.alert('Mi rostro', r?.faceEnrolled
        ? 'Rostro enrolado: ya puedes checar con reconocimiento facial.'
        : 'Foto de referencia guardada. RH o el kiosco completarán el enrolamiento facial.');
    } catch (e) {
      Alert.alert('Mi rostro', e?.message || 'No se pudo guardar la foto. Revisa tu conexión.');
    } finally { setFaceSending(false); }
  }

  async function openFace() {
    if (!camPermission?.granted) {
      const r = await requestCamPermission();
      if (!r?.granted) { Alert.alert('Cámara', 'Se necesita permiso de cámara para registrar tu rostro.'); return; }
    }
    setFaceOpen(true);
  }

  const Row = ({ label, value }) => (
    <View style={st.row}><Text style={st.rowLabel}>{label}</Text><Text style={st.rowValue}>{value || '—'}</Text></View>
  );

  const modeLabel = { planta: 'Planta', campo: 'Campo', hibrido: 'Híbrido' }[emp.workMode] || 'Planta';

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <View style={st.hero}>
        <View style={st.avatar}><Text style={st.avatarTxt}>{(emp.name || '?').split(' ').slice(0, 2).map((s) => s[0]).join('').toUpperCase()}</Text></View>
        <Text style={st.name}>{emp.name}</Text>
        <Text style={st.sub}>{emp.code} · {emp.department}</Text>
        <View style={st.badge}><Text style={st.badgeTxt}>Modalidad: {modeLabel}</Text></View>
      </View>

      <Text style={st.section}>Datos</Text>
      <View style={st.card}>
        <Row label="Código" value={emp.code} />
        <Row label="Área" value={emp.department} />
        <Row label="Modalidad" value={modeLabel} />
        <Row label="Rostro enrolado" value={faceState.enrolled ? 'Sí' : faceState.reference ? 'Referencia enviada' : 'No'} />
        <Row label="Sitios asignados" value={String((profile?.sites || []).length)} />
      </View>

      <Text style={st.section}>Mi rostro</Text>
      <View style={st.card}>
        {faceOpen ? (
          <View style={{ paddingVertical: 12 }}>
            <View style={st.camBox}>
              <CameraView ref={cameraRef} style={{ flex: 1 }} facing="front" />
            </View>
            <TouchableOpacity style={st.faceBtn} onPress={captureFace} disabled={faceSending}
              accessibilityRole="button" accessibilityLabel="Tomar y enviar selfie de enrolamiento">
              <Text style={st.faceBtnTxt}>{faceSending ? 'Enviando…' : '📷 Tomar y enviar'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={st.faceCancel} onPress={() => setFaceOpen(false)}>
              <Text style={st.faceCancelTxt}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={st.row}>
            <View style={{ flex: 1 }}>
              <Text style={st.rowLabel}>{faceState.enrolled ? 'Actualizar mi rostro' : 'Registrar mi rostro'}</Text>
              <Text style={st.hint}>Selfie de referencia para checar con reconocimiento facial en el kiosco.</Text>
            </View>
            <TouchableOpacity style={st.faceMini} onPress={openFace} accessibilityRole="button" accessibilityLabel="Abrir cámara para registrar rostro">
              <Text style={st.faceMiniTxt}>📷</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <Text style={st.section}>Seguridad</Text>
      <View style={st.card}>
        <View style={st.row}>
          <View style={{ flex: 1 }}>
            <Text style={st.rowLabel}>Acceso con {bioName}</Text>
            <Text style={st.hint}>{bioReady ? 'Entra sin escribir tu PIN.' : 'No disponible en este dispositivo.'}</Text>
          </View>
          <Switch value={bioOn} onValueChange={toggleBio} disabled={!bioReady}
            trackColor={{ true: colors.red, false: colors.lightGray }} thumbColor={colors.white} />
        </View>
      </View>

      <TouchableOpacity
        style={st.logout}
        onPress={() => confirmAction('Cerrar sesión', '¿Salir de tu cuenta?', onLogout, 'Salir')}
      >
        <Text style={st.logoutTxt}>Cerrar sesión</Text>
      </TouchableOpacity>
      <Text style={st.version}>Mallatex Campo · v1.0.0 · powered by Evorgyn</Text>
    </ScrollView>
  );
}

const st = StyleSheet.create({
  hero: { alignItems: 'center', paddingVertical: 18 },
  avatar: { width: 84, height: 84, borderRadius: 42, backgroundColor: colors.red, alignItems: 'center', justifyContent: 'center' },
  avatarTxt: { color: '#fff', fontSize: 30, fontWeight: '800' },
  name: { fontSize: 20, fontWeight: '800', color: colors.black, marginTop: 12 },
  sub: { color: colors.gray, marginTop: 2 },
  badge: { marginTop: 10, backgroundColor: '#fdecec', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
  badgeTxt: { color: colors.red, fontWeight: '700', fontSize: 12 },
  section: { fontWeight: '800', color: colors.black, marginTop: 18, marginBottom: 8 },
  card: { backgroundColor: colors.white, borderRadius: 14, borderWidth: 1, borderColor: colors.lightGray, paddingHorizontal: 14 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: colors.bg },
  rowLabel: { color: colors.black, fontWeight: '600' },
  rowValue: { color: colors.gray, marginLeft: 'auto' },
  hint: { color: colors.gray, fontSize: 12, marginTop: 2 },
  camBox: { height: 260, borderRadius: 12, overflow: 'hidden', backgroundColor: '#000' },
  faceBtn: { marginTop: 12, backgroundColor: colors.red, borderRadius: 12, paddingVertical: 14, alignItems: 'center', minHeight: 44 },
  faceBtnTxt: { color: '#fff', fontWeight: '800', fontSize: 16 },
  faceCancel: { marginTop: 8, alignItems: 'center', paddingVertical: 10, minHeight: 44 },
  faceCancelTxt: { color: colors.gray, fontWeight: '600' },
  faceMini: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#fdecec', alignItems: 'center', justifyContent: 'center', marginLeft: 12 },
  faceMiniTxt: { fontSize: 20 },
  logout: { marginTop: 24, borderWidth: 1, borderColor: colors.red, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  logoutTxt: { color: colors.red, fontWeight: '700', fontSize: 16 },
  version: { textAlign: 'center', color: colors.gray, fontSize: 12, marginTop: 18 },
});
