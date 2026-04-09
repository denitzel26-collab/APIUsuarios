// backend1/routes/auth.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// POST /auth/login: Requiere user, password 
router.post('/login', async (req, res) => {
  const { user, password } = req.body;

  try {
    // Buscar el usuario en la base de datos no relacional
    const foundUser = await User.findOne({ Username: user });
    if (!foundUser) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    // Validar la contraseña (se asume que fue guardada usando un hash)
    const isMatch = await bcrypt.compare(password, foundUser.Password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Contraseña incorrecta' });
    }

    // Generar el token de acceso
    const token = jwt.sign(
      { id: foundUser._id, role: foundUser.Role },
      process.env.JWT_SECRET || 'SECRETO_DESARROLLO',
      { expiresIn: '8h' }
    );

    // Retornar éxito y datos de acceso para las herramientas de venta 
    res.status(200).json({ 
        message: 'Inicio de sesión exitoso', 
        token, 
        role: foundUser.Role 
    });

  } catch (error) {
    res.status(500).json({ message: 'Error interno del servidor', error: error.message });
  }
});

module.exports = router;