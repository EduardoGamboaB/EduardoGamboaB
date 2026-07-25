import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ActivityIndicator, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { colors } from './src/theme';
import { api } from './src/api';
import { getToken, setToken, getQueue, saveQueue } from './src/storage';
import LoginScreen from './src/screens/LoginScreen';
import CheckinScreen from './src/screens/CheckinScreen';
import HistoryScreen from './src/screens/HistoryScreen';

export default function App() {
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState(false);
  const [profile, setProfile] = useState(null);
  const [tab, setTab] = useState('checar');
  const [queueVersion, setQueueVersion] = useState(0);

  const loadProfile = useCallback(async () => {
    try { const me = await api.me(); setProfile(me); setAuthed(true); return true; }
    catch (e) { if (e.status === 401) { await setToken(null); setAuthed(false); } return false; }
  }, []);

  useEffect(() => { (async () => {
    if (await getToken()) await loadProfile();
    setLoading(false);
  })(); }, [loadProfile]);

  // Sincroniza los registros guardados sin conexión.
  const flushQueue = useCallback(async (silent) => {
    const q = await getQueue();
    if (!q.length) { if (!silent) Alert.alert('Sincronizar', 'No hay registros pendientes.'); return; }
    const remaining = [];
    let sent = 0;
    for (const item of q) {
      try { await api.checkin(item); sent++; }
      catch (e) { if (e.offline) remaining.push(item); /* error real: se descarta con aviso */ }
    }
    await saveQueue(remaining);
    setQueueVersion((v) => v + 1);
    if (!silent) Alert.alert('Sincronización', `${sent} enviado(s), ${remaining.length} pendiente(s).`);
  }, []);

  useEffect(() => { if (authed) flushQueue(true); }, [authed, flushQueue]);

  async function onLoggedIn() { await loadProfile(); }
  async function logout() { await api.logout(); await setToken(null); setAuthed(false); setProfile(null); }

  if (loading) return <View style={[st.center, { flex: 1, backgroundColor: colors.bg }]}><ActivityIndicator color={colors.red} size="large" /></View>;
  if (!authed) return (<><StatusBar style="dark" /><LoginScreen onLoggedIn={onLoggedIn} /></>);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar style="light" />
      <View style={st.header}>
        <View>
          <Text style={st.hTitle}>Mallatex Campo</Text>
          <Text style={st.hSub}>{profile?.employee?.name} · {profile?.employee?.code}</Text>
        </View>
        <TouchableOpacity onPress={logout}><Text style={st.logout}>Salir</Text></TouchableOpacity>
      </View>

      <View style={st.tabs}>
        {[['checar', 'Registrar'], ['historial', 'Historial']].map(([k, label]) => (
          <TouchableOpacity key={k} style={[st.tab, tab === k && st.tabOn]} onPress={() => setTab(k)}>
            <Text style={[st.tabTxt, tab === k && st.tabTxtOn]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={{ flex: 1 }}>
        {tab === 'checar'
          ? <CheckinScreen profile={profile} onQueued={() => setQueueVersion((v) => v + 1)} />
          : <HistoryScreen queueVersion={queueVersion} onSync={() => flushQueue(false)} />}
      </View>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  header: { backgroundColor: colors.red, paddingHorizontal: 18, paddingTop: 14, paddingBottom: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  hTitle: { color: '#fff', fontSize: 18, fontWeight: '800' },
  hSub: { color: '#ffe3e4', marginTop: 2, fontSize: 12 },
  logout: { color: '#fff', fontWeight: '700' },
  tabs: { flexDirection: 'row', backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.lightGray },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center', borderBottomWidth: 3, borderBottomColor: 'transparent' },
  tabOn: { borderBottomColor: colors.red },
  tabTxt: { color: colors.gray, fontWeight: '700' },
  tabTxtOn: { color: colors.red },
});
