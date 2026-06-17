// ============================================================
//  Frontend/components/SkeletonLoader.tsx
//
//  Componente que renderiza um esqueleto da home enquanto os
//  dados reais carregam. Dá impressão de que o app já está
//  pronto e só precisa "preencher" os dados.
// ============================================================

import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef } from "react";
import { Animated, Dimensions, ScrollView, StyleSheet, Text, View } from "react-native";

const { width } = Dimensions.get("window");

/**
 * Bloco animado que pulsa (cinza claro -> cinza escuro -> cinza claro)
 * Substitui o "shimmer" comum em apps modernos
 */
const PulseBlock = ({ style }: { style?: any }) => {
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.9, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 800, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return <Animated.View style={[styles.pulseBase, { opacity }, style]} />;
};

export default function HomeSkeletonLoader() {
  return (
    <View style={styles.container}>
      {/* Header — header real visível, sem precisar pulsar */}
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <Text style={styles.headerTitle}>
            REPLAY<Text style={styles.highlight}>FLIX</Text>
          </Text>
          <View style={styles.onlineStatus} />
        </View>
        <View style={styles.avatarPlaceholder}>
          <PulseBlock style={{ width: 38, height: 38, borderRadius: 19 }} />
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Stories Bar Skeleton */}
        <View style={styles.storiesContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.storiesScrollContent}>
            {[1, 2, 3, 4, 5].map(i => (
              <View key={i} style={styles.storyWrapper}>
                <PulseBlock style={styles.storyCircle} />
                <PulseBlock style={styles.storyTextLine} />
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Feed Card Skeletons */}
        {[1, 2, 3].map(i => (
          <View key={i} style={styles.feedCardContainer}>
            <View style={styles.feedCardHeader}>
              <PulseBlock style={styles.feedAvatar} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <PulseBlock style={styles.feedNameLine} />
                <PulseBlock style={styles.feedSubLine} />
              </View>
            </View>

            <PulseBlock style={styles.feedMedia} />

            <View style={styles.feedActions}>
              <PulseBlock style={styles.feedIcon} />
              <PulseBlock style={[styles.feedIcon, { marginLeft: 14 }]} />
              <PulseBlock style={[styles.feedIcon, { marginLeft: 14 }]} />
            </View>

            <View style={styles.feedFooter}>
              <PulseBlock style={styles.feedTextLine} />
              <PulseBlock style={[styles.feedTextLine, { width: '60%', marginTop: 8 }]} />
            </View>
          </View>
        ))}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Bottom tab visual (não funcional, só pra completar a impressão) */}
      <View style={styles.bottomTab}>
        <View style={styles.tabItem}>
          <Ionicons name="home" size={22} color="#D30000" />
          <Text style={[styles.tabLabel, { color: "#D30000" }]}>Início</Text>
        </View>
        <View style={styles.tabItem}>
          <Ionicons name="person-outline" size={22} color="#666" />
          <Text style={styles.tabLabel}>Perfil</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0A0A0A" },

  // PULSE base
  pulseBase: { backgroundColor: "#1A1A1A", borderRadius: 8 },

  // HEADER (igual ao real)
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 12,
    backgroundColor: '#0A0A0A',
  },
  logoContainer: { flexDirection: 'row', alignItems: 'center' },
  headerTitle: { color: '#FFF', fontSize: 22, fontWeight: '900', fontStyle: 'italic', letterSpacing: -0.5 },
  highlight: { color: '#D30000' },
  onlineStatus: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#666', marginLeft: 8 },
  avatarPlaceholder: { padding: 2 },

  // STORIES
  storiesContainer: { paddingTop: 8, paddingBottom: 12 },
  storiesScrollContent: { paddingHorizontal: 12 },
  storyWrapper: { alignItems: 'center', marginRight: 14, width: 68 },
  storyCircle: { width: 60, height: 60, borderRadius: 30 },
  storyTextLine: { width: 50, height: 8, marginTop: 8, borderRadius: 4 },

  // FEED CARD
  feedCardContainer: { marginBottom: 20, backgroundColor: '#000' },
  feedCardHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, paddingVertical: 12 },
  feedAvatar: { width: 38, height: 38, borderRadius: 19 },
  feedNameLine: { width: 140, height: 12, borderRadius: 4 },
  feedSubLine: { width: 90, height: 10, marginTop: 6, borderRadius: 4 },
  feedMedia: { width: width, height: width, marginBottom: 4 },
  feedActions: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10 },
  feedIcon: { width: 26, height: 26, borderRadius: 4 },
  feedFooter: { paddingHorizontal: 14, paddingBottom: 14 },
  feedTextLine: { width: '85%', height: 12, borderRadius: 4 },

  // BOTTOM TAB
  bottomTab: {
    flexDirection: 'row',
    backgroundColor: '#0A0A0A',
    borderTopWidth: 1,
    borderTopColor: '#1A1A1A',
    paddingVertical: 10,
    paddingBottom: 25,
  },
  tabItem: { flex: 1, alignItems: 'center' },
  tabLabel: { color: '#666', fontSize: 11, marginTop: 2, fontWeight: '600' },
});
