// Tablet de línea (MT-PC-003): pantalla pensada para el piso de planta.
// Objetivos: pocos pasos, botones grandes, etiquetas con emoji redundante (apoyo a la
// lectura), y captura por QR del rollo. Reutiliza el patrón de cámara de CheckinScreen/VisitScreen.
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, Alert, TextInput, Modal, useWindowDimensions } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { colors } from '../theme';
import { api } from '../api';

// Motivos de alerta con emoji redundante (operadores con baja alfabetización).
const ALERTS = [
  ['paro', 'Paro de línea', '🛑'],
  ['falla', 'Falla de máquina', '⚙️'],
  ['material', 'Falta material', '📭'],
  ['calidad', 'Problema de calidad', '🔍'],
  ['ayuda', 'Pedir ayuda', '🆘'],
];

export default function MesTabletScreen() {
  const { width } = useWindowDimensions();
  const [lines, setLines] = useState([]);
  const [lineId, setLineId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [operators, setOperators] = useState([]); // operadores con turno iniciado (clock-in)
  const [opCode, setOpCode] = useState('');
  const [scanOpen, setScanOpen] = useState(false);
  const [lastRoll, setLastRoll] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.mesTabletLines();
      const list = Array.isArray(data) ? data : (data.lines || []);
      setLines(list);
      if (list.length && lineId == null) setLineId(list[0].id);
    } catch {}
    setLoading(false);
  }, [lineId]);
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const line = lines.find((l) => l.id === lineId) || null;

  function clockIn() {
    const code = opCode.trim();
    if (!code) return Alert.alert('Operador', 'Escribe el número de gafete del operador.');
    if (operators.some((o) => o.code === code)) { setOpCode(''); return; }
    setOperators((prev) => [...prev, { code, at: new Date().toISOString() }]);
    setOpCode('');
  }
  function clockOut(code) { setOperators((prev) => prev.filter((o) => o.code !== code)); }

  async function onScanned(payload) {
    setScanOpen(false);
    if (busy) return;
    setBusy(true);
    try {
      const r = await api.mesScanRoll({ lineId, code: payload, operators: operators.map((o) => o.code) });
      setLastRoll({ ok: true, code: payload, ...r });
    } catch (e) {
      setLastRoll({ ok: false, code: payload, offline: e.offline, message: e.message });
    } finally { setBusy(false); }
  }

  async function sendAlert(type, label) {
    setBusy(true);
    try {
      await api.mesReportAlert({ lineId, type, operators: operators.map((o) => o.code) });
      Alert.alert('Aviso enviado', `${label} reportado en ${line?.name || 'la línea'}.`);
    } catch (e) {
      Alert.alert(e.offline ? 'Sin conexión' : 'No se envió', e.offline ? 'Se reintentará al reconectar.' : e.message);
    } finally { setBusy(false); }
  }

  if (loading) return <View style={st.center}><ActivityIndicator color={colors.red} size="large" /></View>;

  // Botones de alerta a 2 columnas en teléfono, 3 en tablet ancha (adaptable).
  const alertCols = width >= 600 ? 3 : 2;

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 48 }}>
      {/* Selección de línea */}
      <Text style={st.label}>🏭 Línea de producción</Text>
      <View style={st.chips}>
        {lines.map((l) => (
          <TouchableOpacity key={l.id} style={[st.lineChip, lineId === l.id && st.lineChipOn]} onPress={() => setLineId(l.id)}>
            <Text style={[st.lineChipTxt, lineId === l.id && st.lineChipTxtOn]}>{l.name}</Text>
            {!!l.status && <Text style={[st.lineChipSub, lineId === l.id && { color: '#ffe1e1' }]}>{l.status}</Text>}
          </TouchableOpacity>
        ))}
        {lines.length === 0 && <Text style={st.muted}>No hay líneas asignadas.</Text>}
      </View>

      {/* Clock-in de operadores */}
      <Text style={st.label}>👷 Operadores en turno</Text>
      <View style={st.opRow}>
        <TextInput
          style={st.opInput}
          value={opCode}
          onChangeText={setOpCode}
          placeholder="Gafete del operador"
          placeholderTextColor={colors.gray}
          keyboardType="number-pad"
          returnKeyType="done"
          onSubmitEditing={clockIn}
        />
        <TouchableOpacity style={st.opBtn} onPress={clockIn}><Text style={st.opBtnTxt}>➕ Entrar</Text></TouchableOpacity>
      </View>
      <View style={st.opList}>
        {operators.map((o) => (
          <TouchableOpacity key={o.code} style={st.opTag} onPress={() => clockOut(o.code)}>
            <Text style={st.opTagTxt}>👷 {o.code}</Text>
            <Text style={st.opTagX}>✕</Text>
          </TouchableOpacity>
        ))}
        {operators.length === 0 && <Text style={st.muted}>Nadie ha marcado entrada todavía.</Text>}
      </View>

      {/* Escaneo de rollo */}
      <Text style={st.label}>🏷️ Rollo de material</Text>
      <TouchableOpacity style={st.scanBtn} onPress={() => setScanOpen(true)} disabled={busy}>
        <Text style={st.scanBtnIcon}>📷</Text>
        <Text style={st.scanBtnTxt}>Escanear QR del rollo</Text>
      </TouchableOpacity>
      {lastRoll && (
        <View style={[st.rollCard, { borderColor: lastRoll.ok ? colors.ok : (lastRoll.offline ? colors.warn : colors.err) }]}>
          <Text style={st.rollHead}>{lastRoll.ok ? '✅ Rollo cargado' : (lastRoll.offline ? '⏳ Sin conexión' : '❌ No se pudo')}</Text>
          <Text style={st.rollCode}>{lastRoll.code}</Text>
          {!!lastRoll.material && <Text style={st.muted}>{lastRoll.material}</Text>}
          {!!lastRoll.message && !lastRoll.ok && <Text style={st.muted}>{lastRoll.message}</Text>}
        </View>
      )}

      {/* Botonera de alertas rápidas */}
      <Text style={st.label}>🚨 Avisar a supervisión</Text>
      <View style={st.alertGrid}>
        {ALERTS.map(([type, label, icon]) => (
          <TouchableOpacity
            key={type}
            style={[st.alertBtn, { width: `${100 / alertCols - 2}%` }]}
            onPress={() => sendAlert(type, label)}
            disabled={busy}
          >
            <Text style={st.alertIcon}>{icon}</Text>
            <Text style={st.alertTxt}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {busy && <ActivityIndicator color={colors.red} style={{ marginTop: 16 }} />}

      {/* Cámara de escaneo (modal a pantalla completa) */}
      <Modal visible={scanOpen} animationType="slide" onRequestClose={() => setScanOpen(false)}>
        <ScanCamera onScanned={onScanned} onClose={() => setScanOpen(false)} />
      </Modal>
    </ScrollView>
  );
}

// Cámara con lector de códigos QR (misma librería expo-camera del resto de la app).
function ScanCamera({ onScanned, onClose }) {
  const [camPermission, requestCamPermission] = useCameraPermissions();
  const handled = useRef(false);
  useEffect(() => { if (!camPermission?.granted) requestCamPermission(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      {camPermission?.granted ? (
        <CameraView
          style={{ flex: 1 }}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ['qr', 'code128', 'ean13', 'datamatrix'] }}
          onBarcodeScanned={({ data }) => {
            if (handled.current) return;
            handled.current = true;
            onScanned(data);
          }}
        >
          <View style={st.scanOverlay}>
            <Text style={st.scanHint}>🎯 Apunta al QR del rollo</Text>
            <View style={st.scanFrame} />
            <TouchableOpacity style={st.scanCancel} onPress={onClose}><Text style={st.scanCancelTxt}>Cancelar</Text></TouchableOpacity>
          </View>
        </CameraView>
      ) : (
        <View style={st.center}>
          <Text style={st.permTxt}>Se necesita permiso de cámara para escanear.</Text>
          <TouchableOpacity style={st.opBtn} onPress={onClose}><Text style={st.opBtnTxt}>Cerrar</Text></TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const st = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  label: { color: colors.black, fontWeight: '800', fontSize: 16, marginTop: 22, marginBottom: 10 },
  muted: { color: colors.gray },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  // línea: chips grandes
  lineChip: { paddingVertical: 14, paddingHorizontal: 18, borderRadius: 14, borderWidth: 2, borderColor: colors.lightGray, backgroundColor: colors.white, minWidth: 120 },
  lineChipOn: { backgroundColor: colors.red, borderColor: colors.red },
  lineChipTxt: { color: colors.black, fontWeight: '800', fontSize: 16 },
  lineChipTxtOn: { color: '#fff' },
  lineChipSub: { color: colors.gray, fontSize: 12, marginTop: 2 },
  // operadores
  opRow: { flexDirection: 'row', gap: 10 },
  opInput: { flex: 1, backgroundColor: colors.white, borderWidth: 2, borderColor: colors.lightGray, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, color: colors.black, fontSize: 18 },
  opBtn: { backgroundColor: colors.black, borderRadius: 12, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center' },
  opBtnTxt: { color: '#fff', fontWeight: '800', fontSize: 16 },
  opList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  opTag: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fdecec', borderRadius: 20, paddingVertical: 10, paddingHorizontal: 14 },
  opTagTxt: { color: colors.black, fontWeight: '700', fontSize: 15 },
  opTagX: { color: colors.red, fontWeight: '800' },
  // escaneo
  scanBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: colors.red, borderRadius: 16, paddingVertical: 22 },
  scanBtnIcon: { fontSize: 30 },
  scanBtnTxt: { color: '#fff', fontWeight: '800', fontSize: 20 },
  rollCard: { backgroundColor: colors.white, borderRadius: 14, borderWidth: 2, padding: 16, marginTop: 12 },
  rollHead: { fontWeight: '800', fontSize: 16, color: colors.black },
  rollCode: { color: colors.black, fontWeight: '700', fontSize: 20, marginTop: 4 },
  // alertas
  alertGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 },
  alertBtn: { backgroundColor: colors.white, borderWidth: 2, borderColor: colors.lightGray, borderRadius: 16, paddingVertical: 22, alignItems: 'center', justifyContent: 'center' },
  alertIcon: { fontSize: 34 },
  alertTxt: { color: colors.black, fontWeight: '800', fontSize: 15, marginTop: 8, textAlign: 'center' },
  // overlay cámara
  scanOverlay: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.25)' },
  scanHint: { color: '#fff', fontSize: 20, fontWeight: '800', marginBottom: 20 },
  scanFrame: { width: 240, height: 240, borderWidth: 4, borderColor: '#fff', borderRadius: 20 },
  scanCancel: { marginTop: 40, borderWidth: 2, borderColor: '#fff', borderRadius: 12, paddingVertical: 14, paddingHorizontal: 40 },
  scanCancelTxt: { color: '#fff', fontWeight: '800', fontSize: 18 },
  permTxt: { color: colors.gray, textAlign: 'center', marginBottom: 20, fontSize: 16 },
});
