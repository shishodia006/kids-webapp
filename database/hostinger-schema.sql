-- Konnectly Kids MySQL schema for Hostinger/phpMyAdmin.
-- Import this file into the database named in DB_NAME.
-- Engine: InnoDB, charset: utf8mb4.

SET NAMES utf8mb4;
SET time_zone = '+00:00';

CREATE TABLE IF NOT EXISTS users (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  email VARCHAR(190) NULL,
  mobile VARCHAR(20) NOT NULL,
  password VARCHAR(255) NULL,
  parent_name VARCHAR(190) NOT NULL,
  father_name VARCHAR(190) NULL,
  mother_name VARCHAR(190) NULL,
  alternate_mobile VARCHAR(20) NULL,
  profession VARCHAR(190) NULL,
  address TEXT NULL,
  locality VARCHAR(190) NULL,
  city VARCHAR(120) NULL,
  state VARCHAR(120) NULL,
  pincode VARCHAR(20) NULL,
  child_name VARCHAR(190) NULL,
  age TINYINT UNSIGNED NULL,
  block_sector VARCHAR(120) NULL,
  konnekt_kode VARCHAR(60) NULL,
  role ENUM('user','admin') NOT NULL DEFAULT 'user',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_mobile (mobile),
  UNIQUE KEY uq_users_email (email),
  UNIQUE KEY uq_users_konnekt_kode (konnekt_kode),
  KEY idx_users_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS kids (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  parent_id INT UNSIGNED NOT NULL,
  child_name VARCHAR(190) NOT NULL,
  age TINYINT UNSIGNED NULL,
  school VARCHAR(190) NULL,
  dob DATE NULL,
  photo VARCHAR(255) NULL,
  school_id_card VARCHAR(255) NULL,
  block_rank VARCHAR(80) NOT NULL DEFAULT 'Newbie',
  status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  konnekt_kode VARCHAR(60) NULL,
  konnekt_points INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_kids_konnekt_kode (konnekt_kode),
  KEY idx_kids_parent_id (parent_id),
  KEY idx_kids_status (status),
  CONSTRAINT fk_kids_parent FOREIGN KEY (parent_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS events (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  title VARCHAR(190) NOT NULL,
  description TEXT NULL,
  category VARCHAR(80) NULL,
  event_date DATETIME NULL,
  location VARCHAR(190) NULL,
  price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  image TEXT NULL,
  capacity INT UNSIGNED NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_events_date (event_date),
  KEY idx_events_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS bookings (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id INT UNSIGNED NOT NULL,
  kid_id INT UNSIGNED NOT NULL,
  event_id INT UNSIGNED NOT NULL,
  razorpay_payment_id VARCHAR(190) NULL,
  amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  qr_token VARCHAR(120) NOT NULL,
  payment_status ENUM('pending','success','failed','refunded') NOT NULL DEFAULT 'pending',
  checked_in_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_bookings_qr_token (qr_token),
  KEY idx_bookings_user_id (user_id),
  KEY idx_bookings_kid_id (kid_id),
  KEY idx_bookings_event_id (event_id),
  KEY idx_bookings_payment_status (payment_status),
  CONSTRAINT fk_bookings_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_bookings_kid FOREIGN KEY (kid_id) REFERENCES kids(id) ON DELETE CASCADE,
  CONSTRAINT fk_bookings_event FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS brands (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(190) NOT NULL,
  description TEXT NULL,
  note VARCHAR(255) NULL,
  logo TEXT NULL,
  image TEXT NULL,
  points_cost INT NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_brands_active (is_active),
  KEY idx_brands_points_cost (points_cost)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS redemptions (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  kid_id INT UNSIGNED NOT NULL,
  brand_id INT UNSIGNED NULL,
  brand_name VARCHAR(190) NOT NULL,
  points_spent INT NOT NULL DEFAULT 0,
  coupon_code VARCHAR(120) NOT NULL,
  status ENUM('issued','redeemed','cancelled','expired') NOT NULL DEFAULT 'issued',
  redeemed_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_redemptions_coupon_code (coupon_code),
  KEY idx_redemptions_kid_id (kid_id),
  KEY idx_redemptions_brand_id (brand_id),
  KEY idx_redemptions_status (status),
  CONSTRAINT fk_redemptions_kid FOREIGN KEY (kid_id) REFERENCES kids(id) ON DELETE CASCADE,
  CONSTRAINT fk_redemptions_brand FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS notifications (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  message TEXT NOT NULL,
  type ENUM('announcement','alert') NOT NULL DEFAULT 'announcement',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_notifications_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS hero_slides (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  title VARCHAR(190) NOT NULL,
  subtitle TEXT NULL,
  image TEXT NOT NULL,
  cta_label VARCHAR(80) NULL,
  target VARCHAR(80) NOT NULL DEFAULT 'activities',
  sort_order INT NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_hero_slides_active_sort (is_active, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS referral_rewards (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  referrer_parent_id INT UNSIGNED NOT NULL,
  referred_parent_id INT UNSIGNED NOT NULL,
  referral_code VARCHAR(60) NOT NULL,
  points_awarded INT NOT NULL DEFAULT 50,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_referral_rewards_referrer (referrer_parent_id),
  KEY idx_referral_rewards_referred (referred_parent_id),
  CONSTRAINT fk_referral_rewards_referrer FOREIGN KEY (referrer_parent_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_referral_rewards_referred FOREIGN KEY (referred_parent_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS brand_users (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  brand_id INT UNSIGNED NOT NULL,
  brand_name VARCHAR(190) NULL,
  email VARCHAR(190) NOT NULL,
  password VARCHAR(255) NOT NULL,
  partner_mobile VARCHAR(20) NOT NULL,
  referral_code VARCHAR(60) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_brand_users_email (email),
  UNIQUE KEY uq_brand_users_referral_code (referral_code),
  KEY idx_brand_users_brand_id (brand_id),
  KEY idx_brand_users_active (is_active),
  CONSTRAINT fk_brand_users_brand FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS brand_referrals (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  brand_user_id INT UNSIGNED NOT NULL,
  referred_parent_id INT UNSIGNED NOT NULL,
  referral_code VARCHAR(60) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_brand_referrals_brand_user (brand_user_id),
  KEY idx_brand_referrals_parent (referred_parent_id),
  CONSTRAINT fk_brand_referrals_brand_user FOREIGN KEY (brand_user_id) REFERENCES brand_users(id) ON DELETE CASCADE,
  CONSTRAINT fk_brand_referrals_parent FOREIGN KEY (referred_parent_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Optional starter data.
INSERT INTO brands (name, description, note, points_cost, is_active)
SELECT 'Cafe Coffee Day', 'Partner reward voucher', 'Show voucher at counter', 250, 1
WHERE NOT EXISTS (SELECT 1 FROM brands WHERE name = 'Cafe Coffee Day');

INSERT INTO brands (name, description, note, points_cost, is_active)
SELECT 'Hamleys', 'Partner reward voucher', 'Valid at participating outlet', 500, 1
WHERE NOT EXISTS (SELECT 1 FROM brands WHERE name = 'Hamleys');

INSERT INTO notifications (message, type)
SELECT 'Welcome to Konnectly Kids!', 'announcement'
WHERE NOT EXISTS (SELECT 1 FROM notifications LIMIT 1);
