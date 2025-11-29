// Script para la página de carrito de compras
document.addEventListener('DOMContentLoaded', () => {
    mostrarCarritoEnPagina();
});

function mostrarCarritoEnPagina() {
    const carritoContent = document.getElementById('carritoContent');
    
    if (carritoManager.carrito.length === 0) {
        carritoContent.innerHTML = `
            <div class="alert alert-warning" role="alert">
                <i class="bi bi-basket"></i> Tu carrito está vacío.
            </div>
            <p class="text-center mt-3">
                <a href="index.html" class="btn btn-primary">Ir al catálogo</a>
            </p>
        `;
        return;
    }

    let html = `
        <div class="table-responsive">
            <table class="table table-striped table-hover align-middle">
                <thead class="table-dark">
                    <tr>
                        <th>Producto</th>
                        <th class="text-center">Cantidad</th>
                        <th class="text-end">Precio Unitario</th>
                        <th class="text-end">Total</th>
                        <th class="text-end">Acciones</th>
                    </tr>
                </thead>
                <tbody>
    `;

    carritoManager.carrito.forEach(item => {
        const subtotal = item.precio * item.cantidad;
        html += `
            <tr data-producto-id="${item.id}">
                <td>${item.nombre}</td>
                <td class="text-center" style="width: 150px;">
                    <div class="input-group input-group-sm">
                        <button class="btn btn-outline-secondary" type="button" 
                            onclick="disminuirCantidad(${item.id})">
                            <i class="bi bi-dash"></i>
                        </button>
                        <input type="number" class="form-control text-center" value="${item.cantidad}"
                            onchange="cambiarCantidad(${item.id}, this.value)">
                        <button class="btn btn-outline-secondary" type="button"
                            onclick="aumentarCantidad(${item.id})">
                            <i class="bi bi-plus"></i>
                        </button>
                    </div>
                </td>
                <td class="text-end">$${item.precio.toFixed(2)}</td>
                <td class="text-end">$${subtotal.toFixed(2)}</td>
                <td class="text-end">
                    <button class="btn btn-danger btn-sm" 
                        onclick="eliminarDelCarrito(${item.id})">
                        <i class="bi bi-trash"></i> Eliminar
                    </button>
                </td>
            </tr>
        `;
    });

    const total = carritoManager.calcularTotal();
    
    html += `
                </tbody>
            </table>
        </div>

        <div class="row mt-4">
            <div class="col-md-6 offset-md-6">
                <div class="card">
                    <div class="card-body">
                        <h5 class="card-title">Resumen de Compra</h5>
                        <hr>
                        <div class="row mb-2">
                            <div class="col-6">
                                <p class="text-muted">Subtotal:</p>
                            </div>
                            <div class="col-6 text-end">
                                <p class="text-muted">$${total.toFixed(2)}</p>
                            </div>
                        </div>
                        <div class="row mb-3">
                            <div class="col-6">
                                <p class="text-muted">Impuestos:</p>
                            </div>
                            <div class="col-6 text-end">
                                <p class="text-muted">$0.00</p>
                            </div>
                        </div>
                        <hr>
                        <div class="row">
                            <div class="col-6">
                                <h5 class="fw-bold">Total a pagar:</h5>
                            </div>
                            <div class="col-6 text-end">
                                <h5 class="fw-bold text-success">$${total.toFixed(2)}</h5>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="mt-3">
                    <button class="btn btn-success w-100 btn-lg" onclick="finalizarCompra()">
                        <i class="bi bi-check-circle me-2"></i> Finalizar Compra
                    </button>
                    <button class="btn btn-outline-secondary w-100 mt-2" onclick="limpiarCarrito()">
                        <i class="bi bi-trash me-2"></i> Vaciar Carrito
                    </button>
                </div>
            </div>
        </div>
    `;

    carritoContent.innerHTML = html;
}

function aumentarCantidad(idProducto) {
    const item = carritoManager.carrito.find(item => item.id === idProducto);
    if (item) {
        carritoManager.actualizarCantidad(idProducto, item.cantidad + 1);
        mostrarCarritoEnPagina();
    }
}

function disminuirCantidad(idProducto) {
    const item = carritoManager.carrito.find(item => item.id === idProducto);
    if (item && item.cantidad > 1) {
        carritoManager.actualizarCantidad(idProducto, item.cantidad - 1);
        mostrarCarritoEnPagina();
    }
}

function cambiarCantidad(idProducto, nuevaCantidad) {
    const cantidad = parseInt(nuevaCantidad);
    if (cantidad > 0) {
        carritoManager.actualizarCantidad(idProducto, cantidad);
        mostrarCarritoEnPagina();
    }
}

function eliminarDelCarrito(idProducto) {
    if (confirm('¿Estás seguro de que deseas eliminar este producto?')) {
        carritoManager.eliminarProducto(idProducto);
        mostrarCarritoEnPagina();
    }
}

function limpiarCarrito() {
    if (confirm('¿Estás seguro de que deseas vaciar todo el carrito?')) {
        carritoManager.limpiarCarrito();
        mostrarCarritoEnPagina();
    }
}

function finalizarCompra() {
    if (carritoManager.carrito.length === 0) {
        alert('El carrito está vacío.');
        return;
    }

    fetch('/checkSession')
        .then(response => response.json())
        .then(data => {
            if (!data.authenticated) {
                alert('Debes iniciar sesión para realizar una compra.');
                window.location.href = '/login.html';
                return;
            }

            // Validar cantidad de productos
            const algunoConCantidadCero = carritoManager.carrito.some(item => item.cantidad <= 0);
            if (algunoConCantidadCero) {
                alert('Todos los productos deben tener cantidad mayor a 0');
                return;
            }

            // Realizar la compra
            fetch('/carrito/comprar', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ carrito: carritoManager.carrito })
            })
            .then(response => response.json())
            .then(dataCompra => {
                if (dataCompra.error) {
                    alert('Error: ' + dataCompra.error);
                } else {
                    // Redirigir a página de recibo
                    const numeroVenta = dataCompra.numeroVenta || 'N/A';
                    carritoManager.limpiarCarrito();
                    window.location.href = `/recibo.html?venta=${numeroVenta}`;
                }
            })
            .catch(error => {
                console.error('Error al procesar la compra:', error);
                alert('Ocurrió un error al procesar la compra. Por favor, intenta de nuevo.');
            });
        })
        .catch(error => {
            console.error('Error al verificar sesión:', error);
            alert('Error al verificar tu sesión.');
        });
}
