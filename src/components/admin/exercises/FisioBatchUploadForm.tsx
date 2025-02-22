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
import { Exercise, MuscleGroup, ExerciseType, Difficulty } from "./types";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { Switch } from "@/components/ui/switch";

interface FisioBatchUploadFormProps {
  onUpload: (exerciseData: Omit<Exercise, 'id' | 'gif_url'>, file?: File) => Promise<void>;
  uploading: boolean;
}

const jointAreaOptions = {
  ankle_foot: "Tornozelo e Pé",
  leg: "Perna",
  knee: "Joelho",
  hip: "Quadril",
  spine: "Coluna",
  shoulder: "Ombro",
  elbow_hand: "Cotovelo e Mão"
};

const conditionsByArea = {
  ankle_foot: [
    { value: "plantar_fasciitis", label: "Fascite Plantar" },
    { value: "calcaneal_spur", label: "Esporão do Calcâneo" },
    { value: "ankle_sprain", label: "Entorse do Tornozelo" }
  ],
  leg: [
    { value: "anterior_compartment", label: "Síndrome do Compartimento Anterior" },
    { value: "shin_splints", label: "Canelite" },
    { value: "achilles_tendinitis", label: "Tendinite do Tendão do Calcâneo" }
  ],
  knee: [
    { value: "patellofemoral", label: "Síndrome Patelofemoral" },
    { value: "patellar_tendinitis", label: "Tendinite Patelar" },
    { value: "acl_postop", label: "Pós-operatório de LCA" },
    { value: "mcl_injury", label: "Lesão do Ligamento Colateral Medial" },
    { value: "meniscus_injury", label: "Lesão do Menisco" },
    { value: "knee_arthrosis", label: "Artrose" }
  ],
  hip: [
    { value: "trochanteric_bursitis", label: "Bursite Trocantérica" },
    { value: "piriformis_syndrome", label: "Síndrome do Piriforme" },
    { value: "sports_hernia", label: "Pubalgia" },
    { value: "it_band_syndrome", label: "Síndrome do Trato Iliotibial" }
  ],
  spine: [
    { value: "disc_protrusion", label: "Protusão Discal" },
    { value: "herniated_disc", label: "Hérnia de Disco" },
    { value: "cervical_lordosis", label: "Retificação da Lordose Cervical" }
  ],
  shoulder: [
    { value: "frozen_shoulder", label: "Capsulite Adesiva" },
    { value: "shoulder_bursitis", label: "Bursite" },
    { value: "rotator_cuff", label: "Tendinite do Manguito Rotador" },
    { value: "impingement", label: "Síndrome do Impacto" }
  ],
  elbow_hand: [
    { value: "medial_epicondylitis", label: "Epicondilite Medial" },
    { value: "lateral_epicondylitis", label: "Epicondilite Lateral" },
    { value: "carpal_tunnel", label: "Síndrome do Túnel do Carpo" }
  ]
};

const difficultyLevels = [
  { value: "beginner", label: "Iniciante" },
  { value: "intermediate", label: "Intermediário" },
  { value: "advanced", label: "Avançado" }
];

export const FisioBatchUploadForm = ({
  onUpload,
  uploading,
}: FisioBatchUploadFormProps) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [selectedJointArea, setSelectedJointArea] = useState<string>("knee");
  const [selectedCondition, setSelectedCondition] = useState<string>("patellofemoral");
  const [difficulty, setDifficulty] = useState<Difficulty>("beginner");
  const [exerciseType, setExerciseType] = useState<ExerciseType>("mobility");
  const [isCompoundMovement, setIsCompoundMovement] = useState(false);
  const [requiresEquipment, setRequiresEquipment] = useState(false);
  const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB por arquivo

  const validateFile = (file: File): boolean => {
    if (!file.type.includes('gif')) {
      toast.error(`${file.name} não é um arquivo GIF`);
      return false;
    }

    if (file.size > MAX_FILE_SIZE) {
      toast.error(`${file.name} é muito grande. O tamanho máximo é 20MB`);
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
        const exerciseData = {
          name: file.name.replace('.gif', ''),
          description: '',
          exercise_type: exerciseType,
          difficulty: difficulty,
          is_compound_movement: isCompoundMovement,
          equipment_needed: requiresEquipment ? ['basic'] : [],
          balance_requirement: 'moderate',
          coordination_requirement: 'moderate',
          strength_requirement: 'moderate',
          flexibility_requirement: 'moderate'
        };
        
        await onUpload(exerciseData, file, selectedJointArea, selectedCondition);
      }
      setSelectedFiles([]);
      toast.success('Todos os arquivos foram enviados com sucesso!');
    } catch (error) {
      console.error('Erro no upload:', error);
      toast.error('Erro ao fazer upload dos arquivos. Tente novamente.');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Upload em Lote - Exercícios de Fisioterapia</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Articulação</Label>
              <Select
                value={selectedJointArea}
                onValueChange={(value) => {
                  setSelectedJointArea(value);
                  setSelectedCondition(conditionsByArea[value as keyof typeof conditionsByArea][0].value);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a articulação" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(jointAreaOptions).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Condição</Label>
              <Select
                value={selectedCondition}
                onValueChange={setSelectedCondition}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a condição" />
                </SelectTrigger>
                <SelectContent>
                  {conditionsByArea[selectedJointArea as keyof typeof conditionsByArea].map(({ value, label }) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Nível de Dificuldade</Label>
              <Select
                value={difficulty}
                onValueChange={(value: Difficulty) => setDifficulty(value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o nível" />
                </SelectTrigger>
                <SelectContent>
                  {difficultyLevels.map(level => (
                    <SelectItem key={level.value} value={level.value as Difficulty}>
                      {level.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Tipo de Exercício</Label>
              <Select
                value={exerciseType}
                onValueChange={(value: ExerciseType) => setExerciseType(value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mobility">Mobilidade</SelectItem>
                  <SelectItem value="strength">Força</SelectItem>
                  <SelectItem value="cardio">Cardio</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Switch
                id="compound"
                checked={isCompoundMovement}
                onCheckedChange={setIsCompoundMovement}
              />
              <Label htmlFor="compound">Movimento Composto</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="equipment"
                checked={requiresEquipment}
                onCheckedChange={setRequiresEquipment}
              />
              <Label htmlFor="equipment">Requer Equipamento</Label>
            </div>
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
              Selecione múltiplos arquivos GIF (máx. 20MB cada). Os nomes dos arquivos serão usados como nomes dos exercícios.
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
