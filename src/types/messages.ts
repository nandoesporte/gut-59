
export interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  type: 'nutricionista' | 'personal' | 'mental_health';
  read: boolean;
  profiles: {
    name: string | null;
    photo_url: string | null;
  } | null;
}
