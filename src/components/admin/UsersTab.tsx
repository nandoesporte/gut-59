
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { User, UserDetails } from "./types";
import { UsersList } from "./users/UsersList";
import { UserEditForm } from "./users/UserEditForm";
import { UserDetailsDialog } from "./users/UserDetailsDialog";

export const UsersTab = () => {
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserDetails | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const { data: users, isLoading: usersLoading, refetch } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      // First get the admin's user ID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get all profiles and their unread message counts
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select(`
          *,
          unread_messages:messages!messages_receiver_id_fkey(count)
        `)
        .neq('id', user.id)
        .eq('messages.read', false)
        .eq('messages.receiver_id', 'id');

      if (profilesError) throw profilesError;

      return profiles.map(profile => ({
        ...profile,
        unread_messages: profile.unread_messages?.[0]?.count || 0
      }));
    },
  });

  const handleUpdateUser = async () => {
    if (!editingUser) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          name: editingUser.name,
          age: editingUser.age,
          health_conditions: editingUser.health_conditions,
        })
        .eq('id', editingUser.id);

      if (error) throw error;

      toast.success('Usuário atualizado com sucesso');
      setEditingUser(null);
      refetch();
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error('Erro ao atualizar usuário');
    }
  };

  const handleViewDetails = async (user: User) => {
    try {
      const [progress, meals, waterIntake] = await Promise.all([
        supabase
          .from('education_progress')
          .select('*')
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false }),
        supabase
          .from('meals')
          .select('*')
          .eq('user_id', user.id)
          .order('meal_date', { ascending: false }),
        supabase
          .from('water_intake')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
      ]);

      if (progress.error) throw progress.error;
      if (meals.error) throw meals.error;
      if (waterIntake.error) throw waterIntake.error;

      setSelectedUser({
        ...user,
        meals: meals.data || [],
        symptoms: [],
        water_intake: waterIntake.data || [],
        education_progress: progress.data || [],
      });
      setShowDetails(true);
    } catch (error) {
      console.error('Error fetching user details:', error);
      toast.error('Erro ao carregar detalhes do usuário');
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedUser) return;

    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não encontrado");

      const { error } = await supabase
        .from('messages')
        .insert({
          content: newMessage.trim(),
          sender_id: user.id,
          receiver_id: selectedUser.id,
        });

      if (error) throw error;

      setNewMessage("");
      toast.success('Mensagem enviada com sucesso');
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Erro ao enviar mensagem');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {editingUser && (
        <UserEditForm
          user={editingUser}
          onUpdate={handleUpdateUser}
          onCancel={() => setEditingUser(null)}
        />
      )}

      <UserDetailsDialog
        user={selectedUser}
        open={showDetails}
        onOpenChange={setShowDetails}
        onEdit={() => {
          setEditingUser(selectedUser);
          setShowDetails(false);
        }}
        onSendMessage={sendMessage}
        newMessage={newMessage}
        onMessageChange={setNewMessage}
        loading={loading}
      />

      <UsersList
        users={users}
        isLoading={usersLoading}
        onEdit={setEditingUser}
        onViewDetails={handleViewDetails}
      />
    </div>
  );
};
