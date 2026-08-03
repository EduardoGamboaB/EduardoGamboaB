import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity, ScrollView, Image, Alert } from 'react-native';
import { colors } from '../theme';
import { getBiometricEnabled, setBiometricEnabled } from '../storage';
import { biometricAvailable, biometricLabel, biometricAuthenticate } from '../biometrics';

export default function ProfileScreen({ profile, onLogout }) {
  const emp = profile?.employee || {};
  const [bioOn, setBioOn] = useState(false);
  const [bioReady, setBioReady] = useState(false);
  const [bioName, setBioName] = useState('biometría');

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
        <Row label="Rostro enrolado" value={emp.faceEnrolled ? 'Sí' : 'No'} />
        <Row label="Sitios asignados" value={String((profile?.sites || []).length)} />
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

      <TouchableOpacity style={st.logout} onPress={onLogout}>
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
  logout: { marginTop: 24, borderWidth: 1, borderColor: colors.red, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  logoutTxt: { color: colors.red, fontWeight: '700', fontSize: 16 },
  version: { textAlign: 'center', color: colors.gray, fontSize: 12, marginTop: 18 },
});
