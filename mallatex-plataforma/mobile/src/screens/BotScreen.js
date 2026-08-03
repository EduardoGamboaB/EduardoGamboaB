import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Alert } from 'react-native';
import { colors } from '../theme';
import { api } from '../api';

const money = (n) => '$' + Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const NEEDS = [['sombra', '☀️ Sombra'], ['granizo', '🌨️ Antigranizo'], ['insectos', '🐛 Antiinsecto'], ['pajaros', '🐦 Antipájaros'], ['tutoreo', '🪴 Tutoreo'], ['maleza', '🌱 Antimaleza']];

export default function BotScreen() {
  const [objetivo, setObjetivo] = useState('sombra');
  const [cultivo, setCultivo] = useState('');
  const [clima, setClima] = useState('');
  const [terreno, setTerreno] = useState('');
  const [busy, setBusy] = useState(false);
  const [rec, setRec] = useState(null);

  async function ask() {
    setBusy(true);
    try { setRec(await api.advisor({ objetivo, cultivo, clima, terreno })); }
    catch (e) { Alert.alert(e.offline ? 'Sin conexión' : 'No se pudo consultar', 'Intenta de nuevo en un momento.'); }
    setBusy(false);
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <View style={st.intro}>
        <Text style={st.introIcon}>🤖</Text>
        <Text style={st.introTxt}>Cuéntame del cultivo y las condiciones y te recomiendo la malla Mallatex ideal.</Text>
      </View>

      <Text style={st.label}>¿Qué necesitas resolver?</Text>
      <View style={st.chips}>{NEEDS.map(([v, l]) => (
        <TouchableOpacity key={v} style={[st.chip, objetivo === v && st.chipOn]} onPress={() => setObjetivo(v)}><Text style={[st.chipTxt, objetivo === v && st.chipTxtOn]}>{l}</Text></TouchableOpacity>
      ))}</View>

      <Text style={st.label}>Cultivo</Text>
      <TextInput style={st.input} value={cultivo} onChangeText={setCultivo} placeholder="p. ej. Tomate, vid, ornamental…" placeholderTextColor={colors.gray} />
      <Text style={st.label}>Clima</Text>
      <TextInput style={st.input} value={clima} onChangeText={setClima} placeholder="p. ej. caluroso, templado, húmedo…" placeholderTextColor={colors.gray} />
      <Text style={st.label}>Terreno</Text>
      <TextInput style={st.input} value={terreno} onChangeText={setTerreno} placeholder="p. ej. invernadero, campo abierto…" placeholderTextColor={colors.gray} />

      <TouchableOpacity style={[st.primary, busy && { opacity: 0.6 }]} onPress={ask} disabled={busy}>
        {busy ? <ActivityIndicator color="#fff" /> : <Text style={st.primaryTxt}>Recomiéndame</Text>}
      </TouchableOpacity>

      {rec && (
        <View style={st.recCard}>
          <Text style={st.recLabel}>Recomendación</Text>
          <Text style={st.recTitle}>{rec.title}</Text>
          {rec.shadePct && <Text style={st.recPct}>Sombreo sugerido: {rec.shadePct}</Text>}
          {rec.recommendation && (
            <View style={st.prod}>
              <View style={{ flex: 1 }}>
                <Text style={st.pName}>{rec.recommendation.name}</Text>
                <Text style={st.pMeta}>{rec.recommendation.sku} · {rec.recommendation.specs}</Text>
              </View>
              <Text style={st.pPrice}>{money(rec.recommendation.price)}<Text style={st.pUnit}> /{rec.recommendation.unit}</Text></Text>
            </View>
          )}
          <Text style={st.rationale}>{rec.rationale}</Text>
          {rec.alternatives?.length > 0 && (<>
            <Text style={st.altTitle}>Alternativas</Text>
            {rec.alternatives.map((a) => <Text key={a.sku} style={st.alt}>• {a.name} — {money(a.price)}/{a.unit}</Text>)}
          </>)}
          <Text style={st.disclaimer}>{rec.disclaimer}</Text>
        </View>
      )}
    </ScrollView>
  );
}

const st = StyleSheet.create({
  intro: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fdecec', borderRadius: 12, padding: 14, gap: 12 },
  introIcon: { fontSize: 30 }, introTxt: { flex: 1, color: colors.black },
  label: { color: colors.black, fontWeight: '700', marginTop: 16, marginBottom: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingVertical: 8, paddingHorizontal: 13, borderRadius: 20, borderWidth: 1, borderColor: colors.lightGray, backgroundColor: colors.white },
  chipOn: { backgroundColor: colors.red, borderColor: colors.red },
  chipTxt: { color: colors.gray, fontWeight: '600', fontSize: 13 }, chipTxtOn: { color: '#fff' },
  input: { borderWidth: 1, borderColor: colors.lightGray, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, color: colors.black },
  primary: { backgroundColor: colors.red, borderRadius: 12, paddingVertical: 15, alignItems: 'center', marginTop: 22 },
  primaryTxt: { color: '#fff', fontWeight: '700', fontSize: 16 },
  recCard: { backgroundColor: colors.white, borderRadius: 14, borderWidth: 1, borderColor: colors.lightGray, padding: 18, marginTop: 20 },
  recLabel: { color: colors.red, fontWeight: '800', fontSize: 12, letterSpacing: 0.5 },
  recTitle: { fontSize: 20, fontWeight: '800', color: colors.black, marginTop: 4 },
  recPct: { color: colors.gray, marginTop: 2, fontWeight: '600' },
  prod: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bg, borderRadius: 10, padding: 12, marginTop: 12 },
  pName: { fontWeight: '700', color: colors.black }, pMeta: { color: colors.gray, fontSize: 12, marginTop: 2 },
  pPrice: { color: colors.red, fontWeight: '800' }, pUnit: { color: colors.gray, fontWeight: '400', fontSize: 12 },
  rationale: { color: colors.black, marginTop: 12, lineHeight: 20 },
  altTitle: { fontWeight: '700', color: colors.black, marginTop: 14, marginBottom: 4 },
  alt: { color: colors.gray, marginBottom: 2 },
  disclaimer: { color: colors.gray, fontSize: 12, marginTop: 14, fontStyle: 'italic' },
});
