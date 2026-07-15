// ============================================================
//  app/destaque.tsx — Vídeo de destaque (admin)
//  Sobe/troca o vídeo de propaganda que aparece no topo do feed
//  (e quando o feed está vazio). Espaço reutilizável pra merchan.
// ============================================================

import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { AppConfig, getConfig, salvarDestaque } from '../services/api';

export default function DestaqueScreen() {
  const [titulo, setTitulo] = useState('');
  const [ativo, setAtivo] = useState(true);
  const [videoUri, setVideoUri] = useState<string | null>(null); // novo vídeo escolhido
  const [temVideoAtual, setTemVideoAtual] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);

  const avisar = (t: string, m: string) => {
    if (Platform.OS === 'web') window.alert(`${t}\n\n${m}`);
    else Alert.alert(t, m);
  };

  useEffect(() => {
    getConfig()
      .then((c: AppConfig) => {
        setTitulo(c.destaque_titulo || '');
        setAtivo(c.destaque_ativo !== '0');
        setTemVideoAtual(!!c.destaque_video_url);
      })
      .finally(() => setCarregando(false));
  }, []);

  const escolherVideo = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      avisar('Permissão', 'Precisamos de acesso à galeria pra escolher o vídeo.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      quality: 1,
    });
    if (!result.canceled && result.assets[0]) {
      setVideoUri(result.assets[0].uri);
    }
  };

  const salvar = async () => {
    if (!temVideoAtual && !videoUri) {
      avisar('Atenção', 'Escolha um vídeo primeiro.');
      return;
    }
    setSalvando(true);
    const res = await salvarDestaque({ titulo: titulo.trim(), ativo }, videoUri);
    setSalvando(false);
    if (res.ok) {
      avisar('Pronto!', 'Vídeo de destaque salvo. Ele já aparece no topo do feed.');
      router.back();
    } else {
      avisar('Erro', res.erro || 'Não foi possível salvar.');
    }
  };

  if (carregando) {
    return (
      <View style={[styles.container, { justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color="#D30000" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={28} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Vídeo de destaque</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <Text style={styles.explica}>
          Esse vídeo aparece no <Text style={{ color: '#FFD54A' }}>topo do feed</Text> pra todo mundo —
          ótimo pra explicar como o ReplayFlix funciona, mostrar pra alguém ou usar como merchan.
        </Text>

        <TouchableOpacity style={styles.picker} onPress={escolherVideo} activeOpacity={0.85}>
          <Ionicons name={videoUri ? 'checkmark-circle' : 'cloud-upload-outline'} size={30} color={videoUri ? '#00C853' : '#888'} />
          <Text style={styles.pickerText}>
            {videoUri ? 'Novo vídeo selecionado ✓' : temVideoAtual ? 'Trocar o vídeo atual' : 'Escolher vídeo'}
          </Text>
          <Text style={styles.pickerHint}>MP4, de preferência na horizontal (16:9)</Text>
        </TouchableOpacity>

        <Text style={styles.label}>Título / chamada (opcional)</Text>
        <TextInput
          style={styles.input}
          placeholder="Ex: Conheça o ReplayFlix"
          placeholderTextColor="#666"
          value={titulo}
          onChangeText={setTitulo}
          maxLength={100}
        />

        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowTitle}>Mostrar no feed</Text>
            <Text style={styles.rowSub}>Desligue pra esconder sem apagar o vídeo.</Text>
          </View>
          <Switch value={ativo} onValueChange={setAtivo} trackColor={{ false: '#333', true: '#00A344' }} thumbColor="#fff" />
        </View>

        <TouchableOpacity style={[styles.saveBtn, salvando && { opacity: 0.6 }]} onPress={salvar} disabled={salvando}>
          {salvando ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveBtnText}>Salvar</Text>}
        </TouchableOpacity>
        {salvando && !!videoUri && (
          <Text style={styles.enviando}>Enviando o vídeo... pode levar um tempinho dependendo do tamanho.</Text>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0A' },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 45,
    paddingBottom: 15, paddingHorizontal: 12,
    borderBottomWidth: 1, borderBottomColor: '#222',
  },
  backBtn: { padding: 5 },
  headerTitle: { flex: 1, color: '#FFF', fontSize: 19, fontWeight: '900', textAlign: 'center' },
  explica: { color: '#AAA', fontSize: 14, lineHeight: 21, marginBottom: 22 },
  picker: {
    backgroundColor: '#141414', borderRadius: 16, borderWidth: 1, borderColor: '#2A2A2A',
    padding: 26, alignItems: 'center', gap: 8,
  },
  pickerText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  pickerHint: { color: '#777', fontSize: 12 },
  label: { color: '#999', fontSize: 12, fontWeight: '600', marginTop: 24, marginBottom: 8, textTransform: 'uppercase' },
  input: {
    backgroundColor: '#1A1A1A', color: '#FFF', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, borderWidth: 1, borderColor: '#222',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 24 },
  rowTitle: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  rowSub: { color: '#888', fontSize: 12, marginTop: 3 },
  saveBtn: { backgroundColor: '#D30000', paddingVertical: 15, borderRadius: 12, alignItems: 'center', marginTop: 30 },
  saveBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  enviando: { color: '#B8A24A', fontSize: 12, textAlign: 'center', marginTop: 12 },
});
