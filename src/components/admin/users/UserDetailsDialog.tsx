
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { UserBasicInfo } from "./components/UserBasicInfo";
import { PaymentSettings } from "./components/PaymentSettings";
import { MessageInput } from "./components/MessageInput";
import { UserDetailsDialogProps } from "./types/dialog-types";

export const UserDetailsDialog = ({
  user,
  open,
  onOpenChange,
  onEdit,
  onSendMessage,
  newMessage = "",
  onMessageChange,
  loading = false,
}: UserDetailsDialogProps) => {
  if (!user) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Detalhes do Usuário</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <UserBasicInfo user={user} />

          <Separator />

          <PaymentSettings user={user} />

          {onEdit && (
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={onEdit}
              >
                Editar
              </Button>
            </div>
          )}

          {onSendMessage && onMessageChange && (
            <div className="space-y-4">
              <Separator />
              <MessageInput
                newMessage={newMessage}
                onMessageChange={onMessageChange}
                onSendMessage={onSendMessage}
                loading={loading}
              />
            </div>
          )}

          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Fechar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
