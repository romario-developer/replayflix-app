import axios from "axios";

// Lembrete: se for testar no celular físico, troque 'localhost' pelo IP da sua máquina
const API_URL = 'https://replayflix-backend.onrender.com/api';

// 1. Busca todos os vídeos (Já usávamos na Galeria)
export const getReplays = async () => {
  try {
    const response = await axios.get(`${API_URL}/replays`);
    return response.data;
  } catch (error) {
    console.error("Erro ao buscar replays:", error);
    return [];
  }
};

// 2. Busca as estatísticas para o Dashboard do Perfil
export const getStats = async () => {
  try {
    const response = await axios.get(`${API_URL}/stats`);
    return response.data;
  } catch (error) {
    console.error("Erro ao buscar estatísticas:", error);
    return { totalReplays: 0, views: 0, arenas: 0 };
  }
};

// 3. Exclui um vídeo permanentemente
export const deleteReplay = async (id: string) => {
  try {
    const response = await axios.delete(`${API_URL}/replays/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Erro ao excluir o replay ${id}:`, error);
    return { success: false };
  }
};

// 4. Renomeia um vídeo (Edita o título)
export const renameReplay = async (oldId: string, newName: string) => {
  try {
    const response = await axios.put(`${API_URL}/replays/${oldId}`, {
      newName,
    });
    return response.data;
  } catch (error) {
    console.error(`Erro ao renomear o replay ${oldId}:`, error);
    return { success: false };
  }
};
