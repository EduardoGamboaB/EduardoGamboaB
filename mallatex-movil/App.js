import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ActivityIndicator, Alert, Modal, Pressable, Image, ScrollView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { colors } from './src/theme';
import { api } from './src/api';
import { getToken, setToken, getQueue, saveQueue, getBiometricEnabled, setBiometricEnabled } from './src/storage';
import { biometricAvailable, biometricLabel, biometricAuthenticate } from './src/biometrics';
import LoginScreen from './src/screens/LoginScreen';
import CheckinScreen from './src/screens/CheckinScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import ComingSoonScreen from './src/screens/ComingSoonScreen';
import ClientsScreen from './src/screens/ClientsScreen';
import VisitScreen from './src/screens/VisitScreen';
import RouteScreen from './src/screens/RouteScreen';
import PerformanceScreen from './src/screens/PerformanceScreen';

// Menú extensible: agregar un módulo nuevo = una entrada aquí + su pantalla.
const MENU = [
  { key: 'ruta', label: 'Ruta de visitas', icon: '🧭', group: 'Ventas' },
  { key: 'clientes', label: 'Mis clientes', icon: '👥', group: 'Ventas' },
  { key: 'visita', label: 'Registrar visita', icon: '📋', group: 'Ventas' },
  { key: 'desempeno', label: 'Mi desempeño', icon: '🎯', group: 'Ventas' },
  { key: 'asistencia', label: 'Mi asistencia', icon: '📍', group: 'Ventas' },
  { key: 'inventario', label: 'Inventario', icon: '📦', group: 'Herramientas', soon: true },
  { key: 'cotizador', label: 'Cotizador', icon: '🧮', group: 'Herramientas', soon: true },
  { key: 'pedidos', label: 'Pedidos', icon: '🛒', group: 'Herramientas', soon: true },
  { key: 'bot', label: 'Asistente técnico', icon: '🤖', group: 'Herramientas', soon: true },
  { key: 'viaticos', label: 'Viáticos', icon: '✈️', group: 'Administración', soon: true },
  { key: 'gastos', label: 'Gastos', icon: '🧾', group: 'Administración', soon: true },
  { key: 'facturas', label: 'Facturas', icon: '📑', group: 'Administración', soon: true },
  { key: 'perfil', label: 'Mi perfil', icon: '👤', group: 'Cuenta' },
];
const GROUPS = ['Ventas', 'Herramientas', 'Administración', 'Cuenta'];
const titleOf = (key) => (MENU.find((m) => m.key === key) || {}).label || 'Mallatex Ventas';

export default function App() {
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState(false);
  const [locked, setLocked] = useState(false);
  const [profile, setProfile] = useState(null);
  const [screen, setScreen] = useState('ruta');
  const [menuOpen, setMenuOpen] = useState(false);
  const [queueVersion, setQueueVersion] = useState(0);
  const [bioName, setBioName] = useState('biometría');

  const loadProfile = useCallback(async () => {
    try { const me = await api.me(); setProfile(me); setAuthed(true); return true; }
    catch (e) { if (e.status === 401) { await setToken(null); setAuthed(false); } return false; }
  }, []);

  const unlock = useCallback(async () => {
    const ok = await biometricAuthenticate(`Desbloquea Mallatex Campo con ${bioName}`);
    if (ok) { setLocked(false); await loadProfile(); }
  }, [bioName, loadProfile]);

  useEffect(() => { (async () => {
    setBioName(await biometricLabel());
    if (await getToken()) {
      if ((await getBiometricEnabled()) && (await biometricAvailable())) {
        setLocked(true); setLoading(false);
        return; // el candado se resuelve con unlock()
      }
      await loadProfile();
    }
    setLoading(false);
  })(); }, [loadProfile]);

  useEffect(() => { if (locked) unlock(); }, [locked, unlock]);

  const flushQueue = useCallback(async (silent) => {
    const q = await getQueue();
    if (!q.length) { if (!silent) Alert.alert('Sincronizar', 'No hay registros pendientes.'); return; }
    const remaining = []; let sent = 0;
    for (const item of q) {
      try { if (item.kind === 'visit') await api.createVisit(item); else await api.checkin(item); sent++; }
      catch (e) { if (e.offline) remaining.push(item); }
    }
    await saveQueue(remaining); setQueueVersion((v) => v + 1);
    if (!silent) Alert.alert('Sincronización', `${sent} enviado(s), ${remaining.length} pendiente(s).`);
  }, []);

  useEffect(() => { if (authed) flushQueue(true); }, [authed, flushQueue]);

  async function onLoggedIn() {
    const ok = await loadProfile();
    if (ok && !(await getBiometricEnabled()) && (await biometricAvailable())) {
      Alert.alert('Acceso rápido', `¿Activar el acceso con ${bioName} para la próxima vez?`, [
        { text: 'Ahora no', style: 'cancel' },
        { text: 'Activar', onPress: async () => { await setBiometricEnabled(true); } },
      ]);
    }
  }
  async function logout() { await api.logout(); await setToken(null); setAuthed(false); setLocked(false); setProfile(null); setScreen('ruta'); }
  function go(key) { setMenuOpen(false); if (key !== screen) setScreen(key); }

  if (loading) return <View style={[st.center, { flex: 1, backgroundColor: colors.bg }]}><ActivityIndicator color={colors.red} size="large" /></View>;

  if (locked) return (
    <View style={st.lock}>
      <StatusBar style="dark" />
      <Image source={require('./assets/logo-iso.png')} style={st.lockLogo} resizeMode="contain" />
      <Text style={st.lockTitle}>Mallatex Campo</Text>
      <Text style={st.lockSub}>Sesión bloqueada</Text>
      <TouchableOpacity style={st.primaryBtn} onPress={unlock}><Text style={st.primaryBtnTxt}>Desbloquear con {bioName}</Text></TouchableOpacity>
      <TouchableOpacity onPress={logout}><Text style={st.link}>Usar otra cuenta</Text></TouchableOpacity>
    </View>
  );

  if (!authed) return (<><StatusBar style="dark" /><LoginScreen onLoggedIn={onLoggedIn} /></>);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar style="dark" />
      {/* Header con logo + menú */}
      <View style={st.header}>
        <TouchableOpacity onPress={() => setMenuOpen(true)} style={st.hamburger}><Text style={st.hamburgerTxt}>☰</Text></TouchableOpacity>
        <Image source={require('./assets/logo-word.png')} style={st.headerLogo} resizeMode="contain" />
        <TouchableOpacity style={st.avatarBtn} onPress={() => go('perfil')}>
          <Text style={st.avatarTxt}>{(profile?.employee?.name || '?').split(' ').slice(0, 2).map((s) => s[0]).join('').toUpperCase()}</Text>
        </TouchableOpacity>
      </View>
      <View style={st.subbar}><Text style={st.subbarTxt}>{titleOf(screen)}</Text></View>

      <View style={{ flex: 1 }}>
        {screen === 'ruta' && <RouteScreen onGoVisit={() => go('visita')} />}
        {screen === 'clientes' && <ClientsScreen />}
        {screen === 'visita' && <VisitScreen />}
        {screen === 'desempeno' && <PerformanceScreen />}
        {screen === 'asistencia' && <CheckinScreen profile={profile} onQueued={() => setQueueVersion((v) => v + 1)} />}
        {screen === 'perfil' && <ProfileScreen profile={profile} onLogout={logout} />}
        {screen === 'inventario' && <ComingSoonScreen title="Inventario" icon="📦" />}
        {screen === 'cotizador' && <ComingSoonScreen title="Cotizador" icon="🧮" />}
        {screen === 'pedidos' && <ComingSoonScreen title="Pedidos" icon="🛒" />}
        {screen === 'bot' && <ComingSoonScreen title="Asistente técnico" icon="🤖" />}
        {screen === 'viaticos' && <ComingSoonScreen title="Viáticos" icon="✈️" />}
        {screen === 'gastos' && <ComingSoonScreen title="Gastos" icon="🧾" />}
        {screen === 'facturas' && <ComingSoonScreen title="Facturas" icon="📑" />}
      </View>

      {/* Menú lateral (drawer) */}
      <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
        <Pressable style={st.backdrop} onPress={() => setMenuOpen(false)}>
          <Pressable style={st.drawer} onPress={() => {}}>
            <View style={st.drawerHead}>
              <Image source={require('./assets/logo-iso.png')} style={st.drawerLogo} resizeMode="contain" />
              <Text style={st.drawerName}>{profile?.employee?.name}</Text>
              <Text style={st.drawerSub}>{profile?.employee?.code} · {profile?.employee?.department}</Text>
            </View>
            <ScrollView>
              {GROUPS.map((group) => (
                <View key={group}>
                  <Text style={st.group}>{group}</Text>
                  {MENU.filter((m) => m.group === group).map((m) => (
                    <TouchableOpacity key={m.key} style={[st.item, screen === m.key && st.itemOn]} onPress={() => go(m.key)} disabled={false}>
                      <Text style={st.itemIcon}>{m.icon}</Text>
                      <Text style={[st.itemLabel, screen === m.key && st.itemLabelOn, m.soon && st.itemSoon]}>{m.label}</Text>
                      {m.soon && <Text style={st.soonTag}>pronto</Text>}
                    </TouchableOpacity>
                  ))}
                </View>
              ))}
            </ScrollView>
            <TouchableOpacity style={st.logout} onPress={logout}><Text style={st.logoutTxt}>Cerrar sesión</Text></TouchableOpacity>
            <Text style={st.foot}>v1.0.0 · powered by Evorgyn</Text>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  header: { backgroundColor: colors.white, paddingHorizontal: 12, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: colors.lightGray },
  hamburger: { padding: 6, width: 40 },
  hamburgerTxt: { fontSize: 24, color: colors.black },
  headerLogo: { flex: 1, height: 30 },
  avatarBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.red, alignItems: 'center', justifyContent: 'center' },
  avatarTxt: { color: '#fff', fontWeight: '800', fontSize: 13 },
  subbar: { backgroundColor: colors.white, paddingHorizontal: 18, paddingBottom: 12 },
  subbarTxt: { color: colors.black, fontSize: 18, fontWeight: '800' },
  // drawer
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', flexDirection: 'row' },
  drawer: { width: '80%', maxWidth: 320, backgroundColor: colors.white, flex: 1, paddingTop: 44 },
  drawerHead: { paddingHorizontal: 18, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: colors.bg },
  drawerLogo: { width: 46, height: 46, marginBottom: 8 },
  drawerName: { fontSize: 17, fontWeight: '800', color: colors.black },
  drawerSub: { color: colors.gray, marginTop: 2, fontSize: 12 },
  group: { color: colors.gray, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, paddingHorizontal: 18, paddingTop: 16, paddingBottom: 4 },
  item: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, paddingHorizontal: 18 },
  itemOn: { backgroundColor: '#fdecec', borderRightWidth: 3, borderRightColor: colors.red },
  itemIcon: { fontSize: 18, width: 30 },
  itemLabel: { fontSize: 15, color: colors.black, fontWeight: '600' },
  itemLabelOn: { color: colors.red },
  itemSoon: { color: colors.gray, fontWeight: '500' },
  soonTag: { marginLeft: 'auto', fontSize: 10, color: colors.gray, backgroundColor: colors.bg, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, overflow: 'hidden' },
  logout: { margin: 16, borderWidth: 1, borderColor: colors.red, borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  logoutTxt: { color: colors.red, fontWeight: '700' },
  foot: { textAlign: 'center', color: colors.gray, fontSize: 11, marginBottom: 18 },
  // lock
  lock: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', padding: 30 },
  lockLogo: { width: 96, height: 96, marginBottom: 16 },
  lockTitle: { fontSize: 22, fontWeight: '800', color: colors.black },
  lockSub: { color: colors.gray, marginTop: 4, marginBottom: 28 },
  primaryBtn: { backgroundColor: colors.red, borderRadius: 12, paddingVertical: 15, paddingHorizontal: 30, alignItems: 'center' },
  primaryBtnTxt: { color: '#fff', fontWeight: '700', fontSize: 16 },
  link: { color: colors.red, marginTop: 18, fontWeight: '600' },
});
