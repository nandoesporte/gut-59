
export interface Message {
  role: "user" | "assistant";
  content: string;
}

export interface ChatState {
  messages: Message[];
  input: string;
  isLoading: boolean;
  errorMessage: string | null;
  retryCount: number;
  networkError: boolean;
  apiUrlChecked: boolean;
  useGroqFallback: boolean;
  apiKey: string | null;
}
