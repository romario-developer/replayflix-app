import axios from "axios";

const API_URL = 'https://replayflix-backend.onrender.com/api';

// ---------------------------------------------------------
//  Tipos
// ---------------------------------------------------------
export type ReplayVideo = {
  id: string;
  filename: string;
  size: string;
  created_at: string;
  arena: string;
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
