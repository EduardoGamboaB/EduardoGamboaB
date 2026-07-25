import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { colors } from '../theme';
import { api } from '../api';
import { setToken, getServerUrl, setServerUrl } from '../storage';
import { DEFAULT_SERVER_URL } from '../config';

export default function LoginScreen({ onLoggedIn }) {
  const [server, setServer] = useState('');
  const [code, setCode] = useState('');
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [showServer, setShowServer] = useState(false);

  useEffect(() => { (async () => setServer(await getServerUrl(DEFAULT_SERVER_URL)))(); }, []);

  async function submit() {
    setError(''); setBusy(true);
    try {
      await setServerUrl(server.trim());
      const r = await api.loginEmployee(code.trim(), pin.trim());
      await setToken(r.token);
      onLoggedIn();
    } catch (e) {
      setError(e.offline ? 'Sin conexión con el servidor. Revisa la URL.' : (e.message || 'No se pudo iniciar sesión'));
    } finally { setBusy(false); }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={st.wrap}>
      <View style={st.logo}><Text style={st.logoTxt}>Mallatex</Text><Text style={st.logoSub}>Campo · Asistencia</Text></View>

      <View style={st.card}>
        <Text style={st.title}>Acceso del colaborador</Text>
        <Text style={st.label}>Código</Text>
        <TextInput style={st.input} value={code} onChangeText={setCode} autoCapitalize="characters" placeholder="MTX013" placeholderTextColor={colors.gray} />
        <Text style={st.label}>PIN</Text>
        <TextInput style={st.input} value={pin} onChangeText={setPin} secureTextEntry keyboardType="number-pad" placeholder="••••" placeholderTextColor={colors.gray} />

        <TouchableOpacity onPress={() => setShowServer((v) => !v)}>
          <Text style={st.link}>{showServer ? 'Ocultar' : 'Configurar'} servidor</Text>
        </TouchableOpacity>
        {showServer && (
          <TextInput style={st.input} value={server} onChangeText={setServer} autoCapitalize="none" keyboardType="url" placeholder="https://tu-servidor" placeholderTextColor={colors.gray} />
        )}

        {!!error && <Text style={st.error}>{error}</Text>}
        <TouchableOpacity style={[st.btn, busy && { opacity: 0.6 }]} onPress={submit} disabled={busy}>
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={st.btnTxt}>Entrar</Text>}
        </TouchableOpacity>
      </View>
      <Text style={st.foot}>powered by Evorgyn</Text>
    </KeyboardAvoidingView>
  );
}

const st = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg, justifyContent: 'center', padding: 22 },
  logo: { alignItems: 'center', marginBottom: 22 },
  logoTxt: { fontSize: 34, fontWeight: '900', color: colors.red, letterSpacing: 1 },
  logoSub: { color: colors.gray, marginTop: 2, fontWeight: '600' },
  card: { backgroundColor: colors.white, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: colors.lightGray },
  title: { fontSize: 18, fontWeight: '800', color: colors.black, marginBottom: 8 },
  label: { color: colors.black, fontWeight: '700', marginTop: 12, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: colors.lightGray, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, color: colors.black, fontSize: 16 },
  link: { color: colors.red, marginTop: 14, fontWeight: '600' },
  error: { color: colors.err, marginTop: 12 },
  btn: { backgroundColor: colors.red, borderRadius: 12, paddingVertical: 15, alignItems: 'center', marginTop: 18 },
  btnTxt: { color: colors.white, fontWeight: '700', fontSize: 16 },
  foot: { textAlign: 'center', color: colors.gray, marginTop: 22 },
});
