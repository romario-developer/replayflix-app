import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useState, useMemo } from "react";
import {
    ActivityIndicator,
    Dimensions,
    FlatList,
    Image,
    RefreshControl,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    KeyboardAvoidingView,
    Platform
} from "react-native";
import { useVideoPlayer, VideoView } from "expo-video";
import { getReplays } from "../../services/api";

const { width } = Dimensions.get("window");

type ReplayVideo = {
  id: string;
  filename: string;
  created_at: string;
  arena: string;
  likes: number;
  views?: number;
  thumbnail_url?: string;
};

type Comment = {
  id: string;
  user: string;
  text: string;
  time: string;
};

const formatarData = (dataString: string) => {
    if (!dataString) return '';
    const data = new Date(dataString);
    return data.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).replace('.', '');
};

const NativeVideoPlayer = ({ videoUrl }: { videoUrl: string }) => {
  const player = useVideoPlayer(videoUrl, player => {
    player.loop = false;
    player.play(); 
  });

  return <VideoView player={player} style={styles.videoPlayer} allowsFullscreen allowsPictureInPicture />;
};

export default function ReplaysScreen() {
  const [replays, setReplays] = useState<ReplayVideo[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<ReplayVideo | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState("");
  const [comments, setComments] = useState<Comment[]>([]); // Comentários dinâmicos

  const loadReplays = async () => {
    try {
      const data = await getReplays();
      const apenasVideos = data.filter((f: any) => f.filename.endsWith('.webm'));
      setReplays(apenasVideos);
      if (apenasVideos.length > 0 && !selectedVideo) setSelectedVideo(apenasVideos[0]);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadReplays(); }, []);

  const handleSendComment = () => {
    if (commentText.trim().length === 0) return;
    
    const newComment: Comment = {
      id: Date.now().toString(),
      user: "Você",
      text: commentText,
      time: "Agora"
    };

    setComments([newComment, ...comments]);
    setCommentText("");
  };

  const sections = useMemo(() => {
    const hoje: ReplayVideo[] = [];
    const semana: ReplayVideo[] = [];
    const agora = new Date();

    replays.forEach(v => {
      const diffDays = Math.ceil(Math.abs(agora.getTime() - new Date(v.created_at).getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays <= 1) hoje.push(v);
      else semana.push(v);
    });

    return [
      { title: "🔥 Lances de Hoje", data: hoje },
      { title: "📅 Destaques da Semana", data: semana },
    ].filter(s => s.data.length > 0);
  }, [replays]);

  if (loading) return <View style={styles.loader}><ActivityIndicator size="large" color="#D30000" /></View>;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.headerLogo}>REPLAY<Text style={{color: '#D30000'}}>FLIX</Text></Text>
        <TouchableOpacity onPress={loadReplays}><Ionicons name="refresh" size={24} color="#FFF" /></TouchableOpacity>
      </View>

      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadReplays} tintColor="#D30000" />}>
        
        {/* PLAYER */}
        <View style={styles.videoBox}>
          {selectedVideo ? (
            <NativeVideoPlayer videoUrl={`https://replayflix-backend.onrender.com/uploads/${selectedVideo.filename}`} />
          ) : (
            <View style={styles.bumper}><Text style={styles.bumperText}>REPLAYFLIX</Text></View>
          )}
        </View>

        {selectedVideo && (
          <View style={styles.detailsArea}>
            <Text style={styles.mainTitle}>Golaço - {selectedVideo.arena}</Text>
            <Text style={styles.mainDate}>🎥 {formatarData(selectedVideo.created_at)}</Text>
            
            <View style={styles.statsBar}>
              <View style={styles.statItem}>
                <Ionicons name="play-circle" size={22} color="#D30000" />
                <Text style={styles.statText}>{selectedVideo.views || 128} views</Text>
              </View>
              <TouchableOpacity style={styles.statItem}>
                <Ionicons name="heart" size={22} color="#D30000" />
                <Text style={styles.statText}>{selectedVideo.likes || 0}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.statItem}>
                <Ionicons name="share-social" size={22} color="#FFF" />
                <Text style={styles.statText}>Compartilhar</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* CARROSÉIS FLIX */}
        {sections.map((section, i) => (
          <View key={i} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <FlatList
              horizontal
              data={section.data}
              keyExtractor={item => item.id}
              showsHorizontalScrollIndicator={false}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.card} onPress={() => setSelectedVideo(item)}>
                  <Image source={{ uri: item.thumbnail_url || 'https://via.placeholder.com/160x90/111/D30000?text=Replay' }} style={styles.cardThumb} />
                  <Text style={styles.cardTitle} numberOfLines={1}>{item.arena}</Text>
                  {selectedVideo?.id === item.id && <View style={styles.activeLine} />}
                </TouchableOpacity>
              )}
              contentContainerStyle={{ paddingLeft: 20 }}
            />
          </View>
        ))}

        {/* COMENTÁRIOS */}
        <View style={styles.commentContainer}>
          <Text style={styles.sectionTitle}>Comentários ({comments.length})</Text>
          
          <View style={styles.inputBox}>
            <TextInput 
              style={styles.input} 
              placeholder="Ecreva o que achou desse lance..." 
              placeholderTextColor="#666"
              value={commentText}
              onChangeText={setCommentText}
            />
            <TouchableOpacity 
              style={[styles.sendBtn, { opacity: commentText.length > 0 ? 1 : 0.5 }]} 
              onPress={handleSendComment}
            >
              <Ionicons name="send" size={18} color="#FFF" />
            </TouchableOpacity>
          </View>

          {comments.length === 0 ? (
            <Text style={styles.emptyComments}>Ninguém comentou ainda. Seja o primeiro!</Text>
          ) : (
            comments.map(c => (
              <View key={c.id} style={styles.commentItem}>
                <View style={styles.avatar}><Text style={styles.avatarText}>{c.user[0]}</Text></View>
                <View style={{flex: 1}}>
                  <Text style={styles.commentUser}>{c.user} • <Text style={styles.commentTime}>{c.time}</Text></Text>
                  <Text style={styles.commentText}>{c.text}</Text>
                </View>
              </View>
            ))
          )}
        </View>
        <View style={{height: 50}} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  loader: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  header: { paddingTop: 60, paddingHorizontal: 20, paddingBottom: 15, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerLogo: { color: "#FFF", fontSize: 24, fontWeight: "900", fontStyle: 'italic' },
  videoBox: { width: width, aspectRatio: 16 / 9, backgroundColor: "#111" },
  videoPlayer: { flex: 1 },
  bumper: { flex: 1, backgroundColor: '#D30000', justifyContent: 'center', alignItems: 'center' },
  bumperText: { color: '#FFF', fontWeight: '900', fontSize: 30, letterSpacing: 5 },
  detailsArea: { padding: 20 },
  mainTitle: { color: '#FFF', fontSize: 22, fontWeight: 'bold' },
  mainDate: { color: '#888', fontSize: 13, marginTop: 4 },
  statsBar: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20, backgroundColor: '#111', padding: 15, borderRadius: 12 },
  statItem: { flexDirection: 'row', alignItems: 'center' },
  statText: { color: '#FFF', marginLeft: 8, fontSize: 12, fontWeight: '600' },
  section: { marginTop: 25 },
  sectionTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold', marginLeft: 20, marginBottom: 15 },
  card: { width: 150, marginRight: 15 },
  cardThumb: { width: 150, height: 85, borderRadius: 8 },
  cardTitle: { color: '#AAA', fontSize: 12, marginTop: 8, fontWeight: '500' },
  activeLine: { height: 3, backgroundColor: '#D30000', width: '100%', marginTop: 5, borderRadius: 2 },
  commentContainer: { padding: 20, marginTop: 10 },
  inputBox: { flexDirection: 'row', alignItems: 'center', marginBottom: 25 },
  input: { flex: 1, backgroundColor: '#111', borderRadius: 25, paddingHorizontal: 20, height: 45, color: '#FFF', borderWidth: 1, borderColor: '#222' },
  sendBtn: { backgroundColor: '#D30000', width: 45, height: 45, borderRadius: 22.5, marginLeft: 10, justifyContent: 'center', alignItems: 'center' },
  emptyComments: { color: '#444', textAlign: 'center', marginTop: 20, fontStyle: 'italic' },
  commentItem: { flexDirection: 'row', marginBottom: 20 },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#D30000', marginRight: 12, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#FFF', fontWeight: 'bold' },
  commentUser: { color: '#FFF', fontWeight: 'bold', fontSize: 13 },
  commentTime: { color: '#666', fontWeight: 'normal', fontSize: 11 },
  commentText: { color: '#BBB', fontSize: 14, marginTop: 3 }
});