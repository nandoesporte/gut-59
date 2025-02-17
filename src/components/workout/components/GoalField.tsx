
import * as React from "react";
import {
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { SelectCard } from "./SelectCard";
import { UseFormReturn } from "react-hook-form";

interface GoalFieldProps {
  form: UseFormReturn<any>;
}

export const GoalField = ({ form }: GoalFieldProps) => {
  return (
    <FormField
      control={form.control}
      name="goal"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Objetivo</FormLabel>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <SelectCard
              selected={field.value === "lose_weight"}
              onClick={() => field.onChange("lose_weight")}
            >
              <div className="text-center">
                <span className="text-lg">Perder Peso</span>
                <p className="text-sm text-gray-500">Foco em queima de gordura</p>
              </div>
            </SelectCard>
            <SelectCard
              selected={field.value === "maintain"}
              onClick={() => field.onChange("maintain")}
            >
              <div className="text-center">
                <span className="text-lg">Manter Peso</span>
                <p className="text-sm text-gray-500">Melhorar condicionamento</p>
              </div>
            </SelectCard>
            <SelectCard
              selected={field.value === "gain_mass"}
              onClick={() => field.onChange("gain_mass")}
            >
              <div className="text-center">
                <span className="text-lg">Ganhar Massa</span>
                <p className="text-sm text-gray-500">Foco em hipertrofia</p>
              </div>
            </SelectCard>
          </div>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};
