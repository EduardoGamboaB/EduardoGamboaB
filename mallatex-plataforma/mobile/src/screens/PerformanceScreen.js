import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator } from 'react-native';
import { colors } from '../theme';
import { api } from '../api';

const money = (n) => '$' + Number(n || 0).toLocaleString('es-MX');

export default function PerformanceScreen() {
  const [data, setData] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    try { setData(await api.myObjectives()); } catch {}
    setRefreshing(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  if (!data) return <View style={st.center}><ActivityIndicator color={colors.red} /></View>;
  const obj = data.objective;
  const pct = data.progressPct || 0;

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} />}>
      <View style={st.card}>
        <Text style={st.period}>{obj ? `Objetivo ${obj.period}` : 'Sin objetivo asignado'}</Text>
        {obj && (<>
          <Text style={st.big}>{money(obj.achievedAmount)}</Text>
          <Text style={st.of}>de {money(obj.targetAmount)}</Text>
          <View style={st.barTrack}><View style={[st.barFill, { width: `${pct}%`, backgroundColor: pct >= 100 ? colors.ok : colors.red }]} /></View>
          <Text style={st.pct}>{pct}% del objetivo</Text>
        </>)}
      </View>

      <Text style={st.section}>Indicadores</Text>
      <View style={st.kpis}>
        <Kpi n={data.kpis?.cartera ?? 0} l="Clientes en cartera" />
        <Kpi n={data.kpis?.prospectos ?? 0} l="Prospectos" />
        <Kpi n={data.kpis?.visitas ?? 0} l="Visitas registradas" />
      </View>

      {(data.history || []).length > 1 && (<>
        <Text style={st.section}>Historial</Text>
        <View style={st.card2}>
          {data.history.map((h) => (
            <View key={h.id} style={st.hrow}>
              <Text style={st.hp}>{h.period}</Text>
              <Text style={st.hv}>{money(h.achievedAmount)} / {money(h.targetAmount)}</Text>
            </View>
          ))}
        </View>
      </>)}
    </ScrollView>
  );
}

const Kpi = ({ n, l }) => (<View style={st.kpi}><Text style={st.kpiN}>{n}</Text><Text style={st.kpiL}>{l}</Text></View>);

const st = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  card: { backgroundColor: colors.black, borderRadius: 16, padding: 22, alignItems: 'center' },
  period: { color: '#e9c8c9', fontWeight: '700' },
  big: { color: '#fff', fontSize: 34, fontWeight: '800', marginTop: 8 },
  of: { color: '#b9b2b1', marginTop: 2 },
  barTrack: { width: '100%', height: 12, borderRadius: 6, backgroundColor: '#3a3636', marginTop: 18, overflow: 'hidden' },
  barFill: { height: 12, borderRadius: 6 },
  pct: { color: '#fff', fontWeight: '700', marginTop: 10 },
  section: { fontWeight: '800', color: colors.black, marginTop: 20, marginBottom: 10 },
  kpis: { flexDirection: 'row', gap: 10 },
  kpi: { flex: 1, backgroundColor: colors.white, borderRadius: 12, borderWidth: 1, borderColor: colors.lightGray, padding: 14, alignItems: 'center' },
  kpiN: { fontSize: 24, fontWeight: '800', color: colors.red },
  kpiL: { color: colors.gray, fontSize: 11, textAlign: 'center', marginTop: 4 },
  card2: { backgroundColor: colors.white, borderRadius: 12, borderWidth: 1, borderColor: colors.lightGray, paddingHorizontal: 14 },
  hrow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.bg },
  hp: { color: colors.black, fontWeight: '600' },
  hv: { color: colors.gray },
});
