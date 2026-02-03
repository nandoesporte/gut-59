
-- =====================================================
-- MIGRAÇÃO COMPLETA DO BANCO DE DADOS - GUT PROTOCOL
-- =====================================================

-- =====================================================
-- 1. ENUMS E TIPOS
-- =====================================================

-- Enum para roles de usuário
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- Enum para tipos de transação
CREATE TYPE public.transaction_type AS ENUM (
  'daily_tip', 'water_intake', 'steps', 'meal_plan', 
  'workout_plan', 'physio_plan', 'transfer', 'steps_reward', 
  'water_reward', 'meal_plan_generation', 'workout_plan_generation', 
  'rehab_plan_generation', 'breathing_exercise'
);

-- Enum para tipos de plano de pagamento
CREATE TYPE public.plan_type AS ENUM ('workout', 'nutrition', 'rehabilitation');

-- Enum para tipo de agente IA
CREATE TYPE public.agent_type AS ENUM ('meal_plan', 'workout', 'physiotherapy', 'mental_health');

-- Enum para tipo de avaliação de saúde
CREATE TYPE public.assessment_type AS ENUM ('burnout', 'anxiety', 'stress', 'depression');

-- Enum para tipo de recurso mental
CREATE TYPE public.resource_type AS ENUM ('emergency_contact', 'educational_content', 'useful_link');

-- Enum para dificuldade de exercício
CREATE TYPE public.exercise_difficulty AS ENUM ('beginner', 'intermediate', 'advanced');

-- Enum para tipo de exercício
CREATE TYPE public.exercise_type_enum AS ENUM ('strength', 'cardio', 'mobility');

-- Enum para status
CREATE TYPE public.status_type AS ENUM ('active', 'inactive');

-- =====================================================
-- 2. TABELA DE PROFILES (Usuários)
-- =====================================================

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  age INTEGER,
  health_conditions TEXT,
  photo_url TEXT,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Trigger para criar perfil automaticamente
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- 3. TABELA DE ROLES
-- =====================================================

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Função para verificar role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);

-- =====================================================
-- 4. MENSAGENS
-- =====================================================

CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  receiver_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  type TEXT DEFAULT 'nutricionista',
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own messages" ON public.messages FOR SELECT 
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
CREATE POLICY "Users can send messages" ON public.messages FOR INSERT 
  WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "Users can update own messages" ON public.messages FOR UPDATE 
  USING (auth.uid() = receiver_id);

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- =====================================================
-- 5. SINTOMAS
-- =====================================================

CREATE TABLE public.symptoms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  discomfort_level INTEGER,
  has_nausea BOOLEAN DEFAULT false,
  has_abdominal_pain BOOLEAN DEFAULT false,
  has_gas BOOLEAN DEFAULT false,
  has_bloating BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.symptoms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own symptoms" ON public.symptoms FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own symptoms" ON public.symptoms FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own symptoms" ON public.symptoms FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- 6. PROTOCOLO - FASES E DIAS
-- =====================================================

CREATE TABLE public.protocol_phases (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  day_start INTEGER NOT NULL,
  day_end INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.protocol_phases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Everyone can read phases" ON public.protocol_phases FOR SELECT USING (true);

CREATE TABLE public.protocol_days (
  id SERIAL PRIMARY KEY,
  phase_id INTEGER REFERENCES public.protocol_phases(id) ON DELETE CASCADE,
  day INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.protocol_days ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Everyone can read days" ON public.protocol_days FOR SELECT USING (true);

-- =====================================================
-- 7. GRUPOS DE ALIMENTOS E TIPOS DE REFEIÇÃO
-- =====================================================

CREATE TABLE public.food_groups (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  display_name TEXT NOT NULL
);

ALTER TABLE public.food_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Everyone can read food groups" ON public.food_groups FOR SELECT USING (true);

CREATE TABLE public.meal_types (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  phase INTEGER
);

ALTER TABLE public.meal_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Everyone can read meal types" ON public.meal_types FOR SELECT USING (true);

-- =====================================================
-- 8. ALIMENTOS DO PROTOCOLO
-- =====================================================

CREATE TABLE public.protocol_foods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phase INTEGER,
  food_group TEXT,
  phase_id INTEGER REFERENCES public.protocol_phases(id),
  food_group_id INTEGER REFERENCES public.food_groups(id),
  calories NUMERIC DEFAULT 0,
  protein NUMERIC,
  carbs NUMERIC,
  fats NUMERIC,
  fiber NUMERIC,
  portion_size NUMERIC,
  portion_unit TEXT,
  pre_workout_compatible BOOLEAN DEFAULT false,
  post_workout_compatible BOOLEAN DEFAULT false,
  protein_per_100g NUMERIC,
  carbs_per_100g NUMERIC,
  fats_per_100g NUMERIC,
  fiber_per_100g NUMERIC,
  common_allergens TEXT[],
  dietary_flags TEXT[],
  meal_type TEXT[],
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.protocol_foods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Everyone can read protocol foods" ON public.protocol_foods FOR SELECT USING (true);

-- =====================================================
-- 9. REFEIÇÕES (MEALS)
-- =====================================================

CREATE TABLE public.meals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  meal_date DATE,
  protocol_phase INTEGER,
  meal_type TEXT,
  food_group_id INTEGER REFERENCES public.food_groups(id),
  custom_food TEXT,
  description TEXT,
  protocol_food_id UUID REFERENCES public.protocol_foods(id),
  photo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.meals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own meals" ON public.meals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own meals" ON public.meals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own meals" ON public.meals FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own meals" ON public.meals FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- 10. CONSUMO DE ÁGUA
-- =====================================================

CREATE TABLE public.water_intake (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount_ml INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.water_intake ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own water intake" ON public.water_intake FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own water intake" ON public.water_intake FOR INSERT WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- 11. PROGRESSO EDUCACIONAL
-- =====================================================

CREATE TABLE public.education_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  phase INTEGER,
  day INTEGER,
  completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.education_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own progress" ON public.education_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own progress" ON public.education_progress FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own progress" ON public.education_progress FOR UPDATE USING (auth.uid() = user_id);

-- =====================================================
-- 12. CARTEIRA (WALLET) E TRANSAÇÕES
-- =====================================================

CREATE TABLE public.wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  balance NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own wallet" ON public.wallets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own wallet" ON public.wallets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own wallet" ON public.wallets FOR UPDATE USING (auth.uid() = user_id);

CREATE TABLE public.fit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID REFERENCES public.wallets(id) ON DELETE CASCADE NOT NULL,
  amount NUMERIC NOT NULL,
  transaction_type TEXT NOT NULL,
  description TEXT,
  recipient_id UUID,
  qr_code_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.fit_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transactions" ON public.fit_transactions FOR SELECT 
  USING (wallet_id IN (SELECT id FROM public.wallets WHERE user_id = auth.uid()));
CREATE POLICY "Users can insert own transactions" ON public.fit_transactions FOR INSERT 
  WITH CHECK (wallet_id IN (SELECT id FROM public.wallets WHERE user_id = auth.uid()));

-- Trigger para atualizar saldo da carteira
CREATE OR REPLACE FUNCTION public.update_wallet_balance()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.wallets 
  SET balance = balance + NEW.amount, updated_at = now()
  WHERE id = NEW.wallet_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_transaction_created
  AFTER INSERT ON public.fit_transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_wallet_balance();

-- QR Codes para transferência
CREATE TABLE public.transfer_qr_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount NUMERIC NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  used_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.transfer_qr_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own qr codes" ON public.transfer_qr_codes FOR SELECT 
  USING (auth.uid() = creator_id OR auth.uid() = used_by);
CREATE POLICY "Users can create qr codes" ON public.transfer_qr_codes FOR INSERT 
  WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "Users can update qr codes" ON public.transfer_qr_codes FOR UPDATE 
  USING (true);

-- =====================================================
-- 13. PLANOS ALIMENTARES
-- =====================================================

CREATE TABLE public.meal_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  plan_data JSONB NOT NULL,
  calories INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.meal_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own meal plans" ON public.meal_plans FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own meal plans" ON public.meal_plans FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own meal plans" ON public.meal_plans FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- 14. PLANOS DE TREINO
-- =====================================================

CREATE TABLE public.user_workout_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  age INTEGER,
  weight NUMERIC,
  height NUMERIC,
  gender TEXT,
  goal TEXT,
  activity_level TEXT,
  preferred_exercise_types TEXT[],
  available_equipment TEXT[],
  health_conditions TEXT[],
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.user_workout_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own preferences" ON public.user_workout_preferences FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own preferences" ON public.user_workout_preferences FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own preferences" ON public.user_workout_preferences FOR UPDATE USING (auth.uid() = user_id);

CREATE TABLE public.workout_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  plan_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.workout_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own workout plans" ON public.workout_plans FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own workout plans" ON public.workout_plans FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own workout plans" ON public.workout_plans FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- 15. PLANOS DE REABILITAÇÃO (FISIOTERAPIA)
-- =====================================================

CREATE TABLE public.rehab_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  goal TEXT,
  condition TEXT,
  joint_area TEXT,
  start_date DATE,
  end_date DATE,
  plan_data JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.rehab_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own rehab plans" ON public.rehab_plans FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own rehab plans" ON public.rehab_plans FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own rehab plans" ON public.rehab_plans FOR DELETE USING (auth.uid() = user_id);

-- Contagem de geração de planos
CREATE TABLE public.plan_generation_counts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  rehabilitation_count INTEGER DEFAULT 0,
  workout_count INTEGER DEFAULT 0,
  meal_plan_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.plan_generation_counts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own counts" ON public.plan_generation_counts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own counts" ON public.plan_generation_counts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own counts" ON public.plan_generation_counts FOR UPDATE USING (auth.uid() = user_id);

-- =====================================================
-- 16. EXERCÍCIOS
-- =====================================================

CREATE TABLE public.exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  gif_url TEXT,
  category TEXT,
  difficulty exercise_difficulty DEFAULT 'beginner',
  exercise_type exercise_type_enum DEFAULT 'strength',
  muscle_group TEXT,
  equipment_needed TEXT[],
  goals TEXT[],
  primary_muscles_worked TEXT[],
  secondary_muscles_worked TEXT[],
  target_heart_rate_zone TEXT[],
  common_mistakes TEXT[],
  safety_considerations TEXT[],
  progression_variations TEXT[],
  regression_variations TEXT[],
  suitable_for_conditions TEXT[],
  contraindicated_conditions TEXT[],
  training_phases TEXT[],
  is_compound_movement BOOLEAN DEFAULT false,
  equipment_complexity TEXT DEFAULT 'basic',
  mobility_requirements TEXT DEFAULT 'moderate',
  stability_requirement TEXT DEFAULT 'moderate',
  balance_requirement TEXT DEFAULT 'moderate',
  coordination_requirement TEXT DEFAULT 'moderate',
  flexibility_requirement TEXT DEFAULT 'moderate',
  power_requirement TEXT DEFAULT 'moderate',
  preparation_time_minutes INTEGER DEFAULT 15,
  typical_duration_seconds INTEGER DEFAULT 60,
  tempo_recommendation TEXT DEFAULT '2-0-2-0',
  breathing_pattern TEXT,
  calories_burned_per_hour INTEGER,
  recommended_warm_up TEXT,
  movement_pattern TEXT DEFAULT 'unspecified',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Everyone can read exercises" ON public.exercises FOR SELECT USING (true);

-- Exercícios de fisioterapia
CREATE TABLE public.physio_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  gif_url TEXT,
  category TEXT,
  difficulty exercise_difficulty DEFAULT 'beginner',
  exercise_type exercise_type_enum DEFAULT 'mobility',
  muscle_group TEXT,
  joint_area TEXT,
  condition_target TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.physio_exercises ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Everyone can read physio exercises" ON public.physio_exercises FOR SELECT USING (true);

-- =====================================================
-- 17. MÓDULOS DE TREINAMENTO (VÍDEOS)
-- =====================================================

CREATE TABLE public.training_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  display_order INTEGER DEFAULT 0,
  status status_type DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.training_modules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Everyone can read training modules" ON public.training_modules FOR SELECT USING (true);

CREATE TABLE public.training_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  module_id UUID REFERENCES public.training_modules(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  status status_type DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.training_videos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Everyone can read training videos" ON public.training_videos FOR SELECT USING (true);

-- =====================================================
-- 18. SAÚDE MENTAL
-- =====================================================

CREATE TABLE public.mental_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  display_order INTEGER DEFAULT 0,
  status status_type DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.mental_modules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Everyone can read mental modules" ON public.mental_modules FOR SELECT USING (true);

CREATE TABLE public.mental_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  url TEXT NOT NULL,
  module_id UUID REFERENCES public.mental_modules(id) ON DELETE CASCADE,
  status status_type DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.mental_videos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Everyone can read mental videos" ON public.mental_videos FOR SELECT USING (true);

CREATE TABLE public.mental_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  content TEXT,
  resource_type TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  status status_type DEFAULT 'active',
  phone_number TEXT,
  url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.mental_resources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Everyone can read mental resources" ON public.mental_resources FOR SELECT USING (true);

-- Avaliações de saúde
CREATE TABLE public.health_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  assessment_type TEXT NOT NULL,
  responses JSONB NOT NULL,
  score INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.health_assessments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own assessments" ON public.health_assessments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own assessments" ON public.health_assessments FOR INSERT WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- 19. DICAS DIÁRIAS
-- =====================================================

CREATE TABLE public.daily_tips (
  id SERIAL PRIMARY KEY,
  content TEXT NOT NULL,
  theme TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.daily_tips ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Everyone can read daily tips" ON public.daily_tips FOR SELECT USING (true);

-- =====================================================
-- 20. CONFIGURAÇÕES DE PAGAMENTO
-- =====================================================

CREATE TABLE public.payment_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_type TEXT NOT NULL UNIQUE,
  price NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.payment_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Everyone can read payment settings" ON public.payment_settings FOR SELECT USING (true);

-- Inserir configurações padrão
INSERT INTO public.payment_settings (plan_type, price) VALUES 
  ('workout', 29.90),
  ('nutrition', 29.90),
  ('rehabilitation', 29.90);

-- =====================================================
-- 21. PROFISSIONAIS
-- =====================================================

CREATE TABLE public.professionals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  photo_url TEXT,
  display_order INTEGER DEFAULT 0,
  status status_type DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.professionals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Everyone can read professionals" ON public.professionals FOR SELECT USING (true);

-- =====================================================
-- 22. PROMPTS DE AGENTES IA
-- =====================================================

CREATE TABLE public.ai_agent_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_type TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  prompt TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.ai_agent_prompts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Everyone can read ai prompts" ON public.ai_agent_prompts FOR SELECT USING (true);

-- =====================================================
-- 23. FUNÇÃO UPDATED_AT
-- =====================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger em tabelas com updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_wallets_updated_at BEFORE UPDATE ON public.wallets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_meals_updated_at BEFORE UPDATE ON public.meals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_education_progress_updated_at BEFORE UPDATE ON public.education_progress FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_user_workout_preferences_updated_at BEFORE UPDATE ON public.user_workout_preferences FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_plan_generation_counts_updated_at BEFORE UPDATE ON public.plan_generation_counts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_training_modules_updated_at BEFORE UPDATE ON public.training_modules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_training_videos_updated_at BEFORE UPDATE ON public.training_videos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_mental_modules_updated_at BEFORE UPDATE ON public.mental_modules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_mental_videos_updated_at BEFORE UPDATE ON public.mental_videos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_mental_resources_updated_at BEFORE UPDATE ON public.mental_resources FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_payment_settings_updated_at BEFORE UPDATE ON public.payment_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_professionals_updated_at BEFORE UPDATE ON public.professionals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_ai_agent_prompts_updated_at BEFORE UPDATE ON public.ai_agent_prompts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- 24. STORAGE BUCKETS
-- =====================================================

INSERT INTO storage.buckets (id, name, public) VALUES ('meal-photos', 'meal-photos', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('exercise-gifs', 'exercise-gifs', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('profile-photos', 'profile-photos', true);

-- Políticas de storage
CREATE POLICY "Public read access" ON storage.objects FOR SELECT USING (bucket_id IN ('meal-photos', 'exercise-gifs', 'profile-photos'));
CREATE POLICY "Users can upload meal photos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'meal-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can upload profile photos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'profile-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Admin can upload exercise gifs" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'exercise-gifs');
