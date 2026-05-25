import axios from "axios";
import Constants from "expo-constants";

const getApiUrl = () => {
  if (__DEV__) {
    // Busca o IP local do Metro Bundler para funcionar em dispositivos físicos/emuladores
    const debuggerHost = Constants.expoConfig?.hostUri || "";
    const ip = debuggerHost.split(":")[0];
    return ip ? `http://${ip}:3000/api` : "http://localhost:3000/api";
  }
  return "https://replayflix-backend.onrender.com/api";
};

export const API_URL = getApiUrl();

// ---------------------------------------------------------
//  Tipos
// ---------------------------------------------------------
export type ReplayVideo = {
  id: string;
  filename: string;
  size: string;
  created_at: string;
  arena: string;
  arena_id?: string | null;
  user_id?: string | number | null;
  likes: number;
  thumbnail_url?: string;
  video_url?: string;
  titulo?: string | null;
  liked_by_me?: boolean;
};

export type Stats = {
  totalReplays: number;
  arenas: number;
  totalLikes: number;
  meusLances?: number;
  meusLikes?: number;
};

export type Arena = {
  id: string;
  nome: string;
  cidade: string;
  foto_url?: string | null;
  owner_id?: string | null;
  created_at?: string;
};

// ---------------------------------------------------------
//  1. Buscar todos os vídeos (com flag liked_by_me se userId for passado)
// ---------------------------------------------------------
export const getReplays = async (userId?: string | number | null): Promise<ReplayVideo[]> => {
  try {
    const url = userId ? `${API_URL}/replays?user_id=${userId}` : `${API_URL}/replays`;
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    console.error("Erro ao buscar replays:", error);
    return [];
  }
};

// ---------------------------------------------------------
//  2. Buscar estatísticas para o Dashboard
// ---------------------------------------------------------
export const getStats = async (userId?: string | number | null): Promise<Stats> => {
  try {
    const url = userId ? `${API_URL}/stats?user_id=${userId}` : `${API_URL}/stats`;
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    console.error("Erro ao buscar estatísticas:", error);
    return { totalReplays: 0, arenas: 0, totalLikes: 0 };
  }
};

// ---------------------------------------------------------
//  3. Excluir vídeo
// ---------------------------------------------------------
export const deleteReplay = async (filename: string) => {
  try {
    const response = await axios.delete(`${API_URL}/replays/${filename}`);
    return response.data;
  } catch (error) {
    console.error(`Erro ao excluir replay ${filename}:`, error);
    return { success: false };
  }
};

// ---------------------------------------------------------
//  4. Renomear vídeo (atualiza o campo "titulo")
// ---------------------------------------------------------
export const renameReplay = async (filename: string, novoTitulo: string) => {
  try {
    const response = await axios.put(`${API_URL}/replays/${filename}`, {
      titulo: novoTitulo,
    });
    return response.data;
  } catch (error) {
    console.error(`Erro ao renomear replay ${filename}:`, error);
    return { success: false };
  }
};

// ---------------------------------------------------------
//  5. Curtir / Descurtir
// ---------------------------------------------------------
export const likeReplay = async (filename: string, userId: string | number) => {
  try {
    const response = await axios.post(`${API_URL}/replays/${filename}/like`, { user_id: userId });
    return response.data as { liked: boolean; likes: number };
  } catch (error) {
    console.error("Erro ao curtir:", error);
    return null;
  }
};

export const unlikeReplay = async (filename: string, userId: string | number) => {
  try {
    const response = await axios.post(`${API_URL}/replays/${filename}/unlike`, { user_id: userId });
    return response.data as { liked: boolean; likes: number };
  } catch (error) {
    console.error("Erro ao descurtir:", error);
    return null;
  }
};

// ---------------------------------------------------------
//  6. Vincular lance ao usuário
// ---------------------------------------------------------
export const vincularReplay = async (filename: string, userId: string | number | null) => {
  try {
    const response = await axios.put(`${API_URL}/replays/${filename}/vincular`, { user_id: userId });
    return response.data;
  } catch (error) {
    console.error("Erro ao vincular:", error);
    return null;
  }
};

// ---------------------------------------------------------
//  7. Autenticação (Login / Cadastro)
// ---------------------------------------------------------
export const loginUser = async (identificador: string, password: string) => {
  const response = await axios.post(`${API_URL}/login`, { identificador, password });
  return response.data;
};

export const cadastrarUser = async (nome: string, username: string, email: string, password: string) => {
  const response = await axios.post(`${API_URL}/cadastrar`, { nome, username, email, password });
  return response.data;
};

// ---------------------------------------------------------
//  8. Perfil do Usuário
// ---------------------------------------------------------
export const getUsuario = async (id: string | number) => {
  const response = await axios.get(`${API_URL}/usuarios/${id}`);
  return response.data;
};

export const updateUsuario = async (id: string | number, userData: { nome: string; username: string; email: string }) => {
  const response = await axios.put(`${API_URL}/usuarios/${id}`, userData);
  return response.data;
};

export const deleteUsuario = async (id: string | number) => {
  const response = await axios.delete(`${API_URL}/usuarios/${id}`);
  return response.data;
};

export const updateSenhaUsuario = async (id: string | number, senhaAtual: string, novaSenha: string) => {
  const response = await axios.put(`${API_URL}/usuarios/${id}/senha`, { senhaAtual, novaSenha });
  return response.data;
};

// Lista todas as arenas (opcionalmente filtra por cidade)
export const getArenas = async (cidade?: string): Promise<Arena[]> => {
  try {
    const url = cidade
      ? `${API_URL}/arenas?cidade=${encodeURIComponent(cidade)}`
      : `${API_URL}/arenas`;
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    console.error("Erro ao buscar arenas:", error);
    return [];
  }
};

// Busca uma arena específica
export const getArena = async (id: string): Promise<Arena | null> => {
  try {
    const response = await axios.get(`${API_URL}/arenas/${id}`);
    return response.data;
  } catch (error) {
    console.error("Erro ao buscar arena:", error);
    return null;
  }
};

// Cria uma arena (com ou sem foto)
// Aceita { nome, cidade, owner_id } + (opcional) fotoUri (caminho local da imagem)
export const criarArena = async (
  dados: { nome: string; cidade: string; owner_id: string },
  fotoUri?: string | null
): Promise<{ ok: boolean; arena?: Arena; erro?: string }> => {
  try {
    const formData = new FormData();
    formData.append('nome', dados.nome);
    formData.append('cidade', dados.cidade);
    formData.append('owner_id', dados.owner_id);

    if (fotoUri) {
      // No React Native, FormData aceita { uri, name, type }
      const fileName = fotoUri.split('/').pop() || 'foto.jpg';
      const match = /\.(\w+)$/.exec(fileName);
      const type = match ? `image/${match[1]}` : 'image/jpeg';
      // @ts-ignore — RN aceita esse formato em FormData
      formData.append('foto', { uri: fotoUri, name: fileName, type });
    }

    const response = await axios.post(`${API_URL}/arenas`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return { ok: true, arena: response.data };
  } catch (error: any) {
    const msg = error?.response?.data?.erro || 'Erro ao cadastrar arena';
    console.error('criarArena:', msg);
    return { ok: false, erro: msg };
  }
};

// Atualiza uma arena (só o dono pode)
export const atualizarArena = async (
  id: string,
  dados: { nome?: string; cidade?: string; owner_id: string },
  fotoUri?: string | null
): Promise<{ ok: boolean; arena?: Arena; erro?: string }> => {
  try {
    const formData = new FormData();
    if (dados.nome) formData.append('nome', dados.nome);
    if (dados.cidade) formData.append('cidade', dados.cidade);
    formData.append('owner_id', dados.owner_id);

    if (fotoUri) {
      const fileName = fotoUri.split('/').pop() || 'foto.jpg';
      const match = /\.(\w+)$/.exec(fileName);
      const type = match ? `image/${match[1]}` : 'image/jpeg';
      // @ts-ignore
      formData.append('foto', { uri: fotoUri, name: fileName, type });
    }

    const response = await axios.put(`${API_URL}/arenas/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return { ok: true, arena: response.data };
  } catch (error: any) {
    const msg = error?.response?.data?.erro || 'Erro ao atualizar arena';
    return { ok: false, erro: msg };
  }
};

// Deleta uma arena (só o dono)
export const deletarArena = async (id: string, owner_id: string): Promise<boolean> => {
  try {
    await axios.delete(`${API_URL}/arenas/${id}?owner_id=${owner_id}`);
    return true;
  } catch (error) {
    console.error('deletarArena:', error);
    return false;
  }
};