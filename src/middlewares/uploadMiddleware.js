import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Compatibilidad con ESModules para obtener __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ruta base a la carpeta uploads
const baseUploadsDir = path.resolve(__dirname, '..', 'uploads');

// Crear carpetas si no existen
const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

ensureDir(baseUploadsDir);
ensureDir(path.join(baseUploadsDir, 'productos'));
ensureDir(path.join(baseUploadsDir, 'comprobantes'));

// Tipos MIME permitidos
const tiposPermitidos = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf'
];

// Configuración de almacenamiento
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let targetDir = baseUploadsDir;

    if (file.fieldname === 'imagen') {
      targetDir = path.join(baseUploadsDir, 'productos');
    }

    if (file.fieldname === 'comprobante') {
      targetDir = path.join(baseUploadsDir, 'comprobantes');
    }

    ensureDir(targetDir);
    cb(null, targetDir);
  },

  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const nombreCampo = file.fieldname.replace(/[^a-zA-Z0-9]/g, '');
    const nombreUnico = `${nombreCampo}-${Date.now()}${ext}`;
    cb(null, nombreUnico);
  }
});

// Filtro de archivos
const fileFilter = (req, file, cb) => {
  if (tiposPermitidos.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Tipo de archivo no permitido: ${file.mimetype}`), false);
  }
};

// Configuración final de Multer
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // Límite: 5MB
});

export default upload;
