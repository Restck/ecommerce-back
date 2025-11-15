// models/Proveedor.js
import mongoose from 'mongoose';

const proveedorSchema = new mongoose.Schema({
  nombre: { 
    type: String, 
    required: true, 
    unique: true, 
    trim: true 
  },
  telefono: { 
    type: String, 
    trim: true 
  },
  direccion: { 
    type: String, 
    trim: true 
  },
  fechaRegistro: { 
    type: Date, 
    default: Date.now 
  }
}, {
  timestamps: true // 🔹 Guarda createdAt y updatedAt automáticamente
});

const Proveedor = mongoose.model('Proveedor', proveedorSchema);
export default Proveedor;
