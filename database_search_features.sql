-- Advanced Search Features Database Schema

-- Search history table
CREATE TABLE IF NOT EXISTS search_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    search_query VARCHAR(255) NOT NULL,
    search_type ENUM('escort', 'venue', 'all') DEFAULT 'all',
    result_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_searches (user_id, created_at),
    INDEX idx_search_query (search_query)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Trending searches table
CREATE TABLE IF NOT EXISTS trending_searches (
    id INT AUTO_INCREMENT PRIMARY KEY,
    search_query VARCHAR(255) NOT NULL,
    search_count INT DEFAULT 1,
    last_searched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    week_year VARCHAR(7) NOT NULL,
    UNIQUE KEY unique_trending (search_query, week_year),
    INDEX idx_week_year (week_year, search_count)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- User follows table (for suggested users)
CREATE TABLE IF NOT EXISTS user_follows (
    id INT AUTO_INCREMENT PRIMARY KEY,
    follower_id INT NOT NULL,
    following_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_follow (follower_id, following_id),
    FOREIGN KEY (follower_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (following_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_follower (follower_id),
    INDEX idx_following (following_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Profile views tracking (for suggested users)
CREATE TABLE IF NOT EXISTS profile_views (
    id INT AUTO_INCREMENT PRIMARY KEY,
    viewer_id INT,
    profile_id INT NOT NULL,
    view_date DATE NOT NULL,
    view_count INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_daily_view (viewer_id, profile_id, view_date),
    FOREIGN KEY (viewer_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (profile_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_profile_views (profile_id, view_date),
    INDEX idx_viewer_views (viewer_id, view_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- User locations table (for nearby search)
CREATE TABLE IF NOT EXISTS user_locations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    city VARCHAR(100),
    province VARCHAR(100),
    country VARCHAR(100) DEFAULT 'South Africa',
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    postal_code VARCHAR(20),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_city (city),
    INDEX idx_province (province),
    INDEX idx_coordinates (latitude, longitude)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Search filters preferences (save user's preferred filters)
CREATE TABLE IF NOT EXISTS search_preferences (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    preference_name VARCHAR(100) NOT NULL,
    filters JSON NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_preferences (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add city column to users table if not exists
ALTER TABLE users ADD COLUMN IF NOT EXISTS city VARCHAR(100);
ALTER TABLE users ADD INDEX IF NOT EXISTS idx_city (city);
ALTER TABLE users ADD INDEX IF NOT EXISTS idx_username (username);
ALTER TABLE users ADD INDEX IF NOT EXISTS idx_full_name (full_name);

-- Insert sample trending searches
INSERT INTO trending_searches (search_query, search_count, week_year) VALUES
('johannesburg escorts', 150, DATE_FORMAT(NOW(), '%Y-%u')),
('cape town escorts', 120, DATE_FORMAT(NOW(), '%Y-%u')),
('durban escorts', 95, DATE_FORMAT(NOW(), '%Y-%u')),
('verified escorts', 180, DATE_FORMAT(NOW(), '%Y-%u')),
('premium venues', 85, DATE_FORMAT(NOW(), '%Y-%u'))
ON DUPLICATE KEY UPDATE search_count = search_count + VALUES(search_count);

-- Add fulltext indexes for better search performance
ALTER TABLE users ADD FULLTEXT INDEX idx_search_fulltext (username, full_name, bio);
