import express from 'express';
import {
  loginUsuario,
  registrarUsuario,
  actualizarPerfil,
} from '../controllers/authController.js';

import { protegerRuta } from '../middlewares/authMiddleware.js';

const router = express.Router();

// 🟢 Ruta: login de usuario
router.post('/login', loginUsuario);

// 🟢 Ruta: registro
router.post('/register', registrarUsuario);

// 🟢 Ruta: actualizar perfil (requiere JWT)
router.put('/actualizar-perfil', protegerRuta, actualizarPerfil);

export default router;
