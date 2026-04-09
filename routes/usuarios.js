// backend1/routes/usuarios.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcrypt');

// -------------------------------------------------------------------
// HU03: Consultar la lista de usuarios existentes (GET /usuarios)
// -------------------------------------------------------------------
router.get('/', async (req, res) => {
  try {
    // Buscamos todos los usuarios en MongoDB. 
    // El segundo parámetro '-Password' excluye la contraseña de la respuesta por seguridad.
    const usuarios = await User.find({}, '-Password');
    res.status(200).json(usuarios);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener la lista de usuarios', error: error.message });
  }
});

// -------------------------------------------------------------------
// HU02: Dar de alta nuevos usuarios con roles asignados (POST /usuarios)
// -------------------------------------------------------------------
router.post('/', async (req, res) => {
  const { Username, Password, Role } = req.body;

  try {
    // 1. Verificar si el nombre de usuario ya existe para evitar duplicados
    const userExists = await User.findOne({ Username });
    if (userExists) {
      return res.status(400).json({ message: 'El nombre de usuario ya está en uso' });
    }

    // 2. Encriptar la contraseña antes de guardarla en la base de datos
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(Password, salt);

    // 3. Crear la estructura del nuevo usuario
    const newUser = new User({
      Username,
      Password: hashedPassword,
      Role
    });

    // 4. Guardar en la base de datos no relacional
    await newUser.save();

    // 5. Responder al frontend indicando éxito (sin devolver la contraseña)
    res.status(201).json({
      message: 'Usuario creado exitosamente',
      user: {
        _id: newUser._id,
        Username: newUser.Username,
        Role: newUser.Role
      }
    });

  } catch (error) {
    res.status(500).json({ message: 'Error al crear el usuario', error: error.message });
  }
});
// -------------------------------------------------------------------
// HU04 y HU06: Modificar información y rol de un usuario (PUT /usuarios/:id)
// -------------------------------------------------------------------
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { Username, Password, Role } = req.body;

  try {
    // Preparamos los datos a actualizar
    const updateData = { Username, Role };

    // Si el administrador escribió una nueva contraseña, la encriptamos.
    // Si la dejó en blanco, conservamos la que ya tenía en la base de datos.
    if (Password && Password.trim() !== '') {
      const salt = await bcrypt.genSalt(10);
      updateData.Password = await bcrypt.hash(Password, salt);
    }

    // Buscamos al usuario por su ID y lo actualizamos
    const updatedUser = await User.findByIdAndUpdate(id, updateData, { 
      new: true, // Devuelve el documento actualizado
      select: '-Password' // No devolvemos la contraseña por seguridad
    });

    if (!updatedUser) {
      return res.status(404).json({ message: 'Usuario no encontrado en la base de datos.' });
    }

    res.status(200).json({
      message: 'Usuario actualizado con éxito',
      user: updatedUser
    });

  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar el usuario', error: error.message });
  }
});

// -------------------------------------------------------------------
// HU05: Dar de baja a un usuario (DELETE /usuarios/:id)
// -------------------------------------------------------------------
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    // Buscamos y eliminamos el documento directamente en MongoDB
    const deletedUser = await User.findByIdAndDelete(id);

    if (!deletedUser) {
      return res.status(404).json({ message: 'Usuario no encontrado.' });
    }

    res.status(200).json({ message: 'Usuario dado de baja y eliminado del sistema.' });

  } catch (error) {
    res.status(500).json({ message: 'Error al intentar eliminar el usuario', error: error.message });
  }
});

module.exports = router;