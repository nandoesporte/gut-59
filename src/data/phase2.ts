
import { Phase } from '@/types/education';
import { recipes } from './recipes';
import { allowedFoods } from './allowedFoods';

const phase2: Phase = {
  title: "Fase 2: Modulação Intestinal (4º ao 12º dia)",
  description: "9 dias de reintrodução progressiva de alimentos, incluindo hortaliças, frutas selecionadas, tubérculos e proteínas específicas.",
  dailyRoutine: [
    {
      meals: {
        "Ao acordar": [
          "1 copo de água com:",
          "- 1 limão espremido",
          "- 1 pitada de cúrcuma (açafrão)",
        ],
        "Café da manhã (07:00)": [
          "Escolher um dos sucos das receitas",
          "100g de mamão",
          "Até 2 ovos mexidos com 5ml de azeite de oliva extra virgem",
          "1 pedaço de tubérculo (escolher um):",
          "- Mandioca",
          "- Batata doce",
          "- Inhame",
          "- Cará",
          "- Mandioquinha salsa",
          "1 xícara pequena (60ml) de café sem açúcar",
        ],
        "Lanche (10:00)": [
          "Chá de folha de amora com cavalinha",
          "Escolher uma opção:",
          "- Fruta gordurosa (coco ou abacate)",
          "- Petisco de legume (cenoura ou pepino)",
        ],
        "Almoço (12:00)": [
          "Compor o prato com:",
          "- Tubérculos (mandioca, batata doce, inhame, cará ou mandioquinha)",
          "- 1 porção de folhas cruas (à vontade)",
          "- 1 porção de legumes cozidos, assados ou refogados (à vontade)",
          "- Peixe ou ovos",
          "Alternativa: 1 prato de sopa de abóbora funcional",
          "Observação: Evitar frituras",
        ],
        "Lanche 1 (15:00)": [
          "Escolher uma opção:",
          "- Fruta",
          "- Petisco de legumes (cenoura ou pepino com sal e limão)",
          "- Uma das opções de suco das receitas",
        ],
        "Lanche 2 (17:00)": [
          "Se sentir fome:",
          "1 ou 2 frutas da sua preferência",
        ],
        "Jantar (18:30 ou 19:00)": [
          "Opção 1: Igual ao almoço",
          "Opção 2: Sopa de abóbora funcional (à vontade)",
          "Importante: Fazer jejum de 12h entre o jantar e o café da manhã",
        ],
      },
      supplements: allowedFoods.map(category => category.join(", ")),
    },
  ],
};

export default phase2;
