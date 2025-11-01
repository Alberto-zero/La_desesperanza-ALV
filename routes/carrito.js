const express = require('express');
const router = express.Router();
const pool = require('../db.js'); // tu conexión a MySQL

router.get('/', (req, res) => {
    res.send('Ruta del carrito funcionando');
});

// Ruta para registrar una compra
router.post('/comprar', async (req, res) => {
    try {
    const { carrito } = req.body;
    const id_usuario = req.session?.user?.id_usuario; 
    if (!id_usuario) {
        console.log(id_usuario)
        return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    if (!carrito || carrito.length === 0) {
        return res.status(400).json({ error: 'El carrito está vacío' });
    }

    const fecha = new Date();
    let totalGeneral = 0;

    for (const item of carrito) {

        if (item.cantidad <= 0) {
        return res.status(400).json({ error: `La cantidad del producto "${item.nombre}" no puede ser 0` });
        }

        // Validar stock en la base de datos
        const [productoDb] = await pool.query('SELECT stock FROM producto WHERE id_producto = ?', [item.id]);
        if (!productoDb || productoDb[0].stock < item.cantidad) {
            return res.status(400).json({ error: `No hay suficiente stock para "${item.nombre}"` });
        }

      const subtotal = item.precio * item.cantidad;
        totalGeneral += subtotal;

        await pool.query(
        'INSERT INTO venta (id_usuario, id_producto, cantidad, fecha, total) VALUES (?, ?, ?, ?, ?)',
        [id_usuario, item.id, item.cantidad, fecha, subtotal]
        );

      // Actualizar stock del producto
        await pool.query(
        'UPDATE producto SET stock = stock - ? WHERE id_producto = ?',
        [item.cantidad, item.id]
        );
    }

    res.json({ mensaje: 'Compra registrada correctamente', total: totalGeneral });
  } catch (error) {
    console.error('Error al registrar compra:', error);
    res.status(500).json({ error: 'Error interno al procesar la compra' });
  }
});

module.exports = router;