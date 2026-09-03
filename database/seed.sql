-- =======================================================
-- Seed Initial Data for Community Platform
-- =======================================================

USE community_platform;

-- Note: Passwords below are hashed for 'Admin@123', 'User@123', 'Ngo@123', 'Org@123'
-- using bcrypt (cost 10)

-- 1. Insert Default Admin, NGO, Org, User
INSERT INTO users (id, name, email, password_hash, role, phone, organization_name, bio, status)
VALUES 
(1, 'Super Administrator', 'admin@platform.com', '$2b$10$wE47c0bS5wPzQZ6cEvqZ9u35kC98Q7x6u6q1Z8c7f9kC6aD9f2kC6', 'ADMIN', '+1000000000', 'Platform HQ', 'Master system administrator with full control.', 'ACTIVE'),
(2, 'Green Earth NGO', 'contact@greenearth.ngo', '$2b$10$wE47c0bS5wPzQZ6cEvqZ9u35kC98Q7x6u6q1Z8c7f9kC6aD9f2kC6', 'NGO', '+1987654321', 'Green Earth Foundation', 'Dedicated to environmental conservation and tree plantations.', 'ACTIVE'),
(3, 'TechForward Corp', 'csr@techforward.org', '$2b$10$wE47c0bS5wPzQZ6cEvqZ9u35kC98Q7x6u6q1Z8c7f9kC6aD9f2kC6', 'ORG', '+18005550199', 'TechForward CSR Initiative', 'Corporate social responsibility program focusing on digital literacy.', 'ACTIVE'),
(4, 'John Doe', 'john.doe@example.com', '$2b$10$wE47c0bS5wPzQZ6cEvqZ9u35kC98Q7x6u6q1Z8c7f9kC6aD9f2kC6', 'USER', '+15551234567', NULL, 'Passionate community volunteer and teacher.', 'ACTIVE')
ON DUPLICATE KEY UPDATE id=id;

-- 2. Insert Sample Activities
INSERT INTO activities (id, title, description, category, location, event_date, target_volunteers, created_by, status)
VALUES
(1, 'City Park Reforestation Drive', 'Join us to plant 500 indigenous trees in the city central park. Tools and refreshments provided!', 'Environment', 'Central City Park, Gate 3', DATE_ADD(NOW(), INTERVAL 7 DAY), 50, 2, 'UPCOMING'),
(2, 'Youth Digital Literacy Workshop', 'Teaching foundational computer skills, coding basics, and web safety to underserved youth.', 'Education', 'Community Center Room 101', DATE_ADD(NOW(), INTERVAL 14 DAY), 15, 3, 'UPCOMING'),
(3, 'Weekend Food Distribution', 'Sorting and packing food parcels for families affected by the seasonal floods.', 'Food Relief', 'Downtown Relief Depot', DATE_ADD(NOW(), INTERVAL 3 DAY), 30, 2, 'UPCOMING')
ON DUPLICATE KEY UPDATE id=id;

-- 3. Insert Sample Help Requests
INSERT INTO requests (id, title, description, category, urgency, contact_info, location, user_id, status, admin_notes)
VALUES
(1, 'Emergency Drinking Water Supply', 'Immediate requirement for clean drinking water packets following recent pipe contamination in Sector 4.', 'Disaster Relief', 'HIGH', 'sector4help@mail.com', 'Sector 4 Community Hall', 4, 'APPROVED', 'Verified by Admin. High priority dispatch authorized.'),
(2, 'Textbooks and Stationery Needed for 30 Children', 'Seeking primary grade math and science textbooks along with notebooks and pencils.', 'Education', 'MEDIUM', 'teachcare@mail.com', 'Eastside Free School', 4, 'PENDING', NULL)
ON DUPLICATE KEY UPDATE id=id;
