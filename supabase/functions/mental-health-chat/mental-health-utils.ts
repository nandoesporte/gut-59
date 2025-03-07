
// This file contains utility functions for the mental health features
// It can be imported by other edge functions that need to interact with mental health data

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.37.0';

// Get Supabase credentials from environment variables
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Create a Supabase client
export const supabase = createClient(supabaseUrl, supabaseKey);

export interface EmotionLog {
  id?: string;
  user_id: string;
  emotion: string;
  created_at?: string;
}

export interface BreathingSession {
  id?: string;
  user_id: string;
  duration: number;
  technique?: string;
  created_at?: string;
}

export interface ChatMessage {
  id?: string;
  user_id: string;
  content: string;
  role: 'user' | 'assistant';
  created_at?: string;
}

// Function to save a user's emotion log
export async function saveEmotionLog(emotionLog: EmotionLog) {
  const { data, error } = await supabase
    .from('emotion_logs')
    .insert(emotionLog)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Function to save a breathing session
export async function saveBreathingSession(session: BreathingSession) {
  const { data, error } = await supabase
    .from('breathing_sessions')
    .insert(session)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Function to save a chat message
export async function saveChatMessage(message: ChatMessage) {
  const { data, error } = await supabase
    .from('mental_chat_messages')
    .insert(message)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Get the latest emotion log for a user
export async function getLatestEmotionLog(userId: string) {
  const { data, error } = await supabase
    .from('emotion_logs')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}

// Get the latest breathing session for a user
export async function getLatestBreathingSession(userId: string) {
  const { data, error } = await supabase
    .from('breathing_sessions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}
