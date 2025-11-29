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
        let numeroVenta = null;

        for (const item of carrito) {

            // Validaciones de cantidad
            if (item.cantidad <= 0 || !Number.isInteger(item.cantidad)) {
                return res.status(400).json({ error: `La cantidad del producto "${item.nombre}" debe ser un número entero positivo` });
            }

            if (item.cantidad > 999999999999) {
                return res.status(400).json({ error: `La cantidad no puede ser mayor a 999999999999` });
            }

            // Validar precio
            if (item.precio <= 0) {
                return res.status(400).json({ error: `El precio del producto "${item.nombre}" no es válido` });
            }

            // Validar stock en la base de datos
            const [productoDb] = await pool.query('SELECT stock FROM producto WHERE id_producto = ?', [item.id]);
            if (!productoDb || productoDb.length === 0) {
                return res.status(400).json({ error: `El producto "${item.nombre}" no existe` });
            }

            if (productoDb[0].stock < item.cantidad) {
                return res.status(400).json({ error: `No hay suficiente stock para "${item.nombre}". Stock disponible: ${productoDb[0].stock}` });
            }

            const subtotal = item.precio * item.cantidad;
            totalGeneral += subtotal;

            const [resultadoVenta] = await pool.query(
                'INSERT INTO venta (id_usuario, id_producto, cantidad, fecha, total) VALUES (?, ?, ?, ?, ?)',
                [id_usuario, item.id, item.cantidad, fecha, subtotal]
            );

            if (!numeroVenta) {
                numeroVenta = resultadoVenta.insertId;
            }

            // Actualizar stock del producto
            await pool.query(
                'UPDATE producto SET stock = stock - ? WHERE id_producto = ?',
                [item.cantidad, item.id]
            );
        }

        res.json({ mensaje: 'Compra registrada correctamente', total: totalGeneral, numeroVenta: numeroVenta });
    } catch (error) {
        console.error('Error al registrar compra:', error);
        res.status(500).json({ error: 'Error interno al procesar la compra' });
    }
});

// Ruta para obtener el historial de compras del usuario
router.get('/historial', async (req, res) => {
    try {
        const id_usuario = req.session?.user?.id_usuario;
        
        if (!id_usuario) {
            return res.status(401).json({ error: 'Usuario no autenticado' });
        }

        const [ventas] = await pool.query(
            `SELECT 
                v.id_venta,
                v.fecha,
                v.cantidad,
                v.total,
                p.id_producto,
                p.nombre AS nombre_producto,
                p.precio
            FROM venta v
            INNER JOIN producto p ON v.id_producto = p.id_producto
            WHERE v.id_usuario = ?
            ORDER BY v.fecha DESC`,
            [id_usuario]
        );

        res.json(ventas);
    } catch (error) {
        console.error('Error al obtener historial:', error);
        res.status(500).json({ error: 'Error al obtener el historial de compras' });
    }
});

// Ruta para obtener la última venta del usuario
router.get('/ultima-venta', async (req, res) => {
    try {
        const id_usuario = req.session?.user?.id_usuario;
        
        if (!id_usuario) {
            return res.status(401).json({ error: 'Usuario no autenticado' });
        }

        const [ventas] = await pool.query(
            `SELECT 
                v.id_venta,
                v.fecha,
                v.cantidad,
                v.total,
                p.id_producto,
                p.nombre AS nombre_producto,
                p.precio,
                u.nombre,
                u.email,
                n.nombre_negocio
            FROM venta v
            INNER JOIN producto p ON v.id_producto = p.id_producto
            INNER JOIN usuario u ON v.id_usuario = u.id_usuario
            LEFT JOIN negocio n ON u.id_usuario = n.id_usuario
            WHERE v.id_usuario = ?
            ORDER BY v.fecha DESC
            LIMIT 1`,
            [id_usuario]
        );

        if (ventas.length === 0) {
            return res.status(404).json({ error: 'No se encontró la última venta' });
        }

        // Obtener todos los detalles de esa venta
        const [detalles] = await pool.query(
            `SELECT 
                v.id_venta,
                v.fecha,
                v.cantidad,
                v.total,
                p.nombre AS nombre_producto,
                p.precio
            FROM venta v
            INNER JOIN producto p ON v.id_producto = p.id_producto
            WHERE v.id_usuario = ?
            ORDER BY v.fecha DESC
            LIMIT 1`,
            [id_usuario]
        );

        res.json({
            ...ventas[0],
            detalles: detalles
        });
    } catch (error) {
        console.error('Error al obtener última venta:', error);
        res.status(500).json({ error: 'Error al obtener la última venta' });
    }
});

module.exports = router;