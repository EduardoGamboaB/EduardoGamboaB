import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { colors } from '../theme';
import { api } from '../api';
import { getLocation } from '../location';

export default function RouteScreen({ onGoVisit }) {
  const [route, setRoute] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { setRoute(await api.activeRoute()); } catch {}
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function start() {
    setBusy(true);
    try { const geo = await getLocation(); setRoute(await api.startRoute({ lat: geo.lat, lng: geo.lng })); }
    catch (e) { Alert.alert('No se pudo iniciar', e.message); }
    setBusy(false);
  }
  async function updateTrack() {
    setBusy(true);
    try { const geo = await getLocation(); const r = await api.trackRoute(route.id, [{ lat: geo.lat, lng: geo.lng }]); setRoute({ ...route, track: Array(r.points).fill(0) }); Alert.alert('Recorrido', `Punto agregado (${r.points} en total).`); }
    catch (e) { Alert.alert('Error', e.message); }
    setBusy(false);
  }
  async function end() {
    Alert.alert('Finalizar ruta', '¿Cerrar el recorrido de hoy?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Finalizar', style: 'destructive', onPress: async () => { try { await api.endRoute(route.id); setRoute(null); } catch (e) { Alert.alert('Error', e.message); } } },
    ]);
  }

  if (loading) return <View style={st.center}><ActivityIndicator color={colors.red} /></View>;

  if (!route) return (
    <ScrollView contentContainerStyle={st.wrap}>
      <Text style={st.icon}>🧭</Text>
      <Text style={st.title}>Sin ruta activa</Text>
      <Text style={st.sub}>Inicia tu ruta para registrar el recorrido por GPS y marcar tus visitas.</Text>
      <TouchableOpacity style={[st.primary, busy && { opacity: 0.6 }]} onPress={start} disabled={busy}>
        {busy ? <ActivityIndicator color="#fff" /> : <Text style={st.primaryTxt}>▶ Iniciar ruta</Text>}
      </TouchableOpacity>
      <Text style={st.note}>Se habilitará el GPS para registrar tu recorrido.</Text>
    </ScrollView>
  );

  const points = (route.track || []).length;
  return (
    <ScrollView contentContainerStyle={{ padding: 18 }}>
      <View style={st.liveCard}>
        <View style={st.dot} />
        <Text style={st.liveTxt}>Ruta en curso</Text>
      </View>
      <View style={st.stats}>
        <Stat n={points} l="puntos GPS" />
        <Stat n={new Date(route.startedAt).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })} l="inicio" />
      </View>
      <TouchableOpacity style={st.primary} onPress={() => onGoVisit && onGoVisit()}><Text style={st.primaryTxt}>＋ Registrar visita</Text></TouchableOpacity>
      <TouchableOpacity style={[st.secondary, busy && { opacity: 0.6 }]} onPress={updateTrack} disabled={busy}><Text style={st.secondaryTxt}>📍 Actualizar recorrido</Text></TouchableOpacity>
      <TouchableOpacity style={st.endBtn} onPress={end}><Text style={st.endTxt}>■ Finalizar ruta</Text></TouchableOpacity>
      <Text style={st.note}>El recorrido se registra al iniciar y cada vez que actualizas. El seguimiento continuo en segundo plano llega en una próxima versión.</Text>
    </ScrollView>
  );
}

const Stat = ({ n, l }) => (<View style={st.stat}><Text style={st.statN}>{n}</Text><Text style={st.statL}>{l}</Text></View>);

const st = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  wrap: { alignItems: 'center', justifyContent: 'center', padding: 30, paddingTop: 60 },
  icon: { fontSize: 60, marginBottom: 12 },
  title: { fontSize: 22, fontWeight: '800', color: colors.black },
  sub: { color: colors.gray, textAlign: 'center', marginTop: 8, marginBottom: 24 },
  primary: { backgroundColor: colors.red, borderRadius: 12, paddingVertical: 15, alignItems: 'center', width: '100%', marginTop: 8 },
  primaryTxt: { color: '#fff', fontWeight: '700', fontSize: 16 },
  secondary: { borderWidth: 1, borderColor: colors.red, borderRadius: 12, paddingVertical: 13, alignItems: 'center', marginTop: 10 },
  secondaryTxt: { color: colors.red, fontWeight: '700' },
  endBtn: { borderWidth: 1, borderColor: colors.lightGray, borderRadius: 12, paddingVertical: 13, alignItems: 'center', marginTop: 10 },
  endTxt: { color: colors.gray, fontWeight: '700' },
  note: { color: colors.gray, fontSize: 12, textAlign: 'center', marginTop: 16 },
  liveCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#e8f5ee', borderRadius: 12, paddingVertical: 12, marginBottom: 16 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.ok, marginRight: 8 },
  liveTxt: { color: colors.ok, fontWeight: '800' },
  stats: { flexDirection: 'row', gap: 12, marginBottom: 8 },
  stat: { flex: 1, backgroundColor: colors.white, borderRadius: 12, borderWidth: 1, borderColor: colors.lightGray, padding: 16, alignItems: 'center' },
  statN: { fontSize: 20, fontWeight: '800', color: colors.black },
  statL: { color: colors.gray, fontSize: 12, marginTop: 2 },
});
