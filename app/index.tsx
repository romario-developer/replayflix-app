import { Redirect, useLocalSearchParams } from 'expo-router';

export default function AppIndex() {
  // Abre direto no feed — assistir os lances não exige conta. O login só é
  // pedido na hora de curtir, comentar, baixar ou marcar "É meu!".
  // Repassa o ?arena= do link do baba pro feed já abrir filtrado.
  const { arena } = useLocalSearchParams<{ arena?: string }>();
  return <Redirect href={arena ? { pathname: '/(tabs)', params: { arena } } : '/(tabs)'} />;
}
