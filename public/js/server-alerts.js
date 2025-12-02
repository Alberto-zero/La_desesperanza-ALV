// Intercepta fetch y XHR para mostrar alert() cuando la respuesta JSON incluya `alert` or `message`.
(function(){
    // Patch fetch
    const _fetch = window.fetch;
    if (_fetch) {
        window.fetch = async function(input, init) {
            const resp = await _fetch(input, init);
            try {
                // Clonar para no consumir el body original
                const clone = resp.clone();
                const json = await clone.json().catch(() => null);
                if (json && (json.alert || json.message)) {
                    try { alert(json.alert || json.message); } catch (e) { console.log('No se pudo mostrar alert:', e); }
                }
            } catch (e) {
                // ignore
            }
            return resp;
        };
    }

    // Patch XHR
    if (window.XMLHttpRequest) {
        const XHR = window.XMLHttpRequest;
        const origSend = XHR.prototype.send;
        XHR.prototype.send = function(body) {
            this.addEventListener('load', function() {
                try {
                    const ct = this.getResponseHeader('content-type') || '';
                    const text = this.responseText;
                    if (ct.includes('application/json') || (text && text.trim().startsWith('{'))) {
                        let json = null;
                        try { json = JSON.parse(text); } catch(e) { json = null; }
                        if (json && (json.alert || json.message)) {
                            try { alert(json.alert || json.message); } catch (e) { console.log('No se pudo mostrar alert XHR:', e); }
                        }
                    }
                } catch (e) {
                    // ignore
                }
            });
            return origSend.call(this, body);
        };
    }

    // Interceptar formularios multipart (subida de imagen) y enviarlos por fetch para mostrar alert y redirigir
    document.addEventListener('DOMContentLoaded', function() {
        try {
            const forms = document.querySelectorAll('form[enctype="multipart/form-data"]');
            forms.forEach(form => {
                form.addEventListener('submit', async function(e) {
                    e.preventDefault();
                    const action = form.action || window.location.href;
                    const method = (form.method || 'POST').toUpperCase();
                    const fd = new FormData(form);
                    try {
                        const resp = await fetch(action, { method, body: fd });
                        let json = null;
                        try { json = await resp.clone().json(); } catch(e){ json = null; }
                        if (json && (json.alert || json.message)) {
                            try { alert(json.alert || json.message); } catch(e) { console.log('No se pudo mostrar alert en form:', e); }
                        }
                        if (resp.ok) {
                            // Si fue exitoso, redirigir a la página de trabajadores por defecto
                            window.location.href = '/trabajores.html';
                        } else {
                            // Si no fue ok, intentar mostrar error texto
                            const text = await resp.text().catch(()=>null);
                            if (text) {
                                try { alert(text); } catch(e){}
                            }
                        }
                    } catch (err) {
                        console.error('Error enviando formulario por AJAX:', err);
                        try { alert('Error enviando formulario. Revisa la consola.'); } catch(e){}
                    }
                });
            });
        } catch (e) {
            console.error('Error inicializando server-alerts:', e);
        }
    });
})();
