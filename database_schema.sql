-- Coffee Platform Database Schema

-- Users table (for all user types)
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    user_type ENUM('escort', 'visitor', 'venue') NOT NULL,
    full_name VARCHAR(100),
    phone VARCHAR(20),
    address TEXT,
    bio TEXT,
    ethnicity VARCHAR(50),
    date_of_birth DATE NOT NULL,
    id_document_url VARCHAR(255),
    profile_image_url VARCHAR(255),
    is_verified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    affiliate_code VARCHAR(20) UNIQUE,
    referred_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (referred_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_user_type (user_type),
    INDEX idx_affiliate_code (affiliate_code),
    INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    subscription_type ENUM('escort', 'visitor', 'venue') NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    payment_reference VARCHAR(100),
    payment_proof_url VARCHAR(255),
    payment_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_subscription (user_id, is_active),
    INDEX idx_end_date (end_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Affiliate earnings table
CREATE TABLE IF NOT EXISTS affiliate_earnings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    affiliate_user_id INT NOT NULL,
    referred_user_id INT NOT NULL,
    subscription_id INT NOT NULL,
    commission_amount DECIMAL(10, 2) NOT NULL,
    commission_percentage DECIMAL(5, 2) DEFAULT 20.00,
    is_paid BOOLEAN DEFAULT FALSE,
    is_used_for_subscription BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (affiliate_user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (referred_user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE CASCADE,
    INDEX idx_affiliate_earnings (affiliate_user_id, is_paid)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Posts table (for TikTok-style content)
CREATE TABLE IF NOT EXISTS posts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    caption TEXT,
    media_type ENUM('image', 'video') NOT NULL,
    media_url VARCHAR(255) NOT NULL,
    thumbnail_url VARCHAR(255),
    duration INT,
    views_count INT DEFAULT 0,
    likes_count INT DEFAULT 0,
    comments_count INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_posts (user_id, created_at),
    INDEX idx_active_posts (is_active, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Post likes table
CREATE TABLE IF NOT EXISTS post_likes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    post_id INT NOT NULL,
    user_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_like (post_id, user_id),
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_post_likes (post_id),
    INDEX idx_user_likes (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Post comments table
CREATE TABLE IF NOT EXISTS post_comments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    post_id INT NOT NULL,
    user_id INT NOT NULL,
    comment_text TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_post_comments (post_id, created_at),
    INDEX idx_user_comments (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Conversations table
CREATE TABLE IF NOT EXISTS conversations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user1_id INT NOT NULL,
    user2_id INT NOT NULL,
    last_message_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_conversation (user1_id, user2_id),
    FOREIGN KEY (user1_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (user2_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_conversations (user1_id, last_message_at),
    INDEX idx_user2_conversations (user2_id, last_message_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    conversation_id INT NOT NULL,
    sender_id INT NOT NULL,
    message_text TEXT,
    attachment_url VARCHAR(255),
    attachment_type ENUM('image', 'video', 'document', 'location'),
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_conversation_messages (conversation_id, created_at),
    INDEX idx_sender_messages (sender_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Visitor interactions tracking (for free tier limits)
CREATE TABLE IF NOT EXISTS visitor_interactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    visitor_id INT NOT NULL,
    interaction_type ENUM('message', 'comment', 'like', 'contact_view') NOT NULL,
    target_user_id INT,
    month_year VARCHAR(7) NOT NULL,
    interaction_count INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_interaction (visitor_id, interaction_type, target_user_id, month_year),
    FOREIGN KEY (visitor_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (target_user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_visitor_interactions (visitor_id, month_year)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Events table (for venues)
CREATE TABLE IF NOT EXISTS events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    venue_id INT NOT NULL,
    event_name VARCHAR(200) NOT NULL,
    event_description TEXT,
    event_date TIMESTAMP NOT NULL,
    event_location TEXT,
    ticket_price DECIMAL(10, 2) NOT NULL,
    total_tickets INT NOT NULL,
    available_tickets INT NOT NULL,
    event_image_url VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (venue_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_venue_events (venue_id, event_date),
    INDEX idx_active_events (is_active, event_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Event tickets table
CREATE TABLE IF NOT EXISTS event_tickets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    event_id INT NOT NULL,
    user_id INT NOT NULL,
    ticket_code VARCHAR(100) UNIQUE NOT NULL,
    qr_code_url VARCHAR(255),
    is_used BOOLEAN DEFAULT FALSE,
    used_at TIMESTAMP NULL,
    purchase_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_event_tickets (event_id),
    INDEX idx_user_tickets (user_id),
    INDEX idx_ticket_code (ticket_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Payment transactions table
CREATE TABLE IF NOT EXISTS payment_transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    transaction_type ENUM('subscription', 'event_ticket', 'affiliate_payout') NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    payment_method ENUM('stripe', 'payfast', 'yoco', 'manual') NOT NULL,
    payment_reference VARCHAR(100),
    payment_proof_url VARCHAR(255),
    status ENUM('pending', 'verified', 'failed', 'refunded') DEFAULT 'pending',
    related_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_transactions (user_id, created_at),
    INDEX idx_payment_reference (payment_reference)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- System settings table (for dynamic configuration)
CREATE TABLE IF NOT EXISTS system_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT NOT NULL,
    setting_type ENUM('string', 'number', 'boolean', 'json') DEFAULT 'string',
    description TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_setting_key (setting_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default system settings
INSERT INTO system_settings (setting_key, setting_value, setting_type, description) VALUES
('escort_monthly_fee', '49.99', 'number', 'Monthly subscription fee for escorts'),
('visitor_monthly_fee', '49.99', 'number', 'Monthly subscription fee for site visitors'),
('venue_monthly_fee', '99.99', 'number', 'Monthly subscription fee for venues'),
('affiliate_commission_rate', '20', 'number', 'Affiliate commission percentage'),
('min_affiliate_payout', '100', 'number', 'Minimum affiliate earnings for payout'),
('free_visitor_message_limit', '5', 'number', 'Monthly message limit for free visitors'),
('free_visitor_comment_limit', '10', 'number', 'Monthly comment limit for free visitors'),
('free_visitor_like_limit', '10', 'number', 'Monthly like limit for free visitors'),
('min_age_requirement', '18', 'number', 'Minimum age requirement'),
('max_video_duration', '60', 'number', 'Maximum video duration in seconds'),
('site_name', 'Coffee', 'string', 'Site name'),
('site_description', 'Premium escort platform', 'string', 'Site description')
ON DUPLICATE KEY UPDATE setting_value=VALUES(setting_value);
