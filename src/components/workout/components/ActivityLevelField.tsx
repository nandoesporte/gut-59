
import * as React from "react";
import {
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { SelectCard } from "./SelectCard";
import { UseFormReturn } from "react-hook-form";
import { ActivityLevel } from "../types";

interface ActivityLevelFieldProps {
  form: UseFormReturn<any>;
}

export const ActivityLevelField = ({ form }: ActivityLevelFieldProps) => {
  return (
    <FormField
      control={form.control}
      name="activity_level"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Nível de Atividade Física (Determina Dias de Treino)</FormLabel>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <SelectCard
              selected={field.value === "sedentary"}
              onClick={() => field.onChange("sedentary")}
            >
              <div className="text-center">
                <span className="text-lg">Sedentário</span>
                <p className="text-sm text-muted-foreground">Pouco ou nenhum exercício</p>
                <p className="text-sm font-medium text-primary">2 dias por semana</p>
              </div>
            </SelectCard>
            <SelectCard
              selected={field.value === "light"}
              onClick={() => field.onChange("light")}
            >
              <div className="text-center">
                <span className="text-lg">Leve</span>
                <p className="text-sm text-muted-foreground">1-3 dias por semana</p>
                <p className="text-sm font-medium text-primary">3 dias por semana</p>
              </div>
            </SelectCard>
            <SelectCard
              selected={field.value === "moderate"}
              onClick={() => field.onChange("moderate")}
            >
              <div className="text-center">
                <span className="text-lg">Moderado</span>
                <p className="text-sm text-muted-foreground">3-5 dias por semana</p>
                <p className="text-sm font-medium text-primary">5 dias por semana</p>
              </div>
            </SelectCard>
            <SelectCard
              selected={field.value === "intense"}
              onClick={() => field.onChange("intense")}
            >
              <div className="text-center">
                <span className="text-lg">Intenso</span>
                <p className="text-sm text-muted-foreground">6-7 dias por semana</p>
                <p className="text-sm font-medium text-primary">6 dias por semana</p>
              </div>
            </SelectCard>
          </div>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};
