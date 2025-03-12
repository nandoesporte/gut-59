
import React, { useEffect, useState } from 'react';
import { assessments } from './assessmentData';
import { AssessmentTaker } from './AssessmentTaker';
import { useSearchParams } from 'react-router-dom';
import { AssessmentType } from './AssessmentTypes';
import { Loader2 } from 'lucide-react';

export const AssessmentView = () => {
  const [searchParams] = useSearchParams();
  const [selectedAssessment, setSelectedAssessment] = useState<AssessmentType | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const assessmentType = searchParams.get('type');
    if (assessmentType) {
      const assessment = assessments.find(a => a.id === assessmentType);
      if (assessment) {
        setSelectedAssessment(assessment);
      }
    }
    setLoading(false);
  }, [searchParams]);
  
  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  if (!selectedAssessment) {
    return (
      <div className="text-center py-12">
        <p>Avaliação não encontrada. Por favor, selecione uma avaliação válida.</p>
      </div>
    );
  }
  
  return <AssessmentTaker assessment={selectedAssessment} />;
};
