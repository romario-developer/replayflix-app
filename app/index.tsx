import { Redirect } from 'expo-router';

export default function AppIndex() {
  // Quando o usuário abrir o app, joga ele IMEDIATAMENTE para a tela de Login
  return <Redirect href="/login" />;
}