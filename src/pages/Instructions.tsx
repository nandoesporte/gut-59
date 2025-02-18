
import { ProfessionalsSection } from "@/components/professionals/ProfessionalsSection";
import { InstructionVideos } from "@/components/instruction/InstructionVideos";
import { Card } from "@/components/ui/card";

const Instructions = () => {
  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto space-y-8">
          <Card className="p-8">
            <div className="text-center max-w-3xl mx-auto mb-12">
              <h1 className="text-3xl font-bold text-primary-700 mb-4">
                Instruções e Nossa Equipe
              </h1>
              <p className="text-gray-600 text-lg">
                Conheça nossa equipe de especialistas dedicados a ajudar você em sua jornada para uma vida mais saudável.
              </p>
            </div>
          </Card>

          <InstructionVideos />
          
          <ProfessionalsSection />
        </div>
      </div>
    </div>
  );
};

export default Instructions;
