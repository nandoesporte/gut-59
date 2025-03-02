
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const searchFood = async (query: string) => {
  try {
    const { data, error } = await supabase
      .from("protocol_foods")
      .select("*")
      .ilike("name", `%${query}%`)
      .limit(10);

    if (error) {
      throw new Error(`Error searching foods: ${error.message}`);
    }

    return data || [];
  } catch (err: any) {
    toast.error(err.message);
    return [];
  }
};
