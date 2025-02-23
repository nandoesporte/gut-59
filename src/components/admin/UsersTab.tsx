
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
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const { data: users, isLoading: usersLoading, refetch } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select(`
          *,
          unread_messages:messages!messages_receiver_id_fkey(count)
        `)
        .neq('id', user.id)
        .eq('messages.read', false);

      if (profilesError) throw profilesError;

      return profiles.map(profile => ({
        ...profile,
        unread_messages: profile.unread_messages?.[0]?.count || 0,
        email: null // Add default email value
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
      // Get user's auth details to get email
      const { data: authUser, error: authError } = await supabase
        .from('auth.users')
        .select('email')
        .eq('id', user.id)
        .single();

      if (authError) {
        console.error('Error fetching user email:', authError);
      }

      setSelectedUser({
        ...user,
        email: authUser?.email || null
      });
      setShowDetails(true);
    } catch (error) {
      console.error('Error fetching user details:', error);
      toast.error('Erro ao carregar detalhes do usuário');
    }
  };

  const handleSendMessage = async () => {
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

      {selectedUser && (
        <UserDetailsDialog
          user={selectedUser}
          open={showDetails}
          onOpenChange={setShowDetails}
          onEdit={() => {
            setEditingUser(selectedUser);
            setShowDetails(false);
          }}
          onSendMessage={handleSendMessage}
          newMessage={newMessage}
          onMessageChange={setNewMessage}
          loading={loading}
        />
      )}

      <UsersList
        users={users || []}
        isLoading={usersLoading}
        onEdit={setEditingUser}
        onViewDetails={handleViewDetails}
      />
    </div>
  );
};
