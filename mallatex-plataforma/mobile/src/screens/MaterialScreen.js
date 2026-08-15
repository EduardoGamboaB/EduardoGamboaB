// Material de venta: banco de material (imágenes, videos, documentos), publicaciones
// sugeridas para redes, solicitudes de formato a diseño e inventario de impresos.
// El contenido lo administra el equipo de marketing desde la plataforma web.
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, FlatList, ScrollView, StyleSheet, TouchableOpacity, RefreshControl, TextInput, Alert, ActivityIndicator, Modal, KeyboardAvoidingView, Platform, Image, Share, Linking } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { colors } from '../theme';
import { api } from '../api';
import { getToken } from '../storage';

// Módulos opcionales: si no están instalados en el build, la app no truena;
// cada función cae a una alternativa (Share nativo / Alert con el texto).
let FileSystem; try { FileSystem = require('expo-file-system'); } catch {}
let Sharing; try { Sharing = require('expo-sharing'); } catch {}
let Clipboard; try { Clipboard = require('expo-clipboard'); } catch {}

const TABS = [
  ['banco', '🖼️', 'Banco'],
  ['pubs', '📣', 'Publicaciones'],
  ['proyectos', '🏗️', 'Proyectos'],
  ['formatos', '📋', 'Formatos'],
  ['impresos', '📦', 'Impresos'],
];

const MAX_FOTOS_APORTE = 8;
const ESTADO_APORTE = {
  nuevo: { l: 'En revisión', c: colors.warn },
  aprobado: { l: 'Aprobado', c: '#2563eb' },
  publicado: { l: 'Publicado', c: colors.ok },
  rechazado: { l: 'Rechazado', c: colors.red },
};

const TIPO_ICON = { imagen: '🖼️', video: '🎬', documento: '📄' };
const TIPOS = [['', 'Todo'], ['imagen', '🖼️ Imágenes'], ['video', '🎬 Videos'], ['documento', '📄 Documentos']];

const REDES = {
  whatsapp: { l: 'WhatsApp', c: '#25D366' },
  facebook: { l: 'Facebook', c: '#1877F2' },
  // Degradado simple de Instagram: color base + borde en tono complementario.
  instagram: { l: 'Instagram', c: '#C13584', b: '#F77737' },
  tiktok: { l: 'TikTok', c: '#232121' },
};

const ESTADO = {
  solicitado: { l: 'Solicitado', c: colors.warn },
  en_diseno: { l: 'En diseño', c: '#2563eb' },
  entregado: { l: 'Entregado', c: colors.ok },
  rechazado: { l: 'Rechazado', c: colors.red },
};

const extFromMime = (mime) => ({
  'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif',
  'application/pdf': '.pdf', 'video/mp4': '.mp4',
}[mime] || '');

// ---- Descarga autenticada a caché (el <Image> de RN no manda encabezados) ----
async function downloadAssetFile(asset, prefix) {
  const url = await api.mktAssetFileUrl(asset.id);
  const token = await getToken();
  const dest = FileSystem.cacheDirectory + `${prefix}_${asset.id}${extFromMime(asset.mime)}`;
  try {
    const info = await FileSystem.getInfoAsync(dest);
    if (info.exists && info.size > 0) return dest;
  } catch {}
  const r = await FileSystem.downloadAsync(url, dest, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  if (r.status && r.status >= 400) {
    try { await FileSystem.deleteAsync(dest, { idempotent: true }); } catch {}
    const err = new Error(r.status === 401 ? 'Tu sesión expiró, vuelve a entrar.' : `El servidor no entregó el archivo (error ${r.status}).`);
    err.status = r.status;
    throw err;
  }
  return r.uri;
}

// Comparte un asset: externas con el Share nativo; archivos descargando con Bearer
// y abriendo la hoja de compartir del sistema.
async function shareAsset(asset) {
  try {
    if (asset.externalUrl) {
      await Share.share({ message: `${asset.titulo ? asset.titulo + ' ' : ''}${asset.externalUrl}`.trim() });
      return;
    }
    if (!asset.hasFile) return Alert.alert('Sin archivo', 'Este material no tiene archivo para compartir.');
    if (!FileSystem || !Sharing) {
      return Alert.alert('Compartir no disponible', 'Esta versión de la app no incluye el módulo para compartir archivos. Actualiza la app.');
    }
    const uri = await downloadAssetFile(asset, 'mkt_share');
    if (!(await Sharing.isAvailableAsync())) return Alert.alert('Compartir no disponible', 'Este dispositivo no permite compartir archivos.');
    await Sharing.shareAsync(uri, { mimeType: asset.mime || undefined, dialogTitle: asset.titulo || 'Material Mallatex' });
  } catch (e) {
    Alert.alert('No se pudo compartir', e.offline ? 'Sin conexión con el servidor. Intenta cuando tengas señal.' : (e.message || 'Intenta de nuevo.'));
  }
}

export default function MaterialScreen({ onSeen }) {
  const [tab, setTab] = useState('banco');
  return (
    <View style={{ flex: 1 }}>
      <View style={st.tabs}>
        {TABS.map(([key, icon, label]) => (
          <TouchableOpacity
            key={key}
            style={[st.tabChip, tab === key && st.tabChipOn]}
            onPress={() => setTab(key)}
            accessibilityRole="button"
            accessibilityLabel={label}
            accessibilityState={{ selected: tab === key }}
          >
            <Text style={st.tabIcon}>{icon}</Text>
            <Text style={[st.tabTxt, tab === key && st.tabTxtOn]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {tab === 'banco' && <BancoTab />}
      {tab === 'pubs' && <PubsTab onSeen={onSeen} />}
      {tab === 'proyectos' && <ProyectosTab />}
      {tab === 'formatos' && <FormatosTab />}
      {tab === 'impresos' && <ImpresosTab />}
    </View>
  );
}

// ============================= Banco de material =============================

// Miniatura de imagen con descarga autenticada; si el módulo de archivos no está
// disponible o falla la descarga, se muestra un mosaico con icono + título.
function AuthImage({ asset }) {
  const [uri, setUri] = useState(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let alive = true;
    if (!FileSystem || !asset.hasFile) { setFailed(true); return; }
    (async () => {
      try {
        const local = await downloadAssetFile(asset, 'mkt_img');
        if (alive) setUri(local);
      } catch { if (alive) setFailed(true); }
    })();
    return () => { alive = false; };
  }, [asset.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (failed || (!FileSystem && !uri)) {
    return (
      <View style={st.thumbFallback}>
        <Text style={st.thumbIcon}>{TIPO_ICON[asset.tipo] || '🖼️'}</Text>
        <Text style={st.thumbTitle} numberOfLines={1}>{asset.titulo}</Text>
      </View>
    );
  }
  if (!uri) return <View style={[st.thumbFallback, st.center]}><ActivityIndicator color={colors.red} /></View>;
  return <Image source={{ uri }} style={st.thumb} resizeMode="cover" accessibilityLabel={asset.titulo} />;
}

function BancoTab() {
  const [items, setItems] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [firstLoad, setFirstLoad] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [q, setQ] = useState('');
  const [tipo, setTipo] = useState('');
  const debounce = useRef(null);

  const load = useCallback(async (search, t) => {
    setRefreshing(true);
    try { setItems(await api.mktAssets({ tipo: t, q: search })); setLoadError(false); }
    catch { setLoadError(true); }
    setRefreshing(false); setFirstLoad(false);
  }, []);

  useEffect(() => { load(q, tipo); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  // Búsqueda con pequeño retraso para no pegarle al servidor en cada tecla.
  useEffect(() => {
    if (firstLoad) return;
    clearTimeout(debounce.current);
    debounce.current = setTimeout(() => load(q, tipo), 400);
    return () => clearTimeout(debounce.current);
  }, [q]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!firstLoad) load(q, tipo); }, [tipo]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <View style={{ flex: 1 }}>
      <View style={st.searchWrap}>
        <TextInput
          style={st.search}
          value={q}
          onChangeText={setQ}
          placeholder="Buscar material…"
          placeholderTextColor={colors.gray}
          returnKeyType="search"
          accessibilityLabel="Buscar material"
        />
        <View style={st.filterRow}>
          {TIPOS.map(([key, label]) => (
            <TouchableOpacity key={key} style={[st.chip, tipo === key && st.chipOn]} onPress={() => setTipo(key)} hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected: tipo === key }}>
              <Text style={[st.chipTxt, tipo === key && st.chipTxtOn]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      {loadError && (
        <TouchableOpacity style={st.errBanner} onPress={() => load(q, tipo)} accessibilityRole="button">
          <Text style={st.errBannerTxt}>Sin conexión · toca para reintentar</Text>
        </TouchableOpacity>
      )}
      <FlatList
        data={items}
        keyExtractor={(it) => String(it.id)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(q, tipo)} />}
        contentContainerStyle={{ padding: 14 }}
        ListEmptyComponent={firstLoad
          ? <ActivityIndicator style={{ marginTop: 40 }} color={colors.red} />
          : (loadError ? null : <Text style={st.empty}>No hay material con esos filtros.</Text>)}
        renderItem={({ item }) => <AssetCard asset={item} />}
      />
    </View>
  );
}

function AssetCard({ asset }) {
  const [sharing, setSharing] = useState(false);
  async function onShare() {
    if (sharing) return;
    setSharing(true);
    try { await shareAsset(asset); } finally { setSharing(false); }
  }
  function onOpen() {
    Linking.openURL(asset.externalUrl).catch(() => Alert.alert('No se pudo abrir', 'Revisa que tengas una app para abrir este enlace.'));
  }
  return (
    <View style={st.card}>
      {asset.tipo === 'imagen' && asset.hasFile
        ? <AuthImage asset={asset} />
        : (
          <View style={st.thumbFallback}>
            <Text style={st.thumbIcon}>{TIPO_ICON[asset.tipo] || '📄'}</Text>
            <Text style={st.thumbTitle} numberOfLines={1}>{asset.titulo}</Text>
          </View>
        )}
      <View style={{ marginTop: 10 }}>
        <Text style={st.cardTitle}>{asset.titulo}</Text>
        {!!asset.descripcion && <Text style={st.meta}>{asset.descripcion}</Text>}
        <Text style={st.metaSmall}>{TIPO_ICON[asset.tipo] || ''} {asset.tipo}{asset.categoria ? ' · ' + asset.categoria : ''}</Text>
      </View>
      <View style={st.actionsRow}>
        {!!asset.externalUrl && (
          <TouchableOpacity style={st.actionBtn} onPress={onOpen} accessibilityRole="button" accessibilityLabel={'Abrir ' + asset.titulo}>
            <Text style={st.actionTxt}>🔗 Abrir</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={[st.actionBtn, st.actionBtnPrimary, sharing && { opacity: 0.6 }]} onPress={onShare} disabled={sharing} accessibilityRole="button" accessibilityLabel={'Compartir ' + asset.titulo}>
          {sharing ? <ActivityIndicator color="#fff" /> : <Text style={st.actionTxtPrimary}>📤 Compartir</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

// =============================== Publicaciones ===============================

async function copyText(text) {
  try {
    if (Clipboard?.setStringAsync) {
      await Clipboard.setStringAsync(text);
      Alert.alert('Copiado', 'El texto quedó en tu portapapeles.');
      return;
    }
  } catch {}
  // Sin módulo de portapapeles: se muestra el texto para copiarlo a mano.
  Alert.alert('Copia el texto manualmente', text);
}

function PubsTab({ onSeen }) {
  const [items, setItems] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [firstLoad, setFirstLoad] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const seenSent = useRef(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      setItems(await api.mktPosts());
      setLoadError(false);
      // Al ver el feed, las publicaciones dejan de contar como nuevas (badge del menú).
      if (!seenSent.current) {
        seenSent.current = true;
        api.mktMarkSeen().then(() => { if (onSeen) onSeen(); }).catch(() => { seenSent.current = false; });
      }
    } catch { setLoadError(true); }
    setRefreshing(false); setFirstLoad(false);
  }, [onSeen]);
  useEffect(() => { load(); }, [load]);

  return (
    <View style={{ flex: 1 }}>
      {loadError && (
        <TouchableOpacity style={st.errBanner} onPress={load} accessibilityRole="button">
          <Text style={st.errBannerTxt}>Sin conexión · toca para reintentar</Text>
        </TouchableOpacity>
      )}
      <FlatList
        data={items}
        keyExtractor={(it) => String(it.id)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} />}
        contentContainerStyle={{ padding: 14 }}
        ListEmptyComponent={firstLoad
          ? <ActivityIndicator style={{ marginTop: 40 }} color={colors.red} />
          : (loadError ? null : <Text style={st.empty}>Aún no hay publicaciones sugeridas.</Text>)}
        renderItem={({ item }) => <PostCard post={item} />}
      />
    </View>
  );
}

function PostCard({ post }) {
  const [sharing, setSharing] = useState(false);
  const red = REDES[post.red] || { l: post.red || 'Red social', c: colors.gray };

  async function onShare() {
    if (sharing) return;
    setSharing(true);
    try {
      if (post.assetId) {
        // El asset de la publicación se comparte con el mismo flujo del banco.
        await shareAsset({ id: post.assetId, tipo: post.assetTipo, titulo: post.assetTitulo, hasFile: true });
      } else {
        await Share.share({ message: post.copyTexto || post.titulo || '' });
      }
    } catch (e) {
      Alert.alert('No se pudo compartir', e.message || 'Intenta de nuevo.');
    } finally { setSharing(false); }
  }

  return (
    <View style={st.card}>
      <View style={st.rowTop}>
        <View style={[st.redBadge, { backgroundColor: red.c }, red.b ? { borderWidth: 2, borderColor: red.b } : null]}>
          <Text style={st.redBadgeTxt}>{red.l}</Text>
        </View>
        {!!post.createdAt && <Text style={st.metaSmall}>{new Date(post.createdAt).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })}</Text>}
      </View>
      <Text style={[st.cardTitle, { marginTop: 8 }]}>{post.titulo}</Text>
      {!!post.assetTitulo && <Text style={st.metaSmall}>{TIPO_ICON[post.assetTipo] || '📎'} {post.assetTitulo}</Text>}
      {!!post.copyTexto && (
        <View style={st.copyBox}>
          <Text style={st.copyTxt}>{post.copyTexto}</Text>
        </View>
      )}
      <View style={st.actionsRow}>
        {!!post.copyTexto && (
          <TouchableOpacity style={st.actionBtn} onPress={() => copyText(post.copyTexto)} accessibilityRole="button" accessibilityLabel="Copiar texto de la publicación">
            <Text style={st.actionTxt}>📋 Copiar</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={[st.actionBtn, st.actionBtnPrimary, sharing && { opacity: 0.6 }]} onPress={onShare} disabled={sharing} accessibilityRole="button" accessibilityLabel="Compartir publicación">
          {sharing ? <ActivityIndicator color="#fff" /> : <Text style={st.actionTxtPrimary}>📤 Compartir</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ============================ Aportes de campo (Proyectos) ============================

function ProyectosTab() {
  const [items, setItems] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [firstLoad, setFirstLoad] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    try { setItems(await api.mktMyAportes()); setLoadError(false); } catch { setLoadError(true); }
    setRefreshing(false); setFirstLoad(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  return (
    <View style={{ flex: 1 }}>
      <View style={st.introBox}>
        <Text style={st.introTxt}>📸 Comparte tus proyectos con marketing: sube fotos con su contexto (proyecto, ubicación, cultivo) y el equipo los convierte en material para todos.</Text>
      </View>
      {loadError && (
        <TouchableOpacity style={st.errBanner} onPress={load} accessibilityRole="button">
          <Text style={st.errBannerTxt}>Sin conexión · toca para reintentar</Text>
        </TouchableOpacity>
      )}
      <FlatList
        data={items}
        keyExtractor={(it) => String(it.id ?? it.folio)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} />}
        contentContainerStyle={{ padding: 14, paddingBottom: 90 }}
        ListEmptyComponent={firstLoad
          ? <ActivityIndicator style={{ marginTop: 40 }} color={colors.red} />
          : (loadError ? null : <Text style={st.empty}>Aún no has compartido proyectos. Usa “＋ Nuevo aporte”.</Text>)}
        renderItem={({ item }) => <AporteCard item={item} onReplied={load} />}
      />
      <TouchableOpacity style={st.fab} onPress={() => setOpen(true)} accessibilityRole="button" accessibilityLabel="Nuevo aporte de proyecto">
        <Text style={st.fabTxt}>＋ Nuevo aporte</Text>
      </TouchableOpacity>
      <AporteModal visible={open} onClose={() => setOpen(false)} onDone={() => { setOpen(false); load(); }} />
    </View>
  );
}

function AporteCard({ item, onReplied }) {
  const s = ESTADO_APORTE[item.estado] || { l: item.estado || '—', c: colors.gray };
  const sub = [item.ubicacion, item.cultivo].filter(Boolean).join(' · ');
  const mensajes = item.mensajes || [];
  const [open, setOpen] = useState(false);
  const [reply, setReply] = useState('');
  const [busy, setBusy] = useState(false);

  async function send() {
    const text = reply.trim();
    if (!text) return;
    setBusy(true);
    try {
      await api.mktAporteMessage(item.id, { message: text });
      setReply('');
      if (onReplied) onReplied();
    } catch (e) {
      Alert.alert('No se pudo enviar', e.offline ? 'Sin conexión con el servidor.' : e.message);
    } finally { setBusy(false); }
  }

  return (
    <View style={st.card}>
      <View style={st.rowTop}>
        <Text style={st.folio}>{item.folio || 'APC'}</Text>
        <View style={[st.tag, { backgroundColor: s.c + '22' }]}><Text style={[st.tagTxt, { color: s.c }]}>{s.l}</Text></View>
      </View>
      <Text style={st.cardTitle}>{item.titulo}</Text>
      {!!sub && <Text style={st.metaSmall}>📍 {sub}</Text>}
      <Text style={st.metaSmall}>
        🖼️ {item.fotoCount || 0} foto(s)
        {item.createdAt ? ' · ' + new Date(item.createdAt).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' }) : ''}
      </Text>
      {!!item.notaMarketing && (
        <View style={st.notaBox}><Text style={st.notaTxt}>💬 {item.notaMarketing}</Text></View>
      )}
      {item.estado === 'publicado' && <Text style={st.pubTxt}>✓ Publicado al banco de contenido</Text>}

      <TouchableOpacity onPress={() => setOpen((v) => !v)} accessibilityRole="button" accessibilityLabel="Conversación con marketing">
        <Text style={st.threadToggle}>💬 {mensajes.length} mensaje(s) con marketing {open ? '▲' : '▼'}</Text>
      </TouchableOpacity>
      {open && (
        <View style={st.thread}>
          {mensajes.length === 0 && <Text style={st.meta}>Sin mensajes todavía.</Text>}
          {mensajes.map((m, i) => (
            <View key={i} style={st.msg}>
              <Text style={st.msgAuthor}>{m.by || (m.role === 'marketing' ? 'Marketing' : 'Tú')}</Text>
              <Text style={st.msgTxt}>{m.message || m.mensaje || ''}</Text>
            </View>
          ))}
          <View style={st.replyRow}>
            <TextInput style={[st.input, { flex: 1, marginBottom: 0 }]} value={reply} onChangeText={setReply} placeholder="Escribe a marketing…" placeholderTextColor={colors.gray} accessibilityLabel="Escribir mensaje" />
            <TouchableOpacity style={[st.sendBtn, busy && { opacity: 0.6 }]} onPress={send} disabled={busy} accessibilityRole="button" accessibilityLabel="Enviar mensaje">
              {busy ? <ActivityIndicator color="#fff" /> : <Text style={st.sendTxt}>➤</Text>}
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

function AporteModal({ visible, onClose, onDone }) {
  const [camPermission, requestCamPermission] = useCameraPermissions();
  const cameraRef = useRef(null);
  const [showCam, setShowCam] = useState(false);
  const [fotos, setFotos] = useState([]);
  const [titulo, setTitulo] = useState('');
  const [ubicacion, setUbicacion] = useState('');
  const [cultivo, setCultivo] = useState('');
  const [producto, setProducto] = useState('');
  const [cliente, setCliente] = useState('');
  const [contexto, setContexto] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (visible) { setFotos([]); setTitulo(''); setUbicacion(''); setCultivo(''); setProducto(''); setCliente(''); setContexto(''); setShowCam(false); }
  }, [visible]);

  async function capturar() {
    if (!camPermission?.granted) { await requestCamPermission(); return; }
    if (fotos.length >= MAX_FOTOS_APORTE) { Alert.alert('Límite de fotos', `Máximo ${MAX_FOTOS_APORTE} fotos por aporte.`); return; }
    try {
      const s = await cameraRef.current?.takePictureAsync({ base64: true, quality: 0.5, skipProcessing: true });
      if (s?.base64) setFotos((prev) => [...prev, 'data:image/jpeg;base64,' + s.base64]);
    } catch { Alert.alert('Cámara', 'No se pudo tomar la foto.'); }
  }

  async function submit() {
    if (!titulo.trim()) return Alert.alert('Falta el título', 'Escribe un título para el proyecto.');
    if (fotos.length === 0) return Alert.alert('Falta una foto', 'Toma al menos una foto del proyecto.');
    setBusy(true);
    try {
      const r = await api.mktCreateAporte({
        titulo: titulo.trim(), ubicacion: ubicacion.trim(), cultivo: cultivo.trim(),
        producto: producto.trim(), cliente: cliente.trim(), contexto: contexto.trim(), fotos,
      });
      Alert.alert('Aporte enviado', `Folio ${r.folio || '—'}. Marketing lo revisará y, si procede, lo publicará al banco.`);
      onDone();
    } catch (e) {
      Alert.alert('No se pudo enviar', e.offline ? 'Sin conexión con el servidor. Intenta cuando tengas señal (la subida de fotos requiere conexión).' : e.message);
    } finally { setBusy(false); }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={st.sheetWrap}>
        <View style={st.sheet}>
          <View style={st.sheetHead}>
            <Text style={st.sheetTitle}>Nuevo aporte de proyecto</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityRole="button" accessibilityLabel="Cerrar"><Text style={st.close}>✕</Text></TouchableOpacity>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled">
            <Text style={st.label}>Título *</Text>
            <TextInput style={st.input} value={titulo} onChangeText={setTitulo} placeholder="p. ej. Cierre de proyecto Malla Antigranizo" placeholderTextColor={colors.gray} />
            <Text style={st.label}>Ubicación</Text>
            <TextInput style={st.input} value={ubicacion} onChangeText={setUbicacion} placeholder="p. ej. Jocotepec, Jalisco" placeholderTextColor={colors.gray} />
            <View style={st.twoCol}>
              <View style={st.col}>
                <Text style={st.label}>Cultivo</Text>
                <TextInput style={st.input} value={cultivo} onChangeText={setCultivo} placeholder="Zarzamora" placeholderTextColor={colors.gray} />
              </View>
              <View style={st.col}>
                <Text style={st.label}>Producto</Text>
                <TextInput style={st.input} value={producto} onChangeText={setProducto} placeholder="Malla antigranizo" placeholderTextColor={colors.gray} />
              </View>
            </View>
            <Text style={st.label}>Cliente (opcional)</Text>
            <TextInput style={st.input} value={cliente} onChangeText={setCliente} placeholder="Nombre del cliente o predio" placeholderTextColor={colors.gray} />
            <Text style={st.label}>Contexto del proyecto</Text>
            <TextInput
              style={[st.input, { minHeight: 80, textAlignVertical: 'top' }]}
              value={contexto} onChangeText={setContexto} multiline
              placeholder="Cuenta la historia: qué se instaló, superficie, resultado para el cliente…"
              placeholderTextColor={colors.gray}
            />

            <Text style={st.label}>Fotos del proyecto *</Text>
            {fotos.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
                {fotos.map((uri, i) => (
                  <View key={i} style={st.thumbWrap}>
                    <Image source={{ uri }} style={st.aporteThumb} />
                    <TouchableOpacity style={st.thumbX} onPress={() => setFotos((prev) => prev.filter((_, j) => j !== i))} accessibilityRole="button" accessibilityLabel={`Quitar foto ${i + 1}`}>
                      <Text style={st.thumbXTxt}>✕</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            )}
            {showCam && camPermission?.granted && (
              <View style={st.cameraBox}><CameraView ref={cameraRef} style={{ flex: 1 }} facing="back" /></View>
            )}
            {!camPermission?.granted ? (
              <TouchableOpacity style={st.secondary} onPress={requestCamPermission}><Text style={st.secondaryTxt}>Permitir cámara</Text></TouchableOpacity>
            ) : !showCam ? (
              <TouchableOpacity style={st.secondary} onPress={() => setShowCam(true)}><Text style={st.secondaryTxt}>📷 Abrir cámara</Text></TouchableOpacity>
            ) : (
              <TouchableOpacity style={[st.secondary, { backgroundColor: colors.red }]} onPress={capturar}><Text style={[st.secondaryTxt, { color: '#fff' }]}>📸 Tomar foto ({fotos.length}/{MAX_FOTOS_APORTE})</Text></TouchableOpacity>
            )}

            <TouchableOpacity style={[st.primary, busy && { opacity: 0.6 }]} onPress={submit} disabled={busy}>
              {busy ? <ActivityIndicator color="#fff" /> : <Text style={st.primaryTxt}>Enviar aporte</Text>}
            </TouchableOpacity>
            <Text style={st.hint}>Marketing revisará tu aporte; al aprobarlo puede publicarlo como caso de éxito en el banco de contenido.</Text>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ============================ Solicitudes de formato ============================

function FormatosTab() {
  const [items, setItems] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [firstLoad, setFirstLoad] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(null); // folio expandido

  const load = useCallback(async () => {
    setRefreshing(true);
    try { setItems(await api.mktMyFormatRequests()); setLoadError(false); } catch { setLoadError(true); }
    setRefreshing(false); setFirstLoad(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  return (
    <View style={{ flex: 1 }}>
      {loadError && (
        <TouchableOpacity style={st.errBanner} onPress={load} accessibilityRole="button">
          <Text style={st.errBannerTxt}>Sin conexión · toca para reintentar</Text>
        </TouchableOpacity>
      )}
      <FlatList
        data={items}
        keyExtractor={(it) => String(it.id ?? it.folio)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} />}
        contentContainerStyle={{ padding: 14, paddingBottom: 90 }}
        ListEmptyComponent={firstLoad
          ? <ActivityIndicator style={{ marginTop: 40 }} color={colors.red} />
          : (loadError ? null : <Text style={st.empty}>Aún no has pedido formatos. Usa “＋ Solicitar formato”.</Text>)}
        renderItem={({ item }) => (
          <FormatCard
            item={item}
            expanded={expanded === (item.id ?? item.folio)}
            onToggle={() => setExpanded(expanded === (item.id ?? item.folio) ? null : (item.id ?? item.folio))}
            onReplied={load}
          />
        )}
      />
      <TouchableOpacity style={st.fab} onPress={() => setOpen(true)} accessibilityRole="button" accessibilityLabel="Solicitar formato">
        <Text style={st.fabTxt}>＋ Solicitar formato</Text>
      </TouchableOpacity>
      <FormatRequestModal visible={open} onClose={() => setOpen(false)} onDone={() => { setOpen(false); load(); }} />
    </View>
  );
}

function FormatCard({ item, expanded, onToggle, onReplied }) {
  const [reply, setReply] = useState('');
  const [busy, setBusy] = useState(false);
  const s = ESTADO[item.estado] || { l: item.estado || '—', c: colors.gray };
  const mensajes = item.mensajes || [];

  async function sendReply() {
    const text = reply.trim();
    if (!text) return Alert.alert('Escribe tu mensaje', 'El mensaje no puede ir vacío.');
    setBusy(true);
    try {
      await api.mktFormatMessage(item.id ?? item.folio, { message: text });
      setReply('');
      onReplied();
    } catch (e) {
      Alert.alert('No se pudo enviar', e.offline ? 'Sin conexión con el servidor.' : e.message);
    } finally { setBusy(false); }
  }

  return (
    <View style={st.card}>
      <TouchableOpacity onPress={onToggle} accessibilityRole="button" accessibilityLabel={(expanded ? 'Contraer' : 'Expandir') + ' solicitud ' + item.folio}>
        <View style={st.rowTop}>
          <Text style={st.folio}>{item.folio}</Text>
          <View style={[st.tag, { backgroundColor: s.c + '22' }]}><Text style={[st.tagTxt, { color: s.c }]}>{s.l}</Text></View>
        </View>
        <Text style={st.cardTitle}>{item.titulo}</Text>
        <Text style={st.metaSmall}>
          {item.createdAt ? new Date(item.createdAt).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' }) + ' · ' : ''}
          {mensajes.length} mensaje(s) {expanded ? '▲' : '▼'}
        </Text>
      </TouchableOpacity>
      {expanded && (
        <View style={st.thread}>
          {mensajes.length === 0 && <Text style={st.meta}>Sin mensajes todavía.</Text>}
          {mensajes.map((m, i) => (
            <View key={i} style={st.msg}>
              <Text style={st.msgAuthor}>{m.autor || m.de || m.from || 'Marketing'}</Text>
              <Text style={st.msgTxt}>{m.mensaje || m.message || m.texto || ''}</Text>
              {!!(m.createdAt || m.fecha) && <Text style={st.metaSmall}>{new Date(m.createdAt || m.fecha).toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</Text>}
            </View>
          ))}
          <View style={st.replyRow}>
            <TextInput
              style={[st.input, { flex: 1, marginBottom: 0 }]}
              value={reply}
              onChangeText={setReply}
              placeholder="Responder…"
              placeholderTextColor={colors.gray}
              accessibilityLabel="Escribir respuesta"
            />
            <TouchableOpacity style={[st.sendBtn, busy && { opacity: 0.6 }]} onPress={sendReply} disabled={busy} accessibilityRole="button" accessibilityLabel="Enviar respuesta">
              {busy ? <ActivityIndicator color="#fff" /> : <Text style={st.sendTxt}>➤</Text>}
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

function FormatRequestModal({ visible, onClose, onDone }) {
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (visible) { setTitulo(''); setDescripcion(''); } }, [visible]);

  async function submit() {
    if (!titulo.trim()) return Alert.alert('Falta el título', 'Escribe un título breve para tu solicitud.');
    setBusy(true);
    try {
      const r = await api.mktCreateFormatRequest({ titulo: titulo.trim(), descripcion: descripcion.trim() });
      Alert.alert('Solicitud enviada', 'Folio ' + (r.folio || '—') + '. El equipo de diseño la revisará.');
      onDone();
    } catch (e) {
      Alert.alert('No se pudo solicitar', e.offline ? 'Sin conexión con el servidor. Intenta cuando tengas señal.' : e.message);
    } finally { setBusy(false); }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={st.sheetWrap}>
        <View style={st.sheet}>
          <View style={st.sheetHead}>
            <Text style={st.sheetTitle}>Solicitar formato</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityRole="button" accessibilityLabel="Cerrar"><Text style={st.close}>✕</Text></TouchableOpacity>
          </View>
          <ScrollView>
            <Text style={st.label}>Título *</Text>
            <TextInput style={st.input} value={titulo} onChangeText={setTitulo} placeholder="p. ej. Lona para expo agrícola" placeholderTextColor={colors.gray} />
            <Text style={st.label}>Descripción</Text>
            <TextInput
              style={[st.input, { minHeight: 90, textAlignVertical: 'top' }]}
              value={descripcion}
              onChangeText={setDescripcion}
              multiline
              placeholder="Describe qué necesitas y cómo imaginas el diseño…"
              placeholderTextColor={colors.gray}
            />
            <TouchableOpacity style={[st.primary, busy && { opacity: 0.6 }]} onPress={submit} disabled={busy}>
              {busy ? <ActivityIndicator color="#fff" /> : <Text style={st.primaryTxt}>Enviar solicitud</Text>}
            </TouchableOpacity>
            <Text style={st.hint}>El equipo de marketing te responderá aquí mismo con avances del diseño.</Text>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ============================ Impresos (inventario) ============================

function ImpresosTab() {
  const [items, setItems] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [firstLoad, setFirstLoad] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [outItem, setOutItem] = useState(null); // artículo al que se registra salida

  const load = useCallback(async () => {
    setRefreshing(true);
    try { setItems(await api.mktPrintItems()); setLoadError(false); } catch { setLoadError(true); }
    setRefreshing(false); setFirstLoad(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  return (
    <View style={{ flex: 1 }}>
      {loadError && (
        <TouchableOpacity style={st.errBanner} onPress={load} accessibilityRole="button">
          <Text style={st.errBannerTxt}>Sin conexión · toca para reintentar</Text>
        </TouchableOpacity>
      )}
      <FlatList
        data={items}
        keyExtractor={(it) => String(it.id)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} />}
        contentContainerStyle={{ padding: 14 }}
        ListEmptyComponent={firstLoad
          ? <ActivityIndicator style={{ marginTop: 40 }} color={colors.red} />
          : (loadError ? null : <Text style={st.empty}>No hay material impreso registrado.</Text>)}
        renderItem={({ item }) => (
          <View style={st.card}>
            <View style={st.rowTop}>
              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
                {/* Semáforo de existencia: rojo si está bajo mínimo. */}
                <View style={[st.stockDot, { backgroundColor: item.bajoMinimo ? colors.err : colors.ok }]} accessibilityLabel={item.bajoMinimo ? 'Existencia baja' : 'Existencia normal'} />
                <Text style={st.cardTitle} numberOfLines={2}>{item.nombre}</Text>
              </View>
              <Text style={[st.stockNum, item.bajoMinimo && { color: colors.err }]}>{item.existencia}</Text>
            </View>
            <Text style={st.metaSmall}>{item.categoria ? item.categoria + ' · ' : ''}{item.unidad || 'pieza(s)'}{item.bajoMinimo ? ' · ⚠️ bajo mínimo' : ''}</Text>
            <View style={st.actionsRow}>
              <TouchableOpacity style={[st.actionBtn, st.actionBtnPrimary]} onPress={() => setOutItem(item)} accessibilityRole="button" accessibilityLabel={'Registrar salida de ' + item.nombre}>
                <Text style={st.actionTxtPrimary}>📤 Registrar salida</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
      <PrintOutModal item={outItem} onClose={() => setOutItem(null)} onDone={() => { setOutItem(null); load(); }} />
    </View>
  );
}

function PrintOutModal({ item, onClose, onDone }) {
  const [cantidad, setCantidad] = useState('');
  const [motivo, setMotivo] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (item) { setCantidad(''); setMotivo(''); } }, [item]);

  async function submit() {
    const qty = Number(String(cantidad).replace(',', '.').replace(/[^0-9.]/g, ''));
    if (!qty || qty <= 0) return Alert.alert('Cantidad inválida', 'Escribe cuántas unidades salieron.');
    if (!motivo.trim()) return Alert.alert('Falta el motivo', 'Indica para qué se usó el material (cliente, evento, etc.).');
    setBusy(true);
    try {
      await api.mktPrintOut({ itemId: item.id, tipo: 'salida', cantidad: qty, motivo: motivo.trim() });
      Alert.alert('Salida registrada', `${qty} ${item.unidad || 'unidad(es)'} de ${item.nombre}.`);
      onDone();
    } catch (e) {
      if (e.status === 409) {
        Alert.alert('Existencia insuficiente', `Solo hay ${item.existencia} ${item.unidad || 'unidad(es)'} de "${item.nombre}". Ajusta la cantidad o avisa a marketing para reponer.`);
      } else if (e.offline) {
        Alert.alert('Sin conexión', 'No se pudo registrar la salida. Intenta cuando tengas señal.');
      } else {
        Alert.alert('No se pudo registrar', e.message);
      }
    } finally { setBusy(false); }
  }

  return (
    <Modal visible={!!item} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={st.sheetWrap}>
        <View style={st.sheet}>
          <View style={st.sheetHead}>
            <Text style={st.sheetTitle}>Registrar salida</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityRole="button" accessibilityLabel="Cerrar"><Text style={st.close}>✕</Text></TouchableOpacity>
          </View>
          {item && (<ScrollView>
            <Text style={st.cardTitle}>{item.nombre}</Text>
            <Text style={st.metaSmall}>Existencia actual: {item.existencia} {item.unidad || 'unidad(es)'}</Text>
            <Text style={st.label}>Cantidad *</Text>
            <TextInput style={st.input} value={cantidad} onChangeText={setCantidad} keyboardType="numeric" placeholder="0" placeholderTextColor={colors.gray} accessibilityLabel="Cantidad de salida" />
            <Text style={st.label}>Motivo *</Text>
            <TextInput style={st.input} value={motivo} onChangeText={setMotivo} placeholder="p. ej. Entrega a cliente en Zamora" placeholderTextColor={colors.gray} />
            <TouchableOpacity style={[st.primary, busy && { opacity: 0.6 }]} onPress={submit} disabled={busy}>
              {busy ? <ActivityIndicator color="#fff" /> : <Text style={st.primaryTxt}>Registrar salida</Text>}
            </TouchableOpacity>
          </ScrollView>)}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// =================================== Estilos ===================================

const st = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  // tabs
  tabs: { flexDirection: 'row', backgroundColor: colors.white, paddingHorizontal: 8, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.lightGray, gap: 6 },
  tabChip: { flex: 1, minHeight: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', paddingVertical: 6, backgroundColor: colors.bg },
  tabChipOn: { backgroundColor: '#fdecec', borderWidth: 1, borderColor: colors.red },
  tabIcon: { fontSize: 16 },
  tabTxt: { fontSize: 11, color: colors.gray, fontWeight: '700', marginTop: 1 },
  tabTxtOn: { color: colors.red },
  // búsqueda / filtros
  searchWrap: { backgroundColor: colors.white, paddingHorizontal: 14, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: colors.lightGray },
  search: { backgroundColor: colors.bg, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: colors.black, marginTop: 10 },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  chip: { borderWidth: 1, borderColor: colors.lightGray, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8, minHeight: 36, justifyContent: 'center' },
  chipOn: { backgroundColor: '#fdecec', borderColor: colors.red },
  chipTxt: { color: colors.gray, fontWeight: '600', fontSize: 12 },
  chipTxtOn: { color: colors.red },
  // listas / tarjetas
  card: { backgroundColor: colors.white, borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: colors.lightGray },
  cardTitle: { fontWeight: '700', color: colors.black, fontSize: 15 },
  meta: { color: colors.gray, marginTop: 2, fontSize: 13 },
  metaSmall: { color: colors.gray, marginTop: 3, fontSize: 12 },
  rowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  empty: { textAlign: 'center', color: colors.gray, marginTop: 40, paddingHorizontal: 20 },
  errBanner: { backgroundColor: '#fff7e6', paddingVertical: 12, paddingHorizontal: 14, minHeight: 44, justifyContent: 'center' },
  errBannerTxt: { color: '#92400E', textAlign: 'center', fontSize: 12, fontWeight: '600' },
  // miniaturas del banco
  thumb: { width: '100%', height: 160, borderRadius: 10, backgroundColor: colors.bg },
  thumbFallback: { width: '100%', height: 90, borderRadius: 10, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  thumbIcon: { fontSize: 30 },
  thumbTitle: { color: colors.gray, fontSize: 12, marginTop: 4, fontWeight: '600' },
  // acciones
  actionsRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  actionBtn: { flex: 1, minHeight: 44, borderWidth: 1, borderColor: colors.lightGray, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingVertical: 11 },
  actionBtnPrimary: { backgroundColor: colors.red, borderColor: colors.red },
  actionTxt: { color: colors.black, fontWeight: '700' },
  actionTxtPrimary: { color: '#fff', fontWeight: '700' },
  // publicaciones
  redBadge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
  redBadgeTxt: { color: '#fff', fontWeight: '800', fontSize: 12 },
  copyBox: { backgroundColor: colors.bg, borderRadius: 10, padding: 12, marginTop: 10 },
  copyTxt: { color: colors.black, fontSize: 13, lineHeight: 19 },
  // formatos
  folio: { fontWeight: '800', color: colors.black },
  tag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  tagTxt: { fontWeight: '700', fontSize: 12 },
  thread: { marginTop: 12, borderTopWidth: 1, borderTopColor: colors.bg, paddingTop: 10 },
  msg: { backgroundColor: colors.bg, borderRadius: 10, padding: 10, marginBottom: 8 },
  msgAuthor: { fontWeight: '700', color: colors.black, fontSize: 12 },
  msgTxt: { color: colors.black, marginTop: 2, fontSize: 13 },
  replyRow: { flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 4 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.red, alignItems: 'center', justifyContent: 'center' },
  sendTxt: { color: '#fff', fontSize: 18, fontWeight: '800' },
  fab: { position: 'absolute', right: 18, bottom: 22, backgroundColor: colors.red, borderRadius: 26, paddingHorizontal: 20, paddingVertical: 14, elevation: 4, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 6, shadowOffset: { width: 0, height: 3 } },
  fabTxt: { color: '#fff', fontWeight: '800' },
  // impresos
  stockDot: { width: 12, height: 12, borderRadius: 6, marginRight: 8 },
  stockNum: { fontWeight: '800', color: colors.black, fontSize: 18, marginLeft: 10 },
  // proyectos / aportes de campo
  introBox: { backgroundColor: '#eef4ff', paddingHorizontal: 14, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: colors.lightGray },
  introTxt: { color: '#1e40af', fontSize: 12, lineHeight: 17 },
  notaBox: { backgroundColor: colors.bg, borderRadius: 10, padding: 10, marginTop: 10 },
  notaTxt: { color: colors.black, fontSize: 13, lineHeight: 18 },
  pubTxt: { color: colors.ok, fontWeight: '700', fontSize: 12, marginTop: 8 },
  threadToggle: { color: colors.red, fontWeight: '700', fontSize: 12, marginTop: 10 },
  twoCol: { flexDirection: 'row', gap: 12 },
  col: { flex: 1 },
  cameraBox: { height: 220, borderRadius: 14, overflow: 'hidden', backgroundColor: '#000', borderWidth: 1, borderColor: colors.lightGray, marginBottom: 10 },
  secondary: { borderWidth: 1, borderColor: colors.red, borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginTop: 2 },
  secondaryTxt: { color: colors.red, fontWeight: '700' },
  thumbWrap: { marginRight: 8, position: 'relative' },
  aporteThumb: { width: 84, height: 84, borderRadius: 10, backgroundColor: colors.bg },
  thumbX: { position: 'absolute', top: -6, right: -6, width: 24, height: 24, borderRadius: 12, backgroundColor: colors.red, alignItems: 'center', justifyContent: 'center' },
  thumbXTxt: { color: '#fff', fontWeight: '800', fontSize: 12 },
  // sheet compartido
  sheetWrap: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.bg, borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 18, maxHeight: '90%' },
  sheetHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  sheetTitle: { fontSize: 18, fontWeight: '800', color: colors.black },
  close: { fontSize: 20, color: colors.gray },
  label: { color: colors.black, fontWeight: '700', marginTop: 12, marginBottom: 6 },
  input: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.lightGray, borderRadius: 10, padding: 12, color: colors.black },
  primary: { backgroundColor: colors.red, borderRadius: 12, paddingVertical: 15, alignItems: 'center', marginTop: 20 },
  primaryTxt: { color: '#fff', fontWeight: '700', fontSize: 16 },
  hint: { color: colors.gray, fontSize: 12, textAlign: 'center', marginTop: 12, marginBottom: 10 },
});
