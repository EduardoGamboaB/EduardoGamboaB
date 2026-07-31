import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TextInput, RefreshControl } from 'react-native';
import { colors } from '../theme';
import { api } from '../api';

const money = (n) => '$' + Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function InventoryScreen() {
  const [items, setItems] = useState([]);
  const [q, setQ] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (query) => {
    setRefreshing(true);
    try { setItems(await api.products(query)); } catch {}
    setRefreshing(false);
  }, []);
  useEffect(() => { load(''); }, [load]);

  return (
    <View style={{ flex: 1 }}>
      <View style={st.searchWrap}>
        <TextInput style={st.search} value={q} onChangeText={setQ} onSubmitEditing={() => load(q)}
          placeholder="Buscar malla, SKU o categoría…" placeholderTextColor={colors.gray} returnKeyType="search" />
      </View>
      <FlatList
        data={items}
        keyExtractor={(it) => String(it.id)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(q)} />}
        contentContainerStyle={{ padding: 14 }}
        ListEmptyComponent={<Text style={st.empty}>Sin resultados.</Text>}
        renderItem={({ item }) => (
          <View style={st.card}>
            <View style={{ flex: 1 }}>
              <Text style={st.name}>{item.name}</Text>
              <Text style={st.meta}>{item.sku} · {item.category} · {item.specs}</Text>
              <Text style={[st.stock, { color: item.stock > 0 ? colors.ok : colors.err }]}>
                {item.stock > 0 ? `${item.stock.toLocaleString('es-MX')} ${item.unit} en existencia` : 'Sin existencia'}
              </Text>
            </View>
            <View style={st.priceBox}>
              <Text style={st.price}>{money(item.price)}</Text>
              <Text style={st.unit}>/ {item.unit}</Text>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const st = StyleSheet.create({
  searchWrap: { backgroundColor: colors.white, padding: 12, borderBottomWidth: 1, borderBottomColor: colors.lightGray },
  search: { borderWidth: 1, borderColor: colors.lightGray, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, color: colors.black },
  card: { flexDirection: 'row', backgroundColor: colors.white, borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: colors.lightGray },
  name: { fontWeight: '700', color: colors.black, fontSize: 15 },
  meta: { color: colors.gray, marginTop: 2, fontSize: 12 },
  stock: { marginTop: 6, fontSize: 12, fontWeight: '600' },
  priceBox: { alignItems: 'flex-end', justifyContent: 'center', marginLeft: 10 },
  price: { color: colors.red, fontWeight: '800', fontSize: 16 },
  unit: { color: colors.gray, fontSize: 11 },
  empty: { textAlign: 'center', color: colors.gray, marginTop: 40 },
});
