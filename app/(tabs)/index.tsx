import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useState, useMemo } from "react";
import {
    ActivityIndicator,
    Dimensions,
    FlatList,
    Image,
    RefreshControl,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    KeyboardAvoidingView,
    Platform
} from "react-native";
import { useVideoPlayer, VideoView } from "expo-video";
import { getReplays } from "../../services/api";

const { width } = Dimensions.get("window");

type ReplayVideo = {
  id: string;
  filename: string;
  created_at: string;
  arena: string;
  likes: number;
  views?: number;
  thumbnail_url?: string;
};

// Formatação de data amigável
const formatarData = (dataString: string) => {
    if (!dataString) return '';
    const data = new Date(dataString);
    return data.toLocaleDateString('pt-BR', { 
        day: '2-digit', 
        month: 'short', 
        hour: '2-digit', 
        minute: '2-digit' 
    }).replace('.', '');
};

const NativeVideoPlayer = ({ videoUrl }: { videoUrl: string }) => {
  const player = useVideoPlayer(videoUrl, player => {
    player.loop = false;
    player.play(); 
  });
  return <VideoView player={player} style={styles.videoPlayer} allowsFullscreen />;
};

export default function ReplaysScreen() {
  const [replays, setReplays] = useState<ReplayVideo[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<ReplayVideo | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadReplays = async () => {
    try {
      const data = await getReplays();
      // Filtra apenas vídeos e ordena pelo mais recente primeiro
      const apenasVideos = data
        .filter((f: any) => f.filename.toLowerCase().endsWith('.webm') || f.filename.toLowerCase().endsWith('.mp4'))
        .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setReplays(apenasVideos);
      
      // Auto-seleciona o lance mais recente se nada estiver selecionado
      if (apenasVideos.length > 0 && !selectedVideo) {
        setSelectedVideo(apenasVideos[0]);
      }
    } catch (error) {
      console.error("Erro ao carregar:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { loadReplays(); }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadReplays();
  }, [selectedVideo]);

  // Organização em Seções: Hoje, Ontem e Mais Antigos
  const sections = useMemo(() => {
    const hoje: ReplayVideo[] = [];
    const anterior: ReplayVideo[] = [];
    const agora = new Date();

    replays.forEach(v => {
      const dataV = new Date(v.created_at);
      const diffInDays = Math.floor((agora.getTime() - dataV.getTime()) / (1000 * 3600 * 24));
      
      if (diffInDays === 0) hoje.push(v);
      else anterior.push(v);
    });

    return [
      { title: "🔥 Lances de Hoje", data: hoje },
      { title: "📅 Lances Recentes", data: anterior },
    ].filter(s => s.data.length > 0);
  }, [replays]);

  if (loading && !refreshing) {
    return <View style={styles.loader}><ActivityIndicator size="large" color="#D30000" /></View>;
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      <View style={styles.header}>
        <Text style={styles.headerLogo}>REPLAY<Text style={{color: '#D30000'}}>FLIX</Text></Text>
        <TouchableOpacity style={styles.refreshBadge} onPress={onRefresh}>
          <Ionicons name="refresh" size={18} color="#FFF" />
          <Text style={styles.refreshText}>Atualizar</Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#D30000" title="Buscando golaços..." titleColor="#FFF" />}
      >
        {/* AREA DO PLAYER - SEMPRE DINÂMICA */}
        <View style={styles.heroArea}>
          {selectedVideo ? (
            <NativeVideoPlayer key={selectedVideo.id} videoUrl={`https://replayflix-backend.onrender.com/uploads/${selectedVideo.filename}`} />
          ) : (
            <View style={styles.emptyPlayer}>
              <Ionicons name="football" size={50} color="#333" />
              <Text style={styles.emptyText}>Nenhum lance selecionado</Text>
            </View>
          )}
        </View>

        {selectedVideo && (
          <View style={styles.mainInfo}>
            <View style={styles.infoRow}>
               <Text style={styles.mainTitle}>Golaço - {selectedVideo.arena}</Text>
               <View style={styles.liveBadge}><Text style={styles.liveText}>HD</Text></View>
            </View>
            <Text style={styles.mainDate}>{formatarData(selectedVideo.created_at)}</Text>
            
            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.mainActionBtn}>
                <Ionicons name="heart" size={20} color="#D30000" />
                <Text style={styles.actionLabel}>{selectedVideo.likes || 0} Curtidas</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.mainActionBtn}>
                <Ionicons name="share-social" size={20} color="#FFF" />
                <Text style={styles.actionLabel}>Compartilhar</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* LISTAGEM ESTILO CARROSSEL PREMIUM */}
        {sections.length === 0 ? (
          <View style={styles.noVideosArea}>
            <Ionicons name="cloud-offline-outline" size={40} color="#222" />
            <Text style={styles.noVideosText}>Nenhum lance encontrado. Grave um agora!</Text>
          </View>
        ) : (
          sections.map((section, i) => (
            <View key={i} style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              <FlatList
                horizontal
                data={section.data}
                keyExtractor={item => item.id}
                showsHorizontalScrollIndicator={false}
                renderItem={({ item }) => (
                  <TouchableOpacity 
                    style={[styles.premiumCard, selectedVideo?.id === item.id && styles.activeCard]} 
                    onPress={() => setSelectedVideo(item)}
                  >
                    <Image 
                      source={{ uri: item.thumbnail_url || 'https://via.placeholder.com/180x100/111/D30000?text=Replay' }} 
                      style={styles.cardImage} 
                    />
                    <View style={styles.cardOverlay}>
                       <Ionicons name="play-circle" size={24} color="#FFF" />
                    </View>
                    <View style={styles.cardContent}>
                      <Text style={styles.cardTitle} numberOfLines={1}>{item.arena}</Text>
                      <Text style={styles.cardSubtitle}>{formatarData(item.created_at).split(',')[0]}</Text>
                    </View>
                  </TouchableOpacity>
                )}
                contentContainerStyle={{ paddingLeft: 20 }}
              />
            </View>
          ))
        )}
        
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#080808" },
  loader: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  
  header: { 
    paddingTop: 60, 
    paddingHorizontal: 20, 
    paddingBottom: 15, 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    backgroundColor: '#080808'
  },
  headerLogo: { color: "#FFF", fontSize: 24, fontWeight: "900", fontStyle: 'italic' },
  refreshBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1A1A1A', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  refreshText: { color: '#FFF', fontSize: 12, marginLeft: 5, fontWeight: '600' },

  heroArea: { width: width, aspectRatio: 16 / 9, backgroundColor: "#000", elevation: 10 },
  videoPlayer: { flex: 1 },
  emptyPlayer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#111' },
  emptyText: { color: '#333', marginTop: 10, fontWeight: '600' },

  mainInfo: { padding: 20, backgroundColor: '#080808' },
  infoRow: { flexDirection: 'row', alignItems: 'center' },
  mainTitle: { color: '#FFF', fontSize: 22, fontWeight: 'bold', flex: 1 },
  liveBadge: { backgroundColor: '#D30000', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  liveText: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },
  mainDate: { color: '#888', fontSize: 13, marginTop: 4 },
  
  actionRow: { flexDirection: 'row', marginTop: 20, borderTopWidth: 1, borderTopColor: '#1A1A1A', paddingTop: 15 },
  mainActionBtn: { flexDirection: 'row', alignItems: 'center', marginRight: 30 },
  actionLabel: { color: '#FFF', marginLeft: 8, fontSize: 13, fontWeight: '500' },

  sectionContainer: { marginTop: 30 },
  sectionTitle: { color: '#FFF', fontSize: 17, fontWeight: '800', marginLeft: 20, marginBottom: 15, textTransform: 'uppercase', letterSpacing: 1 },
  
  premiumCard: { width: 180, marginRight: 15, backgroundColor: '#121212', borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#1A1A1A' },
  activeCard: { borderColor: '#D30000', borderWidth: 2 },
  cardImage: { width: '100%', height: 100, backgroundColor: '#222' },
  cardOverlay: { position: 'absolute', top: 35, left: 75 },
  cardContent: { padding: 10 },
  cardTitle: { color: '#FFF', fontSize: 13, fontWeight: 'bold' },
  cardSubtitle: { color: '#666', fontSize: 11, marginTop: 2 },

  noVideosArea: { padding: 40, alignItems: 'center', justifyContent: 'center' },
  noVideosText: { color: '#222', textAlign: 'center', marginTop: 10, fontWeight: '600' }
});