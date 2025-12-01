// Función para actualizar el menú de usuario
function actualizarMenuUsuario() {
    fetch('/checkSession')
        .then(response => response.json())
        .then(data => {
            const userDropdownMenu = document.querySelector('[aria-labelledby="userDropdown"]');
            const adminNavItems = document.getElementById('adminNavItems');

            if (data.authenticated) {
                let menuHtml = `
                    <li><span class="dropdown-item-text">Hola, ${data.user.nombre}</span></li>
                    <li><hr class="dropdown-divider"></li>
                    <li><a class="dropdown-item" href="perfil.html"><i class="bi bi-person-circle"></i> Mi perfil</a></li>
                    <li><a class="dropdown-item" href="historial-compras.html"><i class="bi bi-clock-history"></i> Mis compras</a></li>
                `;

                // Agregar opción de administrador si es trabajador
                if (data.user.sesion == 1) {
                    menuHtml += `<li><a class="dropdown-item" href="trabajores.html"><i class="bi bi-tools"></i> Panel de administrador</a></li>`;
                }

                menuHtml += `
                    <li><hr class="dropdown-divider"></li>
                    <li><a class="dropdown-item" href="#" onclick="cerrarSesion(event)"><i class="bi bi-box-arrow-left"></i> Cerrar sesión</a></li>
                `;

                userDropdownMenu.innerHTML = menuHtml;
                
                // Crear enlaces de administrador solo si el usuario tiene los permisos
                if (data.user.sesion == 1) {
                    if (adminNavItems) {
                        adminNavItems.innerHTML = `
                            <li class="nav-item">
                                <a class="nav-link text-light" href="trabajores.html">Trabajadores</a>
                            </li>
                        `;
                    }
                    // Soporte para páginas que usan el id 'trabajadoresLink'
                    const trabajadoresLink = document.getElementById('trabajadoresLink');
                    if (trabajadoresLink) trabajadoresLink.style.display = '';
                } else {
                    if (adminNavItems) adminNavItems.innerHTML = '';
                    const trabajadoresLink = document.getElementById('trabajadoresLink');
                    if (trabajadoresLink) trabajadoresLink.style.display = 'none';
                }
            } else {
                userDropdownMenu.innerHTML = `
                    <li><a class="dropdown-item" href="sign.html">Registrarse</a></li>
                    <li><a class="dropdown-item" href="login.html">Iniciar sesión</a></li>
                `;
                if (adminNavItems) adminNavItems.innerHTML = ''; // Asegurar que no haya enlaces de admin sin sesión
                const trabajadoresLink = document.getElementById('trabajadoresLink');
                if (trabajadoresLink) trabajadoresLink.style.display = 'none';
            }
        })
        .catch(error => {
            console.error('Error:', error);
        });
}

// Verificar la sesión del usuario
function verificarSesion() {
    fetch('/checkSession')
        .then(response => {
            if (!response.ok) throw new Error('Error al verificar sesión');
            return response.json();
        })
        .then(data => {
            // Actualizar el menú de usuario en todas las páginas
            actualizarMenuUsuario();

            const restrictedPages = ['/trabajores.html', '/añadir.html', '/editar.html'];
            const restrictedToUsersPages = ['/carrito-compras.html', '/historial-compras.html', '/recibo.html', '/perfil.html'];
            const currentPath = window.location.pathname;

            // Si estamos en una página solo para administradores
            if (restrictedPages.includes(currentPath)) {
                if (!data.authenticated) {
                    window.location.href = '/login.html';
                    return;
                }
                if (data.user.sesion != 1) {
                    alert('No tienes permiso para acceder a esta página.');
                    window.location.href = '/index.html';
                    return;
                }
            }

            // Si estamos en una página que requiere sesión
            if (restrictedToUsersPages.includes(currentPath)) {
                if (!data.authenticated) {
                    window.location.href = '/login.html';
                    return;
                }
            }

            // Si estamos en login y ya estamos autenticados
            if (currentPath === '/login.html' && data.authenticated) {
                window.location.href = '/index.html';
                return;
            }

            // Si estamos en sign.html y ya estamos autenticados
            if (currentPath === '/sign.html' && data.authenticated) {
                window.location.href = '/index.html';
                return;
            }
        })
        .catch(error => {
            console.error('Error al verificar sesión:', error);
            // No mostrar alerta, simplemente continuar
        });
}

// Cerrar sesión
function cerrarSesion(event) {
    if (event) {
        event.preventDefault();
    }
    fetch('/logout', {
        method: 'GET',
        credentials: 'same-origin'
    })
    .then(response => {
        if (response.ok) {
            window.location.href = '/index.html';
        } else {
            throw new Error('Error al cerrar sesión');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Error al cerrar sesión. Por favor intenta de nuevo.');
    });
}



// Verificar sesión cuando se carga la página
document.addEventListener('DOMContentLoaded', verificarSesion);