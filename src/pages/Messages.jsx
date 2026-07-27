import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { subscribeConversations, subscribeMessages, sendMessage, getPublicProfile, markChatAsRead, toggleBlockUser } from '../services/firestoreService';
import { convertFileToBase64 } from '../lib/fileUtils';
import Avatar from '../components/common/Avatar';
import { Send, ArrowLeft, Paperclip, X, Smile, MoreVertical, Ban } from 'lucide-react';
import toast from 'react-hot-toast';
import styles from './Messages.module.css';

export default function Messages() {
  const { profile } = useAuthStore();
  const { chatId } = useParams();
  const navigate = useNavigate();

  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [profilesCache, setProfilesCache] = useState({});
  const [attachment, setAttachment] = useState(null);
  const [sending, setSending] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const ANIMATED_EMOJIS = [
    'https://fonts.gstatic.com/s/e/notoemoji/latest/1f602/512.gif', // Laugh
    'https://fonts.gstatic.com/s/e/notoemoji/latest/1f60d/512.gif', // Heart Eyes
    'https://fonts.gstatic.com/s/e/notoemoji/latest/1f525/512.gif', // Fire
    'https://fonts.gstatic.com/s/e/notoemoji/latest/1f44d/512.gif', // Thumbs Up
    'https://fonts.gstatic.com/s/e/notoemoji/latest/1f389/512.gif', // Party
    'https://fonts.gstatic.com/s/e/notoemoji/latest/1f62d/512.gif', // Cry
  ];

  // Subscribe to user's conversations
  useEffect(() => {
    if (!profile?.id) return;
    const unsub = subscribeConversations(profile.id, async (chats) => {
      setConversations(chats);
      
      const newCache = { ...profilesCache };
      let updated = false;
      
      for (const chat of chats) {
        const otherId = chat.participants.find(p => p !== profile.id);
        if (otherId && !newCache[otherId]) {
          const pubProf = await getPublicProfile(otherId);
          if (pubProf) {
            newCache[otherId] = pubProf;
            updated = true;
          }
        }
      }
      
      if (updated) {
        setProfilesCache(newCache);
      }
    });
    return () => unsub();
  }, [profile?.id]);

  // Subscribe to active chat messages
  useEffect(() => {
    if (!chatId) {
      setMessages([]);
      return;
    }
    const unsub = subscribeMessages(chatId, (msgs) => {
      setMessages(msgs);
    });

    // Mark chat as read if unread by me
    const activeChat = conversations.find(c => c.id === chatId);
    if (activeChat && activeChat.unreadBy?.includes(profile?.id)) {
      markChatAsRead(chatId, profile.id);
    }

    return () => unsub();
  }, [chatId, conversations, profile?.id]);

  // Scroll to bottom on new message
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, attachment]);

  const handleAttachmentChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const base64 = await convertFileToBase64(file);
      const isVideo = file.type.startsWith('video/');
      setAttachment({
        url: base64,
        type: isVideo ? 'video' : 'image'
      });
    } catch (err) {
      toast.error(err.message || 'Failed to attach file');
    }
    // Clear input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if ((!inputText.trim() && !attachment) || !chatId || !profile?.id || sending) return;
    
    setSending(true);
    const text = inputText;
    const currentAttachment = attachment;
    
    setInputText('');
    setAttachment(null);
    
    try {
      await sendMessage(
        chatId, 
        profile.id, 
        text, 
        currentAttachment?.url || null, 
        currentAttachment?.type || null
      );
    } catch (err) {
      console.error(err);
      toast.error('Failed to send message');
      // Restore if failed
      setInputText(text);
      setAttachment(currentAttachment);
    } finally {
      setSending(false);
    }
  };

  const activeChat = conversations.find(c => c.id === chatId);
  const otherUserId = activeChat?.participants.find(p => p !== profile?.id);
  const otherUser = otherUserId ? profilesCache[otherUserId] : null;

  const isBlocked = profile?.blockedUsers?.includes(otherUserId);
  const hasBlockedMe = otherUser?.blockedUsers?.includes(profile?.id);

  const handleToggleBlock = async () => {
    if (!otherUserId || !profile?.id) return;
    try {
      await toggleBlockUser(profile.id, otherUserId, !isBlocked);
      toast.success(isBlocked ? 'User unblocked' : 'User blocked');
      setShowMenu(false);
    } catch (e) {
      toast.error('Failed to update block status');
    }
  };

  const handleSendEmoji = async (emojiUrl) => {
    if (!chatId || !profile?.id) return;
    setShowEmojiPicker(false);
    try {
      await sendMessage(chatId, profile.id, '', emojiUrl, 'image');
    } catch (e) {
      toast.error('Failed to send emoji');
    }
  };

  return (
    <div className={styles.container}>
      {/* Sidebar: Conversations List */}
      <div className={`${styles.sidebar} ${chatId ? styles.hiddenOnMobile : ''}`}>
        <div className={styles.sidebarHeader}>
          <h2>Messages</h2>
        </div>
        <div className={styles.convList}>
          {conversations.length === 0 ? (
            <div className={styles.emptyState}>No messages yet</div>
          ) : (
            [...conversations]
              .sort((a, b) => {
                const aUnread = a.unreadBy?.includes(profile?.id) ? 1 : 0;
                const bUnread = b.unreadBy?.includes(profile?.id) ? 1 : 0;
                if (aUnread !== bUnread) return bUnread - aUnread; // unread first
                const timeA = a.updatedAt?.toMillis ? a.updatedAt.toMillis() : 0;
                const timeB = b.updatedAt?.toMillis ? b.updatedAt.toMillis() : 0;
                return timeB - timeA;
              })
              .map(chat => {
              const oId = chat.participants.find(p => p !== profile?.id);
              const oProf = profilesCache[oId];
              const isUnread = chat.unreadBy?.includes(profile?.id);
              const isOnline = oProf?.lastActivityDate && (Date.now() - oProf.lastActivityDate.toMillis() < 5 * 60 * 1000);
              return (
                <div 
                  key={chat.id} 
                  className={`${styles.convItem} ${chatId === chat.id ? styles.active : ''} ${isUnread ? styles.unreadChat : ''}`}
                  style={{ position: 'relative', borderLeft: isUnread ? '4px solid var(--color-primary)' : '4px solid transparent' }}
                  onClick={() => navigate(`/messages/${chat.id}`)}
                >
                  <div style={{ position: 'relative' }}>
                    <Avatar src={oProf?.photoURL} activeFrame={oProf?.activeFrame} size={48} />
                    {isOnline && (
                      <div style={{
                        position: 'absolute', bottom: 0, right: 0,
                        width: 14, height: 14, background: '#10B981', border: '2px solid var(--color-surface)',
                        borderRadius: '50%', zIndex: 2
                      }} title="Online" />
                    )}
                  </div>
                  <div className={styles.convInfo}>
                    <h4 style={{ fontWeight: isUnread ? 'bold' : 'normal' }}>
                      {oProf?.displayName || 'User'}
                    </h4>
                    <p style={{ fontWeight: isUnread ? '600' : 'normal' }}>
                      {chat.lastMessage || 'New Conversation'}
                    </p>
                  </div>
                  {isUnread && (
                    <div className={styles.unreadBadge} />
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className={`${styles.chatArea} ${!chatId ? styles.hiddenOnMobile : ''}`}>
        {!chatId ? (
          <div className={styles.noChatSelected}>
            <div className={styles.noChatIcon}>💬</div>
            <h3>Your Messages</h3>
            <p>Select a conversation or start a new one from a user's profile.</p>
          </div>
        ) : (
          <>
            <div className={styles.chatHeader}>
              <button className={styles.backBtn} onClick={() => navigate('/messages')}>
                <ArrowLeft size={24} />
              </button>
              <div 
                style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}
                onClick={() => navigate(`/user/${otherUserId}`)}
              >
                <Avatar src={otherUser?.photoURL} activeFrame={otherUser?.activeFrame} size={40} />
                <h3>{otherUser?.displayName || 'User'}</h3>
              </div>
              
              <div style={{ marginLeft: 'auto', position: 'relative' }}>
                <button 
                  className={styles.attachBtn} 
                  onClick={() => setShowMenu(!showMenu)}
                  style={{ background: 'transparent', border: 'none', color: 'var(--color-text-secondary)', cursor: 'pointer' }}
                >
                  <MoreVertical size={20} />
                </button>
                
                {showMenu && (
                  <div style={{
                    position: 'absolute', right: 0, top: '100%', marginTop: 8,
                    background: 'var(--color-surface)', border: '1px solid var(--color-border)',
                    borderRadius: 12, padding: 8, zIndex: 100, minWidth: 150, boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                  }}>
                    <button 
                      onClick={handleToggleBlock}
                      style={{ 
                        width: '100%', display: 'flex', alignItems: 'center', gap: 8, 
                        background: 'transparent', border: 'none', color: isBlocked ? 'var(--color-text)' : 'var(--color-ruby)', 
                        padding: '8px 12px', cursor: 'pointer', borderRadius: 8, textAlign: 'left', fontWeight: 500
                      }}
                      onMouseOver={e => e.currentTarget.style.background = 'var(--color-bg)'}
                      onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <Ban size={16} />
                      {isBlocked ? 'Unblock User' : 'Block User'}
                    </button>
                  </div>
                )}
              </div>
            </div>
            
            <div className={styles.messagesList}>
              {messages.map(msg => {
                const isMe = msg.senderId === profile?.id;
                return (
                  <div key={msg.id} className={`${styles.messageWrapper} ${isMe ? styles.sent : styles.received}`}>
                    {!isMe && (
                      <Avatar src={otherUser?.photoURL} activeFrame={otherUser?.activeFrame} size={28} />
                    )}
                    <div className={styles.messageContent}>
                      {msg.mediaUrl && (
                        <div className={styles.mediaContainer}>
                          {msg.mediaType === 'video' ? (
                            <video src={msg.mediaUrl} controls className={styles.chatMedia} />
                          ) : (
                            <img src={msg.mediaUrl} alt="Attached image" className={styles.chatMedia} />
                          )}
                        </div>
                      )}
                      {msg.text && (
                        <div className={styles.messageBubble}>
                          {msg.text}
                        </div>
                      )}
                      <span className={styles.messageTimestamp}>
                        {msg.createdAt?.toMillis ? new Date(msg.createdAt.toMillis()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Just now'}
                      </span>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            <div className={styles.inputArea}>
              {isBlocked ? (
                <div style={{ width: '100%', textAlign: 'center', padding: '16px', color: 'var(--color-text-secondary)', background: 'var(--color-surface)', borderRadius: '12px' }}>
                  You have blocked this user.
                </div>
              ) : hasBlockedMe ? (
                <div style={{ width: '100%', textAlign: 'center', padding: '16px', color: 'var(--color-text-secondary)', background: 'var(--color-surface)', borderRadius: '12px' }}>
                  You cannot reply to this conversation.
                </div>
              ) : (
                <>
                  {attachment && (
                    <div className={styles.attachmentPreview}>
                      <button className={styles.removeAttachmentBtn} onClick={() => setAttachment(null)}>
                        <X size={16} />
                      </button>
                      {attachment.type === 'video' ? (
                        <video src={attachment.url} className={styles.previewMedia} />
                      ) : (
                        <img src={attachment.url} alt="Preview" className={styles.previewMedia} />
                      )}
                    </div>
                  )}
                  <div className={styles.inputWrapper}>
                    <form className={styles.messageInputForm} onSubmit={handleSend}>
                      <input 
                        type="file" 
                        accept="image/*,video/*" 
                        ref={fileInputRef}
                        style={{ display: 'none' }}
                        onChange={handleAttachmentChange}
                      />
                      
                      <button 
                        type="button" 
                        className={styles.attachBtn}
                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                        disabled={sending}
                        title="Send 3D Emoji"
                      >
                        <Smile size={20} />
                      </button>

                      {showEmojiPicker && (
                        <div style={{
                          position: 'absolute', bottom: '100%', left: 0, marginBottom: 12,
                          background: 'var(--color-surface)', border: '1px solid var(--color-border)',
                          borderRadius: 16, padding: 12, display: 'flex', gap: 12, zIndex: 100,
                          boxShadow: '0 8px 24px rgba(0,0,0,0.15)'
                        }}>
                          {ANIMATED_EMOJIS.map((emoji, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => handleSendEmoji(emoji)}
                              style={{
                                background: 'transparent', border: 'none', cursor: 'pointer',
                                padding: 4, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                transition: 'transform 0.2s'
                              }}
                              onMouseOver={e => e.currentTarget.style.transform = 'scale(1.15)'}
                              onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
                            >
                              <img src={emoji} alt="emoji" style={{ width: 40, height: 40, objectFit: 'contain' }} />
                            </button>
                          ))}
                        </div>
                      )}

                      <button 
                        type="button" 
                        className={styles.attachBtn}
                        onClick={() => fileInputRef.current?.click()}
                        disabled={sending}
                      >
                        <Paperclip size={20} />
                      </button>
                      <input 
                        type="text" 
                        placeholder="Message..." 
                        value={inputText}
                        onChange={e => setInputText(e.target.value)}
                        disabled={sending}
                      />
                      <button type="submit" className={styles.sendBtn} disabled={(!inputText.trim() && !attachment) || sending}>
                        {sending ? '...' : <Send size={18} />}
                      </button>
                    </form>
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
