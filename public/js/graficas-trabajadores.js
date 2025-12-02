
document.addEventListener('DOMContentLoaded', async () => {
    try {
        console.log('DOMContentLoaded - iniciando carga de gráficas');
        const datosGraficas = await obtenerDatosGraficas();
        console.log('Datos obtenidos:', datosGraficas);
        inicializarGraficas(datosGraficas);
    } catch (error) {
        console.error('Error al cargar datos de gráficas:', error);
    }
});

/**
 * Obtiene los datos necesarios para las gráficas del servidor
 */
async function obtenerDatosGraficas() {
    try {
        console.log('Solicitando datos a /api/graficas-datos');
        // Hacer petición al servidor para obtener datos de ventas
        const response = await fetch('/api/graficas-datos');
        
        console.log('Respuesta recibida:', response.status);
        
        if (!response.ok) {
            const errorData = await response.text();
            console.error('Error en respuesta:', errorData);
            throw new Error(`Error HTTP ${response.status}: ${errorData}`);
        }
        
        const datos = await response.json();
        console.log('Datos parseados correctamente');
        // Si el servidor incluye un mensaje, mostrarlo como alert adicional
        if (datos) {
            if (typeof datos.alert === 'string' && datos.alert.trim() !== '') {
                try { alert(datos.alert); } catch (e) { console.log('No se pudo mostrar alert:', e); }
            } else if (typeof datos.message === 'string' && datos.message.trim() !== '') {
                try { alert(datos.message); } catch (e) { console.log('No se pudo mostrar alert:', e); }
            }
        }
        return datos;
    } catch (error) {
        console.error('Error en obtenerDatosGraficas:', error);
        console.log('Usando datos simulados como fallback');
        // Retornar datos simulados para demostración
        return generarDatosSimulados();
    }
}

/**
 * Genera datos simulados para las gráficas (para desarrollo/demostración)
 */
f

/**
 * Inicializa todas las gráficas con los datos proporcionados
 */
function inicializarGraficas(datos) {
    // Gráfica 1: Productos más vendidos (Bar Chart)
    crearGraficaProductosMasVendidos(datos.productosMasVendidos);
    
    // Gráfica 2: Usuarios que más han comprado (Bar Chart)
    crearGraficaUsuariosTopCompras(datos.usuariosTopCompras);
    
    // Gráfica 3: Ingresos semanales (Line Chart)
    crearGraficaIngresosSemanales(datos.ingresosSemanales);
    
    // Gráfica 4: Distribución de categorías (Doughnut Chart)
    crearGraficaDistribucionCategorias(datos.distribucionCategorias);
}

/**
 * Crea la gráfica de productos más vendidos
 */
function crearGraficaProductosMasVendidos(datos) {
    const ctx = document.getElementById('chartProductosMasVendidos').getContext('2d');
    
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: datos.labels,
            datasets: [{
                label: 'Cantidad vendida',
                data: datos.datos,
                backgroundColor: [
                    '#FF6384',
                    '#36A2EB',
                    '#FFCE56',
                    '#4BC0C0',
                    '#9966FF'
                ],
                borderColor: [
                    '#FF6384',
                    '#36A2EB',
                    '#FFCE56',
                    '#4BC0C0',
                    '#9966FF'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: 'y',
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                }
            },
            scales: {
                x: {
                    beginAtZero: true
                }
            }
        }
    });
}

/**
 * Crea la gráfica de usuarios que más han comprado
 */
function crearGraficaUsuariosTopCompras(datos) {
    const ctx = document.getElementById('chartUsuariosTopCompras').getContext('2d');
    
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: datos.labels,
            datasets: [{
                label: 'Compras realizadas',
                data: datos.datos,
                backgroundColor: [
                    '#28A745',
                    '#20C997',
                    '#17A2B8',
                    '#007BFF',
                    '#6610F2'
                ],
                borderColor: [
                    '#28A745',
                    '#20C997',
                    '#17A2B8',
                    '#007BFF',
                    '#6610F2'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: 'y',
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                }
            },
            scales: {
                x: {
                    beginAtZero: true
                }
            }
        }
    });
}

/**
 * Crea la gráfica de ingresos semanales
 */
function crearGraficaIngresosSemanales(datos) {
    const ctx = document.getElementById('chartIngresosSemanales').getContext('2d');
    
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: datos.labels,
            datasets: [{
                label: 'Ingresos ($)',
                data: datos.datos,
                borderColor: '#007BFF',
                backgroundColor: 'rgba(0, 123, 255, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#007BFF',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: 5,
                pointHoverRadius: 7
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return '$' + value;
                        }
                    }
                }
            }
        }
    });
}

/**
 * Crea la gráfica de distribución de categorías
 */
function crearGraficaDistribucionCategorias(datos) {
    const ctx = document.getElementById('chartDistribucionCategorias').getContext('2d');
    
    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: datos.labels,
            datasets: [{
                data: datos.datos,
                backgroundColor: [
                    '#FF6384',
                    '#36A2EB',
                    '#FFCE56',
                    '#4BC0C0',
                    '#9966FF'
                ],
                borderColor: '#fff',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'right'
                }
            }
        }
    });
}
