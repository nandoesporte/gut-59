
-- =====================================================
-- TABELAS ADICIONAIS FALTANTES
-- =====================================================

-- 1. Tabela de acesso a planos
CREATE TABLE IF NOT EXISTS public.plan_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  plan_type TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  payment_required BOOLEAN DEFAULT true,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.plan_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own plan access" ON public.plan_access FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage plan access" ON public.plan_access FOR ALL USING (public.has_role('admin'));

-- 2. Adicionar colunas faltantes em profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS daily_water_goal_ml INTEGER DEFAULT 2000;

-- 3. Tabela de logs de emoções
CREATE TABLE IF NOT EXISTS public.emotion_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  emotion TEXT NOT NULL,
  intensity INTEGER DEFAULT 5,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.emotion_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own emotion logs" ON public.emotion_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own emotion logs" ON public.emotion_logs FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 4. Tabela de desafios de respiração
CREATE TABLE IF NOT EXISTS public.breathing_exercise_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  duration_seconds INTEGER NOT NULL,
  exercise_type TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.breathing_exercise_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own breathing logs" ON public.breathing_exercise_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own breathing logs" ON public.breathing_exercise_logs FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 5. Função para atualizar meta de água do usuário
CREATE OR REPLACE FUNCTION public.update_user_water_goal(_goal_ml INTEGER)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles 
  SET daily_water_goal_ml = _goal_ml, updated_at = now()
  WHERE id = auth.uid();
END;
$$;

-- 6. Triggers para updated_at
CREATE TRIGGER update_plan_access_updated_at 
  BEFORE UPDATE ON public.plan_access 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 7. Adicionar coluna is_active em payment_settings se não existir
ALTER TABLE public.payment_settings ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- 8. Tabela de preferências alimentares dos usuários
CREATE TABLE IF NOT EXISTS public.user_food_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  allergies TEXT[],
  dietary_restrictions TEXT[],
  favorite_foods TEXT[],
  disliked_foods TEXT[],
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.user_food_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own food prefs" ON public.user_food_preferences FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own food prefs" ON public.user_food_preferences FOR ALL USING (auth.uid() = user_id);

CREATE TRIGGER update_user_food_preferences_updated_at 
  BEFORE UPDATE ON public.user_food_preferences 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
