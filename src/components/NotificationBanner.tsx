import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BellRing } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { listMyNotifications, markMyNotificationRead } from "@/services/notifications";

const NotificationBanner = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, isGuest } = useAuth();

  const notificationsQuery = useQuery({
    queryKey: ["user_notifications"],
    queryFn: () => listMyNotifications(10),
    enabled: Boolean(user?.id) && !isGuest,
  });

  const markReadMutation = useMutation({
    mutationFn: (notificationId: string) => markMyNotificationRead(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user_notifications"] });
    },
  });

  const firstUnread = useMemo(
    () => (notificationsQuery.data ?? []).find((notification) => !notification.read_at) ?? null,
    [notificationsQuery.data],
  );

  if (isGuest || !user?.id || !firstUnread) {
    return null;
  }

  const handleAction = async () => {
    await markReadMutation.mutateAsync(firstUnread.id);

    if (firstUnread.action_path) {
      navigate(firstUnread.action_path);
    }
  };

  return (
    <div className="border-b border-primary/15 bg-primary/5 px-4 py-3 md:px-8">
      <Alert className="mx-auto max-w-7xl border-primary/20 bg-transparent">
        <BellRing className="h-4 w-4 text-primary" />
        <AlertTitle>{firstUnread.title}</AlertTitle>
        <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <span>{firstUnread.body}</span>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => void handleAction()} disabled={markReadMutation.isPending}>
              {firstUnread.action_label ?? "Revisar"}
            </Button>
            <Button variant="outline" size="sm" onClick={() => markReadMutation.mutate(firstUnread.id)} disabled={markReadMutation.isPending}>
              Marcar leida
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    </div>
  );
};

export default NotificationBanner;
