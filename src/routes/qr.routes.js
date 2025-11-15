import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 📍 Ruta real del archivo QR Nequi
const qrPath = path.join(__dirname, "../secure/qr-nequi.png");

// 🧩 Generar token válido (usado por el frontend)
router.get("/token", (req, res) => {
  try {
    const token = jwt.sign(
      { qr: "nequi", exp: Math.floor(Date.now() / 1000) + 60 * 10 }, // válido 10 minutos
      process.env.JWT_SECRET || "qr_secret_key_2025"
    );
    res.json({ token });
  } catch (error) {
    console.error("❌ Error generando token:", error);
    res.status(500).json({ message: "Error al generar token" });
  }
});

// 🔒 Ruta protegida para servir el QR
router.get("/qr-nequi", (req, res) => {
  const token = req.query.token;

  if (!token) {
    return res.status(401).json({ message: "Token requerido" });
  }

  try {
    jwt.verify(token, process.env.JWT_SECRET || "qr_secret_key_2025");

    res.sendFile(qrPath, (err) => {
      if (err) {
        console.error("❌ Error enviando el archivo QR:", err);
        res.status(404).json({ message: "QR no encontrado" });
      }
    });
  } catch (error) {
    console.error("⚠️ Token inválido o expirado:", error);
    return res.status(403).json({ message: "Token inválido o expirado" });
  }
});

export default router;
