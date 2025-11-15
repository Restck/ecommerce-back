import mongoose from 'mongoose';
import Usuario from '../models/user.js';
import Order from '../models/order.model.js';

// 🧩 Registrar un nuevo usuario
export const registrarUsuario = async (req, res) => {
  try {
    const usuario = new Usuario(req.body);
    await usuario.save();
    res.status(201).json(usuario);
  } catch (error) {
    console.error('❌ Error al registrar usuario:', error);
    res.status(400).json({ mensaje: error.message });
  }
};

// 📋 Obtener todos los usuarios (sin contraseña)
export const obtenerUsuarios = async (req, res) => {
  try {
    const usuarios = await Usuario.find().select('-password');
    res.json(usuarios);
  } catch (error) {
    console.error('❌ Error al obtener usuarios:', error);
    res.status(500).json({ mensaje: 'Error al obtener usuarios' });
  }
};

// 🔍 Obtener un usuario por ID
export const obtenerUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ mensaje: 'ID inválido' });
    }

    const usuario = await Usuario.findById(id).select('-password');
    if (!usuario) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado' });
    }

    res.json(usuario);
  } catch (error) {
    console.error('❌ Error al obtener usuario:', error);
    res.status(500).json({ mensaje: 'Error al obtener usuario' });
  }
};

// ❌ Eliminar un usuario
export const eliminarUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ mensaje: 'ID inválido' });
    }

    const usuario = await Usuario.findById(id);
    if (!usuario) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado' });
    }

    await usuario.deleteOne();
    res.json({ mensaje: 'Usuario eliminado correctamente' });
  } catch (error) {
    console.error('❌ Error al eliminar usuario:', error);
    res.status(500).json({ mensaje: 'Error al eliminar usuario' });
  }
};

// 🔄 Actualizar el rol de un usuario
export const actualizarRolUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    const { rol } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ mensaje: 'ID inválido' });
    }

    const usuario = await Usuario.findById(id);
    if (!usuario) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado' });
    }

    usuario.rol = rol || usuario.rol;
    await usuario.save();

    res.json({ mensaje: 'Rol actualizado correctamente', usuario });
  } catch (error) {
    console.error('❌ Error al actualizar rol de usuario:', error);
    res.status(500).json({ mensaje: 'Error al actualizar rol' });
  }
};

// 📊 Obtener estadísticas de clientes
export const estadisticasClientes = async (req, res) => {
  try {
    const clientes = await Usuario.find({ rol: 'cliente' });

    const estadisticas = await Promise.all(
      clientes.map(async (cliente) => {
        const pedidos = await Order.find({ usuario: cliente._id });
        const cantidadPedidos = pedidos.length;
        const totalComprado = pedidos.reduce(
          (total, pedido) => total + (pedido.total || 0),
          0
        );

        return {
          _id: cliente._id,
          nombre: cliente.nombre,
          correo: cliente.correo,
          ciudad: cliente.ciudad,
          rol: cliente.rol,
          cantidadPedidos,
          totalComprado,
        };
      })
    );

    res.json(estadisticas);
  } catch (error) {
    console.error('❌ Error al obtener estadísticas de clientes:', error);
    res.status(500).json({ mensaje: 'Error del servidor' });
  }
};

// 📦 Estadísticas de vendedores (todas)
export const estadisticasVendedores = async (req, res) => {
  try {
    const vendedores = await Usuario.find({ rol: 'vendedor' }).select(
      '_id nombre correo telefono'
    );

    const resultado = await Promise.all(
      vendedores.map(async (vendedor) => {
        const pedidos = await Order.find({
          'productos.vendedor': vendedor._id,
        });

        let cantidadPedidos = 0;
        let totalVendido = 0;

        pedidos.forEach((pedido) => {
          const productosVendedor = pedido.productos.filter(
            (p) => p.vendedor?.toString() === vendedor._id.toString()
          );

          if (productosVendedor.length > 0) cantidadPedidos++;

          productosVendedor.forEach((p) => {
            const subtotal =
              p.subtotal ||
              (p.precioUnitario && p.cantidad
                ? p.precioUnitario * p.cantidad
                : 0);
            totalVendido += subtotal;
          });
        });

        return {
          _id: vendedor._id,
          nombre: vendedor.nombre,
          correo: vendedor.correo,
          telefono: vendedor.telefono || '-',
          cantidadPedidos,
          totalVendido,
        };
      })
    );

    res.json(resultado);
  } catch (error) {
    console.error('❌ Error al obtener estadísticas de vendedores:', error);
    res.status(500).json({ mensaje: 'Error al obtener estadísticas de vendedores' });
  }
};

// 📈 Estadísticas personales del vendedor logueado
export const estadisticasMias = async (req, res) => {
  try {
    const vendedorId = req.usuario?._id;

    if (!vendedorId) {
      return res.status(401).json({ mensaje: 'Usuario no autenticado' });
    }

    const pedidos = await Order.find({ 'productos.vendedor': vendedorId });

    let cantidadPedidos = 0;
    let totalVendido = 0;

    pedidos.forEach((pedido) => {
      const productosVendedor = pedido.productos.filter(
        (p) => p.vendedor?.toString() === vendedorId.toString()
      );

      if (productosVendedor.length > 0) cantidadPedidos++;

      productosVendedor.forEach((p) => {
        const subtotal =
          p.subtotal ||
          (p.precioUnitario && p.cantidad
            ? p.precioUnitario * p.cantidad
            : 0);
        totalVendido += subtotal;
      });
    });

    res.json({
      vendedorId,
      cantidadPedidos,
      totalVendido,
    });
  } catch (error) {
    console.error('❌ Error al obtener estadísticas del vendedor logueado:', error);
    res.status(500).json({ mensaje: 'Error al obtener estadísticas personales' });
  }
};
