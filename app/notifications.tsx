import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function NotificationsScreen() {
  const router = useRouter();
  
  const [notificacoesAtivas, setNotificacoesAtivas] = useState(true);
  const [alertasJogos, setAlertasJogos] = useState(true);

  const renderToggleItem = (icone: any, titulo: string, descricao: string, valor: boolean, setValor: (v: boolean) => void) => (
    <View style={styles.menuItem}>
      <View style={styles.menuItemLeft}>
        <View style={styles.iconBox}>
          <Ionicons name={icone} size={20} color="#FFF" />
        </View>
        <View>
          <Text style={styles.menuItemTitle}>{titulo}</Text>
          <Text style={styles.menuItemSub}>{descricao}</Text>
        </View>
      </View>
      <Switch 
        value={valor} 
        onValueChange={setValor} 
        trackColor={{ false: '#333', true: 'rgba(211, 0, 0, 0.5)' }}
        thumbColor={valor ? '#D30000' : '#888'}
      />
    </View>
  );

  return (
    <View style={styles.pageBackground}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0A0A" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notificações</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.container}>
        <Text style={styles.sectionTitle}>CONFIGURAÇÕES DE AVISOS</Text>
        <View style={styles.menuCard}>
          {renderToggleItem("notifications", "Notificações Push", "Avisar quando houver vídeos novos", notificacoesAtivas, setNotificacoesAtivas)}
          {renderToggleItem("football", "Alertas da Arena", "Mensagens sobre os jogos e horários", alertasJogos, setAlertasJogos)}
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
  container: { padding: 20, paddingBottom: 40 },
  sectionTitle: { color: '#666', fontSize: 13, fontWeight: 'bold', marginBottom: 10, marginLeft: 10, letterSpacing: 1, marginTop: 10 },
  menuCard: { backgroundColor: '#1A1A1A', borderRadius: 16, overflow: 'hidden', marginBottom: 25, borderWidth: 1, borderColor: '#222' },
  menuItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#222' },
  menuItemLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  iconBox: { width: 38, height: 38, borderRadius: 10, backgroundColor: '#222', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  menuItemTitle: { color: '#FFF', fontSize: 16, fontWeight: '600', marginBottom: 2 },
  menuItemSub: { color: '#888', fontSize: 12, paddingRight: 20 }
});