
-- =====================================================
-- CORREÇÃO DE AVISOS DE SEGURANÇA
-- =====================================================

-- 1. Corrigir search_path das funções
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.update_wallet_balance()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.wallets 
  SET balance = balance + NEW.amount, updated_at = now()
  WHERE id = NEW.wallet_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- 2. Corrigir política permissiva de QR codes
DROP POLICY IF EXISTS "Users can update qr codes" ON public.transfer_qr_codes;

CREATE POLICY "Users can update qr codes" ON public.transfer_qr_codes FOR UPDATE 
  USING (auth.uid() = creator_id OR (used_by IS NULL AND expires_at > now()));

-- 3. Adicionar política para admins gerenciarem conteúdo
-- Política para admins modificarem exercícios
CREATE POLICY "Admins can manage exercises" ON public.exercises FOR ALL 
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage physio exercises" ON public.physio_exercises FOR ALL 
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage training modules" ON public.training_modules FOR ALL 
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage training videos" ON public.training_videos FOR ALL 
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage mental modules" ON public.mental_modules FOR ALL 
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage mental videos" ON public.mental_videos FOR ALL 
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage mental resources" ON public.mental_resources FOR ALL 
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage daily tips" ON public.daily_tips FOR ALL 
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage payment settings" ON public.payment_settings FOR ALL 
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage professionals" ON public.professionals FOR ALL 
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage ai prompts" ON public.ai_agent_prompts FOR ALL 
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage protocol phases" ON public.protocol_phases FOR ALL 
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage protocol days" ON public.protocol_days FOR ALL 
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage food groups" ON public.food_groups FOR ALL 
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage meal types" ON public.meal_types FOR ALL 
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage protocol foods" ON public.protocol_foods FOR ALL 
  USING (public.has_role(auth.uid(), 'admin'));

-- Admins podem ver todos os perfis
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT 
  USING (public.has_role(auth.uid(), 'admin'));

-- Admins podem ver todas as mensagens
CREATE POLICY "Admins can view all messages" ON public.messages FOR SELECT 
  USING (public.has_role(auth.uid(), 'admin'));

-- Admins podem ver todos os sintomas
CREATE POLICY "Admins can view all symptoms" ON public.symptoms FOR SELECT 
  USING (public.has_role(auth.uid(), 'admin'));

-- Admins podem ver todas as refeições
CREATE POLICY "Admins can view all meals" ON public.meals FOR SELECT 
  USING (public.has_role(auth.uid(), 'admin'));

-- Admins podem ver toda a ingestão de água
CREATE POLICY "Admins can view all water intake" ON public.water_intake FOR SELECT 
  USING (public.has_role(auth.uid(), 'admin'));
