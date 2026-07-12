// ============================================================
//  app/recuperar.tsx — Redefinir senha com código
//  O jogador pede o código ao admin (que gera no perfil e manda
//  por WhatsApp). Aqui ele digita usuário + código + senha nova.
// ============================================================

import { Ionicons } from "@expo/vector-icons";
import { router, Stack } from "expo-router";
import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { resetarSenha } from "../services/api";

export default function RecuperarScreen() {
  const [identificador, setIdentificador] = useState("");
  const [codigo, setCodigo] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const [mensagem, setMensagem] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);

  const redefinir = async () => {
    if (!identificador.trim() || !codigo.trim() || !novaSenha) {
      setMensagem({ tipo: "erro", texto: "Preencha todos os campos." });
      return;
    }
    setLoading(true);
    setMensagem(null);
    try {
      const r = await resetarSenha(identificador.trim().toLowerCase(), codigo.trim(), novaSenha);
      setMensagem({ tipo: "ok", texto: r.mensagem });
      setTimeout(() => router.replace("/login"), 2000);
    } catch (error: any) {
      setMensagem({
        tipo: "erro",
        texto: error?.response?.data?.erro || "Não foi possível redefinir. Confira o código.",
      });
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

      <View style={styles.card}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={26} color="#FFF" />
        </TouchableOpacity>

        <Text style={styles.titulo}>Recuperar senha</Text>
        <Text style={styles.subtitulo}>
          Peça um <Text style={{ color: "#FFD700" }}>código de recuperação</Text> ao
          administrador do seu baba. Com ele em mãos, preencha abaixo:
        </Text>

        <View style={styles.inputWrapper}>
          <Ionicons name="person-outline" size={20} color="#888" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="E-mail ou Usuário (@)"
            placeholderTextColor="#666"
            autoCapitalize="none"
            value={identificador}
            onChangeText={setIdentificador}
          />
        </View>

        <View style={styles.inputWrapper}>
          <Ionicons name="key-outline" size={20} color="#888" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Código de 6 dígitos"
            placeholderTextColor="#666"
            keyboardType="number-pad"
            maxLength={6}
            value={codigo}
            onChangeText={setCodigo}
          />
        </View>

        <View style={styles.inputWrapper}>
          <Ionicons name="lock-closed-outline" size={20} color="#888" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Nova senha"
            placeholderTextColor="#666"
            secureTextEntry
            value={novaSenha}
            onChangeText={setNovaSenha}
            onSubmitEditing={redefinir}
          />
        </View>

        {mensagem && (
          <Text style={[styles.mensagem, mensagem.tipo === "ok" ? styles.msgOk : styles.msgErro]}>
            {mensagem.texto}
          </Text>
        )}

        <TouchableOpacity
          style={[styles.botao, loading && { opacity: 0.7 }]}
          onPress={redefinir}
          disabled={loading}
        >
          <Text style={styles.botaoTexto}>
            {loading ? "REDEFININDO..." : "REDEFINIR SENHA"}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  card: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: "rgba(17, 17, 17, 0.9)",
    padding: 28,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#333",
  },
  backBtn: { marginBottom: 10, alignSelf: "flex-start" },
  titulo: { color: "#FFF", fontSize: 26, fontWeight: "900", marginBottom: 10 },
  subtitulo: { color: "#AAA", fontSize: 14, lineHeight: 20, marginBottom: 24 },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1A1A1A",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#333",
    paddingHorizontal: 15,
    height: 55,
    marginBottom: 14,
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, color: "#FFF", fontSize: 16, height: "100%" },
  mensagem: { fontSize: 14, textAlign: "center", marginBottom: 8, lineHeight: 19 },
  msgOk: { color: "#00C853" },
  msgErro: { color: "#FF4444" },
  botao: {
    backgroundColor: "#D30000",
    height: 55,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
  },
  botaoTexto: { color: "#FFF", fontSize: 16, fontWeight: "bold", letterSpacing: 1 },
});
