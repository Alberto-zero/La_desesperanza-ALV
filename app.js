//conexion mysql
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
    connectionLimit: 3,
    waitForConnections: true,
    queueLimit: 0,
    ssl: {
        rejectUnauthorized: false
    }
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));


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

    if (!req.file) return res.status(400).send("Debes subir una imagen.");
    const imagen = req.file.buffer;

    //validaciones
    const validarCaracteresNombre = /^[A-Za-z\s]{3,44}$/;
    const validarCaracteresDescripcion = /^[A-Za-z0-9\s.,'-]{10,100}$/;
    const validarInsercion=/<[^>]*>/;
    const validarImagen=["image/jpeg", "image/png", "image/gif", "image/webp"];

    if (isNaN(precio) || precio <= 0 ) {
        return res.status(400).send('El precio debe ser un precio válido.');
    }
    if (isNaN(cantidad) || cantidad <= 0 || !Number.isInteger(Number(cantidad))) {
        return res.status(400).send('La cantidad debe ser una cantidad valida.');
    }
    if(!isNaN(nombre)){
        return res.status(400).send('El nombre no puede ser un número.');
    }
    if(!isNaN(descripcion)){
        return res.status(400).send('La descripcion no puede ser un número.');
    }

    if (!validarCaracteresNombre.test(nombre)) {     
        return res.status(400).send('El nombre debe tener entre 3 y 44 caracteres y no puede contener números o caracteres especiales.');
    }

    if (!validarCaracteresDescripcion.test(descripcion)) {
        return res.status(400).send('La descripción debe tener entre 10 y 100 caracteres y no puede contener caracteres especiales.');
    }

    if (validarInsercion.test(nombre) || validarInsercion.test(descripcion)) {
        return res.status(400).send('No se permiten etiquetas HTML en el nombre o la descripción.') ;
    }

    if (!validarImagen.includes(req.file.mimetype)) {
        return res.status(400).send('El formato de la imagen no es válido. Solo se permiten jpeg, png, gif y webp.');
    }
    //validar que el nombre no exista
    con.query('SELECT nombre FROM producto WHERE nombre = ?', [nombre], function (err, result) {
        if (err) {
            console.error('Error al verificar el nombre del producto en la base de datos: ', err);
            return res.status(500).send('Error al verificar el nombre del producto en la base de datos.');
        }
        if (result.length > 0) {
            console.log('El nombre del producto ya existe. Por favor, elige otro nombre. ');
            return res.status(400).send('El nombre del producto ya existe. Por favor, elige otro nombre.');
        }

        //insertar en la base de datos
        con.query(
            'INSERT INTO producto (nombre, precio, stock, descripcion, imagen) VALUES (?, ?, ?, ?, ?)', 
            [nombre, precio, cantidad, descripcion, imagen],
            function (err, result) {
                if (err) {
                    console.error('Error al insertar el producto en la base de datos: ', err);
                    return res.status(500).send('Error al insertar el producto en la base de datos.');
                }
                return res.status(200).send('Producto añadido correctamente.');
        });

    });
    
});

app.get('/getUsuarios', function(req, res) {
    con.query('Select * from usuario', function (err, result) {
        if (err) {
            console.error('Error al obtener los usuarios de la base de datos: ', err);
            return res.status(500).send('Error al obtener los usuarios de la base de datos.');
        }
        res.json(result);
    });
});

app.get('/getProductos', function(req, res) {
    con.query('SELECT * FROM producto', function (err, result) {
        if (err) {
            console.error('Error al obtener los productos de la base de datos: ', err);
            return res.status(500).send('Error al obtener los productos de la base de datos.');
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
        return res.status(400).json({ error: 'ID inválido' });
    }

    // Verificar si el usuario tiene ventas
    con.query('SELECT COUNT(*) AS total FROM venta WHERE id_usuario = ?', [id_usuario], function(err, result) {
        if (err) return res.status(500).json({ error: 'Error al verificar ventas del usuario.' });

        if (result[0].total > 0) {
            return res.status(400).json({ error: 'No puedes eliminar este usuario porque tiene ventas registradas.' });
        }

        // Si no tiene ventas, lo borramos
        con.query('DELETE FROM usuario WHERE id_usuario = ?', [id_usuario], function(err, result) {
            if (err) return res.status(500).json({ error: 'Error al eliminar el usuario.' });
            res.status(200).json({ message: 'Usuario eliminado correctamente.' });
        });
    });
});

app.post('/deleteProducto', function(req, res) {
    const id_producto = parseInt(req.body.id_producto);
    if (isNaN(id_producto) || id_producto <= 0 || !Number.isInteger(Number(id_producto))) {
        return res.status(400).json({ error: 'El ID del producto debe ser un número entero positivo.' });
    }
    con.query('DELETE FROM producto WHERE id_producto = ?', [id_producto], function (err, result) {
        if (err) {
            console.error('Error al eliminar el producto de la base de datos: ', err);
            return res.status(500).json({ error: 'Error al eliminar el producto de la base de datos.' });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Producto no encontrado.' });
        }
        res.status(200).json({ message: 'Producto eliminado correctamente.' });
    });
});

app.post('/updateProducto', upload.single("imagenProducto"), function(req, res) {
    const id_producto = req.body.idProducto;
    const nombre = req.body.nombreProducto;
    const descripcion = req.body.descripcionProducto;
    const precio = req.body.precioProducto;
    const cantidad = req.body.cantidadProducto;

    if (!req.file) return res.status(400).send("Debes subir una imagen.");
    const imagen = req.file.buffer;

    //validaciones
    const validarCaracteresNombre = /^[A-Za-z\s]{3,44}$/;
    const validarCaracteresDescripcion = /^[A-Za-z0-9\s.,'-]{10,100}$/;
    const validarInsercion=/<[^>]*>/;
    const validarImagen=["image/jpeg", "image/png", "image/gif", "image/webp"];

    if (isNaN(precio) || precio <= 0 ) {
        return res.status(400).send('El precio debe ser un precio válido.');
    }
    if (isNaN(cantidad) || cantidad <= 0 || !Number.isInteger(Number(cantidad))) {
        return res.status(400).send('La cantidad debe ser una cantidad valida.');
    }
    if(!isNaN(nombre)){
        return res.status(400).send('El nombre no puede ser un número.');
    }
    if(!isNaN(descripcion)){
        return res.status(400).send('La descripcion no puede ser un número.');
    }

    if (!validarCaracteresNombre.test(nombre)) {     
        return res.status(400).send('El nombre debe tener entre 3 y 44 caracteres y no puede contener números o caracteres especiales.');
    }

    if (!validarCaracteresDescripcion.test(descripcion)) {
        return res.status(400).send('La descripción debe tener entre 10 y 100 caracteres y no puede contener caracteres especiales.');
    }

    if (validarInsercion.test(nombre) || validarInsercion.test(descripcion)) {
        return res.status(400).send('No se permiten etiquetas HTML en el nombre o la descripción.') ;
    }

    if (!validarImagen.includes(req.file.mimetype)) {
        return res.status(400).send('El formato de la imagen no es válido. Solo se permiten jpeg, png, gif y webp.');
    }

    //validar que el nombre no exista
    con.query('SELECT nombre FROM producto WHERE nombre = ?', [nombre], function (err, result) {
        if (err) {
            console.error('Error al verificar el nombre del producto en la base de datos: ', err);
            return res.status(500).send('Error al verificar el nombre del producto en la base de datos.');
        }
        if (result.length > 0) {
            console.log('El nombre del producto ya existe. Por favor, elige otro nombre. ');
            return res.status(400).send('El nombre del producto ya existe. Por favor, elige otro nombre.');
        }
        //insertar en la base de datos
        con.query(
            'UPDATE producto SET nombre = ?, precio = ?, stock = ?, descripcion = ?, imagen = ? WHERE id_producto = ?', 
            [nombre, precio, cantidad, descripcion, imagen, id_producto],
            function (err, result) {
                if (err) {
                    console.error('Error al actualizar el producto en la base de datos: ', err);
                    return res.status(500).send('Error al actualizar el producto en la base de datos.');
                }
                if (result.affectedRows === 0) {
                    return res.status(404).send('Producto no encontrado.');
                }
                res.status(200).send('Producto actualizado correctamente.');
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
        return res.status(500).send('Error en el servidor');
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
        return  res.status(400).send('El correo electrónico no es válido.');
    }

    if(password.length<8 || password.length>20){
        return res.status(400).send('La contraseña debe tener entre 8 y 20 caracteres.');
    }

    if(!isNaN(nombre) || !isNaN(apellido_p) || !isNaN(apellido_m)){
        return res.status(400).send('El nombre y apellidos no pueden ser números.');
    }

    if(password.includes(" ")){
        return res.status(400).send('La contraseña no puede contener espacios.');
    }

    const sesionStr = String(sesion);
    if(sesionStr !== "0" && sesionStr !== "1"){
        return res.status(400).send('El tipo de usuario no es válido.');
    }

    if(nombre.length<3 || nombre.length>30){
        return res.status(400).send('El nombre debe tener entre 3 y 30 caracteres.');
    }

    if(apellido_p.length<3 || apellido_p.length>30){
        return res.status(400).send('El apellido paterno debe tener entre 3 y 30 caracteres.');
    }

    if(apellido_m.length<3 || apellido_m.length>30){
        return res.status(400).send('El apellido materno debe tener entre 3 y 30 caracteres.');
    }
    //validar que el email no exista
    con.query('SELECT email FROM usuario WHERE email = ?', [email], function (err, result) {
        if (err) {
            console.error('Error al verificar el email en la base de datos: ', err);
            return res.status(500).send('Error al verificar el email en la base de datos.');
        }
        if (result.length > 0) {
            console.log('El correo electrónico ya está registrado. Por favor, utiliza otro correo.');
            return res.status(400).send('El correo electrónico ya está registrado. Por favor, utiliza otro correo.');
        }
    });
        //insertar en la base de datos

    con.query(
        'INSERT INTO usuario (sesion, nombre, apellido_paterno, apellido_materno, email, direccion, contrasena) VALUES (?, ?, ?, ?, ?, ?, ?)', 
        [sesion, nombre, apellido_p, apellido_m, email, direccion, password],
        function (err, result) {
            if (err) {
                console.error('Error al insertar el usuario en la base de datos: ', err);
                return res.status(500).send('Error al insertar el usuario en la base de datos.');
            }
            return res.status(200).send('Usuario añadido correctamente.');
    });


});


//Login de usuarios
app.post('/login', upload.none(), function(req, res) {
    const email = req.body.email;
    const password = req.body.password;

    con.query(
        'SELECT * FROM usuario WHERE email = ? AND contrasena = ?',
        [email, password],
        function(err, result) {
            if (err) {
                console.error('Error al verificar las credenciales:', err);
                return res.status(500).send('Error al iniciar sesión');
            }
            if (result.length === 0) {
                return res.status(401).send('Correo o contraseña incorrectos');
            }
            
            // Guardar datos del usuario en la sesión
            req.session.user = {
                id_usuario: result[0].id_usuario,
                email: result[0].email,
                nombre: result[0].nombre,
                sesion: result[0].sesion // 0 para cliente, 1 para trabajador
            };
         
            res.redirect('/index.html');
        }
    );
});

// Middleware para verificar si es trabajador
function esTrabajador(req, res, next) {
    if (req.session.user && req.session.user.sesion === 1) {
        next();
    } else {
        res.status(403).send('No tienes acceso a esta sección. Solo trabajadores pueden acceder.');
    }
}

// Middleware para proteger archivos de trabajadores
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
    if (req.session.user.sesion !== 1) {
        if (req.xhr || req.headers.accept.includes('application/json')) {
            return res.status(403).json({ error: 'Acceso denegado' });
        }
        return res.status(403).sendFile(__dirname + '/public/error-acceso.html');
    }

    next();
});

// Ruta para verificar el estado de la sesión
app.get('/checkSession', function(req, res) {
    if (req.session.user) {
        res.json({
            authenticated: true,
            user: {
                email: req.session.user.email,
                nombre: req.session.user.nombre,
                sesion: req.session.user.sesion
            }
        });
    } else {
        res.json({ authenticated: false });
    }
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


