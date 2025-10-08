function validarFormulario() {
    const nombre = document.getElementById('nombre').value;
    const descripcion = document.getElementById('descripcion').value;
    const precio = document.getElementById('precio').value;
    const cantidad = document.getElementById('cantidad').value;
    const imagen = document.getElementById('imagen').value;

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
}