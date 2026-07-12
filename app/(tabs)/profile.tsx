import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import { useRouter, useFocusEffect } from "expo-router";
import { useVideoPlayer, VideoView } from "expo-video";
import React, { useEffect, useState, useCallback } from "react";
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    FlatList,
    Image,
    Modal,
    Platform,
    ScrollView,
    Share,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { getReplays, deleteReplay, updateUsuario, deleteUsuario, getUsuario, uploadAvatar, updatePosicao } from "../../services/api";

// Player simples pra assistir um lance dentro do gerenciador (web e nativo)
// Vídeo e música repetem em loop até a pessoa fechar.
const PlayerLance = ({ url }: { url: string }) => {
  if (Platform.OS === "web") {
    return (
      <video
        src={url}
        controls
        autoPlay
        loop
        playsInline
        style={{ width: "100%", height: "100%", objectFit: "contain", background: "#000" }}
      />
    );
  }
  return <PlayerLanceNative url={url} />;
};

const PlayerLanceNative = ({ url }: { url: string }) => {
  const player = useVideoPlayer(url, (p) => {
    p.loop = true;
    p.play();
  });
  return <VideoView player={player} style={{ width: "100%", height: "100%" }} contentFit="contain" allowsFullscreen nativeControls />;
};

export default function ProfileScreen() {
  const router = useRouter();

  const imagemPadrao =
    "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?q=80&w=200&auto=format&fit=crop";
  const [imagemPerfil, setImagemPerfil] = useState(imagemPadrao);

  const [nomeUsuario, setNomeUsuario] = useState("Carregando...");
  const [arrobaUsuario, setArrobaUsuario] = useState("...");
  const [emailUsuario, setEmailUsuario] = useState("...");

  const [totalVideos, setTotalVideos] = useState(0);
  const [totalArenas, setTotalArenas] = useState(0);

  const [posicao, setPosicao] = useState("Definir Posição");
  const [modalPosicaoVisible, setModalPosicaoVisible] = useState(false);
  const [novaPosicaoDigitada, setNovaPosicaoDigitada] = useState("");

  const [modalEditPerfilVisible, setModalEditPerfilVisible] = useState(false);
  const [editNome, setEditNome] = useState("");
  const [editUsername, setEditUsername] = useState("");
  const [editEmail, setEditEmail] = useState("");

  const [modalGerenciarVisible, setModalGerenciarVisible] = useState(false);
  const [meusVideos, setMeusVideos] = useState<any[]>([]);
  const [loadingVideos, setLoadingVideos] = useState(false);
  const [videoAssistindo, setVideoAssistindo] = useState<any | null>(null);

  useFocusEffect(
    useCallback(() => {
      carregarPerfil();
      carregarEstatisticas();
    }, [])
  );

  const carregarPerfil = async () => {
    try {
      const userId = await AsyncStorage.getItem("userId");
      if (!userId) return;

      // Mostra o cache local primeiro pra não piscar "Carregando..."
      const fotoSalva = await AsyncStorage.getItem(`avatar_${userId}`);
      if (fotoSalva) setImagemPerfil(fotoSalva);
      const posicaoSalva = await AsyncStorage.getItem(`posicao_${userId}`);
      if (posicaoSalva) setPosicao(posicaoSalva);
      const nomeCache = await AsyncStorage.getItem("userName");
      if (nomeCache) setNomeUsuario(nomeCache);

      // Fonte da verdade é o servidor: nome, email, foto e posição
      try {
        const u = await getUsuario(userId);
        if (u) {
          setNomeUsuario(u.nome || "Jogador");
          setArrobaUsuario((u.username || "").toLowerCase().replace("@", ""));
          setEmailUsuario(u.email || "");
          await AsyncStorage.setItem("userName", u.nome || "");
          await AsyncStorage.setItem("isAdmin", u.is_admin ? "1" : "0");
          if (u.avatar_url) {
            setImagemPerfil(u.avatar_url);
            await AsyncStorage.setItem(`avatar_${userId}`, u.avatar_url);
          }
          if (u.posicao) {
            setPosicao(u.posicao);
            await AsyncStorage.setItem(`posicao_${userId}`, u.posicao);
          }
        }
      } catch {
        // Sem rede: fica com o cache local
        if (nomeCache) setArrobaUsuario(nomeCache.toLowerCase().replace(/\s/g, ""));
      }
    } catch (error) {
      console.error("Erro ao carregar perfil:", error);
    }
  };

  const carregarEstatisticas = async () => {
    try {
      const favStr = await AsyncStorage.getItem("@favorite_replays");
      let favoritos: string[] = [];
      if (favStr) favoritos = JSON.parse(favStr);

      setTotalVideos(favoritos.length);

      const data = await getReplays();
      const filtrados = data.filter((video: any) => favoritos.includes(video.filename));
      const arenasUnicas = new Set(filtrados.map((v: any) => v.arena));
      setTotalArenas(arenasUnicas.size);
    } catch (error) {
      console.log("Erro ao carregar estatisticas:", error);
    }
  };

  const handleTrocarFoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== "granted") {
      Alert.alert(
        "Permissão Negada",
        "Precisamos de acesso à sua galeria para mudar a foto.",
      );
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      base64: true, // precisamos do conteúdo pra subir pro servidor
    });

    if (!result.canceled) {
      const asset = result.assets[0];
      setImagemPerfil(asset.uri); // mostra na hora (otimista)

      const userId = await AsyncStorage.getItem("userId");
      if (!userId || !asset.base64) return;

      // Sobe pro servidor — é o que faz a foto sobreviver a fechar o app,
      // logout e troca de aparelho.
      const mime = asset.mimeType || "image/jpeg";
      const urlSalva = await uploadAvatar(userId, asset.base64, mime);
      if (urlSalva) {
        setImagemPerfil(urlSalva);
        await AsyncStorage.setItem(`avatar_${userId}`, urlSalva);
      } else {
        const msg = "Não consegui salvar a foto no servidor. Ela pode sumir ao fechar o app — tente de novo.";
        if (Platform.OS === "web") window.alert(msg);
        else Alert.alert("Atenção", msg);
      }
    }
  };

  const salvarNovaPosicao = async () => {
    if (!novaPosicaoDigitada.trim()) {
      Alert.alert("Erro", "A posição não pode ficar vazia.");
      return;
    }
    const nova = novaPosicaoDigitada.trim();
    setPosicao(nova);
    setModalPosicaoVisible(false);

    const userId = await AsyncStorage.getItem("userId");
    if (userId) {
      await AsyncStorage.setItem(`posicao_${userId}`, nova);
      // Servidor é a fonte da verdade (sobrevive a logout/troca de aparelho)
      await updatePosicao(userId, nova);
    }
  };

  const salvarEdicaoPerfil = async () => {
    if (!editNome.trim() || !editUsername.trim() || !editEmail.trim()) {
      Alert.alert("Erro", "Preencha todos os campos.");
      return;
    }

    try {
      const userId = await AsyncStorage.getItem("userId");
      if (!userId) return;

      const data = await updateUsuario(userId, {
        nome: editNome,
        username: editUsername,
        email: editEmail,
      });

      setNomeUsuario(editNome);
      setArrobaUsuario(editUsername.trim().toLowerCase().replace("@", ""));
      setEmailUsuario(editEmail.trim().toLowerCase());
      await AsyncStorage.setItem("userName", editNome);
      setModalEditPerfilVisible(false);
    } catch (error: any) {
      const errorMsg = error.response?.data?.erro || "Não foi possível atualizar.";
      Alert.alert("Erro", errorMsg);
    }
  };

  const abrirModalDeEdicao = () => {
    setEditNome(nomeUsuario);
    setEditUsername(arrobaUsuario);
    setEditEmail(emailUsuario);
    setModalEditPerfilVisible(true);
  };

  const abrirGerenciador = async () => {
    setModalGerenciarVisible(true);
    setLoadingVideos(true);
    try {
      const userId = await AsyncStorage.getItem("userId");
      const data = await getReplays();
      const filtrados = data.filter(
        (video: any) => video.user_id && video.user_id.toString() === userId,
      );
      setMeusVideos(filtrados);
    } catch {
      Alert.alert("Erro", "Não foi possível carregar seus vídeos.");
    } finally {
      setLoadingVideos(false);
    }
  };

  const confirmarExclusao = (filename: string) => {
    if (Platform.OS === "web") {
      const confirmou = window.confirm(
        "Tem certeza que deseja apagar este vídeo?",
      );
      if (confirmou) deletarVideo(filename);
    } else {
      Alert.alert("Apagar Lance", "Tem certeza que deseja apagar este vídeo?", [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Apagar",
          style: "destructive",
          onPress: () => deletarVideo(filename),
        },
      ]);
    }
  };



  const deletarVideo = async (filename: string) => {
    try {
      const data = await deleteReplay(filename);
      if (data.success) {
        setMeusVideos((videosAtuais) =>
          videosAtuais.filter((v) => v.filename !== filename),
        );
        setTotalVideos((total) => Math.max(0, total - 1));
      } else {
        Alert.alert("Erro", "Não foi possível excluir o vídeo.");
      }
    } catch {
      Alert.alert("Erro", "Falha de conexão com o servidor.");
    }
  };

  const formatarTitulo = (filename: string) => {
    if (filename.startsWith("replayflix_")) return "Lance Oficial";
    if (filename.startsWith("varplay_")) return "Lance Oficial";
    if (filename.startsWith("replay_")) return "Lance Oficial";
    return filename.replace(".mp4", "");
  };

  const handleSair = async () => {
    await AsyncStorage.clear();
    router.replace("/login");
  };

  // --- FUNÇÃO PARA APAGAR A CONTA ---
  const handleApagarConta = async () => {
    Alert.alert(
      "Excluir Conta Permanentemente",
      "Tem certeza absoluta? Todos os seus lances salvos serão desvinculados e sua conta será apagada. Essa ação NÃO PODE ser desfeita.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Sim, Excluir",
          style: "destructive",
          onPress: async () => {
            try {
              const userId = await AsyncStorage.getItem("userId");
              if (!userId) return;
              await deleteUsuario(userId);
              await AsyncStorage.clear();
              router.replace("/login");
            } catch {
              Alert.alert("Erro", "Falha de conexão.");
            }
          },
        },
      ],
    );
  };

  const handleCompartilharApp = async () => {
    try {
      await Share.share({
        message: `Fala, craque! Me acompanhe no ReplayFlix! Procure pelo meu usuário @${arrobaUsuario} e veja os golaços da arena: https://replayflix.com.br`,
      });
    } catch {
      Alert.alert("Erro", "Não foi possível abrir o compartilhamento.");
    }
  };

  const renderMenuItem = (
    icon: any,
    title: string,
    corIcone: string = "#FFF",
    action: () => void,
  ) => (
    <TouchableOpacity
      style={styles.menuItem}
      onPress={action}
      activeOpacity={0.7}
    >
      <View style={styles.menuItemLeft}>
        <View style={styles.iconBox}>
          <Ionicons name={icon} size={20} color={corIcone} />
        </View>
        <Text style={styles.menuItemText}>{title}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#444" />
    </TouchableOpacity>
  );

  return (
    <View style={styles.pageBackground}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0A0A" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.container}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Meu Perfil</Text>
        </View>

        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <Image 
              source={{ uri: imagemPerfil }} 
              style={styles.avatar} 
              onError={() => setImagemPerfil(imagemPadrao)}
            />
            <TouchableOpacity
              style={styles.editAvatarBtn}
              onPress={handleTrocarFoto}
            >
              <Ionicons name="camera" size={18} color="#FFF" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.nameRow}
            activeOpacity={0.7}
            onPress={abrirModalDeEdicao}
          >
            <Text style={styles.userName}>{nomeUsuario}</Text>
            <Ionicons
              name="pencil"
              size={16}
              color="#888"
              style={{ marginLeft: 8 }}
            />
          </TouchableOpacity>

          <Text style={styles.userArroba}>@{arrobaUsuario}</Text>
          <Text style={styles.userEmail}>{emailUsuario}</Text>

          <TouchableOpacity
            style={styles.positionContainer}
            activeOpacity={0.7}
            onPress={() => {
              setNovaPosicaoDigitada(
                posicao === "Definir Posição" ? "" : posicao,
              );
              setModalPosicaoVisible(true);
            }}
          >
            <Text style={styles.userTeam}>{posicao}</Text>
            <Ionicons
              name="pencil"
              size={14}
              color="#888"
              style={{ marginLeft: 6, marginTop: 3 }}
            />
          </TouchableOpacity>

          <View style={styles.statsContainer}>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{totalVideos}</Text>
              <Text style={styles.statLabel}>Lances Salvos</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{totalArenas}</Text>
              <Text style={styles.statLabel}>Arenas Visitadas</Text>
            </View>
          </View>
        </View>

        <View style={styles.menuContainer}>
          <Text style={styles.sectionTitle}>MINHA CONTA</Text>
          <View style={styles.menuCard}>
            {renderMenuItem(
              "shield-checkmark",
              "Privacidade e Segurança",
              "#00FF66",
              () => router.push("/security"),
            )}
            {renderMenuItem(
              "share-social",
              "Compartilhar meu Perfil",
              "#3399FF",
              handleCompartilharApp,
            )}
            {renderMenuItem(
              "videocam",
              "Gerenciar Meus Vídeos",
              "#D30000",
              abrirGerenciador,
            )}
            {renderMenuItem(
              "football",
              "Minhas Arenas e Babas",
              "#FF8C00",
              () => router.push("/arenas"),
            )}
          </View>

          <Text style={styles.sectionTitle}>SISTEMA</Text>
          <View style={styles.menuCard}>
            {renderMenuItem("notifications", "Notificações", "#FFD700", () =>
              router.push("/notifications"),
            )}
            {renderMenuItem("help-buoy", "Central de Ajuda", "#FFF", () =>
              router.push("/support"),
            )}

            <TouchableOpacity
              style={styles.logoutButton}
              onPress={handleSair}
              activeOpacity={0.7}
            >
              <Ionicons
                name="log-out-outline"
                size={22}
                color="#FFF"
                style={{ opacity: 0.8 }}
              />
              <Text style={styles.logoutText}>Sair da Conta</Text>
            </TouchableOpacity>

            {/* BOTÃO DE APAGAR CONTA (Destacado em vermelho no final) */}
            <TouchableOpacity
              style={styles.deleteAccountButton}
              onPress={handleApagarConta}
              activeOpacity={0.7}
            >
              <Ionicons name="warning-outline" size={22} color="#D30000" />
              <Text style={styles.deleteAccountText}>Excluir Minha Conta</Text>
            </TouchableOpacity>
          </View>
        </View>
        <Text style={styles.versionText}>ReplayFlix v1.0.0</Text>
      </ScrollView>

      {/* MODAL PARA EDITAR NOME, USUÁRIO E EMAIL */}
      <Modal
        visible={modalEditPerfilVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setModalEditPerfilVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Editar Perfil</Text>
              <TouchableOpacity
                onPress={() => setModalEditPerfilVisible(false)}
              >
                <Ionicons name="close" size={28} color="#666" />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Nome Completo</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: Romário Alves"
              placeholderTextColor="#666"
              value={editNome}
              onChangeText={setEditNome}
            />

            <Text style={styles.inputLabel}>Nome de Usuário (@)</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: romario11"
              placeholderTextColor="#666"
              value={editUsername}
              onChangeText={setEditUsername}
              autoCapitalize="none"
            />

            <Text style={styles.inputLabel}>E-mail de Cadastro</Text>
            <TextInput
              style={styles.input}
              placeholder="seu@email.com"
              placeholderTextColor="#666"
              value={editEmail}
              onChangeText={setEditEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <TouchableOpacity
              style={styles.saveButton}
              activeOpacity={0.8}
              onPress={salvarEdicaoPerfil}
            >
              <Text style={styles.saveButtonText}>Salvar Alterações</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL PARA EDITAR A POSIÇÃO */}
      <Modal
        visible={modalPosicaoVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setModalPosicaoVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Sua Posição</Text>
              <TouchableOpacity onPress={() => setModalPosicaoVisible(false)}>
                <Ionicons name="close" size={28} color="#666" />
              </TouchableOpacity>
            </View>
            <Text style={styles.inputLabel}>Qual a sua posição na quadra?</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: Fixo, Ala, Pivô, Goleiro..."
              placeholderTextColor="#666"
              value={novaPosicaoDigitada}
              onChangeText={setNovaPosicaoDigitada}
              autoFocus
              maxLength={20}
            />
            <TouchableOpacity
              style={styles.saveButton}
              activeOpacity={0.8}
              onPress={salvarNovaPosicao}
            >
              <Text style={styles.saveButtonText}>Salvar Posição</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL GERENCIADOR DE VÍDEOS */}
      <Modal
        visible={modalGerenciarVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalGerenciarVisible(false)}
      >
        <View style={styles.modalVideoOverlay}>
          <View style={styles.modalVideoWrapper}>
            <View style={styles.modalVideoHeader}>
              <Text style={styles.modalTitle}>Meus Vídeos</Text>
              <TouchableOpacity onPress={() => setModalGerenciarVisible(false)}>
                <Ionicons name="close-circle" size={30} color="#FF6B00" />
              </TouchableOpacity>
            </View>
            {loadingVideos ? (
              <ActivityIndicator size="large" color="#FF6B00" style={{ marginTop: 40 }} />
            ) : meusVideos.length === 0 ? (
              <Text style={styles.emptyText}>
                Você ainda não possui vídeos salvos.{"\n"}
                Marque um lance como seu no feed com o botão “É meu!”.
              </Text>
            ) : (
              <FlatList
                data={meusVideos}
                keyExtractor={(item) => item.id.toString()}
                numColumns={2}
                showsVerticalScrollIndicator={false}
                columnWrapperStyle={{ gap: 12 }}
                contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 12 }}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.videoThumbCard}
                    activeOpacity={0.85}
                    onPress={() => setVideoAssistindo(item)}
                  >
                    <View style={styles.videoThumbWrapper}>
                      {item.thumbnail_url ? (
                        <Image source={{ uri: item.thumbnail_url }} style={styles.videoThumb} />
                      ) : (
                        <View style={[styles.videoThumb, styles.videoThumbEmpty]}>
                          <Ionicons name="videocam" size={28} color="#555" />
                        </View>
                      )}
                      <View style={styles.videoThumbPlay}>
                        <Ionicons name="play" size={22} color="#FFF" />
                      </View>
                      <TouchableOpacity
                        onPress={() => confirmarExclusao(item.filename)}
                        style={styles.videoThumbDelete}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons name="trash" size={16} color="#FFF" />
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.videoThumbTitle} numberOfLines={1}>
                      {formatarTitulo(item.filename)}
                    </Text>
                    <Text style={styles.videoThumbSub} numberOfLines={1}>
                      {item.arena}
                    </Text>
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        </View>
      </Modal>

      {/* MODAL PLAYER — assistir um lance */}
      <Modal
        visible={!!videoAssistindo}
        animationType="fade"
        transparent={false}
        onRequestClose={() => setVideoAssistindo(null)}
      >
        <View style={styles.playerOverlay}>
          <View style={styles.playerHeader}>
            <Text style={styles.playerTitle} numberOfLines={1}>
              {videoAssistindo ? formatarTitulo(videoAssistindo.filename) : ""}
            </Text>
            <TouchableOpacity onPress={() => setVideoAssistindo(null)}>
              <Ionicons name="close-circle" size={34} color="#FFF" />
            </TouchableOpacity>
          </View>
          <View style={styles.playerBox}>
            {videoAssistindo && (
              <PlayerLance
                url={
                  videoAssistindo.video_url ||
                  `https://yojoumansleqwjwdiyde.supabase.co/storage/v1/object/public/replays/${videoAssistindo.filename}`
                }
              />
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  pageBackground: { flex: 1, backgroundColor: "#F4F4F6" },
  container: {
    flexGrow: 1,
    backgroundColor: "#F4F4F6",
    width: "100%",
    maxWidth: 800,
    alignSelf: "center",
    paddingBottom: 40,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 45 : 55,
    paddingBottom: 20,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#EBEBEB",
  },
  headerTitle: { fontSize: 24, fontWeight: "bold", color: "#1C1C1E" },
  profileCard: {
    alignItems: "center",
    paddingVertical: 30,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#EBEBEB",
  },
  avatarContainer: { position: "relative", marginBottom: 15 },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: "#FF6B00",
  },
  editAvatarBtn: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "#FF6B00",
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#FFFFFF",
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  userName: { fontSize: 22, fontWeight: "bold", color: "#1C1C1E" },
  userArroba: {
    fontSize: 15,
    color: "#FF6B00",
    fontWeight: "600",
    marginTop: 2,
  },
  userEmail: { fontSize: 13, color: "#8E8E93", marginTop: 2 },

  positionContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  userTeam: {
    fontSize: 13,
    color: "#8E8E93",
    textTransform: "uppercase",
    letterSpacing: 1,
  },

  statsContainer: {
    flexDirection: "row",
    marginTop: 25,
    backgroundColor: "#FFFFFF",
    borderRadius: 15,
    paddingVertical: 15,
    paddingHorizontal: 20,
    width: "85%",
    maxWidth: 400,
    justifyContent: "space-around",
    borderWidth: 1,
    borderColor: "#EBEBEB",
  },
  statBox: { alignItems: "center" },
  statNumber: { fontSize: 20, fontWeight: "900", color: "#1C1C1E" },
  statLabel: { fontSize: 12, color: "#8E8E93", marginTop: 4 },
  statDivider: { width: 1, backgroundColor: "#EBEBEB" },
  menuContainer: { paddingHorizontal: 20, paddingTop: 30 },
  sectionTitle: {
    color: "#8E8E93",
    fontSize: 13,
    fontWeight: "bold",
    marginBottom: 10,
    marginLeft: 10,
    letterSpacing: 1,
  },
  menuCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 25,
    borderWidth: 1,
    borderColor: "#EBEBEB",
  },
  menuItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#EBEBEB",
  },
  menuItemLeft: { flexDirection: "row", alignItems: "center" },
  iconBox: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: "#FFEAD6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  menuItemText: { color: "#1C1C1E", fontSize: 16, fontWeight: "500" },

  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#EBEBEB",
  },
  logoutText: {
    color: "#1C1C1E",
    opacity: 0.8,
    fontSize: 16,
    fontWeight: "500",
    marginLeft: 15,
  },

  deleteAccountButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "rgba(211, 0, 0, 0.05)",
  },
  deleteAccountText: {
    color: "#D30000",
    fontSize: 16,
    fontWeight: "bold",
    marginLeft: 15,
  },

  versionText: {
    textAlign: "center",
    color: "#8E8E93",
    fontSize: 12,
    marginTop: 10,
  },

  // Modal Gerenciador de Vídeos
  modalVideoOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalVideoWrapper: {
    backgroundColor: "#FFFFFF",
    width: "100%",
    height: "75%",
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    paddingBottom: Platform.OS === "ios" ? 40 : 0,
  },
  modalVideoHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 25,
    borderBottomWidth: 1,
    borderBottomColor: "#EBEBEB",
  },
  modalTitle: { color: "#1C1C1E", fontSize: 20, fontWeight: "bold" },
  emptyText: {
    color: "#8E8E93",
    textAlign: "center",
    marginTop: 40,
    fontSize: 16,
  },
  
  // Lista de Vídeos
  videoListItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#1A1A1A",
    padding: 15,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#222",
  },
  videoListInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  videoListTitle: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "bold",
  },
  videoListSub: {
    color: "#8E8E93",
    fontSize: 12,
    marginTop: 4,
  },
  deleteBtn: {
    padding: 10,
    backgroundColor: "rgba(211, 0, 0, 0.15)",
    borderRadius: 8,
  },

  // Grade de miniaturas dos meus vídeos
  videoThumbCard: { flex: 1, maxWidth: "48%" },
  videoThumbWrapper: {
    width: "100%",
    aspectRatio: 16 / 9,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#000",
    position: "relative",
  },
  videoThumb: { width: "100%", height: "100%" },
  videoThumbEmpty: { justifyContent: "center", alignItems: "center", backgroundColor: "#1A1A1A" },
  videoThumbPlay: {
    position: "absolute",
    top: "50%",
    left: "50%",
    width: 44,
    height: 44,
    marginTop: -22,
    marginLeft: -22,
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
  },
  videoThumbDelete: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(211,0,0,0.85)",
    justifyContent: "center",
    alignItems: "center",
  },
  videoThumbTitle: { color: "#1C1C1E", fontSize: 13, fontWeight: "700", marginTop: 6 },
  videoThumbSub: { color: "#8E8E93", fontSize: 11, marginTop: 1 },

  // Player (assistir lance)
  playerOverlay: { flex: 1, backgroundColor: "#000" },
  playerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "android" ? 40 : 55,
    paddingBottom: 12,
  },
  playerTitle: { color: "#FFF", fontSize: 16, fontWeight: "700", flex: 1, marginRight: 12 },
  playerBox: { flex: 1, backgroundColor: "#000", justifyContent: "center" },

  // Modais de Formulário
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalBox: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: "#1A1A1A",
    borderRadius: 16,
    padding: 25,
    borderWidth: 1,
    borderColor: "#222",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 25,
  },
  inputLabel: {
    color: "#8E8E93",
    fontSize: 14,
    marginBottom: 8,
    fontWeight: "bold",
  },
  input: {
    backgroundColor: "#0A0A0A",
    color: "#FFF",
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#222",
    marginBottom: 20,
  },
  saveButton: {
    backgroundColor: "#D30000",
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 10,
  },
  saveButtonText: { color: "#FFF", fontSize: 16, fontWeight: "bold" },
});
