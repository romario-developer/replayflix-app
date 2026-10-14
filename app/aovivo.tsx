// ============================================================
//  app/aovivo.tsx — Transmissão ao vivo (admin)
//  Cola o link da live do YouTube, escolhe a arena (de onde vem o
//  placar do totem) e liga. Aparece no topo do feed pra todo mundo.
// ============================================================

import { Ionicons } from '@expo/vector-icons';
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
import { AppConfig, Arena, getArenas, getConfig, idDoYoutube, salvarAoVivo } from '../services/api';

export default function AoVivoScreen() {
  const [url, setUrl] = useState('');
  const [titulo, setTitulo] = useState('');
  const [arenaId, setArenaId] = useState('');
  const [atraso, setAtraso] = useState('15');
  const [ativo, setAtivo] = useState(true);
  const [arenas, setArenas] = useState<Arena[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);

  const avisar = (t: string, m: string) => {
    if (Platform.OS === 'web') window.alert(`${t}\n\n${m}`);
    else Alert.alert(t, m);
  };

  useEffect(() => {
    Promise.all([getConfig(), getArenas()])
      .then(([c, lista]: [AppConfig, Arena[]]) => {
        setUrl(c.aovivo_url || '');
        setTitulo(c.aovivo_titulo || '');
        setArenaId(c.aovivo_arena_id || '');
        setAtraso(c.aovivo_atraso || '15');
        setAtivo(c.aovivo_ativo !== '0');
        setArenas(lista);
      })
      .finally(() => {
        setCarregando(false);
        // Aberta direto pelo endereço: tira a tela de abertura (senão espera 20s)
        if (typeof window !== 'undefined' && (window as any).__splashDone) (window as any).__splashDone();
      });
  }, []);

  const linkValido = !!idDoYoutube(url);

  const salvar = async (ligar: boolean) => {
    if (ligar && !linkValido) {
      avisar('Link do YouTube', 'Cole o link da transmissão (ex: youtube.com/live/... ou youtu.be/...).');
      return;
    }
    if (ligar && !arenaId) {
      avisar('Arena', 'Escolha a arena — é de lá que vem o placar do totem.');
      return;
    }
    setSalvando(true);
    const res = await salvarAoVivo({
      url: url.trim(), titulo: titulo.trim(), arena_id: arenaId,
      atraso: parseInt(atraso, 10) || 0, ativo: ligar,
    });
    setSalvando(false);
    if (res.ok) {
      setAtivo(ligar);
      avisar('Pronto!', ligar
        ? 'Transmissão no ar! Ela aparece no topo do feed em até 1 minuto.'
        : 'Transmissão encerrada. O cartão sai do feed em até 1 minuto.');
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
        <Text style={styles.headerTitle}>Transmissão ao vivo</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <Text style={styles.explica}>
          Transmita o jogo pelo <Text style={{ color: '#FF4D4D' }}>YouTube</Text> (app do YouTube ou Larix
          Broadcaster) e cole o link aqui. O app mostra a transmissão no topo do feed com o
          <Text style={{ color: '#FFD54A' }}> placar do totem por cima</Text>.
        </Text>

        <Text style={styles.label}>Link da transmissão no YouTube</Text>
        <TextInput
          style={[styles.input, !!url && !linkValido && styles.inputErro]}
          placeholder="https://youtube.com/live/..."
          placeholderTextColor="#666"
          value={url}
          onChangeText={setUrl}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {!!url && !linkValido && (
          <Text style={styles.erro}>Esse link não parece de um vídeo/live do YouTube.</Text>
        )}

        <Text style={styles.label}>Título (aparece ao lado do “AO VIVO”)</Text>
        <TextInput
          style={styles.input}
          placeholder="Ex: Final do Municipal de Futsal"
          placeholderTextColor="#666"
          value={titulo}
          onChangeText={setTitulo}
          maxLength={100}
        />

        <Text style={styles.label}>Arena do jogo (de onde vem o placar)</Text>
        <View style={styles.arenas}>
          {arenas.map(a => (
            <TouchableOpacity
              key={a.id}
              style={[styles.arena, arenaId === a.id && styles.arenaAtiva]}
              onPress={() => setArenaId(a.id)}
            >
              <Ionicons name={arenaId === a.id ? 'radio-button-on' : 'radio-button-off'} size={18} color={arenaId === a.id ? '#FF4D4D' : '#666'} />
              <Text style={styles.arenaNome}>{a.nome}</Text>
              <Text style={styles.arenaCidade}>{a.cidade}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.dica}>O totem dessa arena precisa estar aberto pra o placar aparecer.</Text>

        <Text style={styles.label}>Atraso da transmissão (segundos)</Text>
        <TextInput
          style={[styles.input, { width: 110 }]}
          value={atraso}
          onChangeText={t => setAtraso(t.replace(/\D/g, '').slice(0, 3))}
          keyboardType="number-pad"
        />
        <Text style={styles.dica}>
          O YouTube mostra o jogo uns 10–20s atrasado. O placar espera o mesmo tanto pra o gol não
          aparecer antes do vídeo. Se o placar estiver adiantado, aumente; atrasado, diminua.
        </Text>

        <View style={styles.status}>
          <View style={[styles.statusBolinha, { backgroundColor: ativo ? '#FF1E1E' : '#444' }]} />
          <Text style={styles.statusTexto}>{ativo ? 'No ar agora' : 'Fora do ar'}</Text>
        </View>

        <TouchableOpacity style={[styles.saveBtn, salvando && { opacity: 0.6 }]} onPress={() => salvar(true)} disabled={salvando}>
          {salvando ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveBtnText}>{ativo ? 'Salvar e manter no ar' : 'Colocar no ar'}</Text>}
        </TouchableOpacity>
        {ativo && (
          <TouchableOpacity style={styles.offBtn} onPress={() => salvar(false)} disabled={salvando}>
            <Text style={styles.offBtnText}>Encerrar transmissão</Text>
          </TouchableOpacity>
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
  explica: { color: '#AAA', fontSize: 14, lineHeight: 21, marginBottom: 6 },
  label: { color: '#999', fontSize: 12, fontWeight: '600', marginTop: 22, marginBottom: 8, textTransform: 'uppercase' },
  input: {
    backgroundColor: '#1A1A1A', color: '#FFF', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, borderWidth: 1, borderColor: '#222',
  },
  inputErro: { borderColor: '#FF4D4D' },
  erro: { color: '#FF6B6B', fontSize: 12, marginTop: 6 },
  dica: { color: '#777', fontSize: 12, lineHeight: 17, marginTop: 8 },
  arenas: { gap: 8 },
  arena: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#141414', borderRadius: 12, borderWidth: 1, borderColor: '#222',
    paddingVertical: 12, paddingHorizontal: 14,
  },
  arenaAtiva: { borderColor: '#FF4D4D', backgroundColor: '#1F1010' },
  arenaNome: { color: '#FFF', fontSize: 15, fontWeight: '700', flex: 1 },
  arenaCidade: { color: '#888', fontSize: 12 },
  status: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 28 },
  statusBolinha: { width: 10, height: 10, borderRadius: 5 },
  statusTexto: { color: '#CCC', fontSize: 14, fontWeight: '700' },
  saveBtn: { backgroundColor: '#D30000', paddingVertical: 15, borderRadius: 12, alignItems: 'center', marginTop: 14 },
  saveBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  offBtn: { paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 10, borderWidth: 1, borderColor: '#333' },
  offBtnText: { color: '#AAA', fontSize: 15, fontWeight: '700' },
});
