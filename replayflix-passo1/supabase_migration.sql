-- ============================================================
--  ReplayFlix v2.2 - Migração: Sistema de Likes por Usuário
--  Rode este SQL no editor SQL do Supabase (uma vez só)
-- ============================================================

-- 1. Tabela que registra cada like individual (1 like por usuário por vídeo)
CREATE TABLE IF NOT EXISTS video_likes (
    id BIGSERIAL PRIMARY KEY,
    video_filename TEXT NOT NULL,
    user_id BIGINT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (video_filename, user_id)
);

-- 2. Índices para acelerar as consultas mais comuns
CREATE INDEX IF NOT EXISTS idx_video_likes_filename ON video_likes(video_filename);
CREATE INDEX IF NOT EXISTS idx_video_likes_user ON video_likes(user_id);

-- 3. Função que recalcula o total de likes na tabela "videos"
--    (mantém a coluna "likes" sincronizada com a contagem real)
CREATE OR REPLACE FUNCTION sync_video_likes_count()
RETURNS TRIGGER AS $$
DECLARE
    target_filename TEXT;
BEGIN
    IF TG_OP = 'DELETE' THEN
        target_filename := OLD.video_filename;
    ELSE
        target_filename := NEW.video_filename;
    END IF;

    UPDATE videos
    SET likes = (SELECT COUNT(*) FROM video_likes WHERE video_filename = target_filename)
    WHERE filename = target_filename;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 4. Triggers (INSERT e DELETE) para manter o contador sempre certo
DROP TRIGGER IF EXISTS trg_video_likes_sync_ins ON video_likes;
CREATE TRIGGER trg_video_likes_sync_ins
AFTER INSERT ON video_likes
FOR EACH ROW EXECUTE FUNCTION sync_video_likes_count();

DROP TRIGGER IF EXISTS trg_video_likes_sync_del ON video_likes;
CREATE TRIGGER trg_video_likes_sync_del
AFTER DELETE ON video_likes
FOR EACH ROW EXECUTE FUNCTION sync_video_likes_count();

-- 5. Adiciona uma coluna opcional 'titulo' nos vídeos (usada pelo rename)
ALTER TABLE videos ADD COLUMN IF NOT EXISTS titulo TEXT;
