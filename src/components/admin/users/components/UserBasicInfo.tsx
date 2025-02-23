
import { User } from "../../types";

interface UserBasicInfoProps {
  user: User;
}

export const UserBasicInfo = ({ user }: UserBasicInfoProps) => {
  return (
    <div>
      <h3 className="text-lg font-semibold mb-2">Informações Básicas</h3>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Nome</p>
          <p>{user.name || '-'}</p>
        </div>
        <div>
          <p className="text-sm font-medium text-muted-foreground">Email</p>
          <p>{user.email || '-'}</p>
        </div>
      </div>
    </div>
  );
};
