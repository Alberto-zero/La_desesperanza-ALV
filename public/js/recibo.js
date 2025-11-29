// Script para la página de recibo
document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const ventaId = params.get('venta');

    if (!ventaId || ventaId === 'N/A') {
        fetch('/checkSession')
            .then(response => response.json())
            .then(data => {
                if (!data.authenticated) {
                    window.location.href = '/index.html';
                    return;
                }
                mostrarUltimaCompra();
            });
    } else {
        mostrarRecibo(ventaId);
    }
});

function mostrarUltimaCompra() {
    fetch('/carrito/ultima-venta')
        .then(response => {
            if (!response.ok) throw new Error('Error al obtener la compra');
            return response.json();
        })
        .then(data => {
            if (data.error) {
                document.getElementById('reciboContent').innerHTML = `
                    <div class="alert alert-warning">
                        <p>No se encontró información de la compra.</p>
                        <a href="index.html" class="btn btn-primary">Volver al catálogo</a>
                    </div>
                `;
                return;
            }
            generarRecibo(data);
        })
        .catch(error => {
            console.error('Error:', error);
            document.getElementById('reciboContent').innerHTML = `
                <div class="alert alert-danger">
                    Error al cargar el recibo.
                </div>
            `;
        });
}

function mostrarRecibo(ventaId) {
    mostrarUltimaCompra();
}

function generarRecibo(venta) {
    const fecha = new Date(venta.fecha).toLocaleDateString('es-MX');
    const hora = new Date(venta.fecha).toLocaleTimeString('es-MX');

    let html = `
        <div class="card shadow">
            <div class="card-body p-5">
                <div class="text-center mb-4">
                    <h2 class="fw-bold text-success"><i class="bi bi-check-circle"></i> ¡COMPRA REALIZADA!</h2>
                    <p class="text-muted">Tu pedido ha sido procesado correctamente</p>
                </div>

                <hr class="my-4">

                <div class="row mb-4">
                    <div class="col-md-6">
                        <h6 class="fw-bold text-muted">INFORMACIÓN DE LA COMPRA</h6>
                        <p><strong>Número de Venta:</strong> ${venta.id_venta || 'N/A'}</p>
                        <p><strong>Fecha:</strong> ${fecha}</p>
                        <p><strong>Hora:</strong> ${hora}</p>
                    </div>
                    <div class="col-md-6">
                        <h6 class="fw-bold text-muted">DATOS DEL CLIENTE</h6>
                        <p><strong>Nombre:</strong> ${venta.nombre || 'N/A'}</p>
                        <p><strong>Email:</strong> ${venta.email || 'N/A'}</p>
                        <p><strong>Negocio:</strong> ${venta.nombre_negocio || 'N/A'}</p>
                    </div>
                </div>

                <hr class="my-4">

                <h6 class="fw-bold text-muted mb-3">DETALLES DE LA COMPRA</h6>
                <div class="table-responsive">
                    <table class="table table-sm table-borderless">
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

    if (venta.detalles && Array.isArray(venta.detalles)) {
        venta.detalles.forEach(item => {
            const subtotal = item.cantidad * item.precio;
            html += `
                <tr>
                    <td>${item.nombre_producto}</td>
                    <td class="text-center">${item.cantidad}</td>
                    <td class="text-end">$${parseFloat(item.precio).toFixed(2)}</td>
                    <td class="text-end">$${subtotal.toFixed(2)}</td>
                </tr>
            `;
        });
    } else if (venta.nombre_producto) {
        const subtotal = venta.cantidad * venta.precio;
        html += `
            <tr>
                <td>${venta.nombre_producto}</td>
                <td class="text-center">${venta.cantidad}</td>
                <td class="text-end">$${parseFloat(venta.precio).toFixed(2)}</td>
                <td class="text-end">$${subtotal.toFixed(2)}</td>
            </tr>
        `;
    }

    html += `
                        </tbody>
                    </table>
                </div>

                <hr class="my-4">

                <div class="row">
                    <div class="col-md-6 offset-md-6">
                        <div class="d-flex justify-content-between mb-2">
                            <p class="text-muted">Subtotal:</p>
                            <p class="text-muted">$${parseFloat(venta.total || 0).toFixed(2)}</p>
                        </div>
                        <div class="d-flex justify-content-between mb-3">
                            <p class="text-muted">Impuestos:</p>
                            <p class="text-muted">$0.00</p>
                        </div>
                        <div class="d-flex justify-content-between border-top pt-3">
                            <h5 class="fw-bold">TOTAL A PAGAR:</h5>
                            <h5 class="fw-bold text-success">$${parseFloat(venta.total || 0).toFixed(2)}</h5>
                        </div>
                    </div>
                </div>

                <hr class="my-4">

                <div class="text-center">
                    <p class="text-muted small">Gracias por tu compra. Tu pedido será procesado pronto.</p>
                    <p class="text-muted small">Si tienes preguntas, contáctanos a través de nuestro formulario de contacto.</p>
                </div>

                <div class="text-center mt-4">
                    <a href="index.html" class="btn btn-primary me-2">
                        <i class="bi bi-house me-2"></i> Ir al catálogo
                    </a>
                    <button class="btn btn-outline-secondary" onclick="window.print()">
                        <i class="bi bi-printer me-2"></i> Imprimir recibo
                    </button>
                </div>
            </div>
        </div>
    `;

    document.getElementById('reciboContent').innerHTML = html;
}
