-- =======================================================
-- Database Schema for Community Platform
-- Roles: USER, NGO, ORG, ADMIN
-- =======================================================

CREATE DATABASE IF NOT EXISTS community_platform;
USE community_platform;

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('USER', 'NGO', 'ORG', 'ADMIN') NOT NULL DEFAULT 'USER',
    phone VARCHAR(20) DEFAULT NULL,
    organization_name VARCHAR(150) DEFAULT NULL,
    bio TEXT DEFAULT NULL,
    status ENUM('ACTIVE', 'PENDING', 'BLOCKED') NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 2. Activities / Events Table (Posted by NGO, ORG, or ADMIN)
CREATE TABLE IF NOT EXISTS activities (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(50) NOT NULL, -- e.g., 'Education', 'Environment', 'Health', 'Food Relief'
    location VARCHAR(200) NOT NULL,
    event_date DATETIME NOT NULL,
    target_volunteers INT DEFAULT 0,
    created_by INT NOT NULL,
    status ENUM('UPCOMING', 'ONGOING', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'UPCOMING',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

-- 3. Community Help & Resource Requests (Submitted by Users/NGOs/Orgs)
CREATE TABLE IF NOT EXISTS help_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(50) NOT NULL, -- e.g., 'Medical', 'Food', 'Disaster', 'Education'
    urgency ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') NOT NULL DEFAULT 'MEDIUM',
    contact_info VARCHAR(150) NOT NULL,
    location VARCHAR(200) NOT NULL,
    latitude DECIMAL(10, 8) NULL,
    longitude DECIMAL(11, 8) NULL,
    user_id INT NOT NULL,
    status ENUM('PENDING', 'APPROVED', 'REJECTED', 'RESOLVED') NOT NULL DEFAULT 'PENDING',
    admin_notes TEXT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 4. Activity Participants (Users registering for an activity)
CREATE TABLE IF NOT EXISTS activity_participants (
    id INT AUTO_INCREMENT PRIMARY KEY,
    activity_id INT NOT NULL,
    user_id INT NOT NULL,
    status ENUM('REGISTERED', 'ATTENDED', 'CANCELLED') DEFAULT 'REGISTERED',
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_participant (activity_id, user_id),
    FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 5. Audit / System Logs (For Admin tracking)
CREATE TABLE IF NOT EXISTS audit_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    action VARCHAR(100) NOT NULL,
    details TEXT DEFAULT NULL,
    performed_by INT DEFAULT NULL,
    ip_address VARCHAR(45) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (performed_by) REFERENCES users(id) ON DELETE SET NULL
);
