
import { ChatContainer } from "@/components/ai-chat/ChatContainer";

const AIChat = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Assistente de Saúde</h1>
        <p className="mb-6 text-muted-foreground">
          Converse com nosso assistente de saúde para tirar dúvidas sobre alimentação, 
          exercícios físicos e bem-estar. Nosso assistente utiliza tecnologia avançada 
          de IA para responder suas perguntas.
        </p>
        <ChatContainer />
      </div>
    </div>
  );
};

export default AIChat;
