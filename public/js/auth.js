// Función para actualizar el menú de usuario
function actualizarMenuUsuario() {
    fetch('/checkSession')
        .then(response => response.json())
        .then(data => {
            const userDropdownMenu = document.querySelector('[aria-labelledby="userDropdown"]');
            const adminNavItems = document.getElementById('adminNavItems');

            if (data.authenticated) {
                userDropdownMenu.innerHTML = `
                    <li><span class="dropdown-item-text">Hola, ${data.user.nombre}</span></li>
                    <li><hr class="dropdown-divider"></li>
                    <li><a class="dropdown-item" href="#" onclick="cerrarSesion()">Cerrar sesión</a></li>
                `;
                
                // Crear enlaces de administrador solo si el usuario tiene los permisos
                if (data.user.sesion === 1 && adminNavItems) {
                    adminNavItems.innerHTML = `
                        <li class="nav-item">
                            <a class="nav-link text-light" href="trabajores.html">Trabajadores</a>
                        </li>
                    `;
                } else if (adminNavItems) {
                    adminNavItems.innerHTML = ''; // Eliminar enlaces si no tiene permisos
                }
            } else {
                userDropdownMenu.innerHTML = `
                    <li><a class="dropdown-item" href="sign.html">Registrarse</a></li>
                    <li><a class="dropdown-item" href="login.html">Iniciar sesión</a></li>
                `;
                if (adminNavItems) {
                    adminNavItems.innerHTML = ''; // Asegurar que no haya enlaces de admin sin sesión
                }
            }
        })
        .catch(error => {
            console.error('Error:', error);
        });
}

// Verificar la sesión del usuario
function verificarSesion() {
    fetch('/checkSession')
        .then(response => response.json())
        .then(data => {
            // Actualizar el menú de usuario en todas las páginas
            actualizarMenuUsuario();

            const restrictedPages = ['/trabajores.html', '/añadir.html', '/editar.html'];
            const currentPath = window.location.pathname;

            // Si estamos en una página restringida
            if (restrictedPages.includes(currentPath)) {
                if (!data.authenticated) {
                    window.location.href = '/login.html';
                    return;
                }
                if (data.user.sesion !== 1) {
                    
                    return alert('No tienes permiso para acceder a esta página.');
                }
            }


            // Si estamos en login y ya estamos autenticados
            if (currentPath === '/login.html' && data.authenticated) {
                window.location.href = '/index.html';
                return;
            }

            // Si estamos en login.html y ya estamos autenticados
            if (currentPath === '/login.html' && data.authenticated) {
                window.location.href = '/index.html';
                return;
            }
        })
        .catch(error => {
            console.error('Error:', error);
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