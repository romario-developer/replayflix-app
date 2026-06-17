import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import HomeSkeletonLoader from "../../components/SkeletonLoader";
// import * as ScreenOrientation from "expo-screen-orientation";
import { Image } from "expo-image";
import { useAutoRefresh } from "../../hooks/use-auto-refresh";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
    FlatList,
    // Modal,
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
    ActivityIndicator,
    LayoutAnimation,
    UIManager,
    KeyboardAvoidingView
} from "react-native";


import { useVideoPlayer, VideoView } from "expo-video";
import { getReplays, likeReplay, unlikeReplay, ReplayVideo, getArenas, Arena } from "../../services/api";
import { router } from 'expo-router';

if (Platform.OS === 'android') {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

const { width } = Dimensions.get("window");
// const GRID_ITEM_WIDTH = (width - 4) / 3;
// const CARD_WIDTH = (width - 48) / 2;
const ITEM_WIDTH = width * 0.8; // Largura para o carrossel de destaques

// Função auxiliar para formatar datas no estilo do app
const formatVideoDate = (dateStr?: string) => {
  if (!dateStr) return "16/05/2026 - 19:00:00";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');
    return `${day}/${month}/${year} - ${hours}:${minutes}:${seconds}`;
  } catch {
    return dateStr;
  }
};

// Componente: Player de Vídeo em Linha com Autoplay
const InlineVideoPlayer = ({ videoUrl, isActive }: { videoUrl: string, isActive: boolean }) => {
  const [loading, setLoading] = useState(true);
  const [paused, setPaused] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const webVideoRef = useRef<any>(null);
  const isWeb = Platform.OS === 'web';
  const player = useVideoPlayer(videoUrl, p => {
    p.loop = true;
    p.muted = true;
  });

  // Web: controlar play/pause
  useEffect(() => {
    if (isWeb && webVideoRef.current) {
      if (!isActive) {
        webVideoRef.current.pause();
      } else if (!paused) {
        webVideoRef.current.play().catch(() => {});
      }
    }
  }, [isActive, paused, isWeb]);

  // Native: controlar play/pause
  useEffect(() => {
    if (!isWeb) {
      if (isActive && !paused) {
        player.play();
      } else {
        player.pause();
      }
    }
  }, [isActive, paused, player, isWeb]);

  // Native: status de buffering
  useEffect(() => {
    if (!isWeb) {
      const subscription = player.addListener('statusChange', (payload) => {
        if (payload.status === 'loading') setIsBuffering(true);
        else setIsBuffering(false);
      });
      return () => subscription.remove();
    }
  }, [player, isWeb]);

  // Web: toggle pause
  const togglePauseWeb = (e: any) => {
    e.stopPropagation();
    if (!webVideoRef.current) return;
    if (webVideoRef.current.paused) {
      webVideoRef.current.play();
      setPaused(false);
    } else {
      webVideoRef.current.pause();
      setPaused(true);
    }
  };

  // Web: fullscreen
  const goFullscreen = (e: any) => {
    e.stopPropagation();
    const el = webVideoRef.current;
    if (!el) return;
    if (el.requestFullscreen) el.requestFullscreen();
    else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
    else if (el.webkitEnterFullscreen) el.webkitEnterFullscreen();
    else if (el.msRequestFullscreen) el.msRequestFullscreen();
  };

  // Native: toggle pause
  const togglePauseNative = () => {
    if (paused) {
      player.play();
      setPaused(false);
    } else {
      player.pause();
      setPaused(true);
    }
  };

  if (isWeb) {
    return (
      <View style={styles.inlinePlayerContainer}>
        <video
          ref={webVideoRef}
          src={videoUrl}
          autoPlay={isActive}
          muted
          loop
          playsInline
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          onWaiting={() => setLoading(true)}
          onPlaying={() => setLoading(false)}
          onCanPlay={() => setLoading(false)}
          onClick={togglePauseWeb}
        />
        {loading && (
          <View style={styles.videoLoadingOverlay} pointerEvents="none">
            <ActivityIndicator size="large" color="#D30000" />
          </View>
        )}
        {paused && !loading && (
          <TouchableOpacity 
            style={styles.videoPauseOverlay} 
            onPress={togglePauseWeb}
            activeOpacity={0.8}
          >
            <View style={styles.bigPlayIconCircle}>
              <Ionicons name="play" size={42} color="#FFF" />
            </View>
          </TouchableOpacity>
        )}
        <TouchableOpacity 
          style={styles.fullscreenBtn} 
          onPress={goFullscreen}
          activeOpacity={0.7}
        >
          <Ionicons name="expand-outline" size={20} color="#FFF" />
        </TouchableOpacity>
      </View>
    );
  }

  // Native
  return (
    <View style={styles.inlinePlayerContainer}>
      <TouchableOpacity 
        activeOpacity={1} 
        onPress={togglePauseNative}
        style={{ width: '100%', height: '100%' }}
      >
        <VideoView
          player={player}
          style={styles.feedCardMedia}
          nativeControls={false}
          contentFit="cover"
          allowsFullscreen
        />
      </TouchableOpacity>
      {isBuffering && (
        <View style={styles.videoLoadingOverlay} pointerEvents="none">
          <ActivityIndicator size="large" color="#D30000" />
        </View>
      )}
      {paused && !isBuffering && (
        <TouchableOpacity 
          style={styles.videoPauseOverlay} 
          onPress={togglePauseNative}
          activeOpacity={0.8}
        >
          <View style={styles.bigPlayIconCircle}>
            <Ionicons name="play" size={42} color="#FFF" />
          </View>
        </TouchableOpacity>
      )}
      <TouchableOpacity 
        style={styles.fullscreenBtn} 
        onPress={() => {
          try {
            (player as any).enterFullscreen?.();
          } catch (e) {
            console.warn('Fullscreen indisponível:', e);
          }
        }}
        activeOpacity={0.7}
      >
        <Ionicons name="expand-outline" size={20} color="#FFF" />
      </TouchableOpacity>
    </View>
  );
};

// Componente 2: Card Estilo Feed 1 Coluna (Estilo ReplayFlix Clássico)
const InstagramFeedCard = ({
  video,
  toggleLike,
  toggleFavorite,
  isFavorite,
  isActive,
  handleShare,
  openComments,
  commentCount,
  currentUserId,
  currentUserAvatar
}: {
  video: ReplayVideo;
  toggleLike: (video: ReplayVideo) => void;
  toggleFavorite: (video: ReplayVideo) => void;
  isFavorite: boolean;
  isActive: boolean;
  handleShare: (video: ReplayVideo) => void;
  openComments: (video: ReplayVideo) => void;
  commentCount?: number;
  currentUserId?: string | null;
  currentUserAvatar?: string;
}) => {
  const isLiked = !!video.liked_by_me;
  const isMyVideo = video.user_id && currentUserId && video.user_id.toString() === currentUserId.toString();
  const avatarToUse = isMyVideo && currentUserAvatar
    ? currentUserAvatar
    : `https://ui-avatars.com/api/?name=${encodeURIComponent(video.arena || 'Arena')}&background=random&color=fff`;

  return (
    <View style={styles.feedCardContainer}>
      {/* Cabeçalho do Card */}
      <View style={styles.feedCardHeader}>
        <Image 
  source={{ uri: avatarToUse }} 
  style={styles.feedCardAvatar}
  cachePolicy="memory-disk"
  transition={100}
/>
        <View style={styles.feedCardHeaderTexts}>
          <Text style={styles.feedCardUsername}>{video.titulo || video.arena}</Text>
        </View>
        
      </View>

      {/* Mídia do Card (Player inline ou Thumbnail estática) - SEM OPÇÃO DE CLIQUE */}
      <View style={styles.feedCardMediaWrapper}>
        {isActive ? (
          <InlineVideoPlayer 
            videoUrl={video.video_url || `https://yojoumansleqwjwdiyde.supabase.co/storage/v1/object/public/replays/${video.filename}`} 
            isActive={isActive} 
          />
        ) : (
          <View style={{ width: '100%', height: '100%', position: 'relative' }}>
           <Image
  source={{ uri: video.thumbnail_url }}
  style={styles.feedCardMedia}
  contentFit="cover"
  transition={200}
  priority={isActive ? 'high' : 'normal'}
  placeholder={{ blurhash: 'L00000fQfQfQfQfQfQfQfQfQfQfQ' }}
  placeholderContentFit="cover"
  cachePolicy="memory-disk"
/>
            <View style={styles.feedPlayOverlay}>
              <Ionicons name="play" size={30} color="#FFF" style={styles.feedPlayIcon} />
            </View>
          </View>
        )}
      </View>

      {/* Ações Inferiores (Coração, etc) */}
      <View style={styles.feedActionsRow}>
        <View style={styles.feedLeftActions}>
          <TouchableOpacity onPress={() => toggleLike(video)} style={styles.feedActionButton}>
            <Ionicons name={isLiked ? "heart" : "heart-outline"} size={26} color={isLiked ? "#D30000" : "#FFF"} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => openComments(video)} style={styles.feedActionButton}>
            <Ionicons name="chatbubble-outline" size={24} color="#FFF" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleShare(video)} style={styles.feedActionButton}>
            <Ionicons name="paper-plane-outline" size={24} color="#FFF" />
          </TouchableOpacity>
        </View>
        <TouchableOpacity onPress={() => toggleFavorite(video)} style={styles.feedActionButton}>
          <Ionicons name={isFavorite ? "bookmark" : "bookmark-outline"} size={24} color={isFavorite ? "#FFD700" : "#FFF"} />
        </TouchableOpacity>
      </View>

      {/* Detalhes */}
      <View style={styles.feedCardDetails}>
        <Text style={styles.feedLikesText}>{video.likes || 0} curtidas</Text>
        <View style={styles.feedDescriptionRow}>
          <Text style={styles.feedCardTextUsername}>{video.arena} </Text>
          <Text style={styles.feedDescriptionText}>{formatVideoDate(video.created_at)}</Text>
        </View>
        {commentCount !== undefined && commentCount > 0 && (
          <TouchableOpacity onPress={() => openComments(video)}>
            <Text style={{ color: '#8E8E93', marginTop: 5, fontSize: 14 }}>
              Ver todos os {commentCount} comentários
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

// Componente Barra de Stories / Arenas Ao Vivo no Topo
const LiveStoriesBar = ({ 
  arenas, 
  selectedArenaId, 
  onSelectArena 
}: { 
  arenas: Arena[]; 
  selectedArenaId: string | null; 
  onSelectArena: (id: string | null) => void;
}) => {
  if (!arenas || arenas.length === 0) return null;

  return (
    <View style={styles.storiesContainer}>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        contentContainerStyle={styles.storiesScrollContent}
      >
        {/* Item "Todas" — sempre aparece primeiro, pra limpar filtro */}
        <TouchableOpacity 
          style={styles.storyWrapper} 
          onPress={() => onSelectArena(null)}
          activeOpacity={0.7}
        >
          <View style={[
            styles.storyAvatarContainer,
            !selectedArenaId && styles.storyLiveBorder
          ]}>
            <View style={styles.storyAllIcon}>
              <Ionicons name="apps" size={22} color="#FFF" />
            </View>
          </View>
          <Text style={[
            styles.storyName,
            !selectedArenaId && styles.storyNameActive
          ]} numberOfLines={1}>Todas</Text>
        </TouchableOpacity>

        {/* Arenas reais do banco */}
        {arenas.map(arena => {
          const isSelected = selectedArenaId === arena.id;
          const fallbackImg = `https://ui-avatars.com/api/?name=${encodeURIComponent(arena.nome)}&background=D30000&color=fff&bold=true&size=120`;
          return (
            <TouchableOpacity 
              key={arena.id} 
              style={styles.storyWrapper}
              onPress={() => onSelectArena(arena.id)}
              activeOpacity={0.7}
            >
              <View style={[
                styles.storyAvatarContainer, 
                isSelected && styles.storyLiveBorder
              ]}>
                <Image 
                  source={{ uri: arena.foto_url || fallbackImg }} 
                  style={styles.storyAvatar} 
                />
              </View>
              <Text style={[
                styles.storyName,
                isSelected && styles.storyNameActive
              ]} numberOfLines={1}>{arena.nome}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

export default function HomeScreen() {
  const [replays, setReplays] = useState<ReplayVideo[]>([]);
  const [arenas, setArenas] = useState<Arena[]>([]);
  const [selectedArenaId, setSelectedArenaId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState<ReplayVideo | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState("");
  const [comments, setComments] = useState<{ [key: string]: string[] }>({});
  const [favoriteReplays, setFavoriteReplays] = useState<string[]>([]);
  // const [viewMode, setViewMode] = useState<'feed' | 'grid'>('feed'); // Seletor do visualizador
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);
  const [userAvatar, setUserAvatar] = useState('https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80');

  // Configurações para rastrear qual item está visível e disparar o autoplay
  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 60,
  }).current;

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: any[] }) => {
    if (viewableItems.length > 0) {
      const firstVisible = viewableItems.find(item => item.isViewable);
      if (firstVisible) {
        setActiveVideoId(firstVisible.item.id);
      }
    }
  }).current;


  useEffect(() => {
    const init = async () => {
      try {
        const [uid, savedComments, savedFavorites] = await Promise.all([
          AsyncStorage.getItem("userId"),
          AsyncStorage.getItem("@video_comments"),
          AsyncStorage.getItem("@favorite_replays"),
        ]);
        if (uid) {
          setUserId(uid);
          const avatar = await AsyncStorage.getItem(`avatar_${uid}`);
          if (avatar) setUserAvatar(avatar);
        }
        if (savedComments) setComments(JSON.parse(savedComments));
        if (savedFavorites) setFavoriteReplays(JSON.parse(savedFavorites));
        // carregarDados só pode ser usado após a declaração
      } catch (e) {
        console.error("Erro ao inicializar:", e);
      }
    };
    init();
  }, []);

  const carregarDados = useCallback(async (uid?: string | null) => {
  try {
    const idParaUsar = uid !== undefined ? uid : userId;

    // Tenta usar dados pré-fetchados (disparados no +html.tsx antes do React montar)
    let dados: ReplayVideo[] | null = null;
    if (typeof window !== 'undefined') {
      const prefetched = (window as any).__prefetchedReplays;
      const promise = (window as any).__prefetchPromise;

      if (prefetched) {
        // Já chegou — usa direto, sem fetch novo
        console.log('[CACHE] usando dados pré-fetchados');
        dados = prefetched;
        // Limpa pra não usar de novo nos refresh
        (window as any).__prefetchedReplays = null;
      } else if (promise) {
        // Ainda chegando — espera ela terminar (não dispara fetch duplicado)
        try {
          console.log('[CACHE] aguardando pré-fetch...');
          dados = await promise;
          (window as any).__prefetchedReplays = null;
        } catch  {
          dados = null;

      }
    }

    // Fallback: se não tem cache nem promise, faz fetch normal
    if (!dados) {
      dados = await getReplays(idParaUsar);
    }

    setReplays(dados);
    if (dados && dados.length > 0) {
      setActiveVideoId(dados[0].id);
    }

    // Carrega arenas (não bloqueia a renderização)
    const arenasDoBanco = await getArenas();
    const arenasComVideo = arenasDoBanco.filter(a =>
      dados!.some(v => v.arena_id === a.id)
    );
    setArenas(arenasComVideo);
  } catch (error) {
    console.error("Erro ao carregar replays:", error);
  } finally {
    setLoading(false);
    if (typeof window !== 'undefined' && (window as any).__splashDone) {
      (window as any).__splashDone();
    }
  }
}, [userId]);

   useAutoRefresh(() => {
  carregarDados();
}, 5000);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await carregarDados();
    setRefreshing(false);
  }, [carregarDados]);

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
    const videoKey = selectedVideo.filename;
    const newComments = {
      ...comments,
      [videoKey]: [...(comments[videoKey] || []), commentText.trim()],
    };
    setComments(newComments);
    setCommentText("");
    await AsyncStorage.setItem("@video_comments", JSON.stringify(newComments));
  };

  const openCommentsWithAnimation = (video: ReplayVideo) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSelectedVideo(video);
  };

  const closeCommentsWithAnimation = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSelectedVideo(null);
  };

  // const handleVideoSelect = (video: ReplayVideo) => {
  //   openCommentsWithAnimation(video);
  // };

  // const renderFeatured = () => {
  //   if (replays.length === 0) return null;
  //   return (
  //     <Animated.View entering={FadeInDown.duration(800)} style={styles.featuredContainer}>
  //       <Text style={styles.sectionHeader}>Destaques da Galera</Text>
  //       <FlatList ... />
  //     </Animated.View>
  //   );
  // };

  if (loading) {
  return <HomeSkeletonLoader />;
}

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <Text style={styles.headerTitle}>REPLAY<Text style={styles.highlight}>FLIX</Text></Text>
          <View style={styles.onlineStatus} />
        </View>
        <TouchableOpacity style={styles.profileBtn} onPress={() => router.push('/profile')}>
           <Image
             source={{ uri: userAvatar }}
             style={styles.avatar}
           />
        </TouchableOpacity>
      </View>

      {selectedVideo ? (
        <View style={{ flex: 0.35, width: '100%', backgroundColor: '#000', overflow: 'hidden', justifyContent: 'center' }}>
          <InlineVideoPlayer 
            videoUrl={selectedVideo.video_url || `https://yojoumansleqwjwdiyde.supabase.co/storage/v1/object/public/replays/${selectedVideo.filename}`} 
            isActive={true} 
          />
        </View>
      ) : (
        <View style={{ flex: 1, width: '100%', overflow: 'hidden' }}>
          <FlatList
            key="feed"
            data={selectedArenaId 
  ? replays.filter(v => v.arena_id === selectedArenaId)
  : replays}
            keyExtractor={(item) => item.id}
            ListHeaderComponent={
  <LiveStoriesBar 
    arenas={arenas}
    selectedArenaId={selectedArenaId}
    onSelectArena={setSelectedArenaId}
  />
}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#D30000" />
            }
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={viewabilityConfig}
            renderItem={({ item }) => (
              <InstagramFeedCard
                video={item}
                toggleLike={toggleLike}
                toggleFavorite={toggleFavorite}
                isFavorite={favoriteReplays.includes(item.filename)}
                isActive={item.id === activeVideoId}
                handleShare={handleShare}
                openComments={openCommentsWithAnimation}
                commentCount={(comments[item.filename] || []).length}
                currentUserId={userId}
                currentUserAvatar={userAvatar}
              />
            )}
            contentContainerStyle={{ paddingBottom: 100 }}
          />
        </View>
      )}

      {/* Painel de Comentários Integrado (Substitui o Modal) */}
      {!!selectedVideo && (
        <KeyboardAvoidingView 
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 0.65, width: '100%' }}
        >
          <View style={styles.commentsSheet}>
            <View style={styles.commentsHeader}>
              <Text style={styles.commentsTitle}>
                Comentários ({(selectedVideo && comments[selectedVideo.filename] || []).length})
              </Text>
              <TouchableOpacity onPress={closeCommentsWithAnimation}>
                <Ionicons name="close" size={24} color="#FFF" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.commentsScroll}>
              {(selectedVideo && comments[selectedVideo.filename] || []).map((comment, i) => (
                <View key={i} style={styles.commentContainer}>
                  <Image
                    source={{ uri: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80' }}
                    style={styles.commentAvatar}
                  />
                  <View style={styles.commentContent}>
                    <Text style={styles.commentAuthor}>Visitante</Text>
                    <Text style={styles.commentText}>{comment}</Text>
                  </View>
                </View>
              ))}
              {(selectedVideo && (!comments[selectedVideo.filename] || comments[selectedVideo.filename].length === 0)) && (
                <Text style={styles.emptyCommentsText}>Nenhum comentário ainda. Seja o primeiro!</Text>
              )}
            </ScrollView>

            <View style={styles.commentInputRow}>
              <TextInput
                style={styles.commentInput}
                placeholder="Adicione um comentário..."
                placeholderTextColor="#8E8E93"
                value={commentText}
                onChangeText={setCommentText}
              />
              <TouchableOpacity onPress={addComment} style={styles.sendButton}>
                <Ionicons name="send" size={20} color="#FFF" />
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      )}
    </View>
  );
}



const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0A0A0A",
    maxWidth: 800,
    alignSelf: 'center',
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 45,
    paddingBottom: 15,
    backgroundColor: '#0A0A0A',
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFF',
    letterSpacing: 1,
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
    marginTop: 4,
  },
  profileBtn: {
    padding: 2,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#D30000',
  },
  
  // Stories / "Ao Vivo"
  storiesContainer: {
    backgroundColor: '#0A0A0A',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  storiesScrollContent: {
    paddingHorizontal: 15,
    gap: 15,
  },
  storyWrapper: {
    alignItems: 'center',
    width: 70,
  },
  storyAvatarContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    padding: 2,
    backgroundColor: '#000',
    borderWidth: 1,
    borderColor: '#222',
    justifyContent: 'center',
    alignItems: 'center',
  },
  storyLiveBorder: {
    borderColor: '#D30000',
    borderWidth: 2,
  },
  storyAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  liveStoryBadge: {
    backgroundColor: '#D30000',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginTop: -8,
    borderWidth: 1,
    borderColor: '#0A0A0A',
  },
  liveStoryBadgeText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: 'bold',
  },
  storyName: {
    fontSize: 11,
    color: '#FFF',
    marginTop: 4,
    textAlign: 'center',
  },

  storyNameActive: {
  color: '#D30000',
  fontWeight: '900',
},
storyAllIcon: {
  width: '100%',
  height: '100%',
  borderRadius: 30,
  backgroundColor: '#1A1A1A',
  justifyContent: 'center',
  alignItems: 'center',
},

  // Feed Card
  feedCardContainer: {
    marginBottom: 20,
    backgroundColor: '#000',
  },
  feedCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 12,
  },
  feedCardAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: '#222',
  },
  feedCardHeaderTexts: {
    flex: 1,
    marginLeft: 12,
  },
  feedCardUsername: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  feedCardMore: {
    padding: 5,
  },
  feedCardMediaWrapper: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#000',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  feedCardMedia: {
    width: '100%',
    height: '100%',
  },
  inlinePlayerContainer: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  videoLoadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  feedPlayOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  feedPlayIcon: {
    opacity: 0.8,
  },
  feedActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 12,
  },
  feedLeftActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  feedActionButton: {
    padding: 2,
  },
  feedCardDetails: {
    paddingHorizontal: 15,
    paddingBottom: 15,
  },
  feedLikesText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 14,
    marginBottom: 6,
  },
  feedDescriptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  feedCardTextUsername: {
    fontWeight: 'bold',
    color: '#FFF',
    fontSize: 14,
  },
  feedDescriptionText: {
    color: '#CCC',
    fontSize: 14,
  },
  
  // Destaques da Galera
  featuredContainer: {
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  sectionHeader: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 15,
    marginBottom: 10,
  },
  featuredCard: {
    width: ITEM_WIDTH,
    height: ITEM_WIDTH * 0.6,
    marginLeft: 15,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  featuredImage: {
    width: '100%',
    height: '100%',
  },
  featuredOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 15,
    paddingTop: 40,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(211,0,0,0.8)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFF',
    marginRight: 4,
  },
  liveText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  featuredTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  playButtonFeatured: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  playButtonText: {
    color: '#000',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  
  // Comments Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  commentsSheet: {
    flex: 1,
    backgroundColor: '#1A1A1A',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
  },
  commentsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    paddingBottom: 15,
  },
  commentsTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  commentsScroll: {
    flex: 1,
  },
  commentContainer: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  commentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 12,
  },
  commentContent: {
    flex: 1,
  },
  commentAuthor: {
    color: '#8E8E93',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
  },
  commentText: {
    color: '#FFF',
    fontSize: 14,
  },
  emptyCommentsText: {
    color: '#8E8E93',
    textAlign: 'center',
    marginTop: 30,
  },
  commentInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 15,
  },
  commentInput: {
    flex: 1,
    backgroundColor: '#0A0A0A',
    color: '#FFF',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 14,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#333',
  },
  sendButton: {
    backgroundColor: '#D30000',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },

  videoPauseOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  bigPlayIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenBtn: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
