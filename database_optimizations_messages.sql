-- Additional database optimizations for messaging features

-- Add indexes for better query performance
ALTER TABLE conversations 
ADD INDEX idx_last_message (last_message_at DESC);

-- Add index for conversation settings queries
ALTER TABLE conversation_settings
ADD INDEX idx_archived (user_id, is_archived),
ADD INDEX idx_muted (user_id, is_muted),
ADD INDEX idx_blocked (user_id, is_blocked);

-- Add index for message requests query
ALTER TABLE messages
ADD INDEX idx_sender_conversation (sender_id, conversation_id, created_at);

-- Add composite index for unread messages
ALTER TABLE messages
ADD INDEX idx_unread (conversation_id, is_read, sender_id);

-- Optimize conversations query with user info
ALTER TABLE conversations
ADD INDEX idx_user1_last_message (user1_id, last_message_at DESC),
ADD INDEX idx_user2_last_message (user2_id, last_message_at DESC);

-- Add index for online status queries
ALTER TABLE user_online_status
ADD INDEX idx_online (is_online, last_seen);

-- Create view for active conversations (non-archived, non-blocked)
CREATE OR REPLACE VIEW active_conversations AS
SELECT c.*, 
       cs.is_archived,
       cs.is_muted,
       cs.is_blocked,
       cs.nickname,
       cs.theme_color
FROM conversations c
LEFT JOIN conversation_settings cs ON c.id = cs.conversation_id
WHERE cs.is_archived IS NULL OR cs.is_archived = FALSE;

-- Create stored procedure to get conversation with settings
DELIMITER //
CREATE PROCEDURE IF NOT EXISTS get_conversation_with_settings(
    IN p_user_id INT,
    IN p_other_user_id INT
)
BEGIN
    SELECT c.*,
           COALESCE(cs.is_archived, FALSE) as is_archived,
           COALESCE(cs.is_muted, FALSE) as is_muted,
           COALESCE(cs.is_blocked, FALSE) as is_blocked,
           cs.nickname,
           cs.theme_color,
           cs.emoji
    FROM conversations c
    LEFT JOIN conversation_settings cs ON c.id = cs.conversation_id AND cs.user_id = p_user_id
    WHERE (c.user1_id = p_user_id AND c.user2_id = p_other_user_id)
       OR (c.user1_id = p_other_user_id AND c.user2_id = p_user_id);
END //
DELIMITER ;

-- Create function to count unread messages
DELIMITER //
CREATE FUNCTION IF NOT EXISTS count_unread_messages(
    p_conversation_id INT,
    p_user_id INT
)
RETURNS INT
DETERMINISTIC
BEGIN
    DECLARE unread_count INT;
    
    SELECT COUNT(*) INTO unread_count
    FROM messages
    WHERE conversation_id = p_conversation_id
      AND sender_id != p_user_id
      AND is_read = FALSE;
    
    RETURN unread_count;
END //
DELIMITER ;

-- Create trigger to update last_message_at on new message
DELIMITER //
CREATE TRIGGER IF NOT EXISTS update_conversation_timestamp
AFTER INSERT ON messages
FOR EACH ROW
BEGIN
    UPDATE conversations
    SET last_message_at = NEW.created_at
    WHERE id = NEW.conversation_id;
END //
DELIMITER ;

-- Create trigger to clean up old typing indicators (older than 5 seconds)
DELIMITER //
CREATE EVENT IF NOT EXISTS cleanup_typing_indicators
ON SCHEDULE EVERY 5 SECOND
DO
BEGIN
    DELETE FROM typing_indicators
    WHERE last_typing_at < DATE_SUB(NOW(), INTERVAL 5 SECOND);
END //
DELIMITER ;

-- Enable event scheduler
SET GLOBAL event_scheduler = ON;
