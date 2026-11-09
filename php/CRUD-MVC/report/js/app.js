// ============================================
// CONFIGURACIÓN
// ============================================
const CONFIG = {
    contactosFile: 'master_contactos.csv',
    campanasFile: 'campanas/index.csv',
};

// ============================================
// ESTADO GLOBAL
// ============================================
const estado = {
    contactos: [],
    campanas: [],
    campanaSeleccionada: null,
    datosCruzados: null,
    graficas: []
};

// ============================================
// FUNCIONES DE CARGA Y PARSEO CSV
// ============================================

function actualizarStatus(mensaje, isError = false) {
    const statusEl = document.getElementById('statusMessage');
    if (statusEl) {
        statusEl.textContent = mensaje;
        statusEl.style.color = isError ? '#c53030' : '#2d3748';
    }
}

function mostrarError(mensaje) {
    const container = document.getElementById('errorContainer');
    const msgEl = document.getElementById('errorMessage');
    if (container && msgEl) {
        container.style.display = 'block';
        msgEl.textContent = mensaje;
    }
    actualizarStatus('❌ Error', true);
}

function ocultarError() {
    const container = document.getElementById('errorContainer');
    if (container) {
        container.style.display = 'none';
    }
}

async function cargarCSV(url) {
    try {
        console.log(`📥 Cargando: ./data/${url}`);
        const response = await fetch(`./data/${url}`);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const text = await response.text();
        if (text.trim() === '') {
            throw new Error('El archivo está vacío');
        }
        
        const data = parseCSV(text);
        console.log(`✅ ${data.length} registros cargados de ${url}`);
        return data;
    } catch (error) {
        console.error(`❌ Error cargando ${url}:`, error.message);
        mostrarError(`No se pudo cargar ${url}: ${error.message}`);
        return null;
    }
}

function parseCSV(text) {
    const lines = text.split('\n').filter(line => line.trim() !== '');
    if (lines.length === 0) return [];

    const headers = lines[0].split(',').map(h => h.trim());
    const data = [];

    for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        if (values.length === 0 || values.every(v => v === '')) continue;

        const obj = {};
        headers.forEach((header, index) => {
            obj[header] = values[index] || '';
        });
        data.push(obj);
    }

    return data;
}

function parseCSVLine(line) {
    const values = [];
    let current = '';
    let inQuotes = false;

    for (let char of line) {
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            values.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    values.push(current.trim());
    return values;
}

// ============================================
// CARGA DE DATOS DESDE CSV
// ============================================

async function cargarDatos() {
    console.log('📋 Cargando datos desde CSV...');
    actualizarStatus('📋 Cargando datos...');

    // 1. Cargar contactos
    const contactosData = await cargarCSV(CONFIG.contactosFile);
    if (!contactosData || contactosData.length === 0) {
        mostrarError(`❌ No se pudo cargar ${CONFIG.contactosFile}`);
        return false;
    }
    estado.contactos = contactosData;
    console.log(`✅ ${estado.contactos.length} contactos cargados`);

    // 2. Cargar campañas
    const indexData = await cargarCSV(CONFIG.campanasFile);
    if (!indexData || indexData.length === 0) {
        mostrarError(`❌ No se pudo cargar ${CONFIG.campanasFile}`);
        return false;
    }

    estado.campanas = indexData.map(row => ({
        nombre: row.Nombre || 'Sin nombre',
        fecha: row.Fecha || 'Sin fecha',
        archivo: row.Archivo || '',
        hora_envio: row.Hora_Envio || '--:--:--'
    }));
    console.log(`✅ ${estado.campanas.length} campañas cargadas`);

    // 3. Actualizar selector
    actualizarSelectorCampanas();

    // 4. Ocultar error si todo salió bien
    ocultarError();
    actualizarStatus(`✅ ${estado.contactos.length} contactos, ${estado.campanas.length} campañas`);

    return true;
}

function actualizarSelectorCampanas() {
    const select = document.getElementById('campaignSelect');
    select.innerHTML = '<option value="">📋 Selecciona una campaña...</option>';
    
    estado.campanas.forEach((campana, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = `${campana.fecha} - ${campana.nombre}`;
        select.appendChild(option);
    });
    
    if (estado.campanas.length > 0) {
        select.value = '0';
    }
    console.log('✅ Selector actualizado');
}

// ============================================
// GENERACIÓN DEL INFORME - NUEVA LÓGICA
// ============================================

async function generarInforme(index) {
    ocultarError();
    
    if (index === '' || index === null || index === undefined) {
        mostrarError('⚠️ Por favor, selecciona una campaña');
        return;
    }

    const campana = estado.campanas[index];
    if (!campana) {
        mostrarError('❌ Campaña no encontrada');
        return;
    }

    if (!campana.archivo) {
        mostrarError(`❌ La campaña "${campana.nombre}" no tiene archivo asociado`);
        return;
    }

    estado.campanaSeleccionada = campana;
    console.log(`🚀 Generando informe para: ${campana.nombre}`);
    actualizarStatus(`🚀 Generando: ${campana.nombre}...`);

    try {
        // 1. Cargar datos de la campaña (contactos que tuvieron interacción)
        const campanaData = await cargarCSV(`campanas/${campana.archivo}`);
        if (!campanaData || campanaData.length === 0) {
            mostrarError(`❌ No se pudo cargar el archivo: ${campana.archivo}`);
            return;
        }
        console.log(`✅ ${campanaData.length} registros de campaña cargados`);

        // 2. CRUCE DE DATOS: TODOS los contactos vs datos de campaña
        console.log('🔗 Cruzando datos: 100% contactos vs campaña...');
        const datosCruzados = cruzarDatosCompleto(estado.contactos, campanaData);
        estado.datosCruzados = datosCruzados;
        console.log(`✅ ${datosCruzados.length} registros procesados (100% de contactos)`);

        // 3. Calcular métricas
        console.log('📊 Calculando métricas...');
        const metricas = calcularMetricas(datosCruzados);
        console.log('✅ Métricas calculadas:', metricas);

        // 4. Actualizar UI
        console.log('🎨 Actualizando interfaz...');
        actualizarUI(campana, metricas, datosCruzados);

        // 5. Dibujar gráficas
        console.log('📉 Dibujando gráficas...');
        dibujarGraficas(metricas, datosCruzados);

        // 6. Mostrar módulos
        mostrarModulos();

        actualizarStatus(`✅ Informe generado: ${campana.nombre}`);
        console.log('✅ Informe generado correctamente!');
    } catch (error) {
        console.error('❌ Error generando informe:', error);
        mostrarError(`Error al generar el informe: ${error.message}`);
    }
}

// ============================================
// CRUCE DE DATOS - NUEVA LÓGICA
// ============================================

/**
 * Cruza TODOS los contactos (100%) con los datos de campaña
 * - Contactos en campaña → toman el estado de la campaña
 * - Contactos NO en campaña → estado = "sent" (enviado sin interacción)
 */
function cruzarDatosCompleto(contactos, campanaData) {
    // 1. Crear mapa de campaña por email
    const mapaCampana = {};
    campanaData.forEach(row => {
         const email = normalizarEmail(row.Email);
        if (email) {
            mapaCampana[email] = {
                sent_at: row['Sent At'] || '',
                status: row.Status || 'sent',
                bounce_reason: row['Bounce Reason'] || '',
                unsubscribed_at: row['Unsubscribed At'] || '',
                opened_at: row['Opened At'] || '',
                clicked_at: row['Clicked At'] || ''
            };
        }
    });

    console.log(`📋 ${Object.keys(mapaCampana).length} contactos encontrados en la campaña`);

    // 2. Procesar TODOS los contactos
    const resultado = [];
    contactos.forEach(contacto => {
        const email = (contacto.Email || '').toLowerCase().trim();
        if (!email) return;

        // Buscar si el contacto está en la campaña
        const datosCampana = mapaCampana[email] || null;

        // Determinar estado final
        let estadoFinal = 'sent'; // Por defecto: enviado sin interacción
        let sent_at = '';
        let bounce_reason = '';
        let unsubscribed_at = '';
        let opened_at = '';
        let clicked_at = '';

        if (datosCampana) {
            // El contacto está en la campaña
            sent_at = datosCampana.sent_at;
            bounce_reason = datosCampana.bounce_reason;
            unsubscribed_at = datosCampana.unsubscribed_at;
            opened_at = datosCampana.opened_at;
            clicked_at = datosCampana.clicked_at;

            // Determinar estado según prioridad
            if (unsubscribed_at && unsubscribed_at !== '-' && unsubscribed_at !== '') {
                estadoFinal = 'unsubscribed';
            } else if (clicked_at && clicked_at !== '-' && clicked_at !== '') {
                estadoFinal = 'clicked';
            } else if (opened_at && opened_at !== '-' && opened_at !== '') {
                estadoFinal = 'opened';
            } else if (datosCampana.status && datosCampana.status.toLowerCase() === 'bounced') {
                estadoFinal = 'bounced';
            } else if (datosCampana.status && datosCampana.status.toLowerCase() === 'delivered') {
                estadoFinal = 'delivered';
            } else {
                estadoFinal = 'sent';
            }
        } else {
            // Contacto NO está en campaña → se considera "enviado" (sent)
            estadoFinal = 'sent';
            // Usar la hora de envío de la campaña (configurada en index.csv)
            // Se asignará en la UI
        }

        resultado.push({
            ...contacto,
            email: email,
            nombreCompleto: `${contacto.Name || ''} ${contacto.Surname || ''}`.trim() || 'Desconocido',
            sent_at: sent_at,
            status: datosCampana ? datosCampana.status : 'sent',
            bounce_reason: bounce_reason,
            unsubscribed_at: unsubscribed_at,
            opened_at: opened_at,
            clicked_at: clicked_at,
            estado_campana: estadoFinal,
            en_campana: !!datosCampana // true si está en la campaña
        });
    });

    // 3. Estadísticas del cruce
    const enCampana = resultado.filter(r => r.en_campana).length;
    const noEnCampana = resultado.filter(r => !r.en_campana).length;
    console.log(`📊 Cruce completado: ${enCampana} en campaña, ${noEnCampana} solo enviados`);

    return resultado;
}

// ============================================
// CÁLCULO DE MÉTRICAS
// ============================================

function calcularMetricas(datos) {
    const total = datos.length;
    let entregados = 0, rebotados = 0, abiertos = 0, clics = 0, cancelados = 0, soloEnviados = 0;
    const bounceReasons = {};

    datos.forEach(row => {
        switch(row.estado_campana) {
            case 'delivered': entregados++; break;
            case 'bounced': 
                rebotados++;
                const reason = row.bounce_reason || 'Sin especificar';
                bounceReasons[reason] = (bounceReasons[reason] || 0) + 1;
                break;
            case 'opened': abiertos++; break;
            case 'clicked': clics++; break;
            case 'unsubscribed': cancelados++; break;
            case 'sent': soloEnviados++; break;
        }
    });

    // Calcular tasas sobre el TOTAL de contactos
    const tasaEntrega = total > 0 ? ((entregados / total) * 100) : 0;
    const tasaRebote = total > 0 ? ((rebotados / total) * 100) : 0;
    const tasaApertura = total > 0 ? ((abiertos / total) * 100) : 0;
    const tasaClics = total > 0 ? ((clics / total) * 100) : 0;
    const tasaCancelacion = total > 0 ? ((cancelados / total) * 100) : 0;
    const tasaEnviados = total > 0 ? ((soloEnviados / total) * 100) : 0;

    return {
        total,
        entregados,
        rebotados,
        abiertos,
        clics,
        cancelados,
        soloEnviados,
        tasaEntrega: tasaEntrega.toFixed(1),
        tasaRebote: tasaRebote.toFixed(1),
        tasaApertura: tasaApertura.toFixed(1),
        tasaClics: tasaClics.toFixed(1),
        tasaCancelacion: tasaCancelacion.toFixed(1),
        tasaEnviados: tasaEnviados.toFixed(1),
        bounceReasons
    };
}

// ============================================
// ACTUALIZACIÓN DE UI
// ============================================

function actualizarUI(campana, metricas, datos) {
    document.getElementById('campaignNameDisplay').textContent = `📧 ${campana.nombre}`;
    document.getElementById('campaignDateDisplay').textContent = `📅 ${campana.fecha}`;
    document.getElementById('campaignTimeDisplay').textContent = `⏰ ${campana.hora_envio}`;

    // Actualizar KPI
    document.getElementById('totalEnviados').textContent = metricas.total;
    document.getElementById('totalEntregados').textContent = metricas.entregados;
    document.getElementById('totalRebotados').textContent = metricas.rebotados;
    document.getElementById('totalAbiertos').textContent = metricas.abiertos;
    document.getElementById('totalClics').textContent = metricas.clics;
    document.getElementById('totalCancelados').textContent = metricas.cancelados;

    // Actualizar tasas
    actualizarTasa('tasaEntrega', 'progressEntrega', metricas.tasaEntrega);
    actualizarTasa('tasaRebote', 'progressRebote', metricas.tasaRebote);
    actualizarTasa('tasaApertura', 'progressApertura', metricas.tasaApertura);
    actualizarTasa('tasaClics', 'progressClics', metricas.tasaClics);
    actualizarTasa('tasaCancelacion', 'progressCancelacion', metricas.tasaCancelacion);

    actualizarBounceAnalysis(metricas.bounceReasons);
    renderizarTabla(datos);
}

function actualizarTasa(textId, progressId, valor) {
    const el = document.getElementById(textId);
    const progress = document.getElementById(progressId);
    if (el) el.textContent = `${valor}%`;
    if (progress) {
        const numVal = parseFloat(valor);
        progress.style.width = `${Math.min(numVal, 100)}%`;
        if (numVal > 70) {
            progress.style.background = '#48bb78';
        } else if (numVal > 40) {
            progress.style.background = '#ed8936';
        } else {
            progress.style.background = '#fc8181';
        }
    }
}

function actualizarBounceAnalysis(bounceReasons) {
    const container = document.getElementById('bounceAnalysis');
    const reasons = Object.entries(bounceReasons);

    if (reasons.length === 0) {
        container.innerHTML = `<div class="no-data">✅ No se registraron rebotes en esta campaña</div>`;
        return;
    }

    let html = '<div class="bounce-grid">';
    reasons.forEach(([reason, count]) => {
        html += `
            <div class="bounce-card">
                <span class="reason">${reason}</span>
                <span class="count">${count} contactos</span>
            </div>
        `;
    });
    html += '</div>';
    container.innerHTML = html;
}
// ============================================
// DEPURACIÓN - TEMPORAL
// ============================================

function debugEmails() {
    console.log('📧 DEBUG: Verificando coincidencia de emails');
    
    // Tomar primeros 5 emails de contactos
    const contactosEmails = estado.contactos.slice(0, 5).map(c => c.Email);
    console.log('📧 Contactos (primeros 5):', contactosEmails);
    
    // Tomar primeros 5 emails de campaña
    const campanaData = estado.datosCruzados ? estado.datosCruzados.slice(0, 5) : [];
    const campanaEmails = campanaData.map(c => c.Email);
    console.log('📧 Campaña (primeros 5):', campanaEmails);
}
function normalizarEmail(email) {
    return (email || '').toLowerCase().trim().replace(/\s/g, '');
}

// ============================================
// RENDERIZADO DE TABLA - CORREGIDO
// ============================================

function renderizarTabla(datos) {
    const container = document.getElementById('tableContainer');
    
    if (!datos || datos.length === 0) {
        container.innerHTML = '<p style="padding: 20px; text-align: center; color: #718096;">No hay datos para mostrar</p>';
        document.getElementById('resultCount').textContent = '0 contactos';
        return;
    }

    // Obtener la hora de envío de la campaña actual
    const horaEnvio = estado.campanaSeleccionada ? estado.campanaSeleccionada.hora_envio : '--:--:--';

    let html = `
        <table class="table">
            <thead>
                <tr>
                    <th>Email</th>
                    <th>Nombre</th>
                    <th>Teléfono</th>
                    <th>Estado</th>
                    <th>En Campaña</th>
                    <th>Fecha Envío</th>
                    <th>Motivo Rebote</th>
                </tr>
            </thead>
            <tbody id="tablaBody">
    `;

    datos.forEach(row => {
        const statusClass = getStatusClass(row.estado_campana);
        const statusLabel = getStatusLabel(row.estado_campana);
        const enCampana = row.en_campana ? '✅ Sí' : '❌ No';
        // Usar la fecha de envío de la campaña o la del registro
        const fechaEnvio = row.sent_at || horaEnvio || '-';
        html += `
            <tr>
                <td>${row.Email || '-'}</td>
                <td>${row.nombreCompleto || '-'}</td>
                <td>${row.Phone || '-'}</td>
                <td><span class="badge ${statusClass}">${statusLabel}</span></td>
                <td>${enCampana}</td>
                <td>${fechaEnvio}</td>
                <td>${row.bounce_reason || '-'}</td>
            </tr>
        `;
    });

    html += `</tbody></table>`;
    container.innerHTML = html;
    document.getElementById('resultCount').textContent = `${datos.length} contactos totales`;
    filtrarTabla();
}

function getStatusClass(status) {
    const classes = {
        'delivered': 'badge-success',
        'bounced': 'badge-danger',
        'opened': 'badge-primary',
        'clicked': 'badge-info',
        'unsubscribed': 'badge-warning',
        'sent': 'badge-secondary'
    };
    return classes[status] || 'badge-secondary';
}

function getStatusLabel(status) {
    const labels = {
        'delivered': '✅ Entregado',
        'bounced': '❌ Rebote',
        'opened': '👁️ Abierto',
        'clicked': '🖱️ Click',
        'unsubscribed': '⛔ Cancelado',
        'sent': '📨 Enviado (sin interacción)'
    };
    return labels[status] || status;
}

function mostrarModulos() {
    document.getElementById('moduleKPI').style.display = 'block';
    document.getElementById('moduleRates').style.display = 'block';
    document.getElementById('moduleCharts').style.display = 'block';
    document.getElementById('moduleBounces').style.display = 'block';
    document.getElementById('moduleTable').style.display = 'block';
}

// ============================================
// GRÁFICAS
// ============================================

function dibujarGraficas(metricas, datos) {
    if (window.chartInstances) {
        window.chartInstances.forEach(chart => chart.destroy());
    }
    window.chartInstances = [];

    // 1. Embudo de Conversión
    const ctxFunnel = document.getElementById('funnelChart').getContext('2d');
    const chart1 = new Chart(ctxFunnel, {
        type: 'doughnut',
        data: {
            labels: ['Enviados', 'Entregados', 'Abiertos', 'Clics'],
            datasets: [{
                data: [metricas.total, metricas.entregados, metricas.abiertos, metricas.clics],
                backgroundColor: ['#4299e1', '#48bb78', '#ed8936', '#9f7aea'],
                borderColor: ['#3182ce', '#38a169', '#dd6b20', '#805ad5'],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { position: 'bottom' },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.parsed || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                            return `${label}: ${value} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
    window.chartInstances.push(chart1);

    // 2. Distribución de Estados
    const ctxStatus = document.getElementById('statusChart').getContext('2d');
    const chart2 = new Chart(ctxStatus, {
        type: 'bar',
        data: {
            labels: ['Entregados', 'Rebotados', 'Abiertos', 'Clics', 'Cancelados', 'Solo Enviados'],
            datasets: [{
                label: 'Número de Contactos',
                data: [
                    metricas.entregados, 
                    metricas.rebotados, 
                    metricas.abiertos, 
                    metricas.clics, 
                    metricas.cancelados,
                    metricas.soloEnviados
                ],
                backgroundColor: ['#48bb78', '#fc8181', '#ed8936', '#9f7aea', '#f6ad55', '#a0aec0'],
                borderColor: ['#38a169', '#c53030', '#dd6b20', '#805ad5', '#dd6b20', '#718096'],
                borderWidth: 2,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { display: false } },
            scales: {
                y: {
                    beginAtZero: true,
                    title: { display: true, text: 'Número de Contactos' }
                }
            }
        }
    });
    window.chartInstances.push(chart2);

    // 3. Gráfica por Hora
    if (datos && datos.length > 0) {
        const hourlyData = analizarPorHora(datos);
        if (hourlyData.labels.length > 0) {
            const ctxHourly = document.getElementById('hourlyChart').getContext('2d');
            const chart3 = new Chart(ctxHourly, {
                type: 'line',
                data: {
                    labels: hourlyData.labels,
                    datasets: [
                        {
                            label: 'Entregados',
                            data: hourlyData.entregados,
                            borderColor: '#48bb78',
                            backgroundColor: 'rgba(72, 187, 120, 0.1)',
                            tension: 0.4,
                            fill: true
                        },
                        {
                            label: 'Rebotados',
                            data: hourlyData.rebotados,
                            borderColor: '#fc8181',
                            backgroundColor: 'rgba(252, 129, 129, 0.1)',
                            tension: 0.4,
                            fill: true
                        },
                        {
                            label: 'Abiertos',
                            data: hourlyData.abiertos,
                            borderColor: '#ed8936',
                            backgroundColor: 'rgba(237, 137, 54, 0.1)',
                            tension: 0.4,
                            fill: true
                        }
                    ]
                },
                options: {
                    responsive: true,
                    plugins: { legend: { position: 'bottom' } },
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: { display: true, text: 'Número de Contactos' }
                        },
                        x: {
                            title: { display: true, text: 'Hora del Día' }
                        }
                    }
                }
            });
            window.chartInstances.push(chart3);
        }
    }
}

function analizarPorHora(datos) {
    const hourlyMap = {};
    
    datos.forEach(row => {
        if (!row.sent_at && !row.en_campana) return;
        const sentAt = row.sent_at || '2026-06-01 10:30:00';
        const hour = sentAt.split(' ')[1]?.split(':')[0] || '00';
        const key = `${hour}:00`;
        
        if (!hourlyMap[key]) {
            hourlyMap[key] = { entregados: 0, rebotados: 0, abiertos: 0 };
        }
        
        switch(row.estado_campana) {
            case 'delivered': hourlyMap[key].entregados++; break;
            case 'bounced': hourlyMap[key].rebotados++; break;
            case 'opened': hourlyMap[key].abiertos++; break;
        }
    });
    
    const sortedKeys = Object.keys(hourlyMap).sort((a, b) => parseInt(a) - parseInt(b));
    
    return {
        labels: sortedKeys,
        entregados: sortedKeys.map(k => hourlyMap[k].entregados),
        rebotados: sortedKeys.map(k => hourlyMap[k].rebotados),
        abiertos: sortedKeys.map(k => hourlyMap[k].abiertos)
    };
}

// ============================================
// FILTROS
// ============================================

function filtrarTabla() {
    const busqueda = document.getElementById('searchInput').value.toLowerCase().trim();
    const estadoFiltro = document.getElementById('statusFilter').value;
    const rows = document.querySelectorAll('#tablaBody tr');
    let visibleCount = 0;

    rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length < 4) return;

        const email = cells[0].textContent.toLowerCase();
        const nombre = cells[1].textContent.toLowerCase();
        const statusCell = cells[3].textContent.trim();

        const statusMap = {
            '✅ entregado': 'delivered',
            '❌ rebote': 'bounced',
            '👁️ abierto': 'opened',
            '🖱️ click': 'clicked',
            '⛔ cancelado': 'unsubscribed',
            '📨 enviado (sin interacción)': 'sent'
        };
        const statusValue = statusMap[statusCell.toLowerCase()] || 'sent';

        const matchBusqueda = email.includes(busqueda) || nombre.includes(busqueda);
        const matchEstado = estadoFiltro === 'all' || statusValue === estadoFiltro;

        if (matchBusqueda && matchEstado) {
            row.style.display = '';
            visibleCount++;
        } else {
            row.style.display = 'none';
        }
    });

    document.getElementById('resultCount').textContent = `${visibleCount} contactos visibles`;
}

// ============================================
// EXPORTACIÓN A PDF
// ============================================

async function exportarPDF() {
    if (!estado.datosCruzados) {
        alert('⚠️ Primero genera un informe');
        return;
    }

    try {
        const btn = document.getElementById('btnExportarPDF');
        btn.textContent = '⏳ Generando PDF...';
        btn.disabled = true;

        const element = document.querySelector('.dashboard');
        const canvas = await html2canvas(element, {
            scale: 2,
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff'
        });

        const imgData = canvas.toDataURL('image/png');
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF('p', 'mm', 'a4');
        
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        const nombreArchivo = `informe_${estado.campanaSeleccionada.nombre.replace(/\s/g, '_')}_${new Date().toISOString().slice(0,10)}.pdf`;
        pdf.save(nombreArchivo);

        btn.textContent = '📄 Exportar PDF';
        btn.disabled = false;
    } catch (error) {
        console.error('❌ Error exportando PDF:', error);
        alert('❌ Error al generar el PDF');
        const btn = document.getElementById('btnExportarPDF');
        btn.textContent = '📄 Exportar PDF';
        btn.disabled = false;
    }
}

// ============================================
// INICIALIZACIÓN
// ============================================

document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 Inicializando Sistema de Informes...');
    
    // 1. Cargar datos desde CSV
    const datosCargados = await cargarDatos();
    
    if (!datosCargados) {
        console.error('❌ No se pudieron cargar los datos');
        return;
    }

    // 2. Configurar eventos
    document.getElementById('btnGenerarInforme').addEventListener('click', function() {
        const index = document.getElementById('campaignSelect').value;
        generarInforme(index);
    });

    document.getElementById('btnExportarPDF').addEventListener('click', exportarPDF);
    document.getElementById('searchInput').addEventListener('input', filtrarTabla);
    document.getElementById('statusFilter').addEventListener('change', filtrarTabla);

    // 3. Generar informe automático con la primera campaña
    if (estado.campanas.length > 0) {
        console.log('📊 Generando informe inicial...');
        document.getElementById('campaignSelect').value = '0';
        await generarInforme('0');
    }

    console.log('✅ Sistema inicializado correctamente');
});