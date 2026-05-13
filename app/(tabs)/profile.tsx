import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    Alert,
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

  useEffect(() => {
    carregarPerfil();
  }, []);

  const carregarPerfil = async () => {
    try {
      const userId = await AsyncStorage.getItem("userId");
      if (userId) {
        const fotoSalva = await AsyncStorage.getItem(`avatar_${userId}`);
        if (fotoSalva) setImagemPerfil(fotoSalva);

        const posicaoSalva = await AsyncStorage.getItem(`posicao_${userId}`);
        if (posicaoSalva) setPosicao(posicaoSalva);
        
        // --- CURATIVO TÁTICO ---
        // Puxa o nome diretamente da memória do celular em vez de tentar buscar no Render
        const nomeSalvo = await AsyncStorage.getItem("userName");
        if (nomeSalvo) {
          setNomeUsuario(nomeSalvo);
          setArrobaUsuario(nomeSalvo.toLowerCase().replace(/\s/g, ''));
        } else {
          setNomeUsuario("Jogador Oficial");
          setArrobaUsuario("jogadoroficial");
        }
        
        setEmailUsuario("perfil@replayflix.com.br"); // Placeholder
      }
    } catch (error) {
      console.error("Erro ao carregar perfil local:", error);
    }
  };

  const handleTrocarFoto = async () => {
    if (Platform.OS === "web") {
      alert("Para trocar a foto, use o aplicativo no celular!");
      return;
    }

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
    });

    if (!result.canceled) {
      const novaFotoUrl = result.assets[0].uri;
      setImagemPerfil(novaFotoUrl);

      const userId = await AsyncStorage.getItem("userId");
      if (userId) {
        await AsyncStorage.setItem(`avatar_${userId}`, novaFotoUrl);
      }
    }
  };

  const salvarNovaPosicao = async () => {
    if (!novaPosicaoDigitada.trim()) {
      Alert.alert("Erro", "A posição não pode ficar vazia.");
      return;
    }
    setPosicao(novaPosicaoDigitada);
    setModalPosicaoVisible(false);

    const userId = await AsyncStorage.getItem("userId");
    if (userId) {
      await AsyncStorage.setItem(`posicao_${userId}`, novaPosicaoDigitada);
    }
  };

  const salvarEdicaoPerfil = async () => {
    if (!editNome.trim() || !editUsername.trim() || !editEmail.trim()) {
      Alert.alert("Erro", "Preencha todos os campos.");
      return;
    }

    try {
      const userId = await AsyncStorage.getItem("userId");
      const response = await fetch(
        `https://replayflix-backend.onrender.com/api/usuarios/${userId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nome: editNome,
            username: editUsername,
            email: editEmail,
          }),
        },
      );

      const data = await response.json();

      if (response.ok) {
        setNomeUsuario(editNome);
        setArrobaUsuario(editUsername.trim().toLowerCase().replace("@", ""));
        setEmailUsuario(editEmail.trim().toLowerCase());
        await AsyncStorage.setItem("userName", editNome);
        setModalEditPerfilVisible(false);
      } else {
        Alert.alert("Erro", data.erro || "Não foi possível atualizar.");
      }
    } catch {
      Alert.alert("Erro", "Falha de conexão com o servidor.");
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
      const response = await fetch(
        "https://replayflix-backend.onrender.com/api/replays",
      );
      const data = await response.json();

      if (response.ok) {
        const filtrados = data.filter(
          (video: any) => video.user_id && video.user_id.toString() === userId,
        );
        setMeusVideos(filtrados);
      }
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
      const response = await fetch(
        `https://replayflix-backend.onrender.com/api/replays/${filename}`,
        { method: "DELETE" },
      );
      if (response.ok) {
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
              const response = await fetch(
                `https://replayflix-backend.onrender.com/api/usuarios/${userId}`,
                { method: "DELETE" },
              );
              if (response.ok) {
                await AsyncStorage.clear();
                router.replace("/login");
              } else {
                Alert.alert("Erro", "Não foi possível excluir a conta.");
              }
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
            <Image source={{ uri: imagemPerfil }} style={styles.avatar} />
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
                <Ionicons name="close-circle" size={30} color="#666" />
              </TouchableOpacity>
            </View>
            {loadingVideos ? (
              <Text style={styles.emptyText}>Carregando seus lances...</Text>
            ) : meusVideos.length === 0 ? (
              <Text style={styles.emptyText}>
                Você ainda não possui vídeos salvos.
              </Text>
            ) : (
              <FlatList
                data={meusVideos}
                keyExtractor={(item) => item.id.toString()}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
                renderItem={({ item }) => (
                  <View style={styles.videoListItem}>
                    <View style={styles.videoListInfo}>
                      <Ionicons
                        name="videocam"
                        size={24}
                        color="#D30000"
                        style={{ marginRight: 15 }}
                      />
                      <View>
                        <Text style={styles.videoListTitle}>
                          {formatarTitulo(item.filename)}
                        </Text>
                        <Text style={styles.videoListSub}>
                          {item.arena} • {item.size || "15MB"}
                        </Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      onPress={() => confirmarExclusao(item.filename)}
                      style={styles.deleteBtn}
                    >
                      <Ionicons name="trash" size={20} color="#FFF" />
                    </TouchableOpacity>
                  </View>
                )}
              />
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  pageBackground: { flex: 1, backgroundColor: "#000" },
  container: {
    flexGrow: 1,
    backgroundColor: "#111",
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
    paddingTop: 50,
    paddingBottom: 20,
    backgroundColor: "#0A0A0A",
  },
  headerTitle: { fontSize: 24, fontWeight: "bold", color: "#FFF" },
  profileCard: {
    alignItems: "center",
    paddingVertical: 30,
    backgroundColor: "#1A1A1A",
    borderBottomWidth: 1,
    borderBottomColor: "#222",
  },
  avatarContainer: { position: "relative", marginBottom: 15 },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: "#D30000",
  },
  editAvatarBtn: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "#D30000",
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#1A1A1A",
  },

  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  userName: { fontSize: 22, fontWeight: "bold", color: "#FFF" },
  userArroba: {
    fontSize: 15,
    color: "#D30000",
    fontWeight: "600",
    marginTop: 2,
  },
  userEmail: { fontSize: 13, color: "#666", marginTop: 2 }, // ESTILO DO EMAIL NA TELA

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
    color: "#888",
    textTransform: "uppercase",
    letterSpacing: 1,
  },

  statsContainer: {
    flexDirection: "row",
    marginTop: 25,
    backgroundColor: "#111",
    borderRadius: 15,
    paddingVertical: 15,
    paddingHorizontal: 20,
    width: "85%",
    maxWidth: 400,
    justifyContent: "space-around",
    borderWidth: 1,
    borderColor: "#333",
  },
  statBox: { alignItems: "center" },
  statNumber: { fontSize: 20, fontWeight: "900", color: "#FFF" },
  statLabel: { fontSize: 12, color: "#888", marginTop: 4 },
  statDivider: { width: 1, backgroundColor: "#333" },
  menuContainer: { paddingHorizontal: 20, paddingTop: 30 },
  sectionTitle: {
    color: "#666",
    fontSize: 13,
    fontWeight: "bold",
    marginBottom: 10,
    marginLeft: 10,
    letterSpacing: 1,
  },
  menuCard: {
    backgroundColor: "#1A1A1A",
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 25,
    borderWidth: 1,
    borderColor: "#222",
  },
  menuItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#222",
  },
  menuItemLeft: { flexDirection: "row", alignItems: "center" },
  iconBox: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.05)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  menuItemText: { color: "#FFF", fontSize: 16, fontWeight: "500" },

  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#222",
  },
  logoutText: {
    color: "#FFF",
    opacity: 0.8,
    fontSize: 16,
    fontWeight: "500",
    marginLeft: 15,
  },

  // ESTILO DO BOTÃO DE APAGAR CONTA
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
    color: "#444",
    fontSize: 12,
    marginTop: 10,
  },

  modalVideoOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "flex-end",
  },
  modalVideoWrapper: {
    backgroundColor: "#111",
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
    borderBottomColor: "#222",
  },
  modalTitle: { color: "#FFF", fontSize: 20, fontWeight: "bold" },
  emptyText: {
    color: "#666",
    textAlign: "center",
    marginTop: 40,
    fontSize: 16,
  },
  videoListItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#1A1A1A",
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#222",
  },
  videoListInfo: { flexDirection: "row", alignItems: "center", flex: 1 },
  videoListTitle: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 4,
  },
  videoListSub: { color: "#888", fontSize: 12 },
  deleteBtn: {
    backgroundColor: "#D30000",
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },

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
    backgroundColor: "#111",
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
    color: "#888",
    fontSize: 14,
    marginBottom: 8,
    fontWeight: "bold",
  },
  input: {
    backgroundColor: "#1A1A1A",
    color: "#FFF",
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#333",
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
