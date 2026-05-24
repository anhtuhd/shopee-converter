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
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

