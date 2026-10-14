// ============================================================
//  components/AoVivoCard.tsx — Transmissão ao vivo no topo do feed
//  O vídeo vem do YouTube (aguenta qualquer audiência, de graça).
//  Por cima, o placar estilo TV com os dados que o totem manda pro
//  servidor — atrasado o mesmo tanto que a transmissão, pra o gol não
//  aparecer no placar antes de aparecer no vídeo.
// ============================================================

import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Linking, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { getPlacar, idDoYoutube, PlacarAoVivo } from '../services/api';

type Leitura = { em: number; dados: PlacarAoVivo };

function formatarTempo(ms: number) {
  const total = Math.ceil(Math.abs(ms) / 1000);
  const m = String(Math.floor(total / 60)).padStart(2, '0');
  const s = String(total % 60).padStart(2, '0');
  return `${ms < 0 ? '+' : ''}${m}:${s}`;
}

export default function AoVivoCard({ url, titulo, arenaId, atrasoSeg }: {
  url: string;
  titulo?: string;
  arenaId?: string;
  atrasoSeg: number;
}) {
  const idVideo = idDoYoutube(url);
  const leituras = useRef<Leitura[]>([]);
  const [agora, setAgora] = useState(Date.now());
  const pulso = useRef(new Animated.Value(1)).current;

  // Bolinha vermelha pulsando
  useEffect(() => {
    const anim = Animated.loop(Animated.sequence([
      Animated.timing(pulso, { toValue: 0.25, duration: 700, useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(pulso, { toValue: 1, duration: 700, useNativeDriver: Platform.OS !== 'web' }),
    ]));
    anim.start();
    return () => anim.stop();
  }, [pulso]);

  // Consulta o placar a cada 2s e guarda o histórico recente (pro atraso)
  useEffect(() => {
    if (!arenaId) return;
    let vivo = true;
    const buscar = async () => {
      const dados = await getPlacar(arenaId);
      if (!vivo) return;
      leituras.current.push({ em: Date.now(), dados });
      const limite = Date.now() - (atrasoSeg + 30) * 1000;
      while (leituras.current.length > 2 && leituras.current[1].em < limite) leituras.current.shift();
    };
    buscar();
    const t = setInterval(buscar, 2000);
    return () => { vivo = false; clearInterval(t); };
  }, [arenaId, atrasoSeg]);

  // Relógio da tela
  useEffect(() => {
    const t = setInterval(() => setAgora(Date.now()), 500);
    return () => clearInterval(t);
  }, []);

  // Placar como estava "atrasoSeg" atrás. Nos primeiros segundos (ainda sem
  // histórico tão antigo) usa a leitura mais velha que tiver.
  const momento = agora - atrasoSeg * 1000;
  const lidas = leituras.current.filter(l => l.em <= momento);
  const leitura = lidas[lidas.length - 1] || leituras.current[0];
  const placar = leitura?.dados.ativo ? leitura.dados : null;
  const restante = placar
    ? (placar.restante_ms ?? 0) - (placar.timer_estado === 'rodando' ? momento - leitura!.em : 0)
    : 0;

  const abrirNoYoutube = () => Linking.openURL(url);

  return (
    <View style={styles.card}>
      <View style={styles.topo}>
        <Animated.View style={[styles.bolinha, { opacity: pulso }]} />
        <Text style={styles.aoVivo}>AO VIVO</Text>
        {!!titulo && <Text style={styles.titulo} numberOfLines={1}>{titulo}</Text>}
      </View>

      <View style={styles.video}>
        {Platform.OS === 'web' && idVideo ? (
          React.createElement('iframe', {
            src: `https://www.youtube.com/embed/${idVideo}?autoplay=1&mute=1&playsinline=1&rel=0`,
            title: 'Transmissão ao vivo',
            allow: 'autoplay; encrypted-media; picture-in-picture; fullscreen',
            allowFullScreen: true,
            style: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 0 },
          })
        ) : (
          <TouchableOpacity style={styles.semPlayer} onPress={abrirNoYoutube} activeOpacity={0.8}>
            <Ionicons name="logo-youtube" size={54} color="#FF0000" />
            <Text style={styles.semPlayerTexto}>Assistir a transmissão</Text>
          </TouchableOpacity>
        )}

        {placar && (
          <View style={styles.placar} pointerEvents="none">
            <View style={styles.placarTimes}>
              <View style={styles.time}>
                <Text style={[styles.timeNome, { borderTopColor: '#D30000' }]} numberOfLines={1}>{placar.nomeA}</Text>
                <Text style={styles.timeGols}>{placar.golsA}</Text>
              </View>
              <View style={[styles.time, styles.timeDireita]}>
                <Text style={[styles.timeNome, { borderTopColor: '#FFD700' }]} numberOfLines={1}>{placar.nomeB}</Text>
                <Text style={styles.timeGols}>{placar.golsB}</Text>
              </View>
            </View>
            <View style={styles.placarRelogio}>
              <Text style={styles.placarJogo}>J{placar.jogo}</Text>
              <Text style={[
                styles.placarTempo,
                placar.timer_estado === 'parado' && { color: '#9A8CC0' },
                placar.timer_estado === 'pausado' && { color: '#FFD700' },
                placar.timer_estado === 'rodando' && restante < 0 && { color: '#FF5252' },
              ]}>
                {formatarTempo(restante)}
              </Text>
            </View>
          </View>
        )}
      </View>

      <TouchableOpacity style={styles.rodape} onPress={abrirNoYoutube}>
        <Ionicons name="logo-youtube" size={15} color="#AAA" />
        <Text style={styles.rodapeTexto}>Abrir no YouTube (tela cheia e chat)</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#0A0A0A', borderBottomWidth: 1, borderBottomColor: '#1E1E1E', paddingBottom: 6, marginBottom: 8 },
  topo: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 10 },
  bolinha: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#FF1E1E' },
  aoVivo: { color: '#FF1E1E', fontWeight: '900', fontSize: 14, letterSpacing: 1 },
  titulo: { color: '#FFF', fontWeight: '700', fontSize: 14, flex: 1 },
  video: { width: '100%', aspectRatio: 16 / 9, backgroundColor: '#000', position: 'relative', overflow: 'hidden' },
  semPlayer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  semPlayerTexto: { color: '#FFF', fontWeight: '700', fontSize: 15 },
  placar: {
    position: 'absolute', top: 8, left: 8, width: 150,
    borderRadius: 5, overflow: 'hidden',
  },
  placarTimes: { flexDirection: 'row' },
  time: { flex: 1, alignItems: 'stretch' },
  timeDireita: { borderLeftWidth: 1, borderLeftColor: 'rgba(255,255,255,0.15)' },
  timeNome: {
    backgroundColor: '#4A2391', color: '#FFF', textAlign: 'center',
    fontSize: 13, fontWeight: '900', paddingVertical: 3, paddingHorizontal: 2,
    borderTopWidth: 3,
  },
  timeGols: {
    backgroundColor: '#2B0E5E', color: '#FFF', textAlign: 'center',
    fontSize: 24, fontWeight: '900', paddingVertical: 1,
  },
  placarRelogio: { flexDirection: 'row', backgroundColor: '#1A0840' },
  placarJogo: {
    backgroundColor: '#9BE15D', color: '#12002E', fontWeight: '900', fontSize: 13,
    paddingHorizontal: 8, paddingVertical: 3, textAlignVertical: 'center',
  },
  placarTempo: { flex: 1, color: '#FFF', textAlign: 'center', fontSize: 17, fontWeight: '900', paddingVertical: 2 },
  rodape: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingTop: 8 },
  rodapeTexto: { color: '#AAA', fontSize: 12, fontWeight: '600' },
});
