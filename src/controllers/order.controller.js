// src/controllers/order.controller.js
import Order from '../models/order.model.js';
import Producto from '../models/producto.js';

/* ===========================================================
   🧾 CREAR ORDEN — Se crea cuando se confirma el pago
   =========================================================== */
export const crearOrden = async (req, res) => {
  try {
    const usuario = req.usuario?._id;
    const {
      productos,
      metodoPago,
      telefono,
      ciudad,
      nombre,
      direccion,
      indicaciones,
    } = req.body;

    if (!usuario) {
      return res.status(401).json({ mensaje: 'Usuario no autenticado' });
    }

    if (!productos || !Array.isArray(productos) || productos.length === 0) {
      return res.status(400).json({ mensaje: 'No hay productos en el pedido' });
    }

    // 🧮 Agrupar productos repetidos (si vienen duplicados del frontend)
    const productosAgrupados = [];
    for (const item of productos) {
      const existente = productosAgrupados.find(
        (p) => p.producto === item.producto
      );
      if (existente) {
        existente.cantidad += item.cantidad;
      } else {
        productosAgrupados.push({ ...item });
      }
    }

// ============================
// 🧮 Verificar stock y calcular total real
// ============================
let totalCalculado = 0;
const productosActualizados = [];

for (const item of productosAgrupados) {
  const productoDB = await Producto.findById(item.producto);
  if (!productoDB) {
    return res.status(404).json({ mensaje: `Producto no encontrado: ${item.producto}` });
  }

  if (productoDB.stock < item.cantidad) {
    return res.status(400).json({
      mensaje: `Stock insuficiente para el producto "${productoDB.nombre}"`,
    });
  }

  // Convertir precio a número seguro
  const precioUnitario = Number(productoDB.precio) || 0;

  // Descuento atómico
  await Producto.updateOne(
    { _id: item.producto },
    {
      $inc: { stock: -item.cantidad },
      $push: {
        movimientos: {
          tipo: 'salida',
          cantidad: item.cantidad,
          bodegaOrigen: 'stock',
          observaciones: 'Pedido generado (creación de orden)',
          fecha: new Date(),
        },
      },
    }
  );

  // Calcular subtotal
  const subtotal = precioUnitario * item.cantidad;
  totalCalculado += subtotal;

  productosActualizados.push({
    producto: productoDB._id,
    cantidad: item.cantidad,
    precioUnitario, // 🔥 opcional: puedes guardar el precio del momento
    subtotal,
  });
}

    // ============================
    // 🧾 Crear la orden con total real
    // ============================
    const nuevaOrden = new Order({
      usuario,
      creadoPor: req.usuario._id,
      productos: productosActualizados,
      total: totalCalculado, // ✅ total correcto calculado en backend
      metodoPago,
      telefono,
      ciudad,
      nombre,
      direccion,
      indicaciones,
      estado: 'pendiente',
      estadoComprobante: 'pendiente',
      fecha: new Date(),
    });

    await nuevaOrden.save();

    return res.status(201).json({
      mensaje: 'Orden creada exitosamente y stock actualizado correctamente.',
      pedido: nuevaOrden,
    });
  } catch (error) {
    console.error('Error al crear la orden:', error);
    return res.status(500).json({
      mensaje: 'Error al crear la orden',
      error: error.message,
    });
  }
};


/* ===========================================================
   📎 SUBIR COMPROBANTE DE PAGO (a /uploads/comprobantes)
   =========================================================== */
export const subirComprobante = async (req, res) => {
  const { id } = req.params;

  try {
    if (!req.file)
      return res.status(400).json({ mensaje: 'No se ha subido ningún archivo' });

    // 🔥 Ruta correcta según tu nueva estructura:
    const urlComprobante = `${req.protocol}://${req.get('host')}/uploads/comprobantes/${req.file.filename}`;

    const orden = await Order.findByIdAndUpdate(
      id,
      {
        comprobante: urlComprobante,
        estadoComprobante: 'pendiente'
      },
      { new: true }
    );

    if (!orden)
      return res.status(404).json({ mensaje: 'Orden no encontrada' });

    res.status(200).json({
      mensaje: '✅ Comprobante subido correctamente',
      orden
    });
  } catch (error) {
    console.error('❌ Error al subir comprobante:', error);
    res.status(500).json({ mensaje: 'Error del servidor' });
  }
};



/* ===========================================================
   ⚙️ ACTUALIZAR ESTADO DEL COMPROBANTE
   =========================================================== */
export const actualizarEstadoComprobante = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;

    if (!['pendiente', 'aprobado', 'rechazado'].includes(estado))
      return res.status(400).json({ mensaje: 'Estado de comprobante no válido' });

    if (!['admin', 'vendedor'].includes(req.usuario.rol))
      return res.status(403).json({ mensaje: 'No autorizado para cambiar comprobantes' });

    const orden = await Order.findByIdAndUpdate(id, { estadoComprobante: estado }, { new: true });
    if (!orden) return res.status(404).json({ mensaje: 'Orden no encontrada' });

    res.json({ mensaje: `✅ Estado actualizado a "${estado}"`, orden });
  } catch (error) {
    console.error('❌ Error al actualizar comprobante:', error);
    res.status(500).json({ mensaje: 'Error al actualizar comprobante' });
  }
};

/* ===========================================================
   🔄 ACTUALIZAR ESTADO DEL PEDIDO
   =========================================================== */
export const actualizarEstadoPedido = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;

    const pedido = await Order.findById(id);
    if (!pedido) return res.status(404).json({ mensaje: 'Pedido no encontrado' });

    if (req.usuario.rol === 'vendedor') {
      const pertenece = pedido.productos.some(
        (p) => p.vendedor.toString() === req.usuario.id
      );
      if (!pertenece)
        return res.status(403).json({ mensaje: 'No puedes actualizar pedidos ajenos' });
    }

    pedido.estado = estado;
    await pedido.save();

    res.json({ mensaje: '✅ Estado del pedido actualizado', pedido });
  } catch (error) {
    console.error('❌ Error al actualizar el pedido:', error);
    res.status(500).json({ mensaje: 'Error al actualizar el pedido' });
  }
};

/* ===========================================================
   ✅ CONFIRMAR PEDIDO (ya no descuenta stock)
   =========================================================== */
export const confirmarPedido = async (req, res) => {
  try {
    const { id } = req.params;
    const pedido = await Order.findById(id);

    if (!pedido)
      return res.status(404).json({ mensaje: 'Pedido no encontrado' });

    if (pedido.estado === 'confirmado')
      return res.status(400).json({ mensaje: 'El pedido ya fue confirmado anteriormente' });

    pedido.estado = 'confirmado';
    pedido.estadoComprobante = 'aprobado';
    await pedido.save();

    res.json({
      mensaje: '✅ Pedido confirmado (sin tocar stock)',
      pedido,
    });
  } catch (error) {
    console.error('❌ Error al confirmar pedido:', error);
    res.status(500).json({ mensaje: 'Error al confirmar pedido' });
  }
};

/* ===========================================================
   📊 OBTENER TODAS LAS ÓRDENES (ADMIN / VENDEDOR)
   =========================================================== */
export const obtenerTodasLasOrdenes = async (req, res) => {
  try {
    let ordenes = [];

    if (req.usuario.rol === 'vendedor') {
      ordenes = await Order.find({ 'productos.vendedor': req.usuario.id })
        .populate('usuario', 'nombre email ciudad telefono')
        .populate({
          path: 'productos.producto',
          select: 'nombre precio imagen',
          populate: { path: 'vendedor', select: 'nombre email telefono' },
        })
        .sort({ fecha: -1 });
    } else if (req.usuario.rol === 'admin') {
      ordenes = await Order.find()
        .populate('usuario', 'nombre email ciudad telefono')
        .populate({
          path: 'productos.producto',
          select: 'nombre precio imagen',
          populate: { path: 'vendedor', select: 'nombre email telefono' },
        })
        .sort({ fecha: -1 });
    } else {
      return res.status(403).json({ mensaje: 'No autorizado' });
    }

    res.json(ordenes);
  } catch (error) {
    console.error('❌ Error al obtener órdenes:', error);
    res.status(500).json({ mensaje: 'Error al obtener órdenes' });
  }
};

/* ===========================================================
   👤 OBTENER ÓRDENES DEL CLIENTE AUTENTICADO
   =========================================================== */
export const obtenerMisOrdenes = async (req, res) => {
  try {
    const ordenes = await Order.find({ usuario: req.usuario.id })
      .populate({
        path: 'productos.producto',
        select: 'nombre precio imagen',
        populate: { path: 'vendedor', select: 'nombre email telefono' },
      })
      .sort({ fecha: -1 });

    res.json(ordenes);
  } catch (error) {
    console.error('❌ Error al obtener órdenes del cliente:', error);
    res.status(500).json({ mensaje: 'Error al obtener tus órdenes' });
  }
};

/* ===========================================================
   🏪 OBTENER ÓRDENES DEL VENDEDOR AUTENTICADO
   =========================================================== */
export const obtenerOrdenesPorVendedor = async (req, res) => {
  try {
    const pedidos = await Order.find({ creadoPor: req.usuario._id })
      .populate('usuario', 'nombre email ciudad telefono')
      .populate({
        path: 'productos.producto',
        select: 'nombre precio imagen',
        populate: { path: 'vendedor', select: 'nombre email telefono' },
      })
      .sort({ fecha: -1 });

    res.json(pedidos);
  } catch (error) {
    console.error('❌ Error al obtener pedidos del vendedor:', error);
    res.status(500).json({ mensaje: 'Error al obtener pedidos del vendedor' });
  }
};

/* ===========================================================
   👨‍💼 OBTENER ÓRDENES DE UN VENDEDOR (ADMIN)
   =========================================================== */
export const obtenerOrdenesDeVendedorAdmin = async (req, res) => {
  try {
    const { vendedorId } = req.params;
    const pedidos = await Order.find({ creadoPor: vendedorId })
      .populate('usuario', 'nombre email ciudad telefono')
      .populate({
        path: 'productos.producto',
        select: 'nombre precio imagen',
        populate: { path: 'vendedor', select: 'nombre email telefono' },
      })
      .sort({ fecha: -1 });

    res.json(pedidos);
  } catch (error) {
    console.error('❌ Error al obtener pedidos del vendedor (admin):', error);
    res.status(500).json({ mensaje: 'Error al obtener pedidos del vendedor' });
  }
};

/* ===========================================================
   🔍 OBTENER ÓRDENES POR CLIENTE (ADMIN)
   =========================================================== */
export const obtenerOrdenesPorCliente = async (req, res) => {
  try {
    const { clienteId } = req.params;
    const ordenes = await Order.find({ usuario: clienteId })
      .populate({
        path: 'productos.producto',
        select: 'nombre precio imagen',
        populate: { path: 'vendedor', select: 'nombre email telefono' },
      })
      .sort({ fecha: -1 });

    res.json(ordenes);
  } catch (error) {
    console.error('❌ Error al obtener órdenes por cliente:', error);
    res.status(500).json({ mensaje: 'Error al obtener las órdenes' });
  }
};

/* ===========================================================
   ✏️ ACTUALIZAR PEDIDO COMPLETO
   =========================================================== */
export const actualizarPedidoCompleto = async (req, res) => {
  try {
    const { id } = req.params;
    const cambios = req.body;

    const pedidoActualizado = await Order.findByIdAndUpdate(id, cambios, { new: true })
      .populate('usuario', 'nombre email telefono')
      .populate('creadoPor', 'nombre email rol')
      .populate('productos.producto', 'nombre precio imagen')
      .populate('productos.vendedor', 'nombre email telefono');

    if (!pedidoActualizado)
      return res.status(404).json({ mensaje: 'Pedido no encontrado' });

    res.json({
      mensaje: '✅ Pedido actualizado correctamente',
      pedido: pedidoActualizado,
    });
  } catch (error) {
    console.error('❌ Error al actualizar pedido:', error);
    res.status(500).json({ mensaje: 'Error al actualizar el pedido' });
  }
};

/* ===========================================================
   🗑️ ELIMINAR ORDEN (restituye stock)
   =========================================================== */
export const eliminarOrden = async (req, res) => {
  try {
    const { id } = req.params;
    const orden = await Order.findById(id);
    if (!orden) return res.status(404).json({ mensaje: 'Pedido no encontrado' });

    for (const item of orden.productos) {
      const producto = await Producto.findById(item.producto);
      if (producto) {
        producto.stock += item.cantidad;
        await producto.save();
      }
    }

    await orden.deleteOne();
    res.json({ mensaje: '✅ Pedido eliminado correctamente y stock restaurado' });
  } catch (error) {
    console.error('❌ Error al eliminar pedido:', error);
    res.status(500).json({ mensaje: 'Error al eliminar el pedido' });
  }
};
