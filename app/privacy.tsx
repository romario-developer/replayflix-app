import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function PrivacyScreen() {
  const router = useRouter();

  return (
    <View style={styles.pageBackground}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0A0A" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacidade</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.container}>
        <Text style={styles.topicTitle}>A sua segurança vem primeiro</Text>
        <Text style={styles.paragraph}>Nós levamos a sua privacidade a sério. O ReplayFlix utiliza criptografia avançada para garantir que os seus dados de login (e-mail e senha) estejam 100% seguros no nosso banco de dados, sendo impossível até mesmo para a nossa equipe acessar a sua senha real.</Text>

        <Text style={styles.topicTitle}>Coleta de Dados Pessoais</Text>
        <Text style={styles.paragraph}>Coletamos apenas o mínimo necessário para o funcionamento do sistema: seu nome de jogador e e-mail. Não rastreamos a sua localização fora das arenas e não vendemos seus dados para empresas de publicidade.</Text>

        <Text style={styles.topicTitle}>Exclusão de Conta</Text>
        <Text style={styles.paragraph}>Em conformidade com a LGPD (Lei Geral de Proteção de Dados), caso você deseje excluir sua conta e apagar todos os vídeos atrelados a você do nosso servidor, basta enviar um e-mail para dpo@replayflix.com.br e faremos a exclusão permanente em até 48 horas.</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  pageBackground: { flex: 1, backgroundColor: '#000' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 15, paddingTop: 50, paddingBottom: 20, backgroundColor: '#0A0A0A', borderBottomWidth: 1, borderBottomColor: '#222' },
  backButton: { padding: 5 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#FFF' },
  container: { padding: 25, paddingBottom: 50 },
  topicTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold', marginBottom: 10, marginTop: 15 },
  paragraph: { color: '#AAA', fontSize: 15, lineHeight: 24, marginBottom: 15, textAlign: 'justify' }
});