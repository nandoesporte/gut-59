
import React from 'react';
import { TabsContent } from "@/components/ui/tabs";
import DailyRoutine from './DailyRoutine';
import { Phase, OpenDaysState } from '@/types/education';

interface PhaseContentProps {
  phase: Phase;
  phaseIndex: number;
  openDays: OpenDaysState;
  onToggleDay: (phaseIndex: number, dayIndex: number) => void;
}

const PhaseContent = ({ phase, phaseIndex, openDays, onToggleDay }: PhaseContentProps) => {
  return (
    <TabsContent value={`fase${phaseIndex + 1}`}>
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-primary-50 to-primary-100 p-6 rounded-lg">
          <h3 className="text-2xl font-semibold text-primary-700 mb-3">
            {phase.title}
          </h3>
          <p className="text-primary-600">{phase.description}</p>
        </div>

        <div className="grid gap-4">
          {phase.dailyRoutine.map((day, dayIndex) => {
            const key = `phase${phaseIndex}-day${dayIndex}`;
            return (
              <DailyRoutine
                key={dayIndex}
                day={day}
                dayIndex={dayIndex}
                isOpen={openDays[key]}
                onToggle={() => onToggleDay(phaseIndex, dayIndex)}
              />
            );
          })}
        </div>
      </div>
    </TabsContent>
  );
};

export default PhaseContent;
