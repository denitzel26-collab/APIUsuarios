// backend1/models/User.js
const mongoose = require('mongoose');

// Se define la estructura de la colección Users 
const userSchema = new mongoose.Schema({
  Username: { type: String, required: true, unique: true },
  Password: { type: String, required: true },
  Role: { type: String, required: true, enum: ['Vendedor', 'Administrador', 'Consultor'] }
});

// El tercer parámetro 'Users' fuerza el nombre exacto de la colección 
module.exports = mongoose.model('User', userSchema, 'Users');