// Reporte de merma / scrap por categoría (prima / sobrante / defecto / desperdicio).
// Captura simple para el piso: línea, categoría con emoji, cantidad y nota opcional.
import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Alert, useWindowDimensions } from 'react-native';
import { colors } from '../theme';
import { api } from '../api';
import { enqueue } from '../storage';

// Categorías de merma del MES. Emoji redundante para apoyo a la lectura.
const CATS = [
  ['prima', 'Materia prima', '🧵'],
  ['sobrante', 'Sobrante', '📏'],
  ['defecto', 'Defecto', '🚫'],
  ['desperdicio', 'Desperdicio', '🗑️'],
];
const UNITS = [['kg', 'kg'], ['m', 'metros'], ['pza', 'piezas']];

export default function MesMermasScreen() {
  const { width } = useWindowDimensions();
  const [lines, setLines] = useState([]);
  const [lineId, setLineId] = useState(null);
  const [category, setCategory] = useState('defecto');
  const [qty, setQty] = useState('');
  const [unit, setUnit] = useState('kg');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  const load = useCallback(async () => {
    try {
      const data = await api.mesTabletLines();
      const list = Array.isArray(data) ? data : (data.lines || []);
      setLines(list);
      if (list.length) setLineId((prev) => prev ?? list[0].id);
    } catch {}
  }, []);
  useEffect(() => { load(); }, [load]);

  async function submit() {
    if (!qty.trim()) return Alert.alert('Cantidad', 'Escribe la cantidad de merma.');
    const n = Number(String(qty).replace(',', '.').replace(/[^0-9.]/g, ''));
    if (!n) return Alert.alert('Cantidad inválida', 'Revisa la cantidad capturada.');
    setBusy(true);
    const payload = { lineId, categoria: category, qty: n, unit, note };
    try {
      await api.mesReportMerma(payload);
      setResult({ ok: true });
      setQty(''); setNote('');
    } catch (e) {
      if (e.offline) {
        await enqueue({ kind: 'merma', payload });
        setResult({ ok: true, offline: true });
        setQty(''); setNote('');
      } else Alert.alert('No se registró', e.message);
    } finally { setBusy(false); }
  }

  if (result) {
    return (
      <View style={st.center}>
        <View style={[st.circle, { backgroundColor: result.offline ? colors.warn : colors.ok }]}>
          <Text style={st.circleTxt}>{result.offline ? '⏳' : '✓'}</Text>
        </View>
        <Text style={st.h}>{result.offline ? 'Guardada sin conexión' : 'Merma registrada'}</Text>
        <Text style={st.muted}>{result.offline ? 'Se enviará al reconectar.' : 'Gracias, quedó registrada en el MES.'}</Text>
        <TouchableOpacity style={st.primary} onPress={() => setResult(null)}><Text style={st.primaryTxt}>Registrar otra</Text></TouchableOpacity>
      </View>
    );
  }

  const catCols = width >= 600 ? 4 : 2;

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 48 }}>
      <Text style={st.label}>🏭 Línea</Text>
      <View style={st.chips}>
        {lines.map((l) => (
          <TouchableOpacity key={l.id} style={[st.chip, lineId === l.id && st.chipOn]} onPress={() => setLineId(l.id)}>
            <Text style={[st.chipTxt, lineId === l.id && st.chipTxtOn]}>{l.name}</Text>
          </TouchableOpacity>
        ))}
        {lines.length === 0 && <Text style={st.muted}>Sin líneas asignadas.</Text>}
      </View>

      <Text style={st.label}>🗂️ Categoría de merma</Text>
      <View style={st.catGrid}>
        {CATS.map(([v, l, icon]) => (
          <TouchableOpacity
            key={v}
            style={[st.catBtn, { width: `${100 / catCols - 2}%` }, category === v && st.catBtnOn]}
            onPress={() => setCategory(v)}
          >
            <Text style={st.catIcon}>{icon}</Text>
            <Text style={[st.catTxt, category === v && st.catTxtOn]}>{l}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={st.label}>⚖️ Cantidad</Text>
      <TextInput style={st.qtyInput} value={qty} onChangeText={setQty} keyboardType="numeric" placeholder="0" placeholderTextColor={colors.gray} />
      <View style={st.chips}>
        {UNITS.map(([v, l]) => (
          <TouchableOpacity key={v} style={[st.chip, unit === v && st.chipOn]} onPress={() => setUnit(v)}>
            <Text style={[st.chipTxt, unit === v && st.chipTxtOn]}>{l}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={st.label}>📝 Nota (opcional)</Text>
      <TextInput style={st.note} value={note} onChangeText={setNote} multiline placeholder="¿Qué pasó?" placeholderTextColor={colors.gray} />

      <TouchableOpacity style={[st.primary, busy && { opacity: 0.6 }]} onPress={submit} disabled={busy}>
        {busy ? <ActivityIndicator color="#fff" /> : <Text style={st.primaryTxt}>Registrar merma</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const st = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  circle: { width: 84, height: 84, borderRadius: 42, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  circleTxt: { color: '#fff', fontSize: 42, fontWeight: '800' },
  h: { fontSize: 20, fontWeight: '800', color: colors.black },
  muted: { color: colors.gray, marginTop: 6, textAlign: 'center' },
  label: { color: colors.black, fontWeight: '800', fontSize: 16, marginTop: 20, marginBottom: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  chip: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 20, borderWidth: 2, borderColor: colors.lightGray, backgroundColor: colors.white },
  chipOn: { backgroundColor: colors.red, borderColor: colors.red },
  chipTxt: { color: colors.gray, fontWeight: '700', fontSize: 14 },
  chipTxtOn: { color: '#fff' },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 },
  catBtn: { backgroundColor: colors.white, borderWidth: 2, borderColor: colors.lightGray, borderRadius: 16, paddingVertical: 20, alignItems: 'center', justifyContent: 'center' },
  catBtnOn: { backgroundColor: '#FEF3F3', borderColor: colors.red },
  catIcon: { fontSize: 34 },
  catTxt: { color: colors.black, fontWeight: '800', fontSize: 14, marginTop: 8, textAlign: 'center' },
  catTxtOn: { color: colors.red },
  qtyInput: { backgroundColor: colors.white, borderWidth: 2, borderColor: colors.lightGray, borderRadius: 12, padding: 16, color: colors.black, fontSize: 26, fontWeight: '800', textAlign: 'center' },
  note: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.lightGray, borderRadius: 10, padding: 12, minHeight: 70, color: colors.black, textAlignVertical: 'top' },
  primary: { backgroundColor: colors.red, borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 24 },
  primaryTxt: { color: '#fff', fontWeight: '800', fontSize: 16 },
});
