// src/controllers/productoController.js
import Producto from '../models/producto.js';
import Categoria from '../models/Categoria.js';
import Proveedor from '../models/Proveedor.js';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// =========================================================
// 🔧 FUNCIONES Y PATHS
// =========================================================
const getFullUrl = (req, rutaRelativa) =>
  `${req.protocol}://${req.get('host')}${rutaRelativa}`;

// 👉 Carpeta final: uploads/productos
const uploadsPath = path.join(__dirname, '..', 'uploads', 'productos');

if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath, { recursive: true });
}

// =========================================================
// 📸 CONFIGURACIÓN DE MULTER PARA PRODUCTOS
// =========================================================
const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, uploadsPath),

  filename: (_, file, cb) => {
    const uniqueName = `producto-${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
  },
});

export const upload = multer({ storage });


// =========================================================
// 🟩 CREAR PRODUCTO
// =========================================================
export const crearProducto = async (req, res) => {
  try {
    const {
      nombre, descripcion, precio, stock, categoria,
      proveedor, costoCompra, ubicacionAlmacen, destino, cantidadBodega
    } = req.body;

    if (!nombre || !descripcion || precio == null || !categoria) {
      return res.status(400).json({ success: false, message: 'Faltan campos obligatorios' });
    }

    const categoriaExistente = await Categoria.findById(categoria);
    if (!categoriaExistente) {
      return res.status(400).json({ success: false, message: 'La categoría no existe' });
    }

    let proveedorExistente = null;
    if (proveedor) {
      proveedorExistente = await Proveedor.findById(proveedor);
      if (!proveedorExistente) {
        return res.status(400).json({ success: false, message: 'El proveedor no existe' });
      }
    }

    // 👉 URL correcta del archivo
    const imagen = req.file
      ? getFullUrl(req, `/uploads/productos/${req.file.filename}`)
      : null;

    let cantidadInicial = destino === 'bodega'
      ? Number(cantidadBodega)
      : Number(stock);

    if (isNaN(cantidadInicial) || cantidadInicial < 1) {
      return res.status(400).json({
        success: false,
        message: 'La cantidad inicial debe ser mayor a 0'
      });
    }

    const nuevoProducto = new Producto({
      nombre,
      descripcion,
      precio: Number(precio),
      stock: destino === 'stock' ? cantidadInicial : 0,
      cantidadBodega: destino === 'bodega' ? cantidadInicial : 0,
      categoria,
      proveedor: proveedor || null,
      imagen,
      costoCompra: costoCompra != null ? Number(costoCompra) : null,
      ubicacionAlmacen: ubicacionAlmacen || null,
      destino: destino || 'stock',
      vendedor: req.user?._id || null,
      movimientos: [{
        tipo: 'entrada',
        cantidad: cantidadInicial,
        observaciones: 'Registro inicial',
        bodegaDestino: destino || null
      }]
    });

    const guardado = await nuevoProducto.save();
    res.status(201).json({ success: true, data: guardado });

  } catch (error) {
    console.error('❌ Error al crear producto:', error);
    res.status(500).json({ success: false, message: 'Error interno al crear producto', error: error.message });
  }
};


// =========================================================
// 📦 OBTENER PRODUCTOS
// =========================================================
export const obtenerProductos = async (req, res) => {
  try {
    const { tipo } = req.query;
    let filtro = {};

    if (tipo === 'stock') {
      filtro = { destino: 'stock', stock: { $gt: 0 } };
    } else if (tipo === 'bodega') {
      filtro = { destino: 'bodega', cantidadBodega: { $gt: 0 } };
    }

    const productos = await Producto.find(filtro)
      .populate('categoria', 'nombre')
      .populate('proveedor', 'nombre')
      .lean();

    res.status(200).json({ success: true, data: productos });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener productos', error: error.message });
  }
};


// =========================================================
// 📌 OBTENER PRODUCTO POR ID
// =========================================================
export const obtenerProducto = async (req, res) => {
  try {
    const producto = await Producto.findById(req.params.id)
      .populate('categoria', 'nombre')
      .populate('proveedor', 'nombre')
      .lean();

    if (!producto) {
      return res.status(404).json({ success: false, message: 'Producto no encontrado' });
    }

    res.status(200).json({ success: true, data: producto });
  } catch (error) {
    console.error('❌ Error al obtener producto:', error);
    res.status(500).json({ success: false, message: 'Error al obtener producto', error: error.message });
  }
};


// =========================================================
// ✏️ ACTUALIZAR PRODUCTO
// =========================================================
export const actualizarProducto = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, descripcion, precio, stock, destino } = req.body;

    let producto = await Producto.findById(id);
    if (!producto) {
      return res.status(404).json({ mensaje: 'Producto no encontrado' });
    }

    if (req.file) {
      producto.imagen = `/uploads/productos/${req.file.filename}`;
    }

    if (nombre) producto.nombre = nombre;
    if (descripcion) producto.descripcion = descripcion;
    if (precio != null) producto.precio = precio;

    if (stock != null) {
      if (destino === 'bodega' || producto.destino === 'bodega') {
        producto.cantidadBodega = Number(stock);
        if (destino === 'stock') {
          producto.stock = Number(stock);
          producto.cantidadBodega = 0;
        }
      } else {
        producto.stock = Number(stock);
      }
    }

    if (destino && destino !== producto.destino) {
      if (destino === 'stock') {
        producto.stock += producto.cantidadBodega;
        producto.cantidadBodega = 0;
      } else if (destino === 'bodega') {
        producto.cantidadBodega += producto.stock;
        producto.stock = 0;
      }
      producto.destino = destino;
    }

    await producto.save();

    res.json({ mensaje: 'Producto actualizado con éxito', producto });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al actualizar producto', error });
  }
};


// =========================================================
// ❌ ELIMINAR PRODUCTO
// =========================================================
export const eliminarProducto = async (req, res) => {
  try {
    const producto = await Producto.findById(req.params.id);
    if (!producto) {
      return res.status(404).json({ success: false, message: 'Producto no encontrado' });
    }

    if (producto.imagen) {
      const imgPath = path.join(__dirname, '..', 'uploads', 'productos', path.basename(producto.imagen));
      if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
    }

    await producto.deleteOne();
    res.status(200).json({ success: true, message: 'Producto eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al eliminar producto', error: error.message });
  }
};


// =========================================================
// 🔄 REGISTRAR MOVIMIENTOS
// =========================================================
export const registrarMovimiento = async (req, res) => {
  try {
    const { tipo, cantidad, observaciones, bodegaOrigen, bodegaDestino, destino } = req.body;

    if (!tipo || cantidad == null) {
      return res.status(400).json({ success: false, message: 'Tipo y cantidad son obligatorios' });
    }

    const producto = await Producto.findById(req.params.id);
    if (!producto) {
      return res.status(404).json({ success: false, message: 'Producto no encontrado' });
    }

    if (!producto.destino) producto.destino = destino || 'stock';

    producto.movimientos.push({
      tipo,
      cantidad: Number(cantidad),
      observaciones: observaciones || null,
      bodegaOrigen: bodegaOrigen || null,
      bodegaDestino: bodegaDestino || null
    });

    await producto.save();
    res.status(200).json({ success: true, message: 'Movimiento registrado correctamente', data: producto });

  } catch (error) {
    console.error('❌ Error al registrar movimiento:', error);
    res.status(500).json({ success: false, message: 'Error al registrar movimiento', error: error.message });
  }
};


// =========================================================
// 🔁 ACTUALIZAR DESTINO (stock ↔ bodega)
// =========================================================
export const actualizarDestino = async (req, res) => {
  try {
    const { destino, cantidad } = req.body;
    const producto = await Producto.findById(req.params.id);

    if (!producto) {
      return res.status(404).json({ success: false, message: 'Producto no encontrado' });
    }

    const cantidadNum = Number(cantidad);
    if (isNaN(cantidadNum) || cantidadNum <= 0) {
      return res.status(400).json({ success: false, message: 'Cantidad inválida' });
    }

    if (destino === 'bodega') {
      if (producto.stock < cantidadNum) {
        return res.status(400).json({ success: false, message: 'Stock insuficiente' });
      }
      producto.stock -= cantidadNum;
      producto.cantidadBodega += cantidadNum;
    }

    if (destino === 'stock') {
      if (producto.cantidadBodega < cantidadNum) {
        return res.status(400).json({ success: false, message: 'Bodega insuficiente' });
      }
      producto.cantidadBodega -= cantidadNum;
      producto.stock += cantidadNum;
    }

    producto.destino = destino;

    producto.movimientos.push({
      tipo: 'traslado',
      cantidad: cantidadNum,
      observaciones: `Traslado a ${destino}`,
      bodegaDestino: destino,
      fecha: new Date()
    });

    await producto.save();
    res.status(200).json({ success: true, data: producto });

  } catch (error) {
    console.error('❌ Error al actualizar destino:', error);
    res.status(500).json({ success: false, message: 'Error al actualizar destino', error: error.message });
  }
};


// =========================================================
// 📉 ACTUALIZAR STOCK DIRECTO
// =========================================================
export const actualizarStock = async (req, res) => {
  try {
    const { id } = req.params;
    const { cantidad, origen = 'pedido', observaciones = '' } = req.body;

    if (cantidad == null) {
      return res.status(400).json({ success: false, message: 'Cantidad requerida' });
    }

    const producto = await Producto.findById(id);
    if (!producto) {
      return res.status(404).json({ success: false, message: 'Producto no encontrado' });
    }

    const cantidadDescontar = Number(cantidad);

    if (producto.stock < cantidadDescontar) {
      return res.status(400).json({
        success: false,
        message: `Stock insuficiente. Disponible: ${producto.stock}`,
      });
    }

    producto.stock -= cantidadDescontar;

    producto.movimientos.push({
      tipo: 'salida',
      cantidad: cantidadDescontar,
      observaciones:
        observaciones ||
        (origen === 'pedido'
          ? 'Descuento por pedido confirmado'
          : 'Ajuste de inventario manual'),
      bodegaOrigen: 'stock',
      fecha: new Date(),
    });

    await producto.save();

    return res.status(200).json({
      success: true,
      message: `Stock actualizado correctamente. Nuevo stock: ${producto.stock}`,
      data: producto,
    });

  } catch (error) {
    console.error('❌ Error al actualizar stock:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al actualizar stock',
      error: error.message,
    });
  }
};
