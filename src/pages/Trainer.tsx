
import { useState } from 'react';
import { Card } from "@/components/ui/card";
import { ScrollText, Play } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TrainingVideo {
  id: number;
  title: string;
  description: string;
  url: string;
  module: string;
}

const trainingVideos: TrainingVideo[] = [
  {
    id: 1,
    title: "Introdução ao Módulo 1",
    description: "Aprenda os conceitos básicos e fundamentos iniciais.",
    url: "https://www.youtube.com/embed/example1",
    module: "Módulo 1"
  },
  {
    id: 2,
    title: "Técnicas Avançadas",
    description: "Domine as técnicas mais avançadas do treinamento.",
    url: "https://www.youtube.com/embed/example2",
    module: "Módulo 2"
  },
  // Adicione mais vídeos conforme necessário
];

const Trainer = () => {
  const [selectedVideo, setSelectedVideo] = useState<TrainingVideo | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-8">
        <ScrollText className="w-8 h-8 text-primary-500" />
        <h1 className="text-2xl font-bold bg-gradient-to-r from-primary-500 to-primary-600 bg-clip-text text-transparent">
          Instruções de Treinamento
        </h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {selectedVideo ? (
          <div className="col-span-1 md:col-span-2">
            <Card className="p-6 bg-white/70 backdrop-blur-lg border border-gray-100 shadow-lg">
              <div className="aspect-video w-full mb-4 bg-gray-100 rounded-lg overflow-hidden">
                <iframe
                  src={selectedVideo.url}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                ></iframe>
              </div>
              <h2 className="text-xl font-semibold mb-2">{selectedVideo.title}</h2>
              <p className="text-gray-600 mb-4">{selectedVideo.description}</p>
              <Button
                variant="outline"
                onClick={() => setSelectedVideo(null)}
              >
                Voltar para lista
              </Button>
            </Card>
          </div>
        ) : (
          trainingVideos.map((video) => (
            <Card
              key={video.id}
              className="p-6 bg-white/70 backdrop-blur-lg border border-gray-100 shadow-lg hover:shadow-xl transition-all cursor-pointer"
              onClick={() => setSelectedVideo(video)}
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center">
                  <Play className="w-6 h-6 text-primary-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-1">{video.title}</h3>
                  <p className="text-sm text-gray-600 mb-2">{video.description}</p>
                  <span className="text-xs font-medium text-primary-500 bg-primary-50 px-2 py-1 rounded-full">
                    {video.module}
                  </span>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default Trainer;
