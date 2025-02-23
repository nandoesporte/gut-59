
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const Auth = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Check if user is already logged in
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate("/");
      }
    };
    
    checkUser();

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === "SIGNED_IN" && session) {
          navigate("/");
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        
        toast({
          title: "Login realizado",
          description: "Bem-vindo de volta!",
        });
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;
        
        toast({
          title: "Cadastro realizado",
          description: "Verifique seu email para confirmar o cadastro.",
        });
      }
    } catch (error: any) {
      console.error("Authentication error:", error);
      let errorMessage = "Ocorreu um erro durante a autenticação.";
      
      if (error.message.includes("Email not confirmed")) {
        errorMessage = "Por favor, confirme seu email antes de fazer login.";
      } else if (error.message.includes("Invalid login credentials")) {
        errorMessage = "Email ou senha incorretos.";
      } else if (error.message.includes("User already registered")) {
        errorMessage = "Este email já está cadastrado.";
      }
      
      toast({
        title: "Erro na autenticação",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-50 to-primary-100 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8 bg-white rounded-2xl shadow-xl p-8">
        <div className="flex flex-col items-center gap-4">
          <img 
            src="/lovable-uploads/9456a3bf-9bc8-45d6-9105-dd939e3362f5.png" 
            alt="Mais Saúde" 
            className="h-16 w-auto"
          />
          <div className="text-center">
            <h1 className="text-3xl font-bold text-primary-500">
              Mais Saúde
            </h1>
            <p className="text-gray-600 mt-2">
              Tecnologia e personalização para resultados reais, em tempo recorde
            </p>
          </div>
        </div>

        <form onSubmit={handleAuth} className="mt-8 space-y-6">
          <div className="space-y-4">
            <div>
              <Input
                type="email"
                placeholder="Seu email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-gray-50 border-gray-200 focus:border-primary-400 focus:ring-primary-400"
              />
            </div>
            <div>
              <Input
                type="password"
                placeholder="Sua senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-gray-50 border-gray-200 focus:border-primary-400 focus:ring-primary-400"
                minLength={6}
              />
            </div>
          </div>

          <Button
            type="submit"
            className="w-full bg-primary-500 hover:bg-primary-600 text-white font-semibold py-3 rounded-lg transition-colors"
            disabled={isLoading}
          >
            {isLoading
              ? "Carregando..."
              : isLogin
              ? "Entrar"
              : "Criar conta"}
          </Button>

          <div className="text-center">
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm text-primary-600 hover:text-primary-500 font-medium"
            >
              {isLogin
                ? "Não tem uma conta? Cadastre-se"
                : "Já tem uma conta? Entre"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Auth;
