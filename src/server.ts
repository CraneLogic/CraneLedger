import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { config } from './config/index.js';
import { logger } from './utils/logger.js';
import { AppError } from './utils/errors.js';

// Import routes
import entitiesRouter from './routes/entities.js';
import journalsRouter from './routes/journals.js';
import invoicesRouter from './routes/invoices.js';
import billsRouter from './routes/bills.js';
import intercompanyRouter from './routes/intercompany.js';
import reportsRouter from './routes/reports.js';
import bookingsRouter from './routes/bookings.js';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, { 
    query: req.query,
    ip: req.ip 
  });
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'CraneLedger',
    version: '1.0.0'
  });
});

// API routes
app.use('/entities', entitiesRouter);
app.use('/entities', journalsRouter);
app.use('/entities', invoicesRouter);
app.use('/entities', billsRouter);
app.use('/entities', reportsRouter);
app.use('/intercompany', intercompanyRouter);
app.use('/bookings', bookingsRouter);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`
  });
});

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof AppError) {
    logger.warn('Application error', { 
      statusCode: err.statusCode,
      message: err.message,
      path: req.path
    });
    
    return res.status(err.statusCode).json({
      error: err.message,
      statusCode: err.statusCode,
    });
  }

  // Unexpected errors
  logger.error('Unexpected error', { 
    error: err.message,
    stack: err.stack,
    path: req.path
  });

  res.status(500).json({
    error: 'Internal Server Error',
    message: config.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred',
  });
});

// Start server
const PORT = config.PORT;

app.listen(PORT, () => {
  logger.info(`🚀 CraneLedger server started`, {
    port: PORT,
    environment: config.NODE_ENV,
  });
  console.log(`\n✅ CraneLedger API running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health\n`);
});

export default app;
