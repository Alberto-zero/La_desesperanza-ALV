// Script para mostrar historial de compras
document.addEventListener('DOMContentLoaded', () => {
    cargarHistorialCompras();
});

function cargarHistorialCompras() {
    fetch('/checkSession')
        .then(response => response.json())
        .then(data => {
            if (!data.authenticated) {
                document.getElementById('historialContent').innerHTML = `
                    <div class="alert alert-warning">
                        <p>Debes iniciar sesión para ver tu historial de compras.</p>
                        <a href="/login.html" class="btn btn-primary">Iniciar sesión</a>
                    </div>
                `;
                return;
            }
            obtenerHistorial();
        });
}

function obtenerHistorial() {
    fetch('/carrito/historial')
        .then(response => {
            if (!response.ok) throw new Error('Error al obtener historial');
            return response.json();
        })
        .then(data => {
            if (data.error || !data || data.length === 0) {
                document.getElementById('historialContent').innerHTML = `
                    <div class="alert alert-info">
                        <p><i class="bi bi-inbox"></i> No tienes compras registradas.</p>
                        <a href="index.html" class="btn btn-primary">Ir al catálogo</a>
                    </div>
                `;
                return;
            }
            mostrarHistorial(data);
        })
        .catch(error => {
            console.error('Error:', error);
            document.getElementById('historialContent').innerHTML = `
                <div class="alert alert-danger">
                    Error al cargar el historial de compras.
                </div>
            `;
        });
}

function mostrarHistorial(compras) {
    let html = `
        <div id="historialCarritos">
    `;

    let totalGeneralCompras = 0;

    compras.forEach((carrito, index) => {
        const fecha = new Date(carrito.fecha).toLocaleDateString('es-MX');
        const hora = new Date(carrito.fecha).toLocaleTimeString('es-MX');
        
        totalGeneralCompras += carrito.totalCarrito;

        html += `
            <div class="card mb-4 shadow-sm">
                <div class="card-header bg-light d-flex justify-content-between align-items-center">
                    <div>
                        <h6 class="mb-0 fw-bold">
                            <i class="bi bi-basket2"></i> Carrito #${index + 1}
                        </h6>
                        <small class="text-muted">${fecha} - ${hora}</small>
                    </div>
                    <div class="text-end">
                        <h5 class="mb-0 text-success">$${carrito.totalCarrito.toFixed(2)}</h5>
                        <small class="text-muted">${carrito.productos.length} producto(s)</small>
                    </div>
                </div>
                <div class="card-body">
                    <div class="table-responsive">
                        <table class="table table-sm align-middle mb-0">
                            <thead class="table-light">
                                <tr>
                                    <th>Producto</th>
                                    <th class="text-center">Cantidad</th>
                                    <th class="text-end">Precio Unitario</th>
                                    <th class="text-end">Total</th>
                                </tr>
                            </thead>
                            <tbody>
        `;

        carrito.productos.forEach(producto => {
            html += `
                <tr>
                    <td>${producto.nombre_producto}</td>
                    <td class="text-center">${producto.cantidad}</td>
                    <td class="text-end">$${parseFloat(producto.precio).toFixed(2)}</td>
                    <td class="text-end"><strong>$${parseFloat(producto.total).toFixed(2)}</strong></td>
                </tr>
            `;
        });

        html += `
                            </tbody>
                        </table>
                    </div>
                </div>
                <div class="card-footer bg-light d-flex justify-content-between align-items-center">
                    <small class="text-muted">ID de venta: ${carrito.productos[0].id_venta}</small>
                    <div>
                        <button class="btn btn-sm btn-primary" onclick="verRecibosCarrito('${fecha}', ${index})">
                            <i class="bi bi-receipt"></i> Ver recibos
                        </button>
                    </div>
                </div>
            </div>
        `;
    });

    html += `
        </div>

        <div class="row mt-4">
            <div class="col-md-6 offset-md-6">
                <div class="card">
                    <div class="card-body">
                        <h5 class="card-title">Resumen de Compras</h5>
                        <hr>
                        <p class="text-muted">Total de carritos: <strong>${compras.length}</strong></p>
                        <p class="text-muted">Total de productos: <strong>${compras.reduce((sum, c) => sum + c.productos.length, 0)}</strong></p>
                        <p class="text-muted">Total invertido: <strong class="text-success">$${totalGeneralCompras.toFixed(2)}</strong></p>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.getElementById('historialContent').innerHTML = html;
}

function verRecibosCarrito(fecha, indice) {
    fetch('/carrito/historial')
        .then(response => {
            if (!response.ok) throw new Error('Error al obtener historial');
            return response.json();
        })
        .then(compras => {
            if (compras[indice]) {
                const carrito = compras[indice];
                mostrarModalRecibosCarrito(carrito, fecha);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Error al cargar los recibos');
        });
}

function mostrarModalRecibosCarrito(carrito, fecha) {
    const fechaFormato = new Date(carrito.fecha).toLocaleDateString('es-MX');
    const horaFormato = new Date(carrito.fecha).toLocaleTimeString('es-MX');

    let productosHtml = '';
    carrito.productos.forEach(producto => {
        productosHtml += `
            <tr>
                <td>${producto.nombre_producto}</td>
                <td class="text-center">${producto.cantidad}</td>
                <td class="text-end">$${parseFloat(producto.precio).toFixed(2)}</td>
                <td class="text-end"><strong>$${parseFloat(producto.total).toFixed(2)}</strong></td>
            </tr>
        `;
    });

    let html = `
        <div class="modal fade" id="recibosCarritoModal" tabindex="-1" aria-labelledby="recibosCarritoModalLabel" aria-hidden="true">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header bg-light">
                        <h5 class="modal-title" id="recibosCarritoModalLabel">
                            <i class="bi bi-basket2 text-success"></i> Detalle de Carrito
                        </h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <div class="card border-0">
                            <div class="card-body">
                                <div class="text-center mb-4">
                                    <h6 class="fw-bold text-success">LA DESESPERANZA</h6>
                                    <p class="text-muted small">Panadería Temática</p>
                                </div>

                                <hr class="my-3">

                                <div class="row mb-3">
                                    <div class="col-12">
                                        <h6 class="fw-bold text-muted">INFORMACIÓN DEL CARRITO</h6>
                                        <p class="small"><strong>Fecha:</strong> ${fechaFormato}</p>
                                        <p class="small"><strong>Hora:</strong> ${horaFormato}</p>
                                        <p class="small"><strong>Cantidad de productos:</strong> ${carrito.productos.length}</p>
                                    </div>
                                </div>

                                <hr class="my-3">

                                <h6 class="fw-bold text-muted mb-2">PRODUCTOS EN EL CARRITO</h6>
                                <div class="table-responsive">
                                    <table class="table table-sm table-borderless">
                                        <thead class="table-light">
                                            <tr>
                                                <th>Producto</th>
                                                <th class="text-center">Cantidad</th>
                                                <th class="text-end">Precio</th>
                                                <th class="text-end">Total</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${productosHtml}
                                        </tbody>
                                    </table>
                                </div>

                                <hr class="my-3">

                                <div class="text-end">
                                    <p class="text-muted small mb-1">Total del carrito:</p>
                                    <h5 class="fw-bold text-success">$${carrito.totalCarrito.toFixed(2)}</h5>
                                </div>

                                <hr class="my-3">

                                <div class="text-center">
                                    <p class="text-muted small">Gracias por tu compra</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Cerrar</button>
                        <button type="button" class="btn btn-primary" onclick="imprimirCarrito()">
                            <i class="bi bi-printer"></i> Imprimir
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Eliminar modal anterior si existe
    const modalAnterior = document.getElementById('recibosCarritoModal');
    if (modalAnterior) {
        modalAnterior.remove();
    }

    // Agregar el nuevo modal al documento
    document.body.insertAdjacentHTML('beforeend', html);

    // Mostrar el modal
    const modal = new bootstrap.Modal(document.getElementById('recibosCarritoModal'));
    modal.show();
}

function imprimirCarrito() {
    window.print();
}
