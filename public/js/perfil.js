// Cargar datos del perfil cuando se carga la página
document.addEventListener('DOMContentLoaded', () => {
    cargarDatosUsuario();
    cargarFondos();
});

function cargarDatosUsuario() {
    fetch('/getUsuarioActual')
        .then(response => {
            if (!response.ok) throw new Error('Error al obtener datos');
            return response.json();
        })
        .then(data => {
            document.getElementById('nombre').value = data.nombre || '';
            document.getElementById('email').value = data.email || '';
            document.getElementById('apellido_paterno').value = data.apellido_paterno || '';
            document.getElementById('apellido_materno').value = data.apellido_materno || '';
            document.getElementById('direccion').value = data.direccion || '';
        })
        .catch(error => {
            console.error('Error:', error);
            mostrarMensaje('mensajePerfil', 'Error al cargar datos del usuario', 'danger');
        });
}

function cargarFondos() {
    fetch('/getFondos')
        .then(response => {
            if (!response.ok) throw new Error('Error al obtener fondos');
            return response.json();
        })
        .then(data => {
            document.getElementById('saldoFondos').textContent = '$' + parseFloat(data.fondos).toFixed(2);
        })
        .catch(error => {
            console.error('Error:', error);
        });
}

function agregarFondos() {
    const cantidad = parseFloat(document.getElementById('cantidad').value);

    if (!cantidad || cantidad <= 0) {
        mostrarMensaje('mensajeFondos', 'Por favor ingresa una cantidad válida', 'danger');
        return;
    }

    fetch('/agregarFondos', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: `cantidad=${cantidad}`
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            mostrarMensaje('mensajeFondos', data.error, 'danger');
        } else {
            mostrarMensaje('mensajeFondos', `¡Se agregaron $${cantidad.toFixed(2)} correctamente!`, 'success');
            document.getElementById('cantidad').value = '';
            cargarFondos();
        }
    })
    .catch(error => {
        console.error('Error:', error);
        mostrarMensaje('mensajeFondos', 'Error al agregar fondos', 'danger');
    });
}

function actualizarPerfil() {
    const nombre = document.getElementById('nombre').value;
    const email = document.getElementById('email').value;
    const apellido_paterno = document.getElementById('apellido_paterno').value;
    const apellido_materno = document.getElementById('apellido_materno').value;
    const direccion = document.getElementById('direccion').value;

    if (!nombre || !email || !apellido_paterno || !apellido_materno || !direccion) {
        mostrarMensaje('mensajePerfil', 'Todos los campos son requeridos', 'danger');
        return;
    }

    const datos = new URLSearchParams();
    datos.append('nombre', nombre);
    datos.append('email', email);
    datos.append('apellido_paterno', apellido_paterno);
    datos.append('apellido_materno', apellido_materno);
    datos.append('direccion', direccion);

    fetch('/updateUsuarioPerfil', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: datos.toString()
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            mostrarMensaje('mensajePerfil', data.error, 'danger');
        } else {
            mostrarMensaje('mensajePerfil', 'Datos actualizados correctamente', 'success');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        mostrarMensaje('mensajePerfil', 'Error al actualizar datos', 'danger');
    });
}

function cambiarContrasena() {
    const contrasena_actual = document.getElementById('contrasena_actual').value;
    const contrasena_nueva = document.getElementById('contrasena_nueva').value;
    const contrasena_confirmar = document.getElementById('contrasena_confirmar').value;

    if (!contrasena_actual || !contrasena_nueva || !contrasena_confirmar) {
        mostrarMensaje('mensajeContrasena', 'Todos los campos son requeridos', 'danger');
        return;
    }

    if (contrasena_nueva.length < 8) {
        mostrarMensaje('mensajeContrasena', 'La contraseña debe tener al menos 8 caracteres', 'danger');
        return;
    }

    if (contrasena_nueva !== contrasena_confirmar) {
        mostrarMensaje('mensajeContrasena', 'Las contraseñas no coinciden', 'danger');
        return;
    }

    const datos = new URLSearchParams();
    datos.append('contrasena_actual', contrasena_actual);
    datos.append('contrasena_nueva', contrasena_nueva);
    datos.append('contrasena_confirmar', contrasena_confirmar);

    fetch('/cambiarContrasena', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: datos.toString()
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            mostrarMensaje('mensajeContrasena', data.error, 'danger');
        } else {
            mostrarMensaje('mensajeContrasena', 'Contraseña cambiada correctamente', 'success');
            document.getElementById('formContrasena').reset();
        }
    })
    .catch(error => {
        console.error('Error:', error);
        mostrarMensaje('mensajeContrasena', 'Error al cambiar contraseña', 'danger');
    });
}

function mostrarMensaje(elementId, mensaje, tipo) {
    const elemento = document.getElementById(elementId);
    elemento.innerHTML = `<div class="alert alert-${tipo} alert-dismissible fade show" role="alert">
        ${mensaje}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    </div>`;
}
