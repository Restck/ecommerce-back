import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// 🧩 Importar rutas
import authRoutes from './routes/authRoutes.js';
import usuarioRoutes from './routes/userRoutes.js';
import categoriaRoutes from './routes/categoriaRoutes.js';
import productoRoutes from './routes/productoRoutes.js';
import ordenRoutes from './routes/order.routes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import proveedorRoutes from './routes/proveedor.routes.js';
import qrRoutes from './routes/qr.routes.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

/* ===========================================================
   🧱 CONFIGURACIÓN BASE
   =========================================================== */
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// CORS para Angular
app.use(
  cors({
    origin: ['http://localhost:4200'],
    credentials: true,
  })
);

// Archivos estáticos
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

/* ===========================================================
   💾 CONEXIÓN A MONGODB
   =========================================================== */

//  🔥 LOG PARA VER EL VALOR REAL QUE RAILWAY ESTÁ MANDANDO
console.log('🔍 MONGO_URI desde Railway:', process.env.MONGO_URI);

mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log('✅ Conectado a MongoDB'))
  .catch((err) => console.error('❌ Error conectando a MongoDB:', err));

/* ===========================================================
   🌐 RUTAS DE LA API
   =========================================================== */
app.get('/', (req, res) => {
  res.send('🟢 API funcionando correctamente');
});

app.use('/api/auth', authRoutes);
app.use('/api/usuarios', usuarioRoutes);
app.use('/api/categorias', categoriaRoutes);
app.use('/api/productos', productoRoutes);
app.use('/api/ordenes', ordenRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/proveedores', proveedorRoutes);
app.use('/secure', qrRoutes);

/* ===========================================================
   🚀 INICIAR SERVIDOR
   =========================================================== */
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor escuchando en http://localhost:${PORT}`);
});
