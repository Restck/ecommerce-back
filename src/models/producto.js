import mongoose from 'mongoose';

const movimientoSchema = new mongoose.Schema(
  {
    tipo: {
      type: String,
      required: true,
      enum: ['entrada', 'salida', 'traslado', 'A_BODEGA']
    },
    cantidad: { type: Number, required: true, min: 1 },
    stock: { type: Number, min: 0 },
    cantidadBodega: { type: Number, min: 0 },
    observaciones: { type: String, trim: true },
    bodegaOrigen: { type: String, trim: true },
    bodegaDestino: { type: String, trim: true },
    fecha: { type: Date, default: Date.now }
  },
  { _id: false }
);

const productoSchema = new mongoose.Schema(
  {
    nombre: { type: String, required: true, trim: true },
    descripcion: { type: String, required: true, trim: true },
    precio: { type: Number, required: true, min: 0 },
    stock: { type: Number, required: true, min: 0, default: 0 }, // tienda
    cantidadBodega: { type: Number, required: true, min: 0, default: 0 }, // bodega
    categoria: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Categoria',
      required: true
    },
    proveedor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Proveedor'
    },
    imagen: { type: String },
    costoCompra: { type: Number, min: 0 },
    fechaIngreso: { type: Date, default: Date.now },
    ubicacionAlmacen: { type: String, trim: true },
    destino: { type: String, enum: ['stock', 'bodega'], required: true },
    activo: { type: Boolean, default: true },
    movimientos: [movimientoSchema],
    vendedor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Usuario',
      required: false
    }
  },
  { timestamps: true }
);

/* ===========================================================
   🧮 MIDDLEWARE: Actualiza inventario solo en movimientos reales
   =========================================================== */
productoSchema.pre('save', function (next) {
  // Si no hay cambios en movimientos → continuar sin tocar stock
  if (!this.isModified('movimientos')) return next();

  const ultimo = this.movimientos[this.movimientos.length - 1];
  if (!ultimo || !ultimo.tipo) return next();

  // Ignorar movimientos pendientes (ej: durante pago)
  if (ultimo.observaciones?.includes('pendiente_pago')) return next();

  // Normalización: tipo A_BODEGA → entrada a bodega
  if (ultimo.tipo === 'A_BODEGA') {
    ultimo.tipo = 'entrada';
    ultimo.bodegaDestino = 'bodega';
  }

  // 🔹 Lógica de actualización
  switch (ultimo.tipo) {
    case 'entrada':
      if (ultimo.bodegaDestino === 'stock') {
        this.stock += ultimo.cantidad;
      } else {
        this.cantidadBodega += ultimo.cantidad;
      }
      break;

    case 'salida':
      if (ultimo.bodegaOrigen === 'stock') {
        this.stock -= ultimo.cantidad;
      } else {
        this.cantidadBodega -= ultimo.cantidad;
      }
      break;

    case 'traslado':
      if (ultimo.bodegaOrigen === 'stock' && ultimo.bodegaDestino === 'bodega') {
        this.stock -= ultimo.cantidad;
        this.cantidadBodega += ultimo.cantidad;
      } else if (ultimo.bodegaOrigen === 'bodega' && ultimo.bodegaDestino === 'stock') {
        this.cantidadBodega -= ultimo.cantidad;
        this.stock += ultimo.cantidad;
      }
      break;
  }

  // 🚫 Evitar inventario negativo
  if (this.stock < 0 || this.cantidadBodega < 0) {
    return next(new Error(`Inventario insuficiente en "${this.nombre}".`));
  }

  // Guardar snapshot post-movimiento
  ultimo.stock = this.stock;
  ultimo.cantidadBodega = this.cantidadBodega;

  next();
});

export default mongoose.model('Producto', productoSchema);
