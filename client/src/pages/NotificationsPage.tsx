import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { Button } from '../components/ui/button';
import { formatDistanceToNow, format } from 'date-fns';
import Joyride, { Step } from 'react-joyride';

interface Notification {
  id: string;
  type: string;
  subject: string;
  content: string;
  status: string;
  channel: string;
  created_at: string;
  read_at?: string;
  case_id?: string;
  mark_name?: string;
  client_name?: string;
}

const NOTIFICATION_TYPES: Record<string, { label: string; icon: string }> = {
  'DEADLINE_REMINDER': { label: 'Deadline Reminder', icon: '⏰' },
  'STATUS_CHANGE': { label: 'Status Change', icon: '📋' },
  'OPPOSITION_ALERT': { label: 'Opposition Alert', icon: '⚠️' },
  'INVOICE_DUE': { label: 'Invoice Due', icon: '💰' },
  'STAGE_CHANGE': { label: 'Stage Change', icon: '📈' },
  'NOTE_ADDED': { label: 'Note Added', icon: '📝' }
};

const tourSteps: Step[] = [
  {
    target: '#notifications-header',
    content: 'Welcome to the Notifications System! This page shows all your alerts for deadlines, status changes, oppositions, and more.',
    placement: 'bottom',
    disableBeacon: true,
  },
  {
    target: '#filter-tabs',
    content: 'Filter between All Notifications and Unread Only to focus on what needs your attention.',
    placement: 'bottom' as const,
  },
  {
    target: '#mark-all-read',
    content: 'Mark all as read to clear your notification queue with one click.',
    placement: 'bottom' as const,
  },
  {
    target: '#notification-list',
    content: 'Click any notification to jump to the related case. Unread notifications are highlighted with a blue border.',
    placement: 'right' as const,
  },
  {
    target: '#notification-item',
    content: 'Each notification shows the type, subject, and when it was received. Click to view the case details.',
    placement: 'right' as const,
  },
];

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const [runTour, setRunTour] = useState(false);
  const api = useApi();
  const navigate = useNavigate();

  useEffect(() => {
    loadNotifications();
    // Check for tour param
    if (searchParams.get('tour') === 'true') {
      setRunTour(true);
      // Clean up URL
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('tour');
      setSearchParams(newParams);
    }
  }, [filter, searchParams]);

  const loadNotifications = async () => {
    try {
      const params = filter === 'unread' ? '?unread=true' : '';
      const data = await api.get(`/notifications${params}`);
      setNotifications(data);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      loadNotifications();
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      loadNotifications();
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read_at) {
      markAsRead(notification.id);
    }
    if (notification.case_id) {
      navigate(`/trademarks/${notification.case_id}`);
    }
  };

  const getNotificationInfo = (type: string) => {
    return NOTIFICATION_TYPES[type] || { label: type.replace(/_/g, ' '), icon: '🔔' };
  };

  const unreadCount = notifications.filter(n => !n.read_at).length;

  if (loading) {
    return (
      <div className="w-full animate-pulse max-w-4xl mx-auto p-6">
        {/* Header Skeleton */}
        <div className="flex items-center justify-between mb-6">
          <div className="space-y-2">
            <div className="h-8 w-48 bg-[var(--eai-border)]/50 rounded-lg" />
            <div className="h-4 w-32 bg-[var(--eai-border)]/30 rounded" />
          </div>
          <div className="h-10 w-32 bg-[var(--eai-border)]/50 rounded-xl" />
        </div>

        {/* Filter Tabs Skeleton */}
        <div className="flex gap-2 mb-6">
          <div className="h-10 w-40 bg-[var(--eai-border)]/50 rounded-xl" />
          <div className="h-10 w-32 bg-[var(--eai-border)]/50 rounded-xl" />
        </div>

        {/* Notification List Skeleton */}
        <div className="space-y-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="apple-card p-4">
              <div className="flex items-start gap-4">
                <div className="h-8 w-8 bg-[var(--eai-border)]/40 rounded" />
                <div className="flex-1 space-y-2">
                  <div className="flex justify-between">
                    <div className="h-4 w-24 bg-[var(--eai-border)]/40 rounded" />
                    <div className="h-4 w-20 bg-[var(--eai-border)]/30 rounded" />
                  </div>
                  <div className="h-5 w-3/4 bg-[var(--eai-border)]/40 rounded" />
                  <div className="h-4 w-full bg-[var(--eai-border)]/30 rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <Joyride
        steps={tourSteps}
        run={runTour}
        continuous={true}
        showProgress={true}
        showSkipButton={true}
        callback={(data: { status: string }) => {
          if (['finished', 'skipped'].includes(data.status)) {
            setRunTour(false);
          }
        }}
        styles={{
          options: {
            primaryColor: 'var(--eai-primary)',
            textColor: '#1C1C1E',
            zIndex: 10000,
            arrowColor: '#fff',
            backgroundColor: '#fff',
            overlayColor: 'rgba(0, 0, 0, 0.5)',
          },
          tooltipContainer: {
            textAlign: 'left',
            borderRadius: '12px',
            fontFamily: 'inherit',
          },
          buttonNext: {
            borderRadius: '0px',
            fontWeight: 'bold',
            fontSize: '13px',
          },
          buttonBack: {
            marginRight: '10px',
            fontWeight: 'bold',
            fontSize: '13px',
          },
          buttonSkip: {
            fontSize: '13px',
            fontWeight: 'bold',
          }
        }}
      />
      {/* Header */}
      <div id="notifications-header" className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--eai-text)]">Notifications</h1>
          <p className="text-[var(--eai-text-secondary)]">
            {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}` : 'All caught up!'}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button id="mark-all-read" variant="outline" onClick={markAllAsRead}>
            Mark all as read
          </Button>
        )}
      </div>

      {/* Filters */}
      <div id="filter-tabs" className="flex gap-2 mb-6">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
            filter === 'all'
              ? 'bg-[var(--eai-primary)] text-white'
              : 'bg-[var(--eai-surface)] text-[var(--eai-text)] hover:bg-[var(--eai-bg)] border border-[var(--eai-border)]'
          }`}
        >
          All Notifications
        </button>
        <button
          onClick={() => setFilter('unread')}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
            filter === 'unread'
              ? 'bg-[var(--eai-primary)] text-white'
              : 'bg-[var(--eai-surface)] text-[var(--eai-text)] hover:bg-[var(--eai-bg)] border border-[var(--eai-border)]'
          }`}
        >
          Unread Only {unreadCount > 0 && `(${unreadCount})`}
        </button>
      </div>

      {/* Notifications List */}
      <div id="notification-list">
      {notifications.length === 0 ? (
        <div className="text-center py-16 bg-[var(--eai-surface)] rounded-xl border border-[var(--eai-border)]">
          <span className="text-6xl block mb-4">🔔</span>
          <h3 className="text-lg font-medium text-[var(--eai-text)] mb-2">No notifications</h3>
          <p className="text-[var(--eai-text-secondary)]">
            {filter === 'unread' ? 'You have no unread notifications' : 'You have no notifications yet'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((notification) => {
            const info = getNotificationInfo(notification.type);
            const isUnread = !notification.read_at;

            return (
              <div
                id="notification-item"
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                className={`bg-[var(--eai-surface)] border border-[var(--eai-border)] rounded-xl p-4 cursor-pointer hover:shadow-md transition-shadow ${
                  isUnread ? 'border-l-4 border-l-[var(--eai-primary)] bg-[var(--eai-primary)]/5' : ''
                }`}
              >
                <div className="flex items-start gap-4">
                  <span className="text-2xl flex-shrink-0">{info.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-1">
                      <div>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                          isUnread ? 'bg-[var(--eai-primary)]/10 text-[var(--eai-primary)]' : 'bg-[var(--eai-bg)] text-[var(--eai-text-secondary)]'
                        }`}>
                          {info.label}
                        </span>
                        <h4 className={`font-medium mt-1 ${isUnread ? 'text-[var(--eai-text)]' : 'text-[var(--eai-text-secondary)]'}`}>
                          {notification.subject || info.label}
                        </h4>
                      </div>
                      <span className="text-sm text-[var(--eai-text-secondary)] flex-shrink-0">
                        {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                      </span>
                    </div>

                    {notification.content && (
                      <p className="text-sm text-[var(--eai-text-secondary)] mb-2">{notification.content}</p>
                    )}

                    {(notification.mark_name || notification.client_name) && (
                      <div className="flex items-center gap-4 text-sm">
                        {notification.mark_name && (
                          <span className="text-[var(--eai-text-secondary)]">
                            Case: <span className="text-[var(--eai-text)] font-medium">{notification.mark_name}</span>
                          </span>
                        )}
                        {notification.client_name && (
                          <span className="text-[var(--eai-text-secondary)]">
                            Client: <span className="text-[var(--eai-text)] font-medium">{notification.client_name}</span>
                          </span>
                        )}
                      </div>
                    )}

                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-[var(--eai-border)]">
                      <div className="flex items-center gap-3 text-xs text-[var(--eai-text-secondary)]">
                        <span>Via {notification.channel}</span>
                        {notification.read_at && (
                          <span>Read {format(new Date(notification.read_at), 'MMM d, h:mm a')}</span>
                        )}
                      </div>
                      {isUnread && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            markAsRead(notification.id);
                          }}
                        >
                          Mark as read
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      </div>
    </div>
  );
}
