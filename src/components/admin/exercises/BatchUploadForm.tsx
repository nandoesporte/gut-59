
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
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

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
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB por arquivo

  const validateFile = (file: File): boolean => {
    if (!file.type.includes('gif')) {
      toast.error(`${file.name} não é um arquivo GIF`);
      return false;
    }

    if (file.size > MAX_FILE_SIZE) {
      toast.error(`${file.name} é muito grande. O tamanho máximo é 5MB`);
      return false;
    }

    return true;
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const validFiles = files.filter(validateFile);
    setSelectedFiles(prev => [...prev, ...validFiles]);
    event.target.value = ''; // Reset input
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUploadAll = async () => {
    if (selectedFiles.length === 0) {
      toast.error('Selecione pelo menos um arquivo para fazer upload');
      return;
    }

    try {
      for (const file of selectedFiles) {
        await onUpload(file, selectedCategory);
      }
      setSelectedFiles([]); // Limpa a lista após upload bem sucedido
      toast.success('Todos os arquivos foram enviados com sucesso!');
    } catch (error) {
      console.error('Erro no upload:', error);
      toast.error('Erro ao fazer upload dos arquivos. Tente novamente.');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Upload em Lote</CardTitle>
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
            <Label htmlFor="files">Selecionar GIFs</Label>
            <Input
              id="files"
              type="file"
              accept=".gif"
              multiple
              onChange={handleFileSelect}
              disabled={uploading}
              className="mt-1"
            />
            <p className="text-sm text-gray-500 mt-1">
              Selecione múltiplos arquivos GIF (máx. 5MB cada). Os nomes dos arquivos serão usados como nomes dos exercícios.
            </p>
          </div>

          {selectedFiles.length > 0 && (
            <div className="space-y-2">
              <Label>Arquivos Selecionados ({selectedFiles.length})</Label>
              <div className="max-h-40 overflow-y-auto space-y-2">
                {selectedFiles.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded-md"
                  >
                    <span className="truncate flex-1">{file.name}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(index)}
                      className="ml-2"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
              <Button
                onClick={handleUploadAll}
                disabled={uploading}
                className="w-full mt-2"
              >
                {uploading ? 'Enviando...' : 'Enviar Todos'}
              </Button>
            </div>
          )}

          {uploading && (
            <div className="space-y-2">
              <Progress value={100} className="w-full" />
              <p className="text-sm text-center text-gray-500">
                Processando arquivos... Por favor, aguarde.
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
