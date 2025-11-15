import express from 'express';
import {
  registrarUsuario,
  obtenerUsuarios,
  obtenerUsuario,
  eliminarUsuario,
  actualizarRolUsuario,
  estadisticasClientes,
  estadisticasVendedores,
  estadisticasMias,
} from '../controllers/userController.js';

import {
  protegerRuta,
  permitirRoles,
} from '../middlewares/authMiddleware.js';

const router = express.Router();

/* ────────────────────────────────
 🧩 RUTAS DE USUARIO
──────────────────────────────── */

// 🔹 Registrar nuevo usuario (público)
router.post('/registro', registrarUsuario);

// 🔹 Obtener todos los usuarios (admin o vendedor)
router.get('/', protegerRuta, permitirRoles('admin', 'vendedor'), obtenerUsuarios);

// 🔹 Obtener usuario específico (admin o el propio usuario)
router.get('/:id', protegerRuta, obtenerUsuario);

// 🔹 Eliminar usuario (solo admin)
router.delete('/:id', protegerRuta, permitirRoles('admin'), eliminarUsuario);

// 🔹 Actualizar rol (solo admin)
router.put('/:id/rol', protegerRuta, permitirRoles('admin'), actualizarRolUsuario);

/* ────────────────────────────────
 📊 RUTAS DE ESTADÍSTICAS
──────────────────────────────── */

// 🔹 Estadísticas de clientes (solo admin)
router.get(
  '/estadisticas/clientes',
  protegerRuta,
  permitirRoles('admin'),
  estadisticasClientes
);

// 🔹 Estadísticas globales de vendedores (solo admin)
router.get(
  '/estadisticas/vendedores',
  protegerRuta,
  permitirRoles('admin'),
  estadisticasVendedores
);

// 📈 Estadísticas personales (admin o vendedor)
router.get(
  '/estadisticas/mias',
  protegerRuta,
  permitirRoles('vendedor', 'admin'), // ✅ ambos roles pueden acceder
  estadisticasMias
);


export default router;
