// ============================================================
//  Frontend/app/arenas.tsx — Página de gerenciamento de arenas
//  Acessível em /arenas (Expo Router)
// ============================================================

import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
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
} from 'react-native';
import { Arena, criarArena, deletarArena, getArenas } from '../services/api';

export default function ArenasScreen() {
  const [arenas, setArenas] = useState<Arena[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // Formulário
  const [nome, setNome] = useState('');
  const [cidade, setCidade] = useState('');
  const [fotoUri, setFotoUri] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(async () => {
    try {
      const dados = await getArenas();
      setArenas(dados);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      const uid = await AsyncStorage.getItem('userId');
      setUserId(uid);
      const admin = await AsyncStorage.getItem('isAdmin');
      setIsAdmin(admin === '1');
      await carregar();
    })();
  }, [carregar]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    carregar();
  }, [carregar]);

  const escolherFoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permissão', 'Precisamos acesso às fotos pra escolher a imagem da arena.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      setFotoUri(result.assets[0].uri);
    }
  };

  const salvar = async () => {
    if (!userId) {
      Alert.alert('Erro', 'Você precisa estar logado.');
      return;
    }
    if (!nome.trim() || !cidade.trim()) {
      Alert.alert('Atenção', 'Preencha nome e cidade.');
      return;
    }
    setSalvando(true);
    const res = await criarArena(
      { nome: nome.trim(), cidade: cidade.trim(), owner_id: userId },
      fotoUri
    );
    setSalvando(false);

    if (res.ok) {
      setShowForm(false);
      setNome('');
      setCidade('');
      setFotoUri(null);
      carregar();
    } else {
      Alert.alert('Erro', res.erro || 'Não foi possível cadastrar.');
    }
  };

  const apagar = (arena: Arena) => {
    if (!userId || arena.owner_id !== userId) {
      Alert.alert('Sem permissão', 'Você só pode excluir arenas que cadastrou.');
      return;
    }
    const executa = async () => {
      const ok = await deletarArena(arena.id, userId);
      if (ok) carregar();
      else if (Platform.OS === 'web') window.alert('Não foi possível excluir.');
      else Alert.alert('Erro', 'Não foi possível excluir.');
    };
    const aviso = `Tem certeza que quer excluir "${arena.nome}"?\n\nOs babas e pagamentos dela somem junto. Os vídeos não são apagados, só desvinculados.`;
    // Alert.alert não funciona na web — usa o confirm do navegador
    if (Platform.OS === 'web') {
      if (window.confirm(aviso)) executa();
    } else {
      Alert.alert('Excluir arena', aviso, [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Excluir', style: 'destructive', onPress: executa },
      ]);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#D30000" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={28} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Arenas</Text>
        {isAdmin ? (
          <TouchableOpacity onPress={() => setShowForm(true)} style={styles.addBtn}>
            <Ionicons name="add" size={26} color="#FFF" />
          </TouchableOpacity>
        ) : (
          <View style={styles.addBtn} />
        )}
      </View>

      {!isAdmin && (
        <View style={styles.adminHint}>
          <Ionicons name="information-circle-outline" size={16} color="#FFD700" />
          <Text style={styles.adminHintText}>
            Só administradores cadastram arenas. Precisa de uma nova? Fale com um admin.
          </Text>
        </View>
      )}

      <FlatList
        data={arenas}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#D30000" />
        }
        contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Ionicons name="football-outline" size={64} color="#333" />
            <Text style={styles.emptyText}>Nenhuma arena cadastrada.</Text>
            <Text style={styles.emptyHint}>Toque no + pra cadastrar a primeira.</Text>
          </View>
        }
        renderItem={({ item }) => {
          const ehDono = userId && item.owner_id === userId;
          return (
            <View style={styles.card}>
              {item.foto_url ? (
                <Image source={{ uri: item.foto_url }} style={styles.cardFoto} />
              ) : (
                <View style={[styles.cardFoto, styles.noFoto]}>
                  <Text style={styles.noFotoText}>{item.nome.charAt(0).toUpperCase()}</Text>
                </View>
              )}
              <View style={styles.cardBody}>
                <Text style={styles.cardNome}>{item.nome}</Text>
                <Text style={styles.cardCidade}>{item.cidade}</Text>
                {ehDono && <Text style={styles.cardOwner}>Minha arena</Text>}
              </View>
              {ehDono && (
                <>
                  <TouchableOpacity
                    onPress={() =>
                      router.push({
                        pathname: '/babas',
                        params: { arenaId: item.id, arenaNome: item.nome },
                      })
                    }
                    style={styles.cardBabas}
                  >
                    <Ionicons name="calendar-outline" size={16} color="#FFF" />
                    <Text style={styles.cardBabasText}>Babas</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => apagar(item)} style={styles.cardDelete}>
                    <Ionicons name="trash-outline" size={20} color="#FF4444" />
                  </TouchableOpacity>
                </>
              )}
            </View>
          );
        }}
      />

      {/* MODAL DE CADASTRO */}
      <Modal
        visible={showForm}
        transparent
        animationType="slide"
        onRequestClose={() => setShowForm(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalSheet}>
            <ScrollView>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Cadastrar arena</Text>
                <TouchableOpacity onPress={() => setShowForm(false)}>
                  <Ionicons name="close" size={26} color="#FFF" />
                </TouchableOpacity>
              </View>

              <Text style={styles.label}>Nome</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: Arena 40º"
                placeholderTextColor="#666"
                value={nome}
                onChangeText={setNome}
              />

              <Text style={styles.label}>Cidade</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: Salvador - BA"
                placeholderTextColor="#666"
                value={cidade}
                onChangeText={setCidade}
              />

              <Text style={styles.label}>Foto (opcional)</Text>
              <TouchableOpacity style={styles.fotoBtn} onPress={escolherFoto}>
                {fotoUri ? (
                  <Image source={{ uri: fotoUri }} style={styles.fotoPreview} />
                ) : (
                  <>
                    <Ionicons name="image-outline" size={32} color="#888" />
                    <Text style={styles.fotoBtnText}>Escolher imagem</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.saveBtn, salvando && { opacity: 0.6 }]}
                onPress={salvar}
                disabled={salvando}
              >
                {salvando ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.saveBtnText}>Cadastrar</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0A' },
  center: { justifyContent: 'center', alignItems: 'center' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 45,
    paddingBottom: 15,
    paddingHorizontal: 12,
    backgroundColor: '#0A0A0A',
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  backBtn: { padding: 5 },
  addBtn: { padding: 5 },
  headerTitle: {
    flex: 1,
    color: '#FFF',
    fontSize: 19,
    fontWeight: '900',
    textAlign: 'center',
  },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#121212',
    padding: 12,
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#1A1A1A',
  },
  cardFoto: {
    width: 60,
    height: 60,
    borderRadius: 14,
    backgroundColor: '#222',
  },
  noFoto: { justifyContent: 'center', alignItems: 'center' },
  noFotoText: { color: '#666', fontSize: 26, fontWeight: '900' },
  cardBody: { flex: 1, marginLeft: 14 },
  cardNome: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  cardCidade: { color: '#999', fontSize: 13, marginTop: 2 },
  cardOwner: { color: '#FFD700', fontSize: 11, marginTop: 4, fontWeight: '600' },
  cardDelete: { padding: 8 },
  cardBabas: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#D30000',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    marginRight: 4,
  },
  cardBabasText: { color: '#FFF', fontSize: 12, fontWeight: '700' },
  adminHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#151208',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  adminHintText: { color: '#B8A24A', fontSize: 12, flex: 1, lineHeight: 17 },

  emptyBox: { alignItems: 'center', marginTop: 80 },
  emptyText: { color: '#888', fontSize: 16, marginTop: 16 },
  emptyHint: { color: '#666', fontSize: 13, marginTop: 6 },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#0F0F0F',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 22,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: { color: '#FFF', fontSize: 19, fontWeight: '900' },

  label: {
    color: '#999',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 14,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: '#1A1A1A',
    color: '#FFF',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#222',
  },
  fotoBtn: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    height: 140,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#222',
    overflow: 'hidden',
  },
  fotoBtnText: { color: '#888', fontSize: 13, marginTop: 8 },
  fotoPreview: { width: '100%', height: '100%' },

  saveBtn: {
    backgroundColor: '#D30000',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 10,
  },
  saveBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});
