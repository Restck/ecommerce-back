import Categoria from '../models/Categoria.js';
import Producto from '../models/producto.js';

// 👉 Obtener todas las categorías ordenadas por nombre
export const obtenerCategorias = async (req, res) => {
  try {
    const categorias = await Categoria.find().sort({ nombre: 1 });
    res.status(200).json(categorias);
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al obtener categorías', error });
  }
};

// 👉 Crear nueva categoría
export const crearCategoria = async (req, res) => {
  try {
    const { nombre } = req.body;

    if (!nombre) {
      return res.status(400).json({ mensaje: 'El nombre es obligatorio' });
    }

    const nombreNormalizado = nombre.trim().toLowerCase();

    const existente = await Categoria.findOne({ nombre: nombreNormalizado });
    if (existente) {
      return res.status(409).json({ mensaje: 'La categoría ya existe' });
    }

    const nuevaCategoria = new Categoria({ nombre: nombreNormalizado });
    await nuevaCategoria.save();

    res.status(201).json(nuevaCategoria);
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al crear categoría', error });
  }
};

// 👉 Eliminar categoría si no está en uso
export const eliminarCategoria = async (req, res) => {
  try {
    const { id } = req.params;

    const categoria = await Categoria.findById(id);
    if (!categoria) {
      return res.status(404).json({ mensaje: 'Categoría no encontrada' });
    }

    const productosUsandoCategoria = await Producto.countDocuments({ categoria: id });
    if (productosUsandoCategoria > 0) {
      return res.status(400).json({
        mensaje: 'No se puede eliminar: hay productos usando esta categoría'
      });
    }

    await categoria.deleteOne();
    res.status(200).json({ mensaje: 'Categoría eliminada correctamente' });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al eliminar categoría', error });
  }
};
