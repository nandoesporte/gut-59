
CREATE OR REPLACE FUNCTION public.get_payment_setting(setting_name_param TEXT)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  is_active_val boolean;
BEGIN
  SELECT is_active INTO is_active_val
  FROM payment_settings
  WHERE setting_name = setting_name_param
  LIMIT 1;
  
  RETURN COALESCE(is_active_val, true);
END;
$$;
