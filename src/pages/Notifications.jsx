import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { subscribeUserNotifications, markNotificationRead } from '../services/firestoreService';
import { Bell, UserPlus, MessageCircle, Flame, Info, Check } from 'lucide-react';
import styles from './Notifications.module.css';

export default function Notifications() {
  const { profile } = useAuthStore();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    if (!profile?.id) return;
    const unsub = subscribeUserNotifications(profile.id, (notifs) => {
      setNotifications(notifs);
    });
    return () => unsub();
  }, [profile?.id]);

  const handleNotificationClick = async (notif) => {
    if (!notif.read) {
      await markNotificationRead(notif.id);
    }
    
    if (notif.type === 'follow' && notif.payload?.followerId) {
      navigate(`/user/${notif.payload.followerId}`);
    } else if (notif.type === 'message' && notif.payload?.chatId) {
      navigate(`/messages/${notif.payload.chatId}`);
    } else if (notif.type === 'streak') {
      navigate('/tasks');
    }
  };

  const markAllAsRead = async () => {
    for (const notif of notifications) {
      if (!notif.read) {
        await markNotificationRead(notif.id);
      }
    }
  };

  const getIcon = (type) => {
    switch(type) {
      case 'follow': return <UserPlus size={24} />;
      case 'message': return <MessageCircle size={24} />;
      case 'streak': return <Flame size={24} />;
      default: return <Info size={24} />;
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return 'Just now';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);
    
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1>Notifications</h1>
            <p>Stay updated on your eco-journey</p>
          </div>
          {notifications.some(n => !n.read) && (
            <button 
              onClick={markAllAsRead} 
              style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'transparent', border: '1px solid var(--color-border)', color: 'var(--color-text)', padding: '8px 16px', borderRadius: '20px', cursor: 'pointer' }}
            >
              <Check size={16} /> Mark all read
            </button>
          )}
        </div>
      </div>

      <div className={styles.notificationList}>
        {notifications.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyStateIcon}>🔔</div>
            <h3>All caught up!</h3>
            <p>You don't have any notifications right now.</p>
          </div>
        ) : (
          notifications.map(notif => (
            <div 
              key={notif.id} 
              className={`${styles.notificationItem} ${!notif.read ? styles.unread : ''}`}
              onClick={() => handleNotificationClick(notif)}
            >
              <div className={`${styles.iconWrapper} ${styles[notif.type] || styles.system}`}>
                {getIcon(notif.type)}
              </div>
              <div className={styles.content}>
                <h4>{notif.type === 'follow' ? 'New Follower' : notif.type === 'message' ? 'New Message' : 'Alert'}</h4>
                <p>
                  {notif.type === 'follow' && <strong>{notif.payload?.followerName} </strong>}
                  {notif.payload?.message || 'You have a new notification.'}
                </p>
                <span className={styles.time}>{formatTime(notif.createdAt)}</span>
              </div>
              {!notif.read && <div className={styles.unreadDot} />}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
