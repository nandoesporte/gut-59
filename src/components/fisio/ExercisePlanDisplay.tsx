
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FisioPreferences } from '@/components/fisio/types';
import { Loader2, ArrowLeft, Download, BookOpen, Dumbbell } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { usePaymentHandling } from '@/components/menu/hooks/usePaymentHandling';
import type { RehabPlan } from './types/rehab-plan';

interface ExercisePlanDisplayProps {
  preferences: FisioPreferences;
  onReset: () => void;
}

export const ExercisePlanDisplay: React.FC<ExercisePlanDisplayProps> = ({ preferences, onReset }) => {
  const [plan, setPlan] = useState<RehabPlan | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeDay, setActiveDay] = useState('overview');
  const [loadingText, setLoadingText] = useState('Generating your rehabilitation plan...');
  const { hasPaid, isProcessingPayment, handlePaymentAndContinue, showConfirmation, setShowConfirmation } = 
    usePaymentHandling('rehabilitation');

  const generatePlan = async () => {
    try {
      setIsLoading(true);
      
      setLoadingText('Gathering exercise data for your condition...');
      setTimeout(() => {
        setLoadingText('Analyzing your preferences and history...');
      }, 3000);
      setTimeout(() => {
        setLoadingText('Creating personalized exercise protocol...');
      }, 6000);
      setTimeout(() => {
        setLoadingText('Finalizing your plan...');
      }, 9000);

      const { data: userData } = await supabase.auth.getUser();

      const response = await fetch('/api/functions/v1/generate-rehab-plan-groq', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          preferences,
          userData: userData.user,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate rehabilitation plan');
      }

      const rehabPlan = await response.json();
      console.log('Generated rehabilitation plan:', rehabPlan);
      
      setPlan(rehabPlan);
    } catch (error) {
      console.error('Error generating rehabilitation plan:', error);
      toast.error('Failed to generate rehabilitation plan. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (hasPaid && !plan) {
      generatePlan();
    }
  }, [hasPaid]);

  // Start the process right away if no payment is needed
  useEffect(() => {
    const checkPaymentAndGeneratePlan = async () => {
      setIsLoading(true);
      try {
        // Check plan access
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          throw new Error('User not authenticated');
        }

        // Check plan generation counts
        const { data: counts, error: countError } = await supabase
          .from('plan_generation_counts')
          .select('rehabilitation_count')
          .eq('user_id', user.id)
          .maybeSingle();

        if (countError) {
          console.error('Error checking plan counts:', countError);
        }

        // If user hasn't generated plans yet or has generated less than 3
        if (!counts || (counts.rehabilitation_count < 3)) {
          // Don't need payment, generate plan
          await generatePlan();
        } else {
          // Check if there's special access
          const { data: access, error: accessError } = await supabase
            .from('plan_access')
            .select('*')
            .eq('user_id', user.id)
            .eq('plan_type', 'rehabilitation')
            .eq('is_active', true)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (accessError && accessError.code !== 'PGRST116') {
            console.error('Error checking plan access:', accessError);
          }

          if (access && !access.payment_required) {
            // User has special access
            await generatePlan();
          } else {
            // Need payment
            setIsLoading(false);
          }
        }
      } catch (error) {
        console.error('Error checking payment status:', error);
        setIsLoading(false);
      }
    };

    checkPaymentAndGeneratePlan();
  }, []);

  const renderExerciseList = (exercises) => {
    return (
      <div className="space-y-6">
        {exercises.map((exercise, i) => (
          <Card key={i} className="overflow-hidden bg-white dark:bg-gray-800">
            <div className="flex flex-col md:flex-row">
              {exercise.gifUrl && (
                <div className="md:w-1/3 flex justify-center items-center bg-gray-100 dark:bg-gray-700 p-4">
                  <img 
                    src={exercise.gifUrl} 
                    alt={exercise.name} 
                    className="h-48 object-contain"
                  />
                </div>
              )}
              <div className={`md:${exercise.gifUrl ? 'w-2/3' : 'w-full'} p-4`}>
                <h4 className="text-lg font-semibold flex items-center">
                  <Dumbbell className="w-5 h-5 mr-2 text-primary" />
                  {exercise.name}
                </h4>
                {exercise.difficulty && (
                  <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                    Difficulty: {exercise.difficulty}
                  </div>
                )}
                <div className="grid grid-cols-3 gap-2 my-3">
                  <div className="bg-primary/10 rounded-md p-2 text-center">
                    <div className="text-xs text-gray-500 dark:text-gray-400">Sets</div>
                    <div className="font-bold">{exercise.sets}</div>
                  </div>
                  <div className="bg-primary/10 rounded-md p-2 text-center">
                    <div className="text-xs text-gray-500 dark:text-gray-400">Reps</div>
                    <div className="font-bold">{exercise.reps}</div>
                  </div>
                  <div className="bg-primary/10 rounded-md p-2 text-center">
                    <div className="text-xs text-gray-500 dark:text-gray-400">Rest</div>
                    <div className="font-bold">{Math.floor(exercise.rest_time_seconds / 60)}:{(exercise.rest_time_seconds % 60).toString().padStart(2, '0')}</div>
                  </div>
                </div>
                {(exercise.description || exercise.notes) && (
                  <div className="mt-3 text-sm">
                    <p>{exercise.description || exercise.notes}</p>
                  </div>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <h3 className="text-xl font-medium text-center">{loadingText}</h3>
        <p className="text-muted-foreground text-center mt-2">
          This may take up to a minute as we create a custom plan for you.
        </p>
      </div>
    );
  }

  if (!hasPaid && !plan) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-2xl">Ready to create your rehabilitation plan</CardTitle>
          <CardDescription>
            Get a personalized rehabilitation plan for your {preferences.joint_area} with exercises tailored to your needs.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-primary/5 rounded-lg p-4">
                <h3 className="font-medium text-lg mb-2">Your preferences</h3>
                <ul className="space-y-2">
                  <li><span className="font-medium">Joint Area:</span> {preferences.joint_area}</li>
                  <li><span className="font-medium">Rehabilitation Focus:</span> {preferences.condition || 'General recovery'}</li>
                  {preferences.pain_level && (
                    <li><span className="font-medium">Pain Level:</span> {preferences.pain_level}/10</li>
                  )}
                </ul>
              </div>
              <div className="bg-primary/5 rounded-lg p-4">
                <h3 className="font-medium text-lg mb-2">What you'll get</h3>
                <ul className="space-y-2">
                  <li>⭐ Custom rehabilitation exercises</li>
                  <li>⭐ Progress tracking framework</li>
                  <li>⭐ Detailed instructions with visuals</li>
                  <li>⭐ Specific recommendations for your condition</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col sm:flex-row gap-4">
          <Button variant="outline" onClick={onReset} className="w-full sm:w-auto">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Change preferences
          </Button>
          <Button 
            onClick={handlePaymentAndContinue} 
            disabled={isProcessingPayment}
            className="w-full sm:w-auto"
          >
            {isProcessingPayment && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isProcessingPayment ? 'Processing...' : 'Continue'}
          </Button>
        </CardFooter>
      </Card>
    );
  }

  if (!plan) {
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <div className="text-center space-y-2">
          <h3 className="text-xl font-medium">Something went wrong</h3>
          <p className="text-muted-foreground">
            We couldn't generate your rehabilitation plan. Please try again.
          </p>
          <Button onClick={onReset} className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Start over
          </Button>
        </div>
      </div>
    );
  }

  const days = plan.days || {};
  const dayKeys = Object.keys(days).sort((a, b) => {
    const aNum = parseInt(a.replace('day', ''));
    const bNum = parseInt(b.replace('day', ''));
    return aNum - bNum;
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Your Rehabilitation Plan</h2>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={onReset} size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Save PDF
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" value={activeDay} onValueChange={setActiveDay}>
        <TabsList className="mb-4 flex flex-wrap">
          <TabsTrigger value="overview" className="data-[state=active]:bg-primary data-[state=active]:text-white">
            <BookOpen className="h-4 w-4 mr-2" />
            Overview
          </TabsTrigger>
          {dayKeys.map((day) => (
            <TabsTrigger 
              key={day} 
              value={day}
              className="data-[state=active]:bg-primary data-[state=active]:text-white"
            >
              Day {day.replace('day', '')}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Rehabilitation Plan Overview</CardTitle>
              <CardDescription>
                For {preferences.joint_area} - {preferences.condition || 'Recovery'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="prose dark:prose-invert max-w-none">
                {plan.overview ? (
                  <p>{plan.overview}</p>
                ) : (
                  <p>This rehabilitation plan is designed to help improve your {preferences.joint_area} condition and achieve recovery for {preferences.condition || 'your condition'}.</p>
                )}
                
                {plan.recommendations && (
                  <div className="mt-4">
                    <h3 className="text-lg font-medium mb-2">Recommendations</h3>
                    {Array.isArray(plan.recommendations) ? (
                      <ul className="list-disc pl-5 space-y-1">
                        {plan.recommendations.map((rec, i) => (
                          <li key={i}>{rec}</li>
                        ))}
                      </ul>
                    ) : (
                      <p>{plan.recommendations}</p>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {plan.rehab_sessions && plan.rehab_sessions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Exercise Overview</CardTitle>
                <CardDescription>
                  All exercises in your rehabilitation program
                </CardDescription>
              </CardHeader>
              <CardContent>
                {renderExerciseList(
                  plan.rehab_sessions.flatMap(session => session.exercises)
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {dayKeys.map((day) => (
          <TabsContent key={day} value={day} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Day {day.replace('day', '')} - Exercise Program</CardTitle>
                <CardDescription>
                  {days[day].notes || `Exercises for day ${day.replace('day', '')}`}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {days[day].exercises.map((group, i) => (
                  <div key={i} className="space-y-4">
                    <h3 className="text-lg font-medium">{group.title}</h3>
                    {renderExerciseList(group.exercises)}
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};
