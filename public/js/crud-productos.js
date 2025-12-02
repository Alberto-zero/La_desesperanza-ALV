document.addEventListener('DOMContentLoaded', cargarProductos);

function cargarProductos() {
    fetch('/getAllProductos')
        .then(res => res.json())
        .then(productos => mostrarProductos(productos))
        .catch(() => mostrarMensaje('Error al cargar productos', 'danger'));
}

function mostrarProductos(productos) {
    const tbody = document.querySelector('#tablaProductos tbody');
    tbody.innerHTML = '';
    productos.forEach(prod => {
        const fila = document.createElement('tr');
        fila.innerHTML = `
            <td>${prod.id_producto}</td>
            <td>${prod.nombre}</td>
            <td>$${parseFloat(prod.precio).toFixed(2)}</td>
            <td>
                <input type="number" min="0" value="${prod.stock}" class="form-control form-control-sm" style="width:90px;" onchange="actualizarStock(${prod.id_producto}, this.value)">
            </td>
            <td>${prod.descripcion}</td>
            <td>${prod.activo == 1 ? '<span class=\'badge bg-success\'>Activo</span>' : '<span class=\'badge bg-danger\'>Inactivo</span>'}</td>
            <td>${prod.imagen ? `<img src='${prod.imagen}' width='50'>` : ''}</td>
            <td>
                ${prod.activo == 0 ? `<button class='btn btn-success btn-sm' onclick='reactivarProducto(${prod.id_producto})'><i class='bi bi-arrow-repeat'></i> Reactivar</button>` : ''}
            </td>
        `;
        tbody.appendChild(fila);
    });
}

function actualizarStock(id, nuevoStock) {
    fetch('/updateStock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_producto: id, stock: nuevoStock })
    })
    .then(res => res.json())
    .then(data => mostrarMensaje(data.message || data.error, data.error ? 'danger' : 'success'))
    .catch(() => mostrarMensaje('Error al actualizar stock ', 'danger'));
}

function reactivarProducto(id) {
    fetch('/reactivarProducto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_producto: id })
    })
    .then(res => res.json())
    .then(data => {
        mostrarMensaje(data.message || data.error, data.error ? 'danger' : 'success');
        cargarProductos();
    })
    .catch(() => mostrarMensaje('Error al reactivar producto', 'danger'));
}

function mostrarMensaje(msg, tipo) {
    const div = document.getElementById('mensajeCrud');
    div.innerHTML = `<div class='alert alert-${tipo}'>${msg}</div>`;
    setTimeout(() => div.innerHTML = '', 2500);
}
