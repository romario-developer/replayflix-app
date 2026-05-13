import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, StatusBar, Modal, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function SecurityScreen() {
  const router = useRouter();

  // Estados para controlar a janelinha de Alterar Senha
  const [modalSenhaVisivel, setModalSenhaVisivel] = useState(false);
  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');

  // Função que simula a troca de senha
  const salvarNovaSenha = () => {
    if (!senhaAtual || !novaSenha) {
      Alert.alert("Erro", "Preencha todos os campos.");
      return;
    }
    Alert.alert("Sucesso", "Sua senha foi atualizada no banco de dados.");
    setModalSenhaVisivel(false);
    setSenhaAtual('');
    setNovaSenha('');
  };

  const handle2FA = () => {
    Alert.alert("Autenticação em Duas Etapas", "Este módulo de segurança via SMS estará disponível nas próximas atualizações do ReplayFlix.");
  };

  return (
    <View style={styles.pageBackground}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0A0A" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacidade e Segurança</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.container}>
        
        <Text style={styles.sectionTitle}>SEGURANÇA DA CONTA</Text>
        <View style={styles.menuCard}>
          {/* LIGADO: Abre o pop-up de senha */}
          <TouchableOpacity style={styles.menuItemLink} onPress={() => setModalSenhaVisivel(true)}>
            <Text style={styles.menuItemTitle}>Alterar Senha</Text>
            <Ionicons name="chevron-forward" size={20} color="#666" />
          </TouchableOpacity>
          
          {/* LIGADO: Abre o aviso de 2FA */}
          <TouchableOpacity style={styles.menuItemLink} onPress={handle2FA}>
            <Text style={styles.menuItemTitle}>Autenticação em Duas Etapas</Text>
            <Ionicons name="chevron-forward" size={20} color="#666" />
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>SOBRE O SISTEMA</Text>
        <View style={styles.menuCard}>
          <TouchableOpacity style={styles.menuItemLink} onPress={() => router.push('/terms')}>
            <Text style={styles.menuItemTitle}>Termos de Uso</Text>
            <Ionicons name="open-outline" size={18} color="#666" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.menuItemLink} onPress={() => router.push('/privacy')}>
            <Text style={styles.menuItemTitle}>Política de Privacidade</Text>
            <Ionicons name="open-outline" size={18} color="#666" />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* ========================================= */}
      {/* MODAL: MUDAR SENHA                        */}
      {/* ========================================= */}
      <Modal visible={modalSenhaVisivel} animationType="slide" transparent={true} onRequestClose={() => setModalSenhaVisivel(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Alterar Senha</Text>
              <TouchableOpacity onPress={() => setModalSenhaVisivel(false)}>
                <Ionicons name="close" size={28} color="#666" />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Senha Atual</Text>
            <TextInput 
              style={styles.input} 
              secureTextEntry 
              placeholder="Digite sua senha atual" 
              placeholderTextColor="#666"
              value={senhaAtual}
              onChangeText={setSenhaAtual}
            />

            <Text style={styles.inputLabel}>Nova Senha</Text>
            <TextInput 
              style={styles.input} 
              secureTextEntry 
              placeholder="Digite a nova senha" 
              placeholderTextColor="#666"
              value={novaSenha}
              onChangeText={setNovaSenha}
            />

            <TouchableOpacity style={styles.saveButton} activeOpacity={0.8} onPress={salvarNovaSenha}>
              <Text style={styles.saveButtonText}>Salvar Nova Senha</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  pageBackground: { flex: 1, backgroundColor: '#000' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 15, paddingTop: 50, paddingBottom: 20, backgroundColor: '#0A0A0A', borderBottomWidth: 1, borderBottomColor: '#222' },
  backButton: { padding: 5 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#FFF' },
  container: { padding: 20, paddingBottom: 40 },
  sectionTitle: { color: '#666', fontSize: 13, fontWeight: 'bold', marginBottom: 10, marginLeft: 10, letterSpacing: 1, marginTop: 10 },
  menuCard: { backgroundColor: '#1A1A1A', borderRadius: 16, overflow: 'hidden', marginBottom: 25, borderWidth: 1, borderColor: '#222' },
  menuItemLink: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 18, borderBottomWidth: 1, borderBottomColor: '#222' },
  menuItemTitle: { color: '#FFF', fontSize: 16, fontWeight: '500' },
  
  // Estilos do Modal de Senha
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalBox: { width: '100%', maxWidth: 400, backgroundColor: '#111', borderRadius: 16, padding: 25, borderWidth: 1, borderColor: '#222' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
  modalTitle: { color: '#FFF', fontSize: 20, fontWeight: 'bold' },
  inputLabel: { color: '#888', fontSize: 14, marginBottom: 8, fontWeight: 'bold' },
  input: { backgroundColor: '#1A1A1A', color: '#FFF', borderRadius: 12, paddingHorizontal: 15, paddingVertical: 12, fontSize: 16, borderWidth: 1, borderColor: '#333', marginBottom: 20 },
  saveButton: { backgroundColor: '#D30000', paddingVertical: 15, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  saveButtonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' }
});