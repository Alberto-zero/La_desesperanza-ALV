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

        const [compras] = await pool.query(
            `SELECT 
                c.id_compra,
                c.fecha,
                c.total,
                c.numero_venta,
                cd.id_producto,
                cd.nombre_producto,
                cd.precio_unitario,
                cd.cantidad,
                cd.subtotal
            FROM compra c
            LEFT JOIN compra_detalle cd ON c.id_compra = cd.id_compra
            WHERE c.id_usuario = ?
            ORDER BY c.fecha DESC`,
            [id_usuario]
        );

        // Agrupar compras por id_compra (cada compra puede tener múltiples productos)
        const comprasAgrupadas = {};
        compras.forEach(compra => {
            if (!comprasAgrupadas[compra.id_compra]) {
                comprasAgrupadas[compra.id_compra] = {
                    id_compra: compra.id_compra,
                    fecha: compra.fecha,
                    numero_venta: compra.numero_venta,
                    total: compra.total,
                    productos: []
                };
            }
            if (compra.id_producto) {
                comprasAgrupadas[compra.id_compra].productos.push({
                    id_producto: compra.id_producto,
                    nombre_producto: compra.nombre_producto,
                    precio_unitario: compra.precio_unitario,
                    cantidad: compra.cantidad,
                    subtotal: compra.subtotal
                });
            }
        });

        // Convertir a array y ordenar por fecha descendente
        const resultado = Object.values(comprasAgrupadas).sort((a, b) => 
            new Date(b.fecha) - new Date(a.fecha)
        );

        res.json(resultado);
    } catch (error) {
        console.error('Error al obtener historial:', error);
        res.status(500).json({ error: 'Error al obtener el historial de compras' });
    }
});

// Ruta para obtener la última compra del usuario
router.get('/ultima-venta', async (req, res) => {
    try {
        const id_usuario = req.session?.user?.id_usuario;
        
        if (!id_usuario) {
            return res.status(401).json({ error: 'Usuario no autenticado' });
        }

        const [compras] = await pool.query(
            `SELECT 
                c.id_compra,
                c.fecha,
                c.total,
                c.numero_venta,
                u.nombre,
                u.email
            FROM compra c
            INNER JOIN usuario u ON c.id_usuario = u.id_usuario
            WHERE c.id_usuario = ?
            ORDER BY c.fecha DESC
            LIMIT 1`,
            [id_usuario]
        );

        if (compras.length === 0) {
            return res.status(404).json({ error: 'No se encontró la última compra' });
        }

        // Obtener todos los detalles de esa compra
        const [detalles] = await pool.query(
            `SELECT 
                cd.id_producto,
                cd.nombre_producto,
                cd.precio_unitario,
                cd.cantidad,
                cd.subtotal
            FROM compra_detalle cd
            WHERE cd.id_compra = ?`,
            [compras[0].id_compra]
        );

        res.json({
            ...compras[0],
            detalles: detalles,
            nombre_negocio: 'La desesperanza'
        });
    } catch (error) {
        console.error('Error al obtener última compra:', error);
        res.status(500).json({ error: 'Error al obtener la última compra' });
    }
});

// Ruta para obtener un recibo específico por ID de compra
router.get('/recibo/:idVenta', async (req, res) => {
    try {
        const { idVenta } = req.params; // Aquí idVenta es en realidad id_compra
        const id_usuario = req.session?.user?.id_usuario;
        
        if (!id_usuario) {
            return res.status(401).json({ error: 'Usuario no autenticado' });
        }

        // Validar que el ID sea un número válido
        if (isNaN(idVenta) || idVenta <= 0) {
            return res.status(400).json({ error: 'ID de compra inválido' });
        }

        // Obtener la compra y validar que pertenece al usuario
        const [compras] = await pool.query(
            `SELECT 
                c.id_compra,
                c.fecha,
                c.total,
                c.numero_venta,
                u.nombre,
                u.email,
                u.direccion
            FROM compra c
            INNER JOIN usuario u ON c.id_usuario = u.id_usuario
            WHERE c.id_compra = ? AND c.id_usuario = ?`,
            [idVenta, id_usuario]
        );

        if (compras.length === 0) {
            return res.status(404).json({ error: 'Recibo no encontrado' });
        }

        // Obtener los detalles de la compra
        const [detalles] = await pool.query(
            `SELECT 
                cd.id_producto,
                cd.nombre_producto,
                cd.precio_unitario,
                cd.cantidad,
                cd.subtotal
            FROM compra_detalle cd
            WHERE cd.id_compra = ?`,
            [idVenta]
        );

        res.json({
            ...compras[0],
            detalles: detalles,
            nombre_negocio: 'La desesperanza'
        });
    } catch (error) {
        console.error('Error al obtener recibo:', error);
        res.status(500).json({ error: 'Error al obtener el recibo' });
    }
});

module.exports = router;