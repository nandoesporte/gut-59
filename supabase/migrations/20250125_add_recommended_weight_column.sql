
-- Adicionar coluna recommended_weight na tabela session_exercises
ALTER TABLE session_exercises 
ADD COLUMN recommended_weight TEXT;

-- Criar índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_session_exercises_recommended_weight 
ON session_exercises(recommended_weight);
