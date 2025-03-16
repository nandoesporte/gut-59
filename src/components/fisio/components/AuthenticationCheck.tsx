
import React from 'react';
import { Stethoscope, LogIn } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface AuthenticationCheckProps {
  isAuthenticated: boolean | null;
  isCheckingAuth: boolean;
}

export const AuthenticationCheck: React.FC<AuthenticationCheckProps> = ({ 
  isAuthenticated,
  isCheckingAuth 
}) => {
  const navigate = useNavigate();

  const handleLoginClick = () => {
    navigate('/login?redirect=/fisio');
  };

  // Show loading state while checking authentication
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <div className="container mx-auto px-4 py-6 flex items-center justify-center h-screen">
          <p className="text-center text-lg text-muted-foreground">Verificando autenticação...</p>
        </div>
      </div>
    );
  }

  // Show login prompt if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <div className="container mx-auto px-4 py-6 flex items-center justify-center h-screen">
          <Card className="w-full max-w-md">
            <CardContent className="p-6 text-center space-y-6">
              <div className="inline-flex items-center justify-center p-2 bg-primary/10 rounded-full">
                <Stethoscope className="w-6 h-6 text-primary" />
              </div>
              <h2 className="text-2xl font-bold">Autenticação Necessária</h2>
              <p className="text-muted-foreground">
                Você precisa estar logado para acessar os planos de fisioterapia personalizados.
              </p>
              <Button onClick={handleLoginClick} size="lg" className="gap-2">
                <LogIn className="w-4 h-4" />
                Fazer Login
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return null;
};
