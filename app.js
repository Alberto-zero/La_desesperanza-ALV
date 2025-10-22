//conexion mysql
require('dotenv').config()
const mysql = require('mysql2')
const session = require('express-session')
const express = require('express');
const bodyParser = require('body-parser');
const multer = require("multer");
const upload = multer({ storage: multer.memoryStorage() });
const app = express();
const MySQLStore = require('express-mysql-session')(session)


var con= mysql.createPool({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE

});




const sessionStore = new MySQLStore({}, con)

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
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

//INSERTAR USUARIOS
app.post('/addUsuario', function(req, res) {
    const nombre = req.body.nombre;
    const apellido_p=req.body.apellido_p;
    const apellido_m=req.body.apellido_m;
    const direccion=req.body.direccion;
    const email=req.body.email;
    const password=req.body.password;

});


//sesiones

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


