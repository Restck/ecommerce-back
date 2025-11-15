import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const usuarioSchema = new mongoose.Schema(
  {
    nombre: {
      type: String,
      required: true,
    },
    correo: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    contrasena: {
      type: String,
      required: true,
    },
    rol: {
      type: String,
      enum: ['admin', 'vendedor', 'cliente'], // ✅ Aquí se agregan los 3 roles
      default: 'cliente',
    },
  },
  {
    timestamps: true,
  }
);

// 🔐 Cifrar contraseña antes de guardar
usuarioSchema.pre('save', async function (next) {
  if (!this.isModified('contrasena')) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.contrasena = await bcrypt.hash(this.contrasena, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// ✅ Método para comparar contraseña en login
usuarioSchema.methods.compararContrasena = async function (contrasenaIngresada) {
  return await bcrypt.compare(contrasenaIngresada, this.contrasena);
};

const Usuario = mongoose.model('Usuario', usuarioSchema);
export default Usuario;
