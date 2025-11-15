import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import Usuario from '../models/user.js';

/* ────────────────────────────────
 🧩 PROTEGER RUTAS
──────────────────────────────── */
export const protegerRuta = async (req, res, next) => {
  let token;

  // 🔍 Verificar si el token viene en el header
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      // Extraer token
      token = req.headers.authorization.split(' ')[1];

      // Verificar token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Buscar usuario asociado al token
      const usuario = await Usuario.findById(decoded.id).select('-password -__v');

      if (!usuario) {
        return res.status(401).json({ mensaje: 'Usuario no encontrado' });
      }

      // ✅ Guardamos el usuario autenticado en ambos campos
      req.usuario = usuario; // usado por controladores (ej: estadisticasMias)
      req.user = usuario;    // compatibilidad con otros módulos

      next();
    } catch (error) {
      console.error('❌ Error al verificar token:', error);
      return res.status(401).json({ mensaje: 'Token inválido o expirado' });
    }
  } else {
    return res.status(401).json({ mensaje: 'No autorizado, token faltante' });
  }
};

/* ────────────────────────────────
 🛑 RESTRICCIÓN DE ROLES
──────────────────────────────── */
export const permitirRoles = (...roles) => {
  return (req, res, next) => {
    // ✅ El admin tiene acceso total
    if (req.usuario?.rol === 'admin') {
      return next();
    }

    // Verificar si el rol del usuario está permitido
    if (!req.usuario || !roles.includes(req.usuario.rol)) {
      return res.status(403).json({ mensaje: 'Acceso denegado' });
    }

    next();
  };
};

/* ────────────────────────────────
 ✏️ ACTUALIZAR PERFIL DEL USUARIO
──────────────────────────────── */
export const actualizarPerfil = async (req, res) => {
  const usuario = req.usuario; // usamos req.usuario para consistencia
  const { nombre, contrasena } = req.body;

  try {
    if (nombre) usuario.nombre = nombre;

    if (contrasena) {
      const salt = await bcrypt.genSalt(10);
      usuario.contrasena = await bcrypt.hash(contrasena, salt);
    }

    await usuario.save();

    res.json({ mensaje: 'Perfil actualizado correctamente' });
  } catch (error) {
    console.error('❌ Error al actualizar perfil:', error);
    res.status(500).json({ mensaje: 'Error del servidor' });
  }
};
