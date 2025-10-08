function validarProducto() {
    const nombre = document.getElementById('nombreProducto').value;
    const descripcion = document.getElementById('descripcionProducto').value;
    const precio = document.getElementById('precioProducto').value;
    const cantidad = document.getElementById('cantidadProducto').value;
    const imagen = document.getElementById('imagenProducto').files[0];

    const validarCaracteresNombre = /^[A-Za-z\s]{3,44}$/;
    const validarCaracteresDescripcion = /^[A-Za-z0-9\s.,'-]{10,100}$/;
    const validarInsercion=/<[^>]*>/;
    const validarImagen=["image/jpeg", "image/png", "image/gif", "image/webp"];

    if (!nombre || !descripcion || !precio || !cantidad || !imagen) {
        alert('Por favor, complete todos los campos.');
        return false;
    }
    
    if (isNaN(precio) &&  precio<= 0 ) {
        alert('El precio debe ser un precio válido.');
        return false;
    }

    if (isNaN(cantidad)&& cantidad <= 0) {
        alert('La cantidad debe ser una cantidad valida.');
        return false;
    }

    if(!isNaN(nombre)){
        alert('El nombre no puede ser un número.');
        return false;
    }
    if(!isNaN(descripcion)){
        alert('La descripcion no puede ser un número.');
        return false;
    }

    if (!validarCaracteresNombre.test(nombre)) {
        alert('El nombre debe tener entre 3 y 44 caracteres y no puede contener números o caracteres especiales.');
        return false;
    }

    if (!validarCaracteresDescripcion.test(descripcion)) {
        alert('La descripción debe tener entre 10 y 100 caracteres y no puede contener caracteres especiales.');
        return false;
    }

    if (validarInsercion.test(nombre) || validarInsercion.test(descripcion)) {
        alert('No se permiten etiquetas HTML en el nombre o la descripción.');
        return false;
    }

    if (!validarImagen.includes(imagen.type)) {
        alert('El formato de la imagen no es válido. Solo se permiten jpeg, png, gif y webp.');
        return false;
    }
    return true;
    alert('Producto añadido correctamente.');
}