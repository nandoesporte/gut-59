
-- Tabela para configurações de modelos de IA
CREATE TABLE IF NOT EXISTS public.ai_model_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  active_model TEXT DEFAULT 'google/gemini-3-flash-preview',
  system_prompt TEXT,
  use_custom_prompt BOOLEAN DEFAULT false,
  groq_api_key TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.ai_model_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can read ai model settings" ON public.ai_model_settings FOR SELECT USING (true);
CREATE POLICY "Admins can manage ai model settings" ON public.ai_model_settings FOR ALL USING (public.has_role('admin'));

-- Inserir configuração padrão
INSERT INTO public.ai_model_settings (active_model) VALUES ('google/gemini-3-flash-preview');

-- Trigger para updated_at
CREATE TRIGGER update_ai_model_settings_updated_at 
  BEFORE UPDATE ON public.ai_model_settings 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
