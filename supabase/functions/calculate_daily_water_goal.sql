
CREATE OR REPLACE FUNCTION public.calculate_daily_water_goal(
  user_weight numeric,
  user_height numeric
) RETURNS integer AS $$
BEGIN
  -- Convert the calculation to milliliters (multiply by 1000 to convert to ml)
  RETURN FLOOR((user_weight * 0.035) * 1000);
END;
$$ LANGUAGE plpgsql;
