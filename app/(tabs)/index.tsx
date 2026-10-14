import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import HomeSkeletonLoader from "../../components/SkeletonLoader";
import AoVivoCard from "../../components/AoVivoCard";
// import * as ScreenOrientation from "expo-screen-orientation";
import { Image } from "expo-image";
import { useAutoRefresh } from "../../hooks/use-auto-refresh";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
    Alert,
    FlatList,
    Modal,
    Pressable,
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
    KeyboardAvoidingView,
    Linking
} from "react-native";


import { useVideoPlayer, VideoView } from "expo-video";
import { getReplays, likeReplay, unlikeReplay, vincularReplay, getComentarios, postComentario, getConfig, ReplayVideo, Comentario, AppConfig, getArenas, Arena } from "../../services/api";
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';

// Endereço do app (pra montar o link do baba). Na web usa o próprio domínio.
const APP_URL = Platform.OS === 'web' && typeof window !== 'undefined'
  ? window.location.origin
  : 'https://replayflix.com.br';

if (Platform.OS === 'android') {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

const PAGE_SIZE = 20; // quantos replays carregar por página do feed

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
const InlineVideoPlayer = ({ videoUrl, isActive, soundOn, onToggleSound }: {
  videoUrl: string;
  isActive: boolean;
  soundOn: boolean;
  onToggleSound: () => void;
}) => {
  const [loading, setLoading] = useState(true);
  const [paused, setPaused] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const webVideoRef = useRef<any>(null);
  const isWeb = Platform.OS === 'web';
  const player = useVideoPlayer(videoUrl, p => {
    p.loop = true;
    p.muted = !soundOn;
  });

  // Web: controlar play/pause + som. Se o navegador bloquear autoplay
  // com som, cai pro mudo em vez de travar o vídeo.
  useEffect(() => {
    if (isWeb && webVideoRef.current) {
      const v = webVideoRef.current;
      if (!isActive) {
        v.pause();
      } else if (!paused) {
        v.muted = !soundOn;
        v.play().catch(() => {
          v.muted = true;
          v.play().catch(() => {});
        });
      }
    }
  }, [isActive, paused, isWeb, soundOn]);

  // Native: controlar play/pause + som
  useEffect(() => {
    if (!isWeb) {
      player.muted = !soundOn;
      if (isActive && !paused) {
        player.play();
      } else {
        player.pause();
      }
    }
  }, [isActive, paused, player, isWeb, soundOn]);

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
          muted={!soundOn}
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
        <TouchableOpacity
          style={styles.soundBtn}
          onPress={(e: any) => { e.stopPropagation?.(); onToggleSound(); }}
          activeOpacity={0.7}
        >
          <Ionicons name={soundOn ? "volume-high" : "volume-mute"} size={20} color="#FFF" />
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
      <TouchableOpacity
        style={styles.soundBtn}
        onPress={onToggleSound}
        activeOpacity={0.7}
      >
        <Ionicons name={soundOn ? "volume-high" : "volume-mute"} size={20} color="#FFF" />
      </TouchableOpacity>
    </View>
  );
};

// Convite pra entrar, no visual do app (no lugar do confirm() cinza do
// navegador). Texto e ícone mudam conforme o que o visitante tentou fazer.
type AcaoLogin = 'baixar' | 'curtir' | 'comentar' | 'meu';

const CONVITES: Record<AcaoLogin, { icone: keyof typeof Ionicons.glyphMap; titulo: string; texto: string }> = {
  baixar: { icone: 'download', titulo: 'Baixe esse lance', texto: 'Entre na ReplayFlix pra salvar o lance no seu celular e mandar pra galera.' },
  curtir: { icone: 'heart', titulo: 'Curta os lances', texto: 'Entre pra curtir e ajudar a escolher os melhores lances do baba.' },
  comentar: { icone: 'chatbubble-ellipses', titulo: 'Comente o lance', texto: 'Entre pra comentar e resenhar o lance com a galera.' },
  meu: { icone: 'football', titulo: 'Esse lance é seu?', texto: 'Entre pra guardar esse lance no seu perfil de jogador.' },
};

const ConviteLogin = ({ acao, onFechar, onEntrar }: {
  acao: AcaoLogin | null;
  onFechar: () => void;
  onEntrar: () => void;
}) => {
  const c = acao ? CONVITES[acao] : null;
  return (
    <Modal visible={!!c} transparent animationType="fade" onRequestClose={onFechar}>
      <Pressable style={styles.conviteFundo} onPress={onFechar}>
        {/* Toque fora do cartão fecha; dentro do cartão, não */}
        <Pressable style={styles.conviteCartao} onPress={() => {}}>
          <TouchableOpacity style={styles.conviteFechar} onPress={onFechar} hitSlop={12}>
            <Ionicons name="close" size={22} color="#777" />
          </TouchableOpacity>
          <View style={styles.conviteIcone}>
            {c && <Ionicons name={c.icone} size={34} color="#FFF" />}
          </View>
          <Text style={styles.conviteTitulo}>{c?.titulo}</Text>
          <Text style={styles.conviteTexto}>{c?.texto}</Text>
          <TouchableOpacity style={styles.conviteBotao} onPress={onEntrar} activeOpacity={0.85}>
            <Text style={styles.conviteBotaoTexto}>ENTRAR OU CRIAR CONTA</Text>
          </TouchableOpacity>
          <View style={styles.conviteGoogle}>
            <Ionicons name="logo-google" size={13} color="#888" />
            <Text style={styles.conviteGoogleTexto}>Dá pra entrar com o Google em 1 toque</Text>
          </View>
          <TouchableOpacity onPress={onFechar} style={styles.conviteAgoraNao}>
            <Text style={styles.conviteAgoraNaoTexto}>Agora não</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

// Componente 2: Card Estilo Feed 1 Coluna (Estilo ReplayFlix Clássico)
const InstagramFeedCard = ({
  video,
  toggleLike,
  isActive,
  handleShare,
  handleDownload,
  openComments,
  claimLance,
  unclaimLance,
  commentCount,
  currentUserId,
  arenaFoto,
  soundOn,
  onToggleSound
}: {
  video: ReplayVideo;
  toggleLike: (video: ReplayVideo) => void;
  isActive: boolean;
  handleShare: (video: ReplayVideo) => void;
  handleDownload: (video: ReplayVideo) => void;
  openComments: (video: ReplayVideo) => void;
  claimLance: (video: ReplayVideo) => void;
  unclaimLance: (video: ReplayVideo) => void;
  commentCount?: number;
  currentUserId?: string | null;
  arenaFoto?: string | null;
  soundOn: boolean;
  onToggleSound: () => void;
}) => {
  const isLiked = !!video.liked_by_me;
  const isMyVideo = video.user_id && currentUserId && video.user_id.toString() === currentUserId.toString();
  // Lance sem dono = pode reivindicar ("esse gol é meu!"). Sem conta, o botão
  // aparece igual e leva pro login — é o melhor convite pra criar conta.
  const podeReivindicar = !video.user_id;
  // O card representa a ARENA (nunca a foto do usuário): foto da arena se
  // tiver, senão as iniciais num avatar colorido.
  const avatarToUse = arenaFoto
    || `https://ui-avatars.com/api/?name=${encodeURIComponent(video.arena || 'Arena')}&background=1A1A1A&color=fff&bold=true`;

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
          {/* Em cima, junto da foto: a ARENA. O título do lance fica
              embaixo, perto da data. */}
          <Text style={styles.feedCardUsername}>{video.arena}</Text>
        </View>
        
      </View>

      {/* Mídia do Card (Player inline ou Thumbnail estática) - SEM OPÇÃO DE CLIQUE */}
      <View style={styles.feedCardMediaWrapper}>
        {isActive ? (
          <InlineVideoPlayer
            videoUrl={video.video_url || `https://yojoumansleqwjwdiyde.supabase.co/storage/v1/object/public/replays/${video.filename}`}
            isActive={isActive}
            soundOn={soundOn}
            onToggleSound={onToggleSound}
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
          <TouchableOpacity onPress={() => handleDownload(video)} style={styles.feedActionButton}>
            <Ionicons name="download-outline" size={25} color="#FFF" />
          </TouchableOpacity>
          {podeReivindicar && (
            <TouchableOpacity onPress={() => claimLance(video)} style={styles.claimButton}>
              <Ionicons name="football" size={16} color="#FFF" />
              <Text style={styles.claimButtonText}>É meu!</Text>
            </TouchableOpacity>
          )}
          {isMyVideo && (
            <TouchableOpacity onPress={() => unclaimLance(video)} style={styles.myLanceBadge}>
              <Ionicons name="checkmark-circle" size={14} color="#00C853" />
              <Text style={styles.myLanceBadgeText}>Seu lance</Text>
              <Ionicons name="close" size={13} color="#00C853" style={{ marginLeft: 2 }} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Detalhes */}
      <View style={styles.feedCardDetails}>
        <Text style={styles.feedLikesText}>{video.likes || 0} curtidas</Text>
        <View style={styles.feedDescriptionRow}>
          <Text style={styles.feedCardTextUsername}>{video.titulo || "Lance Oficial ⚽"} </Text>
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

// Card de destaque no topo do feed (vídeo de propaganda / onboarding).
// Reaproveita o player inline; toca em loop, mudo por padrão.
const DestaqueCard = ({ videoUrl, titulo, soundOn, onToggleSound }: {
  videoUrl: string; titulo?: string; soundOn: boolean; onToggleSound: () => void;
}) => (
  <View style={styles.destaqueCard}>
    <View style={styles.destaqueLabelRow}>
      <Ionicons name="megaphone" size={14} color="#FFD54A" />
      <Text style={styles.destaqueLabel}>{titulo || 'Conheça o ReplayFlix'}</Text>
    </View>
    <View style={styles.feedCardMediaWrapper}>
      <InlineVideoPlayer videoUrl={videoUrl} isActive={true} soundOn={soundOn} onToggleSound={onToggleSound} />
    </View>
  </View>
);

export default function HomeScreen() {
  const [replays, setReplays] = useState<ReplayVideo[]>([]);
  const [arenas, setArenas] = useState<Arena[]>([]);
  // Link do baba (replayflix.com.br/?arena=ID) abre o feed já filtrado
  const { arena: arenaDoLink } = useLocalSearchParams<{ arena?: string }>();
  const [selectedArenaId, setSelectedArenaId] = useState<string | null>(arenaDoLink || null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState<ReplayVideo | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState("");
  // Comentários do vídeo aberto (vêm do servidor — todo mundo vê os mesmos)
  const [comentarios, setComentarios] = useState<Comentario[]>([]);
  const [loadingComentarios, setLoadingComentarios] = useState(false);
  // const [viewMode, setViewMode] = useState<'feed' | 'grid'>('feed'); // Seletor do visualizador
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);
  const [userAvatar, setUserAvatar] = useState('https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80');
  const [destaque, setDestaque] = useState<AppConfig>({});

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
        const uid = await AsyncStorage.getItem("userId");
        if (uid) {
          setUserId(uid);
          const avatar = await AsyncStorage.getItem(`avatar_${uid}`);
          if (avatar) setUserAvatar(avatar);
        }
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
        } catch (e) {
          dados = null;
        }
      }
    }

    // Fallback: se não tem cache nem promise, faz fetch normal
    if (!dados) {
      dados = await getReplays(idParaUsar, PAGE_SIZE);
    }

    setReplays(dados);
    setHasMore(dados.length >= PAGE_SIZE);
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

  // Carrega o feed na montagem e recarrega quando o userId chegar do
  // AsyncStorage. Sem isso, a tela ficava no skeleton até a janela
  // perder e ganhar foco (único gatilho do useAutoRefresh).
  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  // Config do topo do feed: vídeo de destaque e transmissão ao vivo. Relê a
  // cada minuto, pra transmissão aparecer/sumir sem recarregar o app.
  useEffect(() => {
    const ler = () => getConfig().then(setDestaque).catch(() => {});
    ler();
    const t = setInterval(ler, 60000);
    return () => clearInterval(t);
  }, []);
  const aoVivoAtivo = destaque.aovivo_ativo === '1' && !!destaque.aovivo_url;

  // Som do feed: começa mudo (regra dos navegadores); o usuário ativa
  // uma vez no alto-falante do vídeo e a escolha fica salva pra sempre.
  const [soundOn, setSoundOn] = useState(false);
  useEffect(() => {
    AsyncStorage.getItem("@sound_on").then(v => { if (v === "1") setSoundOn(true); });
  }, []);
  const toggleSound = useCallback(() => {
    setSoundOn(prev => {
      const novo = !prev;
      AsyncStorage.setItem("@sound_on", novo ? "1" : "0");
      return novo;
    });
  }, []);

  // Recarrega o avatar sempre que a Home ganha foco — assim, ao trocar
  // a foto no perfil e voltar, o avatar do topo atualiza na hora.
  useFocusEffect(
    useCallback(() => {
      (async () => {
        const uid = await AsyncStorage.getItem("userId");
        if (uid) {
          const avatar = await AsyncStorage.getItem(`avatar_${uid}`);
          if (avatar) setUserAvatar(avatar);
        }
      })();
    }, [])
  );

  // A cada 15s sincroniza o feed com o servidor, sem recarregar a lista
  // nem perder o scroll: lances novos entram no topo, e os existentes
  // atualizam likes, comentários, título e dono. Arena nova (primeiro
  // lance dela) também entra na barra do topo na hora.
  useEffect(() => {
    const timer = setInterval(async () => {
      try {
        const recentes = await getReplays(userId, PAGE_SIZE, 0);
        if (!recentes || recentes.length === 0) return;

        setReplays(prev => {
          const porId = new Map(recentes.map(v => [v.id, v]));
          const atualizados = prev.map(v => (porId.has(v.id) ? { ...v, ...porId.get(v.id) } : v));
          const idsAtuais = new Set(prev.map(v => v.id));
          const novos = recentes.filter(v => !idsAtuais.has(v.id));
          return novos.length > 0 ? [...novos, ...atualizados] : atualizados;
        });

        // Chegou lance de uma arena que ainda não está na barra? Atualiza.
        const conhecidas = new Set(arenas.map(a => a.id));
        if (recentes.some(v => v.arena_id && !conhecidas.has(v.arena_id))) {
          const todas = await getArenas();
          setArenas(todas.filter(a =>
            conhecidas.has(a.id) || recentes.some(v => v.arena_id === a.id)
          ));
        }
      } catch { /* sem rede agora — tenta de novo no próximo ciclo */ }
    }, 15000);
    return () => clearInterval(timer);
  }, [userId, arenas]);

   useAutoRefresh(() => {
  carregarDados();
}, 5000);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await carregarDados();
    setRefreshing(false);
  }, [carregarDados]);

  // Infinite scroll: carrega a próxima página quando o usuário chega perto do fim
  const carregarMais = useCallback(async () => {
    if (loadingMore || !hasMore || loading) return;
    setLoadingMore(true);
    try {
      const novos = await getReplays(userId, PAGE_SIZE, replays.length);
      if (novos.length < PAGE_SIZE) setHasMore(false);
      if (novos.length > 0) {
        setReplays(prev => {
          const idsExistentes = new Set(prev.map(v => v.id));
          return [...prev, ...novos.filter(v => !idsExistentes.has(v.id))];
        });
      }
    } catch (e) {
      console.error("Erro ao carregar mais replays:", e);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore, loading, userId, replays.length]);

  useEffect(() => {
    if (arenaDoLink) setSelectedArenaId(arenaDoLink);
  }, [arenaDoLink]);

  // Assistir é livre; curtir, comentar, baixar e "É meu!" pedem conta.
  const [conviteLogin, setConviteLogin] = useState<AcaoLogin | null>(null);
  const pedirLogin = (acao: AcaoLogin) => setConviteLogin(acao);

  const toggleLike = async (video: ReplayVideo) => {
    if (!userId) {
      pedirLogin("curtir");
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

  // "Esse lance é meu!": vincula o lance ao perfil e já favorita
  const reivindicarLance = async (video: ReplayVideo) => {
    if (!userId) {
      pedirLogin("meu");
      return;
    }
    const resp = await vincularReplay(video.filename, userId);
    if (!resp) {
      // Causa mais comum: sessão de antes do login por token (sem JWT salvo)
      const msg = "Não consegui vincular o lance. Sua sessão pode estar desatualizada — saia da conta e entre de novo.";
      if (Platform.OS === "web") window.alert(msg);
      else Alert.alert("Ops", msg);
      return;
    }

    setReplays(prev => prev.map(v =>
      v.filename === video.filename ? { ...v, user_id: userId } : v
    ));
  };

  // Desmarcar "meu lance": desvincula do perfil (marcou por engano)
  const desmarcarLance = async (video: ReplayVideo) => {
    if (!userId) return;
    const confirmar = () => desfazerVinculo(video);
    const msg = `Tirar "${video.titulo || video.arena}" dos seus lances?`;
    if (Platform.OS === "web") {
      if (window.confirm(msg)) confirmar();
    } else {
      Alert.alert("Desmarcar lance", msg, [
        { text: "Cancelar", style: "cancel" },
        { text: "Desmarcar", style: "destructive", onPress: confirmar },
      ]);
    }
  };

  const desfazerVinculo = async (video: ReplayVideo) => {
    const resp = await vincularReplay(video.filename, null);
    if (!resp) {
      const msg = "Não consegui desmarcar o lance. Tente novamente.";
      if (Platform.OS === "web") window.alert(msg);
      else Alert.alert("Ops", msg);
      return;
    }
    setReplays(prev => prev.map(v =>
      v.filename === video.filename ? { ...v, user_id: null } : v
    ));
  };

  const handleShare = async (video: ReplayVideo) => {
    // Link curto no domínio do app: replayflix.com.br/v/311293e7. O Vercel
    // repassa /v/* pro servidor, que monta a página com preview bonito no
    // WhatsApp + player + botão de baixar. 8 primeiros caracteres do id bastam.
    const url = `${APP_URL}/v/${String(video.id).slice(0, 8)}`;
    const titulo = video.titulo || "Lance Oficial ⚽";
    const message = `${titulo} — olha esse lance na ReplayFlix!\n${url}`;
    // Navegador de computador geralmente não tem menu de compartilhar
    if (Platform.OS === "web" && !(navigator as any).share) {
      try {
        await navigator.clipboard.writeText(message);
        window.alert("Link do lance copiado! Cola no grupo.");
      } catch {
        window.prompt("Copie o link do lance:", url);
      }
      return;
    }
    try {
      await Share.share({ message, url });
    } catch (error) {
      console.error("Erro ao compartilhar:", error);
    }
  };

  // Baixar o lance (só com conta). O ?download= faz o Supabase mandar o
  // arquivo como anexo, então o navegador salva sem sair do app.
  const handleDownload = (video: ReplayVideo) => {
    if (!userId) {
      pedirLogin("baixar");
      return;
    }
    const base = video.video_url || `https://yojoumansleqwjwdiyde.supabase.co/storage/v1/object/public/replays/${video.filename}`;
    const nome = (video.titulo || "lance").normalize("NFD").replace(/[̀-ͯ]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase() || "lance";
    const url = `${base}?download=${encodeURIComponent(`ReplayFlix-${nome}.mp4`)}`;
    if (Platform.OS === "web") {
      const a = document.createElement("a");
      a.href = url;
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
    } else {
      Linking.openURL(url);
    }
  };

  // Link pro grupo do baba: abre o app já filtrado nos lances da arena
  const compartilharArena = async () => {
    const arena = arenas.find(a => a.id === selectedArenaId);
    if (!arena) return;
    const url = `${APP_URL}/?arena=${arena.id}`;
    const message = `⚽ Lances do baba — ${arena.nome}! Assiste aqui:\n${url}`;
    // Navegador de computador geralmente não tem menu de compartilhar:
    // copia o link e avisa, pra colar no grupo do WhatsApp.
    if (Platform.OS === "web" && !(navigator as any).share) {
      try {
        await navigator.clipboard.writeText(message);
        window.alert("Link copiado! Cola no grupo do baba.");
      } catch {
        window.prompt("Copie o link do baba:", url);
      }
      return;
    }
    try {
      await Share.share({ message, url });
    } catch (error) {
      console.error("Erro ao compartilhar arena:", error);
    }
  };

  const addComment = async () => {
    if (!userId) {
      pedirLogin("comentar");
      return;
    }
    if (!selectedVideo || !commentText.trim()) return;
    const texto = commentText.trim();
    setCommentText("");

    const novo = await postComentario(selectedVideo.filename, texto);
    if (!novo) {
      const msg = "Não consegui enviar o comentário. Sua sessão pode estar desatualizada — saia e entre de novo.";
      if (Platform.OS === "web") window.alert(msg);
      else Alert.alert("Ops", msg);
      setCommentText(texto); // devolve o texto pro campo
      return;
    }

    setComentarios(prev => [...prev, novo]);
    setReplays(prev => prev.map(v =>
      v.filename === selectedVideo.filename
        ? { ...v, comment_count: (v.comment_count || 0) + 1 }
        : v
    ));
  };

  const openCommentsWithAnimation = async (video: ReplayVideo) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSelectedVideo(video);
    setComentarios([]);
    setLoadingComentarios(true);
    const lista = await getComentarios(video.filename);
    setComentarios(lista);
    setLoadingComentarios(false);
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

      <ConviteLogin
        acao={conviteLogin}
        onFechar={() => setConviteLogin(null)}
        onEntrar={() => {
          // Fecha primeiro e navega depois da animação de saída: fazendo os
          // dois juntos, a navegação se perdia na versão web.
          setConviteLogin(null);
          setTimeout(() => router.push('/login'), 250);
        }}
      />

      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <Text style={styles.headerTitle}>REPLAY<Text style={styles.highlight}>FLIX</Text></Text>
          <View style={styles.onlineStatus} />
        </View>
        {userId ? (
          <TouchableOpacity style={styles.profileBtn} onPress={() => router.push('/profile')}>
             <Image
               source={{ uri: userAvatar }}
               style={styles.avatar}
             />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.entrarBtn} onPress={() => router.push('/login')}>
            <Text style={styles.entrarBtnText}>Entrar</Text>
          </TouchableOpacity>
        )}
      </View>

      {selectedVideo ? (
        <View style={{ flex: 0.35, width: '100%', backgroundColor: '#000', overflow: 'hidden', justifyContent: 'center' }}>
          <InlineVideoPlayer
            videoUrl={selectedVideo.video_url || `https://yojoumansleqwjwdiyde.supabase.co/storage/v1/object/public/replays/${selectedVideo.filename}`}
            isActive={true}
            soundOn={soundOn}
            onToggleSound={toggleSound}
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
  <>
    {aoVivoAtivo && (!selectedArenaId || selectedArenaId === destaque.aovivo_arena_id) && (
      <AoVivoCard
        url={destaque.aovivo_url!}
        titulo={destaque.aovivo_titulo}
        arenaId={destaque.aovivo_arena_id}
        atrasoSeg={parseInt(destaque.aovivo_atraso || '15', 10) || 0}
      />
    )}
    {/* Com transmissão no ar, o destaque sai (dois vídeos tocando juntos não dá) */}
    {!aoVivoAtivo && destaque.destaque_ativo === '1' && !!destaque.destaque_video_url && !selectedArenaId && (
      <DestaqueCard
        videoUrl={destaque.destaque_video_url}
        titulo={destaque.destaque_titulo}
        soundOn={soundOn}
        onToggleSound={toggleSound}
      />
    )}
    <LiveStoriesBar
      arenas={arenas}
      selectedArenaId={selectedArenaId}
      onSelectArena={setSelectedArenaId}
    />
    {selectedArenaId && arenas.some(a => a.id === selectedArenaId) && (
      <TouchableOpacity style={styles.linkBabaBtn} onPress={compartilharArena} activeOpacity={0.8}>
        <Ionicons name="logo-whatsapp" size={18} color="#FFF" />
        <Text style={styles.linkBabaText}>Mandar link desses lances pro grupo</Text>
      </TouchableOpacity>
    )}
  </>
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
                isActive={item.id === activeVideoId}
                handleShare={handleShare}
                handleDownload={handleDownload}
                openComments={openCommentsWithAnimation}
                claimLance={reivindicarLance}
                unclaimLance={desmarcarLance}
                commentCount={item.comment_count || 0}
                currentUserId={userId}
                arenaFoto={arenas.find(a => a.id === item.arena_id)?.foto_url}
                soundOn={soundOn}
                onToggleSound={toggleSound}
              />
            )}
            contentContainerStyle={{ paddingBottom: 100 }}
            ListEmptyComponent={
              !loading ? (
                <View style={styles.feedEmpty}>
                  <Ionicons name="football-outline" size={54} color="#333" />
                  <Text style={styles.feedEmptyText}>Os lances vão aparecer aqui.</Text>
                  <Text style={styles.feedEmptySub}>Assim que a galera bater o botão na quadra, os replays surgem no topo.</Text>
                </View>
              ) : null
            }
            onEndReached={carregarMais}
            onEndReachedThreshold={0.5}
            ListFooterComponent={
              loadingMore ? (
                <ActivityIndicator size="small" color="#D30000" style={{ marginVertical: 20 }} />
              ) : null
            }
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
                Comentários ({comentarios.length})
              </Text>
              <TouchableOpacity onPress={closeCommentsWithAnimation}>
                <Ionicons name="close" size={24} color="#FFF" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.commentsScroll}>
              {comentarios.map((c) => (
                <View key={c.id} style={styles.commentContainer}>
                  <Image
                    source={{ uri: `https://ui-avatars.com/api/?name=${encodeURIComponent(c.autor)}&background=333&color=fff&bold=true` }}
                    style={styles.commentAvatar}
                  />
                  <View style={styles.commentContent}>
                    <Text style={styles.commentAuthor}>{c.autor}</Text>
                    <Text style={styles.commentText}>{c.texto}</Text>
                  </View>
                </View>
              ))}
              {loadingComentarios && (
                <ActivityIndicator size="small" color="#D30000" style={{ marginTop: 20 }} />
              )}
              {!loadingComentarios && comentarios.length === 0 && (
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
  conviteFundo: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  conviteCartao: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#1A1A1A',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#333',
    paddingTop: 30,
    paddingBottom: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  conviteFechar: {
    position: 'absolute',
    top: 12,
    right: 12,
  },
  conviteIcone: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#D30000',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#D30000',
    shadowOpacity: 0.6,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
  },
  conviteTitulo: {
    color: '#FFF',
    fontSize: 21,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 8,
  },
  conviteTexto: {
    color: '#AAA',
    fontSize: 15,
    lineHeight: 21,
    textAlign: 'center',
    marginBottom: 22,
  },
  conviteBotao: {
    backgroundColor: '#D30000',
    borderRadius: 12,
    paddingVertical: 14,
    width: '100%',
    alignItems: 'center',
  },
  conviteBotaoTexto: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  conviteGoogle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
  },
  conviteGoogleTexto: {
    color: '#888',
    fontSize: 13,
  },
  conviteAgoraNao: {
    marginTop: 10,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  conviteAgoraNaoTexto: {
    color: '#777',
    fontSize: 14,
    fontWeight: '600',
  },
  entrarBtn: {
    backgroundColor: '#D30000',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 18,
  },
  entrarBtnText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  linkBabaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#1F8F4E',
    marginHorizontal: 12,
    marginBottom: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  linkBabaText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 14,
    flexShrink: 1,
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
  claimButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#D30000',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  claimButtonText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '800',
  },
  myLanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,200,83,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },
  myLanceBadgeText: {
    color: '#00C853',
    fontSize: 12,
    fontWeight: '700',
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
  soundBtn: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  destaqueCard: {
    marginHorizontal: 10,
    marginTop: 10,
    marginBottom: 6,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,213,74,0.35)',
    backgroundColor: '#12100a',
  },
  destaqueLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  destaqueLabel: { color: '#FFD54A', fontSize: 13, fontWeight: '800', letterSpacing: 0.3 },
  feedEmpty: { alignItems: 'center', paddingHorizontal: 40, paddingTop: 40, gap: 8 },
  feedEmptyText: { color: '#888', fontSize: 16, fontWeight: '700', marginTop: 8 },
  feedEmptySub: { color: '#666', fontSize: 13, textAlign: 'center', lineHeight: 19 },
});
