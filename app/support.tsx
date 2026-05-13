import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, StatusBar, Linking, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function SupportScreen() {
  const router = useRouter();

  // Função para abrir o WhatsApp já com uma mensagem pronta!
  const abrirWhatsApp = async () => {
    const url = 'whatsapp://send?phone=5511999999999&text=Olá! Preciso de ajuda com os meus lances no ReplayFlix.';
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert('Erro', 'WhatsApp não está instalado neste dispositivo.');
    }
  };

  // Função para abrir o aplicativo de E-mail padrão
  const abrirEmail = async () => {
    try {
      await Linking.openURL('mailto:romariotecla@icloud.com?subject=Dúvida ReplayFlix');
    } catch {
      Alert.alert('Erro', 'Nenhum aplicativo de e-mail encontrado.');
    }
  };

  return (
    <View style={styles.pageBackground}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0A0A" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Central de Ajuda</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.container}>
        <Text style={styles.pageTitle}>Como podemos ajudar?</Text>
        <Text style={styles.paragraph}>A equipe do ReplayFlix está pronta para te ajudar a resgatar aquele golaço perdido ou tirar dúvidas sobre a integração na sua Arena.</Text>

        {/* LIGADO: Abre o E-mail */}
        <TouchableOpacity style={styles.contactCard} activeOpacity={0.7} onPress={abrirEmail}>
          <Ionicons name="mail" size={26} color="#D30000" />
          <View style={styles.contactInfo}>
            <Text style={styles.contactTitle}>Suporte via E-mail</Text>
            <Text style={styles.contactDetail}>romariotecla@icloud.com</Text>
          </View>
        </TouchableOpacity>

        {/* LIGADO: Abre o WhatsApp */}
        <TouchableOpacity style={styles.contactCard} activeOpacity={0.7} onPress={abrirWhatsApp}>
          <Ionicons name="logo-whatsapp" size={26} color="#25D366" />
          <View style={styles.contactInfo}>
            <Text style={styles.contactTitle}>Atendimento WhatsApp</Text>
            <Text style={styles.contactDetail}>(73) 99161-0162</Text>
          </View>
        </TouchableOpacity>

        <Text style={styles.faqTitle}>Dúvidas Frequentes (FAQ)</Text>
        <View style={styles.faqItem}>
          <Text style={styles.faqQuestion}>Como salvo um lance para mim?</Text>
          <Text style={styles.faqAnswer}>Abra o vídeo na galeria e clique no botão vermelho &quot;Salvar nos Meus Lances&quot;. Ele irá direto para o seu perfil.</Text>
        </View>
        <View style={styles.faqItem}>
          <Text style={styles.faqQuestion}>Meu vídeo não apareceu na galeria, e agora?</Text>
          <Text style={styles.faqAnswer}>Puxe a tela inicial para baixo para atualizar a conexão com a Arena. Se o vídeo foi gravado há menos de 1 minuto, ele já vai aparecer.</Text>
        </View>
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
  pageTitle: { color: '#FFF', fontSize: 24, fontWeight: 'bold', marginBottom: 15 },
  paragraph: { color: '#AAA', fontSize: 16, lineHeight: 24, marginBottom: 30 },
  contactCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1A1A1A', padding: 20, borderRadius: 16, marginBottom: 15, borderWidth: 1, borderColor: '#222' },
  contactInfo: { marginLeft: 15 },
  contactTitle: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  contactDetail: { color: '#888', fontSize: 14, marginTop: 4 },
  faqTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold', marginTop: 30, marginBottom: 15 },
  faqItem: { backgroundColor: '#111', padding: 20, borderRadius: 12, marginBottom: 15, borderWidth: 1, borderColor: '#222' },
  faqQuestion: { color: '#D30000', fontSize: 16, fontWeight: 'bold', marginBottom: 8 },
  faqAnswer: { color: '#AAA', fontSize: 14, lineHeight: 22 }
});
