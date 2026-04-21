// backend1/routes/ventas.js
const express = require('express');
const router = express.Router();
const axios = require('axios'); // Para comunicarnos con el Backend 2 (Python)
const Sale = require('../models/Venta');
// Instala: npm install moment-timezone
const moment = require('moment-timezone');


// IMPORTANTE: Definimos la URL base del microservicio de Python.
// En Render, deberás crear la variable de entorno PYTHON_API_URL.
const PYTHON_API_URL = process.env.PYTHON_API_URL || 'http://localhost:8000';

router.post('/', async (req, res) => {
  try {
    const saleData = req.body;

    // 1. Validación inicial rápida para evitar "crashes"
    if (!saleData || !saleData.user_id || !Array.isArray(saleData.items) || saleData.items.length === 0) {
      return res.status(400).json({ error: 'Datos de venta incompletos o inválidos.' });
    }

    // 2. Calcular el total en el servidor por seguridad
    const calculatedTotal = saleData.items.reduce((total, item) => {
      return total + (Number(item.price_at_sale) * Number(item.quantity));
    }, 0);

    // ------------------------------------------------------------------
    // HU14 y HU15: Comunicación con WS 2 (Python) para validar y descontar stock
    // ------------------------------------------------------------------
    for (const item of saleData.items) {
      try {
        // Hacemos la petición usando la variable de entorno en lugar de localhost quemado
        await axios.patch(`${PYTHON_API_URL}/productos/${item.product_id}/update-stock`, {
          cantidad_a_restar: Number(item.quantity)
        });
      } catch (pythonError) {
        // Si Python dice que no hay stock (400) o no existe el producto (404), cancelamos la venta
        return res.status(400).json({ 
          error: `Error con el producto '${item.name}': ${pythonError.response?.data?.detail || 'No se pudo descontar el stock'}`
        });
      }
    }

    // 3. Crear el objeto con coerción de tipos (Adaptado a Mongoose)
    const nuevaVenta = new Sale({
      user_id: saleData.user_id,
      sale_date: moment().tz("America/Mexico_City").format() || new Date(), // Si no se proporciona, usamos la fecha actual
    
      items: saleData.items.map(item => ({
        product_id: item.product_id,
        name: item.name,
        price_at_sale: Number(item.price_at_sale),
        quantity: Number(item.quantity),
      })),
      status: saleData.status || 'completed',
      payment_method: saleData.payment_method || 'unknown',
      total_amount: calculatedTotal
    });

    // 4. Guardar en MongoDB
    const ventaGuardada = await nuevaVenta.save();
    
    // 5. Retornamos el ID exitoso
    return res.status(201).json({ 
        mensaje: "Venta registrada con éxito", 
        sale_id: ventaGuardada._id 
    });

  } catch (error) {
    // 6. Manejo de errores
    console.error('[Error en createSale]:', error.message);
    return res.status(500).json({ error: "Error interno al registrar la venta", detalle: error.message });
  }
});

// Ruta extra para consultar ventas (HU16)
router.get('/', async (req, res) => {
    try {
        const ventas = await Sale.find().sort({ sale_date: -1 });
        res.status(200).json(ventas);
    } catch (error) {
        res.status(500).json({ error: "Error al obtener las ventas" });
    }
});

// Ruta para modificar el estado de una venta
router.patch('/:id/estado', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // 1. Validación básica: asegurarnos de que mandaron el nuevo estado
    if (!status) {
      return res.status(400).json({ error: "Debes enviar el nuevo estado ('status') en el cuerpo de la petición." });
    }

    // 2. Buscar y actualizar la venta en MongoDB
    // El { new: true } le dice a Mongoose que nos devuelva el objeto ya actualizado
    const ventaActualizada = await Sale.findByIdAndUpdate(
      id,
      { status: status },
      { new: true } 
    );

    // 3. Validar si la venta realmente existía
    if (!ventaActualizada) {
      return res.status(404).json({ error: "Venta no encontrada." });
    }

    // 4. Respuesta exitosa
    res.status(200).json({
      mensaje: "Estado de la venta actualizado con éxito",
      venta: ventaActualizada
    });

  } catch (error) {
    // 5. Manejo de errores (por ejemplo, si el ID tiene un formato inválido para Mongo)
    console.error('[Error al actualizar estado de la venta]:', error.message);
    res.status(500).json({ error: "Error interno al modificar el estado de la venta." });
  }
});
module.exports = router;