import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Import controllers
import { signup, login, getMe, onboarding, updateProfile, changePassword, getSecurityQuestion, resetPassword } from './controllers/auth-controller.js';
import { addTransaction, getTransactions, deleteTransaction, updateTransaction } from './controllers/transaction-controller.js';
import {
  getSurplusStatus,
  getEmergencyStatus,
  runFDCalculator,
  runSIPCalculator,
  runScenarioComparison,
  createGoal,
  getGoals,
  deleteGoal
} from './controllers/advisor-controller.js';
import {
  getMonthlyInsight,
  checkAffordability,
  getGeneralAdvisor,
  getExplainResult
} from './controllers/ai-controller.js';

// Import JWT middleware
import authMiddleware from './middleware/auth.js';

// Initialize configuration
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Router
const router = express.Router();

// --- Public Auth Routes ---
router.post('/auth/signup', signup);
router.post('/auth/login', login);
router.get('/auth/security-question', getSecurityQuestion);
router.post('/auth/reset-password', resetPassword);

// --- Protected Routes ---
router.use(authMiddleware);

// Auth Me & Onboarding
router.get('/auth/me', getMe);
router.post('/user/onboarding', onboarding);
router.put('/user/profile', updateProfile);
router.put('/auth/change-password', changePassword);

// Transactions CRUD
router.post('/transactions', addTransaction);
router.get('/transactions', getTransactions);
router.put('/transactions/:id', updateTransaction);
router.delete('/transactions/:id', deleteTransaction);

// Advisor Calculations & Goals CRUD
router.get('/advisor/surplus', getSurplusStatus);
router.get('/advisor/emergency-status', getEmergencyStatus);
router.post('/advisor/calculate-fd', runFDCalculator);
router.post('/advisor/calculate-sip', runSIPCalculator);
router.post('/advisor/calculate-compare', runScenarioComparison);
router.post('/goals', createGoal);
router.get('/goals', getGoals);
router.delete('/goals/:id', deleteGoal);

// AI Advisor Endpoints
router.post('/ai/monthly-insight', getMonthlyInsight);
router.post('/ai/affordability', checkAffordability);
router.post('/ai/advisor', getGeneralAdvisor);
router.post('/ai/explain-result', getExplainResult);

// Health check
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'API is running smoothly' });
});

// Mount router under /api
app.use('/api', router);

// Error Handling Middleware
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({ message: 'Internal Server Error' });
});

// Start Express server locally if run directly (Vercel overrides this)
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Server running in development mode on http://localhost:${PORT}`);
  });
}

export default app;
