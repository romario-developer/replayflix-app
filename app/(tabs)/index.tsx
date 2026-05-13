import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ScreenOrientation from "expo-screen-orientation";
import React, { useCallback, useEffect, useState, useRef } from "react";
import {
    Alert,
    FlatList,
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
};

// --- COMPONENTE ISOLADO DE VÍDEO NATIVO (EXPO-VIDEO) ---
const NativeVideoPlayer = ({ videoUrl, onFinish, onFullscreenChange }: { videoUrl: string, onFinish: () => void, onFullscreenChange: (isFullscreen: boolean) => void }) => {
  const player = useVideoPlayer(videoUrl, player => {
    player.loop = false;
    player.play(); // Inicia automaticamente
  });

  // Monitora o estado da reprodução
  useEffect(() => {
          const subscription = player.addListener('statusChange', (event) => {
            // Quando o status mudar para um estado de finalização (depende da API exata do expo-video, usamos timeUpdate ou fim do fluxo)
            if (event.status === 'readyToPlay' || event.status === 'playing' || event.status === 'paused' || event.status === 'idle' || event.status === 'error') {
               // o expo-video gerencia o 'fim' de forma mais interna, se precisar forçar o fim:
            }
          });
    
    // Fallback: usar onStatusChange ou algo similar
     const playEndSub = player.addListener('playToEnd', () => {
         onFinish();
     });

    return () => {
        playEndSub.remove();
        subscription.remove();
    };
  }, [player]);

  return (
    <VideoView
      style={styles.videoPlayer}
      player={player}
      fullscreenOptions={{ presentation: 'fullscreen' }}
      allowsPictureInPicture
      nativeControls
      // Expo-Video 50+ lida com tela cheia de forma integrada.
      // Se precisar forçar a rotação, pode ser feito monitorando as dimensões ou usando métodos nativos se expostos no futuro.
    />
  );
};


export default function HomeScreen() {
  const [replays, setReplays] = useState<ReplayVideo[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [videoSelecionado, setVideoSelecionado] = useState<ReplayVideo | null>(
    null,
  );
  const [isLiveSelecionada, setIsLiveSelecionada] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [arenaSelecionada, setArenaSelecionada] = useState("Todas");
  const arenas = [
    "Todas",
    "Campo Society",
    "Futsal",
    "Estádio Municipal",
    "Vôlei",
  ];
  const [refreshing, setRefreshing] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [videoStep, setVideoStep] = useState<
    "closed" | "intro" | "playing" | "outro"
  >("closed");
  const [liveId] = useState("cXr5JRHDRXk");

  useEffect(() => {
    carregarVideos();
  }, []);

  const carregarVideos = async () => {
    const data = await getReplays();
    const videosComLikes = data.map((v: any) => ({
      ...v,
      likes: v.likes || 0,
    }));
    setReplays(videosComLikes);
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await carregarVideos();
    setRefreshing(false);
  }, []);

  const formatarTitulo = (filename: string) => {
    if (filename.startsWith("replayflix_")) return "Lance Oficial";
    if (filename.startsWith("varplay_")) return "Lance Antigo";
    if (filename.startsWith("replay_")) return "Lance Oficial";
    return filename.replace(".mp4", "");
  };

  const abrirVideo = async (video: ReplayVideo) => {
    setIsLiveSelecionada(false);
    setVideoSelecionado(video);
    setModalVisible(true);
    setVideoStep("intro");
    setIsSearching(false);
    setSearchText("");

    const userId = (await AsyncStorage.getItem("userId")) || "guest";
    const liked = await AsyncStorage.getItem(
      `liked_${userId}_${video.filename}`,
    );
    const saved = await AsyncStorage.getItem(
      `saved_${userId}_${video.filename}`,
    );
    setIsLiked(liked === "true");
    setIsSaved(saved === "true");
    setTimeout(() => {
      setVideoStep((prev) => (prev === "intro" ? "playing" : prev));
    }, 1200);
  };

  const abrirLive = () => {
    setIsLiveSelecionada(true);
    setVideoSelecionado({
      id: "live",
      filename: "Transmissão ao Vivo",
      arena: "Arena Principal",
      likes: 0,
      size: "0MB",
      created_at: new Date().toISOString(),
    });
    setModalVisible(true);
    setVideoStep("intro");
    setIsSearching(false);
    setSearchText("");
    setTimeout(() => {
      setVideoStep("playing");
    }, 1200);
  };

  const fecharVideo = async () => {
    setVideoStep("closed");
    setModalVisible(false);
    setVideoSelecionado(null);
    setIsLiveSelecionada(false);
    if (Platform.OS !== "web") {
      await ScreenOrientation.lockAsync(
        ScreenOrientation.OrientationLock.PORTRAIT_UP,
      );
    }
    carregarVideos();
  };

  const getVideoUrl = (filename: string) =>
    `https://replayflix-backend.onrender.com/api/replays/${encodeURIComponent(
      filename.replace(".mp4", ""),
    )}/stream`;

  const getThumbnailUrl = (filename: string) =>
    `https://replayflix-backend.onrender.com/api/replays/${encodeURIComponent(filename)}/thumbnail`;

  const handleLike = async () => {
    if (!videoSelecionado) return;
    const userId = (await AsyncStorage.getItem("userId")) || "guest";
    if (isLiked) {
      setIsLiked(false);
      setVideoSelecionado({
        ...videoSelecionado,
        likes: Math.max(0, videoSelecionado.likes - 1),
      });
      await AsyncStorage.removeItem(
        `liked_${userId}_${videoSelecionado.filename}`,
      );
      try {
        await fetch(
          `https://replayflix-backend.onrender.com/api/replays/${videoSelecionado.filename}/unlike`,
          { method: "POST" },
        );
      } catch {}
    } else {
      setIsLiked(true);
      setVideoSelecionado({
        ...videoSelecionado,
        likes: videoSelecionado.likes + 1,
      });
      await AsyncStorage.setItem(
        `liked_${userId}_${videoSelecionado.filename}`,
        "true",
      );
      try {
        await fetch(
          `https://replayflix-backend.onrender.com/api/replays/${videoSelecionado.filename}/like`,
          {
            method: "POST",
          },
        );
      } catch {}
    }
  };

  const reivindicarLance = async () => {
    if (!videoSelecionado) return;
    const userId = await AsyncStorage.getItem("userId");
    if (!userId) {
      Alert.alert("Atenção", "Você precisa estar logado para salvar lances.");
      return;
    }
    if (isSaved) {
      setIsSaved(false);
      await AsyncStorage.removeItem(
        `saved_${userId}_${videoSelecionado.filename}`,
      );
      try {
        await fetch(
          `https://replayflix-backend.onrender.com/api/replays/${videoSelecionado.filename}/vincular`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ user_id: null }),
          },
        );
      } catch {}
    } else {
      setIsSaved(true);
      await AsyncStorage.setItem(
        `saved_${userId}_${videoSelecionado.filename}`,
        "true",
      );
      try {
        await fetch(
          `https://replayflix-backend.onrender.com/api/replays/${videoSelecionado.filename}/vincular`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ user_id: userId }),
          },
        );
      } catch {}
    }
  };

  const videosFiltrados = replays.filter((video) => {
    const matchBusca = formatarTitulo(video.filename)
      .toLowerCase()
      .includes(searchText.toLowerCase());
    const matchArena =
      arenaSelecionada === "Todas" || video.arena === arenaSelecionada;
    return matchBusca && matchArena;
  });

  const renderLiveCard = () => (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.8}
      onPress={abrirLive}
    >
      <ImageBackground
        source={{
          uri: "https://images.unsplash.com/photo-1526676037777-05a232554f77?q=80&w=300",
        }}
        style={styles.thumbnail}
        imageStyle={{ borderRadius: 12 }}
      >
        <View
          style={[styles.overlay, { backgroundColor: "rgba(211, 0, 0, 0.2)" }]}
        >
          <View style={styles.liveBadgeMini}>
            <View style={styles.liveDot} />
            <Text style={styles.liveTextMini}>AO VIVO</Text>
          </View>
          <View style={styles.playButton}>
            <Ionicons name="radio" size={24} color="#FFF" />
          </View>
        </View>
        <View style={styles.cardTitleContainer}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            Arena Principal
          </Text>
        </View>
      </ImageBackground>
    </TouchableOpacity>
  );

  const renderCard = ({ item }: { item: ReplayVideo }) => (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.8}
      onPress={() => abrirVideo(item)}
    >
      <ImageBackground
        source={{ uri: getThumbnailUrl(item.filename) }}
        style={styles.thumbnail}
        imageStyle={{ borderRadius: 12 }}
      >
        <View style={styles.overlay}>
          <View style={styles.playButton}>
            <Ionicons
              name="play"
              size={24}
              color="#FFF"
              style={{ marginLeft: 3 }}
            />
          </View>
        </View>
        <View style={styles.cardTitleContainer}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {formatarTitulo(item.filename)}
          </Text>
        </View>
      </ImageBackground>
    </TouchableOpacity>
  );

  const renderCarousel = (title: string, data: ReplayVideo[]) => {
    if (data.length === 0) return null;
    return (
      <View style={styles.carouselSection}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <FlatList
          horizontal
          data={data}
          keyExtractor={(item, index) => item.filename + index}
          showsHorizontalScrollIndicator={false}
          renderItem={renderCard}
          contentContainerStyle={{ paddingHorizontal: 20 }}
          snapToInterval={175}
          snapToAlignment="start"
          decelerationRate="fast"
        />
      </View>
    );
  };

  return (
    <View style={styles.pageBackground}>
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#0A0A0A" />
        <View style={styles.header}>
          {!isSearching ? (
            <Text style={styles.headerTitle}>
              Replay<Text style={styles.headerHighlight}>Flix</Text>
            </Text>
          ) : (
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar lance..."
              placeholderTextColor="#888"
              value={searchText}
              onChangeText={setSearchText}
              autoFocus
            />
          )}
          <TouchableOpacity
            onPress={() => {
              setIsSearching(!isSearching);
              setSearchText("");
            }}
          >
            <Ionicons
              name={isSearching ? "close" : "search"}
              size={26}
              color="#FFF"
            />
          </TouchableOpacity>
        </View>

        {!isSearching && (
          <View style={styles.chipsContainer}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 20 }}
            >
              {arenas.map((arena) => (
                <TouchableOpacity
                  key={arena}
                  style={[
                    styles.chip,
                    arenaSelecionada === arena && styles.chipActive,
                  ]}
                  onPress={() => setArenaSelecionada(arena)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.chipText,
                      arenaSelecionada === arena && styles.chipTextActive,
                    ]}
                  >
                    {arena}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#D30000"
              colors={["#D30000"]}
              progressBackgroundColor="#1A1A1A"
            />
          }
        >
          {!isSearching && (
            <View style={styles.heroSection}>
              <Text style={styles.heroText}>BEM-VINDO À ARENA</Text>
            </View>
          )}

          <View style={styles.carouselSection}>
            <Text style={styles.sectionTitle}>AO VIVO AGORA</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 20 }}
              snapToInterval={175}
              snapToAlignment="start"
              decelerationRate="fast"
            >
              {renderLiveCard()}
            </ScrollView>
          </View>

          {renderCarousel("MAIS RECENTES", videosFiltrados)}
          {renderCarousel(
            "GOLAÇOS DA SEMANA",
            videosFiltrados.slice().reverse(),
          )}

          {videosFiltrados.length === 0 && (
            <Text
              style={{ color: "#666", textAlign: "center", marginTop: 50 }}
            >{`Nenhum lance encontrado.`}</Text>
          )}
        </ScrollView>
      </View>

      <Modal
        animationType="fade"
        transparent
        visible={modalVisible}
        onRequestClose={fecharVideo}
      >
        <TouchableOpacity
          style={styles.modalVideoOverlay}
          activeOpacity={1}
          onPress={fecharVideo}
        >
          <View style={styles.modalVideoHeader}>
            <TouchableOpacity style={styles.closeButton} onPress={fecharVideo}>
              <Ionicons name="close-circle" size={36} color="#FFF" />
            </TouchableOpacity>
          </View>

          {videoSelecionado && (
            <TouchableOpacity
              activeOpacity={1}
              style={styles.modalVideoWrapper}
            >
              {videoStep === "intro" || videoStep === "outro" ? (
                <View style={styles.bumperContainer}>
                  <Text style={styles.bumperLogo}>
                    Replay<Text style={styles.bumperHighlight}>Flix</Text>
                  </Text>
                </View>
              ) : (
                <View style={styles.videoBox}>
                  {isLiveSelecionada ? (
                    <YoutubePlayer height={250} play videoId={liveId} />
                  ) : Platform.OS === "web" ? (
                    // @ts-ignore
                    React.createElement("video", {
                      src: getVideoUrl(videoSelecionado.filename),
                      style: {
                        width: "100%",
                        height: "100%",
                        backgroundColor: "#000",
                        objectFit: "contain",
                      },
                      controls: true,
                      autoPlay: true,
                      onEnded: () => {
                        setVideoStep("outro");
                        setTimeout(() => fecharVideo(), 1200);
                      },
                    })
                  ) : (
                    // Injeção do Novo Componente de Vídeo
                    <NativeVideoPlayer 
                        videoUrl={getVideoUrl(videoSelecionado.filename)}
                        onFinish={() => {
                            setVideoStep("outro");
                            setTimeout(() => fecharVideo(), 1200);
                        }}
                        onFullscreenChange={async (isFullscreen) => {
                             if (isFullscreen) {
                                await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
                             } else {
                                await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
                             }
                        }}
                    />
                  )}
                </View>
              )}

              {videoStep === "playing" && !isLiveSelecionada && (
                <View style={styles.videoFooterBar}>
                  <Text style={styles.likesCounterText}>
                    {videoSelecionado.likes === 0
                      ? "0 Likes"
                      : videoSelecionado.likes === 1
                        ? "1 Like"
                        : `${videoSelecionado.likes} Likes`}
                  </Text>

                  <View style={styles.actionsContainer}>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={handleLike}
                      activeOpacity={0.6}
                    >
                      <Ionicons
                        name={isLiked ? "thumbs-up" : "thumbs-up-outline"}
                        size={26}
                        color="#FFF"
                      />
                    </TouchableOpacity>

                    <View style={styles.actionDivider} />

                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={reivindicarLance}
                      activeOpacity={0.6}
                    >
                      <Ionicons
                        name={isSaved ? "star" : "star-outline"}
                        size={28}
                        color="#FFF"
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </TouchableOpacity>
          )}
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  pageBackground: { flex: 1, backgroundColor: "#000" },
  container: {
    flex: 1,
    backgroundColor: "#111",
    width: "100%",
    maxWidth: 1000,
    alignSelf: "center",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
    backgroundColor: "#0A0A0A",
  },
  logoText: {
    fontSize: 42,
    fontWeight: "900",
    color: "#FFF",
    fontStyle: "italic",
    letterSpacing: -1,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "900",
    color: "#FFF",
    fontStyle: "italic",
    letterSpacing: -1,
  },
  headerHighlight: { color: "#D30000" },
  searchInput: {
    flex: 1,
    backgroundColor: "#1A1A1A",
    color: "#FFF",
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
    marginLeft: 0,
    marginRight: 15,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#333",
  },
  chipsContainer: {
    backgroundColor: "#0A0A0A",
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#222",
  },
  chip: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 25,
    backgroundColor: "#1A1A1A",
    marginRight: 12,
    borderWidth: 1,
    borderColor: "#333",
    justifyContent: "center",
    alignItems: "center",
  },
  chipActive: { backgroundColor: "#D30000", borderColor: "#D30000" },
  chipText: { color: "#888", fontSize: 14, fontWeight: "bold" },
  chipTextActive: { color: "#FFF" },
  heroSection: { padding: 25, alignItems: "center", marginTop: 10 },
  heroText: {
    color: "#444",
    fontSize: 12,
    fontWeight: "bold",
    letterSpacing: 2,
  },
  carouselSection: { marginTop: 15 },
  sectionTitle: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 15,
    textTransform: "uppercase",
    letterSpacing: 1,
    textAlign: "left", 
    paddingHorizontal: 20,
  },
  card: {
    width: 160,
    height: 190,
    marginRight: 15,
    borderRadius: 12,
    backgroundColor: "#222",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#333",
  },
  thumbnail: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  playButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "rgba(211,0,0,0.85)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#FFF",
  },
  cardTitleContainer: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    backgroundColor: "rgba(0,0,0,0.75)",
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  cardTitle: {
    color: "#FFF",
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
  },

  liveBadgeMini: {
    position: "absolute",
    top: 10,
    left: 10,
    backgroundColor: "#D30000",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    gap: 5,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#FFF" },
  liveTextMini: { color: "#FFF", fontSize: 9, fontWeight: "900" },

  modalVideoOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.95)",
    justifyContent: "center",
    padding: 20,
  },
  modalVideoHeader: {
    position: "absolute",
    top: 40,
    right: 20,
    zIndex: 10,
    alignItems: "flex-end",
  },
  closeButton: { padding: 10 },
  modalVideoWrapper: {
    width: "100%",
    maxWidth: 800,
    alignSelf: "center",
    backgroundColor: "#CC0000",
    borderRadius: 16,
    overflow: "hidden",
  },
  videoBox: {
    width: "100%",
    aspectRatio: 16 / 9,
    backgroundColor: "#000",
    justifyContent: "center",
  },
  videoPlayer: { flex: 1, width: "100%", height: "100%" },
  bumperContainer: {
    width: "100%",
    aspectRatio: 16 / 9,
    backgroundColor: "#111",
    justifyContent: "center",
    alignItems: "center",
  },
  bumperLogo: { color: "#FFF", fontSize: 42, fontWeight: "900" },
  bumperHighlight: { color: "#D30000" },
  videoFooterBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: "#CC0000",
  },
  likesCounterText: { color: "#FFF", fontSize: 16, fontWeight: "bold" },
  actionsContainer: { flexDirection: "row", alignItems: "center" },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    justifyContent: "center",
    alignItems: "center",
  },
  actionDivider: {
    width: 1.5,
    backgroundColor: "#800000",
    marginHorizontal: 8,
    height: 28,
  },
});