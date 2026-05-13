import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { getReplays } from '../services/api';

type ReplayItem = {
  id: string;
  filename: string;
  size: string;
  video_url: string;
};

// 🎞️ Novo Subcomponente: Cada vídeo precisa do seu próprio player nativo
const ReplayCard = ({ item }: { item: ReplayItem }) => {
  const player = useVideoPlayer(item.video_url, player => {
    player.loop = false; // Não repete sozinho
  });

  return (
    <View style={styles.card}>
      <Text style={styles.title}>⚽ Lance Oficial</Text>
      
      <View style={styles.videoContainer}>
        <VideoView
          style={styles.video}
          player={player}
          allowsFullscreen
          allowsPictureInPicture
        />
      </View>
      
      <Text style={styles.subtitle}>Arquivo: {item.filename}</Text>
      <Text style={styles.subtitle}>Tamanho: {item.size}</Text>
    </View>
  );
};

export default function HomeScreen() {
  const [replays, setReplays] = useState<ReplayItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carregarVideos();
  }, []);

  const carregarVideos = async () => {
    setLoading(true);
    try {
      const data = await getReplays();
      setReplays(data);
    } catch (error) {
      console.error("Erro ao carregar vídeos:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Galeria de Replays</Text>
      
      {loading ? (
        <ActivityIndicator size="large" color="#D30000" style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={replays}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <ReplayCard item={item} />}
          ListEmptyComponent={<Text style={styles.empty}>Nenhum replay na nuvem ainda.</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1A1A1A', padding: 20, marginTop: 40 },
  header: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, color: '#FFF' },
  card: { backgroundColor: '#2A2A2A', padding: 15, borderRadius: 10, marginBottom: 20, elevation: 5 },
  videoContainer: { width: '100%', height: 200, marginTop: 10, marginBottom: 10, backgroundColor: '#000', borderRadius: 8, overflow: 'hidden' },
  video: { width: '100%', height: '100%' },
  title: { fontSize: 18, fontWeight: 'bold', color: '#FFF' },
  subtitle: { color: '#AAA', marginTop: 2, fontSize: 12 },
  empty: { textAlign: 'center', marginTop: 50, color: '#999', fontSize: 16 }
});