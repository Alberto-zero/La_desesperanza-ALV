
// carrito-page.js - renderiza y controla la página de carrito
// Usa `carritoManager` si existe (global), si no hace fallback a cookies.

let carrito = [];

function obtenerCarritoDeCookiesRaw() {
    const name = 'carrito=';
    if (!document.cookie) return null;
    const cookies = document.cookie.split(';').map(s => s.trim());
    const c = cookies.find(s => s.indexOf(name) === 0);
    if (!c) return null;
    // carrito.js almacena JSON sin encodeURIComponent
    const raw = c.substring(name.length);
    try {
        return JSON.parse(raw);
    } catch (e) {
        console.error('No se pudo parsear cookie carrito:', e);
        return null;
    }
}

function obtenerCarritoDeCookies() {
    const raw = obtenerCarritoDeCookiesRaw();
    return normalizarCarrito(raw || []);
}

function guardarCarritoEnCookie() {
    // Coincidir con `CarritoManager.setCookie` (no encodeURIComponent)
    const days = 7;
    const d = new Date(); d.setTime(d.getTime() + days * 24 * 60 * 60 * 1000);
    const expires = 'expires=' + d.toUTCString();
    try {
        document.cookie = 'carrito=' + JSON.stringify(carrito) + ';' + expires + ';path=/';
    } catch (e) {
        console.error('Error guardando cookie carrito:', e);
    }
}

function cargarFondosUsuario() {
    fetch('/getFondos')
        .then(response => {
            if (!response.ok) throw new Error('Error al obtener fondos');
            return response.json();
        })
        .then(data => {
            const fondosElement = document.getElementById('fondosUsuario');
            if (fondosElement) {
                fondosElement.textContent = '$' + parseFloat(data.fondos).toFixed(2);
            }
        })
        .catch(error => {
            console.error('Error:', error);
        });
}

function normalizarCarrito(raw) {
    if (!Array.isArray(raw)) return [];
    return raw.map(it => ({
        id: it.id ?? it.id_producto ?? null,
        nombre: it.nombre ?? it.nombre_producto ?? it.title ?? '',
        precio: Number(it.precio ?? it.precio_unitario ?? it.price) || 0,
        cantidad: Number(it.cantidad ?? it.qty ?? it.quantity) || 0
    })).filter(i => i.id !== null);
}

function sincronizarDesdeCarritoManager() {
    if (typeof carritoManager !== 'undefined' && Array.isArray(carritoManager.carrito)) {
        carrito = normalizarCarrito(carritoManager.carrito);
    }
}

function syncToCarritoManager() {
    // Si existe carritoManager, intentar sincronizar cambios para mantener el icono y demás
    if (typeof carritoManager !== 'undefined') {
        try {
            // reemplazar carritoManager.carrito por la versión actual (asegurar formatos)
            carritoManager.carrito = carrito.map(it => ({ id: it.id, nombre: it.nombre, precio: it.precio, cantidad: it.cantidad }));
            carritoManager.guardarCarrito();
            carritoManager.actualizarIconoCarrito();
        } catch (e) {
            console.warn('No se pudo sincronizar con carritoManager:', e);
        }
    }
}

// Render y lógica
function mostrarCarritoEnPagina() {
    const cont = document.getElementById('carritoContent');
    if (!cont) return;

    if (!carrito || carrito.length === 0) {
        cont.innerHTML = `
            <div class="alert alert-info"><i class="bi bi-info-circle"></i> Tu carrito está vacío.</div>
            <p class="text-center mt-3"><a href="index.html" class="btn btn-primary">Ir al catálogo</a></p>
        `;
        return;
    }

    let html = `
        <div class="table-responsive">
            <table class="table table-striped align-middle">
                <thead class="table-dark">
                    <tr>
                        <th>Producto</th>
                        <th class="text-center">Cantidad</th>
                        <th class="text-end">Precio</th>
                        <th class="text-end">Subtotal</th>
                        <th class="text-end">Acciones</th>
                    </tr>
                </thead>
                <tbody>
    `;

    carrito.forEach(item => {
        const subtotal = (item.precio || 0) * (item.cantidad || 0);
        html += `
            <tr data-producto-id="${item.id}">
                <td>${item.nombre}</td>
                <td class="text-center" style="width:160px;">
                    <div class="input-group input-group-sm">
                        <button class="btn btn-outline-secondary" type="button" onclick="disminuirCantidad(${item.id})">-</button>
                        <input type="number" class="form-control text-center" value="${item.cantidad}" onchange="cambiarCantidad(${item.id}, this.value)">
                        <button class="btn btn-outline-secondary" type="button" onclick="aumentarCantidad(${item.id})">+</button>
                    </div>
                </td>
                <td class="text-end">$${(item.precio||0).toFixed(2)}</td>
                <td class="text-end">$${subtotal.toFixed(2)}</td>
                <td class="text-end"><button class="btn btn-danger btn-sm" onclick="eliminarDelCarrito(${item.id})">Eliminar</button></td>
            </tr>
        `;
    });

    const total = calcularTotal();

    html += `
                </tbody>
            </table>
        </div>
        <div class="row mt-3">
            <div class="col-md-6 offset-md-6">
                <div class="card">
                    <div class="card-body">
                        <h5 class="card-title">Resumen</h5>
                        <p class="text-end">Total: <strong>$${total.toFixed(2)}</strong></p>
                        <button class="btn btn-success w-100" onclick="finalizarCompra()">Finalizar Compra</button>
                        <button class="btn btn-outline-secondary w-100 mt-2" onclick="limpiarCarrito()">Vaciar carrito</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    cont.innerHTML = html;
}

function calcularTotal() {
    return carrito.reduce((s, it) => s + ((it.precio||0)*(it.cantidad||0)), 0);
}

// Operaciones que prefieren usar carritoManager si está disponible
function aumentarCantidad(idProducto) {
    if (typeof carritoManager !== 'undefined') {
        carritoManager.actualizarCantidad(idProducto, (carrito.find(i=>i.id==idProducto)?.cantidad||0) + 1);
        sincronizarDesdeCarritoManager();
    } else {
        const it = carrito.find(i => i.id == idProducto);
        if (it) { it.cantidad = (it.cantidad||0) + 1; guardarCarritoEnCookie(); }
    }
    syncToCarritoManager();
    mostrarCarritoEnPagina();
}

function disminuirCantidad(idProducto) {
    if (typeof carritoManager !== 'undefined') {
        const current = carrito.find(i=>i.id==idProducto)?.cantidad || 0;
        if (current > 1) carritoManager.actualizarCantidad(idProducto, current - 1);
        else carritoManager.eliminarProducto(idProducto);
        sincronizarDesdeCarritoManager();
    } else {
        const it = carrito.find(i => i.id == idProducto);
        if (it && it.cantidad > 1) { it.cantidad -= 1; guardarCarritoEnCookie(); }
        else { carrito = carrito.filter(i => i.id != idProducto); guardarCarritoEnCookie(); }
    }
    syncToCarritoManager();
    mostrarCarritoEnPagina();
}

function cambiarCantidad(idProducto, nuevaCantidad) {
    const cantidad = parseInt(nuevaCantidad);
    if (isNaN(cantidad) || cantidad <= 0) return;
    if (typeof carritoManager !== 'undefined') {
        carritoManager.actualizarCantidad(idProducto, cantidad);
        sincronizarDesdeCarritoManager();
    } else {
        const it = carrito.find(i => i.id == idProducto);
        if (it) { it.cantidad = cantidad; guardarCarritoEnCookie(); }
    }
    syncToCarritoManager();
    mostrarCarritoEnPagina();
}

function eliminarDelCarrito(idProducto) {
    if (!confirm('¿Eliminar este producto?')) return;
    if (typeof carritoManager !== 'undefined') {
        carritoManager.eliminarProducto(idProducto);
        sincronizarDesdeCarritoManager();
    } else {
        carrito = carrito.filter(i => i.id != idProducto);
        guardarCarritoEnCookie();
    }
    syncToCarritoManager();
    mostrarCarritoEnPagina();
}

function limpiarCarrito() {
    if (!confirm('¿Vaciar todo el carrito?')) return;
    if (typeof carritoManager !== 'undefined') {
        carritoManager.limpiarCarrito();
        sincronizarDesdeCarritoManager();
    } else {
        carrito = [];
        guardarCarritoEnCookie();
    }
    syncToCarritoManager();
    mostrarCarritoEnPagina();
}

function finalizarCompra() {
    if (!carrito || carrito.length == 0) { alert('El carrito está vacío.'); return; }

    fetch('/checkSession')
        .then(r => r.json())
        .then(sess => {
            if (!sess.authenticated) { alert('Debes iniciar sesión para comprar.'); window.location.href = '/login.html'; return; }
            const total = calcularTotal();
            fetch('/getFondos')
                .then(r => {
                    if (r.status == 401) throw new Error('No autenticado');
                    if (!r.ok) throw new Error('Error al obtener fondos');
                    return r.json();
                })
                .then(f => {
                    const fondos = f.fondos || 0;
                    if (fondos < total) { alert(`Saldo insuficiente. Tu saldo: $${fondos.toFixed(2)} Total: $${total.toFixed(2)}`); return; }

                    // Enviar compra
                    fetch('/carrito/comprar', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ carrito })
                    })
                    .then(r => r.json())
                    .then(data => {
                        if (data.error) { alert('Error: ' + data.error); return; }
                        const id = data.id_compra || data.insertId || data.id || 'N/A';
                        // limpiar
                        if (typeof carritoManager !== 'undefined') carritoManager.limpiarCarrito();
                        carrito = [];
                        guardarCarritoEnCookie();
                        window.location.href = `/recibo.html?compra=${id}`;
                    })
                    .catch(err => { console.error('Error compra:', err); alert('Error al procesar la compra.'); });
                })
                .catch(err => { console.error('Error validando fondos:', err); alert('No se pudo verificar fondos.'); });
        })
        .catch(err => { console.error('Error session check:', err); alert('Error al verificar sesión.'); });
}

// Inicio: preferir carritoManager si ya existe, sino leer cookies
(function init() {
    if (typeof carritoManager != 'undefined' && Array.isArray(carritoManager.carrito)) {
        sincronizarDesdeCarritoManager();
    } else {
        carrito = obtenerCarritoDeCookies();
    }
    // Mostrar inicialmente si el DOM ya cargó; si no, esperar DOMContentLoaded
    if (document.readyState == 'loading') {
        document.addEventListener('DOMContentLoaded', () => { mostrarCarritoEnPagina(); cargarFondosUsuario(); });
    } else {
        mostrarCarritoEnPagina(); cargarFondosUsuario();
    }
})();
