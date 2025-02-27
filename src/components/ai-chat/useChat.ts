
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Message, ChatState } from './types';

export const useChat = () => {
  const [state, setState] = useState<ChatState>({
    messages: [],
    isLoading: false,
    error: null,
  });

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim()) return;

    const userMessage: Message = {
      role: 'user',
      content,
    };

    // Atualiza o estado para mostrar a mensagem do usuário
    setState(prev => ({
      ...prev,
      messages: [...prev.messages, userMessage],
      isLoading: true,
      error: null,
    }));

    try {
      // Cria o array de mensagens para enviar para a API
      const messagesForApi = [
        // Inclui o histórico de mensagens para manter o contexto
        ...state.messages,
        // Adiciona a nova mensagem do usuário
        userMessage,
      ];

      // Faz a chamada para a Edge Function
      const { data, error } = await supabase.functions.invoke('llama-chat', {
        body: { 
          messages: messagesForApi,
          systemPrompt: 'Você é um assistente de saúde útil e informativo chamado Mais Saúde. Você fornece informações sobre saúde, nutrição, exercícios e bem-estar. Você responde de forma simpática, clara e concisa, sempre em português do Brasil. Você não é um médico e incentiva os usuários a consultar profissionais de saúde para questões médicas específicas.'
        },
      });

      if (error) throw new Error(error.message);

      // Extrai a resposta da API e adiciona como mensagem do assistente
      const assistantMessage: Message = {
        role: 'assistant',
        content: data.choices[0].message.content,
      };

      // Atualiza o estado com a resposta
      setState(prev => ({
        ...prev,
        messages: [...prev.messages, assistantMessage],
        isLoading: false,
      }));
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      }));
    }
  }, [state.messages]);

  const resetChat = useCallback(() => {
    setState({
      messages: [],
      isLoading: false,
      error: null,
    });
  }, []);

  return {
    messages: state.messages,
    isLoading: state.isLoading,
    error: state.error,
    sendMessage,
    resetChat,
  };
};
