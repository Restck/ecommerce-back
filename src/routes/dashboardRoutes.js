// routes/dashboard.routes.js
import express from 'express';
import { obtenerDashboard } from '../controllers/dashboardController.js';

const router = express.Router();

router.get('/', obtenerDashboard);

export default router;
