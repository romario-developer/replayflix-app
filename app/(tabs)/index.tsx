import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ScreenOrientation from "expo-screen-orientation";
import { Image } from "expo-image"; // Upgrade para expo-image
import React, { useCallback, useEffect, useState } from "react";
import {
    FlatList,
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
    ActivityIndicator
} from "react-native";
import { useVideoPlayer, VideoView } from "expo-video";
import { getReplays } from "../../services/api";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";

const { width } = Dimensions.get("window");
const COLUMN_COUNT = 2;
const ITEM_WIDTH = (width - 48) / COLUMN_COUNT;

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
  const [loading, setLoading] = useState(true);
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
    } finally {
      setLoading(false);
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
        message: `Olha esse lance na ReplayFlix! ⚽\nLocal: ${video.arena}`,
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
    setTimeout(() => setShowBumper(false), 1800);
  };

  const renderFeatured = () => {
    if (replays.length === 0) return null;
    const featured = replays[0];
    return (
      <Animated.View entering={FadeInDown.duration(800)} style={styles.featuredContainer}>
        <TouchableOpacity activeOpacity={0.9} onPress={() => handleVideoSelect(featured)} style={styles.featuredCard}>
          <Image 
            source={{ uri: featured.thumbnail_url }} 
            style={styles.featuredImage}
            contentFit="cover"
            transition={500}
          />
          <View style={styles.featuredOverlay}>
            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>NOVO LANCE</Text>
            </View>
            <Text style={styles.featuredTitle}>{featured.arena}</Text>
            <View style={styles.featuredActions}>
              <View style={styles.playButtonFeatured}>
                <Ionicons name="play" size={20} color="#000" />
                <Text style={styles.playButtonText}>Assistir Agora</Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>
        <Text style={styles.sectionHeader}>Explorar Replays</Text>
      </Animated.View>
    );
  };

  const renderItem = ({ item, index }: { item: ReplayVideo, index: number }) => {
    if (index === 0) return null; // Já está no destaque

    const isLiked = likedVideos.has(item.id);
    const commentCount = (comments[item.id] || []).length;

    return (
      <Animated.View 
        entering={FadeInDown.delay(index * 100).duration(600)} 
        style={styles.cardContainer}
      >
        <TouchableOpacity 
          activeOpacity={0.7}
          style={styles.card} 
          onPress={() => handleVideoSelect(item)}
        >
          <View style={styles.thumbnailWrapper}>
            <Image 
              source={{ uri: item.thumbnail_url }} 
              style={styles.cardThumbnail} 
              contentFit="cover"
              transition={300}
            />
            <View style={styles.cardPlayIcon}>
               <Ionicons name="play" size={18} color="#FFF" />
            </View>
            <View style={styles.durationBadge}>
              <Text style={styles.durationText}>{item.size}</Text>
            </View>
          </View>

          <View style={styles.cardInfo}>
            <Text style={styles.cardTitle} numberOfLines={1}>
              {item.filename.replace('.mp4', '').split('_')[0]}
            </Text>
            <Text style={styles.cardSubtitle} numberOfLines={1}>{item.arena}</Text>
            
            <View style={styles.cardActions}>
              <TouchableOpacity onPress={() => toggleLike(item.id)} style={styles.actionButton}>
                <Ionicons 
                  name={isLiked ? "heart" : "heart-outline"} 
                  size={16} 
                  color={isLiked ? "#D30000" : "#8E8E93"} 
                />
                <Text style={[styles.actionLabel, isLiked && {color: "#D30000"}]}>
                  {item.likes + (isLiked ? 1 : 0)}
                </Text>
              </TouchableOpacity>

              <View style={styles.actionButton}>
                <Ionicons name="chatbubble-outline" size={14} color="#8E8E93" />
                <Text style={styles.actionLabel}>{commentCount}</Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#D30000" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <Text style={styles.headerTitle}>REPLAY<Text style={styles.highlight}>FLIX</Text></Text>
          <View style={styles.onlineStatus} />
        </View>
        <TouchableOpacity style={styles.profileBtn}>
           <Image 
             source={{ uri: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80' }} 
             style={styles.avatar}
           />
        </TouchableOpacity>
      </View>

      <FlatList
        data={replays}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListHeaderComponent={renderFeatured}
        numColumns={COLUMN_COUNT}
        contentContainerStyle={styles.listContent}
        columnWrapperStyle={styles.columnWrapper}
        showsVerticalScrollIndicator={false}
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
        animationType="slide"
        onRequestClose={() => setSelectedVideo(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setSelectedVideo(null)} style={styles.closeBtn}>
              <Ionicons name="chevron-down" size={32} color="#FFF" />
            </TouchableOpacity>
            <View style={styles.modalHeaderInfo}>
                <Text style={styles.modalTitle} numberOfLines={1}>{selectedVideo?.arena}</Text>
                <Text style={styles.modalSub}>{selectedVideo?.size} • {selectedVideo?.created_at}</Text>
            </View>
            <TouchableOpacity onPress={() => selectedVideo && handleShare(selectedVideo)} style={styles.modalShareBtn}>
              <Ionicons name="share-outline" size={24} color="#FFF" />
            </TouchableOpacity>
          </View>

          <ScrollView bounces={false} style={styles.modalScroll}>
            <View style={styles.videoContainer}>
              {showBumper ? (
                <View style={styles.bumper}>
                  <Animated.Text entering={FadeInUp} style={styles.bumperText}>REPLAY<Text style={{color:'#000'}}>FLIX</Text></Animated.Text>
                  <ActivityIndicator color="#000" style={{marginTop: 20}} />
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
              <View style={styles.interactionRow}>
                <TouchableOpacity 
                    onPress={() => selectedVideo && toggleLike(selectedVideo.id)}
                    style={styles.mainLikeButton}
                >
                    <Ionicons 
                        name={selectedVideo && likedVideos.has(selectedVideo.id) ? "heart" : "heart-outline"} 
                        size={28} 
                        color={selectedVideo && likedVideos.has(selectedVideo.id) ? "#D30000" : "#FFF"} 
                    />
                    <Text style={styles.mainActionText}>Curtir</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.mainLikeButton}>
                    <Ionicons name="download-outline" size={28} color="#FFF" />
                    <Text style={styles.mainActionText}>Salvar</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.divider} />

              <Text style={styles.sectionTitle}>Comentários ({(selectedVideo && comments[selectedVideo.id] || []).length})</Text>
              
              <View style={styles.commentInputRow}>
                <TextInput
                  style={styles.commentInput}
                  placeholder="Comente este lance..."
                  placeholderTextColor="#8E8E93"
                  value={commentText}
                  onChangeText={setCommentText}
                />
                <TouchableOpacity style={styles.sendButton} onPress={addComment}>
                  <Ionicons name="send" size={20} color="#FFF" />
                </TouchableOpacity>
              </View>

              {selectedVideo && (comments[selectedVideo.id] || []).map((c, i) => (
                <View key={i} style={styles.commentCard}>
                  <View style={styles.userAvatarMini} />
                  <View style={{flex:1}}>
                    <Text style={styles.commentUserName}>Craque #{Math.floor(Math.random()*100)}</Text>
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
  container: { flex: 1, backgroundColor: "#050505" },
  header: {
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 15,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "rgba(5,5,5,0.9)",
  },
  logoContainer: { flexDirection: 'row', alignItems: 'center' },
  headerTitle: { color: "#FFF", fontSize: 24, fontWeight: "900", letterSpacing: -0.5 },
  highlight: { color: "#D30000" },
  onlineStatus: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#4CAF50', marginLeft: 8, marginTop: 4 },
  profileBtn: { padding: 2 },
  avatar: { width: 38, height: 38, borderRadius: 19, borderWidth: 1.5, borderColor: '#D30000' },
  
  listContent: { padding: 16 },
  columnWrapper: { justifyContent: "space-between" },
  sectionHeader: { color: '#FFF', fontSize: 18, fontWeight: '800', marginTop: 25, marginBottom: 15 },
  
  featuredContainer: { width: '100%', marginBottom: 10 },
  featuredCard: { width: '100%', height: 220, borderRadius: 20, overflow: 'hidden', backgroundColor: '#111' },
  featuredImage: { width: '100%', height: '100%' },
  featuredOverlay: { 
    ...StyleSheet.absoluteFillObject, 
    backgroundColor: 'rgba(0,0,0,0.4)', 
    padding: 20, 
    justifyContent: 'flex-end' 
  },
  liveBadge: { 
    position: 'absolute', top: 15, left: 15, 
    backgroundColor: 'rgba(211,0,0,0.9)', 
    paddingHorizontal: 8, paddingVertical: 4, 
    borderRadius: 6, flexDirection: 'row', alignItems: 'center' 
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#FFF', marginRight: 5 },
  liveText: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },
  featuredTitle: { color: '#FFF', fontSize: 24, fontWeight: '900', marginBottom: 10 },
  featuredActions: { flexDirection: 'row' },
  playButtonFeatured: { 
    backgroundColor: '#FFF', paddingHorizontal: 15, paddingVertical: 8, 
    borderRadius: 8, flexDirection: 'row', alignItems: 'center' 
  },
  playButtonText: { color: '#000', fontWeight: 'bold', marginLeft: 5, fontSize: 13 },

  cardContainer: { width: ITEM_WIDTH, marginBottom: 18 },
  card: {
    backgroundColor: "#121212",
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#1A1A1A",
  },
  thumbnailWrapper: { width: "100%", aspectRatio: 16 / 10, backgroundColor: "#1A1A1A" },
  cardThumbnail: { width: "100%", height: "100%" },
  cardPlayIcon: { 
    position: 'absolute', top: '50%', left: '50%', 
    transform: [{translateX: -15}, {translateY: -15}],
    width: 30, height: 30, borderRadius: 15, 
    backgroundColor: 'rgba(211,0,0,0.8)', 
    justifyContent: 'center', alignItems: 'center' 
  },
  durationBadge: {
    position: "absolute", bottom: 6, right: 6,
    backgroundColor: "rgba(0,0,0,0.8)", paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4,
  },
  durationText: { color: "#FFF", fontSize: 9, fontWeight: "bold" },
  cardInfo: { padding: 10 },
  cardTitle: { color: "#FFF", fontSize: 13, fontWeight: "700", marginBottom: 1 },
  cardSubtitle: { color: "#8E8E93", fontSize: 10, marginBottom: 8 },
  cardActions: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    borderTopWidth: 0.5, borderTopColor: "#1A1A1A", paddingTop: 8,
  },
  actionButton: { flexDirection: "row", alignItems: "center" },
  actionLabel: { color: "#8E8E93", fontSize: 11, marginLeft: 3, fontWeight: "600" },
  
  emptyContainer: { marginTop: 100, alignItems: "center" },
  emptyText: { color: "#48484A", fontSize: 16, marginTop: 15 },

  modalOverlay: { flex: 1, backgroundColor: "#000" },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', paddingTop: 50,
    paddingHorizontal: 15, paddingBottom: 15, backgroundColor: '#000'
  },
  modalHeaderInfo: { flex: 1, marginLeft: 10 },
  closeBtn: { padding: 5 },
  modalTitle: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  modalSub: { color: '#8E8E93', fontSize: 11 },
  modalShareBtn: { padding: 8 },

  modalScroll: { flex: 1 },
  videoContainer: { width: "100%", aspectRatio: 16 / 9, backgroundColor: '#000' },
  webVideo: { width: '100%', height: '100%', objectFit: 'contain' },
  videoPlayer: { flex: 1 },
  bumper: { flex: 1, backgroundColor: "#D30000", justifyContent: "center", alignItems: "center" },
  bumperText: { color: "#FFF", fontSize: 28, fontWeight: "900" },
  
  detailsContent: { padding: 20 },
  interactionRow: { flexDirection: 'row', justifyContent: 'space-around', marginVertical: 10 },
  mainLikeButton: { alignItems: 'center', minWidth: 80 },
  mainActionText: { color: '#FFF', fontSize: 12, marginTop: 6, fontWeight: '500' },
  
  divider: { height: 1, backgroundColor: '#1A1A1A', marginVertical: 20 },
  sectionTitle: { color: '#FFF', fontSize: 16, fontWeight: 'bold', marginBottom: 15 },
  commentInputRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 25 },
  commentInput: {
    flex: 1, height: 44, backgroundColor: '#121212', borderRadius: 12,
    paddingHorizontal: 15, color: '#FFF', marginRight: 10, borderWidth: 1, borderColor: '#1A1A1A'
  },
  sendButton: { 
    width: 44, height: 44, borderRadius: 12, backgroundColor: '#D30000', 
    justifyContent: 'center', alignItems: 'center' 
  },
  commentCard: { flexDirection: 'row', marginBottom: 18 },
  userAvatarMini: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#1A1A1A', marginRight: 12 },
  commentUserName: { color: '#FFF', fontSize: 13, fontWeight: '700', marginBottom: 2 },
  commentTextContent: { color: '#AAA', fontSize: 13, lineHeight: 18 },
});
