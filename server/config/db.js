const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

let pool = null;
let isUsingFallback = false;

// In-memory fallback database store in case MySQL is not running locally
const memoryStore = {
  users: [],
  activities: [],
  requests: [],
  activity_participants: [],
  audit_logs: [],
  nextIds: { users: 1, activities: 1, requests: 1, activity_participants: 1, audit_logs: 1 }
};

// Seed initial memory store
async function seedMemoryStore() {
  const hash = await bcrypt.hash('Admin@123', 10);
  const userHash = await bcrypt.hash('User@123', 10);
  const ngoHash = await bcrypt.hash('Ngo@123', 10);
  const orgHash = await bcrypt.hash('Org@123', 10);

  memoryStore.users = [
    {
      id: 1,
      name: 'Super Administrator',
      email: 'admin@platform.com',
      password_hash: hash,
      role: 'ADMIN',
      phone: '+1000000000',
      organization_name: 'Platform HQ',
      bio: 'Master system administrator with full control.',
      status: 'ACTIVE',
      created_at: new Date()
    },
    {
      id: 2,
      name: 'Green Earth NGO',
      email: 'contact@greenearth.ngo',
      password_hash: ngoHash,
      role: 'NGO',
      phone: '+1987654321',
      organization_name: 'Green Earth Foundation',
      bio: 'Dedicated to environmental conservation and tree plantations.',
      status: 'ACTIVE',
      created_at: new Date()
    },
    {
      id: 3,
      name: 'TechForward Corp',
      email: 'csr@techforward.org',
      password_hash: orgHash,
      role: 'ORG',
      phone: '+18005550199',
      organization_name: 'TechForward CSR Initiative',
      bio: 'Corporate social responsibility program focusing on digital literacy.',
      status: 'ACTIVE',
      created_at: new Date()
    },
    {
      id: 4,
      name: 'John Doe',
      email: 'john.doe@example.com',
      password_hash: userHash,
      role: 'USER',
      phone: '+15551234567',
      organization_name: null,
      bio: 'Passionate community volunteer and teacher.',
      status: 'ACTIVE',
      created_at: new Date()
    }
  ];
  memoryStore.nextIds.users = 5;

  memoryStore.activities = [
    {
      id: 1,
      title: 'City Park Reforestation Drive',
      description: 'Join us to plant 500 indigenous trees in the city central park. Tools and refreshments provided!',
      category: 'Environment',
      location: 'Central City Park, Gate 3',
      event_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      target_volunteers: 50,
      created_by: 2,
      creator_name: 'Green Earth NGO',
      creator_role: 'NGO',
      status: 'UPCOMING',
      participant_count: 1,
      created_at: new Date()
    },
    {
      id: 2,
      title: 'Youth Digital Literacy Workshop',
      description: 'Teaching foundational computer skills, coding basics, and web safety to underserved youth.',
      category: 'Education',
      location: 'Community Center Room 101',
      event_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      target_volunteers: 15,
      created_by: 3,
      creator_name: 'TechForward Corp',
      creator_role: 'ORG',
      status: 'UPCOMING',
      participant_count: 0,
      created_at: new Date()
    },
    {
      id: 3,
      title: 'Weekend Food Distribution',
      description: 'Sorting and packing food parcels for families affected by the seasonal floods.',
      category: 'Food Relief',
      location: 'Downtown Relief Depot',
      event_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      target_volunteers: 30,
      created_by: 2,
      creator_name: 'Green Earth NGO',
      creator_role: 'NGO',
      status: 'UPCOMING',
      participant_count: 0,
      created_at: new Date()
    }
  ];
  memoryStore.nextIds.activities = 4;

  memoryStore.requests = [
    {
      id: 1,
      title: 'Emergency Drinking Water Supply',
      description: 'Immediate requirement for clean drinking water packets following recent pipe contamination in Sector 4.',
      category: 'Disaster Relief',
      urgency: 'HIGH',
      contact_info: 'sector4help@mail.com',
      location: 'Sector 4 Community Hall',
      user_id: 4,
      user_name: 'John Doe',
      user_email: 'john.doe@example.com',
      user_role: 'USER',
      status: 'APPROVED',
      admin_notes: 'Verified by Admin. High priority dispatch authorized.',
      created_at: new Date()
    },
    {
      id: 2,
      title: 'Textbooks and Stationery Needed for 30 Children',
      description: 'Seeking primary grade math and science textbooks along with notebooks and pencils.',
      category: 'Education',
      urgency: 'MEDIUM',
      contact_info: 'teachcare@mail.com',
      location: 'Eastside Free School',
      user_id: 4,
      user_name: 'John Doe',
      user_email: 'john.doe@example.com',
      user_role: 'USER',
      status: 'PENDING',
      admin_notes: null,
      created_at: new Date()
    }
  ];
  memoryStore.nextIds.requests = 3;

  memoryStore.activity_participants = [
    {
      id: 1,
      activity_id: 1,
      user_id: 4,
      status: 'REGISTERED',
      joined_at: new Date()
    }
  ];
  memoryStore.nextIds.activity_participants = 2;
}

// Initialize Database Connection & Tables
async function initDB() {
  const isCloudDB = process.env.DB_HOST && 
                    process.env.DB_HOST !== 'localhost' && 
                    process.env.DB_HOST !== '127.0.0.1';

  const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'community_platform',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    ssl: isCloudDB ? { rejectUnauthorized: false } : undefined
  };

  try {
    // Attempt connecting to MySQL server directly
    try {
      const tempConnection = await mysql.createConnection({
        host: dbConfig.host,
        port: dbConfig.port,
        user: dbConfig.user,
        password: dbConfig.password,
        ssl: dbConfig.ssl
      });
      await tempConnection.query(`CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\`;`);
      await tempConnection.end();
    } catch (e) {
      // Ignore if user does not have permission to CREATE DATABASE on cloud providers
    }

    // Create pool
    pool = mysql.createPool(dbConfig);
    const conn = await pool.getConnection();
    console.log(`[DB] Successfully connected to MySQL database: ${dbConfig.database}`);
    conn.release();

    // Create tables automatically
    await createTables();
    await seedDefaultAdmin();
    isUsingFallback = false;
  } catch (err) {
    console.warn(`[DB WARNING] Could not connect to MySQL server at ${dbConfig.host}:${dbConfig.port} (${err.message}).`);
    console.log('[DB INFO] Initializing high-speed in-memory database mode so server and frontend remain 100% operational.');
    console.log('[DB INFO] To use real MySQL, start MySQL service and update server/.env with your MySQL credentials.');
    await seedMemoryStore();
    isUsingFallback = true;
  }
}

async function createTables() {
  if (!pool) return;
  const queries = [
    `CREATE TABLE IF NOT EXISTS users (
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
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,
    `CREATE TABLE IF NOT EXISTS activities (
      id INT AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(200) NOT NULL,
      description TEXT NOT NULL,
      category VARCHAR(50) NOT NULL,
      location VARCHAR(200) NOT NULL,
      event_date DATETIME NOT NULL,
      target_volunteers INT DEFAULT 0,
      created_by INT NOT NULL,
      status ENUM('UPCOMING', 'ONGOING', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'UPCOMING',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,
    `CREATE TABLE IF NOT EXISTS help_requests (
      id INT AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(200) NOT NULL,
      description TEXT NOT NULL,
      category VARCHAR(50) NOT NULL,
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
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,
    `CREATE TABLE IF NOT EXISTS activity_participants (
      id INT AUTO_INCREMENT PRIMARY KEY,
      activity_id INT NOT NULL,
      user_id INT NOT NULL,
      status ENUM('REGISTERED', 'ATTENDED', 'CANCELLED') DEFAULT 'REGISTERED',
      joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY unique_participant (activity_id, user_id),
      FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,
    `CREATE TABLE IF NOT EXISTS audit_logs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      action VARCHAR(100) NOT NULL,
      details TEXT DEFAULT NULL,
      performed_by INT DEFAULT NULL,
      ip_address VARCHAR(45) DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (performed_by) REFERENCES users(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`
  ];

  for (const q of queries) {
    await pool.query(q);
  }

  // Auto-migrate columns if table already existed
  try {
    await pool.query(`ALTER TABLE help_requests ADD COLUMN latitude DECIMAL(10, 8) NULL AFTER location;`);
  } catch (e) { /* Already exists */ }
  try {
    await pool.query(`ALTER TABLE help_requests ADD COLUMN longitude DECIMAL(11, 8) NULL AFTER latitude;`);
  } catch (e) { /* Already exists */ }

  console.log('[DB] Database tables verified / created successfully.');
}

async function seedDefaultAdmin() {
  if (!pool) return;
  const [rows] = await pool.query('SELECT id FROM users WHERE email = ?', ['admin@platform.com']);
  if (rows.length === 0) {
    const hash = await bcrypt.hash('Admin@123', 10);
    const userHash = await bcrypt.hash('User@123', 10);
    const ngoHash = await bcrypt.hash('Ngo@123', 10);
    const orgHash = await bcrypt.hash('Org@123', 10);

    await pool.query(
      `INSERT INTO users (name, email, password_hash, role, phone, organization_name, bio, status)
       VALUES (?, ?, ?, 'ADMIN', '+1000000000', 'Platform HQ', 'Master administrator with full system permissions', 'ACTIVE')`,
      ['Super Administrator', 'admin@platform.com', hash]
    );

    await pool.query(
      `INSERT INTO users (name, email, password_hash, role, phone, organization_name, bio, status)
       VALUES (?, ?, ?, 'NGO', '+1987654321', 'Green Earth Foundation', 'Environmental protection and sustainable forestry', 'ACTIVE')`,
      ['Green Earth NGO', 'contact@greenearth.ngo', ngoHash]
    );

    await pool.query(
      `INSERT INTO users (name, email, password_hash, role, phone, organization_name, bio, status)
       VALUES (?, ?, ?, 'ORG', '+18005550199', 'TechForward CSR Initiative', 'Corporate volunteering for tech education', 'ACTIVE')`,
      ['TechForward Corp', 'csr@techforward.org', orgHash]
    );

    await pool.query(
      `INSERT INTO users (name, email, password_hash, role, phone, organization_name, bio, status)
       VALUES (?, ?, ?, 'USER', '+15551234567', NULL, 'Community volunteer and educator', 'ACTIVE')`,
      ['John Doe', 'john.doe@example.com', userHash]
    );

    console.log('[DB] Default accounts seeded (Admin, NGO, Org, User).');
  }
}

module.exports = {
  getPool: () => pool,
  getMemoryStore: () => memoryStore,
  isFallback: () => isUsingFallback,
  initDB
};
