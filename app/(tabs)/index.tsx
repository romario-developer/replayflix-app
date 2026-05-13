import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ScreenOrientation from "expo-screen-orientation";
import React, { useCallback, useEffect, useState, useRef } from "react";
import {
    Alert,
    FlatList,
    Image, // Adicionado para as capas
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
} from "react-native";
import YoutubePlayer from "react-native-youtube-iframe";
import { useVideoPlayer, VideoView } from "expo-video";
import { getReplays } from "../../services/api";

type ReplayVideo = {
  id: string;
  filename: string;
  size: string;
  created_at: string;
  arena: string;
  user_id?: string | number | null;
  likes: number;
  thumbnail_url?: string; // Adicionado para suportar as capas do banco
};

// --- COMPONENTE ISOLADO DE VÍDEO NATIVO (EXPO-VIDEO) ---
const NativeVideoPlayer = ({ videoUrl, onFinish, onFullscreenChange }: { videoUrl: string, onFinish: () => void, onFullscreenChange: (isFullscreen: boolean) => void }) => {
  const player = useVideoPlayer(videoUrl, player => {
    player.loop = false;
    player.play(); 
  });

  useEffect(() => {
    const subscription = player.addListener('playToEnd', () => {
      onFinish();
    });
    return () => {
      subscription.remove();
    };
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

export default function HomeScreen() {
  const [replays, setReplays] = useState<ReplayVideo[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<ReplayVideo | null>(null);
  const [likedVideos, setLikedVideos] = useState<Set<string>>(new Set());
  const [commentText, setCommentText] = useState("");
  const [comments, setComments] = useState<{ [key: string]: string[] }>({});
  const [showBumper, setShowBumper] = useState(false);

  // Carregar curtidas e comentários do storage local
  useEffect(() => {
    const loadPersistedData = async () => {
      try {
        const [savedLikes, savedComments] = await Promise.all([
          AsyncStorage.getItem("@liked_videos"),
          AsyncStorage.getItem("@video_comments"),
        ]);
        if (savedLikes) setLikedVideos(new Set(JSON.parse(savedLikes)));
        if (savedComments) setComments(JSON.parse(savedComments));
      } catch (e) {
        console.error("Erro ao carregar dados locais", e);
      }
    };
    loadPersistedData();
    carregarDados();
  }, []);

  const carregarDados = async () => {
    try {
      const dados = await getReplays();
      setReplays(dados);
    } catch (error) {
      console.error("Erro ao carregar replays:", error);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await carregarDados();
    setRefreshing(false);
  }, []);

  const toggleLike = async (id: string) => {
    const newLiked = new Set(likedVideos);
    if (newLiked.has(id)) newLiked.delete(id);
    else newLiked.add(id);
    
    setLikedVideos(newLiked);
    await AsyncStorage.setItem("@liked_videos", JSON.stringify([...newLiked]));
  };

  const addComment = async () => {
    if (!selectedVideo || !commentText.trim()) return;
    const videoId = selectedVideo.id;
    const newComments = {
      ...comments,
      [videoId]: [...(comments[videoId] || []), commentText.trim()],
    };
    setComments(newComments);
    setCommentText("");
    await AsyncStorage.setItem("@video_comments", JSON.stringify(newComments));
  };

  const handleVideoSelect = (video: ReplayVideo) => {
    setSelectedVideo(video);
    setShowBumper(true);
    setTimeout(() => setShowBumper(false), 2500); // Tempo da intro
  };

  const renderItem = ({ item }: { item: ReplayVideo }) => (
    <TouchableOpacity 
      style={styles.videoCard} 
      onPress={() => handleVideoSelect(item)}
    >
      <View style={styles.thumbnailContainer}>
        {item.thumbnail_url ? (
          <Image 
            source={{ uri: item.thumbnail_url }} 
            style={styles.thumbnailImage} 
          />
        ) : (
          <View style={styles.thumbnailPlaceholder}>
            <Ionicons name="play-circle" size={32} color="#333" />
          </View>
        )}
      </View>

      <View style={styles.videoInfo}>
        <Text style={styles.videoTitle} numberOfLines={1}>
          {item.filename.replace('.mp4', '')}
        </Text>
        <Text style={styles.videoSub}>{item.arena} • {item.size}</Text>
        
        <View style={styles.actionsRow}>
          <TouchableOpacity onPress={() => toggleLike(item.id)} style={styles.iconAction}>
            <Ionicons 
              name={likedVideos.has(item.id) ? "heart" : "heart-outline"} 
              size={18} 
              color={likedVideos.has(item.id) ? "#D30000" : "#888"} 
            />
            <Text style={styles.actionText}>{item.likes + (likedVideos.has(item.id) ? 1 : 0)}</Text>
          </TouchableOpacity>
          
          <View style={styles.iconAction}>
            <Ionicons name="chatbubble-outline" size={16} color="#888" />
            <Text style={styles.actionText}>{(comments[item.id] || []).length}</Text>
          </View>
        </View>
      </View>
      
      <Ionicons name="chevron-forward" size={20} color="#222" />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>REPLAY<Text style={styles.highlight}>FLIX</Text></Text>
          <Text style={styles.headerSub}>Sua partida, seu show.</Text>
        </View>
        <TouchableOpacity style={styles.profileBtn}>
           <Ionicons name="person-circle-outline" size={32} color="#FFF" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={replays}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#D30000" />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="videocam-off-outline" size={60} color="#222" />
            <Text style={styles.emptyText}>Nenhum replay disponível no momento.</Text>
          </View>
        }
      />

      <Modal
        visible={!!selectedVideo}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedVideo(null)}
      >
        <View style={styles.modalVideoOverlay}>
          <View style={styles.modalVideoHeader}>
             <Text style={styles.modalTitle} numberOfLines={1}>{selectedVideo?.filename}</Text>
            <TouchableOpacity onPress={() => setSelectedVideo(null)}>
              <Ionicons name="close-circle" size={40} color="#FFF" />
            </TouchableOpacity>
          </View>

          <View style={styles.modalContentScroll}>
            <View style={styles.modalVideoWrapper}>
              {showBumper ? (
                <View style={styles.bumperContainer}>
                  <Text style={styles.bumperLogo}>REPLAY<Text style={styles.bumperHighlight}>FLIX</Text></Text>
                  <Text style={styles.bumperSub}>Preparando seu lance...</Text>
                </View>
              ) : (
                <View style={styles.videoBox}>
                  {selectedVideo && (
                    <NativeVideoPlayer 
                      videoUrl={`https://yojoumansleqwjwdiyde.supabase.co/storage/v1/object/public/replays/${selectedVideo.filename}`}
                      onFinish={() => {}}
                      onFullscreenChange={async (fs) => {
                         if(fs) await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
                         else await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT);
                      }}
                    />
                  )}
                </View>
              )}
            </View>

            <ScrollView style={styles.detailsArea}>
              <View style={styles.videoStatsBar}>
                 <TouchableOpacity style={styles.statItem} onPress={() => selectedVideo && toggleLike(selectedVideo.id)}>
                    <Ionicons name={selectedVideo && likedVideos.has(selectedVideo.id) ? "heart" : "heart-outline"} size={24} color="#D30000" />
                    <Text style={styles.statText}>Curtir</Text>
                 </TouchableOpacity>
                 <View style={styles.statItem}>
                    <Ionicons name="share-social-outline" size={24} color="#FFF" />
                    <Text style={styles.statText}>Compartilhar</Text>
                 </View>
                 <View style={styles.statItem}>
                    <Ionicons name="cloud-download-outline" size={24} color="#FFF" />
                    <Text style={styles.statText}>Baixar</Text>
                 </View>
              </View>

              <View style={styles.commentSection}>
                <Text style={styles.sectionTitle}>Comentários ({(selectedVideo && comments[selectedVideo.id] || []).length})</Text>
                
                <View style={styles.inputRow}>
                  <TextInput
                    style={styles.input}
                    placeholder="Escreva algo sobre esse lance..."
                    placeholderTextColor="#555"
                    value={commentText}
                    onChangeText={setCommentText}
                  />
                  <TouchableOpacity style={styles.sendBtn} onPress={addComment}>
                    <Ionicons name="send" size={20} color="#FFF" />
                  </TouchableOpacity>
                </View>

                {selectedVideo && (comments[selectedVideo.id] || []).map((c, i) => (
                  <View key={i} style={styles.commentItem}>
                    <View style={styles.avatarMini} />
                    <View>
                      <Text style={styles.commentUser}>Craque Anônimo</Text>
                      <Text style={styles.commentText}>{c}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  header: {
    paddingTop: 60,
    paddingHorizontal: 25,
    paddingBottom: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#080808"
  },
  headerTitle: { color: "#FFF", fontSize: 26, fontWeight: "900", letterSpacing: -1 },
  headerSub: { color: "#555", fontSize: 12, marginTop: -4 },
  highlight: { color: "#D30000" },
  profileBtn: { padding: 5 },
  
  listContent: { padding: 20 },
  videoCard: {
    flexDirection: "row",
    backgroundColor: "#0A0A0A",
    borderRadius: 15,
    padding: 12,
    marginBottom: 15,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#151515",
  },
  thumbnailContainer: {
    width: 115,
    height: 75,
    borderRadius: 10,
    backgroundColor: "#111",
    overflow: "hidden",
  },
  thumbnailImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  thumbnailPlaceholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  videoInfo: {
    flex: 1,
    marginLeft: 15,
  },
  videoTitle: {
    color: "#EEE",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 2,
  },
  videoSub: {
    color: "#555",
    fontSize: 12,
    marginBottom: 8,
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconAction: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 15,
  },
  actionText: {
    color: "#555",
    fontSize: 12,
    marginLeft: 5,
  },
  
  emptyContainer: { marginTop: 150, alignItems: "center", paddingHorizontal: 40 },
  emptyText: { color: "#333", fontSize: 14, textAlign: 'center', marginTop: 10 },

  modalVideoOverlay: {
    flex: 1,
    backgroundColor: "#000",
  },
  modalVideoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 10,
    backgroundColor: '#000',
    zIndex: 10
  },
  modalTitle: { color: '#FFF', fontSize: 14, flex: 1, marginRight: 20, opacity: 0.6 },
  modalContentScroll: { flex: 1 },
  modalVideoWrapper: {
    width: "100%",
    aspectRatio: 16 / 9,
    backgroundColor: '#111'
  },
  videoBox: { flex: 1 },
  videoPlayer: { flex: 1 },
  
  bumperContainer: {
    flex: 1,
    backgroundColor: "#D30000",
    justifyContent: "center",
    alignItems: "center",
  },
  bumperLogo: { color: "#FFF", fontSize: 32, fontWeight: "900" },
  bumperHighlight: { color: "#000" },
  bumperSub: { color: "#FFF", fontSize: 12, opacity: 0.8, marginTop: 5 },

  detailsArea: { flex: 1, padding: 20 },
  videoStatsBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#111'
  },
  statItem: { alignItems: 'center' },
  statText: { color: '#888', fontSize: 11, marginTop: 5 },

  commentSection: { marginTop: 25 },
  sectionTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
  inputRow: {
    flexDirection: 'row',
    marginBottom: 25
  },
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
  commentItem: {
    flexDirection: 'row',
    marginBottom: 20
  },
  avatarMini: {
    width: 35,
    height: 35,
    borderRadius: 18,
    backgroundColor: '#222',
    marginRight: 12
  },
  commentUser: { color: '#D30000', fontSize: 13, fontWeight: 'bold' },
  commentText: { color: '#AAA', fontSize: 14, marginTop: 2 }
});