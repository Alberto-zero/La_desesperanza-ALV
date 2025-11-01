document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('catalogo')) {
        console.log("Página de catálogo detectada");
        cargarProductos();
    }

    if (document.querySelector('#tablaProductos')) {
        console.log("Página de administración de productos detectada");
        mostrarCatalogo();
    }

    if (document.querySelector('#tablaVentas')) {
        console.log("Página de ventas detectada");
        cargarVentas();
    }

    if (document.querySelector('#tablaUsuarios')) {
        console.log("Página de administración de productos detectada");
        cargarUsuarios();
    }
});

function cargarVentas(){
    
    console.log("Cargando ventas...");
    fetch('/getVentas')
        .then(res => {
            if (!res.ok) throw new Error('Error al obtener ventas');
            return res.json();
        })
        .then(ventas => {
            const tbody = document.querySelector('#tablaVentas tbody');
            tbody.innerHTML = '';

            ventas.forEach((venta, index) => {
                tbody.innerHTML += `
                    <tr>
                        <td>${venta.id_venta}</td>
                        <td>${new Date(venta.fecha).toLocaleDateString()}</td>
                        <td>${venta.nombre_completo}</td>
                        <td>${venta.email}</td>
                        <td>${venta.nombre_producto}</td>
                        <td>${venta.cantidad}</td>
                        <td>$${venta.precio_producto.toFixed(2)}</td>
                        <td>$${venta.total.toFixed(2)}</td>
                    </tr>
                `;
            });
        })
        .catch(error => {
            console.error(error);
            alert('Hubo un problema al cargar las ventas');
        });
}

function cargarUsuarios() {
    console.log("Cargando Usuarios...");

    fetch('/getUsuarios')
        .then(res => {
            if (!res.ok) throw new Error('Error al obtener usuarios');
            return res.json();
        })
        .then(usuarios => {
            const tbody = document.querySelector('#tablaUsuarios tbody');
            tbody.innerHTML = '';

            if (usuarios.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="5" class="text-center text-muted">
                            No hay usuarios registrados.
                        </td>
                    </tr>`;
                return;
            }

            usuarios.forEach((usuario, index) => {
                tbody.innerHTML += `
                    <tr>
                        <td>${usuario.id_usuario}</td>
                        <td>${usuario.sesion}</td>
                        <td>${usuario.nombre} ${usuario.apellido_paterno} ${usuario.apellido_materno}</td>
                        <td>${usuario.email}</td>
                        <td>${usuario.direccion}</td>
                        <td>
                            <button class="btn btn-sm btn-danger btn-eliminar" data-usuario="${usuario.id_usuario}">Eliminar</button>
                        </td>
                    </tr>
                `;
                
            });
            document.querySelectorAll('.btn-eliminar').forEach(btn => {
                btn.addEventListener('click', function() {
                borrarUsuario(this.getAttribute('data-usuario'));
            });
        });
        })
        .catch(err => {
            console.error(err);
            const tbody = document.querySelector('#tablaUsuarios tbody');
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center text-danger">
                        Error al cargar los usuarios.
                    </td>
                </tr>`;
        });
}

function borrarUsuario(id) {
    if (!confirm('¿Seguro que deseas borrar este usuario?')) return;
    fetch('/deleteUsuario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_usuario: parseInt(id) })
    })
    .then(response => {
        console.log('Respuesta del servidor:', response.status);
        return response.json();
    })
    .then(data => {
        console.log('Datos recibidos:', data);
        if (data.error) {
            alert(data.error);
        }
            else {  
            alert(data.message);
            cargarUsuarios();
        }
    })
    .catch(err => {
        console.error('Error al eliminar el usuario:', err);
        alert('Error al eliminar el usuario.');
    });
} 

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

function mostrarProductos() {
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