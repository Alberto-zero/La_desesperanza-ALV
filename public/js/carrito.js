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
                const itemExistente = this.carrito.find(item => item.id == producto.id_producto);
        
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
            while (cookie.charAt(0) == ' ') {
                cookie = cookie.substring(1);
            }
            if (cookie.indexOf(cookieName) == 0) {
                return cookie.substring(cookieName.length, cookie.length);
            }
        }
        return "";
    }


    // Actualizar la cantidad de un producto
    actualizarCantidad(idProducto, nuevaCantidad) {
        const cantidad = parseInt(nuevaCantidad);
        if (cantidad <= 0) {
            this.eliminarProducto(idProducto);
            return;
        }

        const item = this.carrito.find(item => item.id == idProducto);
        if (item) {
            item.cantidad = cantidad;
            this.guardarCarrito();
            this.actualizarIconoCarrito();
        }
    }
}

// Crear instancia global del carrito
const carritoManager = new CarritoManager();

// Inicializar el contador del carrito cuando el documento está listo
document.addEventListener('DOMContentLoaded', () => {
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
}, { once: true });