import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Bell, CheckCheck, CircleAlert, Info, Send } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/context/AuthContext";
import { listMyNotifications, markAllMyNotificationsRead, markMyNotificationRead, type UserNotification } from "@/services/notifications";

const severityMeta: Record<UserNotification["severity"], { label: string; icon: typeof Info }> = {
  info: { label: "Info", icon: Info },
  warning: { label: "Accion pendiente", icon: CircleAlert },
  action: { label: "Importante", icon: Send },
};

const NotificationCenter = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, isGuest } = useAuth();
  const [open, setOpen] = useState(false);

  const notificationsQuery = useQuery({
    queryKey: ["user_notifications"],
    queryFn: () => listMyNotifications(25),
    enabled: Boolean(user?.id) && !isGuest,
  });

  const markReadMutation = useMutation({
    mutationFn: (notificationId: string) => markMyNotificationRead(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user_notifications"] });
    },
  });

  const markAllMutation = useMutation({
    mutationFn: () => markAllMyNotificationsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user_notifications"] });
    },
  });

  const notifications = notificationsQuery.data ?? [];
  const unreadCount = notifications.filter((item) => !item.read_at).length;

  const handleNotificationAction = async (notification: UserNotification) => {
    if (!notification.read_at) {
      await markReadMutation.mutateAsync(notification.id);
    }

    if (notification.action_path) {
      setOpen(false);
      navigate(notification.action_path);
    }
  };

  if (isGuest || !user?.id) {
    return null;
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          className="relative flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-secondary-foreground"
          aria-label="Centro de notificaciones"
          title="Centro de notificaciones"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 ? (
            <span className="absolute right-1.5 top-1.5 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          ) : null}
        </button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[min(100vw,28rem)] p-0 sm:max-w-md">
        <div className="flex h-full flex-col">
          <SheetHeader className="border-b border-border/60 px-6 py-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <SheetTitle>Notificaciones</SheetTitle>
                <SheetDescription>Recordatorios internos, avisos operativos y futuras comunicaciones dentro de la app.</SheetDescription>
              </div>
              {unreadCount > 0 ? <Badge variant="default">{unreadCount} sin leer</Badge> : null}
            </div>
          </SheetHeader>

          <div className="flex items-center justify-between border-b border-border/60 px-6 py-3">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Centro de mensajes</p>
            <Button
              variant="ghost"
              size="sm"
              disabled={unreadCount === 0 || markAllMutation.isPending}
              onClick={() => markAllMutation.mutate()}
            >
              <CheckCheck className="mr-2 h-4 w-4" />
              Marcar todas
            </Button>
          </div>

          <ScrollArea className="min-h-0 flex-1">
            <div className="space-y-3 p-6">
              {notificationsQuery.isLoading ? (
                <div className="space-y-3">
                  <div className="h-24 rounded-2xl border border-border/60 bg-muted/20" />
                  <div className="h-24 rounded-2xl border border-border/60 bg-muted/20" />
                </div>
              ) : notifications.length > 0 ? (
                notifications.map((notification) => {
                  const severity = severityMeta[notification.severity];
                  const SeverityIcon = severity.icon;

                  return (
                    <div
                      key={notification.id}
                      className={`rounded-2xl border p-4 ${notification.read_at ? "border-border/60 bg-muted/10" : "border-primary/30 bg-primary/5"}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <SeverityIcon className="h-4 w-4 text-primary" />
                            <p className="text-sm font-semibold">{notification.title}</p>
                            {!notification.read_at ? <Badge variant="default">Nueva</Badge> : null}
                          </div>
                          <p className="text-sm text-muted-foreground">{notification.body}</p>
                        </div>
                        <Badge variant="outline">{severity.label}</Badge>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span>{notification.created_at ? format(new Date(notification.created_at), "yyyy-MM-dd HH:mm") : "--"}</span>
                        <span>{notification.sender_email ? `por ${notification.sender_email}` : "sistema interno"}</span>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        {notification.action_path ? (
                          <Button
                            size="sm"
                            onClick={() => void handleNotificationAction(notification)}
                            disabled={markReadMutation.isPending}
                          >
                            {notification.action_label ?? "Ir ahora"}
                          </Button>
                        ) : null}
                        {!notification.read_at ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => markReadMutation.mutate(notification.id)}
                            disabled={markReadMutation.isPending}
                          >
                            Marcar leida
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="rounded-2xl border border-dashed border-border/60 p-6 text-sm text-muted-foreground">
                  Aun no tienes notificaciones. Este centro ya queda listo para recordatorios, avisos operativos y mensajes futuros.
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default NotificationCenter;
