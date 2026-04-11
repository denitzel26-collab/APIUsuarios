// backend1/routes/reportes.js
const express = require('express');
const router = express.Router();
const Sale = require('../models/Venta'); 
const PDFDocument = require('pdfkit-table'); 
const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');

// Configuración global de zona horaria para los reportes
const opcionesMX = { 
  timeZone: 'America/Mexico_City', 
  year: 'numeric', 
  month: '2-digit', 
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: true 
};

// -------------------------------------------------------------------
// HU18: Generar reporte de ventas en PDF (Tienda de Electrónica)
// -------------------------------------------------------------------
router.get('/ventas/pdf', async (req, res) => {
  try {
    const solicitante = req.query.solicitante || 'Consultor / Administrador';
    const fechaHoraActual = new Date();
    
    // Ajuste de fecha y hora para el encabezado
    const fechaActual = fechaHoraActual.toLocaleDateString('es-MX', { timeZone: 'America/Mexico_City' });
    const horaActual = fechaHoraActual.toLocaleTimeString('es-MX', { timeZone: 'America/Mexico_City' });

    const ventas = await Sale.find().sort({ sale_date: -1 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=Reporte_Ventas_Electronica.pdf');

    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    doc.pipe(res);

    // 1. FONDO
    const plantillaPath = path.join(__dirname, '../images/plantilla.png');
    if (fs.existsSync(plantillaPath)) {
      doc.image(plantillaPath, 0, 0, { width: doc.page.width, height: doc.page.height });
    }

    // 2. LOGO
    const logoPath = path.join(__dirname, '../images/logo.png');
    if (fs.existsSync(logoPath)) {
      doc.image(logoPath, 40, 40, { width: 65 }); 
    }

    // 3. ENCABEZADO
    doc.fillColor('#000000');
    doc.font('Helvetica-Bold').fontSize(16).text('UNIVERSIDAD POLITÉCNICA DE PACHUCA', 120, 50);
    doc.fontSize(12).text('SISTEMA DE GESTIÓN DE ELECTRÓNICA (SOA)', 120, 70);
    
    doc.y = 150; 
    doc.font('Helvetica').fontSize(10).text(
      'Este documento presenta el desglose oficial de las operaciones de venta de componentes y dispositivos electrónicos.',
      40, doc.y, { align: 'justify' }
    );
    doc.moveDown();

    doc.fontSize(9).text(`Generado por: ${solicitante}`);
    doc.text(`Fecha (MX): ${fechaActual}  |  Hora (MX): ${horaActual}`);
    doc.moveDown(2);

    // 6. TABLA DE VENTAS CON FECHA CORREGIDA
    const filasTabla = ventas.map(venta => [
      venta._id.toString().substring(0, 8).toUpperCase(),
      // Aquí forzamos la conversión de la fecha de la base de datos a hora de México
      venta.sale_date ? new Date(venta.sale_date).toLocaleDateString('es-MX', { timeZone: 'America/Mexico_City' }) : 'N/A',
      venta.status ? venta.status.toUpperCase() : 'COMPLETADO',
      `$${venta.total_amount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`
    ]);

    await doc.table({
      title: "HISTORIAL DE MOVIMIENTOS - TECH STORE",
      headers: ["ID TRANSACCIÓN", "FECHA (MX)", "ESTADO", "MONTO TOTAL"],
      rows: filasTabla,
    }, { 
      prepareHeader: () => doc.font("Helvetica-Bold").fontSize(10),
      prepareRow: () => doc.font("Helvetica").fontSize(9)
    });

    doc.end();
  } catch (error) {
    res.status(500).json({ error: 'Error al generar el PDF', detalle: error.message });
  }
});

// -------------------------------------------------------------------
// HU19: Exportar reporte de ventas en Excel (Tienda de Electrónica)
// -------------------------------------------------------------------
router.get('/ventas/excel', async (req, res) => {
  try {
    const solicitante = req.query.solicitante || 'Consultor / Administrador';
    const fechaHoraActual = new Date();
    
    const fechaActual = fechaHoraActual.toLocaleDateString('es-MX', { timeZone: 'America/Mexico_City' });
    const horaActual = fechaHoraActual.toLocaleTimeString('es-MX', { timeZone: 'America/Mexico_City' });

    const ventas = await Sale.find().sort({ sale_date: -1 });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Reporte de Ventas');

    worksheet.columns = [
      { key: 'id', width: 35 },
      { key: 'fecha', width: 20 },
      { key: 'estado', width: 15 },
      { key: 'pago', width: 20 },
      { key: 'total', width: 20 }
    ];

    worksheet.mergeCells('A1:E1'); 
    const t1 = worksheet.getCell('A1');
    t1.value = 'UNIVERSIDAD POLITÉCNICA DE PACHUCA';
    t1.font = { size: 18, bold: true };
    t1.alignment = { vertical: 'middle', horizontal: 'center' };

    worksheet.mergeCells('A2:E2');
    const t2 = worksheet.getCell('A2');
    t2.value = 'SISTEMA DE GESTIÓN DE ELECTRÓNICA (SOA)';
    t2.font = { size: 13, italic: true };
    t2.alignment = { vertical: 'middle', horizontal: 'center' };

    worksheet.getCell('A4').value = `Solicitado por: ${solicitante}`;
    worksheet.getCell('A5').value = `Emisión (Hora México): ${fechaActual} a las ${horaActual}`;

    const headerRow = worksheet.getRow(7); 
    headerRow.height = 25;
    headerRow.values = ['ID TRANSACCIÓN', 'FECHA DE VENTA (MX)', 'ESTADO', 'MÉTODO PAGO', 'TOTAL ($)'];

    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF003366' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });

    // LLENADO DE DATOS CON CONVERSIÓN DE ZONA HORARIA
    ventas.forEach((venta) => {
      const row = worksheet.addRow([
        venta._id.toString(),
        // Convertimos la fecha UTC de la DB a la local de México antes de escribirla en la celda
        venta.sale_date ? new Date(venta.sale_date).toLocaleDateString('es-MX', { timeZone: 'America/Mexico_City' }) : 'N/A',
        venta.status ? venta.status.toUpperCase() : 'COMPLETADO',
        venta.payment_method ? venta.payment_method.toUpperCase() : 'EFECTIVO',
        venta.total_amount
      ]);
      row.height = 20;
      row.alignment = { vertical: 'middle', horizontal: 'center' };
    });

    worksheet.getColumn(5).numFmt = '"$"#,##0.00';

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=Reporte_Ventas_Tech.xlsx');

    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    res.status(500).json({ error: 'Error al generar el Excel', detalle: error.message });
  }
});

module.exports = router;