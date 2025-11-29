document.addEventListener('DOMContentLoaded', cargarInventario);

function cargarInventario() {
    fetch('/getAllProductos')
        .then(res => {
            if (!res.ok) throw new Error('Error al obtener productos');
            return res.json();
        })
        .then(productos => mostrarInventario(productos))
        .catch(err => {
            console.error(err);
            mostrarMensaje('Error al cargar el inventario', 'danger');
        });
}

function mostrarInventario(productos) {
    const tbody = document.querySelector('#tablaProductos tbody');
    tbody.innerHTML = '';

    if (productos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted">No hay productos registrados.</td></tr>';
        return;
    }

    productos.forEach((prod, index) => {
        const estadoBadge = prod.activo == 1 
            ? '<span class="badge bg-success">Activo</span>' 
            : '<span class="badge bg-danger">Inactivo</span>';
        
        const fila = document.createElement('tr');
        fila.className = prod.activo == 0 ? 'table-light' : '';
        fila.innerHTML = `
            <td>${index + 1}</td>
            <td>
                ${prod.imagen ? `<img src="${prod.imagen}" alt="${prod.nombre}" style="width: 60px; height: 60px; object-fit: cover;" class="rounded">` : 'Sin imagen'}
            </td>
            <td><strong>${prod.nombre}</strong></td>
            <td>${prod.descripcion || ''}</td>
            <td>$${parseFloat(prod.precio).toFixed(2)}</td>
            <td>
                <input type="number" min="0" value="${prod.stock}" class="form-control form-control-sm" style="width: 80px;" onchange="actualizarStock(${prod.id_producto}, this.value)">
            </td>
            <td>${estadoBadge}</td>
            <td>
                <a href="editar.html?id=${prod.id_producto}" class="btn btn-sm btn-primary" title="Editar">
                    <i class="bi bi-pencil"></i>
                </a>
                ${prod.activo == 1 
                    ? `<button class="btn btn-sm btn-danger" onclick="eliminarProducto(${prod.id_producto})" title="Eliminar">
                        <i class="bi bi-trash"></i>
                    </button>` 
                    : `<button class="btn btn-sm btn-success" onclick="reactivarProducto(${prod.id_producto})" title="Reactivar">
                        <i class="bi bi-arrow-repeat"></i> Reactivar
                    </button>`
                }
            </td>
        `;
        tbody.appendChild(fila);
    });
}

function actualizarStock(id_producto, nuevoStock) {
    if (isNaN(nuevoStock) || nuevoStock < 0) {
        mostrarMensaje('El stock debe ser un número positivo', 'warning');
        return;
    }

    fetch('/updateStock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_producto, stock: parseInt(nuevoStock) })
    })
    .then(res => res.json())
    .then(data => {
        mostrarMensaje(data.message || 'Stock actualizado', 'success');
    })
    .catch(err => {
        console.error(err);
        mostrarMensaje('Error al actualizar stock', 'danger');
        cargarInventario();
    });
}

function reactivarProducto(id_producto) {
    if (!confirm('¿Deseas reactivar este producto?')) return;

    fetch('/reactivarProducto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_producto })
    })
    .then(res => res.json())
    .then(data => {
        mostrarMensaje(data.message || 'Producto reactivado', 'success');
        cargarInventario();
    })
    .catch(err => {
        console.error(err);
        mostrarMensaje('Error al reactivar producto', 'danger');
    });
}

function eliminarProducto(id_producto) {
    if (!confirm('¿Deseas eliminar este producto? Se marcará como inactivo.')) return;

    fetch('/deleteProducto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_producto })
    })
    .then(res => res.json())
    .then(data => {
        mostrarMensaje(data.message || 'Producto eliminado', 'success');
        cargarInventario();
    })
    .catch(err => {
        console.error(err);
        mostrarMensaje('Error al eliminar producto', 'danger');
    });
}

function mostrarMensaje(msg, tipo) {
    const div = document.getElementById('mensajeStatus');
    div.innerHTML = `<div class="alert alert-${tipo} alert-dismissible fade show" role="alert">
        ${msg}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    </div>`;
    setTimeout(() => {
        div.innerHTML = '';
    }, 3000);
}
