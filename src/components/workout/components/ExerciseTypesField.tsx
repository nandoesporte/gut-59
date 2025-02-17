
import * as React from "react";
import {
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { SelectCard } from "./SelectCard";
import { UseFormReturn } from "react-hook-form";
import { ExerciseType } from "../types";
import { Dumbbell, Heart, Move } from "lucide-react";

interface ExerciseTypesFieldProps {
  form: UseFormReturn<any>;
}

export const ExerciseTypesField = ({ form }: ExerciseTypesFieldProps) => {
  return (
    <FormField
      control={form.control}
      name="preferredExerciseTypes"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Tipos de Exercícios Preferidos</FormLabel>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(['strength', 'cardio', 'mobility'] as ExerciseType[]).map((type) => (
              <SelectCard
                key={type}
                selected={field.value?.includes(type)}
                onClick={() => {
                  if (field.value?.includes(type)) {
                    field.onChange(field.value?.filter((t) => t !== type));
                  } else {
                    field.onChange([...field.value || [], type]);
                  }
                }}
              >
                <div className="flex flex-col items-center gap-2">
                  {type === 'strength' ? (
                    <Dumbbell className="w-8 h-8 text-primary-500" />
                  ) : type === 'cardio' ? (
                    <Heart className="w-8 h-8 text-primary-500" />
                  ) : (
                    <Move className="w-8 h-8 text-primary-500" />
                  )}
                  <span className="text-lg">
                    {type === 'strength' ? 'Força' : 
                     type === 'cardio' ? 'Cardio' : 
                     'Mobilidade'}
                  </span>
                </div>
              </SelectCard>
            ))}
          </div>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};
