import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme';

export default function ComingSoonScreen({ title, icon }) {
  return (
    <View style={st.wrap}>
      <Text style={st.icon}>{icon || '✨'}</Text>
      <Text style={st.title}>{title}</Text>
      <Text style={st.sub}>Próximamente</Text>
      <Text style={st.note}>Este módulo se habilitará en una próxima versión de la app.</Text>
    </View>
  );
}

const st = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30 },
  icon: { fontSize: 56, marginBottom: 10 },
  title: { fontSize: 22, fontWeight: '800', color: colors.black },
  sub: { color: colors.red, fontWeight: '700', marginTop: 6 },
  note: { color: colors.gray, textAlign: 'center', marginTop: 12 },
});
