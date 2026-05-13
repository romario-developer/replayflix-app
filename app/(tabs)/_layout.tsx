import { Tabs } from 'expo-router';
import React from 'react';
import { Ionicons } from '@expo/vector-icons';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false, // Esconde o cabeçalho duplo
        tabBarStyle: {
          backgroundColor: '#0A0A0A', // Fundo preto premium
          borderTopWidth: 1,
          borderTopColor: '#222', // Linha sutil separando os vídeos
          height: 60,
          paddingBottom: 10,
          paddingTop: 5,
        },
        tabBarActiveTintColor: '#D30000', // Vermelho ativo
        tabBarInactiveTintColor: '#666666', // Cinza inativo
      }}>
      
      <Tabs.Screen
        name="index"
        options={{
          title: 'Início',
          tabBarIcon: ({ color }) => <Ionicons size={24} name="home" color={color} />,
        }}
      />
      
     <Tabs.Screen
        name="profile" 
        options={{
          title: 'Perfil',
          tabBarLabel: 'Perfil', 
          tabBarIcon: ({ color }) => <Ionicons size={24} name="person" color={color} />,
        }}
      />
    </Tabs>
  );
}