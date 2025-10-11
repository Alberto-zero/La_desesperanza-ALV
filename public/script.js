document.addEventListener('DOMContentLoaded', cargarProductos);

function cargarProductos() {

    console.log("Cargando productos...");

    fetch('/getProductos')
    .then(res => {
            if (!res.ok) throw new Error('Error al obtener productos');
            return res.json();
        })
    .then(productos => {
    const catalogo = document.getElementById('catalogo');
    catalogo.innerHTML = '';
    productos.forEach((producto) => {
        
        if (productos.length === 0) {
                catalogo.innerHTML = '<p class="text-center text-muted">No hay productos disponibles.</p>';
                return;
            }
        
        catalogo.innerHTML += `
                <section class="row mb-4">
                <div class="col-md-3" align-items-center" >
                    <img src="${producto.imagen || 'images/default.jpg'}" class="img-fluid rounded" alt="${producto.nombre}"  style="max-width: 150px; height: auto;">
                </div>
                <div class="col-md-6">
                    <h2>${producto.nombre}</h2>
                    <p>${producto.descripcion}</p>
                    <p class="fs-4 fw-bold">$${producto.precio}</p>
                    <p>Stock: ${producto.stock}</p>
                    <button class="btn btn-primary">Agregar al carrito</button>
                    <button class="btn btn-warning">Editar</button>
                    <button class="btn btn-danger">Eliminar</button>
                </div>
                </section>
            `;
    });
    }).catch(err => {
            console.error(err);
            document.getElementById('catalogo').innerHTML = '<p class="text-danger">Error al cargar productos.</p>';
    });
}