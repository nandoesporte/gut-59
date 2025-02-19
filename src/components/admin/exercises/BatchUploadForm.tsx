
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { MuscleGroup } from "./types";
import { categories } from "./categoryOptions";
import { toast } from "sonner";

interface BatchUploadFormProps {
  onUpload: (file: File, category: MuscleGroup) => Promise<void>;
  selectedCategory: MuscleGroup;
  onCategoryChange: (category: MuscleGroup) => void;
  uploading: boolean;
}

export const BatchUploadForm = ({
  onUpload,
  selectedCategory,
  onCategoryChange,
  uploading,
}: BatchUploadFormProps) => {
  const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

  const validateFile = (file: File): boolean => {
    if (!file.type.includes('zip')) {
      toast.error('Por favor, selecione um arquivo ZIP');
      return false;
    }

    if (file.size > MAX_FILE_SIZE) {
      toast.error('O arquivo é muito grande. O tamanho máximo é 50MB');
      return false;
    }

    return true;
  };

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    
    if (!file) {
      return;
    }

    if (!validateFile(file)) {
      event.target.value = '';
      return;
    }

    try {
      await onUpload(file, selectedCategory);
      event.target.value = '';
    } catch (error) {
      console.error('Erro no upload:', error);
      toast.error('Erro ao fazer upload. Tente com um arquivo menor ou menos arquivos.');
      event.target.value = '';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Upload em Lote (ZIP)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <Label>Categoria dos Exercícios</Label>
            <Select
              value={selectedCategory}
              onValueChange={(value: MuscleGroup) => onCategoryChange(value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione a categoria" />
              </SelectTrigger>
              <SelectContent>
                {categories.map(category => (
                  <SelectItem key={category.value} value={category.value}>
                    {category.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="zipFile">Arquivo ZIP com GIFs</Label>
            <Input
              id="zipFile"
              type="file"
              accept=".zip"
              onChange={handleUpload}
              disabled={uploading}
              className="mt-1"
            />
            <p className="text-sm text-gray-500 mt-1">
              Envie um arquivo ZIP (máx. 50MB) contendo apenas GIFs. Os nomes dos arquivos serão usados como nomes dos exercícios. Recomendamos enviar no máximo 5 arquivos por vez.
            </p>
          </div>

          {uploading && (
            <div className="space-y-2">
              <Progress value={100} className="w-full" />
              <p className="text-sm text-center text-gray-500">
                Processando arquivos... Isso pode levar alguns minutos.
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
