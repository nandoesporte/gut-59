
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Book } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { phases } from '@/data/phases';
import PhaseContent from './education/PhaseContent';
import { OpenDaysState } from '@/types/education';

const Education = () => {
  const [openDays, setOpenDays] = useState<OpenDaysState>({});

  const toggleDay = (phaseIndex: number, dayIndex: number) => {
    const key = `phase${phaseIndex}-day${dayIndex}`;
    setOpenDays(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="space-y-6">
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader className="flex flex-row items-center space-x-2 bg-gradient-to-r from-primary-50 to-primary-100">
          <Book className="w-6 h-6 text-primary-600" />
          <CardTitle className="text-2xl text-primary-700">
            Protocolo de Modulação Intestinal
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <Tabs defaultValue="fase1" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="fase1" className="text-lg">Fase 1</TabsTrigger>
              <TabsTrigger value="fase2" className="text-lg">Fase 2</TabsTrigger>
              <TabsTrigger value="fase3" className="text-lg">Fase 3</TabsTrigger>
            </TabsList>
            {phases.map((phase, phaseIndex) => (
              <PhaseContent
                key={phaseIndex}
                phase={phase}
                phaseIndex={phaseIndex}
                openDays={openDays}
                onToggleDay={toggleDay}
              />
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Education;
