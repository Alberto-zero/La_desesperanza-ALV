document.addEventListener('DOMContentLoaded', () => {
    cargarProductos();
    mostrarCatalogo();
});
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
                    <button class="btn btn-primary" onclick="agregarAlCarrito(${JSON.stringify(producto).replace(/"/g, '&quot;')})">
                        <i class="bi bi-cart-plus"></i> Agregar al carrito
                    </button>
                </div>
                </section>
            `;
    });
    }).catch(err => {
            console.error(err);
            document.getElementById('catalogo').innerHTML = '<p class="text-danger">Error al cargar productos.</p>';
    });
}

// Función para agregar productos al carrito
function agregarAlCarrito(producto) {
    if (typeof carritoManager === 'undefined') {
        console.error('CarritoManager no está definido');
        return;
    }
    
    carritoManager.agregarProducto(producto);
}

function mostrarCatalogo() {
    fetch('/getProductos')
    .then(res => {
            if (!res.ok) throw new Error('Error al obtener productos');
            return res.json();
        })
    .then(productos => {
        const tbody = document.querySelector('#tablaProductos tbody');
        tbody.innerHTML = '';
        productos.forEach((producto) => {
        tbody.innerHTML += `
            <tr>
            <td>${producto.id_producto}</td>
            <td><img src="${producto.imagen}" alt="pan" class="img-thumbnail" style="width:60px;height:60px;object-fit:cover;"></td>
            <td>${producto.nombre}</td>
            <td>${producto.descripcion || ''}</td>
            <td>$${producto.precio}</td>
            <td>${producto.stock}</td>
            <td>
                <a href="editar.html?id=${producto.id_producto}" class="btn btn-sm btn-primary">Editar</a>
                <button class="btn btn-sm btn-danger btn-eliminar" data-prod="${producto.id_producto}">Eliminar</button>
            </td>
            </tr>
        `;
        });
        document.querySelectorAll('.btn-eliminar').forEach(btn => {
            btn.addEventListener('click', function() {
                borrarProducto(this.getAttribute('data-prod'));
            });
        });
    }).catch(err => {
        console.error(err);
        document.getElementById('tablaProductos').innerHTML = '<p class="text-danger">Error al cargar productos.</p>';
    });
}



function borrarProducto(id) {
    if (!confirm('¿Seguro que deseas borrar este pan?')) return;

    fetch('/deleteProducto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_producto: parseInt(id) })
    })
    .then(response => {
        console.log('Respuesta del servidor:', response.status);
        return response.json();
    })
    .then(data => {
        console.log('Datos recibidos:', data);
        if (data.error) {
            alert(data.error);
        } else {
            alert(data.message);
            mostrarCatalogo();
            cargarProductos();
        }
    })
    .catch(err => {
        console.error('Error al eliminar el producto:', err);
        alert('Error al eliminar el producto.');
    });
}

function mostrarVentas() {
    fetch('/getVentas')
    .then(res => {
            if (!res.ok) throw new Error('Error al obtener productos');
            return res.json();
        })
    .then(productos => {
        const tbody = document.querySelector('#tablaProductos tbody');
        tbody.innerHTML = '';
        productos.forEach((producto) => {
        tbody.innerHTML += `
            <tr>
            <td>${producto.id_producto}</td>
            <td><img src="${producto.imagen}" alt="pan" class="img-thumbnail" style="width:60px;height:60px;object-fit:cover;"></td>
            <td>${producto.nombre}</td>
            <td>${producto.descripcion || ''}</td>
            <td>$${producto.precio}</td>
            <td>${producto.stock}</td>
            <td>
                <a href="editar.html?id=${producto.id_producto}" class="btn btn-sm btn-primary">Editar</a>
                <button class="btn btn-sm btn-danger btn-eliminar" data-prod="${producto.id_producto}">Eliminar</button>
            </td>
            </tr>
        `;
        });
        document.querySelectorAll('.btn-eliminar').forEach(btn => {
            btn.addEventListener('click', function() {
                borrarProducto(this.getAttribute('data-prod'));
            });
        });
    }).catch(err => {
        console.error(err);
        document.getElementById('tablaProductos').innerHTML = '<p class="text-danger">Error al cargar productos.</p>';
    });
}