// backend1/index.js
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

// Importar rutas
const authRoutes = require('./routes/auth');
const usuariosRoutes = require('./routes/usuarios'); // <--- NUEVA LÍNEA
const app = express();
app.use(cors());
app.use(express.json());

// Conexión a MongoDB Atlas
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('Conectado a MongoDB Atlas'))
  .catch(err => console.error('Error conectando a MongoDB:', err));

// Configurar los endpoints
app.use('/auth', authRoutes);
app.use('/usuarios', usuariosRoutes); // <--- NUEVA LÍNEA
app.use('/ventas', require('./routes/ventas'));
app.use('/reportes', require('./routes/reportes'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor de Backend 1 corriendo en puerto ${PORT}`));