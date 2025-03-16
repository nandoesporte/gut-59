import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FisioPreferences } from '@/components/fisio/types';
import { Loader2, ArrowLeft, Download, BookOpen, Dumbbell, AlertTriangle, RefreshCw } from 'lucide-react';
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
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const { hasPaid, isProcessingPayment, handlePaymentAndContinue, showConfirmation, setShowConfirmation } = 
    usePaymentHandling('rehabilitation');

  const generateRehabPlan = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const userData = user ? {
        id: user.id,
        email: user.email,
      } : null;
      
      setLoadingText('Analyzing your preferences...');
      
      const timeout1 = setTimeout(() => {
        if (isLoading) setLoadingText('Selecting appropriate exercises...');
      }, 5000);
      
      const timeout2 = setTimeout(() => {
        if (isLoading) setLoadingText('Creating your personalized plan...');
      }, 10000);
      
      const simplifiedPreferences = {
        joint_area: preferences.joint_area,
        condition: preferences.condition || 'general',
        pain_level: preferences.pain_level || 0,
        mobility_level: preferences.mobility_level || 'moderate',
      };
      
      console.log('Sending rehabilitation plan request with preferences:', simplifiedPreferences);
      
      const response = await supabase.functions.invoke('generate-rehab-plan-groq', {
        body: { preferences: simplifiedPreferences, userData },
      });
      
      clearTimeout(timeout1);
      clearTimeout(timeout2);
      
      if (response.error) {
        console.error('Error response from generate-rehab-plan-groq:', response.error);
        throw new Error(response.error.message || 'Error generating rehabilitation plan');
      }
      
      console.log('Response from generate-rehab-plan-groq:', response.data);
      
      if (!response.data) {
        throw new Error('No data returned from the rehabilitation plan generator');
      }
      
      setPlan(response.data);
      
    } catch (error) {
      console.error('Error generating rehabilitation plan:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      
      if (errorMessage.includes('context_length_exceeded')) {
        setError('The plan generation failed due to complexity. Please try with simpler preferences or try again later.');
      } else if (errorMessage.includes('Max number of functions reached')) {
        setError('The service is currently at capacity. Your plan will be generated using an alternative method. Please try again in a few moments.');
      } else if (errorMessage.includes('no data returned') || errorMessage.includes('No data returned')) {
        setError('Failed to generate rehabilitation data. Please try again with different preferences.');
      } else {
        setError(errorMessage);
      }
      
      toast.error('Failed to generate plan', {
        description: 'Please try again later or contact support if the issue persists.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
    generateRehabPlan();
  };

  useEffect(() => {
    if (hasPaid && !plan) {
      generateRehabPlan();
    }
  }, [hasPaid]);

  useEffect(() => {
    const checkPaymentAndGeneratePlan = async () => {
      setIsLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          throw new Error('User not authenticated');
        }

        const { data: counts, error: countError } = await supabase
          .from('plan_generation_counts')
          .select('rehabilitation_count')
          .eq('user_id', user.id)
          .maybeSingle();

        if (countError) {
          console.error('Error checking plan counts:', countError);
        }

        const { data, error } = await supabase
          .from('payment_settings')
          .select('is_active')
          .eq('setting_name', 'payment_enabled')
          .limit(1);
          
        const paymentGloballyEnabled = data && data.length > 0 ? Boolean(data[0].is_active) : true;
        
        console.log('Payment globally enabled:', paymentGloballyEnabled);
        
        if (!paymentGloballyEnabled || !counts || (counts.rehabilitation_count < 3)) {
          console.log('Generating rehab plan without payment check');
          await generateRehabPlan();
        } else {
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
            console.log('User has access to rehab plan generation');
            await generateRehabPlan();
          } else {
            console.log('User needs to pay for rehab plan generation');
            setIsLoading(false);
          }
        }
      } catch (error) {
        console.error('Error checking payment status:', error);
        setIsLoading(false);
        setError('Failed to check payment status. Please try again later.');
      }
    };

    checkPaymentAndGeneratePlan();
  }, []);

  const renderExerciseList = (exercises) => {
    if (!exercises || exercises.length === 0) {
      return (
        <div className="p-4 text-center bg-gray-50 dark:bg-gray-800 rounded-md">
          <p className="text-muted-foreground">No exercises found for this section.</p>
        </div>
      );
    }
    
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
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/placeholder.svg';
                    }}
                  />
                </div>
              )}
              <div className={`md:${exercise.gifUrl ? 'w-2/3' : 'w-full'} p-4`}>
                <h4 className="text-lg font-semibold flex items-center">
                  <Dumbbell className="w-5 h-5 mr-2 text-primary" />
                  {exercise.name || 'Exercise Name Missing'}
                </h4>
                {exercise.difficulty && (
                  <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                    Difficulty: {exercise.difficulty}
                  </div>
                )}
                <div className="grid grid-cols-3 gap-2 my-3">
                  <div className="bg-primary/10 rounded-md p-2 text-center">
                    <div className="text-xs text-gray-500 dark:text-gray-400">Sets</div>
                    <div className="font-bold">{exercise.sets || '3'}</div>
                  </div>
                  <div className="bg-primary/10 rounded-md p-2 text-center">
                    <div className="text-xs text-gray-500 dark:text-gray-400">Reps</div>
                    <div className="font-bold">{exercise.reps || '10'}</div>
                  </div>
                  <div className="bg-primary/10 rounded-md p-2 text-center">
                    <div className="text-xs text-gray-500 dark:text-gray-400">Rest</div>
                    <div className="font-bold">
                      {exercise.rest_time_seconds ? 
                        `${Math.floor(exercise.rest_time_seconds / 60)}:${(exercise.rest_time_seconds % 60).toString().padStart(2, '0')}` : 
                        '1:00'}
                    </div>
                  </div>
                </div>
                {(exercise.description || exercise.notes) && (
                  <div className="mt-3 text-sm">
                    <p>{exercise.description || exercise.notes || 'No description available.'}</p>
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

  if (error) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center">
            <AlertTriangle className="h-6 w-6 text-amber-500 mr-2" />
            Error generating plan
          </CardTitle>
          <CardDescription>
            {error}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="mb-4">This might be due to temporary service overload or technical issues.</p>
        </CardContent>
        <CardFooter className="flex flex-col sm:flex-row gap-4">
          <Button variant="outline" onClick={onReset} className="w-full sm:w-auto">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Change preferences
          </Button>
          <Button onClick={handleRetry} className="w-full sm:w-auto">
            <RefreshCw className="mr-2 h-4 w-4" />
            Try again
          </Button>
        </CardFooter>
      </Card>
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
          <div className="mt-4 flex flex-col sm:flex-row gap-4">
            <Button onClick={onReset}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Start over
            </Button>
            <Button onClick={handleRetry} variant="outline">
              <RefreshCw className="mr-2 h-4 w-4" />
              Try again
            </Button>
          </div>
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

  if (dayKeys.length === 0 && plan.rehab_sessions && plan.rehab_sessions.length > 0) {
    console.log('Creating day structure from rehab sessions');
    plan.days = {};
    
    plan.rehab_sessions.forEach((session, index) => {
      const dayKey = `day${index + 1}`;
      plan.days[dayKey] = {
        notes: `Day ${index + 1} exercises`,
        exercises: [{
          title: "Rehabilitation Session",
          exercises: session.exercises || []
        }]
      };
    });
  }

  if (!plan.days || Object.keys(plan.days).length === 0) {
    console.log('Creating fallback plan structure');
    plan.days = {
      day1: {
        notes: "Default rehabilitation exercises",
        exercises: [{
          title: "Exercises",
          exercises: plan.exercises || []
        }]
      }
    };
  }
  
  const updatedDayKeys = Object.keys(plan.days || {}).sort((a, b) => {
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
          {updatedDayKeys.map((day) => (
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
                  plan.rehab_sessions.flatMap(session => session.exercises || [])
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {updatedDayKeys.map((day) => {
          const dayData = plan.days?.[day];
          if (!dayData) return null;
          
          return (
            <TabsContent key={day} value={day} className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Day {day.replace('day', '')} - Exercise Program</CardTitle>
                  <CardDescription>
                    {dayData.notes || `Exercises for day ${day.replace('day', '')}`}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {dayData.exercises && dayData.exercises.map((group, i) => (
                    <div key={i} className="space-y-4">
                      <h3 className="text-lg font-medium">{group.title || 'Exercise Group'}</h3>
                      {renderExerciseList(group.exercises || [])}
                    </div>
                  ))}
                  
                  {!dayData.exercises && (
                    <div className="p-4 text-center bg-gray-50 dark:bg-gray-800 rounded-md">
                      <p className="text-muted-foreground">No exercises found for this day.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
};
