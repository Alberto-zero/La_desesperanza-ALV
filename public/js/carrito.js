// Clase para manejar el carrito usando cookies
class CarritoManager {
    constructor() {
        this.carrito = this.obtenerCarrito();
    }

    // Obtener el carrito desde las cookies
    obtenerCarrito() {
        const carritoStr = this.getCookie('carrito');
        return carritoStr ? JSON.parse(carritoStr) : [];
    }

    // Guardar el carrito en las cookies
    guardarCarrito() {
        this.setCookie('carrito', JSON.stringify(this.carrito), 7); // Guarda por 7 días
    }

    agregarProducto(producto, cantidad = 1) {
        fetch('/checkSession')
        .then(response => response.json())
        .then(data => {
            if (data.authenticated) {
                const itemExistente = this.carrito.find(item => item.id === producto.id_producto);
        
                if (itemExistente) {
                    itemExistente.cantidad += cantidad;
                } else {
                    this.carrito.push({
                        id: producto.id_producto,
                        nombre: producto.nombre,
                        precio: producto.precio,
                        cantidad: cantidad
                    });
                }
                
                this.guardarCarrito();
                this.actualizarIconoCarrito();
                this.mostrarNotificacion('Producto agregado al carrito');
            } else {
                alert('Debes iniciar sesión para agregar productos al carrito.');
            }
        })
        
    }

    // Eliminar un producto del carrito
    eliminarProducto(idProducto) {
        this.carrito = this.carrito.filter(item => item.id !== idProducto);
        this.guardarCarrito();
        this.actualizarIconoCarrito();
        this.mostrarNotificacion('Producto eliminado del carrito');
        return this.carrito;
    }

    // Calcular el total del carrito
    calcularTotal() {
        return this.carrito.reduce((total, item) => total + (item.precio * item.cantidad), 0);
    }

    // Limpiar el carrito
    limpiarCarrito() {
        this.carrito = [];
        this.guardarCarrito();
        this.actualizarIconoCarrito();
    }

    // Actualizar el ícono del carrito con la cantidad de items
    actualizarIconoCarrito() {
        const cantidadTotal = this.carrito.reduce((total, item) => total + item.cantidad, 0);
        const iconoCarrito = document.querySelector('.bi-basket3');
        if (iconoCarrito) {
            if (cantidadTotal > 0) {
                iconoCarrito.setAttribute('data-count', cantidadTotal);
                iconoCarrito.classList.add('has-items');
            } else {
                iconoCarrito.removeAttribute('data-count');
                iconoCarrito.classList.remove('has-items');
            }
        }
    }

    // Mostrar una notificación temporal
    mostrarNotificacion(mensaje) {
        const notificacion = document.createElement('div');
        notificacion.className = 'notificacion';
        notificacion.textContent = mensaje;
        document.body.appendChild(notificacion);

        setTimeout(() => {
            notificacion.classList.add('fade-out');
            setTimeout(() => {
                document.body.removeChild(notificacion);
            }, 300);
        }, 2000);
    }

    // Funciones auxiliares para manejo de cookies
    setCookie(nombre, valor, dias) {
        const fecha = new Date();
        fecha.setTime(fecha.getTime() + (dias * 24 * 60 * 60 * 1000));
        const expires = "expires=" + fecha.toUTCString();
        document.cookie = nombre + "=" + valor + ";" + expires + ";path=/";
    }

    getCookie(nombre) {
        const cookieName = nombre + "=";
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            let cookie = cookies[i];
            while (cookie.charAt(0) === ' ') {
                cookie = cookie.substring(1);
            }
            if (cookie.indexOf(cookieName) === 0) {
                return cookie.substring(cookieName.length, cookie.length);
            }
        }
        return "";
    }


    // Mostrar el contenido del carrito en un modal
    mostrarCarrito() {
        let modalHtml = `
        <div class="modal fade" id="carritoModal" tabindex="-1" aria-labelledby="carritoModalLabel" aria-hidden="true">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header bg-light">
                        <h5 class="modal-title" id="carritoModalLabel">Tu carrito</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body p-4">
                        ${this.carrito.length === 0 ? 
                            '<div class="text-center py-4"><p class="text-muted">Tu carrito está vacío</p></div>' : 
                            `<div class="table-responsive">
                                <table class="table align-middle">
                                    <thead class="table-light">
                                        <tr>
                                            <th class="text-start">Producto</th>
                                            <th class="text-center">Cantidad</th>
                                            <th class="text-end">Precio</th>
                                            <th class="text-end">Total</th>
                                            <th class="text-end">Acción</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${this.carrito.map(item => `
                                            <tr>
                                                <td class="text-start">${item.nombre}</td>
                                                <td class="text-center" style="width: 150px;">
                                                    <div class="input-group input-group-sm">
                                                        <button class="btn btn-outline-secondary" type="button" 
                                                            onclick="carritoManager.actualizarCantidad(${item.id}, ${item.cantidad - 1})">
                                                            <i class="bi bi-dash"></i>
                                                        </button>
                                                        <input type="number" class="form-control text-center" value="${item.cantidad}"
                                                            onchange="carritoManager.actualizarCantidad(${item.id}, this.value)">
                                                        <button class="btn btn-outline-secondary" type="button"
                                                            onclick="carritoManager.actualizarCantidad(${item.id}, ${item.cantidad + 1})">
                                                            <i class="bi bi-plus"></i>
                                                        </button>
                                                    </div>
                                                </td>
                                                <td class="text-end">$${item.precio.toFixed(2)}</td>
                                                <td class="text-end">$${(item.precio * item.cantidad).toFixed(2)}</td>
                                                <td class="text-end">
                                                    <button class="btn btn-danger btn-sm" 
                                                        onclick="carritoManager.eliminarProducto(${item.id})">
                                                        Eliminar
                                                    </button>
                                                </td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            </div>
                            <div class="row mt-4">
                                <div class="col-md-6 offset-md-6">
                                    <table class="table table-sm">
                                        <tr>
                                            <td class="text-end border-0"><strong>Total:</strong></td>
                                            <td class="text-end border-0"><strong>$${this.calcularTotal().toFixed(2)}</strong></td>
                                        </tr>
                                    </table>
                                </div>
                            </div>`
                        }
                    </div>
                    <div class="modal-footer justify-content-between">
                        <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">
                            <i class="bi bi-arrow-left me-2"></i>Seguir comprando
                        </button>
                        ${this.carrito.length > 0 ? 
                            `<button type="button" class="btn btn-success" onclick="carritoManager.procesarCompra()">
                                Finalizar compra<i class="bi bi-arrow-right ms-2"></i>
                            </button>` : ''}
                    </div>
                </div>
            </div>
        </div>`;

        // Eliminar modal anterior si existe
        const modalAnterior = document.getElementById('carritoModal');
        if (modalAnterior) {
            modalAnterior.remove();
        }

        // Añadir el nuevo modal al documento
        document.body.insertAdjacentHTML('beforeend', modalHtml);

        // Mostrar el modal
        const modal = new bootstrap.Modal(document.getElementById('carritoModal'));
        modal.show();
    }

    // Actualizar la cantidad de un producto
    actualizarCantidad(idProducto, nuevaCantidad) {
        const cantidad = parseInt(nuevaCantidad);
        if (cantidad <= 0) return;

        const item = this.carrito.find(item => item.id === idProducto);
        if (item) {
            item.cantidad = cantidad;
            this.guardarCarrito();
            this.actualizarIconoCarrito();
            
            // Actualizar solo el contenido del modal sin recrearlo
            const modalBody = document.querySelector('#carritoModal .modal-body');
            if (modalBody) {
                const total = this.calcularTotal();
                const tbody = modalBody.querySelector('tbody');
                if (tbody) {
                    const row = tbody.querySelector(`tr[data-producto-id="${idProducto}"]`);
                    if (row) {
                        const subtotal = item.precio * cantidad;
                        row.querySelector('td:nth-child(4)').textContent = `$${subtotal.toFixed(2)}`;
                    }
                }
                const totalElement = modalBody.querySelector('.total-carrito');
                if (totalElement) {
                    totalElement.textContent = `$${total.toFixed(2)}`;
                }
            }
        }
    }

    // Procesar la compra
    procesarCompra() {
        // Aquí puedes agregar la lógica para procesar la compra
        // Por ahora solo mostraremos un mensaje y limpiaremos el carrito
        alert('¡Gracias por tu compra!');
        this.limpiarCarrito();
        bootstrap.Modal.getInstance(document.getElementById('carritoModal')).hide();
    }
}

// Crear instancia global del carrito
const carritoManager = new CarritoManager();

// Configurar el evento click del ícono del carrito
document.addEventListener('DOMContentLoaded', () => {
    const carritoBtn = document.getElementById('carritoBtn');
    if (carritoBtn) {
        carritoBtn.addEventListener('click', (e) => {
            e.preventDefault();
            carritoManager.mostrarCarrito();
        });
    }
    
    // Inicializar el contador del carrito
    carritoManager.actualizarIconoCarrito();

    // Agregar efecto hover al ícono
    const iconoCarrito = document.getElementById('carritoIcon');
    if (iconoCarrito) {
        iconoCarrito.style.cursor = 'pointer';
        // Actualizar el contador inicial
        const itemsEnCarrito = carritoManager.carrito.reduce((total, item) => total + item.cantidad, 0);
        if (itemsEnCarrito > 0) {
            iconoCarrito.setAttribute('data-count', itemsEnCarrito);
            iconoCarrito.classList.add('has-items');
        }
    }
});