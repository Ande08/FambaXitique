const express = require('express');
const cors = require('cors');
const path = require('path');
const sequelize = require('./src/config/database');
const models = require('./src/models'); // This triggers associations
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Permissive CORS/CSP Headers to fix "Stuck" UI
app.use((req, res, next) => {
  res.setHeader('Content-Security-Policy', "default-src * 'unsafe-inline' 'unsafe-eval' data: blob:; script-src * 'unsafe-inline' 'unsafe-eval'; style-src * 'unsafe-inline';");
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', '*');
  res.setHeader('Access-Control-Allow-Headers', '*');
  next();
});

// Simple Request Logger
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// Routes stubs
const authRoutes = require('./src/routes/authRoutes');
const groupRoutes = require('./src/routes/groupRoutes');
const paymentRoutes = require('./src/routes/paymentRoutes');
const invoiceRoutes = require('./src/routes/invoiceRoutes');
const loanRoutes = require('./src/routes/loanRoutes');
const botRoutes = require('./src/routes/botRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/loans', loanRoutes);
app.use('/api/bot', botRoutes);

app.get('/', (req, res) => {
  res.send('FambaXitique API is running');
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[GLOBAL ERROR]', err);
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
});

async function startServer() {
  try {
    await sequelize.authenticate();
    console.log('Database connected successfully.');
    
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server is running on port ${PORT} (0.0.0.0)`);
    });

    // Start Scheduler
    const { automateInvoiceGeneration, updateOverdueInvoices } = require('./src/controllers/invoiceController');
    
    // Run once on startup
    automateInvoiceGeneration();
    updateOverdueInvoices();

    // Run every 6 hours
    setInterval(() => {
        console.log('[Scheduler] Running automated tasks...');
        automateInvoiceGeneration();
        updateOverdueInvoices();
    }, 6 * 60 * 60 * 1000);

  } catch (error) {
    console.error('CRITICAL: Unable to connect to the database:', error);
    process.exit(1);
  }
}

startServer();
