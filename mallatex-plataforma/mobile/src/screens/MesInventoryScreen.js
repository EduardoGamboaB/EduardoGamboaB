// Inventario físico desde la tablet: iniciar/continuar un conteo (folio CTF),
// capturar la cantidad contada por SKU (se compara contra el teórico del kardex)
// y cerrar el conteo (genera los ajustes). La sincronización con el SAE se hace
// desde el MES web (jefe de almacén).
import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, FlatList, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { colors } from '../theme';
import { api } from '../api';

const num = (v) => Number(v || 0).toLocaleString('es-MX', { maximumFractionDigits: 3 });
const ESTADO = {
  abierto: { l: 'Abierto', c: colors.warn },
  cerrado: { l: 'Cerrado', c: '#2563eb' },
  sincronizado: { l: 'Sincronizado', c: colors.ok },
  error: { l: 'Error SAE', c: colors.red },
};

export default function MesInventoryScreen() {
  const [count, setCount] = useState(null); // conteo activo (detalle) o null = lista
  if (count) return <CountView count={count} onBack={() => setCount(null)} />;
  return <CountsList onOpen={setCount} />;
}

// ------------------------- Lista de conteos -------------------------
function CountsList({ onOpen }) {
  const [items, setItems] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [firstLoad, setFirstLoad] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    try { setItems(await api.mesInvCounts()); setLoadError(false); } catch { setLoadError(true); }
    setRefreshing(false); setFirstLoad(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function nuevo() {
    setBusy(true);
    try {
      const c = await api.mesInvStartCount({ ubicacion: 'Almacén' });
      const full = await api.mesInvCount(c.id);
      onOpen(full);
    } catch (e) { Alert.alert('No se pudo iniciar', e.offline ? 'Sin conexión con el servidor.' : e.message); }
    finally { setBusy(false); }
  }

  return (
    <View style={{ flex: 1 }}>
      <View style={st.introBox}><Text style={st.introTxt}>📋 Conteo físico de inventario. Inicia un conteo, captura lo que hay en piso por SKU y ciérralo; los ajustes viajan al MES y de ahí al SAE.</Text></View>
      {loadError && <TouchableOpacity style={st.errBanner} onPress={load}><Text style={st.errBannerTxt}>Sin conexión · toca para reintentar</Text></TouchableOpacity>}
      <FlatList
        data={items}
        keyExtractor={(it) => String(it.id)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} />}
        contentContainerStyle={{ padding: 14, paddingBottom: 90 }}
        ListEmptyComponent={firstLoad ? <ActivityIndicator style={{ marginTop: 40 }} color={colors.red} /> : (loadError ? null : <Text style={st.empty}>Sin conteos. Inicia uno con “＋ Nuevo conteo”.</Text>)}
        renderItem={({ item }) => {
          const s = ESTADO[item.estado] || { l: item.estado, c: colors.gray };
          return (
            <TouchableOpacity style={st.card} onPress={async () => { try { onOpen(await api.mesInvCount(item.id)); } catch (e) { Alert.alert('Error', e.message); } }}>
              <View style={st.rowTop}>
                <Text style={st.folio}>{item.folio || 'CTF'}</Text>
                <View style={[st.tag, { backgroundColor: s.c + '22' }]}><Text style={[st.tagTxt, { color: s.c }]}>{s.l}</Text></View>
              </View>
              <Text style={st.cardTitle}>{item.ubicacion || 'Almacén'}</Text>
              <Text style={st.metaSmall}>{item.createdAt ? new Date(item.createdAt).toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}</Text>
            </TouchableOpacity>
          );
        }}
      />
      <TouchableOpacity style={[st.fab, busy && { opacity: 0.6 }]} onPress={nuevo} disabled={busy} accessibilityRole="button" accessibilityLabel="Nuevo conteo">
        {busy ? <ActivityIndicator color="#fff" /> : <Text style={st.fabTxt}>＋ Nuevo conteo</Text>}
      </TouchableOpacity>
    </View>
  );
}

// ------------------------- Conteo activo -------------------------
function CountView({ count, onBack }) {
  const [c, setC] = useState(count);
  const [q, setQ] = useState('');
  const [items, setItems] = useState([]);
  const [sel, setSel] = useState(null); // artículo seleccionado para capturar
  const [contado, setContado] = useState('');
  const [busy, setBusy] = useState(false);
  const cerrado = c.estado !== 'abierto';
  const lineBySku = Object.fromEntries((c.lines || []).map((l) => [l.sku, l]));

  const search = useCallback(async (text) => {
    try { setItems(await api.mesInvItems(text)); } catch {}
  }, []);
  useEffect(() => { search(''); }, [search]);

  async function refresh() {
    try { setC(await api.mesInvCount(c.id)); } catch {}
  }

  async function capturar() {
    const val = Number(String(contado).replace(',', '.'));
    if (!Number.isFinite(val) || val < 0) { Alert.alert('Cantidad inválida', 'Escribe la cantidad contada.'); return; }
    setBusy(true);
    try {
      await api.mesInvCaptureLine(c.id, { sku: sel.sku, contado: val });
      setSel(null); setContado('');
      await refresh();
    } catch (e) { Alert.alert('No se pudo capturar', e.offline ? 'Sin conexión.' : e.message); }
    finally { setBusy(false); }
  }

  async function cerrar() {
    Alert.alert('Cerrar conteo', 'Se generarán los ajustes de las diferencias. ¿Continuar?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Cerrar', style: 'destructive', onPress: async () => {
        setBusy(true);
        try { const r = await api.mesInvCloseCount(c.id); setC(r); Alert.alert('Conteo cerrado', `${r.resumen?.conDiferencia || 0} artículo(s) con diferencia. Sincroniza desde el MES web.`); }
        catch (e) { Alert.alert('No se pudo cerrar', e.message); }
        finally { setBusy(false); }
      } },
    ]);
  }

  const s = ESTADO[c.estado] || { l: c.estado, c: colors.gray };

  return (
    <View style={{ flex: 1 }}>
      <View style={st.head}>
        <TouchableOpacity onPress={onBack} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}><Text style={st.back}>‹ Conteos</Text></TouchableOpacity>
        <View style={st.rowTop}>
          <Text style={st.folioBig}>{c.folio}</Text>
          <View style={[st.tag, { backgroundColor: s.c + '22' }]}><Text style={[st.tagTxt, { color: s.c }]}>{s.l}</Text></View>
        </View>
        <Text style={st.metaSmall}>{c.ubicacion} · {(c.lines || []).length} capturado(s) · {c.resumen?.conDiferencia || 0} con diferencia</Text>
      </View>

      {!cerrado && (
        <View style={st.searchWrap}>
          <TextInput style={st.search} value={q} onChangeText={(t) => { setQ(t); search(t); }} placeholder="Buscar SKU o descripción…" placeholderTextColor={colors.gray} returnKeyType="search" />
        </View>
      )}

      {sel && (
        <View style={st.capture}>
          <Text style={st.capTitle}>{sel.sku} · {sel.descripcion}</Text>
          <Text style={st.metaSmall}>Teórico (sistema): {num(sel.existencia)} {sel.unidad}</Text>
          <View style={st.capRow}>
            <TextInput style={st.capInput} value={contado} onChangeText={setContado} keyboardType="numeric" placeholder="Contado" placeholderTextColor={colors.gray} autoFocus />
            <TouchableOpacity style={[st.capBtn, busy && { opacity: 0.6 }]} onPress={capturar} disabled={busy}>{busy ? <ActivityIndicator color="#fff" /> : <Text style={st.capBtnTxt}>Guardar</Text>}</TouchableOpacity>
            <TouchableOpacity style={st.capCancel} onPress={() => { setSel(null); setContado(''); }}><Text style={st.capCancelTxt}>✕</Text></TouchableOpacity>
          </View>
        </View>
      )}

      <FlatList
        data={cerrado ? (c.lines || []) : items}
        keyExtractor={(it) => String(it.id ?? it.sku)}
        contentContainerStyle={{ padding: 14, paddingBottom: cerrado ? 90 : 14 }}
        ListEmptyComponent={<Text style={st.empty}>{cerrado ? 'Sin renglones.' : 'Sin artículos.'}</Text>}
        renderItem={({ item }) => {
          if (cerrado) {
            const dif = Number(item.diferencia);
            return (
              <View style={st.line}>
                <View style={{ flex: 1 }}><Text style={st.lineSku}>{item.sku}</Text><Text style={st.metaSmall}>Teórico {num(item.teorico)} · Contado {num(item.contado)}</Text></View>
                <Text style={[st.dif, { color: dif === 0 ? colors.gray : colors.red }]}>{dif > 0 ? '+' : ''}{num(item.diferencia)}</Text>
              </View>
            );
          }
          const l = lineBySku[item.sku];
          return (
            <TouchableOpacity style={st.line} onPress={() => { setSel(item); setContado(l ? String(l.contado) : ''); }}>
              <View style={{ flex: 1 }}>
                <Text style={st.lineSku}>{item.sku}</Text>
                <Text style={st.metaSmall} numberOfLines={1}>{item.descripcion} · sistema {num(item.existencia)} {item.unidad}</Text>
              </View>
              {l ? (
                <View style={[st.tag, { backgroundColor: (Number(l.diferencia) === 0 ? colors.ok : colors.red) + '22' }]}>
                  <Text style={[st.tagTxt, { color: Number(l.diferencia) === 0 ? colors.ok : colors.red }]}>{num(l.contado)} ({Number(l.diferencia) > 0 ? '+' : ''}{num(l.diferencia)})</Text>
                </View>
              ) : <Text style={st.contar}>Contar ›</Text>}
            </TouchableOpacity>
          );
        }}
      />

      {!cerrado && (
        <TouchableOpacity style={[st.fab, busy && { opacity: 0.6 }]} onPress={cerrar} disabled={busy || (c.lines || []).length === 0}>
          <Text style={st.fabTxt}>Cerrar conteo</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const st = StyleSheet.create({
  introBox: { backgroundColor: '#eef4ff', paddingHorizontal: 14, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: colors.lightGray },
  introTxt: { color: '#1e40af', fontSize: 12, lineHeight: 17 },
  errBanner: { backgroundColor: '#fff7e6', paddingVertical: 12, paddingHorizontal: 14 },
  errBannerTxt: { color: '#92400E', textAlign: 'center', fontSize: 12, fontWeight: '600' },
  empty: { textAlign: 'center', color: colors.gray, marginTop: 40, paddingHorizontal: 20 },
  card: { backgroundColor: colors.white, borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: colors.lightGray },
  cardTitle: { fontWeight: '700', color: colors.black, fontSize: 15 },
  rowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  metaSmall: { color: colors.gray, marginTop: 3, fontSize: 12 },
  folio: { fontWeight: '800', color: colors.black },
  folioBig: { fontWeight: '800', color: colors.black, fontSize: 20 },
  tag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  tagTxt: { fontWeight: '700', fontSize: 12 },
  fab: { position: 'absolute', right: 18, left: 18, bottom: 20, backgroundColor: colors.red, borderRadius: 14, paddingVertical: 15, alignItems: 'center', elevation: 4 },
  fabTxt: { color: '#fff', fontWeight: '800', fontSize: 15 },
  head: { backgroundColor: colors.white, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.lightGray },
  back: { color: colors.red, fontWeight: '700', marginBottom: 8 },
  searchWrap: { backgroundColor: colors.white, paddingHorizontal: 14, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: colors.lightGray },
  search: { backgroundColor: colors.bg, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: colors.black, marginTop: 10 },
  line: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: colors.lightGray },
  lineSku: { fontWeight: '700', color: colors.black, fontSize: 14 },
  contar: { color: colors.red, fontWeight: '700', fontSize: 13 },
  dif: { fontWeight: '800', fontSize: 16 },
  capture: { backgroundColor: '#fff', margin: 14, marginBottom: 0, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: colors.red },
  capTitle: { fontWeight: '800', color: colors.black, fontSize: 14 },
  capRow: { flexDirection: 'row', gap: 8, marginTop: 10, alignItems: 'center' },
  capInput: { flex: 1, borderWidth: 1, borderColor: colors.lightGray, borderRadius: 10, padding: 12, color: colors.black, fontSize: 16 },
  capBtn: { backgroundColor: colors.red, borderRadius: 10, paddingHorizontal: 18, paddingVertical: 12 },
  capBtnTxt: { color: '#fff', fontWeight: '800' },
  capCancel: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  capCancelTxt: { color: colors.gray, fontSize: 18, fontWeight: '800' },
});
