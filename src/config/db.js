import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB conectado correctamente');
  } catch (error) {
    console.error('❌ Error de conexión a MongoDB:', error.message);
    console.log('🔍 URI desde .env:', process.env.MONGO_URI);
    process.exit(1); // Cierra el proceso si hay error
  }
};

export default connectDB;
