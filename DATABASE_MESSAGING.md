# Messaging System Database Documentation

## Database Tables

### 1. **conversations**
Stores all chat conversations between users.

```sql
CREATE TABLE conversations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user1_id INT NOT NULL,
    user2_id INT NOT NULL,
    last_message_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_conversation (user1_id, user2_id),
    INDEX idx_user_conversations (user1_id, last_message_at),
    INDEX idx_user2_conversations (user2_id, last_message_at),
    INDEX idx_last_message (last_message_at DESC),
    INDEX idx_user1_last_message (user1_id, last_message_at DESC),
    INDEX idx_user2_last_message (user2_id, last_message_at DESC)
);
```

**Purpose:** Track all conversations between two users
**Key Features:**
- Unique constraint ensures only one conversation per user pair
- Automatically updated timestamp on new messages
- Optimized indexes for fast conversation retrieval

---

### 2. **messages**
Stores all messages sent in conversations.

```sql
CREATE TABLE messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    conversation_id INT NOT NULL,
    sender_id INT NOT NULL,
    message_text TEXT,
    attachment_url VARCHAR(255),
    attachment_type ENUM('image', 'video', 'document', 'location'),
    is_read BOOLEAN DEFAULT FALSE,
    deleted_by_sender BOOLEAN DEFAULT FALSE,
    deleted_by_receiver BOOLEAN DEFAULT FALSE,
    edited_at TIMESTAMP NULL,
    reply_to_message_id INT NULL,
    delivered_at TIMESTAMP NULL,
    read_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_conversation_messages (conversation_id, created_at),
    INDEX idx_sender_messages (sender_id),
    INDEX idx_reply_to (reply_to_message_id),
    INDEX idx_sender_conversation (sender_id, conversation_id, created_at),
    INDEX idx_unread (conversation_id, is_read, sender_id)
);
```

**Purpose:** Store all message content and metadata
**Key Features:**
- Support for text and attachments
- Soft delete (deleted_by_sender/receiver)
- Read receipts with timestamps
- Reply threading support
- Message editing tracking

---

### 3. **conversation_settings**
User-specific settings for each conversation.

```sql
CREATE TABLE conversation_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    conversation_id INT NOT NULL,
    user_id INT NOT NULL,
    is_muted BOOLEAN DEFAULT FALSE,
    is_archived BOOLEAN DEFAULT FALSE,
    is_blocked BOOLEAN DEFAULT FALSE,
    nickname VARCHAR(100),
    theme_color VARCHAR(20),
    emoji VARCHAR(10),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_conversation_user (conversation_id, user_id),
    INDEX idx_user_settings (user_id),
    INDEX idx_archived (user_id, is_archived),
    INDEX idx_muted (user_id, is_muted),
    INDEX idx_blocked (user_id, is_blocked)
);
```

**Purpose:** Store per-user conversation preferences
**Key Features:**
- Mute notifications
- Archive conversations
- Block users
- Custom nicknames and themes
- Per-user settings (each user has their own)

---

### 4. **message_reactions**
Emoji reactions to messages.

```sql
CREATE TABLE message_reactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    message_id INT NOT NULL,
    user_id INT NOT NULL,
    reaction VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_reaction (message_id, user_id),
    INDEX idx_message_reactions (message_id)
);
```

**Purpose:** Allow users to react to messages with emojis
**Key Features:**
- One reaction per user per message
- Support for any emoji
- Fast retrieval by message

---

### 5. **typing_indicators**
Real-time typing status (temporary storage).

```sql
CREATE TABLE typing_indicators (
    id INT AUTO_INCREMENT PRIMARY KEY,
    conversation_id INT NOT NULL,
    user_id INT NOT NULL,
    last_typing_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_typing (conversation_id, user_id),
    INDEX idx_conversation_typing (conversation_id, last_typing_at)
);
```

**Purpose:** Track who is currently typing
**Key Features:**
- Auto-updated timestamp
- Cleaned up every 5 seconds (via event)
- One entry per user per conversation

---

### 6. **user_online_status**
Track user online/offline status.

```sql
CREATE TABLE user_online_status (
    user_id INT PRIMARY KEY,
    is_online BOOLEAN DEFAULT FALSE,
    last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_online (is_online, last_seen)
);
```

**Purpose:** Show online status and last seen
**Key Features:**
- Real-time online status
- Last seen timestamp
- Updated via Socket.IO

---

## Database Views

### active_conversations
Pre-filtered view of non-archived conversations.

```sql
CREATE VIEW active_conversations AS
SELECT c.*, 
       cs.is_archived,
       cs.is_muted,
       cs.is_blocked,
       cs.nickname,
       cs.theme_color
FROM conversations c
LEFT JOIN conversation_settings cs ON c.id = cs.conversation_id
WHERE cs.is_archived IS NULL OR cs.is_archived = FALSE;
```

---

## Stored Procedures

### get_conversation_with_settings
Get conversation with user-specific settings.

```sql
CALL get_conversation_with_settings(user_id, other_user_id);
```

**Returns:** Conversation with settings (archived, muted, blocked, nickname, theme)

---

## Functions

### count_unread_messages
Count unread messages in a conversation for a user.

```sql
SELECT count_unread_messages(conversation_id, user_id);
```

**Returns:** Integer count of unread messages

---

## Triggers

### update_conversation_timestamp
Automatically updates `last_message_at` when new message is sent.

```sql
TRIGGER update_conversation_timestamp
AFTER INSERT ON messages
```

---

## Events

### cleanup_typing_indicators
Removes typing indicators older than 5 seconds.

```sql
EVENT cleanup_typing_indicators
RUNS EVERY 5 SECOND
```

---

## Indexes Summary

### Performance Optimizations

**conversations table:**
- `idx_user_conversations` - Fast user conversation lookup
- `idx_last_message` - Sort by recent activity
- `idx_user1_last_message` - Composite for user1 queries
- `idx_user2_last_message` - Composite for user2 queries

**messages table:**
- `idx_conversation_messages` - Get all messages in conversation
- `idx_sender_messages` - Get all messages by sender
- `idx_unread` - Fast unread message queries
- `idx_sender_conversation` - Message requests query

**conversation_settings table:**
- `idx_archived` - Filter archived conversations
- `idx_muted` - Filter muted conversations
- `idx_blocked` - Filter blocked users

---

## Query Examples

### Get User's Conversations
```sql
SELECT c.*, 
       u.username, 
       u.profile_image_url,
       (SELECT message_text FROM messages 
        WHERE conversation_id = c.id 
        ORDER BY created_at DESC LIMIT 1) as last_message,
       count_unread_messages(c.id, ?) as unread_count
FROM conversations c
JOIN users u ON (CASE WHEN c.user1_id = ? THEN c.user2_id ELSE c.user1_id END) = u.id
WHERE c.user1_id = ? OR c.user2_id = ?
ORDER BY c.last_message_at DESC;
```

### Get Archived Conversations
```sql
SELECT c.*, u.username, u.profile_image_url
FROM conversations c
JOIN conversation_settings cs ON c.id = cs.conversation_id
JOIN users u ON (CASE WHEN c.user1_id = ? THEN c.user2_id ELSE c.user1_id END) = u.id
WHERE cs.user_id = ? AND cs.is_archived = TRUE
ORDER BY c.last_message_at DESC;
```

### Get Message Requests
```sql
SELECT DISTINCT
       CASE WHEN c.user1_id = ? THEN c.user2_id ELSE c.user1_id END as user_id,
       u.username, u.profile_image_url
FROM conversations c
JOIN users u ON (CASE WHEN c.user1_id = ? THEN c.user2_id ELSE c.user1_id END) = u.id
WHERE (c.user1_id = ? OR c.user2_id = ?)
AND NOT EXISTS (
    SELECT 1 FROM messages m 
    WHERE m.conversation_id = c.id AND m.sender_id = ?
)
AND EXISTS (
    SELECT 1 FROM messages m 
    WHERE m.conversation_id = c.id AND m.sender_id != ?
);
```

### Mark All Messages as Read
```sql
UPDATE messages 
SET is_read = TRUE, read_at = NOW() 
WHERE conversation_id = ? 
AND sender_id != ? 
AND is_read = FALSE;
```

---

## Data Integrity

### Foreign Keys
All tables have proper foreign key constraints:
- `conversation_id` → `conversations.id` (CASCADE DELETE)
- `user_id` → `users.id` (CASCADE DELETE)
- `sender_id` → `users.id` (CASCADE DELETE)
- `message_id` → `messages.id` (CASCADE DELETE)

### Unique Constraints
- One conversation per user pair
- One reaction per user per message
- One typing indicator per user per conversation
- One settings record per user per conversation

---

## Maintenance

### Regular Tasks
1. **Cleanup old typing indicators** - Automated via event
2. **Archive old messages** - Manual/scheduled
3. **Backup conversations** - Daily recommended
4. **Optimize tables** - Weekly recommended

### Monitoring Queries
```sql
-- Check table sizes
SELECT 
    table_name,
    ROUND(((data_length + index_length) / 1024 / 1024), 2) AS size_mb
FROM information_schema.TABLES
WHERE table_schema = 'railway'
AND table_name LIKE '%message%' OR table_name LIKE '%conversation%';

-- Count active conversations
SELECT COUNT(*) FROM conversations;

-- Count total messages
SELECT COUNT(*) FROM messages;

-- Count unread messages
SELECT COUNT(*) FROM messages WHERE is_read = FALSE;

-- Count online users
SELECT COUNT(*) FROM user_online_status WHERE is_online = TRUE;
```

---

## Backup & Recovery

### Backup Commands
```bash
# Backup all messaging tables
mysqldump -h host -u user -p database \
  conversations messages conversation_settings \
  message_reactions typing_indicators user_online_status \
  > messaging_backup.sql

# Restore
mysql -h host -u user -p database < messaging_backup.sql
```

---

## Performance Tips

1. **Use indexes** - All critical queries are indexed
2. **Limit results** - Always use LIMIT for large datasets
3. **Cache frequently accessed data** - Use Redis for online status
4. **Archive old data** - Move old messages to archive table
5. **Monitor slow queries** - Enable slow query log
6. **Use connection pooling** - Reuse database connections

---

## Security Considerations

1. **Parameterized queries** - Prevent SQL injection
2. **User authorization** - Check user owns conversation
3. **Rate limiting** - Prevent spam
4. **Encryption** - Consider encrypting message_text
5. **Audit logging** - Track sensitive operations
6. **Soft deletes** - Allow message recovery

---

## Future Enhancements

- [ ] End-to-end encryption
- [ ] Group conversations
- [ ] Voice messages
- [ ] Video messages
- [ ] Message forwarding
- [ ] Message search indexing (Elasticsearch)
- [ ] Message analytics
- [ ] Conversation export
- [ ] Message scheduling
- [ ] Auto-delete messages

---

**Last Updated:** 2024
**Database Version:** 1.0
**Status:** Production Ready ✅
