
import { formatInTimeZone } from "date-fns-tz";

// Timezone configuration
export const BRAZIL_TIMEZONE = "America/Sao_Paulo";

// Get current date in Brazil timezone
export const getCurrentDateBrasilia = () => {
  const now = new Date();
  return formatInTimeZone(now, BRAZIL_TIMEZONE, "yyyy-MM-dd");
};

// Calculate end date (current date + 7 days) in Brazil timezone
export const getEndDateBrasilia = () => {
  const now = new Date();
  const endDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  return formatInTimeZone(endDate, BRAZIL_TIMEZONE, "yyyy-MM-dd");
};
