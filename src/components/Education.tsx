
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
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader className="flex flex-row items-center space-x-2">
          <Book className="w-6 h-6 text-primary-500" />
          <CardTitle className="text-2xl text-primary-500">
            Protocolo de Modulação Intestinal
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="fase1" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="fase1">Fase 1</TabsTrigger>
              <TabsTrigger value="fase2">Fase 2</TabsTrigger>
              <TabsTrigger value="fase3">Fase 3</TabsTrigger>
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
