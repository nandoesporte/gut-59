
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { BellDot } from "lucide-react";

interface User {
  id: string;
  name: string | null;
  photo_url: string | null;
  unread_messages?: number;
}

interface UserListProps {
  users: User[];
  selectedUser: string | null;
  onUserSelect: (userId: string) => void;
}

export const UserList = ({ users, selectedUser, onUserSelect }: UserListProps) => {
  return (
    <div className="w-1/3 border-r pr-4">
      <h3 className="text-lg font-medium mb-4">Usuários</h3>
      <div className="space-y-2">
        {users.map((user) => (
          <div
            key={user.id}
            onClick={() => onUserSelect(user.id)}
            className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer ${
              selectedUser === user.id ? 'bg-primary-50' : 'hover:bg-gray-50'
            }`}
          >
            <div className="relative">
              <Avatar className="w-10 h-10">
                <AvatarImage src={user.photo_url || undefined} alt={user.name || ''} />
                <AvatarFallback>
                  {user.name?.[0]?.toUpperCase() || '?'}
                </AvatarFallback>
              </Avatar>
              {user.unread_messages && user.unread_messages > 0 && (
                <div className="absolute -top-1 -right-1">
                  <BellDot className="h-4 w-4 text-primary-500" />
                </div>
              )}
            </div>
            <span className="font-medium">{user.name || 'Usuário sem nome'}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
