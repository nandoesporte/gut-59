
-- =====================================================
-- TABELAS E CONFIGURAÇÕES ADICIONAIS
-- =====================================================

-- 1. Adicionar 'personal' ao enum de roles
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'personal';

-- 2. Tabela de recompensas de passos
CREATE TABLE IF NOT EXISTS public.step_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  reward_date DATE NOT NULL,
  steps_counted INTEGER NOT NULL DEFAULT 0,
  reward_amount NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, reward_date)
);

ALTER TABLE public.step_rewards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own step rewards" ON public.step_rewards FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own step rewards" ON public.step_rewards FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 3. Tabela de configurações de saúde mental
CREATE TABLE IF NOT EXISTS public.mental_health_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  breathing_exercise_daily_limit INTEGER DEFAULT 5,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.mental_health_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can read mental health settings" ON public.mental_health_settings FOR SELECT USING (true);
CREATE POLICY "Admins can manage mental health settings" ON public.mental_health_settings FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Inserir configuração padrão
INSERT INTO public.mental_health_settings (breathing_exercise_daily_limit) VALUES (5);

-- 4. Função has_role que aceita apenas role (para compatibilidade com código existente)
CREATE OR REPLACE FUNCTION public.has_role(_role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = _role
  )
$$;

-- 5. Trigger para atualizar mental_health_settings updated_at
CREATE TRIGGER update_mental_health_settings_updated_at 
  BEFORE UPDATE ON public.mental_health_settings 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
