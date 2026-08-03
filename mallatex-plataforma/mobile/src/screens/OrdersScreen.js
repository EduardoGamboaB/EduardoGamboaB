import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl, Alert, ActivityIndicator } from 'react-native';
import { colors } from '../theme';
import { api } from '../api';

const money = (n) => '$' + Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const ORDER_STATUS = { pendiente: { l: 'Pendiente', c: colors.warn }, confirmado: { l: 'Confirmado', c: '#2563eb' }, entregado: { l: 'Entregado', c: colors.ok } };
const QUOTE_STATUS = { abierta: { l: 'Abierta', c: colors.warn }, convertida: { l: 'Convertida', c: colors.ok } };

export default function OrdersScreen() {
  const [tab, setTab] = useState('pedidos');
  const [orders, setOrders] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [firstLoad, setFirstLoad] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [converting, setConverting] = useState(null); // id de cotización en conversión

  const load = useCallback(async () => {
    setRefreshing(true);
    let err = false;
    try { setOrders(await api.orders()); } catch { err = true; }
    try { setQuotes(await api.quotes()); } catch { err = true; }
    setLoadError(err);
    setRefreshing(false); setFirstLoad(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function doConvert(q) {
    setConverting(q.id);
    try {
      const r = await api.createOrder({ quoteId: q.id });
      Alert.alert('Pedido levantado', r.folio || '');
      load();
    } catch (e) { Alert.alert('No se pudo convertir', e.message); }
    finally { setConverting(null); }
  }

  function convert(q) {
    Alert.alert('Levantar pedido', `¿Convertir ${q.folio} en pedido?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Levantar', onPress: () => doConvert(q) },
    ]);
  }

  const data = tab === 'pedidos' ? orders : quotes;

  return (
    <View style={{ flex: 1 }}>
      <View style={st.tabs}>
        {[['pedidos', 'Pedidos'], ['cotizaciones', 'Cotizaciones']].map(([k, l]) => (
          <TouchableOpacity key={k} style={[st.tab, tab === k && st.tabOn]} onPress={() => setTab(k)}><Text style={[st.tabTxt, tab === k && st.tabTxtOn]}>{l}</Text></TouchableOpacity>
        ))}
      </View>
      {loadError && <View style={st.errBanner}><Text style={st.errBannerTxt}>Sin conexión · desliza para reintentar</Text></View>}
      <FlatList
        data={data}
        keyExtractor={(it) => String(it.id)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} />}
        contentContainerStyle={{ padding: 14 }}
        ListEmptyComponent={firstLoad
          ? <ActivityIndicator style={{ marginTop: 40 }} color={colors.red} />
          : (loadError ? null : <Text style={st.empty}>{tab === 'pedidos' ? 'Aún no has levantado pedidos.' : 'Aún no tienes cotizaciones.'}</Text>)}
        renderItem={({ item }) => {
          const s = tab === 'pedidos' ? (ORDER_STATUS[item.status] || {}) : (QUOTE_STATUS[item.status] || {});
          return (
            <View style={st.card}>
              <View style={st.rowTop}>
                <Text style={st.folio}>{item.folio}</Text>
                <View style={[st.tag, { backgroundColor: (s.c || colors.gray) + '22' }]}><Text style={[st.tagTxt, { color: s.c || colors.gray }]}>{s.l || item.status}</Text></View>
              </View>
              <Text style={st.client}>{item.clientName}</Text>
              <Text style={st.meta}>{(item.items || []).length} producto(s) · {new Date(item.createdAt).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })}</Text>
              <View style={st.rowTop}>
                <Text style={st.total}>{money(item.total)}</Text>
                {tab === 'cotizaciones' && item.status === 'abierta' && (
                  <TouchableOpacity style={[st.convert, converting != null && { opacity: 0.6 }]} onPress={() => convert(item)} disabled={converting != null}>
                    {converting === item.id ? <ActivityIndicator size="small" color={colors.red} /> : <Text style={st.convertTxt}>→ Pedido</Text>}
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}

const st = StyleSheet.create({
  tabs: { flexDirection: 'row', backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.lightGray },
  tab: { flex: 1, paddingVertical: 13, alignItems: 'center', borderBottomWidth: 3, borderBottomColor: 'transparent' },
  tabOn: { borderBottomColor: colors.red },
  tabTxt: { color: colors.gray, fontWeight: '700' }, tabTxtOn: { color: colors.red },
  card: { backgroundColor: colors.white, borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: colors.lightGray },
  rowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  folio: { fontWeight: '800', color: colors.black }, client: { color: colors.black, marginTop: 6, fontWeight: '600' },
  meta: { color: colors.gray, fontSize: 12, marginTop: 2 },
  total: { color: colors.red, fontWeight: '800', fontSize: 16, marginTop: 8 },
  tag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 }, tagTxt: { fontWeight: '700', fontSize: 12 },
  convert: { marginTop: 8, borderWidth: 1, borderColor: colors.red, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 12 },
  convertTxt: { color: colors.red, fontWeight: '700', fontSize: 12 },
  empty: { textAlign: 'center', color: colors.gray, marginTop: 40 },
  errBanner: { backgroundColor: '#fff7e6', paddingVertical: 10, paddingHorizontal: 14 },
  errBannerTxt: { color: '#92400E', textAlign: 'center', fontSize: 12, fontWeight: '600' },
});
