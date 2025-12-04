// Global fetch wrapper: muestra alert() cuando la respuesta no es OK


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


(function() {
    const _fetch = window.fetch;
    window.fetch = function(...args) {
        return _fetch.apply(this, args).then(async res => {
            if (!res.ok) {
                let msg = '';
                try {
                    const data = await res.clone().json();
                    msg = data.error || data.message || JSON.stringify(data);
                } catch (e) {
                    try {
                        msg = await res.clone().text();
                    } catch (e2) {
                        msg = 'Error en la petición';
                    }
                }
                if (msg) alert(msg);
            }
            return res;
        });
    };
})();

function cargarVentas() {
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
                        <td>${venta.folio}</td>
                        <td>${new Date(venta.fecha).toLocaleDateString()}</td>
                        <td>${venta.cliente}</td>
                        <td>${venta.email}</td>
                        <td>${venta.producto}</td>
                        <td>${venta.cantidad}</td>
                        <td>$${Number(venta.precio_unitario).toFixed(2)}</td>
                        <td>$${Number(venta.total).toFixed(2)}</td>
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
                const estado = usuario.activo == 1 ? '<span class="badge bg-success">Activo</span>' : '<span class="badge bg-danger">Inactivo</span>';
                tbody.innerHTML += `
                    <tr>
                        <td>${usuario.id_usuario}</td>
                        <td>${usuario.sesion}</td>
                        <td>${usuario.nombre} ${usuario.apellido_paterno || ''} ${usuario.apellido_materno || ''}</td>
                        <td>${usuario.email}</td>
                        <td>${usuario.direccion || ''}</td>
                        <td>${estado}</td>
                        <td>
                            ${usuario.activo == 1
                                ? `<button class="btn btn-sm btn-danger btn-eliminar" data-usuario="${usuario.id_usuario}">Eliminar</button>`
                                : `<button class="btn btn-sm btn-success btn-reactivar" data-usuario="${usuario.id_usuario}">Reactivar</button>`
                            }
                        </td>
                    </tr>
                `;
            });

            // Delegar eventos
            document.querySelectorAll('.btn-eliminar').forEach(btn => {
                btn.addEventListener('click', function() {
                    borrarUsuario(this.getAttribute('data-usuario'));
                });
            });
            document.querySelectorAll('.btn-reactivar').forEach(btn => {
                btn.addEventListener('click', function() {
                    reactivarUsuario(this.getAttribute('data-usuario'));
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

    const catalogo = document.getElementById('catalogo');
    fetch('/getProductos')
    .then(res => {
        if (!res.ok) throw new Error('Error al obtener productos');
        return res.json();
    })
    .then(productos => {
        if (productos.length === 0) {
            catalogo.innerHTML = '<p class="text-center text-muted">No hay productos disponibles.</p>';
            return;
        }
        // Filtrar productos con stock > 0
        const productosDisponibles = productos.filter(p => p.stock > 0);
        
        if (productosDisponibles.length === 0) {
            catalogo.innerHTML = '<p class="text-center text-muted">No hay productos disponibles en este momento.</p>';
            return;
        }
        
        let html = '<div class="row row-cols-1 row-cols-md-3 g-4">';
        productosDisponibles.forEach((producto) => {
            html += `
            <div class="col">
                <div class="card h-100 shadow-sm">
                    <img src="${producto.imagen || 'images/default.jpg'}" class="card-img-top" alt="${producto.nombre}" style="height: 200px; object-fit: cover;">
                    <div class="card-body d-flex flex-column">
                        <h5 class="card-title">${producto.nombre}</h5>
                        <p class="card-text text-muted" style="min-height: 48px;">${producto.descripcion || ''}</p>
                        <div class="mt-auto">
                            <p class="fs-5 fw-bold mb-1">$${parseFloat(producto.precio).toFixed(2)}</p>
                            <p class="mb-2">Stock: <span class="badge bg-secondary">${producto.stock}</span></p>
                            <button class="btn btn-primary w-100" onclick="agregarAlCarrito(${JSON.stringify(producto).replace(/"/g, '&quot;')})">
                                <i class="bi bi-cart-plus"></i> Agregar al carrito
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            `;
        });
        html += '</div>';
        catalogo.innerHTML = html;
    })
    .catch(err => {
        console.error(err);
        catalogo.innerHTML = '<p class="text-danger">Error al cargar productos.</p>';
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

// Hacer que el botón del carrito redirija a la página de carrito
document.addEventListener('DOMContentLoaded', () => {
    const carritoBtn = document.getElementById('carritoBtn');
    if (carritoBtn) {
        carritoBtn.addEventListener('click', (e) => {
            e.preventDefault();
            window.location.href = '/carrito-compras.html';
        });
    }
});

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

function reactivarUsuario(id) {
    if (!confirm('¿Deseas reactivar este usuario?')) return;
    fetch('/reactivarUsuario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_usuario: parseInt(id) })
    })
    .then(res => res.json())
    .then(data => {
        if (data.error) {
            alert(data.error);
        } else {
            alert(data.message);
            cargarUsuarios();
        }
    })
    .catch(err => {
        console.error('Error al reactivar el usuario:', err);
        alert('Error al reactivar el usuario.');
    });
}