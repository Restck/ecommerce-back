// src/routes/productoRoutes.js
import express from 'express';
import upload from '../middlewares/uploadMiddleware.js';
import {
  crearProducto,
  actualizarProducto,
  obtenerProducto,
  obtenerProductos, 
  eliminarProducto,
  registrarMovimiento,
  actualizarDestino,
  actualizarStock 
} from '../controllers/productoController.js';

const router = express.Router();

// 📌 Obtener todos los productos
router.get('/', obtenerProductos);

// 📌 Obtener un producto por ID
router.get('/:id', obtenerProducto);

// 📌 Crear producto con imagen
router.post('/', upload.single('imagen'), crearProducto);

// 📌 Actualizar producto con imagen
router.put('/:id', upload.single('imagen'), actualizarProducto);

// 📌 Eliminar producto
router.delete('/:id', eliminarProducto);

// 📌 Registrar movimiento de inventario
router.post('/:id/movimientos', registrarMovimiento);

// 📌 Actualizar destino (stock/bodega) de un producto
router.patch('/:id/destino', actualizarDestino);

router.put('/:id/stock', actualizarStock);


export default router;
