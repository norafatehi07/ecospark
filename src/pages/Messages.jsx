import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../store/authStore';
import {
  subscribeConversations, subscribeMessages, sendMessage, getPublicProfile,
  markChatAsRead, toggleBlockUser, editMessage, deleteMessage, deleteConversationForUser
} from '../services/firestoreService';
import { convertFileToBase64 } from '../lib/fileUtils';
import Avatar from '../components/common/Avatar';
import {
  Send, ArrowLeft, Paperclip, X, Smile, MoreVertical, Ban,
  Trash2, Pencil, Check, MessageSquare
} from 'lucide-react';
import toast from 'react-hot-toast';
import styles from './Messages.module.css';

// Format a timestamp into a pretty date separator label (like Instagram)
function formatDateSeparator(ts) {
  if (!ts) return null;
  const d = ts.toMillis ? new Date(ts.toMillis()) : new Date(ts);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const msgDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diff = (today - msgDay) / 86400000;
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
}

// Format timestamp to time string
function formatTime(ts) {
  if (!ts) return 'now';
  const d = ts.toMillis ? new Date(ts.toMillis()) : new Date(ts);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Determine if two messages are on different dates
function isDifferentDay(tsA, tsB) {
  if (!tsA || !tsB) return false;
  const a = tsA.toMillis ? new Date(tsA.toMillis()) : new Date(tsA);
  const b = tsB.toMillis ? new Date(tsB.toMillis()) : new Date(tsB);
  return a.toDateString() !== b.toDateString();
}

const ANIMATED_EMOJIS = [
  'https://fonts.gstatic.com/s/e/notoemoji/latest/1f602/512.gif',
  'https://fonts.gstatic.com/s/e/notoemoji/latest/1f60d/512.gif',
  'https://fonts.gstatic.com/s/e/notoemoji/latest/1f525/512.gif',
  'https://fonts.gstatic.com/s/e/notoemoji/latest/1f44d/512.gif',
  'https://fonts.gstatic.com/s/e/notoemoji/latest/1f389/512.gif',
  'https://fonts.gstatic.com/s/e/notoemoji/latest/1f62d/512.gif',
];

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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Edit state
  const [editingMsgId, setEditingMsgId] = useState(null);
  const [editText, setEditText] = useState('');

  // Hover state for bubble actions
  const [hoveredMsgId, setHoveredMsgId] = useState(null);

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const editInputRef = useRef(null);

  // Subscribe to conversations
  useEffect(() => {
    if (!profile?.id) return;
    const unsub = subscribeConversations(profile.id, async (chats) => {
      // Filter out chats that user has deleted
      const visible = chats.filter(c => {
        const deletedFor = c.deletedFor?.[profile.id];
        if (!deletedFor) return true;
        // If new messages arrived after deletion, show again
        const updatedAt = c.updatedAt?.toMillis?.() || 0;
        const deletedAt = deletedFor.toMillis?.() || 0;
        return updatedAt > deletedAt;
      });
      setConversations(visible);

      const newCache = { ...profilesCache };
      let updated = false;
      for (const chat of chats) {
        const otherId = chat.participants.find(p => p !== profile.id);
        if (otherId && !newCache[otherId]) {
          const pubProf = await getPublicProfile(otherId);
          if (pubProf) { newCache[otherId] = pubProf; updated = true; }
        }
      }
      if (updated) setProfilesCache(newCache);
    });
    return () => unsub();
  }, [profile?.id]);

  // Subscribe to messages
  useEffect(() => {
    if (!chatId) { setMessages([]); return; }
    const unsub = subscribeMessages(chatId, msgs => setMessages(msgs));
    const activeChat = conversations.find(c => c.id === chatId);
    if (activeChat?.unreadBy?.includes(profile?.id)) markChatAsRead(chatId, profile.id);
    return () => unsub();
  }, [chatId, conversations, profile?.id]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, attachment]);

  // Focus edit input when editing
  useEffect(() => {
    if (editingMsgId) editInputRef.current?.focus();
  }, [editingMsgId]);

  const handleAttachmentChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const base64 = await convertFileToBase64(file);
      const isVideo = file.type.startsWith('video/');
      setAttachment({ url: base64, type: isVideo ? 'video' : 'image' });
    } catch (err) {
      toast.error(err.message || 'Failed to attach file');
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSend = async (e) => {
    e?.preventDefault();
    if ((!inputText.trim() && !attachment) || !chatId || !profile?.id || sending) return;
    setSending(true);
    const text = inputText;
    const currentAttachment = attachment;
    setInputText('');
    setAttachment(null);
    try {
      await sendMessage(chatId, profile.id, text, currentAttachment?.url || null, currentAttachment?.type || null);
    } catch {
      toast.error('Failed to send message');
      setInputText(text);
      setAttachment(currentAttachment);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
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
    } catch {
      toast.error('Failed to update block status');
    }
  };

  const handleDeleteChat = async () => {
    if (!chatId || !profile?.id) return;
    try {
      await deleteConversationForUser(chatId, profile.id);
      toast.success('Conversation deleted');
      navigate('/messages');
    } catch {
      toast.error('Could not delete conversation');
    }
    setShowDeleteConfirm(false);
    setShowMenu(false);
  };

  const handleSendEmoji = async (emojiUrl) => {
    if (!chatId || !profile?.id) return;
    setShowEmojiPicker(false);
    try {
      await sendMessage(chatId, profile.id, '', emojiUrl, 'image');
    } catch {
      toast.error('Failed to send emoji');
    }
  };

  const startEdit = (msg) => {
    const sentAt = msg.createdAt?.toMillis?.() || 0;
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    if (sentAt < oneHourAgo) {
      toast.error('Messages can only be edited within 1 hour of sending.');
      return;
    }
    setEditingMsgId(msg.id);
    setEditText(msg.text || '');
  };

  const cancelEdit = () => {
    setEditingMsgId(null);
    setEditText('');
  };

  const submitEdit = async () => {
    if (!editText.trim() || !editingMsgId) return;
    try {
      await editMessage(chatId, editingMsgId, editText.trim());
      toast.success('Message edited');
    } catch {
      toast.error('Could not edit message');
    }
    cancelEdit();
  };

  const handleDeleteMessage = async (msgId) => {
    try {
      await deleteMessage(chatId, msgId);
    } catch {
      toast.error('Could not delete message');
    }
  };

  // Group messages by date for separators
  const messagesWithSeparators = [];
  messages.forEach((msg, i) => {
    const prev = messages[i - 1];
    if (i === 0 || isDifferentDay(prev?.createdAt, msg.createdAt)) {
      messagesWithSeparators.push({ type: 'separator', label: formatDateSeparator(msg.createdAt), id: `sep-${i}` });
    }
    messagesWithSeparators.push({ type: 'message', ...msg });
  });

  return (
    <div className={styles.container}>
      {/* Sidebar */}
      <div className={`${styles.sidebar} ${chatId ? styles.hiddenOnMobile : ''}`}>
        <div className={styles.sidebarHeader}>
          <MessageSquare size={22} style={{ color: '#a78bfa' }} />
          <h2>Messages</h2>
        </div>
        <div className={styles.convList}>
          {conversations.length === 0 ? (
            <div className={styles.emptyState}>
              <MessageSquare size={40} style={{ opacity: 0.2, marginBottom: 12 }} />
              <p>No conversations yet</p>
            </div>
          ) : (
            [...conversations]
              .sort((a, b) => {
                const aU = a.unreadBy?.includes(profile?.id) ? 1 : 0;
                const bU = b.unreadBy?.includes(profile?.id) ? 1 : 0;
                if (aU !== bU) return bU - aU;
                return (b.updatedAt?.toMillis?.() || 0) - (a.updatedAt?.toMillis?.() || 0);
              })
              .map(chat => {
                const oId = chat.participants.find(p => p !== profile?.id);
                const oProf = profilesCache[oId];
                const isUnread = chat.unreadBy?.includes(profile?.id);
                return (
                  <div
                    key={chat.id}
                    className={`${styles.convItem} ${chatId === chat.id ? styles.activeConv : ''} ${isUnread ? styles.unreadChat : ''}`}
                    onClick={() => navigate(`/messages/${chat.id}`)}
                  >
                    <div style={{ position: 'relative', flexShrink: 0 }}>
                      <Avatar src={oProf?.photoURL} activeFrame={oProf?.activeFrame} size={46} />
                      {isUnread && <div className={styles.unreadDot} />}
                    </div>
                    <div className={styles.convInfo}>
                      <h4>{oProf?.displayName || 'User'}</h4>
                      <p>{chat.lastMessage || 'New Conversation'}</p>
                    </div>
                    {chat.updatedAt && (
                      <span className={styles.convTime}>
                        {formatTime(chat.updatedAt)}
                      </span>
                    )}
                  </div>
                );
              })
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className={`${styles.chatArea} ${!chatId ? styles.hiddenOnMobile : ''}`}>
        {!chatId ? (
          <div className={styles.noChatSelected}>
            <div className={styles.noChatOrb} />
            <MessageSquare size={56} style={{ opacity: 0.2, marginBottom: 20 }} />
            <h3>Your Messages</h3>
            <p>Select a conversation or start a new one from a user's profile.</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className={styles.chatHeader}>
              <button className={styles.backBtn} onClick={() => navigate('/messages')}>
                <ArrowLeft size={20} />
              </button>
              <div
                style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', flex: 1 }}
                onClick={() => navigate(`/user/${otherUserId}`)}
              >
                <Avatar src={otherUser?.photoURL} activeFrame={otherUser?.activeFrame} size={40} />
                <div>
                  <h3 className={styles.chatHeaderName}>{otherUser?.displayName || 'User'}</h3>
                </div>
              </div>

              <div style={{ position: 'relative' }}>
                <button className={styles.menuBtn} onClick={() => setShowMenu(!showMenu)}>
                  <MoreVertical size={20} />
                </button>
                <AnimatePresence>
                  {showMenu && (
                    <motion.div
                      className={styles.dropdownMenu}
                      initial={{ opacity: 0, scale: 0.9, y: -8 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9, y: -8 }}
                      transition={{ duration: 0.15 }}
                    >
                      <button className={styles.menuItem} onClick={() => { setShowDeleteConfirm(true); setShowMenu(false); }}>
                        <Trash2 size={15} style={{ color: '#f87171' }} /> Delete Conversation
                      </button>
                      <div className={styles.menuDivider} />
                      <button className={`${styles.menuItem} ${isBlocked ? styles.menuItemDanger : ''}`} onClick={handleToggleBlock}>
                        <Ban size={15} /> {isBlocked ? 'Unblock User' : 'Block User'}
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Messages */}
            <div className={styles.messagesList} onClick={() => { setShowMenu(false); setShowEmojiPicker(false); }}>
              {messagesWithSeparators.map(item => {
                if (item.type === 'separator') {
                  return (
                    <div key={item.id} className={styles.dateSeparator}>
                      <span>{item.label}</span>
                    </div>
                  );
                }

                const msg = item;
                const isMe = msg.senderId === profile?.id;
                const canEdit = isMe && !msg.deleted && ((msg.createdAt?.toMillis?.() || 0) > Date.now() - 3600000);

                if (msg.deleted) {
                  return (
                    <div key={msg.id} className={`${styles.messageWrapper} ${isMe ? styles.sent : styles.received}`}>
                      <div className={styles.deletedBubble}>
                        {isMe ? 'You deleted this message' : 'This message was deleted'}
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={msg.id}
                    className={`${styles.messageWrapper} ${isMe ? styles.sent : styles.received}`}
                    onMouseEnter={() => setHoveredMsgId(msg.id)}
                    onMouseLeave={() => setHoveredMsgId(null)}
                  >
                    {!isMe && (
                      <Avatar src={otherUser?.photoURL} activeFrame={otherUser?.activeFrame} size={28} />
                    )}
                    <div className={styles.messageContent}>
                      {editingMsgId === msg.id ? (
                        <div className={styles.editContainer}>
                          <input
                            ref={editInputRef}
                            value={editText}
                            onChange={e => setEditText(e.target.value)}
                            className={styles.editInput}
                            onKeyDown={e => { if (e.key === 'Enter') submitEdit(); if (e.key === 'Escape') cancelEdit(); }}
                          />
                          <div className={styles.editActions}>
                            <button className={styles.editSave} onClick={submitEdit}><Check size={14} /></button>
                            <button className={styles.editCancel} onClick={cancelEdit}><X size={14} /></button>
                          </div>
                        </div>
                      ) : (
                        <>
                          {msg.mediaUrl && (
                            <div className={styles.mediaContainer}>
                              {msg.mediaType === 'video' ? (
                                <video src={msg.mediaUrl} controls className={styles.chatMedia} />
                              ) : (
                                <img src={msg.mediaUrl} alt="Attachment" className={styles.chatMedia} />
                              )}
                            </div>
                          )}
                          {msg.text && (
                            <div className={styles.messageBubble}>
                              {msg.text}
                              {msg.isEdited && <span className={styles.editedTag}> · edited</span>}
                            </div>
                          )}
                        </>
                      )}

                      <div className={styles.messageMeta}>
                        <span className={styles.messageTimestamp}>{formatTime(msg.createdAt)}</span>
                      </div>

                      {/* Bubble actions on hover */}
                      {hoveredMsgId === msg.id && isMe && editingMsgId !== msg.id && (
                        <div className={`${styles.msgActions} ${isMe ? styles.msgActionsLeft : styles.msgActionsRight}`}>
                          {canEdit && (
                            <button className={styles.msgActionBtn} onClick={() => startEdit(msg)} title="Edit message">
                              <Pencil size={13} />
                            </button>
                          )}
                          <button className={styles.msgActionBtn} onClick={() => handleDeleteMessage(msg.id)} title="Delete message">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className={styles.inputArea}>
              {isBlocked ? (
                <div className={styles.blockedBanner}>You have blocked this user. <button onClick={handleToggleBlock}>Unblock</button></div>
              ) : hasBlockedMe ? (
                <div className={styles.blockedBanner}>You cannot reply to this conversation.</div>
              ) : (
                <>
                  {attachment && (
                    <div className={styles.attachmentPreview}>
                      <button className={styles.removeAttachmentBtn} onClick={() => setAttachment(null)}>
                        <X size={14} />
                      </button>
                      {attachment.type === 'video' ? (
                        <video src={attachment.url} className={styles.previewMedia} />
                      ) : (
                        <img src={attachment.url} alt="Preview" className={styles.previewMedia} />
                      )}
                    </div>
                  )}

                  <div className={styles.inputWrapper}>
                    <input
                      type="file"
                      accept="image/*,video/*"
                      ref={fileInputRef}
                      style={{ display: 'none' }}
                      onChange={handleAttachmentChange}
                    />

                    <div className={styles.inputToolbar}>
                      <button
                        type="button"
                        className={styles.toolbarBtn}
                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                        disabled={sending}
                        title="Animated Emojis"
                      >
                        <Smile size={19} />
                      </button>
                      <button
                        type="button"
                        className={styles.toolbarBtn}
                        onClick={() => fileInputRef.current?.click()}
                        disabled={sending}
                        title="Attach file"
                      >
                        <Paperclip size={19} />
                      </button>
                    </div>

                    <AnimatePresence>
                      {showEmojiPicker && (
                        <motion.div
                          className={styles.emojiPicker}
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.95 }}
                          transition={{ duration: 0.15 }}
                        >
                          {ANIMATED_EMOJIS.map((emoji, idx) => (
                            <button
                              key={idx}
                              type="button"
                              className={styles.emojiBtn}
                              onClick={() => handleSendEmoji(emoji)}
                            >
                              <img src={emoji} alt="emoji" width={38} height={38} />
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <input
                      type="text"
                      placeholder="Message..."
                      value={inputText}
                      onChange={e => setInputText(e.target.value)}
                      onKeyDown={handleKeyDown}
                      disabled={sending}
                      className={styles.textInput}
                    />
                    <button
                      className={styles.sendBtn}
                      onClick={handleSend}
                      disabled={(!inputText.trim() && !attachment) || sending}
                    >
                      {sending ? <span className={styles.sendSpinner} /> : <Send size={17} />}
                    </button>
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            className={styles.confirmOverlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowDeleteConfirm(false)}
          >
            <motion.div
              className={styles.confirmModal}
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
            >
              <Trash2 size={36} style={{ color: '#f87171', marginBottom: 12 }} />
              <h3>Delete Conversation?</h3>
              <p>This conversation will be removed from your view. The other person will still have access to it.</p>
              <div className={styles.confirmBtns}>
                <button className={styles.confirmCancel} onClick={() => setShowDeleteConfirm(false)}>Cancel</button>
                <button className={styles.confirmDelete} onClick={handleDeleteChat}>Delete</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
