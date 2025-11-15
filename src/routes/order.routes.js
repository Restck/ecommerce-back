// src/routes/order.routes.js
import express from 'express';
import {
  crearOrden,
  subirComprobante,
  actualizarEstadoPedido,
  confirmarPedido,
  obtenerTodasLasOrdenes,
  obtenerMisOrdenes,
  obtenerOrdenesPorCliente,
  obtenerOrdenesPorVendedor,
  actualizarEstadoComprobante,
  eliminarOrden,
  obtenerOrdenesDeVendedorAdmin,
  actualizarPedidoCompleto
} from '../controllers/order.controller.js';

import { protegerRuta, permitirRoles } from '../middlewares/authMiddleware.js';
import upload from '../middlewares/uploadMiddleware.js';

const router = express.Router();

/* ===========================================================
   🧾 CREAR ORDEN — Se crea cuando se confirma el pago
   (cliente y vendedor también pueden crear)
   =========================================================== */
router.post(
  '/',
  protegerRuta,
  permitirRoles('cliente', 'vendedor', 'admin'),
  crearOrden
);

/* ===========================================================
   📎 SUBIR COMPROBANTE DE PAGO (cliente)
   =========================================================== */
router.put(
  '/:id/comprobante',
  protegerRuta,
  upload.single('comprobante'),
  subirComprobante
);

/* ===========================================================
   ⚙️ ADMIN / VENDEDOR — CAMBIAR ESTADO DEL COMPROBANTE
   =========================================================== */
router.put(
  '/:id/estado-comprobante',
  protegerRuta,
  permitirRoles('admin', 'vendedor'),
  actualizarEstadoComprobante
);

/* ===========================================================
   🔄 ADMIN / VENDEDOR — CAMBIAR ESTADO GENERAL DEL PEDIDO
   =========================================================== */
router.put(
  '/:id/estado',
  protegerRuta,
  permitirRoles('admin', 'vendedor'),
  actualizarEstadoPedido
);

/* ===========================================================
   ✅ CONFIRMAR PEDIDO (solo si comprobante aprobado)
   =========================================================== */
router.put(
  '/:id/confirmar',
  protegerRuta,
  permitirRoles('admin', 'vendedor'),
  confirmarPedido
);

/* ===========================================================
   📊 ADMIN / VENDEDOR — OBTENER TODAS LAS ÓRDENES
   =========================================================== */
router.get(
  '/',
  protegerRuta,
  permitirRoles('admin', 'vendedor'),
  obtenerTodasLasOrdenes
);

/* ===========================================================
   👤 CLIENTE — OBTENER SUS ÓRDENES
   =========================================================== */
router.get(
  '/mis',
  protegerRuta,
  permitirRoles('cliente'),
  obtenerMisOrdenes
);

/* ===========================================================
   🏪 ADMIN — ÓRDENES DE UN VENDEDOR ESPECÍFICO
   =========================================================== */
router.get(
  '/vendedor/:vendedorId',
  protegerRuta,
  permitirRoles('admin'),
  obtenerOrdenesDeVendedorAdmin
);

/* ===========================================================
   🧍 ADMIN / VENDEDOR — ÓRDENES DE UN CLIENTE
   =========================================================== */
router.get(
  '/cliente/:clienteId',
  protegerRuta,
  permitirRoles('admin', 'vendedor'),
  obtenerOrdenesPorCliente
);

/* ===========================================================
   🏷️ VENDEDOR — SUS PROPIAS ÓRDENES
   =========================================================== */
router.get(
  '/mis-vendidos',
  protegerRuta,
  permitirRoles('vendedor'),
  obtenerOrdenesPorVendedor
);

/* ===========================================================
   ✏️ ADMIN / VENDEDOR — ACTUALIZAR PEDIDO COMPLETO
   =========================================================== */
router.put(
  '/:id',
  protegerRuta,
  permitirRoles('admin', 'vendedor'),
  actualizarPedidoCompleto
);

/* ===========================================================
   🗑️ ADMIN / VENDEDOR — ELIMINAR ORDEN
   =========================================================== */
router.delete(
  '/:id',
  protegerRuta,
  permitirRoles('admin', 'vendedor'),
  eliminarOrden
);

export default router;
