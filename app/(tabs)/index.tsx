import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ScreenOrientation from "expo-screen-orientation";
import { Image } from "expo-image";
import React, { useCallback, useEffect, useRef, useState } from "react";
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
import { getReplays, likeReplay, unlikeReplay, ReplayVideo } from "../../services/api";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { router } from 'expo-router';

const { width } = Dimensions.get("window");
const ITEM_WIDTH = width * 0.8; // Largura para o carrossel de destaques
const CARD_WIDTH = (width - 48) / 2; // Largura para os cards de categoria (2 colunas)

// Componente de Card de Vídeo para categorias e grids
const VideoCard = ({ video, onSelectVideo, toggleLike, userId, comments }: 
  { video: ReplayVideo, onSelectVideo: (video: ReplayVideo) => void, toggleLike: (video: ReplayVideo) => void, userId: string | null, comments: { [key: string]: string[] } }) => {
  const isLiked = !!video.liked_by_me;
  const commentCount = (comments[video.id] || []).length;

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      style={styles.cardContainer}
      onPress={() => onSelectVideo(video)}
    >
      <View style={styles.thumbnailWrapper}>
        <Image
          source={{ uri: video.thumbnail_url }}
          style={styles.cardThumbnail}
          contentFit="cover"
          transition={300}
        />
        <View style={styles.cardPlayIcon}>
           <Ionicons name="play" size={18} color="#FFF" />
        </View>
        <View style={styles.durationBadge}>
          <Text style={styles.durationText}>{video.size}</Text>
        </View>
      </View>

      <View style={styles.cardInfo}>
        <Text style={styles.cardTitle} numberOfLines={1}>
          {video.titulo || video.filename.replace(".mp4", "").split("_")[0]}
        </Text>
        <Text style={styles.cardSubtitle} numberOfLines={1}>{video.arena}</Text>

        <View style={styles.cardActions}>
          <TouchableOpacity onPress={() => toggleLike(video)} style={styles.actionButton}>
            <Ionicons
              name={isLiked ? "heart" : "heart-outline"}
              size={16}
              color={isLiked ? "#D30000" : "#8E8E93"}
            />
            <Text style={[styles.actionLabel, isLiked && { color: "#D30000" }]}>
              {video.likes || 0}
            </Text>
          </TouchableOpacity>

          <View style={styles.actionButton}>
            <Ionicons name="chatbubble-outline" size={14} color="#8E8E93" />
            <Text style={styles.actionLabel}>{commentCount}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default function HomeScreen() {
  const [replays, setReplays] = useState<ReplayVideo[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState<ReplayVideo | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState("");
  const [comments, setComments] = useState<{ [key: string]: string[] }>({});
  const [favoriteReplays, setFavoriteReplays] = useState<string[]>([]); // Array de filenames de vídeos favoritos

  useEffect(() => {
    const init = async () => {
      try {
        const [uid, savedComments, savedFavorites] = await Promise.all([
          AsyncStorage.getItem("userId"),
          AsyncStorage.getItem("@video_comments"),
          AsyncStorage.getItem("@favorite_replays"),
        ]);
        if (uid) setUserId(uid);
        if (savedComments) setComments(JSON.parse(savedComments));
        if (savedFavorites) setFavoriteReplays(JSON.parse(savedFavorites));
        await carregarDados(uid);
      } catch (e) {
        console.error("Erro ao inicializar:", e);
      }
    };
    init();
  }, []);

  const carregarDados = async (uid?: string | null) => {
    try {
      const idParaUsar = uid !== undefined ? uid : userId;
      const dados = await getReplays(idParaUsar);
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
  }, [userId]);

  const toggleLike = async (video: ReplayVideo) => {
    if (!userId) {
      console.warn("Usuário não logado — like ignorado");
      return;
    }

    const filename = video.filename;
    const estavaCurtido = !!video.liked_by_me;
    const novoLiked = !estavaCurtido;
    const novoCount = (video.likes || 0) + (novoLiked ? 1 : -1);

    setReplays(prev => prev.map(v =>
      v.filename === filename
        ? { ...v, liked_by_me: novoLiked, likes: Math.max(0, novoCount) }
      : v
    ));

    const resp = novoLiked
      ? await likeReplay(filename, userId)
      : await unlikeReplay(filename, userId);

    if (!resp) {
      setReplays(prev => prev.map(v =>
        v.filename === filename
          ? { ...v, liked_by_me: estavaCurtido, likes: video.likes }
          : v
      ));
    } else {
      setReplays(prev => prev.map(v =>
        v.filename === filename
          ? { ...v, liked_by_me: resp.liked, likes: resp.likes }
          : v
      ));
    }
  };

  const toggleFavorite = async (video: ReplayVideo) => {
    if (!userId) {
      console.warn("Usuário não logado — favorito ignorado");
      return;
    }

    const filename = video.filename;
    const isFavorited = favoriteReplays.includes(filename);
    let updatedFavorites: string[];

    if (isFavorited) {
      updatedFavorites = favoriteReplays.filter(fav => fav !== filename);
    } else {
      updatedFavorites = [...favoriteReplays, filename];
    }
    setFavoriteReplays(updatedFavorites);
    await AsyncStorage.setItem("@favorite_replays", JSON.stringify(updatedFavorites));
  };

  const handleShare = async (video: ReplayVideo) => {
    try {
      const url = video.video_url ||
        `https://yojoumansleqwjwdiyde.supabase.co/storage/v1/object/public/replays/${video.filename}`;
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
  };

  const renderFeatured = () => {
    if (replays.length === 0) return null;
    return (
      <Animated.View entering={FadeInDown.duration(800)} style={styles.featuredContainer}>
        <Text style={styles.sectionHeader}>Destaques</Text>
        <FlatList
          data={replays.slice(0, 5)} // Apenas os 5 primeiros como destaque
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity activeOpacity={0.9} onPress={() => handleVideoSelect(item)} style={styles.featuredCard}>
              <Image
                source={{ uri: item.thumbnail_url }}
                style={styles.featuredImage}
                contentFit="cover"
                transition={500}
              />
              <View style={styles.featuredOverlay}>
                <View style={styles.liveBadge}>
                  <View style={styles.liveDot} />
                  <Text style={styles.liveText}>NOVO LANCE</Text>
                </View>
                <Text style={styles.featuredTitle}>{item.titulo || item.arena}</Text>
                <View style={styles.playButtonFeatured}>
                  <Ionicons name="play" size={20} color="#000" />
                  <Text style={styles.playButtonText}>Assistir Agora</Text>
                </View>
              </View>
            </TouchableOpacity>
          )}
        />
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

  const favoriteVideos = replays.filter(video => favoriteReplays.includes(video.filename));

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <Text style={styles.headerTitle}>REPLAY<Text style={styles.highlight}>FLIX</Text></Text>
          <View style={styles.onlineStatus} />
        </View>
        <TouchableOpacity style={styles.profileBtn} onPress={() => router.push('/profile')}>
           <Image
             source={{ uri: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80' }}
             style={styles.avatar}
           />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#D30000" />
        }
      >
        {renderFeatured()}

        {/* Seção: Novos Lances */}
        <Text style={styles.sectionHeader}>Novos Lances</Text>
        <FlatList
          data={replays.slice(0, 10)} // Exemplo: os 10 primeiros como novos lances
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <VideoCard video={item} onSelectVideo={handleVideoSelect} toggleLike={toggleLike} userId={userId} comments={comments} />
          )}
          contentContainerStyle={styles.horizontalListContent}
        />

        {/* Seção: Top da Semana */}
        <Text style={styles.sectionHeader}>Top da Semana</Text>
        <FlatList
          data={replays.filter(r => r.likes > 5).slice(0, 10)} // Exemplo: vídeos com mais de 5 likes
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <VideoCard video={item} onSelectVideo={handleVideoSelect} toggleLike={toggleLike} userId={userId} comments={comments} />
          )}
          contentContainerStyle={styles.horizontalListContent}
        />

        {/* Seção: Meus Favoritos (apenas se houver favoritos) */}
        {userId && favoriteVideos.length > 0 && (
          <>
            <Text style={styles.sectionHeader}>Meus Favoritos</Text>
            <FlatList
              data={favoriteVideos}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <VideoCard video={item} onSelectVideo={handleVideoSelect} toggleLike={toggleLike} userId={userId} comments={comments} />
              )}
              contentContainerStyle={styles.horizontalListContent}
            />
          </>
        )}

        {/* Seção: Todos os Lances (Grid) */}
        <Text style={styles.sectionHeader}>Todos os Lances</Text>
        <FlatList
          data={replays}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <VideoCard video={item} onSelectVideo={handleVideoSelect} toggleLike={toggleLike} userId={userId} comments={comments} />
          )}
          numColumns={2}
          scrollEnabled={false} // Desabilita o scroll da FlatList interna
          contentContainerStyle={styles.gridListContent}
          columnWrapperStyle={styles.columnWrapper}
        />
      </ScrollView>

      {/* Modal de Player de Vídeo (adaptado do anterior) */}
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
                <Text style={styles.modalTitle} numberOfLines={1}>
                  {selectedVideo?.titulo || selectedVideo?.arena}
                </Text>
                <Text style={styles.modalSub}>{selectedVideo?.size} • {selectedVideo?.created_at}</Text>
            </View>
            <TouchableOpacity onPress={() => selectedVideo && handleShare(selectedVideo)} style={styles.modalShareBtn}>
              <Ionicons name="share-outline" size={24} color="#FFF" />
            </TouchableOpacity>
          </View>

          <ScrollView bounces={false} style={styles.modalScroll}>
            <View style={styles.videoContainer}>
              {selectedVideo && (
                Platform.OS === 'web' ? (
                  <video
                    src={selectedVideo.video_url || `https://yojoumansleqwjwdiyde.supabase.co/storage/v1/object/public/replays/${selectedVideo.filename}`}
                    controls
                    autoPlay
                    style={styles.webVideo}
                  />
                ) : (
                  <VideoPlayerComponent
                    videoUrl={selectedVideo.video_url || `https://yojoumansleqwjwdiyde.supabase.co/storage/v1/object/public/replays/${selectedVideo.filename}`}
                    onFullscreenChange={async (fs) => {
                       if (fs) await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
                       else await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT);
                    }}
                  />
                )
              )}
            </View>

            <View style={styles.detailsContent}>
              <View style={styles.interactionRow}>
                <TouchableOpacity
                    onPress={() => selectedVideo && toggleLike(selectedVideo)}
                    style={styles.mainLikeButton}
                >
                    <Ionicons
                        name={selectedVideo?.liked_by_me ? "heart" : "heart-outline"}
                        size={28}
                        color={selectedVideo?.liked_by_me ? "#D30000" : "#FFF"}
                    />
                    <Text style={styles.mainActionText}>
                      {selectedVideo?.likes || 0} {(selectedVideo?.likes || 0) === 1 ? 'curtida' : 'curtidas'}
                    </Text>
                </TouchableOpacity>

                {/* Botão de Favoritar */}
                <TouchableOpacity
                  onPress={() => selectedVideo && toggleFavorite(selectedVideo)}
                  style={styles.mainLikeButton}
                >
                    <Ionicons
                      name={selectedVideo && favoriteReplays.includes(selectedVideo.filename) ? "bookmark" : "bookmark-outline"}
                      size={28}
                      color={selectedVideo && favoriteReplays.includes(selectedVideo.filename) ? "#FFD700" : "#FFF"}
                    />
                    <Text style={styles.mainActionText}>Favoritar</Text>
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
                <TouchableOpacity onPress={addComment} style={styles.sendButton}>
                  <Text style={styles.sendButtonText}>Enviar</Text>
                </TouchableOpacity>
              </View>

              {(selectedVideo && comments[selectedVideo.id] || []).map((comment, i) => (
                <View key={i} style={styles.commentContainer}>
                  <Image
                    source={{ uri: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80' }} // Avatar genérico
                    style={styles.commentAvatar}
                  />
                  <View style={styles.commentContent}>
                    <Text style={styles.commentAuthor}>Usuário Anônimo</Text>
                    <Text style={styles.commentText}>{comment}</Text>
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

// Componente de Player de Vídeo dedicado para o modal
const VideoPlayerComponent = ({ videoUrl, onFullscreenChange }: { videoUrl: string, onFullscreenChange: (isFullscreen: boolean) => void }) => {
  const player = useVideoPlayer(videoUrl, p => {
    p.loop = false; // Não faz loop no player dedicado
    p.muted = false; // Não começa mutado no player dedicado
  });

  useEffect(() => {
    // Tenta dar play automaticamente quando o componente é montado ou o URL do vídeo muda
    player.play();
  }, [player, videoUrl]);

  return (
    <VideoView
      player={player}
      style={styles.videoPlayerModal}
      allowsFullscreen
      allowsPictureInPicture
    />
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 40,
    paddingBottom: 10,
    backgroundColor: '#0A0A0A', // Fundo sólido
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFF',
  },
  highlight: {
    color: '#D30000',
  },
  onlineStatus: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#00FF00',
    marginLeft: 8,
  },
  profileBtn: {
    padding: 5,
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#FFF',
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
    marginTop: 20,
    marginBottom: 10,
    paddingHorizontal: 15,
  },
  featuredContainer: {
    marginBottom: 20,
  },
  featuredCard: {
    width: ITEM_WIDTH,
    height: ITEM_WIDTH * 0.6,
    marginRight: 10,
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
  },
  featuredImage: {
    width: '100%',
    height: '100%',
  },
  featuredOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'space-between',
    padding: 10,
  },
  liveBadge: {
    flexDirection: 'row',
    backgroundColor: '#D30000',
    borderRadius: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: 'flex-start',
    alignItems: 'center',
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFF',
    marginRight: 5,
  },
  liveText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  featuredTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
  },
  playButtonFeatured: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
    alignSelf: 'flex-start',
    alignItems: 'center',
  },
  playButtonText: {
    color: '#000',
    marginLeft: 5,
    fontWeight: 'bold',
  },
  horizontalListContent: {
    paddingHorizontal: 15,
    paddingBottom: 10,
  },
  gridListContent: {
    paddingHorizontal: 15,
    paddingBottom: 20,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  cardContainer: {
    width: CARD_WIDTH,
    marginBottom: 10,
    backgroundColor: '#1C1C1E',
    borderRadius: 8,
    overflow: 'hidden',
    marginRight: 8, // Espaçamento entre os cards no grid
  },
  thumbnailWrapper: {
    width: '100%',
    height: CARD_WIDTH * 0.7,
    position: 'relative',
  },
  cardThumbnail: {
    width: '100%',
    height: '100%',
  },
  cardPlayIcon: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -15 }, { translateY: -15 }],
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  durationBadge: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  durationText: {
    color: '#FFF',
    fontSize: 10,
  },
  cardInfo: {
    padding: 10,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 2,
  },
  cardSubtitle: {
    fontSize: 12,
    color: '#AAA',
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionLabel: {
    color: '#8E8E93',
    fontSize: 12,
    marginLeft: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 50,
  },
  emptyText: {
    color: '#8E8E93',
    fontSize: 16,
    marginTop: 10,
  },
  // Estilos do Modal de Player de Vídeo
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 40,
    backgroundColor: '#0A0A0A',
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  closeBtn: {
    padding: 5,
  },
  modalHeaderInfo: {
    flex: 1,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
  },
  modalSub: {
    fontSize: 12,
    color: '#AAA',
  },
  modalShareBtn: {
    padding: 5,
  },
  modalScroll: {
    flex: 1,
    backgroundColor: '#1C1C1E',
  },
  videoContainer: {
    width: '100%',
    height: width * 0.5625, // Proporção 16:9
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoPlayerModal: {
    width: '100%',
    height: '100%',
  },
  webVideo: {
    width: '100%',
    height: '100%',
  },
  detailsContent: {
    padding: 15,
  },
  interactionRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  mainLikeButton: {
    alignItems: 'center',
  },
  mainActionText: {
    color: '#FFF',
    fontSize: 12,
    marginTop: 5,
  },
  divider: {
    height: 1,
    backgroundColor: '#2C2C2E',
    marginVertical: 15,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 10,
  },
  commentInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  commentInput: {
    flex: 1,
    backgroundColor: '#3A3A3C',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    color: '#FFF',
    marginRight: 10,
  },
  sendButton: {
    backgroundColor: '#D30000',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  sendButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  commentContainer: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  commentAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginRight: 10,
  },
  commentContent: {
    flex: 1,
    backgroundColor: '#3A3A3C',
    borderRadius: 10,
    padding: 10,
  },
  commentAuthor: {
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 2,
  },
  commentText: {
    color: '#FFF',
  },
});
