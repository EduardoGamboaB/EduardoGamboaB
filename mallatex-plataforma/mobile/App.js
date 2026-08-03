import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ActivityIndicator, Alert, Modal, Pressable, Image, ScrollView, BackHandler } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { colors } from './src/theme';
import { api } from './src/api';
import { getToken, setToken, getQueue, saveQueue, getBiometricEnabled, setBiometricEnabled } from './src/storage';
import { biometricAvailable, biometricLabel, biometricAuthenticate } from './src/biometrics';
import { flushTrackBuffer } from './src/tracking';
import LoginScreen from './src/screens/LoginScreen';
import CheckinScreen from './src/screens/CheckinScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import ClientsScreen from './src/screens/ClientsScreen';
import VisitScreen from './src/screens/VisitScreen';
import RouteScreen from './src/screens/RouteScreen';
import PerformanceScreen from './src/screens/PerformanceScreen';
import InventoryScreen from './src/screens/InventoryScreen';
import QuoteScreen from './src/screens/QuoteScreen';
import OrdersScreen from './src/screens/OrdersScreen';
import BotScreen from './src/screens/BotScreen';
import ViaticosScreen from './src/screens/ViaticosScreen';
import GastosScreen from './src/screens/GastosScreen';
import FacturasScreen from './src/screens/FacturasScreen';
import MaterialScreen from './src/screens/MaterialScreen';
import MesTabletScreen from './src/screens/MesTabletScreen';
import MesProduccionScreen from './src/screens/MesProduccionScreen';
import MesMermasScreen from './src/screens/MesMermasScreen';

// Menú extensible: agregar un módulo nuevo = una entrada aquí + su pantalla.
// Las claves coinciden con el catálogo de módulos del backend; el perfil del colaborador
// (profile.modules) decide cuáles se muestran. Los módulos MES solo aparecen para el perfil "línea".
// Menú agrupado por área: la jornada del colaborador (asistencia) va primero,
// después su labor principal (Ventas / Producción), herramientas de apoyo y
// lo administrativo. El backend filtra por perfil (allowedMenu).
const MENU = [
  { key: 'asistencia', label: 'Mi asistencia', icon: '📍', group: 'Mi jornada' },
  { key: 'historial', label: 'Historial', icon: '🗂️', group: 'Mi jornada' },
  { key: 'ruta', label: 'Ruta de visitas', icon: '🧭', group: 'Ventas' },
  { key: 'clientes', label: 'Mis clientes', icon: '👥', group: 'Ventas' },
  { key: 'visita', label: 'Registrar visita', icon: '📋', group: 'Ventas' },
  { key: 'desempeno', label: 'Mi desempeño', icon: '🎯', group: 'Ventas' },
  { key: 'mes-tablet', label: 'Tablet de línea', icon: '🏭', group: 'Producción (MES)' },
  { key: 'mes-produccion-movil', label: 'Producción', icon: '📊', group: 'Producción (MES)' },
  { key: 'mes-mermas', label: 'Reportar merma', icon: '🗑️', group: 'Producción (MES)' },
  { key: 'material', label: 'Material de venta', icon: '🎨', group: 'Herramientas' },
  { key: 'inventario', label: 'Inventario', icon: '📦', group: 'Herramientas' },
  { key: 'cotizador', label: 'Cotizador', icon: '🧮', group: 'Herramientas' },
  { key: 'pedidos', label: 'Pedidos', icon: '🛒', group: 'Herramientas' },
  { key: 'bot', label: 'Asesor técnico', icon: '🤖', group: 'Herramientas' },
  { key: 'viaticos', label: 'Viáticos', icon: '✈️', group: 'Administración' },
  { key: 'gastos', label: 'Gastos', icon: '🧾', group: 'Administración' },
  { key: 'facturas', label: 'Facturas', icon: '📑', group: 'Administración' },
  { key: 'perfil', label: 'Mi perfil', icon: '👤', group: 'Cuenta' },
];
const GROUPS = ['Mi jornada', 'Ventas', 'Producción (MES)', 'Herramientas', 'Administración', 'Cuenta'];
const titleOf = (key) => (MENU.find((m) => m.key === key) || {}).label || 'Mallatex Ventas';
// El menú lo dicta el backend (perfil del colaborador). Si no llega la lista, se muestra todo.
const allowedMenu = (modules) => (modules ? MENU.filter((m) => modules.includes(m.key)) : MENU);

export default function App() {
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState(false);
  const [locked, setLocked] = useState(false);
  const [profile, setProfile] = useState(null);
  const [screen, setScreen] = useState('ruta');
  const [menuOpen, setMenuOpen] = useState(false);
  const [queueVersion, setQueueVersion] = useState(0);
  const [bioName, setBioName] = useState('biometría');
  const [unlockFailed, setUnlockFailed] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [mktUnseen, setMktUnseen] = useState(0); // publicaciones de marketing sin ver (badge del menú)

  const modules = profile?.modules || null;
  const menu = allowedMenu(modules);
  // Pantalla efectiva: nunca renderiza un módulo no permitido para el perfil.
  const activeScreen = modules && !modules.includes(screen) ? (menu[0]?.key || 'perfil') : screen;

  // Conteo de publicaciones nuevas de "Material de venta"; falla en silencio (es solo el badge).
  const refreshMktUnseen = useCallback(() => {
    api.mktUnseenCount().then((r) => setMktUnseen(r?.count || 0)).catch(() => {});
  }, []);

  const loadProfile = useCallback(async () => {
    try { const me = await api.me(); setProfile(me); setAuthed(true); setSessionExpired(false); refreshMktUnseen(); return true; }
    catch (e) { if (e.status === 401) { await setToken(null); setAuthed(false); setSessionExpired(true); } return false; }
  }, [refreshMktUnseen]);

  const unlock = useCallback(async () => {
    const ok = await biometricAuthenticate(`Desbloquea Mallatex Campo con ${bioName}`);
    if (ok) { setUnlockFailed(false); setLocked(false); await loadProfile(); }
    else setUnlockFailed(true);
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
      try {
        if (item.kind === 'visit') await api.createVisit(item);
        else if (item.kind === 'client') await api.createProspect(item.payload ?? item);
        else if (item.kind === 'merma') await api.mesReportMerma(item.payload ?? item);
        else if (item.kind === 'mes-alert') await api.mesReportAlert(item.payload ?? item);
        else if (item.kind === 'mes-avance') await api.mesReportAvance(item.payload ?? item);
        else await api.checkin(item);
        sent++;
      }
      catch (e) { if (e.offline) remaining.push(item); }
    }
    await saveQueue(remaining); setQueueVersion((v) => v + 1);
    if (!silent) Alert.alert('Sincronización', `${sent} enviado(s), ${remaining.length} pendiente(s).`);
  }, []);

  useEffect(() => { if (authed) { flushQueue(true); flushTrackBuffer(); } }, [authed, flushQueue]);

  // Botón "atrás" de Android: cierra el menú lateral, o regresa a la pantalla inicial
  // del perfil; en la pantalla inicial deja que el sistema cierre la app.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (menuOpen) { setMenuOpen(false); return true; }
      const home = menu[0]?.key || 'perfil';
      if (authed && activeScreen !== home) { setScreen(home); return true; }
      return false;
    });
    return () => sub.remove();
  }, [menuOpen, activeScreen, authed, menu]);

  // Si la pantalla actual no está permitida para el perfil, salta a la primera disponible.
  useEffect(() => {
    if (profile && modules && !modules.includes(screen)) setScreen(menu[0]?.key || 'perfil');
  }, [profile]); // eslint-disable-line react-hooks/exhaustive-deps

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
  function confirmLogout() {
    Alert.alert('Cerrar sesión', '¿Salir de tu cuenta?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Salir', style: 'destructive', onPress: logout },
    ]);
  }
  function go(key) { setMenuOpen(false); if (key !== screen) setScreen(key); }

  if (loading) return <View style={[st.center, { flex: 1, backgroundColor: colors.bg }]}><ActivityIndicator color={colors.red} size="large" /></View>;

  if (locked) return (
    <View style={st.lock}>
      <StatusBar style="dark" />
      <Image source={require('./assets/logo-iso.png')} style={st.lockLogo} resizeMode="contain" />
      <Text style={st.lockTitle}>Mallatex Campo</Text>
      <Text style={st.lockSub}>Sesión bloqueada</Text>
      <TouchableOpacity style={st.primaryBtn} onPress={unlock}><Text style={st.primaryBtnTxt}>Desbloquear con {bioName}</Text></TouchableOpacity>
      {unlockFailed && <Text style={st.lockError}>No se reconoció. Intenta de nuevo.</Text>}
      <TouchableOpacity onPress={logout} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}><Text style={st.link}>Usar otra cuenta</Text></TouchableOpacity>
    </View>
  );

  if (!authed) return (<><StatusBar style="dark" /><LoginScreen onLoggedIn={onLoggedIn} sessionExpired={sessionExpired} /></>);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar style="dark" />
      {/* Header con logo + menú */}
      <View style={st.header}>
        <TouchableOpacity onPress={() => { refreshMktUnseen(); setMenuOpen(true); }} style={st.hamburger} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityRole="button" accessibilityLabel="Abrir menú"><Text style={st.hamburgerTxt}>☰</Text></TouchableOpacity>
        <Image source={require('./assets/logo-word.png')} style={st.headerLogo} resizeMode="contain" />
        <TouchableOpacity style={st.avatarBtn} onPress={() => go('perfil')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityRole="button" accessibilityLabel="Ir a mi perfil">
          <Text style={st.avatarTxt}>{(profile?.employee?.name || '?').split(' ').slice(0, 2).map((s) => s[0]).join('').toUpperCase()}</Text>
        </TouchableOpacity>
      </View>
      <View style={st.subbar}><Text style={st.subbarTxt}>{titleOf(activeScreen)}</Text></View>

      <View style={{ flex: 1 }}>
        {activeScreen === 'ruta' && <RouteScreen onGoVisit={() => go('visita')} />}
        {activeScreen === 'clientes' && <ClientsScreen />}
        {activeScreen === 'visita' && <VisitScreen />}
        {activeScreen === 'desempeno' && <PerformanceScreen />}
        {activeScreen === 'asistencia' && <CheckinScreen profile={profile} onQueued={() => setQueueVersion((v) => v + 1)} />}
        {activeScreen === 'historial' && <HistoryScreen queueVersion={queueVersion} onSync={() => flushQueue(false)} />}
        {activeScreen === 'perfil' && <ProfileScreen profile={profile} onLogout={logout} />}
        {activeScreen === 'material' && <MaterialScreen onSeen={() => setMktUnseen(0)} />}
        {activeScreen === 'inventario' && <InventoryScreen />}
        {activeScreen === 'cotizador' && <QuoteScreen />}
        {activeScreen === 'pedidos' && <OrdersScreen />}
        {activeScreen === 'bot' && <BotScreen />}
        {activeScreen === 'viaticos' && <ViaticosScreen />}
        {activeScreen === 'gastos' && <GastosScreen />}
        {activeScreen === 'facturas' && <FacturasScreen />}
        {activeScreen === 'mes-tablet' && <MesTabletScreen />}
        {activeScreen === 'mes-produccion-movil' && <MesProduccionScreen />}
        {activeScreen === 'mes-mermas' && <MesMermasScreen />}
      </View>

      {/* Menú lateral (drawer) */}
      <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
        <Pressable style={st.backdrop} onPress={() => setMenuOpen(false)}>
          <Pressable style={st.drawer} onPress={() => {}}>
            <View style={st.drawerHead}>
              <View style={st.drawerHeadTop}>
                <Image source={require('./assets/logo-iso.png')} style={st.drawerLogo} resizeMode="contain" />
                <TouchableOpacity onPress={() => setMenuOpen(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityRole="button" accessibilityLabel="Cerrar menú">
                  <Text style={st.drawerClose}>✕</Text>
                </TouchableOpacity>
              </View>
              <Text style={st.drawerName}>{profile?.employee?.name}</Text>
              <Text style={st.drawerSub}>{profile?.employee?.code} · {profile?.employee?.department}</Text>
            </View>
            <ScrollView>
              {GROUPS.map((group) => {
                const items = menu.filter((m) => m.group === group);
                if (!items.length) return null;
                return (
                  <View key={group}>
                    <Text style={st.group}>{group}</Text>
                    {items.map((m) => (
                      <TouchableOpacity key={m.key} style={[st.item, activeScreen === m.key && st.itemOn]} onPress={() => go(m.key)}>
                        <Text style={st.itemIcon}>{m.icon}</Text>
                        <Text style={[st.itemLabel, activeScreen === m.key && st.itemLabelOn]}>{m.label}</Text>
                        {m.key === 'material' && mktUnseen > 0 && (
                          <View style={st.newWrap} accessibilityLabel={`${mktUnseen} publicaciones nuevas`}>
                            <View style={st.newDot} />
                            <View style={st.newChip}><Text style={st.newChipTxt}>{mktUnseen > 99 ? '99+' : mktUnseen}</Text></View>
                          </View>
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                );
              })}
            </ScrollView>
            <TouchableOpacity style={st.logout} onPress={confirmLogout}><Text style={st.logoutTxt}>Cerrar sesión</Text></TouchableOpacity>
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
  drawerHeadTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  drawerClose: { fontSize: 20, color: colors.gray, padding: 4 },
  drawerLogo: { width: 46, height: 46, marginBottom: 8 },
  drawerName: { fontSize: 17, fontWeight: '800', color: colors.black },
  drawerSub: { color: colors.gray, marginTop: 2, fontSize: 12 },
  group: { color: colors.gray, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, paddingHorizontal: 18, paddingTop: 16, paddingBottom: 4 },
  item: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, paddingHorizontal: 18 },
  itemOn: { backgroundColor: '#fdecec', borderRightWidth: 3, borderRightColor: colors.red },
  itemIcon: { fontSize: 18, width: 30 },
  itemLabel: { fontSize: 15, color: colors.black, fontWeight: '600' },
  itemLabelOn: { color: colors.red },
  // badge de contenido nuevo (Material de venta)
  newWrap: { marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 5 },
  newDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.red },
  newChip: { backgroundColor: colors.red, borderRadius: 10, minWidth: 20, height: 20, paddingHorizontal: 6, alignItems: 'center', justifyContent: 'center' },
  newChipTxt: { color: '#fff', fontSize: 11, fontWeight: '800' },
  logout: { margin: 16, borderWidth: 1, borderColor: colors.red, borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  logoutTxt: { color: colors.red, fontWeight: '700' },
  foot: { textAlign: 'center', color: colors.gray, fontSize: 12, marginBottom: 18 },
  // lock
  lock: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', padding: 30 },
  lockLogo: { width: 96, height: 96, marginBottom: 16 },
  lockTitle: { fontSize: 22, fontWeight: '800', color: colors.black },
  lockSub: { color: colors.gray, marginTop: 4, marginBottom: 28 },
  primaryBtn: { backgroundColor: colors.red, borderRadius: 12, paddingVertical: 15, paddingHorizontal: 30, alignItems: 'center' },
  primaryBtnTxt: { color: '#fff', fontWeight: '700', fontSize: 16 },
  lockError: { color: colors.err, marginTop: 14, fontWeight: '600' },
  link: { color: colors.red, marginTop: 18, fontWeight: '600' },
});
