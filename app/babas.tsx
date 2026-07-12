// ============================================================
//  app/babas.tsx — Gerenciamento de babas de uma arena
//  Acessível em /babas?arenaId=X&arenaNome=Y (só faz sentido
//  pro dono da arena — o backend valida a permissão).
//
//  Aqui o dono cadastra os babas (dia da semana + horário) e
//  marca a mensalidade do mês como paga. Sem pagamento, o
//  botão do totem fica bloqueado naquele horário.
// ============================================================

import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
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
import {
  atualizarBaba,
  Baba,
  criarBaba,
  deletarBaba,
  desfazerPagamentoBaba,
  getBabas,
  pagarBaba,
} from '../services/api';

const DIAS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const DIAS_CURTO = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const formatHora = (h?: string) => (h || '').substring(0, 5); // "19:00:00" -> "19:00"

export default function BabasScreen() {
  const { arenaId, arenaNome } = useLocalSearchParams<{ arenaId: string; arenaNome?: string }>();

  const [babas, setBabas] = useState<Baba[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [babaEditando, setBabaEditando] = useState<Baba | null>(null);

  // Formulário
  const [nome, setNome] = useState('');
  const [diaSemana, setDiaSemana] = useState<number>(3); // quarta por padrão
  const [horaInicio, setHoraInicio] = useState('19:00');
  const [horaFim, setHoraFim] = useState('21:00');
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(async () => {
    if (!arenaId) return;
    try {
      setBabas(await getBabas(arenaId));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [arenaId]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    carregar();
  }, [carregar]);

  const avisar = (titulo: string, msg: string) => {
    if (Platform.OS === 'web') window.alert(`${titulo}\n\n${msg}`);
    else Alert.alert(titulo, msg);
  };

  const horaValida = (h: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(h);

  const salvar = async () => {
    if (!nome.trim()) return avisar('Atenção', 'Dê um nome ao baba (ex: Baba de Quarta).');
    if (!horaValida(horaInicio) || !horaValida(horaFim)) {
      return avisar('Atenção', 'Horários no formato HH:MM (ex: 19:00).');
    }
    setSalvando(true);
    const dados = {
      nome: nome.trim(),
      dia_semana: diaSemana,
      hora_inicio: horaInicio,
      hora_fim: horaFim,
    };
    // Mesmo formulário serve pra criar e pra editar
    const res = babaEditando
      ? await atualizarBaba(babaEditando.id, dados)
      : await criarBaba(arenaId!, dados);
    setSalvando(false);

    if (res.ok) {
      fecharForm();
      carregar();
    } else {
      avisar('Erro', res.erro || 'Não foi possível salvar.');
    }
  };

  const abrirEdicao = (baba: Baba) => {
    setBabaEditando(baba);
    setNome(baba.nome);
    setDiaSemana(baba.dia_semana);
    setHoraInicio(formatHora(baba.hora_inicio));
    setHoraFim(formatHora(baba.hora_fim));
    setShowForm(true);
  };

  const fecharForm = () => {
    setShowForm(false);
    setBabaEditando(null);
    setNome('');
  };

  const togglePagamento = async (baba: Baba) => {
    const resp = baba.pago_mes_atual
      ? await desfazerPagamentoBaba(baba.id)
      : await pagarBaba(baba.id);
    if (resp) {
      setBabas(prev => prev.map(b =>
        b.id === baba.id ? { ...b, pago_mes_atual: !baba.pago_mes_atual } : b
      ));
    } else {
      avisar('Erro', 'Não foi possível atualizar o pagamento.');
    }
  };

  const apagar = (baba: Baba) => {
    const executa = async () => {
      const ok = await deletarBaba(baba.id);
      if (ok) setBabas(prev => prev.filter(b => b.id !== baba.id));
      else avisar('Erro', 'Não foi possível remover.');
    };
    if (Platform.OS === 'web') {
      if (window.confirm(`Remover "${baba.nome}"? O histórico de pagamentos some junto.`)) executa();
    } else {
      Alert.alert('Remover baba', `Remover "${baba.nome}"? O histórico de pagamentos some junto.`, [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Remover', style: 'destructive', onPress: executa },
      ]);
    }
  };

  const mesAtualLabel = () => {
    const b = babas[0];
    if (b?.mes_atual && b?.ano_atual) {
      return `${String(b.mes_atual).padStart(2, '0')}/${b.ano_atual}`;
    }
    const agora = new Date();
    return `${String(agora.getMonth() + 1).padStart(2, '0')}/${agora.getFullYear()}`;
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
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={styles.headerTitle}>Babas</Text>
          {!!arenaNome && <Text style={styles.headerSubtitle}>{arenaNome}</Text>}
        </View>
        <TouchableOpacity onPress={() => setShowForm(true)} style={styles.addBtn}>
          <Ionicons name="add" size={26} color="#FFF" />
        </TouchableOpacity>
      </View>

      <View style={styles.infoBar}>
        <Ionicons name="information-circle-outline" size={16} color="#FFD700" />
        <Text style={styles.infoBarText}>
          Mês atual: {mesAtualLabel()} — baba sem pagamento fica com o totem bloqueado no horário dele.
        </Text>
      </View>

      <FlatList
        data={babas}
        keyExtractor={(item) => String(item.id)}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#D30000" />
        }
        contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Ionicons name="calendar-outline" size={64} color="#333" />
            <Text style={styles.emptyText}>Nenhum baba cadastrado.</Text>
            <Text style={styles.emptyHint}>
              Sem babas, o totem fica sempre liberado nesta arena.{'\n'}
              Toque no + pra cadastrar o primeiro e ativar a cobrança.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardTop}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardNome}>{item.nome}</Text>
                <Text style={styles.cardHorario}>
                  {DIAS[item.dia_semana]} • {formatHora(item.hora_inicio)} às {formatHora(item.hora_fim)}
                </Text>
              </View>
              <TouchableOpacity onPress={() => abrirEdicao(item)} style={styles.cardDelete}>
                <Ionicons name="pencil" size={17} color="#FFD700" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => apagar(item)} style={styles.cardDelete}>
                <Ionicons name="trash-outline" size={19} color="#FF4444" />
              </TouchableOpacity>
            </View>

            <View style={styles.cardBottom}>
              <View style={[styles.statusPill, item.pago_mes_atual ? styles.pillPago : styles.pillPendente]}>
                <Ionicons
                  name={item.pago_mes_atual ? 'checkmark-circle' : 'alert-circle'}
                  size={14}
                  color={item.pago_mes_atual ? '#00C853' : '#FF4444'}
                />
                <Text style={[styles.pillText, { color: item.pago_mes_atual ? '#00C853' : '#FF4444' }]}>
                  {item.pago_mes_atual ? 'Pago' : 'Pendente'} — {mesAtualLabel()}
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.payBtn, item.pago_mes_atual && styles.payBtnDesfazer]}
                onPress={() => togglePagamento(item)}
              >
                <Text style={styles.payBtnText}>
                  {item.pago_mes_atual ? 'Desfazer' : 'Marcar pago'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

      {/* MODAL DE CADASTRO */}
      <Modal
        visible={showForm}
        transparent
        animationType="slide"
        onRequestClose={fecharForm}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalSheet}>
            <ScrollView>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {babaEditando ? 'Editar baba' : 'Cadastrar baba'}
                </Text>
                <TouchableOpacity onPress={fecharForm}>
                  <Ionicons name="close" size={26} color="#FFF" />
                </TouchableOpacity>
              </View>

              <Text style={styles.label}>Nome</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: Baba de Quarta"
                placeholderTextColor="#666"
                value={nome}
                onChangeText={setNome}
              />

              <Text style={styles.label}>Dia da semana</Text>
              <View style={styles.diasRow}>
                {DIAS_CURTO.map((d, i) => (
                  <TouchableOpacity
                    key={d}
                    style={[styles.diaChip, diaSemana === i && styles.diaChipAtivo]}
                    onPress={() => setDiaSemana(i)}
                  >
                    <Text style={[styles.diaChipText, diaSemana === i && styles.diaChipTextAtivo]}>
                      {d}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Início (HH:MM)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="19:00"
                    placeholderTextColor="#666"
                    value={horaInicio}
                    onChangeText={setHoraInicio}
                    keyboardType="numbers-and-punctuation"
                    maxLength={5}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Fim (HH:MM)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="21:00"
                    placeholderTextColor="#666"
                    value={horaFim}
                    onChangeText={setHoraFim}
                    keyboardType="numbers-and-punctuation"
                    maxLength={5}
                  />
                </View>
              </View>

              <TouchableOpacity
                style={[styles.saveBtn, salvando && { opacity: 0.6 }]}
                onPress={salvar}
                disabled={salvando}
              >
                {salvando ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.saveBtnText}>
                    {babaEditando ? 'Salvar alterações' : 'Cadastrar'}
                  </Text>
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
  headerTitle: { color: '#FFF', fontSize: 19, fontWeight: '900' },
  headerSubtitle: { color: '#888', fontSize: 12, marginTop: 2 },

  infoBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#151208',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  infoBarText: { color: '#B8A24A', fontSize: 12, flex: 1, lineHeight: 17 },

  card: {
    backgroundColor: '#121212',
    padding: 14,
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#1A1A1A',
  },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start' },
  cardNome: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  cardHorario: { color: '#999', fontSize: 13, marginTop: 3 },
  cardDelete: { padding: 6 },

  cardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },
  pillPago: { backgroundColor: 'rgba(0,200,83,0.12)' },
  pillPendente: { backgroundColor: 'rgba(255,68,68,0.12)' },
  pillText: { fontSize: 12, fontWeight: '700' },

  payBtn: {
    backgroundColor: '#00A344',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  payBtnDesfazer: { backgroundColor: '#333' },
  payBtnText: { color: '#FFF', fontSize: 13, fontWeight: '700' },

  emptyBox: { alignItems: 'center', marginTop: 70, paddingHorizontal: 30 },
  emptyText: { color: '#888', fontSize: 16, marginTop: 16 },
  emptyHint: { color: '#666', fontSize: 13, marginTop: 8, textAlign: 'center', lineHeight: 19 },

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

  diasRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  diaChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#222',
  },
  diaChipAtivo: { backgroundColor: '#D30000', borderColor: '#D30000' },
  diaChipText: { color: '#999', fontSize: 13, fontWeight: '600' },
  diaChipTextAtivo: { color: '#FFF' },

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
