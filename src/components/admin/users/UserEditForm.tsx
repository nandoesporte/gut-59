
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { User } from "../types";

interface UserEditFormProps {
  user: User;
  onUpdate: (updatedUser: User) => void;
  onCancel: () => void;
}

export const UserEditForm = ({ user, onUpdate, onCancel }: UserEditFormProps) => {
  return (
    <Card className="p-4">
      <h3 className="text-lg font-semibold mb-4">Editar Usuário</h3>
      <div className="space-y-4">
        <div>
          <label className="block text-sm mb-1">Nome</label>
          <Input
            value={user.name || ''}
            onChange={(e) => onUpdate({ ...user, name: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Idade</label>
          <Input
            type="number"
            value={user.age || ''}
            onChange={(e) => onUpdate({ ...user, age: parseInt(e.target.value) || null })}
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Condições de Saúde</label>
          <Textarea
            value={user.health_conditions || ''}
            onChange={(e) => onUpdate({ ...user, health_conditions: e.target.value })}
          />
        </div>
        <div className="flex justify-end space-x-2">
          <Button variant="outline" onClick={onCancel}>Cancelar</Button>
          <Button onClick={() => onUpdate(user)}>Salvar Alterações</Button>
        </div>
      </div>
    </Card>
  );
};
