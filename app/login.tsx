import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Stack, useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import {
    ImageBackground,
    KeyboardAvoidingView,
    Modal,
    Platform,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

export default function LoginScreen() {
  const router = useRouter();

  const [isLogin, setIsLogin] = useState(true);
  const [identificador, setIdentificador] = useState("");
  const [nome, setNome] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // Auto-login: Se atualizar a página e já tiver logado, entra direto
  React.useEffect(() => {
    const verificarLogin = async () => {
      try {
        const userId = await AsyncStorage.getItem("userId");
        if (userId) {
          router.replace("/(tabs)");
        }
      } catch (e) {}
    };
    verificarLogin();
  }, []);

  const [alertaVisible, setAlertaVisible] = useState(false);
  const [alertaTitulo, setAlertaTitulo] = useState("");
  const [alertaMensagem, setAlertaMensagem] = useState("");
  const passwordInputRef = useRef<TextInput>(null);

  const mostrarAlerta = (titulo: string, mensagem: string) => {
    setAlertaTitulo(titulo);
    setAlertaMensagem(mensagem);
    setAlertaVisible(true);
  };

  const handleAcessar = async () => {
    setLoading(true);
    try {
      if (isLogin) {
        if (!identificador || !password) {
          mostrarAlerta("Atenção", "Preencha seu e-mail ou usuário e a senha.");
          setLoading(false);
          return;
        }

        let loginLimpo = identificador.trim().toLowerCase();
        if (loginLimpo.startsWith("@")) loginLimpo = loginLimpo.substring(1);

        const response = await fetch(
          "https://replayflix-backend.onrender.com/api/login",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ identificador: loginLimpo, password }),
          },
        );
        const data = await response.json();

        if (response.ok) {
          await AsyncStorage.setItem("userId", data.usuario.id.toString());
          await AsyncStorage.setItem("userName", data.usuario.nome);
          router.replace("/(tabs)");
        } else {
          mostrarAlerta("Acesso Negado", data.erro || "Erro ao fazer login.");
        }
      } else {
        if (!nome || !username || !email || !password) {
          mostrarAlerta(
            "Atenção",
            "Preencha todos os campos para criar a conta!",
          );
          setLoading(false);
          return;
        }

        let usernameLimpo = username.trim().toLowerCase();
        if (usernameLimpo.startsWith("@"))
          usernameLimpo = usernameLimpo.substring(1);

        const response = await fetch(
          "https://replayflix-backend.onrender.com/api/cadastrar",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              nome,
              username: usernameLimpo,
              email,
              password,
            }),
          },
        );
        const data = await response.json();

        if (response.ok) {
          mostrarAlerta(
            "Bem-vindo à Arena!",
            "Sua conta foi criada com sucesso. Agora você pode fazer o login.",
          );
          setPassword("");
          setIdentificador(usernameLimpo);
          setIsLogin(true);
        } else {
          mostrarAlerta("Ops!", data.erro || "Erro ao criar conta.");
        }
      }
    } catch (error) {
      console.error(error);
      mostrarAlerta(
        "Erro de Conexão",
        "Não foi possível conectar ao servidor do ReplayFlix.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      <ImageBackground
        source={{
          uri: "https://images.unsplash.com/photo-1556816214-cb349fb99581?q=80&w=1000&auto=format&fit=crop",
        }}
        style={styles.backgroundImage}
        imageStyle={{ opacity: 0.15 }}
      >
        <View style={styles.overlay}>
          <View style={styles.formContainer}>
            <View style={styles.logoContainer}>
              {/* NOVA LOGO REPLAYFLIX */}
              <Text style={styles.logoText}>
                Replay<Text style={styles.logoHighlight}>Flix</Text>
              </Text>
              <Text style={styles.subtitle}>Eternize seus melhores lances</Text>
            </View>

            <View style={styles.toggleContainer}>
              <TouchableOpacity
                style={[
                  styles.toggleButton,
                  isLogin && styles.toggleButtonActive,
                ]}
                onPress={() => setIsLogin(true)}
              >
                <Text
                  style={[
                    styles.toggleText,
                    isLogin && styles.toggleTextActive,
                  ]}
                >
                  Entrar
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.toggleButton,
                  !isLogin && styles.toggleButtonActive,
                ]}
                onPress={() => setIsLogin(false)}
              >
                <Text
                  style={[
                    styles.toggleText,
                    !isLogin && styles.toggleTextActive,
                  ]}
                >
                  Criar Conta
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.inputsContainer}>
              {!isLogin && (
                <>
                  <View style={styles.inputWrapper}>
                    <Ionicons
                      name="person-outline"
                      size={20}
                      color="#888"
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={styles.input}
                      placeholder="Seu nome"
                      placeholderTextColor="#666"
                      value={nome}
                      onChangeText={setNome}
                    />
                  </View>

                  <View style={styles.inputWrapper}>
                    <Ionicons
                      name="at"
                      size={20}
                      color="#888"
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={styles.input}
                      placeholder="Nome de Usuário (@)"
                      placeholderTextColor="#666"
                      value={username}
                      onChangeText={setUsername}
                      autoCapitalize="none"
                    />
                  </View>

                  <View style={styles.inputWrapper}>
                    <Ionicons
                      name="mail-outline"
                      size={20}
                      color="#888"
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={styles.input}
                      placeholder="Seu e-mail"
                      placeholderTextColor="#666"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      value={email}
                      onChangeText={setEmail}
                    />
                  </View>
                </>
              )}

              {isLogin && (
                <View style={styles.inputWrapper}>
                  <Ionicons
                    name="person-outline"
                    size={20}
                    color="#888"
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="E-mail ou Usuário (@)"
                    placeholderTextColor="#666"
                    autoCapitalize="none"
                    value={identificador}
                    onChangeText={setIdentificador}
                    returnKeyType="next"
                    onSubmitEditing={() => passwordInputRef.current?.focus()}
                  />
                </View>
              )}

              <View style={styles.inputWrapper}>
                <Ionicons
                  name="lock-closed-outline"
                  size={20}
                  color="#888"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Sua senha"
                  placeholderTextColor="#666"
                  secureTextEntry
                  value={password}
                  onChangeText={setPassword}
                  returnKeyType="go"
                  onSubmitEditing={handleAcessar}
                  ref={passwordInputRef}
                />
              </View>

              {isLogin && (
                <TouchableOpacity style={styles.forgotPassword}>
                  <Text style={styles.forgotPasswordText}>
                    Esqueci minha senha
                  </Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[styles.submitButton, loading && { opacity: 0.7 }]}
                activeOpacity={0.8}
                onPress={handleAcessar}
                disabled={loading}
              >
                <Text style={styles.submitButtonText}>
                  {loading
                    ? "CARREGANDO..."
                    : isLogin
                      ? "ENTRAR NA ARENA"
                      : "CRIAR MINHA CONTA"}
                </Text>
                {!loading && (
                  <Ionicons name="arrow-forward" size={20} color="#FFF" />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <Modal
          animationType="fade"
          transparent
          visible={alertaVisible}
          onRequestClose={() => setAlertaVisible(false)}
        >
          <View style={styles.alertOverlay}>
            <View style={styles.alertBox}>
              <View style={styles.alertHeader}>
                <Ionicons name="information-circle" size={28} color="#D30000" />
                <Text style={styles.alertTitle}>{alertaTitulo}</Text>
              </View>
              <Text style={styles.alertMessage}>{alertaMensagem}</Text>
              <TouchableOpacity
                style={styles.alertButton}
                onPress={() => setAlertaVisible(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.alertButtonText}>OK, ENTENDI</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </ImageBackground>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  backgroundImage: { flex: 1, width: "100%", height: "100%" },
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  formContainer: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: "rgba(17, 17, 17, 0.85)",
    padding: 30,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#333",
  },
  logoContainer: { alignItems: "center", marginBottom: 40 },
  logoText: {
    fontSize: 42,
    fontWeight: "900",
    color: "#FFF",
    fontStyle: "italic",
    letterSpacing: -1,
  },
  logoHighlight: { color: "#D30000" },
  subtitle: { color: "#AAA", fontSize: 14, marginTop: 5 },
  toggleContainer: {
    flexDirection: "row",
    backgroundColor: "#0A0A0A",
    borderRadius: 10,
    padding: 4,
    marginBottom: 30,
    borderWidth: 1,
    borderColor: "#222",
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 8,
  },
  toggleButtonActive: { backgroundColor: "#222" },
  toggleText: { color: "#666", fontWeight: "bold", fontSize: 14 },
  toggleTextActive: { color: "#FFF" },
  inputsContainer: { gap: 15 },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1A1A1A",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#333",
    paddingHorizontal: 15,
    height: 55,
  },
  inputIcon: { marginRight: 10 },
  input: {
    flex: 1,
    color: "#FFF",
    fontSize: 16,
    height: "100%",
    outlineColor: "transparent",
    outlineWidth: 0,
  },
  forgotPassword: { alignSelf: "flex-end", marginTop: -5, marginBottom: 10 },
  forgotPasswordText: {
    color: "#888",
    fontSize: 13,
    textDecorationLine: "underline",
  },
  submitButton: {
    flexDirection: "row",
    backgroundColor: "#D30000",
    height: 55,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
    gap: 10,
  },
  submitButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "bold",
    letterSpacing: 1,
  },
  alertOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  alertBox: {
    width: "100%",
    maxWidth: 350,
    backgroundColor: "#1A1A1A",
    borderRadius: 16,
    padding: 25,
    borderWidth: 1,
    borderColor: "#333",
    alignItems: "center",
  },
  alertHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
    gap: 10,
  },
  alertTitle: { color: "#FFF", fontSize: 18, fontWeight: "bold" },
  alertMessage: {
    color: "#AAA",
    fontSize: 15,
    textAlign: "center",
    marginBottom: 25,
    lineHeight: 22,
  },
  alertButton: {
    backgroundColor: "#222",
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 8,
    width: "100%",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#444",
  },
  alertButtonText: {
    color: "#FFF",
    fontWeight: "bold",
    fontSize: 14,
    letterSpacing: 1,
  },
});
