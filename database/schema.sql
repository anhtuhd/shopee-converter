CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100),
    phone VARCHAR(20),
    bank_qr VARCHAR(255),
    reset_token VARCHAR(255),
    reset_token_expiry DATETIME,
    commission_rate DECIMAL(5,2) DEFAULT 0.50,
    custom_affiliate_id VARCHAR(50) DEFAULT NULL,
    role ENUM('user', 'admin') DEFAULT 'user',
    is_verified TINYINT(1) DEFAULT 0,
    verification_token VARCHAR(255) DEFAULT NULL,
    verification_token_expiry DATETIME DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS settings (
    setting_key VARCHAR(50) PRIMARY KEY,
    setting_value VARCHAR(255) NOT NULL
);

INSERT IGNORE INTO settings (setting_key, setting_value) VALUES ('global_affiliate_id', '17399820370');

CREATE TABLE IF NOT EXISTS orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL, -- e.g., 'Hoàn thành', 'Đang chờ xử lý', 'Đã hủy', 'Đã thanh toán'
    checkout_id VARCHAR(50),
    order_time DATETIME,
    completed_time DATETIME,
    click_time DATETIME,
    shop_name VARCHAR(255),
    shop_id VARCHAR(50),
    item_id VARCHAR(50),
    model_id VARCHAR(50) NOT NULL DEFAULT '',
    item_name TEXT,
    product_type VARCHAR(50),
    price DECIMAL(15,2),
    quantity INT,
    order_value DECIMAL(15,2) DEFAULT 0,
    total_commission DECIMAL(15,2) DEFAULT 0,
    user_commission DECIMAL(15,2) DEFAULT 0,
    referrer_id INT DEFAULT NULL,
    referrer_commission DECIMAL(15,2) DEFAULT 0.00,
    referrer_payout_status VARCHAR(50) DEFAULT 'Chưa thanh toán',
    sub_id1 VARCHAR(50), -- Username
    sub_id2 VARCHAR(50),
    sub_id3 VARCHAR(50),
    sub_id4 VARCHAR(50),
    sub_id5 VARCHAR(50),
    channel VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_order_item_model (order_id, item_id, model_id)
);

CREATE TABLE IF NOT EXISTS short_links (
    id INT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(8) NOT NULL UNIQUE,
    long_url TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS special_bonuses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    bonus_rate DECIMAL(5,2) NOT NULL,
    start_date DATETIME NOT NULL,
    end_date DATETIME NOT NULL,
    description VARCHAR(255) DEFAULT NULL,
    marquee_text VARCHAR(255) DEFAULT NULL,
    show_for_guests TINYINT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS referrals (
    id INT AUTO_INCREMENT PRIMARY KEY,
    referrer_id INT NOT NULL,
    referred_id INT NOT NULL UNIQUE,
    first_order_completed_at DATETIME DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (referrer_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (referred_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Bổ sung chỉ mục (Indexes) tối ưu hiệu năng
CREATE INDEX IF NOT EXISTS idx_orders_sub_id1 ON orders(sub_id1);
CREATE INDEX IF NOT EXISTS idx_orders_referrer_id ON orders(referrer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status_completed ON orders(status, completed_time);
CREATE INDEX IF NOT EXISTS idx_bonuses_user_dates ON special_bonuses(user_id, start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_orders_user_balance ON orders(sub_id1, status, user_commission);
CREATE INDEX IF NOT EXISTS idx_orders_referrer_balance ON orders(referrer_id, referrer_payout_status, status, referrer_commission);

CREATE TABLE IF NOT EXISTS payout_bills (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    username VARCHAR(50) NOT NULL,
    cutoff_date DATETIME NOT NULL,
    order_count INT NOT NULL DEFAULT 0,
    personal_payout DECIMAL(15,2) NOT NULL DEFAULT 0,
    referral_payout DECIMAL(15,2) NOT NULL DEFAULT 0,
    total_payout DECIMAL(15,2) NOT NULL DEFAULT 0,
    payment_status VARCHAR(50) NOT NULL DEFAULT 'Đã thanh toán',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX IF NOT EXISTS idx_payout_bills_username ON payout_bills(username);
CREATE INDEX IF NOT EXISTS idx_payout_bills_user_id ON payout_bills(user_id);

CREATE TABLE IF NOT EXISTS app_financials (
    id INT AUTO_INCREMENT PRIMARY KEY,
    type ENUM('revenue', 'expense') NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    category VARCHAR(100) NOT NULL,
    description TEXT,
    transaction_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX IF NOT EXISTS idx_financials_date ON app_financials(transaction_date);
CREATE INDEX IF NOT EXISTS idx_financials_type ON app_financials(type);



