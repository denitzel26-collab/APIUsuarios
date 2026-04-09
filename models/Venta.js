// backend1/models/Venta.js
const mongoose = require('mongoose');

const SaleSchema = new mongoose.Schema({
  user_id: { type: String, required: true }, // Equivale al Vendedor_ID de tu documento
  sale_date: { type: Date, default: Date.now },
  // Colección de productos (Productos_Array)
  items: [{
    product_id: { type: Number, required: true }, // ID que viene de PostgreSQL
    name: { type: String, required: true },
    price_at_sale: { type: Number, required: true },
    quantity: { type: Number, required: true }
  }],
  status: { type: String, default: 'completed' },
  payment_method: { type: String, default: 'unknown' },
  total_amount: { type: Number, required: true } // El total calculado
}, { 
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } // Reemplaza el serverTimestamp() de Firestore
});

module.exports = mongoose.model('Sale', SaleSchema);