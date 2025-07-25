const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Routes
const authRoutes = require('./routes/auth');
const leadRoutes = require('./routes/leads');
const formRoutes = require('./routes/forms');
const facebookRoutes = require('./routes/facebook');

// Controllers
const facebookLeadController = require('./controllers/facebookLeadController');
const formController = require('./controllers/formController');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Database connection
const connectDB = async () => {
  try {
    // For local development, use a local MongoDB
    const mongoURI = 'mongodb://localhost:27017/fb-leads';
    
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000 // Timeout after 5s instead of 30s
    });
    
    console.log('MongoDB connected successfully');
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    console.log('Using in-memory MongoDB for demo purposes...');
    
    try {
      // Import the MongoMemoryServer
      const { MongoMemoryServer } = require('mongodb-memory-server');
      const mongod = await MongoMemoryServer.create();
      const uri = mongod.getUri();
      
      await mongoose.connect(uri, {
        useNewUrlParser: true,
        useUnifiedTopology: true
      });
      
      console.log('Connected to in-memory MongoDB');
    } catch (memErr) {
      console.error('Failed to connect to in-memory MongoDB:', memErr);
      console.log('Please make sure MongoDB is installed and running');
    }
  }
};

// Connect to MongoDB
connectDB();

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/forms', formRoutes);
app.use('/api/facebook', facebookRoutes);

// Health check route
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Server is running' });
});

// Serve static assets in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/build')));
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../client/build', 'index.html'));
  });
}

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  
  // Start the cron jobs
  facebookLeadController.startCronJob();
  formController.startFormDiscoveryCron();
  
  console.log('Cron jobs started: Lead sync (every 2 minutes), Form discovery (every 1 minute)');
}); 