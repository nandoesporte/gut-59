
import { ProfessionalsSection } from "@/components/professionals/ProfessionalsSection";
import { InstructionVideos } from "@/components/instruction/InstructionVideos";

const Instructions = () => {
  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-4 py-4">
        <div className="max-w-6xl mx-auto space-y-8">
          <ProfessionalsSection />
          <InstructionVideos />
        </div>
      </div>
    </div>
  );
};

export default Instructions;
