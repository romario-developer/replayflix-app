import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ScreenOrientation from "expo-screen-orientation";
import React, { useCallback, useEffect, useState, useRef, useMemo } from "react";
import {
    Alert,
    FlatList,
    Image,
    ImageBackground,
    Modal,
    Platform,
    RefreshControl,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    Dimensions,
    ActivityIndicator
} from "react-native";
import YoutubePlayer from "react-native-youtube-iframe";
import { useVideoPlayer, VideoView } from "expo-video";
import { getReplays } from "../../services/api";

const { width } = Dimensions.get("window");

type ReplayVideo = {
  id: string;
  filename: string;
  size: string;
  created_at: string;
  arena: string;
  user_id?: string | number | null;
  likes: number;
  thumbnail_url?: string;
  views?: number;
};

// --- FORMATAÇÃO DE DATA BRASILEIRA ---
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

// --- COMPONENTE DE VÍDEO NATIVO ---
const NativeVideoPlayer = ({ videoUrl, onFinish }: { videoUrl: string, onFinish: () => void }) => {
  const player = useVideoPlayer(videoUrl, player => {
    player.loop = false;
    player.play(); 
  });

  useEffect(() => {
    const subscription = player.addListener('playToEnd', () => {
      onFinish();
    });
    return () => subscription.remove();
  }, [player]);

  return (
    <VideoView 
      player={player} 
      style={styles.videoPlayer} 
      allowsFullscreen 
      allowsPictureInPicture
    />
  );
};

export default function ReplaysScreen() {
  const [replays, setReplays] = useState<ReplayVideo[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<ReplayVideo | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState("");

  const loadReplays = async () => {
    try {
      const data = await getReplays();
      setReplays(data);
      if (data.length > 0 && !selectedVideo) {
        setSelectedVideo(data[0]);
      }
    } catch (error) {
      console.error("Erro ao carregar replays:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReplays();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadReplays();
    setRefreshing(false);
  }, []);

  // --- LÓGICA DE CATEGORIZAÇÃO (ESTILO FLIX) ---
  const sections = useMemo(() => {
    const hoje: ReplayVideo[] = [];
    const semana: ReplayVideo[] = [];
    const antigos: ReplayVideo[] = [];
    const agora = new Date();

    replays.forEach(video => {
      const dataVideo = new Date(video.created_at);
      const diffTime = Math.abs(agora.getTime() - dataVideo.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays <= 1) hoje.push(video);
      else if (diffDays <= 7) semana.push(video);
      else antigos.push(video);
    });

    return [
      { title: "🔥 Lances de Hoje", data: hoje },
      { title: "📅 Destaques da Semana", data: semana },
      { title: "⏳ Arquivo de Gols", data: antigos },
    ].filter(s => s.data.length > 0);
  }, [replays]);

  const renderVideoCard = ({ item }: { item: ReplayVideo }) => (
    <TouchableOpacity 
      style={styles.card} 
      onPress={() => setSelectedVideo(item)}
    >
      <Image 
        source={{ uri: item.thumbnail_url || 'https://via.placeholder.com/160x90/111/D30000?text=Replay' }} 
        style={styles.cardThumb} 
      />
      <View style={styles.cardInfo}>
        <Text style={styles.cardTitle} numberOfLines={1}>Golaço - {item.arena}</Text>
        <Text style={styles.cardDate}>{formatarData(item.created_at)}</Text>
      </View>
      {selectedVideo?.id === item.id && <View style={styles.activeIndicator} />}
    </TouchableOpacity>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#D30000" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.headerLogo}>REPLAY<Text style={{color: '#D30000'}}>FLIX</Text></Text>
        <View style={styles.headerIcons}>
          <TouchableOpacity style={{marginRight: 20}} onPress={onRefresh}>
            <Ionicons name="refresh" size={24} color="#FFF" />
          </TouchableOpacity>
          <TouchableOpacity>
            <Ionicons name="person-circle-outline" size={28} color="#FFF" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        stickyHeaderIndices={[1]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#D30000" />}
      >
        {/* PLAYER / BUMPER */}
        <View style={styles.videoBox}>
          {selectedVideo ? (
            <NativeVideoPlayer 
              videoUrl={`https://replayflix-backend.onrender.com/uploads/${selectedVideo.filename}`}
              onFinish={() => console.log("Fim")}
            />
          ) : (
            <View style={styles.bumperContainer}>
               <Text style={styles.bumperLogo}>REPLAY<Text style={styles.bumperHighlight}>FLIX</Text></Text>
               <Text style={styles.bumperSub}>SELECIONE UM LANCE PARA ASSISTIR</Text>
            </View>
          )}
        </View>

        {/* INFO E ESTATÍSTICAS */}
        {selectedVideo && (
          <View style={styles.detailsArea}>
            <Text style={styles.mainTitle}>Golaço - {selectedVideo.arena}</Text>
            <Text style={styles.mainDate}>🎥 {formatarData(selectedVideo.created_at)}</Text>
            
            <View style={styles.videoStatsBar}>
              <View style={styles.statItem}>
                <Ionicons name="play-outline" size={20} color="#D30000" />
                <Text style={styles.statText}>{selectedVideo.views || 0} views</Text>
              </View>
              <View style={styles.statItem}>
                <Ionicons name="heart" size={20} color="#D30000" />
                <Text style={styles.statText}>{selectedVideo.likes || 0} likes</Text>
              </View>
              <View style={styles.statItem}>
                <Ionicons name="time-outline" size={20} color="#D30000" />
                <Text style={styles.statText}>15s</Text>
              </View>
              <TouchableOpacity style={styles.statItem}>
                <Ionicons name="share-social-outline" size={20} color="#FFF" />
                <Text style={styles.statText}>Share</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* LISTAS HORIZONTAIS (NETFLIX STYLE) */}
        {sections.map((section, index) => (
          <View key={index} style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <FlatList
              horizontal
              data={section.data}
              renderItem={renderVideoCard}
              keyExtractor={(item) => item.id}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingLeft: 20, paddingRight: 10 }}
            />
          </View>
        ))}

        {/* SEÇÃO DE COMENTÁRIOS */}
        <View style={styles.commentSection}>
          <Text style={styles.sectionTitle}>Comentários</Text>
          <View style={styles.inputRow}>
            <TextInput 
              style={styles.input} 
              placeholder="Adicione um comentário..." 
              placeholderTextColor="#666"
              value={comment}
              onChangeText={setComment}
            />
            <TouchableOpacity style={styles.sendBtn}>
              <Ionicons name="send" size={20} color="#FFF" />
            </TouchableOpacity>
          </View>
          
          {/* Mock de comentário para preencher layout */}
          <View style={styles.commentItem}>
            <View style={styles.commentAvatar} />
            <View>
              <Text style={styles.commentUser}>Jogador Anonimo</Text>
              <Text style={styles.commentText}>Que golaço! Esse jogo foi épico.</Text>
            </View>
          </View>
        </View>
        
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  loaderContainer: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  
  header: {
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#000'
  },
  headerLogo: { color: "#FFF", fontSize: 22, fontWeight: "900", fontStyle: 'italic' },
  headerIcons: { flexDirection: 'row', alignItems: 'center' },
  
  videoBox: {
    width: width,
    aspectRatio: 16 / 9,
    backgroundColor: "#111",
  },
  videoPlayer: { flex: 1 },
  
  bumperContainer: {
    flex: 1,
    backgroundColor: "#D30000",
    justifyContent: "center",
    alignItems: "center",
  },
  bumperLogo: { color: "#FFF", fontSize: 32, fontWeight: "900" },
  bumperHighlight: { color: "#000" },
  bumperSub: { color: "#FFF", fontSize: 10, opacity: 0.8, marginTop: 5, letterSpacing: 2 },

  detailsArea: { padding: 20 },
  mainTitle: { color: '#FFF', fontSize: 22, fontWeight: 'bold' },
  mainDate: { color: '#888', fontSize: 13, marginTop: 5 },
  
  videoStatsBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 20,
    marginTop: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#111',
    borderTopWidth: 1,
    borderTopColor: '#111',
  },
  statItem: { alignItems: 'center' },
  statText: { color: '#888', fontSize: 11, marginTop: 5 },

  sectionContainer: { marginTop: 25 },
  sectionTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold', marginLeft: 20, marginBottom: 15 },
  
  card: { width: 160, marginRight: 12, position: 'relative' },
  cardThumb: { width: 160, height: 90, borderRadius: 8, backgroundColor: '#111' },
  cardInfo: { marginTop: 8 },
  cardTitle: { color: '#FFF', fontSize: 13, fontWeight: '600' },
  cardDate: { color: '#666', fontSize: 11, marginTop: 2 },
  
  activeIndicator: {
    position: 'absolute',
    bottom: 45,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: '#D30000',
    borderRadius: 2
  },

  commentSection: { padding: 20, marginTop: 10 },
  inputRow: { flexDirection: 'row', marginBottom: 20 },
  input: {
    flex: 1,
    backgroundColor: '#111',
    borderRadius: 8,
    paddingHorizontal: 15,
    height: 45,
    color: '#FFF'
  },
  sendBtn: {
    backgroundColor: '#D30000',
    width: 45,
    height: 45,
    borderRadius: 8,
    marginLeft: 10,
    justifyContent: 'center',
    alignItems: 'center'
  },
  commentItem: { flexDirection: 'row', marginBottom: 15 },
  commentAvatar: { width: 35, height: 35, borderRadius: 17.5, backgroundColor: '#333', marginRight: 12 },
  commentUser: { color: '#D30000', fontSize: 13, fontWeight: 'bold' },
  commentText: { color: '#BBB', fontSize: 13, marginTop: 2 }
});