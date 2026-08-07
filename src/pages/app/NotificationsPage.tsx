import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, CheckCheck, Archive, Trash2, Inbox } from 'lucide-react';
import { useNotifications } from '@/context/NotificationContext';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { PageHeader } from '@/components/ui/PageHeader';

const TYPE_VARIANT: Record<string, { variant: 'success' | 'warning' | 'error' | 'info' | 'neutral'; label: string }> = {
  system: { variant: 'info', label: 'System' },
  account: { variant: 'neutral', label: 'Account' },
  reviews: { variant: 'success', label: 'Reviews' },
  screenplays: { variant: 'info', label: 'Screenplays' },
  industry_requests: { variant: 'warning', label: 'Industry' },
  announcements: { variant: 'info', label: 'Announcement' },
};

export function NotificationsPage() {
  const { notifications, markAsRead, markAllAsRead, archiveNotification, dismissNotification, unreadCount } = useNotifications();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const filtered = filter === 'unread' ? notifications.filter((n) => !n.is_read) : notifications;

  return (
    <div>
      <PageHeader
        label="Inbox"
        title="Notifications"
        description={unreadCount > 0 ? `You have ${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}.` : 'You are all caught up.'}
        actions={
          <div className="flex items-center gap-2">
            <div className="flex  rounded-xl border border-border bg-surface p-0.5">
              <button
                onClick={() => setFilter('all')}
                className={` px-3 py-1.5 text-xs font-medium transition-colors ${filter === 'all' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              >
                All
              </button>
              <button
                onClick={() => setFilter('unread')}
                className={` px-3 py-1.5 text-xs font-medium transition-colors ${filter === 'unread' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              >
                Unread
              </button>
            </div>
            <Button variant="outline" size="sm" onClick={markAllAsRead} disabled={unreadCount === 0}>
              <CheckCheck className="h-4 w-4" /> Mark all read
            </Button>
          </div>
        }
      />

      <div className="space-y-2">
        {filtered.length === 0 ? (
          <EmptyState
            icon={<Inbox className="h-7 w-7" />}
            title="No notifications"
            description={filter === 'unread' ? 'You have no unread notifications.' : 'You have no notifications yet.'}
            tone="encouraging"
          />
        ) : (
          filtered.map((notif) => {
            const typeInfo = TYPE_VARIANT[notif.type] || TYPE_VARIANT.system;
            return (
              <div
                key={notif.id}
                className={`flex items-start gap-3  border bg-surface p-4 transition-colors ${notif.is_read ? 'border-border' : 'border-primary/30 bg-primary/5'}`}
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center  bg-secondary text-secondary-foreground">
                  <Bell className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-foreground">{notif.title}</p>
                    {!notif.is_read && <span className="h-2 w-2  bg-accent" />}
                  </div>
                  {notif.body && <p className="mt-1 text-sm text-muted-foreground">{notif.body}</p>}
                  <div className="mt-2 flex items-center gap-2">
                    <StatusBadge status={typeInfo.label} variant={typeInfo.variant} />
                    <span className="font-mono text-2xs uppercase tracking-wider text-muted-foreground">
                      {new Date(notif.created_at).toLocaleString()}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {!notif.is_read && (
                    <button onClick={() => markAsRead(notif.id)} className=" p-1.5 text-muted-foreground hover:bg-surface-hover hover:text-foreground" title="Mark as read">
                      <CheckCheck className="h-4 w-4" />
                    </button>
                  )}
                  {notif.link && (
                    <Link to={notif.link} className=" p-1.5 text-muted-foreground hover:bg-surface-hover hover:text-foreground" title="Open">
                      <Bell className="h-4 w-4" />
                    </Link>
                  )}
                  <button onClick={() => archiveNotification(notif.id)} className=" p-1.5 text-muted-foreground hover:bg-surface-hover hover:text-foreground" title="Archive">
                    <Archive className="h-4 w-4" />
                  </button>
                  <button onClick={() => dismissNotification(notif.id)} className=" p-1.5 text-muted-foreground hover:bg-surface-hover hover:text-error" title="Dismiss">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
