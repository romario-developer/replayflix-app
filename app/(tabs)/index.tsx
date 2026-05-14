import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ScreenOrientation from "expo-screen-orientation";
import React, { useCallback, useEffect, useState } from "react";
import {
    Alert,
    FlatList,
    Image,
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
    Share,
} from "react-native";
import { useVideoPlayer, VideoView } from "expo-video";
import { getReplays } from "../../services/api";

const { width } = Dimensions.get("window");
const COLUMN_COUNT = 2; // Grid de 2 colunas para melhor visibilidade em mobile, resultando em ~4-6 cards por tela
const ITEM_WIDTH = (width - 40) / COLUMN_COUNT;

type ReplayVideo = {
  id: string;
  filename: string;
  size: string;
  created_at: string;
  arena: string;
  user_id?: string | number | null;
  likes: number;
  thumbnail_url?: string;
};

// --- COMPONENTE DE VÍDEO NATIVO ---
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

  const handleShare = async (video: ReplayVideo) => {
    try {
      const url = `https://yojoumansleqwjwdiyde.supabase.co/storage/v1/object/public/replays/${video.filename}`;
      await Share.share({
        message: `Confira esse replay incrível na ReplayFlix: ${video.arena}`,
        url: url,
      });
    } catch (error) {
      console.error("Erro ao compartilhar:", error);
    }
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
    setTimeout(() => setShowBumper(false), 2000);
  };

  const renderItem = ({ item }: { item: ReplayVideo }) => {
    const isLiked = likedVideos.has(item.id);
    const commentCount = (comments[item.id] || []).length;

    return (
      <View style={styles.cardContainer}>
        <TouchableOpacity 
          activeOpacity={0.8}
          style={styles.card} 
          onPress={() => handleVideoSelect(item)}
        >
          <View style={styles.thumbnailWrapper}>
            {item.thumbnail_url ? (
              <Image source={{ uri: item.thumbnail_url }} style={styles.cardThumbnail} />
            ) : (
              <View style={styles.placeholderThumbnail}>
                <Ionicons name="play-circle" size={40} color="rgba(255,255,255,0.3)" />
              </View>
            )}
            <View style={styles.durationBadge}>
              <Text style={styles.durationText}>{item.size}</Text>
            </View>
          </View>

          <View style={styles.cardInfo}>
            <Text style={styles.cardTitle} numberOfLines={1}>
              {item.filename.replace('.mp4', '')}
            </Text>
            <Text style={styles.cardSubtitle} numberOfLines={1}>{item.arena}</Text>
            
            <View style={styles.cardActions}>
              <TouchableOpacity onPress={() => toggleLike(item.id)} style={styles.actionButton}>
                <Ionicons 
                  name={isLiked ? "heart" : "heart-outline"} 
                  size={18} 
                  color={isLiked ? "#FF3B30" : "#8E8E93"} 
                />
                <Text style={[styles.actionLabel, isLiked && {color: "#FF3B30"}]}>
                  {item.likes + (isLiked ? 1 : 0)}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => handleVideoSelect(item)} style={styles.actionButton}>
                <Ionicons name="chatbubble-outline" size={16} color="#8E8E93" />
                <Text style={styles.actionLabel}>{commentCount}</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => handleShare(item)} style={styles.actionButton}>
                <Ionicons name="share-outline" size={18} color="#8E8E93" />
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>REPLAY<Text style={styles.highlight}>FLIX</Text></Text>
          <Text style={styles.headerSub}>Seu show em campo</Text>
        </View>
        <TouchableOpacity style={styles.profileBtn}>
           <View style={styles.avatarPlaceholder}>
              <Ionicons name="person" size={20} color="#FFF" />
           </View>
        </TouchableOpacity>
      </View>

      <FlatList
        data={replays}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        numColumns={COLUMN_COUNT}
        contentContainerStyle={styles.listContent}
        columnWrapperStyle={styles.columnWrapper}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#D30000" />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="videocam-off-outline" size={64} color="#2C2C2E" />
            <Text style={styles.emptyText}>Nenhum lance encontrado.</Text>
          </View>
        }
      />

      <Modal
        visible={!!selectedVideo}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedVideo(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setSelectedVideo(null)} style={styles.closeBtn}>
              <Ionicons name="chevron-down" size={30} color="#FFF" />
            </TouchableOpacity>
            <Text style={styles.modalTitle} numberOfLines={1}>{selectedVideo?.filename}</Text>
            <TouchableOpacity onPress={() => selectedVideo && handleShare(selectedVideo)}>
              <Ionicons name="share-social-outline" size={24} color="#FFF" />
            </TouchableOpacity>
          </View>

          <ScrollView bounces={false} style={styles.modalScroll}>
            <View style={styles.videoContainer}>
              {showBumper ? (
                <View style={styles.bumper}>
                  <Text style={styles.bumperText}>REPLAY<Text style={{color:'#000'}}>FLIX</Text></Text>
                </View>
              ) : (
                selectedVideo && (
                  Platform.OS === 'web' ? (
                    <video
                      src={`https://yojoumansleqwjwdiyde.supabase.co/storage/v1/object/public/replays/${selectedVideo.filename}`}
                      controls
                      autoPlay
                      style={styles.webVideo}
                    />
                  ) : (
                    <NativeVideoPlayer 
                      videoUrl={`https://yojoumansleqwjwdiyde.supabase.co/storage/v1/object/public/replays/${selectedVideo.filename}`}
                      onFinish={() => {}}
                      onFullscreenChange={async (fs) => {
                         if(fs) await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
                         else await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT);
                      }}
                    />
                  )
                )
              )}
            </View>

            <View style={styles.detailsContent}>
              <View style={styles.detailsHeader}>
                <View style={{flex:1}}>
                  <Text style={styles.detailTitle}>{selectedVideo?.arena}</Text>
                  <Text style={styles.detailSub}>{selectedVideo?.created_at} • {selectedVideo?.size}</Text>
                </View>
                <TouchableOpacity 
                  onPress={() => selectedVideo && toggleLike(selectedVideo.id)}
                  style={[styles.likeCircle, selectedVideo && likedVideos.has(selectedVideo.id) && {backgroundColor: '#FF3B30'}]}
                >
                  <Ionicons 
                    name={selectedVideo && likedVideos.has(selectedVideo.id) ? "heart" : "heart-outline"} 
                    size={24} 
                    color="#FFF" 
                  />
                </TouchableOpacity>
              </View>

              <View style={styles.divider} />

              <Text style={styles.sectionTitle}>Comentários ({(selectedVideo && comments[selectedVideo.id] || []).length})</Text>
              
              <View style={styles.commentInputRow}>
                <TextInput
                  style={styles.commentInput}
                  placeholder="Adicione um comentário..."
                  placeholderTextColor="#8E8E93"
                  value={commentText}
                  onChangeText={setCommentText}
                />
                <TouchableOpacity style={styles.sendButton} onPress={addComment}>
                  <Ionicons name="arrow-up-circle" size={32} color="#D30000" />
                </TouchableOpacity>
              </View>

              {selectedVideo && (comments[selectedVideo.id] || []).map((c, i) => (
                <View key={i} style={styles.commentCard}>
                  <View style={styles.userAvatarMini} />
                  <View style={{flex:1}}>
                    <Text style={styles.commentUserName}>Usuário</Text>
                    <Text style={styles.commentTextContent}>{c}</Text>
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 15,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.8)",
  },
  headerTitle: { color: "#FFF", fontSize: 22, fontWeight: "900", letterSpacing: 1 },
  highlight: { color: "#D30000" },
  headerSub: { color: "#8E8E93", fontSize: 12, fontWeight: "500" },
  profileBtn: { padding: 4 },
  avatarPlaceholder: { 
    width: 36, height: 36, borderRadius: 18, backgroundColor: "#1C1C1E", 
    justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: "#2C2C2E" 
  },
  
  listContent: { padding: 15 },
  columnWrapper: { justifyContent: "space-between" },
  cardContainer: { width: ITEM_WIDTH, marginBottom: 20 },
  card: {
    backgroundColor: "#1C1C1E",
    borderRadius: 16,
    overflow: "hidden",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  thumbnailWrapper: {
    width: "100%",
    aspectRatio: 16 / 10,
    backgroundColor: "#2C2C2E",
  },
  cardThumbnail: { width: "100%", height: "100%", resizeMode: "cover" },
  placeholderThumbnail: { flex: 1, justifyContent: "center", alignItems: "center" },
  durationBadge: {
    position: "absolute",
    bottom: 8,
    right: 8,
    backgroundColor: "rgba(0,0,0,0.75)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  durationText: { color: "#FFF", fontSize: 10, fontWeight: "bold" },
  cardInfo: { padding: 10 },
  cardTitle: { color: "#FFF", fontSize: 14, fontWeight: "700", marginBottom: 2 },
  cardSubtitle: { color: "#8E8E93", fontSize: 11, marginBottom: 10 },
  cardActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 0.5,
    borderTopColor: "#2C2C2E",
    paddingTop: 10,
  },
  actionButton: { flexDirection: "row", alignItems: "center" },
  actionLabel: { color: "#8E8E93", fontSize: 12, marginLeft: 4, fontWeight: "600" },
  
  emptyContainer: { marginTop: 100, alignItems: "center" },
  emptyText: { color: "#48484A", fontSize: 16, marginTop: 15 },

  modalOverlay: { flex: 1, backgroundColor: "#000" },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 15,
  },
  closeBtn: { marginRight: 15 },
  modalTitle: { color: '#FFF', fontSize: 16, fontWeight: '600', flex: 1 },
  modalScroll: { flex: 1 },
  videoContainer: { width: "100%", aspectRatio: 16 / 9, backgroundColor: '#000' },
  webVideo: { width: '100%', height: '100%', objectFit: 'contain' },
  videoPlayer: { flex: 1 },
  bumper: { flex: 1, backgroundColor: "#D30000", justifyContent: "center", alignItems: "center" },
  bumperText: { color: "#FFF", fontSize: 28, fontWeight: "900" },
  
  detailsContent: { padding: 20 },
  detailsHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  detailTitle: { color: '#FFF', fontSize: 20, fontWeight: 'bold' },
  detailSub: { color: '#8E8E93', fontSize: 13, marginTop: 4 },
  likeCircle: { 
    width: 48, height: 48, borderRadius: 24, backgroundColor: '#2C2C2E', 
    justifyContent: 'center', alignItems: 'center' 
  },
  divider: { height: 1, backgroundColor: '#1C1C1E', marginVertical: 10 },
  sectionTitle: { color: '#FFF', fontSize: 17, fontWeight: 'bold', marginVertical: 15 },
  commentInputRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  commentInput: {
    flex: 1, height: 44, backgroundColor: '#1C1C1E', borderRadius: 22,
    paddingHorizontal: 15, color: '#FFF', marginRight: 10
  },
  commentCard: { flexDirection: 'row', marginBottom: 15, backgroundColor: '#0A0A0A', padding: 12, borderRadius: 12 },
  userAvatarMini: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#2C2C2E', marginRight: 12 },
  commentUserName: { color: '#FFF', fontSize: 13, fontWeight: 'bold', marginBottom: 2 },
  commentTextContent: { color: '#8E8E93', fontSize: 13, lineHeight: 18 },
});
