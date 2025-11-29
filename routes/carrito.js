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
        console.log('ID Usuario:', id_usuario);
        console.log('Carrito recibido:', carrito);
        if (!id_usuario) {
            return res.status(401).json({ error: 'Usuario no autenticado' });
        }
        if (!carrito || carrito.length === 0) {
            return res.status(400).json({ error: 'El carrito está vacío' });
        }
        const fecha = new Date();
        let totalGeneral = 0;
        // Validar stock y calcular total
        for (const item of carrito) {
            if (item.cantidad <= 0 || !Number.isInteger(item.cantidad)) {
                return res.status(400).json({ error: `La cantidad del producto "${item.nombre}" debe ser un número entero positivo` });
            }
            if (item.cantidad > 999999999999) {
                return res.status(400).json({ error: `La cantidad no puede ser mayor a 999999999999` });
            }
            if (item.precio <= 0) {
                return res.status(400).json({ error: `El precio del producto "${item.nombre}" no es válido` });
            }
            const [productoDb] = await pool.query('SELECT stock FROM producto WHERE id_producto = ? AND activo = 1', [item.id]);
            if (!productoDb || productoDb.length === 0) {
                return res.status(400).json({ error: `El producto "${item.nombre}" no existe` });
            }
            if (productoDb[0].stock < item.cantidad) {
                return res.status(400).json({ error: `No hay suficiente stock para "${item.nombre}". Stock disponible: ${productoDb[0].stock}` });
            }
            totalGeneral += item.precio * item.cantidad;
        }
        // Verificar fondos
        const [usuarioDb] = await pool.query('SELECT fondos FROM usuario WHERE id_usuario = ?', [id_usuario]);
        if (!usuarioDb || usuarioDb.length === 0) {
            return res.status(400).json({ error: 'Usuario no encontrado' });
        }
        const fondosActuales = usuarioDb[0].fondos || 0;
        if (fondosActuales < totalGeneral) {
            return res.status(400).json({ error: 'Fondos insuficientes para realizar la compra' });
        }
        // Registrar compra (cabecera)
        const numeroVenta = `V-${Date.now()}-${id_usuario}`;
        const [compraResult] = await pool.query(
            'INSERT INTO compra (id_usuario, fecha, total, numero_venta) VALUES (?, ?, ?, ?)',
            [id_usuario, fecha, totalGeneral, numeroVenta]
        );
        const id_compra = compraResult.insertId;
        console.log('Compra insertada con ID:', id_compra, 'Número de venta:', numeroVenta);
        // Registrar detalles de la compra
        for (const item of carrito) {
            const subtotal = item.precio * item.cantidad;
            console.log('Insertando detalle:', { id_compra, id_producto: item.id, cantidad: item.cantidad });
            await pool.query(
                'INSERT INTO compra_detalle (id_compra, id_producto, nombre_producto, precio_unitario, cantidad, subtotal) VALUES (?, ?, ?, ?, ?, ?)',
                [id_compra, item.id, item.nombre, item.precio, item.cantidad, subtotal]
            );
            // Actualizar stock del producto
            await pool.query(
                'UPDATE producto SET stock = stock - ? WHERE id_producto = ?',
                [item.cantidad, item.id]
            );
        }
        // Descontar fondos del usuario
        await pool.query(
            'UPDATE usuario SET fondos = fondos - ? WHERE id_usuario = ?',
            [totalGeneral, id_usuario]
        );
        console.log('Compra completada exitosamente');
        res.json({ mensaje: 'Compra registrada correctamente', total: totalGeneral, id_compra });
    } catch (error) {
        console.error('Error al registrar compra:', error);
        res.status(500).json({ error: 'Error interno al procesar la compra' });
    }
});

// Ruta para obtener el historial de compras del usuario agrupado por transacción
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

        // Agrupar ventas por fecha (carrito)
        const ventasAgrupadas = {};
        ventas.forEach(venta => {
            const fechaKey = new Date(venta.fecha).toISOString().split('T')[0];
            if (!ventasAgrupadas[fechaKey]) {
                ventasAgrupadas[fechaKey] = {
                    fecha: venta.fecha,
                    productos: [],
                    totalCarrito: 0
                };
            }
            ventasAgrupadas[fechaKey].productos.push(venta);
            ventasAgrupadas[fechaKey].totalCarrito += parseFloat(venta.total);
        });

        // Convertir a array y ordenar por fecha descendente
        const resultado = Object.values(ventasAgrupadas).sort((a, b) => 
            new Date(b.fecha) - new Date(a.fecha)
        );

        res.json(resultado);
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
                u.email
            FROM venta v
            INNER JOIN producto p ON v.id_producto = p.id_producto
            INNER JOIN usuario u ON v.id_usuario = u.id_usuario
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
            detalles: detalles,
            nombre_negocio: 'La desesperanza'
        });
    } catch (error) {
        console.error('Error al obtener última venta:', error);
        res.status(500).json({ error: 'Error al obtener la última venta' });
    }
});

// Ruta para obtener un recibo específico por ID de venta
router.get('/recibo/:idVenta', async (req, res) => {
    try {
        const { idVenta } = req.params;
        const id_usuario = req.session?.user?.id_usuario;
        
        if (!id_usuario) {
            return res.status(401).json({ error: 'Usuario no autenticado' });
        }

        // Validar que el ID sea un número válido
        if (isNaN(idVenta) || idVenta <= 0) {
            return res.status(400).json({ error: 'ID de venta inválido' });
        }

        // Obtener el recibo y validar que pertenece al usuario
        const [ventas] = await pool.query(
            `SELECT 
                v.id_venta,
                v.fecha,
                v.cantidad,
                v.total,
                p.nombre AS nombre_producto,
                p.precio,
                u.nombre,
                u.email
            FROM venta v
            INNER JOIN producto p ON v.id_producto = p.id_producto
            INNER JOIN usuario u ON v.id_usuario = u.id_usuario
            WHERE v.id_venta = ? AND v.id_usuario = ?`,
            [idVenta, id_usuario]
        );

        if (ventas.length === 0) {
            return res.status(404).json({ error: 'Recibo no encontrado' });
        }

        res.json({
            ...ventas[0],
            nombre_negocio: 'La desesperanza'
        });
    } catch (error) {
        console.error('Error al obtener recibo:', error);
        res.status(500).json({ error: 'Error al obtener el recibo' });
    }
});

module.exports = router;