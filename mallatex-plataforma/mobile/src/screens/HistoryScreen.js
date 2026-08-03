import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native';
import { colors } from '../theme';
import { api } from '../api';
import { getQueue } from '../storage';

export default function HistoryScreen({ onSync, queueVersion }) {
  const [items, setItems] = useState([]);
  const [queue, setQueue] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    try { setItems(await api.checkins()); } catch {}
    setQueue(await getQueue());
    setRefreshing(false);
  }, []);

  useEffect(() => { load(); }, [load, queueVersion]);

  const fmt = (ts) => new Date(ts).toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

  return (
    <View style={{ flex: 1 }}>
      {queue.length > 0 && (
        <TouchableOpacity style={st.syncBar} onPress={onSync}>
          <Text style={st.syncTxt}>⏳ {queue.length} registro(s) sin enviar · toca para sincronizar</Text>
        </TouchableOpacity>
      )}
      <FlatList
        data={items}
        keyExtractor={(it) => String(it.id)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} />}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={<Text style={st.empty}>Aún no hay registros de campo.</Text>}
        renderItem={({ item }) => (
          <View style={st.card}>
            <View style={{ flex: 1 }}>
              <Text style={st.type}>{item.type === 'salida' ? 'Salida' : 'Entrada'}{item.offline ? ' · offline' : ''}</Text>
              <Text style={st.meta}>{fmt(item.timestamp)}{item.siteName ? ' · ' + item.siteName : ''}</Text>
            </View>
            <View style={st.tags}>
              {item.withinGeofence === true && <Text style={[st.tag, { color: colors.ok }]}>● en sitio</Text>}
              {item.withinGeofence === false && <Text style={[st.tag, { color: colors.err }]}>● fuera{item.distanceMeters != null ? ' ' + item.distanceMeters + 'm' : ''}</Text>}
              {item.faceVerified === true && <Text style={[st.tag, { color: colors.ok }]}>rostro ✓</Text>}
            </View>
          </View>
        )}
      />
    </View>
  );
}

const st = StyleSheet.create({
  syncBar: { backgroundColor: '#fff7e6', padding: 12, borderBottomWidth: 1, borderBottomColor: colors.lightGray },
  syncTxt: { color: '#92400E', fontWeight: '600', textAlign: 'center' },
  card: { flexDirection: 'row', backgroundColor: colors.white, borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: colors.lightGray, alignItems: 'center' },
  type: { fontWeight: '700', color: colors.black },
  meta: { color: colors.gray, marginTop: 2, fontSize: 12 },
  tags: { alignItems: 'flex-end' },
  tag: { fontSize: 12, fontWeight: '600', marginBottom: 2 },
  empty: { textAlign: 'center', color: colors.gray, marginTop: 40 },
});
