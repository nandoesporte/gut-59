
import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle, Stethoscope, Clock, X } from "lucide-react";
import { motion } from "framer-motion";

interface ProfessionalAnalysisNotificationProps {
  isOpen: boolean;
  onClose: () => void;
  planType?: "workout" | "rehab";
}

export const ProfessionalAnalysisNotification = ({
  isOpen,
  onClose,
  planType = "workout"
}: ProfessionalAnalysisNotificationProps) => {
  const [step, setStep] = useState(0);

  const steps = [
    {
      icon: CheckCircle,
      title: planType === "workout" ? "Treino Gerado com Sucesso!" : "Plano de Reabilitação Gerado!",
      description: planType === "workout" 
        ? "Seu plano de treino personalizado foi criado com base nas suas preferências e objetivos."
        : "Seu plano de reabilitação personalizado foi criado com base na sua condição e necessidades.",
      color: "text-green-500"
    },
    {
      icon: Stethoscope,
      title: "Análise Profissional em Andamento",
      description: planType === "workout"
        ? "Nossos educadores físicos qualificados irão revisar seu plano para garantir máxima eficácia e segurança."
        : "Nossos fisioterapeutas qualificados irão revisar seu plano para garantir adequação e segurança.",
      color: "text-blue-500"
    },
    {
      icon: Clock,
      title: "Revisão em até 24h",
      description: "Você receberá feedback personalizado e possíveis ajustes em breve. Enquanto isso, pode começar a seguir o plano gerado.",
      color: "text-amber-500"
    }
  ];

  useEffect(() => {
    if (isOpen) {
      const timers = [
        setTimeout(() => setStep(1), 2000),
        setTimeout(() => setStep(2), 4000),
      ];
      
      return () => timers.forEach(clearTimeout);
    } else {
      setStep(0);
    }
  }, [isOpen]);

  const currentStep = steps[step];
  const Icon = currentStep.icon;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-white dark:bg-gray-900 border-0 shadow-2xl">
        <DialogHeader className="relative">
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-0 top-0 h-6 w-6"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>
        
        <div className="flex flex-col items-center text-center p-6 space-y-6">
          <motion.div
            key={step}
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ 
              type: "spring", 
              stiffness: 260, 
              damping: 20,
              duration: 0.6 
            }}
            className="relative"
          >
            <div className={`p-4 rounded-full bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 shadow-lg`}>
              <Icon className={`w-12 h-12 ${currentStep.color}`} />
            </div>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3 }}
              className="absolute -top-1 -right-1 w-6 h-6 bg-primary rounded-full flex items-center justify-center"
            >
              <span className="text-xs font-bold text-white">{step + 1}</span>
            </motion.div>
          </motion.div>

          <motion.div
            key={`content-${step}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="space-y-3"
          >
            <DialogTitle className="text-xl font-bold text-gray-900 dark:text-gray-100">
              {currentStep.title}
            </DialogTitle>
            <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed max-w-sm mx-auto">
              {currentStep.description}
            </p>
          </motion.div>

          <div className="flex space-x-2">
            {steps.map((_, index) => (
              <motion.div
                key={index}
                initial={{ scale: 0.8, opacity: 0.3 }}
                animate={{ 
                  scale: index === step ? 1.2 : 0.8,
                  opacity: index <= step ? 1 : 0.3,
                  backgroundColor: index <= step ? "rgb(59, 130, 246)" : "rgb(209, 213, 219)"
                }}
                transition={{ duration: 0.3 }}
                className="w-3 h-3 rounded-full"
              />
            ))}
          </div>

          {step === steps.length - 1 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="pt-4"
            >
              <Button 
                onClick={onClose}
                className="bg-gradient-to-r from-primary to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white shadow-lg hover:shadow-xl transition-all duration-300"
              >
                Entendi, Obrigado!
              </Button>
            </motion.div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
