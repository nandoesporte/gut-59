
import { useState } from "react";

export const useWorkoutPayment = () => {
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isPaymentEnabled, setIsPaymentEnabled] = useState(false); // Always disabled
  
  // Simplified mock implementation that always indicates paid status
  return {
    isPaymentDialogOpen,
    setIsPaymentDialogOpen,
    isPaymentEnabled: false, // Always disabled
    isProcessingPayment: false,
    hasPaid: true, // Always returns true to bypass payment
    currentPrice: 0,
    handlePaymentAndContinue: async () => {} // Empty function
  };
};
