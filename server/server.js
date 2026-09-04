const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
require('dotenv').config();

const { initDB, isFallback } = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const activityRoutes = require('./routes/activityRoutes');
const requestRoutes = require('./routes/requestRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Static files (Serve the frontend directly from the server)
const frontendPath = path.join(__dirname, '..', 'frontend');
app.use(express.static(frontendPath));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/activities', activityRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/admin', adminRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    database_mode: isFallback() ? 'IN_MEMORY_RAM_ONLY' : 'MYSQL_CONNECTED',
    database_name: process.env.DB_NAME || 'community_platform',
    timestamp: new Date(),
    service: 'Civilink Platform API'
  });
});

// Fallback for HTML5 Single Page/Multi Page routing
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ success: false, error: 'API endpoint not found' });
  }
  // Try sending the requested HTML file if it exists, or index.html
  const targetPath = path.join(frontendPath, req.path.endsWith('.html') ? req.path : `${req.path}.html`);
  res.sendFile(targetPath, err => {
    if (err) {
      res.sendFile(path.join(frontendPath, 'index.html'));
    }
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[Server Error]', err.stack);
  res.status(500).json({
    success: false,
    error: 'Internal Server Error: ' + err.message
  });
});

// Start Server
async function startServer() {
  await initDB();
  app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`🚀 Civilink Platform Server running on port ${PORT}`);
    console.log(`💾 Database: ${isFallback() ? '⚠️  IN-MEMORY FALLBACK (Data saving to RAM, MySQL is OFFLINE)' : '✅ MYSQL LIVE CONNECTED (' + (process.env.DB_NAME || 'community_platform') + ')'}`);
    console.log(`🌐 Web App: http://localhost:${PORT}`);
    console.log(`🛡️  Admin Panel: http://localhost:${PORT}/admin.html`);
    console.log(`====================================================`);
  });
}

startServer();
