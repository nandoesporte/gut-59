
import * as React from "react";
import {
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { SelectCard } from "./SelectCard";
import { UseFormReturn } from "react-hook-form";
import { Building2, Home, MapPin, Ban } from "lucide-react";

interface TrainingLocationFieldProps {
  form: UseFormReturn<any>;
}

export const TrainingLocationField = ({ form }: TrainingLocationFieldProps) => {
  return (
    <FormField
      control={form.control}
      name="trainingLocation"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Local de Treino</FormLabel>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <SelectCard
              selected={field.value === "gym"}
              onClick={() => field.onChange("gym")}
            >
              <div className="flex flex-col items-center gap-2">
                <Building2 className="w-8 h-8 text-primary-500" />
                <span className="text-lg">Academia</span>
                <p className="text-sm text-gray-500">Acesso a equipamentos profissionais</p>
              </div>
            </SelectCard>

            <SelectCard
              selected={field.value === "home"}
              onClick={() => field.onChange("home")}
            >
              <div className="flex flex-col items-center gap-2">
                <Home className="w-8 h-8 text-primary-500" />
                <span className="text-lg">Casa</span>
                <p className="text-sm text-gray-500">Treino com equipamentos básicos</p>
              </div>
            </SelectCard>

            <SelectCard
              selected={field.value === "outdoors"}
              onClick={() => field.onChange("outdoors")}
            >
              <div className="flex flex-col items-center gap-2">
                <MapPin className="w-8 h-8 text-primary-500" />
                <span className="text-lg">Ar Livre</span>
                <p className="text-sm text-gray-500">Parques e áreas públicas</p>
              </div>
            </SelectCard>

            <SelectCard
              selected={field.value === "no_equipment"}
              onClick={() => field.onChange("no_equipment")}
            >
              <div className="flex flex-col items-center gap-2">
                <Ban className="w-8 h-8 text-primary-500" />
                <span className="text-lg">Sem Equipamentos</span>
                <p className="text-sm text-gray-500">Apenas peso corporal</p>
              </div>
            </SelectCard>
          </div>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};
