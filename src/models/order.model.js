import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema(
  {
    // 🔢 ID único de orden
    ordenId: {
      type: String,
      unique: true,
    },

    // 👤 Cliente (solo si es una compra directa del cliente)
    usuario: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Usuario',
      required: false,
    },

    // 👨‍💼 Quien crea la orden (puede ser cliente o vendedor)
    creadoPor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Usuario',
      required: true,
    },

    // 🏪 Vendedor principal (si todos los productos pertenecen a uno solo)
    vendedor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Usuario',
      required: false,
    },

    // 🛒 Productos en la orden
    productos: [
      {
        producto: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Producto',
          required: true,
        },
        cantidad: {
          type: Number,
          required: true,
          min: 1,
          default: 1,
        },
        vendedor: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Usuario',
          required: false,
        },
        precioUnitario: {
          type: Number,
          required: false,
        },
        subtotal: {
          type: Number,
          required: false,
          default: 0,
        },
      },
    ],

    // 💰 Totales
    total: { type: Number, required: true, min: 0 },

    // 📦 Información del comprador / envío
    nombre: { type: String, required: true, trim: true },
    ciudad: { type: String, required: true, trim: true },
    direccion: { type: String, required: true, trim: true },
    indicaciones: { type: String, trim: true, default: '' },
    telefono: {
      type: String,
      required: true,
      trim: true,
      match: /^[0-9+\-\s]{7,15}$/,
    },

    // 💳 Método de pago
    metodoPago: {
      type: String,
      enum: ['Nequi', 'Efectivo'],
      default: 'Nequi',
      required: true,
    },

    // 📎 Comprobante y su estado
    comprobante: { type: String, trim: true, default: '' },
    estadoComprobante: {
      type: String,
      enum: ['pendiente', 'aprobado', 'rechazado'],
      default: 'pendiente',
    },

    // 🚚 Estado general del pedido
    estado: {
      type: String,
      enum: [
        'pendiente',     // pedido creado, esperando acción
        'confirmado',    // pago confirmado, stock ya descontado
        'verificado',    // revisado manualmente por admin/vendedor
        'enviado',       // despachado al cliente
        'entregado',     // recibido por el cliente
        'rechazado',     // pedido cancelado o rechazado
        'cancelado'      // cancelación voluntaria
      ],
      default: 'pendiente',
    },

    // 🕒 Fechas
    fecha: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

/* ===========================================================
   ⚙️ Middleware: generar ID de orden y calcular subtotales
   =========================================================== */
orderSchema.pre('save', async function (next) {
  // Generar ID único de orden si no existe
  if (!this.ordenId) {
    this.ordenId = `ORD-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  }

  // Calcular subtotales y precios unitarios faltantes
  this.productos = this.productos.map((p) => ({
    ...p,
    precioUnitario: p.precioUnitario ?? 0,
    subtotal: p.subtotal || p.cantidad * (p.precioUnitario ?? 0),
  }));

  // Calcular total general
  this.total = this.productos.reduce((acc, p) => acc + (p.subtotal || 0), 0);

  // Si todos los productos pertenecen al mismo vendedor → asignarlo al campo principal
  const vendedores = this.productos
    .map((p) => p.vendedor?.toString())
    .filter(Boolean);

  if (vendedores.length > 0 && new Set(vendedores).size === 1) {
    this.vendedor = vendedores[0];
  }

  next();
});

/* ===========================================================
   🔄 Populate automático al consultar
   =========================================================== */
orderSchema.pre(/^find/, function (next) {
  this.populate('usuario', 'nombre email telefono')
    .populate('creadoPor', 'nombre email rol')
    .populate('vendedor', 'nombre email telefono')
    .populate('productos.producto', 'nombre precio imagen')
    .populate('productos.vendedor', 'nombre email telefono');
  next();
});

const Order = mongoose.model('Order', orderSchema);
export default Order;
