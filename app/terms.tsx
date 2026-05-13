import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function TermsScreen() {
  const router = useRouter();

  return (
    <View style={styles.pageBackground}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0A0A" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Termos de Uso</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.container}>
        <Text style={styles.lastUpdate}>Última atualização: Outubro de 2023</Text>
        
        <Text style={styles.topicTitle}>1. Aceitação dos Termos</Text>
        <Text style={styles.paragraph}>Ao utilizar o aplicativo ReplayFlix nas arenas parceiras, você concorda que suas imagens e jogadas gravadas pelo nosso Totem de Câmera poderão ser armazenadas e exibidas na galeria pública do aplicativo para outros jogadores da mesma partida.</Text>

        <Text style={styles.topicTitle}>2. Uso das Imagens</Text>
        <Text style={styles.paragraph}>O ReplayFlix se isenta de responsabilidade sobre o uso indevido de vídeos baixados por terceiros. Você possui o direito de reivindicar a posse do seu vídeo e apagá-lo da base de dados através do menu Gerenciar Meus Vídeos a qualquer momento.</Text>

        <Text style={styles.topicTitle}>3. Regras de Conduta</Text>
        <Text style={styles.paragraph}>É expressamente proibido utilizar o sistema de gravação do ReplayFlix para registrar agressões, atos ilícitos ou desrespeitosos nas quadras. Usuários identificados violando esta regra terão suas contas banidas.</Text>
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
  lastUpdate: { color: '#666', fontSize: 12, marginBottom: 25, textTransform: 'uppercase', letterSpacing: 1 },
  topicTitle: { color: '#D30000', fontSize: 18, fontWeight: 'bold', marginBottom: 10, marginTop: 15 },
  paragraph: { color: '#AAA', fontSize: 15, lineHeight: 24, marginBottom: 15, textAlign: 'justify' }
});