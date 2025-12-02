
require('dotenv').config();
const mysql = require('mysql2');
const session = require('express-session');
const express = require('express');
const app = express();
const MySQLStore = require('express-mysql-session')(session);
const carritoRoutes = require('./routes/carrito');

// --- Middlewares para procesar JSON y formularios ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
const bodyParser = require('body-parser');
const multer = require('multer');
const upload = multer();

var con= mysql.createPool({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    port: process.env.MYSQL_PORT || 3306,
    connectionLimit: 2,
    waitForConnections: true,
    queueLimit: 10,
    enableKeepAlive: true,
    ssl: {
        rejectUnauthorized: false
    }
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));


app.use((req, res, next) => {
    const originalJson = res.json;
    const originalSend = res.send;

    res.json = function (body) {
        try {
            if (body && typeof body == 'object') {
                if (!body.alert) {
                    if (typeof body.message == 'string' && body.message.trim() !='') {
                        body.alert = body.message;
                    } else if (typeof body.error == 'string' && body.error.trim() != '') {
                        body.alert = body.error;
                    }
                }
            }
        } catch (e) {
            // If anything goes wrong, ignore and continue
            console.error('Error al añadir alert a res.json:', e);
        }
        return originalJson.call(this, body);
    };

    res.send = function (body) {
        try {
            if (body && typeof body === 'object' && !Buffer.isBuffer(body)) {
                if (!body.alert) {
                    if (typeof body.message === 'string' && body.message.trim() !== '') {
                        body.alert = body.message;
                    } else if (typeof body.error === 'string' && body.error.trim() !== '') {
                        body.alert = body.error;
                    }
                }
            }
        } catch (e) {
            console.error('Error al añadir alert a res.send:', e);
        }
        return originalSend.call(this, body);
    };

    next();
});


const sessionStore = new MySQLStore({}, con)

app.use(session({
    key: 'session_cookie',
    secret: process.env.SESSION_SECRET,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: { 
        maxAge: 1000 * 60 * 60 * 24, // 24 horas
        httpOnly: true,
        secure: false,
        sameSite: 'lax'
    } 
}));

app.use('/carrito', carritoRoutes);

// Middleware para prevenir el caché en páginas restringidas
app.use(['/trabajores.html', '/añadir.html', '/editar.html'], function(req, res, next) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    next();
});

app.use(express.static('public'));

app.listen(3000, function() {
    console.log("Servidor iniciado en el puerto 3000");
});

app.post('/addProducto',upload.single("imagenProducto"), function(req, res) {
    const nombre = req.body.nombreProducto;
    const descripcion = req.body.descripcionProducto;
    const precio = req.body.precioProducto;
    const cantidad = req.body.cantidadProducto;

    if (!req.file) return res.status(400).json({ error: 'Debes subir una imagen.' });
    const imagen = req.file.buffer;

    //validaciones
    const validarCaracteresNombre = /^[A-Za-z\s]{3,44}$/;
    const validarCaracteresDescripcion = /^[A-Za-z0-9\s.,'-]{10,100}$/;
    const validarInsercion=/<[^>]*>/;
    const validarImagen=["image/jpeg", "image/png", "image/gif", "image/webp"];

    if (isNaN(precio) || precio <= 0 ) {
        return res.status(400).json({ message: 'El precio debe ser un precio válido.' });
    }
    if (isNaN(cantidad) || cantidad <= 0 || !Number.isInteger(Number(cantidad))) {
        return res.status(400).json({ message: 'La cantidad debe ser una cantidad valida.' });
    }
    if(!isNaN(nombre)){
        return res.status(400).json({ message: 'El nombre no puede ser un número.' });
    }
    if(!isNaN(descripcion)){
        return res.status(400).json({ message: 'La descripcion no puede ser un número.' });
    }

    if (!validarCaracteresNombre.test(nombre)) {     
        return res.status(400).json({ message: 'El nombre debe tener entre 3 y 44 caracteres y no puede contener números o caracteres especiales.' });
    }

    if (!validarCaracteresDescripcion.test(descripcion)) {
        return res.status(400).json({ message: 'La descripción debe tener entre 10 y 100 caracteres y no puede contener caracteres especiales.' });
    }

    if (validarInsercion.test(nombre) || validarInsercion.test(descripcion)) {
        return res.status(400).json({ message: 'No se permiten etiquetas HTML en el nombre o la descripción.' }) ;
    }

    if (!validarImagen.includes(req.file.mimetype)) {
        return res.status(400).json({ message: 'El formato de la imagen no es válido. Solo se permiten jpeg, png, gif y webp.' });
    }
    //validar que el nombre no exista
    con.query('SELECT nombre FROM producto WHERE nombre = ?', [nombre], function (err, result) {
        if (err) {
            console.error('Error al verificar el nombre del producto en la base de datos: ', err);
            return res.status(500).json({ error: 'Error al verificar el nombre del producto en la base de datos.' });
        }
        if (result.length > 0) {
            console.log('El nombre del producto ya existe. Por favor, elige otro nombre. ');
            return res.status(400).json({ message: 'El nombre del producto ya existe. Por favor, elige otro nombre.' });
        }

        //insertar en la base de datos con activo=1 por defecto
        con.query(
            'INSERT INTO producto (nombre, precio, stock, descripcion, imagen, activo) VALUES (?, ?, ?, ?, ?, 1)', 
            [nombre, precio, cantidad, descripcion, imagen],
            function (err, result) {
                if (err) {
                        console.error('Error al insertar el producto en la base de datos: ', err);
                        // Si el error es por almacenar datos binarios en una columna con charset/Tipo incorrecto,
                        // sugerimos cambiar la columna `imagen` a LONGBLOB. No hacemos la alteración automáticamente.
                        if (err && (err.code === 'ER_TRUNCATED_WRONG_VALUE_FOR_FIELD' || err.code === 'ER_WRONG_VALUE_FOR_TYPE')) {
                            return res.status(500).json({ message: 'Error al guardar la imagen: la columna `imagen` probablemente no es BLOB. Ejecuta en MySQL: ALTER TABLE producto MODIFY imagen LONGBLOB;' });
                        }
                        return res.status(500).json({ message: 'Error al insertar el producto en la base de datos.' });
                }
                return res.status(200).send({ message: 'Producto añadido correctamente.' });
        });

    });
    
});

app.get('/getUsuarios', function(req, res) {
    // devolver todos los usuarios (activo 1 y 0) para permitir reactivar desde el frontend
    con.query('SELECT * FROM usuario', function (err, result) {
        if (err) {
            console.error('Error al obtener los usuarios de la base de datos: ', err);
            return res.status(500).json({ error: 'Error al obtener los usuarios de la base de datos.' });
        }
        res.json(result);
    });
});

// Reactivar usuario (marcar activo = 1)
app.post('/reactivarUsuario', function(req, res) {
    const id_usuario = parseInt(req.body.id_usuario);
    if (isNaN(id_usuario) || id_usuario <= 0) {
        return res.status(400).send("<script>alert('ID inválido'); history.back();</script>");
    }
    con.query('UPDATE usuario SET activo = 1 WHERE id_usuario = ?', [id_usuario], function(err, result) {
        if (err) {
            console.error('Error al reactivar el usuario:', err);
            return res.status(500).send("<script>alert('Error al reactivar el usuario.'); history.back();</script>");
        }
        if (result.affectedRows === 0) {
            return res.status(404).send("<script>alert('Usuario no encontrado.'); history.back();</script>");
        }
        res.status(200).send("<script>alert('Usuario reactivado correctamente.'); location.reload();</script>");
    });
});

app.get('/getProductos', function(req, res) {
    con.query('SELECT * FROM producto WHERE activo = 1', function (err, result) {
        if (err) {
            console.error('Error al obtener los productos de la base de datos: ', err);
            return res.status(500).json({ error: 'Error al obtener los productos de la base de datos.' });
        }
        

        result.forEach(producto => {
            if (producto.imagen) {
                producto.imagen = 'data:image/jpeg;base64,' + producto.imagen.toString('base64');
            }

        });
        res.json(result);
    });
});

app.post('/deleteUsuario', function(req, res) {
    const id_usuario = parseInt(req.body.id_usuario);

    if (isNaN(id_usuario) || id_usuario <= 0) {
        return res.status(400).send("<script>alert('ID inválido'); history.back();</script>");
    }

    // Marcar como inactivo en lugar de eliminar
    con.query('UPDATE usuario SET activo = 0 WHERE id_usuario = ?', [id_usuario], function(err, result) {
        if (err) {
            return res.status(500).send("<script>alert('Error al eliminar el usuario.'); history.back();</script>");
        }
        if (result.affectedRows === 0) {
            return res.status(404).send("<script>alert('Usuario no encontrado.'); history.back();</script>");
        }
        res.status(200).json({ message: 'Usuario eliminado correctamente.' });
    });
});

app.post('/deleteProducto', function(req, res) {
    const id_producto = parseInt(req.body.id_producto);
    if (isNaN(id_producto) || id_producto <= 0 || !Number.isInteger(Number(id_producto))) {
        return res.status(400).send("<script>alert('El ID del producto debe ser un número entero positivo.'); history.back();</script>");
    }
    // Marcar como inactivo en lugar de eliminar
    con.query('UPDATE producto SET activo = 0 WHERE id_producto = ?', [id_producto], function (err, result) {
        if (err) {
            console.error('Error al eliminar el producto de la base de datos: ', err);
            return res.status(500).send("<script>alert('Error al eliminar el producto de la base de datos.'); history.back();</script>");
        }
        if (result.affectedRows === 0) {
            return res.status(404).send("<script>alert('Producto no encontrado.'); history.back();</script>");
        }
        return res.status(200).json({ message: 'Producto eliminado correctamente.' });
    });
});

app.post('/updateProducto', upload.single("imagenProducto"), function(req, res) {
    const id_producto = req.body.idProducto;
    const nombre = req.body.nombreProducto;
    const descripcion = req.body.descripcionProducto;
    const precio = req.body.precioProducto;
    const cantidad = req.body.cantidadProducto;

    if (!req.file) return res.status(400).json({ error: 'Debes subir una imagen.' });
    const imagen = req.file.buffer;

    //validaciones
    const validarCaracteresNombre = /^[A-Za-z\s]{3,44}$/;
    const validarCaracteresDescripcion = /^[A-Za-z0-9\s.,'-]{10,100}$/;
    const validarInsercion=/<[^>]*>/;
    const validarImagen=["image/jpeg", "image/png", "image/gif", "image/webp"];

    if (isNaN(precio) || precio <= 0 ) {
        return res.status(400).json({ error: 'El precio debe ser un precio válido.' });
    }
    if (isNaN(cantidad) || cantidad <= 0 || !Number.isInteger(Number(cantidad))) {
        return res.status(400).json({ error: 'La cantidad debe ser una cantidad valida.' });
    }
    if(!isNaN(nombre)){
        return res.status(400).json({ error: 'El nombre no puede ser un número.' });
    }
    if(!isNaN(descripcion)){
        return res.status(400).json({ error: 'La descripcion no puede ser un número.' });
    }

    if (!validarCaracteresNombre.test(nombre)) {     
        return res.status(400).json({ error: 'El nombre debe tener entre 3 y 44 caracteres y no puede contener números o caracteres especiales.' });
    }

    if (!validarCaracteresDescripcion.test(descripcion)) {
        return res.status(400).json({ error: 'La descripción debe tener entre 10 y 100 caracteres y no puede contener caracteres especiales.' });
    }

    if (validarInsercion.test(nombre) || validarInsercion.test(descripcion)) {
        return res.status(400).json({ error: 'No se permiten etiquetas HTML en el nombre o la descripción.' }) ;
    }

    if (!validarImagen.includes(req.file.mimetype)) {
        return res.status(400).json({ error: 'El formato de la imagen no es válido. Solo se permiten jpeg, png, gif y webp.' });
    }

    //validar que el nombre no exista
    con.query('SELECT nombre FROM producto WHERE nombre = ?', [nombre], function (err, result) {
        if (err) {
            console.error('Error al verificar el nombre del producto en la base de datos: ', err);
            return res.status(500).json({ error: 'Error al verificar el nombre del producto en la base de datos.' });
        }
        if (result.length > 0) {
            console.log('El nombre del producto ya existe. Por favor, elige otro nombre. ');
            return res.status(400).json({ error: 'El nombre del producto ya existe. Por favor, elige otro nombre.' });
        }
        //insertar en la base de datos
        con.query(
            'UPDATE producto SET nombre = ?, precio = ?, stock = ?, descripcion = ?, imagen = ? WHERE id_producto = ?', 
            [nombre, precio, cantidad, descripcion, imagen, id_producto],
            function (err, result) {
                if (err) {
                    console.error('Error al actualizar el producto en la base de datos: ', err);
                    return res.status(500).json({ error: 'Error al actualizar el producto en la base de datos.' });
                }
                if (result.affectedRows === 0) {
                    return res.status(404).json({ error: 'Producto no encontrado.' });
                }
                res.status(200).json({ message: 'Producto actualizado correctamente.' });
        });
    
    });

});

app.get('/getVentas', (req, res) => {
    const query = `
        SELECT 
            v.id_venta,
            v.fecha,
            v.cantidad,
            v.total,
            p.id_producto,
            p.nombre AS nombre_producto,
            p.precio AS precio_producto,
            p.descripcion,
            u.id_usuario,
            CONCAT(u.nombre, ' ', u.apellido_paterno, ' ', u.apellido_materno) AS nombre_completo,
            u.email,
            u.direccion
        FROM venta v
        INNER JOIN usuario u ON v.id_usuario = u.id_usuario
        INNER JOIN producto p ON v.id_producto = p.id_producto
        ORDER BY v.fecha DESC;
    `;

    con.query(query, (err, results) => {
        if (err) {
        console.error('Error al obtener las ventas:', err);
        return res.status(500).json({ error: 'Error en el servidor' });
        }
        res.json(results);
    });
});


//INSERTAR USUARIOS
app.post('/addUsuario', upload.none(), function(req, res) {
    const nombre = req.body.nombre;
    const apellido_p=req.body.apellido_p;
    const apellido_m=req.body.apellido_m;
    const direccion=req.body.direccion;
    const email=req.body.email;
    const password=req.body.password;
    const sesion=req.body.sesion; 
    console.log('Valor de sesion recibido' + sesion); 
    //validaciones
    let validarEmail=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;    
    if(!validarEmail.test(email)){
        return  res.status(400).json({ error: 'El correo electrónico no es válido.' });
    }

    if(password.length<8 || password.length>20){
        return res.status(400).json({ error: 'La contraseña debe tener entre 8 y 20 caracteres.' });
    }

    if(!isNaN(nombre) || !isNaN(apellido_p) || !isNaN(apellido_m)){
        return res.status(400).json({ error: 'El nombre y apellidos no pueden ser números.' });
    }

    if(password.includes(" ")){
        return res.status(400).json({ error: 'La contraseña no puede contener espacios.' });
    }

    const sesionStr = String(sesion);
    if(sesionStr !== "0" && sesionStr !== "1"){
        return res.status(400).json({ error: 'El tipo de usuario no es válido.' });
    }

    if(nombre.length<3 || nombre.length>30){
        return res.status(400).json({ error: 'El nombre debe tener entre 3 y 30 caracteres.' });
    }

    if(apellido_p.length<3 || apellido_p.length>30){
        return res.status(400).json({ error: 'El apellido paterno debe tener entre 3 y 30 caracteres.' });
    }

    if(apellido_m.length<3 || apellido_m.length>30){
        return res.status(400).json({ error: 'El apellido materno debe tener entre 3 y 30 caracteres.' });
    }
    // validar que el email no exista y, solo cuando esté comprobado, insertar
    con.query('SELECT email FROM usuario WHERE email = ?', [email], function (err, result) {
        if (err) {
            console.error('Error al verificar el email en la base de datos: ', err);
            return res.status(500).json({ error: 'Error al verificar el email en la base de datos.' });
        }
        if (result.length > 0) {
            console.log('El correo electrónico ya está registrado. Por favor, utiliza otro correo.');
            return res.status(400).json({ error: 'El correo electrónico ya está registrado. Por favor, utiliza otro correo.' });
        }

        // insertar en la base de datos ahora que sabemos que el email no existe
        con.query(
            'INSERT INTO usuario (sesion, nombre, apellido_paterno, apellido_materno, email, direccion, contrasena, activo) VALUES (?, ?, ?, ?, ?, ?, ?, 1)', 
            [sesion, nombre, apellido_p, apellido_m, email, direccion, password],
            function (err2, resultInsert) {
                if (err2) {
                    console.error('Error al insertar el usuario en la base de datos: ', err2);
                    return res.status(500).json({ error: 'Error al insertar el usuario en la base de datos.' });
                }
                return res.status(200).json({ message: 'Usuario añadido correctamente.' });
        });
    });


});


//Login de usuarios
app.post('/login', upload.none(), function(req, res) {
    const email = req.body.email;
    const password = req.body.password;

    // Buscar el usuario por email primero para poder comprobar el estado 'activo'
    con.query('SELECT * FROM usuario WHERE email = ?', [email], function(err, result) {
        if (err) {
            console.error('Error al verificar las credenciales:', err);
            return res.status(500).json({ error: 'Error al iniciar sesión' });
        }

        if (result.length === 0) {
            return res.status(401).json({ error: 'Correo o contraseña incorrectos' });
        }

        const usuario = result[0];

        // Si la cuenta está inactiva, mostrar alerta y redirigir al formulario de login
        if (usuario.activo === 0 || usuario.activo === '0') {
            return res.status(403).send("<script>alert('cuenta desactiivada por uno de nuestros moderadores'); window.location = '/login.html';</script>");
        }

        // Verificar contraseña
        if (usuario.contrasena !== password) {
            return res.status(401).json({ error: 'Correo o contraseña incorrectos' });
        }

        console.log('Usuario autenticado:', usuario.sesion);

        // Guardar datos del usuario en la sesión
        req.session.user = {
            id_usuario: usuario.id_usuario,
            email: usuario.email,
            nombre: usuario.nombre,
            sesion: usuario.sesion // 0 para cliente, 1 para trabajador
        };

        res.redirect('/index.html');
    });
});

// Middleware para verificar si es trabajador
function esTrabajador(req, res, next) {
    if (req.session.user && req.session.user.sesion == 1) {
        next();
    } else {
        res.status(403).json({ error: 'No tienes acceso a esta sección. Solo trabajadores pueden acceder.' });
    }
}

app.use(['/trabajores.html', '/añadir.html', '/editar.html'], function(req, res, next) {
    // Establecer headers para prevenir caché en páginas protegidas
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '-1');

    // Verificar si el usuario está autenticado
    if (!req.session.user) {
        if (req.xhr || req.headers.accept.includes('application/json')) {
            return res.status(401).json({ error: 'No autenticado' });
        }
        return res.redirect('/login.html');
    }

    // Verificar si el usuario es trabajador
    if (req.session.user.sesion != 1) {
        if (req.xhr || req.headers.accept.includes('application/json')) {
            return res.status(403).json({ error: 'Acceso denegado' });
        }
        // Para peticiones de navegador normales devolvemos un pequeño HTML que muestra
        // la misma descripción del error en un alert y redirige al índice.
        return res.status(403).send("<script>alert('No tienes permiso para acceder a esta página.'); window.location = '/index.html';</script>");
    }

    next();
});

// Ruta API para obtener datos de gráficas (SIN protección)
// Función de fallback: datos simulados cuando la BD no contiene registros
function generarDatosSimuladosBackend() {
    return {
        message: 'No hay datos en la base de datos; mostrando datos simulados.',
        productosMasVendidos: {
            labels: ['Pan de caja', 'Pan dulce', 'Croissant', 'Baguette', 'Pastel'],
            datos: [120, 90, 60, 45, 30]
        },
        usuariosTopCompras: {
            labels: ['Juan P.', 'María L.', 'Carlos S.', 'Ana G.', 'Luis R.'],
            datos: [10, 8, 6, 5, 4]
        },
        ingresosSemanales: {
            labels: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'],
            datos: [150, 200, 180, 170, 220, 240, 190]
        },
        distribucionCategorias: {
            labels: ['Panes', 'Pasteles', 'Galletas', 'Bollos', 'Otros'],
            datos: [60, 20, 10, 5, 5]
        }
    };
}

app.get('/api/graficas-datos', function(req, res) {
   

    // Query 1: Productos más vendidos
    const queryProductos = `
        SELECT p.nombre, COUNT(v.id_venta) as cantidad_vendida
        FROM venta v
        INNER JOIN producto p ON v.id_producto = p.id_producto
        GROUP BY v.id_producto, p.nombre
        ORDER BY cantidad_vendida DESC
        LIMIT 5
    `;

    // Query 2: Usuarios que más han comprado
    const queryUsuarios = `
        SELECT CONCAT(u.nombre, ' ', u.apellido_paterno) as nombre_usuario, COUNT(v.id_venta) as compras_realizadas
        FROM venta v
        INNER JOIN usuario u ON v.id_usuario = u.id_usuario
        GROUP BY v.id_usuario, u.nombre, u.apellido_paterno
        ORDER BY compras_realizadas DESC
        LIMIT 5
    `;

    // Query 3: Ingresos semanales (últimos 7 días)
    const queryIngresos = `
        SELECT 
            DAYNAME(v.fecha) as dia,
            DATE(v.fecha) as fecha_dia,
            SUM(v.total) as ingresos_dia
        FROM venta v
        WHERE v.fecha >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        GROUP BY DATE(v.fecha)
        ORDER BY v.fecha ASC
    `;

    // Query 4: Distribución de categorías por conteo de ventas
    const queryCategoria = `
        SELECT 
            CASE 
                WHEN LOWER(p.nombre) LIKE '%pan%' THEN 'Panes'
                WHEN LOWER(p.nombre) LIKE '%pastel%' THEN 'Pasteles'
                WHEN LOWER(p.nombre) LIKE '%galleta%' THEN 'Galletas'
                WHEN LOWER(p.nombre) LIKE '%bollo%' THEN 'Bollos'
                ELSE 'Otros'
            END as categoria,
            COUNT(v.id_venta) as cantidad
        FROM venta v
        INNER JOIN producto p ON v.id_producto = p.id_producto
        GROUP BY categoria
        ORDER BY cantidad DESC
    `;

    // Ejecutar las 4 queries
    con.query(queryProductos, function(err1, resultProductos) {
        if (err1) {
            console.error('❌ Error en queryProductos:', err1);
            resultProductos = [];
        } else {
            console.log('✓ Productos encontrados:', resultProductos.length);
        }

        con.query(queryUsuarios, function(err2, resultUsuarios) {
            if (err2) {
                console.error('❌ Error en queryUsuarios:', err2);
                resultUsuarios = [];
            } else {
                console.log('✓ Usuarios encontrados:', resultUsuarios.length);
            }

            con.query(queryIngresos, function(err3, resultIngresos) {
                if (err3) {
                    console.error('❌ Error en queryIngresos:', err3);
                    resultIngresos = [];
                } else {
                    console.log('✓ Registros de ingresos encontrados:', resultIngresos.length);
                }

                con.query(queryCategoria, function(err4, resultCategoria) {
                    if (err4) {
                        console.error('❌ Error en queryCategoria:', err4);
                        resultCategoria = [];
                    } else {
                        console.log('✓ Categorías encontradas:', resultCategoria.length);
                    }

                    // Procesar los resultados
                    let datosGraficas;
                    
                    if (resultProductos.length === 0 && resultUsuarios.length === 0 && resultIngresos.length === 0 && resultCategoria.length === 0) {
                        console.log('⚠️ No se encontraron filas en tablas de `venta`. Intentando tablas de `compra` como alternativa...');

                        // Queries alternativas usando las tablas `compra` y `compra_detalle`
                        const qProductosCompra = `
                            SELECT p.nombre, SUM(cd.cantidad) as cantidad_vendida
                            FROM compra_detalle cd
                            INNER JOIN compra c ON cd.id_compra = c.id_compra
                            INNER JOIN producto p ON cd.id_producto = p.id_producto
                            GROUP BY cd.id_producto, p.nombre
                            ORDER BY cantidad_vendida DESC
                            LIMIT 5
                        `;

                        const qUsuariosCompra = `
                            SELECT CONCAT(u.nombre, ' ', u.apellido_paterno) as nombre_usuario, COUNT(c.id_compra) as compras_realizadas
                            FROM compra c
                            INNER JOIN usuario u ON c.id_usuario = u.id_usuario
                            GROUP BY c.id_usuario, u.nombre, u.apellido_paterno
                            ORDER BY compras_realizadas DESC
                            LIMIT 5
                        `;

                        const qIngresosCompra = `
                            SELECT 
                                DAYNAME(c.fecha) as dia,
                                DATE(c.fecha) as fecha_dia,
                                SUM(c.total) as ingresos_dia
                            FROM compra c
                            WHERE c.fecha >= DATE_SUB(NOW(), INTERVAL 7 DAY)
                            GROUP BY DATE(c.fecha)
                            ORDER BY c.fecha ASC
                        `;

                        const qCategoriaCompra = `
                            SELECT 
                                CASE 
                                    WHEN LOWER(p.nombre) LIKE '%pan%' THEN 'Panes'
                                    WHEN LOWER(p.nombre) LIKE '%pastel%' THEN 'Pasteles'
                                    WHEN LOWER(p.nombre) LIKE '%galleta%' THEN 'Galletas'
                                    WHEN LOWER(p.nombre) LIKE '%bollo%' THEN 'Bollos'
                                    ELSE 'Otros'
                                END as categoria,
                                COUNT(cd.id_detalle) as cantidad
                            FROM compra_detalle cd
                            INNER JOIN producto p ON cd.id_producto = p.id_producto
                            GROUP BY categoria
                            ORDER BY cantidad DESC
                        `;

                        con.query(qProductosCompra, function(errA, resProdC) {
                            if (errA) {
                                console.error('❌ Error en qProductosCompra:', errA);
                                resProdC = [];
                            }

                            con.query(qUsuariosCompra, function(errB, resUserC) {
                                if (errB) {
                                    console.error('❌ Error en qUsuariosCompra:', errB);
                                    resUserC = [];
                                }

                                con.query(qIngresosCompra, function(errC, resIngresC) {
                                    if (errC) {
                                        console.error('❌ Error en qIngresosCompra:', errC);
                                        resIngresC = [];
                                    }

                                    con.query(qCategoriaCompra, function(errD, resCatC) {
                                        if (errD) {
                                            console.error('❌ Error en qCategoriaCompra:', errD);
                                            resCatC = [];
                                        }

                                        // Si encontramos datos en `compra`, los usamos
                                        if ((resProdC && resProdC.length > 0) || (resUserC && resUserC.length > 0) || (resIngresC && resIngresC.length > 0) || (resCatC && resCatC.length > 0)) {
                                            console.log('✅ Datos encontrados en tablas de compra. Enviando resultado basado en `compra`.');
                                            datosGraficas = {
                                                productosMasVendidos: {
                                                    labels: resProdC.length > 0 ? resProdC.map(p => p.nombre) : ['Sin datos'],
                                                    datos: resProdC.length > 0 ? resProdC.map(p => p.cantidad_vendida || p.cantidad_vendida) : [0]
                                                },
                                                usuariosTopCompras: {
                                                    labels: resUserC.length > 0 ? resUserC.map(u => u.nombre_usuario) : ['Sin datos'],
                                                    datos: resUserC.length > 0 ? resUserC.map(u => u.compras_realizadas) : [0]
                                                },
                                                ingresosSemanales: {
                                                    labels: resIngresC.length > 0 
                                                        ? resIngresC.map(i => {
                                                            const fecha = new Date(i.fecha_dia);
                                                            return fecha.toLocaleDateString('es-ES', { weekday: 'short' });
                                                        })
                                                        : ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sab', 'Dom'],
                                                    datos: resIngresC.length > 0 ? resIngresC.map(i => parseFloat(i.ingresos_dia) || 0) : [0,0,0,0,0,0,0]
                                                },
                                                distribucionCategorias: {
                                                    labels: resCatC.length > 0 ? resCatC.map(c => c.categoria) : ['Sin datos'],
                                                    datos: resCatC.length > 0 ? resCatC.map(c => c.cantidad) : [0]
                                                },
                                                
                                            };
                                        } else {
                                            console.log('⚠️ Tampoco se encontraron datos en `compra`. Retornando datos simulados');
                                            datosGraficas = generarDatosSimuladosBackend();
                                        }

                                        console.log('✅ Datos compilados, enviando respuesta');
                                        return res.json(datosGraficas);
                                    });
                                });
                            });
                        });

                        // Salimos de la ejecución principal porque la respuesta se enviará dentro
                        return;
                    } else {
                        console.log('📊 Compilando datos de gráficas...');
                        datosGraficas = {
                            productosMasVendidos: {
                                labels: resultProductos.length > 0 ? resultProductos.map(p => p.nombre) : ['Sin datos'],
                                datos: resultProductos.length > 0 ? resultProductos.map(p => p.cantidad_vendida) : [0]
                            },
                            usuariosTopCompras: {
                                labels: resultUsuarios.length > 0 ? resultUsuarios.map(u => u.nombre_usuario) : ['Sin datos'],
                                datos: resultUsuarios.length > 0 ? resultUsuarios.map(u => u.compras_realizadas) : [0]
                            },
                            ingresosSemanales: {
                                labels: resultIngresos.length > 0 
                                    ? resultIngresos.map(i => {
                                        const fecha = new Date(i.fecha_dia);
                                        return fecha.toLocaleDateString('es-ES', { weekday: 'short' });
                                    })
                                    : ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sab', 'Dom'],
                                datos: resultIngresos.length > 0 
                                    ? resultIngresos.map(i => parseFloat(i.ingresos_dia) || 0)
                                    : [0, 0, 0, 0, 0, 0, 0]
                            },
                            distribucionCategorias: {
                                labels: resultCategoria.length > 0 ? resultCategoria.map(c => c.categoria) : ['Sin datos'],
                                datos: resultCategoria.length > 0 ? resultCategoria.map(c => c.cantidad) : [0]
                            }
                        };
                    }

                    console.log('✅ Datos compilados, enviando respuesta');
                    res.json(datosGraficas);
                });
            });
        });
    });
});

// Ruta para verificar el estado de la sesión
app.get('/checkSession', function(req, res) {
    if (req.session.user) {
        res.json({
            authenticated: true,
            user: {
                email: req.session.user.email,
                nombre: req.session.user.nombre,
                sesion: req.session.user.sesion,
                id_usuario: req.session.user.id_usuario
            }
        });
    } else {
        res.json({ authenticated: false });
    }
});

// Ruta para obtener datos del usuario actual
app.get('/getUsuarioActual', function(req, res) {
    if (!req.session.user) {
        return res.status(401).json({ error: 'No autenticado' });
    }

    con.query('SELECT * FROM usuario WHERE id_usuario = ?', [req.session.user.id_usuario], function(err, result) {
        if (err) {
            return res.status(500).json({ message: 'Error al obtener datos del usuario' });
        }
        if (result.length === 0) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }
        
        const usuario = result[0];
        res.json({
            id_usuario: usuario.id_usuario,
            nombre: usuario.nombre,
            apellido_paterno: usuario.apellido_paterno,
            apellido_materno: usuario.apellido_materno,
            email: usuario.email,
            direccion: usuario.direccion,
            fondos: usuario.fondos || 0
        });
    });
});

// Ruta para agregar fondos al usuario
app.post('/agregarFondos', upload.none(), function(req, res) {
    if (!req.session.user) {
        return res.status(401).json({ error: 'No autenticado' });
    }

    const cantidad = parseFloat(req.body.cantidad);
    const id_usuario = req.session.user.id_usuario;

    if (isNaN(cantidad) || cantidad <= 0) {
        return res.status(400).json({ error: 'La cantidad debe ser un número positivo' });
    }

    if (cantidad > 999999.99) {
        return res.status(400).json({ error: 'La cantidad no puede ser mayor a 999999.99' });
    }

    con.query(
        'UPDATE usuario SET fondos = fondos + ? WHERE id_usuario = ?',
        [cantidad, id_usuario],
        function(err, result) {
            if (err) {
                console.error('Error al agregar fondos:', err);
                return res.status(500).json({ error: 'Error al agregar fondos' });
            }
            res.status(200).json({ 
                message: 'Fondos agregados correctamente',
                cantidad_agregada: cantidad
            });
        }
    );
});

// Ruta para obtener fondos del usuario actual
app.get('/getFondos', function(req, res) {
    if (!req.session.user) {
        return res.status(401).json({ error: 'No autenticado' });
    }

    con.query('SELECT fondos FROM usuario WHERE id_usuario = ?', [req.session.user.id_usuario], function(err, result) {
        if (err) {
            return res.status(500).json({ error: 'Error al obtener fondos' });
        }
        if (result.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }
        
        res.json({
            fondos: result[0].fondos || 0
        });
    });
});

// Ruta para actualizar datos del usuario
app.post('/updateUsuarioPerfil', upload.none(), function(req, res) {
    if (!req.session.user) {
        return res.status(401).json({ error: 'No autenticado' });
    }

    const id_usuario = req.session.user.id_usuario;
    const { nombre, apellido_paterno, apellido_materno, direccion, email } = req.body;

    // Validaciones
    if (!nombre || !apellido_paterno || !apellido_materno || !direccion || !email) {
        return res.status(400).json({ error: 'Todos los campos son requeridos' });
    }

    const validarEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!validarEmail.test(email)) {
        return res.status(400).json({ error: 'El email no es válido' });
    }

    con.query(
        'UPDATE usuario SET nombre = ?, apellido_paterno = ?, apellido_materno = ?, direccion = ?, email = ? WHERE id_usuario = ?',
        [nombre, apellido_paterno, apellido_materno, direccion, email, id_usuario],
        function(err, result) {
            if (err) {
                console.error('Error al actualizar usuario:', err);
                return res.status(500).json({ error: 'Error al actualizar datos del usuario' });
            }
            res.status(200).json({ message: 'Datos actualizados correctamente' });
        }
    );
});

// Ruta para cambiar contraseña del usuario
app.post('/cambiarContrasena', upload.none(), function(req, res) {
    if (!req.session.user) {
        return res.status(401).json({ error: 'No autenticado' });
    }

    const id_usuario = req.session.user.id_usuario;
    const { contrasena_actual, contrasena_nueva, contrasena_confirmar } = req.body;

    if (!contrasena_actual || !contrasena_nueva || !contrasena_confirmar) {
        return res.status(400).json({ error: 'Todos los campos son requeridos' });
    }

    if (contrasena_nueva !== contrasena_confirmar) {
        return res.status(400).json({ error: 'Las contraseñas no coinciden' });
    }

    if (contrasena_nueva.length < 8 || contrasena_nueva.length > 20) {
        return res.status(400).json({ error: 'La contraseña debe tener entre 8 y 20 caracteres' });
    }

    // Verificar contraseña actual
    con.query('SELECT contrasena FROM usuario WHERE id_usuario = ?', [id_usuario], function(err, result) {
        if (err || result.length === 0) {
            return res.status(500).json({ error: 'Error al verificar contraseña' });
        }

        if (result[0].contrasena !== contrasena_actual) {
            return res.status(400).json({ error: 'La contraseña actual es incorrecta' });
        }

        // Actualizar contraseña
        con.query(
            'UPDATE usuario SET contrasena = ? WHERE id_usuario = ?',
            [contrasena_nueva, id_usuario],
            function(err, result) {
                if (err) {
                    return res.status(500).json({ error: 'Error al cambiar contraseña' });
                }
                res.status(200).json({ message: 'Contraseña cambiada correctamente' });
            }
        );
    });
});

// Ruta para cerrar sesión
app.get('/logout', function(req, res) {
    req.session.destroy();
    res.redirect('/index.html');
});

app.use((req, res, next) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    next();
});

// Obtener todos los productos (activos e inactivos)
app.get('/getAllProductos', function(req, res) {
    con.query('SELECT * FROM producto', function (err, result) {
        if (err) {
            console.error('Error al obtener los productos: ', err);
            return res.status(500).json({ error: 'Error al obtener los productos.' });
        }
        result.forEach(producto => {
            if (producto.imagen) {
                producto.imagen = 'data:image/jpeg;base64,' + producto.imagen.toString('base64');
            }
        });
        res.json(result);
    });
});

// Reactivar producto
app.post('/reactivarProducto', function(req, res) {
    const id_producto = parseInt(req.body.id_producto);
    if (isNaN(id_producto) || id_producto <= 0) {
        return res.status(400).send("<script>alert('ID inválido'); history.back();</script>");
    }
    con.query('UPDATE producto SET activo = 1 WHERE id_producto = ?', [id_producto], function(err, result) {
        if (err) {
            return res.status(500).send("<script>alert('Error al reactivar el producto.'); history.back();</script>");
        }
        if (result.affectedRows === 0) {
            return res.status(404).send("<script>alert('Producto no encontrado.'); history.back();</script>");
        }
        res.status(200).json({ message: 'Producto reactivado correctamente.' });
    });
});

// Actualizar solo el stock de un producto
app.post('/updateStock', function(req, res) {
    const id_producto = parseInt(req.body.id_producto);
    const stock = parseInt(req.body.stock);
    if (isNaN(id_producto) || id_producto <= 0 || isNaN(stock) || stock < 0) {
        return res.status(400).send("<script>alert('Datos inválidos'); history.back();</script>");
    }
    con.query('UPDATE producto SET stock = ? WHERE id_producto = ?', [stock, id_producto], function(err, result) {
        if (err) {
            return res.status(500).send("<script>alert('Error al actualizar el stock.'); history.back();</script>");
        }
        if (result.affectedRows === 0) {
            return res.status(404).send("<script>alert('Producto no encontrado.'); history.back();</script>");
        }
        res.status(200).send("<script>alert('Stock actualizado correctamente.'); location.reload();</script>");
    });
});
//conexion mysql


// Middleware para proteger rutas de trabajadores
const protegerRutaTrabajador = (req, res, next) => {
    if (!req.session.user) {
        return res.redirect('/login.html');
    }
    if (req.session.user.sesion !== 1) {
        return res.redirect('/error-acceso.html');
    }
    next();
};

app.use(session({
    key: 'session_cookie',
    secret: process.env.SESSION_SECRET,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: { 
        maxAge: 1000 * 60 * 60 * 24,
        httpOnly: true,
        secure: false,
        sameSite: 'lax'
    } 
}))


