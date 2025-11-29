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
        <div class="table-responsive">
            <table class="table table-striped table-hover align-middle">
                <thead class="table-dark">
                    <tr>
                        <th>#</th>
                        <th>Fecha</th>
                        <th>Producto</th>
                        <th class="text-center">Cantidad</th>
                        <th class="text-end">Precio Unitario</th>
                        <th class="text-end">Total</th>
                    </tr>
                </thead>
                <tbody>
    `;

    compras.forEach((compra, index) => {
        const fecha = new Date(compra.fecha).toLocaleDateString('es-MX');
        html += `
            <tr>
                <td>${compra.id_venta}</td>
                <td>${fecha}</td>
                <td>${compra.nombre_producto}</td>
                <td class="text-center">${compra.cantidad}</td>
                <td class="text-end">$${parseFloat(compra.precio).toFixed(2)}</td>
                <td class="text-end">$${parseFloat(compra.total).toFixed(2)}</td>
            </tr>
        `;
    });

    html += `
                </tbody>
            </table>
        </div>
    `;

    // Calcular total de todas las compras
    const totalCompras = compras.reduce((sum, compra) => sum + parseFloat(compra.total), 0);
    
    html += `
        <div class="row mt-4">
            <div class="col-md-6 offset-md-6">
                <div class="card">
                    <div class="card-body">
                        <h5 class="card-title">Resumen de Compras</h5>
                        <hr>
                        <p class="text-muted">Total de transacciones: <strong>${compras.length}</strong></p>
                        <p class="text-muted">Total invertido: <strong class="text-success">$${totalCompras.toFixed(2)}</strong></p>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.getElementById('historialContent').innerHTML = html;
}
