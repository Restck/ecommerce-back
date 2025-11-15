import Producto from '../models/producto.js';
import Usuario from '../models/user.js';
import Order from '../models/order.model.js';

export const obtenerDashboard = async (req, res) => {
  try {
    const [totalProductos, totalUsuarios, totalOrder, ingresosData] = await Promise.all([
      Producto.countDocuments(),
      Usuario.countDocuments({ rol: 'cliente' }),
      Order.countDocuments(),
      Order.aggregate([
        { $group: { _id: null, total: { $sum: '$total' } } }
      ])
    ]);

    const totalIngresos = ingresosData[0]?.total || 0;

    res.json({
      productos: totalProductos,
      usuarios: totalUsuarios,
      pedidos: totalOrder,
      ingresos: totalIngresos
    });
  } catch (error) {
    console.error('❌ Error al obtener estadísticas del dashboard:', error);
    res.status(500).json({ mensaje: 'Error al obtener dashboard' });
  }
};
