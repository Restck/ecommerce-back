import express from 'express';
import {
  obtenerCategorias,
  crearCategoria,
  eliminarCategoria
} from '../controllers/categoriaController.js';

const router = express.Router();

// 📋 Obtener todas las categorías (ordenadas alfabéticamente)
router.get('/', obtenerCategorias);

// ➕ Crear una nueva categoría (evita duplicados)
router.post('/', crearCategoria);

// 🗑️ Eliminar categoría (por ID)
router.delete('/:id', eliminarCategoria);

export default router;
