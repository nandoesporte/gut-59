
-- =====================================================
-- TABELAS E FUNÇÕES ADICIONAIS RESTANTES
-- =====================================================

-- 1. Tabela de preferências de nutrição
CREATE TABLE IF NOT EXISTS public.nutrition_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  goal TEXT,
  activity_level TEXT,
  dietary_restrictions TEXT[],
  allergies TEXT[],
  selected_foods UUID[],
  target_calories INTEGER,
  target_protein INTEGER,
  target_carbs INTEGER,
  target_fats INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.nutrition_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own nutrition prefs" ON public.nutrition_preferences FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own nutrition prefs" ON public.nutrition_preferences FOR ALL USING (auth.uid() = user_id);

-- Enum para metas nutricionais
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'nutritional_goal') THEN
    CREATE TYPE public.nutritional_goal AS ENUM ('weight_loss', 'weight_gain', 'maintenance', 'muscle_gain', 'health_improvement');
  END IF;
END$$;

-- Enum para nível de atividade
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'activity_level') THEN
    CREATE TYPE public.activity_level AS ENUM ('sedentary', 'light', 'moderate', 'active', 'very_active');
  END IF;
END$$;

-- 2. Tabela de pagamentos
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  plan_type TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  status TEXT DEFAULT 'pending',
  payment_method TEXT,
  external_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own payments" ON public.payments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own payments" ON public.payments FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 3. Tabela de notificações de pagamento
CREATE TABLE IF NOT EXISTS public.payment_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  payment_id UUID REFERENCES public.payments(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.payment_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications" ON public.payment_notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON public.payment_notifications FOR UPDATE USING (auth.uid() = user_id);

-- 4. Tabela de feedback de exercícios
CREATE TABLE IF NOT EXISTS public.exercise_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  exercise_id UUID REFERENCES public.exercises(id) ON DELETE CASCADE,
  workout_plan_id UUID REFERENCES public.workout_plans(id) ON DELETE CASCADE,
  rating INTEGER,
  difficulty_feedback TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.exercise_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own feedback" ON public.exercise_feedback FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own feedback" ON public.exercise_feedback FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 5. Função para atualizar alimentos selecionados
CREATE OR REPLACE FUNCTION public.update_nutrition_selected_foods(_food_ids UUID[])
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.nutrition_preferences (user_id, selected_foods)
  VALUES (auth.uid(), _food_ids)
  ON CONFLICT (user_id) 
  DO UPDATE SET selected_foods = _food_ids, updated_at = now();
END;
$$;

-- 6. Função para processar transferência
CREATE OR REPLACE FUNCTION public.process_transfer(_qr_code_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_qr_code RECORD;
  v_from_wallet RECORD;
  v_to_wallet RECORD;
  v_result JSONB;
BEGIN
  -- Buscar QR code
  SELECT * INTO v_qr_code FROM public.transfer_qr_codes WHERE id = _qr_code_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'QR Code não encontrado');
  END IF;
  
  IF v_qr_code.used_at IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'QR Code já utilizado');
  END IF;
  
  IF v_qr_code.expires_at < now() THEN
    RETURN jsonb_build_object('success', false, 'error', 'QR Code expirado');
  END IF;
  
  IF v_qr_code.creator_id = auth.uid() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Não pode transferir para si mesmo');
  END IF;
  
  -- Buscar carteiras
  SELECT * INTO v_from_wallet FROM public.wallets WHERE user_id = v_qr_code.creator_id;
  SELECT * INTO v_to_wallet FROM public.wallets WHERE user_id = auth.uid();
  
  IF v_from_wallet.balance < v_qr_code.amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'Saldo insuficiente');
  END IF;
  
  -- Realizar transferência
  UPDATE public.wallets SET balance = balance - v_qr_code.amount WHERE id = v_from_wallet.id;
  UPDATE public.wallets SET balance = balance + v_qr_code.amount WHERE id = v_to_wallet.id;
  
  -- Marcar QR code como usado
  UPDATE public.transfer_qr_codes SET used_at = now(), used_by = auth.uid() WHERE id = _qr_code_id;
  
  -- Registrar transações
  INSERT INTO public.fit_transactions (wallet_id, amount, transaction_type, description, qr_code_id)
  VALUES (v_from_wallet.id, -v_qr_code.amount, 'transfer', 'Transferência enviada', _qr_code_id);
  
  INSERT INTO public.fit_transactions (wallet_id, amount, transaction_type, description, qr_code_id)
  VALUES (v_to_wallet.id, v_qr_code.amount, 'transfer', 'Transferência recebida', _qr_code_id);
  
  RETURN jsonb_build_object('success', true, 'amount', v_qr_code.amount);
END;
$$;

-- 7. Triggers para updated_at
CREATE TRIGGER update_nutrition_preferences_updated_at 
  BEFORE UPDATE ON public.nutrition_preferences 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_payments_updated_at 
  BEFORE UPDATE ON public.payments 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
