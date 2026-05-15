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
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    Dimensions,
    Share,
    ActivityIndicator,
    StatusBar
} from "react-native";
import { useVideoPlayer, VideoView } from "expo-video";
import { getReplays, likeReplay, unlikeReplay, ReplayVideo } from "../../services/api";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";

const { height, width } = Dimensions.get("window");

// Componente de Player de Vídeo nativo
const NativeVideoPlayer = ({ videoUrl, isPlaying, isMuted, onFinish, onFullscreenChange }: 
  { videoUrl: string, isPlaying: boolean, isMuted: boolean, onFinish: () => void, onFullscreenChange: (isFullscreen: boolean) => void }) => {
  const player = useVideoPlayer(videoUrl, p => {
    p.loop = true; // Vídeos em loop
    p.muted = true; // Começa mutado
  });

  useEffect(() => {
    if (isPlaying) {
      player.play();
    } else {
      player.pause();
    }
  }, [isPlaying, player]);

  useEffect(() => {
    player.muted = isMuted;
  }, [isMuted, player]);

  useEffect(() => {
    const subscription = player.addListener("playToEnd", () => {
      onFinish();
    });
    return () => {
      subscription.remove();
    };
  }, [player]);

  return (
    <VideoView
      player={player}
      style={styles.videoPlayerFull}
      allowsFullscreen
      allowsPictureInPicture
    />
  );
};

export default function HomeScreen() {
  const [replays, setReplays] = useState<ReplayVideo[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState("");
  const [comments, setComments] = useState<{ [key: string]: string[] }>({});
  const [currentIndex, setCurrentIndex] = useState(0); // Índice do vídeo atualmente visível
  const [isMuted, setIsMuted] = useState(true); // Estado de mudo global
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    const init = async () => {
      try {
        const [uid, savedComments] = await Promise.all([
          AsyncStorage.getItem("userId"),
          AsyncStorage.getItem("@video_comments"),
        ]);
        if (uid) setUserId(uid);
        if (savedComments) setComments(JSON.parse(savedComments));
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

  const addComment = async (videoId: string) => {
    if (!commentText.trim()) return;
    const newComments = {
      ...comments,
      [videoId]: [...(comments[videoId] || []), commentText.trim()],
    };
    setComments(newComments);
    setCommentText("");
    await AsyncStorage.setItem("@video_comments", JSON.stringify(newComments));
  };

  const onViewableItemsChanged = useCallback(({ viewableItems }: any) => {
    if (viewableItems && viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index);
    }
  }, []);

  const viewabilityConfig = {
    itemVisiblePercentThreshold: 50 // Considera o item visível se 50% dele estiver na tela
  };

  const renderVideoItem = ({ item, index }: { item: ReplayVideo, index: number }) => {
    const isCurrentVideo = index === currentIndex;
    const isLiked = !!item.liked_by_me;
    const commentCount = (comments[item.id] || []).length;
    const videoUrl = item.video_url || `https://yojoumansleqwjwdiyde.supabase.co/storage/v1/object/public/replays/${item.filename}`;

    return (
      <View style={styles.videoContainerFull}>
        <NativeVideoPlayer
          videoUrl={videoUrl}
          isPlaying={isCurrentVideo} // Só toca o vídeo atual
          isMuted={isMuted} // Respeita o estado de mudo global
          onFinish={() => { /* Pode adicionar lógica para ir para o próximo vídeo */ }}
          onFullscreenChange={async (fs) => {
            if (fs) await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
            else await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT);
          }}
        />

        {/* Header flutuante translúcido */}
        <View style={styles.headerOverlay}>
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

        {/* Informações do vídeo e ações laterais */}
        <View style={styles.contentOverlay}>
          <View style={styles.videoInfo}>
            <Text style={styles.videoTitle} numberOfLines={2}>{item.titulo || item.arena}</Text>
            <Text style={styles.videoSubtitle}>{item.arena} • {item.created_at}</Text>
          </View>

          <View style={styles.actionButtonsContainer}>
            <TouchableOpacity onPress={() => toggleLike(item)} style={styles.actionButtonVertical}>
              <Ionicons
                name={isLiked ? "heart" : "heart-outline"}
                size={30}
                color={isLiked ? "#D30000" : "#FFF"}
              />
              <Text style={styles.actionButtonText}>{item.likes || 0}</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => { /* Abrir modal de comentários */ }} style={styles.actionButtonVertical}>
              <Ionicons name="chatbubble-ellipses-outline" size={30} color="#FFF" />
              <Text style={styles.actionButtonText}>{commentCount}</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => handleShare(item)} style={styles.actionButtonVertical}>
              <Ionicons name="share-social-outline" size={30} color="#FFF" />
              <Text style={styles.actionButtonText}>Compartilhar</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setIsMuted(!isMuted)} style={styles.actionButtonVertical}>
              <Ionicons name={isMuted ? "volume-mute" : "volume-high"} size={30} color="#FFF" />
              <Text style={styles.actionButtonText}>{isMuted ? "Mudo" : "Som"}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
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
      <FlatList
        ref={flatListRef}
        data={replays}
        keyExtractor={(item) => item.id}
        renderItem={renderVideoItem}
        pagingEnabled // Habilita o "snap" para cada item, como no TikTok
        showsVerticalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  videoContainerFull: {
    width: width,
    height: height,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  videoPlayerFull: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
  },
  headerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingTop: Platform.OS === 'android' ? 30 : 50, // Ajuste para status bar
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.3)', // Translúcido
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
  contentOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: 15,
    paddingBottom: 80, // Espaço para a tab bar
    zIndex: 9,
  },
  videoInfo: {
    flex: 1,
    marginRight: 10,
  },
  videoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 5,
  },
  videoSubtitle: {
    fontSize: 14,
    color: '#EEE',
  },
  actionButtonsContainer: {
    alignItems: 'center',
  },
  actionButtonVertical: {
    marginBottom: 20,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#FFF',
    fontSize: 12,
    marginTop: 5,
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
});
