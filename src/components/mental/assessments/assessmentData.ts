
import { AssessmentType } from './AssessmentTypes';

// Burnout Assessment (Maslach Burnout Inventory simplified version)
export const burnoutAssessment: AssessmentType = {
  id: 'burnout',
  title: 'Avaliação de Burnout',
  description: 'Este questionário avalia sintomas de esgotamento profissional (burnout).',
  instructions: 'Indique com que frequência você experimenta as seguintes situações no trabalho. Use a escala de 0 (nunca) a 4 (sempre).',
  questions: [
    { id: 1, text: 'Sinto-me emocionalmente esgotado(a) com meu trabalho.', type: 'burnout' },
    { id: 2, text: 'Sinto-me exausto(a) ao final de um dia de trabalho.', type: 'burnout' },
    { id: 3, text: 'Sinto-me cansado(a) quando me levanto de manhã e tenho que encarar outro dia de trabalho.', type: 'burnout' },
    { id: 4, text: 'Trabalhar o dia inteiro é realmente um grande esforço para mim.', type: 'burnout' },
    { id: 5, text: 'Sinto que trato alguns destinatários do meu trabalho como se fossem objetos impessoais.', type: 'burnout' },
    { id: 6, text: 'Tenho me tornado mais insensível com as pessoas desde que comecei este trabalho.', type: 'burnout' },
    { id: 7, text: 'Preocupa-me que este trabalho esteja me endurecendo emocionalmente.', type: 'burnout' },
    { id: 8, text: 'Não me importo realmente com o que acontece com alguns dos destinatários do meu trabalho.', type: 'burnout' },
    { id: 9, text: 'Sinto que estou influenciando positivamente a vida das pessoas através do meu trabalho.', type: 'burnout', reversed: true },
    { id: 10, text: 'Sinto-me muito energético(a) no meu trabalho.', type: 'burnout', reversed: true },
    { id: 11, text: 'Posso facilmente entender como os destinatários do meu trabalho se sentem.', type: 'burnout', reversed: true },
    { id: 12, text: 'Tenho realizado muitas coisas importantes neste trabalho.', type: 'burnout', reversed: true },
    { id: 13, text: 'No meu trabalho, lido com os problemas emocionais com muita calma.', type: 'burnout', reversed: true },
    { id: 14, text: 'Sinto que estou no fim das minhas forças.', type: 'burnout' },
    { id: 15, text: 'No meu trabalho, sinto-me confiante de que sou eficiente e capaz.', type: 'burnout', reversed: true },
  ],
  scoreRanges: {
    low: [0, 20],
    moderate: [21, 35],
    high: [36, 50],
    severe: [51, 60]
  },
  getResult: (score: number) => {
    let level: 'low' | 'moderate' | 'high' | 'severe';
    let interpretation: string;
    let recommendations: string[];

    if (score <= 20) {
      level = 'low';
      interpretation = 'Você apresenta poucos sintomas de burnout. Continue mantendo um bom equilíbrio entre trabalho e vida pessoal.';
      recommendations = [
        'Mantenha práticas de autocuidado regularmente',
        'Continue desenvolvendo estratégias de gestão do estresse',
        'Reserve tempo para atividades prazerosas'
      ];
    } else if (score <= 35) {
      level = 'moderate';
      interpretation = 'Você apresenta alguns sintomas de burnout. Preste atenção a sinais de esgotamento e implemente estratégias de autocuidado.';
      recommendations = [
        'Revise sua carga de trabalho e delegue tarefas quando possível',
        'Pratique técnicas de relaxamento diariamente',
        'Estabeleça limites claros entre trabalho e vida pessoal'
      ];
    } else if (score <= 50) {
      level = 'high';
      interpretation = 'Você apresenta vários sintomas de burnout. Considere fazer mudanças significativas na sua rotina de trabalho.';
      recommendations = [
        'Converse com seu supervisor sobre a redistribuição de tarefas',
        'Busque apoio de um profissional de saúde mental',
        'Priorize o autocuidado e considere tirar alguns dias de folga'
      ];
    } else {
      level = 'severe';
      interpretation = 'Você apresenta muitos sintomas de burnout. Recomenda-se buscar ajuda profissional imediatamente.';
      recommendations = [
        'Consulte um profissional de saúde mental o mais breve possível',
        'Avalie a possibilidade de tirar uma licença para recuperação',
        'Faça mudanças significativas no seu ambiente e rotina de trabalho'
      ];
    }

    return {
      score,
      interpretation,
      level,
      recommendations
    };
  }
};

// Anxiety Assessment (GAD-7)
export const anxietyAssessment: AssessmentType = {
  id: 'anxiety',
  title: 'Avaliação de Ansiedade',
  description: 'Este questionário avalia sintomas de ansiedade generalizada (GAD-7).',
  instructions: 'Durante as últimas 2 semanas, com que frequência você foi incomodado pelos seguintes problemas? Use a escala de 0 (nunca) a 3 (quase todos os dias).',
  questions: [
    { id: 1, text: 'Sentir-se nervoso(a), ansioso(a) ou no limite.', type: 'anxiety' },
    { id: 2, text: 'Não ser capaz de impedir ou controlar as preocupações.', type: 'anxiety' },
    { id: 3, text: 'Preocupar-se muito com diversas coisas.', type: 'anxiety' },
    { id: 4, text: 'Dificuldade para relaxar.', type: 'anxiety' },
    { id: 5, text: 'Ficar tão agitado(a) que é difícil permanecer sentado(a).', type: 'anxiety' },
    { id: 6, text: 'Ficar facilmente aborrecido(a) ou irritado(a).', type: 'anxiety' },
    { id: 7, text: 'Sentir medo como se algo terrível pudesse acontecer.', type: 'anxiety' },
  ],
  scoreRanges: {
    low: [0, 4],
    moderate: [5, 9],
    high: [10, 14],
    severe: [15, 21]
  },
  getResult: (score: number) => {
    let level: 'low' | 'moderate' | 'high' | 'severe';
    let interpretation: string;
    let recommendations: string[];

    if (score <= 4) {
      level = 'low';
      interpretation = 'Ansiedade mínima. Seus sintomas de ansiedade são muito leves.';
      recommendations = [
        'Continue monitorando seu bem-estar emocional',
        'Pratique técnicas de relaxamento preventivamente',
        'Mantenha um estilo de vida saudável com exercícios físicos regulares'
      ];
    } else if (score <= 9) {
      level = 'moderate';
      interpretation = 'Ansiedade leve. Você apresenta alguns sintomas de ansiedade que merecem atenção.';
      recommendations = [
        'Pratique técnicas de respiração e mindfulness diariamente',
        'Considere reduzir o consumo de cafeína e estimulantes',
        'Estabeleça uma rotina regular de sono'
      ];
    } else if (score <= 14) {
      level = 'high';
      interpretation = 'Ansiedade moderada. Seus sintomas de ansiedade são significativos e podem estar afetando sua qualidade de vida.';
      recommendations = [
        'Considere conversar com um profissional de saúde mental',
        'Pratique técnicas de gerenciamento de ansiedade diariamente',
        'Identifique e reduza gatilhos de ansiedade em sua rotina'
      ];
    } else {
      level = 'severe';
      interpretation = 'Ansiedade severa. Seus sintomas indicam um nível alto de ansiedade que requer atenção profissional.';
      recommendations = [
        'Busque ajuda de um profissional de saúde mental o mais breve possível',
        'Aprenda e pratique técnicas de controle de crises de ansiedade',
        'Considere avaliar opções de tratamento com seu médico'
      ];
    }

    return {
      score,
      interpretation,
      level,
      recommendations
    };
  }
};

// Stress Assessment (PSS-10)
export const stressAssessment: AssessmentType = {
  id: 'stress',
  title: 'Avaliação de Estresse',
  description: 'Este questionário avalia seu nível atual de estresse percebido (PSS-10).',
  instructions: 'As questões nesta escala perguntam sobre seus sentimentos e pensamentos durante o último mês. Use a escala de 0 (nunca) a 4 (muito frequentemente).',
  questions: [
    { id: 1, text: 'No último mês, com que frequência você tem ficado triste por causa de algo que aconteceu inesperadamente?', type: 'stress' },
    { id: 2, text: 'No último mês, com que frequência você tem se sentido incapaz de controlar as coisas importantes em sua vida?', type: 'stress' },
    { id: 3, text: 'No último mês, com que frequência você tem se sentido nervoso e "estressado"?', type: 'stress' },
    { id: 4, text: 'No último mês, com que frequência você tem se sentido confiante na sua habilidade de resolver problemas pessoais?', type: 'stress', reversed: true },
    { id: 5, text: 'No último mês, com que frequência você tem sentido que as coisas estão acontecendo de acordo com a sua vontade?', type: 'stress', reversed: true },
    { id: 6, text: 'No último mês, com que frequência você tem achado que não conseguiria lidar com todas as coisas que você tem que fazer?', type: 'stress' },
    { id: 7, text: 'No último mês, com que frequência você tem conseguido controlar as irritações em sua vida?', type: 'stress', reversed: true },
    { id: 8, text: 'No último mês, com que frequência você tem sentido que as coisas estão sob o seu controle?', type: 'stress', reversed: true },
    { id: 9, text: 'No último mês, com que frequência você tem ficado irritado porque as coisas que acontecem estão fora do seu controle?', type: 'stress' },
    { id: 10, text: 'No último mês, com que frequência você tem sentido que as dificuldades se acumulam a ponto de você acreditar que não pode superá-las?', type: 'stress' },
  ],
  scoreRanges: {
    low: [0, 13],
    moderate: [14, 26],
    high: [27, 40],
    severe: [41, 56]
  },
  getResult: (score: number) => {
    let level: 'low' | 'moderate' | 'high' | 'severe';
    let interpretation: string;
    let recommendations: string[];

    if (score <= 13) {
      level = 'low';
      interpretation = 'Baixo nível de estresse. Você está lidando bem com os estressores da vida.';
      recommendations = [
        'Continue com suas estratégias de gerenciamento de estresse',
        'Pratique atividades físicas regularmente',
        'Mantenha uma rede de apoio social'
      ];
    } else if (score <= 26) {
      level = 'moderate';
      interpretation = 'Nível moderado de estresse. Você está experimentando um nível de estresse significativo.';
      recommendations = [
        'Identifique e reduza fontes de estresse em sua vida',
        'Pratique técnicas de relaxamento diariamente',
        'Considere incorporar mindfulness à sua rotina'
      ];
    } else if (score <= 40) {
      level = 'high';
      interpretation = 'Alto nível de estresse. Seu nível de estresse é elevado e pode estar afetando sua saúde.';
      recommendations = [
        'Busque formas de reduzir compromissos e responsabilidades quando possível',
        'Estabeleça limites claros entre trabalho e descanso',
        'Considere consultar um profissional de saúde mental'
      ];
    } else {
      level = 'severe';
      interpretation = 'Nível de estresse severo. Você está experimentando um nível alarmante de estresse.';
      recommendations = [
        'Busque ajuda profissional o mais breve possível',
        'Avalie mudanças significativas em sua rotina e ambiente',
        'Aprenda e pratique técnicas avançadas de gerenciamento de estresse'
      ];
    }

    return {
      score,
      interpretation,
      level,
      recommendations
    };
  }
};

// Depression Assessment (PHQ-9)
export const depressionAssessment: AssessmentType = {
  id: 'depression',
  title: 'Avaliação de Depressão',
  description: 'Este questionário avalia sintomas de depressão (PHQ-9).',
  instructions: 'Durante as últimas 2 semanas, com que frequência você foi incomodado por qualquer um dos problemas a seguir? Use a escala de 0 (nunca) a 3 (quase todos os dias).',
  questions: [
    { id: 1, text: 'Pouco interesse ou pouco prazer em fazer as coisas.', type: 'depression' },
    { id: 2, text: 'Se sentir "para baixo", deprimido(a) ou sem perspectiva.', type: 'depression' },
    { id: 3, text: 'Dificuldade para pegar no sono ou permanecer dormindo, ou dormir mais do que de costume.', type: 'depression' },
    { id: 4, text: 'Se sentir cansado(a) ou com pouca energia.', type: 'depression' },
    { id: 5, text: 'Falta de apetite ou comendo demais.', type: 'depression' },
    { id: 6, text: 'Se sentir mal consigo mesmo(a) — ou achando que você é um fracasso ou que decepcionou sua família ou você mesmo(a).', type: 'depression' },
    { id: 7, text: 'Dificuldade para se concentrar nas coisas, como ler o jornal ou ver televisão.', type: 'depression' },
    { id: 8, text: 'Lentidão para se movimentar ou falar, a ponto das outras pessoas perceberem? Ou o oposto – estar tão agitado(a) ou inquieto(a) que você fica andando de um lado para o outro muito mais do que de costume.', type: 'depression' },
    { id: 9, text: 'Pensar em se ferir de alguma maneira ou que seria melhor estar morto(a).', type: 'depression' },
  ],
  scoreRanges: {
    low: [0, 4],
    moderate: [5, 9],
    high: [10, 14],
    severe: [15, 27]
  },
  getResult: (score: number) => {
    let level: 'low' | 'moderate' | 'high' | 'severe';
    let interpretation: string;
    let recommendations: string[];

    if (score <= 4) {
      level = 'low';
      interpretation = 'Depressão mínima ou ausente. Seus sintomas são muito leves.';
      recommendations = [
        'Continue monitorando seu humor e energia',
        'Mantenha atividades que trazem prazer e significado',
        'Pratique autocuidado regularmente'
      ];
    } else if (score <= 9) {
      level = 'moderate';
      interpretation = 'Depressão leve. Você apresenta alguns sintomas de depressão.';
      recommendations = [
        'Considere aumentar atividades prazerosas em sua rotina',
        'Mantenha contato social regular',
        'Pratique exercícios físicos regularmente'
      ];
    } else if (score <= 14) {
      level = 'high';
      interpretation = 'Depressão moderada. Seus sintomas de depressão são significativos.';
      recommendations = [
        'Considere buscar apoio de um profissional de saúde mental',
        'Mantenha uma rotina estruturada, mesmo quando não sentir vontade',
        'Compartilhe seus sentimentos com pessoas de confiança'
      ];
    } else {
      level = 'severe';
      interpretation = 'Depressão moderadamente severa a severa. Seus sintomas indicam um nível significativo de depressão.';
      recommendations = [
        'Busque ajuda profissional o mais breve possível',
        'Não tome decisões importantes durante este período sem apoio',
        'Se tiver pensamentos de autoagressão, busque ajuda imediatamente através do CVV (188) ou serviço de emergência'
      ];
    }

    return {
      score,
      interpretation,
      level,
      recommendations
    };
  }
};

export const assessments = [
  burnoutAssessment,
  anxietyAssessment,
  stressAssessment,
  depressionAssessment
];
