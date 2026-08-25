/* ============================================================================
   BLONK · js/ui.js
   Capa base compartida por index.html y catalogo.html.
   - helpers (formato de precio, escape, placeholders de imagen, iconos)
   - gestor de capas (drawers y modales) con foco atrapado y Escape
   - header con cambio de estado al scrollear
   - menu mobile + overlay de busqueda
   - reveal al hacer scroll (respeta prefers-reduced-motion)
   - modal de guia de talles
   ========================================================================== */
(function () {
  'use strict';

  const BLONK = (window.BLONK = window.BLONK || {});

  /* --------------------------------------------------------------- HELPERS */

  const $  = (sel, ctx) => (ctx || document).querySelector(sel);
  const $$ = (sel, ctx) => Array.from((ctx || document).querySelectorAll(sel));

  /** Escapa texto antes de inyectarlo en innerHTML. */
  function esc(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /** $20.000 en formato argentino. Sin precio -> "Consultar". */
  function fmtPrecio(valor) {
    if (valor == null || valor === '') return 'Consultar';
    return '$' + Number(valor).toLocaleString('es-AR', { maximumFractionDigits: 0 });
  }

  function mcd(a, b) { return b === 0 ? a : mcd(b, a % b); }

  /** "1400 × 1600" -> "7:8" */
  function aspecto(w, h) {
    if (!w || !h) return '';
    const d = mcd(w, h);
    return (w / d) + ':' + (h / d);
  }

  /**
   * Devuelve el HTML de un placeholder de imagen.
   * Muestra nombre de archivo, resolucion, relacion de aspecto y descripcion.
   *
   * Para reemplazarlo por la foto real basta con cambiar este bloque por:
   *   <img src="assets/nombre.webp" width="1400" height="1600" alt="..." loading="lazy">
   * El contenedor conserva la misma relacion de aspecto, asi que no hay
   * salto de layout ni hay que rehacer la seccion.
   */
  function ph(img, opciones) {
    const o = opciones || {};
    const clase = o.clase ? ' ' + o.clase : '';
    const archivo = String(img.src || '').split('/').pop();
    const ratio = o.ratio || (img.w + ' / ' + img.h);
    const desc = img.desc || '';
    return (
      '<figure class="ph' + clase + '" style="--ratio: ' + ratio + '" role="img" ' +
      'aria-label="Imagen pendiente: ' + esc(archivo) + '. ' + esc(desc) + '">' +
        '<figcaption class="ph__meta">' +
          '<span class="ph__name">' + esc(archivo) + '</span>' +
          '<span class="ph__res">' + img.w + ' × ' + img.h + ' px · ' + aspecto(img.w, img.h) + '</span>' +
          (desc ? '<span class="ph__desc">' + esc(desc) + '</span>' : '') +
        '</figcaption>' +
      '</figure>'
    );
  }

  /* ---------------------------------------------------------------- ICONOS */
  const ICONOS = {
    buscar:   '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>',
    carrito:  '<path d="M6 6h15l-1.6 8.5a2 2 0 0 1-2 1.6H9.3a2 2 0 0 1-2-1.7L5.6 4H3"/><circle cx="10" cy="20" r="1.4"/><circle cx="18" cy="20" r="1.4"/>',
    cerrar:   '<path d="M6 6l12 12M18 6L6 18"/>',
    flecha:   '<path d="M5 12h13M13 6l6 6-6 6"/>',
    camion:   '<path d="M3 7h11v9H3z"/><path d="M14 10h4l3 3v3h-7z"/><circle cx="7" cy="18" r="1.6"/><circle cx="17.5" cy="18" r="1.6"/>',
    wsp:      '<path d="M20.5 11.6a8.4 8.4 0 0 1-12.3 7.4L4 20l1.1-4a8.4 8.4 0 1 1 15.4-4.4z"/><path d="M9 9.5c0 3 2.5 5.5 5.5 5.5"/>',
    ig:       '<rect x="3.5" y="3.5" width="17" height="17" rx="4.5"/><circle cx="12" cy="12" r="3.6"/><circle cx="17" cy="7" r=".9" fill="currentColor" stroke="none"/>',
    check:    '<path d="M4 12.5l5 5L20 6.5"/>',
    filtros:  '<path d="M4 6h16M7 12h10M10 18h4"/>',
    regla:    '<path d="M3 8h18v8H3z"/><path d="M7 8v3M11 8v3M15 8v3M19 8v3"/>',
    estrella: '<path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.8-5.2 2.8 1-5.8L3.5 9.7l5.9-.9z"/>',
    lapiz:    '<path d="M4 20l4.5-1L20 7.5 16.5 4 5 15.5z"/><path d="M15 5.5L18.5 9"/>',
    prensa:   '<path d="M4 17h16"/><path d="M6 17V9h12v8"/><path d="M12 3v4"/><path d="M9 7h6"/>',
    corona:   '<path d="M4 18h16l1.4-10-5 3.4L12 4.5 7.6 11.4l-5-3.4z"/>'
  };

  /** Devuelve un <svg> inline. tamano en px. */
  function icon(nombre, tamano, extra) {
    const t = tamano || 20;
    return (
      '<svg class="icono' + (extra ? ' ' + extra : '') + '" width="' + t + '" height="' + t + '" ' +
      'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' +
      (ICONOS[nombre] || '') + '</svg>'
    );
  }

  /* --------------------------------------------------- GESTOR DE CAPAS/UI */
  /* Drawers (carrito, filtros, menu) y modales (talles, producto) comparten
     backdrop, bloqueo de scroll, Escape y foco atrapado. */

  const FOCUSABLES = [
    'a[href]', 'button:not([disabled])', 'input:not([disabled])',
    'select:not([disabled])', 'textarea:not([disabled])',
    'summary', '[tabindex]:not([tabindex="-1"])'
  ].join(',');

  const pila = [];   // capas abiertas, la ultima es la de arriba
  let backdropEl = null;

  function getBackdrop() {
    if (!backdropEl) {
      backdropEl = document.createElement('div');
      backdropEl.className = 'backdrop';
      backdropEl.setAttribute('hidden', '');
      document.body.appendChild(backdropEl);
      backdropEl.addEventListener('click', function () {
        const arriba = pila[pila.length - 1];
        if (arriba && arriba.cerrarConBackdrop) cerrar(arriba.el);
      });
    }
    return backdropEl;
  }

  function actualizarBackdrop() {
    const b = getBackdrop();
    const necesita = pila.some(c => c.backdrop);
    if (necesita) {
      b.removeAttribute('hidden');
      // Fuerza reflow para que la transicion de opacidad corra.
      void b.offsetWidth;
      b.classList.add('is-visible');
    } else {
      b.classList.remove('is-visible');
    }
  }

  /**
   * Bloquea el scroll del body mientras hay una capa abierta.
   * Compensa el ancho de la scrollbar con padding para que la página no
   * pegue un salto lateral al abrirse el modal.
   * `overflow: hidden` conserva la posición de scroll, así que al cerrar el
   * catálogo queda donde estaba.
   */
  function bloquearScroll(bloquear) {
    const body = document.body;
    if (bloquear) {
      if (body.classList.contains('is-locked')) return;
      const ancho = window.innerWidth - document.documentElement.clientWidth;
      if (ancho > 0) body.style.paddingRight = ancho + 'px';
      body.classList.add('is-locked');
    } else {
      body.classList.remove('is-locked');
      body.style.paddingRight = '';
    }
  }

  function abrir(el, opciones) {
    if (!el || pila.some(c => c.el === el)) return;
    const o = opciones || {};
    const capa = {
      el: el,
      backdrop: o.backdrop !== false,
      cerrarConBackdrop: o.cerrarConBackdrop !== false,
      devolverFoco: document.activeElement,
      alCerrar: o.alCerrar,
      disparador: o.disparador
    };
    pila.push(capa);

    el.classList.add('is-abierto');
    el.removeAttribute('aria-hidden');
    if (capa.disparador) capa.disparador.setAttribute('aria-expanded', 'true');

    bloquearScroll(true);
    actualizarBackdrop();

    // Foco al primer elemento util (o al que pidan explicitamente).
    window.setTimeout(function () {
      const objetivo = o.foco ? $(o.foco, el) : null;
      const primero = objetivo || $$(FOCUSABLES, el).find(n => n.offsetParent !== null);
      if (primero) primero.focus({ preventScroll: true });
    }, 60);
  }

  function cerrar(el) {
    const i = pila.findIndex(c => c.el === el);
    if (i === -1) return;
    const capa = pila.splice(i, 1)[0];

    el.classList.remove('is-abierto');
    if (capa.disparador) capa.disparador.setAttribute('aria-expanded', 'false');
    if (!pila.length) bloquearScroll(false);
    actualizarBackdrop();

    if (typeof capa.alCerrar === 'function') capa.alCerrar();
    if (capa.devolverFoco && document.contains(capa.devolverFoco)) {
      capa.devolverFoco.focus({ preventScroll: true });
    }
  }

  function cerrarTodo() { pila.slice().reverse().forEach(c => cerrar(c.el)); }

  function estaAbierto(el) { return pila.some(c => c.el === el); }

  document.addEventListener('keydown', function (e) {
    if (!pila.length) return;
    const arriba = pila[pila.length - 1];

    if (e.key === 'Escape') { e.preventDefault(); cerrar(arriba.el); return; }

    // Foco atrapado dentro de la capa de arriba.
    if (e.key === 'Tab') {
      const nodos = $$(FOCUSABLES, arriba.el).filter(n => n.offsetParent !== null);
      if (!nodos.length) return;
      const primero = nodos[0];
      const ultimo = nodos[nodos.length - 1];
      if (e.shiftKey && document.activeElement === primero) {
        e.preventDefault(); ultimo.focus();
      } else if (!e.shiftKey && document.activeElement === ultimo) {
        e.preventDefault(); primero.focus();
      } else if (!arriba.el.contains(document.activeElement)) {
        e.preventDefault(); primero.focus();
      }
    }
  });

  /* ------------------------------------------------ DETALLES ANIMADOS */
  /* <details> no anima su apertura por sí solo: el navegador muestra u oculta
     el contenido de golpe. Acá se intercepta el click del <summary>, se mide
     el alto real del cuerpo y se interpola. Al cerrar, `open` se saca recién
     cuando termina la animación, así el cierre también se ve.
     Se usa delegación para que funcione también en los <details> que se crean
     dentro de la ficha de producto. */
  const DUR_DETALLE = 420;

  function sinMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function animarDetalle(det) {
    const cuerpo = $('.detalles__cuerpo', det);
    if (!cuerpo || det.dataset.animando === '1') return;

    if (sinMotion()) { det.open = !det.open; return; }

    const abriendo = !det.open;
    det.dataset.animando = '1';
    cuerpo.classList.add('esta-animando');

    if (abriendo) {
      det.open = true;                       // hay que abrirlo para poder medir
      cuerpo.style.height = '0px';
      cuerpo.style.paddingBottom = '0px';
      void cuerpo.offsetHeight;              // fuerza reflow
      cuerpo.style.height = cuerpo.scrollHeight + 'px';
      cuerpo.style.paddingBottom = '';
    } else {
      cuerpo.style.height = cuerpo.scrollHeight + 'px';
      void cuerpo.offsetHeight;
      cuerpo.style.height = '0px';
      cuerpo.style.paddingBottom = '0px';
    }

    window.setTimeout(function () {
      cuerpo.classList.remove('esta-animando');
      cuerpo.style.height = '';
      cuerpo.style.paddingBottom = '';
      if (!abriendo) det.open = false;
      delete det.dataset.animando;
    }, DUR_DETALLE);
  }

  function initDetalles() {
    document.addEventListener('click', function (e) {
      const sum = e.target.closest('summary.detalles__resumen');
      if (!sum) return;
      const det = sum.parentElement;
      if (!det || det.tagName !== 'DETAILS') return;
      e.preventDefault();
      animarDetalle(det);
    });
  }

  /* ------------------------------------------------------------- TOAST */
  let toastEl = null, toastTimer = null;

  function toast(mensaje) {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.className = 'toast';
      toastEl.setAttribute('role', 'status');
      toastEl.setAttribute('aria-live', 'polite');
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = mensaje;
    toastEl.classList.add('is-visible');
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toastEl.classList.remove('is-visible'), 2600);
  }

  /* -------------------------------------------------------------- HEADER */
  function initHeader() {
    const header = $('.header');
    if (!header) return;
    // En catalogo.html el header arranca solido porque no hay hero a sangre.
    if (header.classList.contains('is-forzado')) return;

    let ticking = false;
    function chequear() {
      const y = window.scrollY || document.documentElement.scrollTop || 0;
      header.classList.toggle('is-solido', y > 24);
      ticking = false;
    }
    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; window.requestAnimationFrame(chequear); }
    }, { passive: true });
    chequear();
  }

  /* --------------------------------------------------------- MENU MOBILE */
  function initMenuMobile() {
    const menu = $('#menu-mobile');
    const btn = $('#btn-menu');
    if (!menu || !btn) return;

    btn.addEventListener('click', function () {
      if (estaAbierto(menu)) cerrar(menu);
      else abrir(menu, { backdrop: false, disparador: btn });
    });

    $$('[data-cerrar-menu]', menu).forEach(function (n) {
      n.addEventListener('click', () => cerrar(menu));
    });

    // Al pasar a desktop el menu deja de tener sentido.
    const mq = window.matchMedia('(min-width: 1200px)');
    const onCambio = () => { if (mq.matches && estaAbierto(menu)) cerrar(menu); };
    if (mq.addEventListener) mq.addEventListener('change', onCambio);
    else if (mq.addListener) mq.addListener(onCambio);
  }

  /* --------------------------------------------------- BUSCADOR (OVERLAY) */
  function initBuscador() {
    const overlay = $('#buscador-overlay');
    const btn = $('#btn-buscar');
    if (!overlay || !btn) return;

    btn.addEventListener('click', function () {
      abrir(overlay, { backdrop: false, disparador: btn, foco: 'input[type="search"]' });
    });
    $$('[data-cerrar-buscador]', overlay).forEach(function (n) {
      n.addEventListener('click', () => cerrar(overlay));
    });
  }

  /**
   * Manda una busqueda al catalogo por query string.
   * Desde catalogo.html filtra en el momento (lo resuelve catalogo.js).
   */
  function irABusqueda(texto) {
    const q = String(texto || '').trim();
    if (BLONK.catalogo && typeof BLONK.catalogo.buscar === 'function') {
      BLONK.catalogo.buscar(q);
      return;
    }
    window.location.href = 'catalogo.html' + (q ? '?q=' + encodeURIComponent(q) : '');
  }

  /* Conecta cualquier <form data-busqueda> de la pagina. */
  function initFormsBusqueda() {
    $$('form[data-busqueda]').forEach(function (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        const input = $('input[type="search"], input[type="text"]', form);
        irABusqueda(input ? input.value : '');
      });
    });
  }

  /* Chips de busqueda rapida (home, overlay mobile, etc.). */
  function initChipsBusqueda() {
    document.addEventListener('click', function (e) {
      const chip = e.target.closest('[data-chip-busqueda]');
      if (!chip) return;
      e.preventDefault();
      irABusqueda(chip.dataset.chipBusqueda);
    });
  }

  /* --------------------------------------------------------------- REVEAL */
  /* Se pone en true en cuanto el IntersectionObserver reporta algo. Si pasado
     el plazo de gracia sigue en false, es que el observer no está funcionando
     en ese navegador: entonces se muestra todo de una y listo. Sin esta red,
     un observer que no dispara deja media página en opacity 0. */
  let ioAnduvo = false;
  const GRACIA_IO = 2000;

  function redDeSeguridadIO(mostrarTodo) {
    window.setTimeout(function () {
      if (!ioAnduvo) mostrarTodo();
    }, GRACIA_IO);
  }

  function initReveal() {
    const nodos = $$('.reveal');
    if (!nodos.length) return;

    const mostrarTodo = () => $$('.reveal').forEach(n => n.classList.add('es-visible'));

    const sinMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (sinMotion || !('IntersectionObserver' in window)) { mostrarTodo(); return; }

    const obs = new IntersectionObserver(function (entradas) {
      ioAnduvo = true;
      entradas.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('es-visible'); obs.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });

    nodos.forEach(n => obs.observe(n));
    redDeSeguridadIO(mostrarTodo);
  }

  /** Registra nodos creados dinamicamente (cards del catalogo, etc.). */
  function observarReveal(contenedor) {
    const sinMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const nodos = $$('.reveal:not(.es-visible)', contenedor);
    if (sinMotion || !('IntersectionObserver' in window)) {
      nodos.forEach(n => n.classList.add('es-visible'));
      return;
    }
    const obs = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('es-visible'); obs.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -4% 0px', threshold: 0.05 });
    nodos.forEach(n => obs.observe(n));
  }

  /* ----------------------------------------------------- GUIA DE TALLES */
  /* Un unico modal por pagina. Se abre desde configuradores y desde el
     detalle de producto con data-abrir-talles="remeras|buzos". */
  function initGuiaTalles() {
    const modal = $('#modal-talles');
    if (!modal) return;

    const datos = (window.BLONK_DATA && window.BLONK_DATA.GUIA_TALLES) || { remeras: [], buzos: [] };
    const cont = $('#talles-contenido', modal);
    const tabs = $$('[data-talles-tab]', modal);

    function tabla(filas) {
      return (
        '<table class="tabla-talles">' +
          '<caption>Medidas de la prenda en cm</caption>' +
          '<thead><tr><th scope="col">Talle</th><th scope="col">Alto</th><th scope="col">Ancho</th></tr></thead>' +
          '<tbody>' +
          filas.map(f =>
            '<tr><td>' + esc(f.talle) + '</td><td>' + esc(f.alto) + '</td><td>' + esc(f.ancho) + '</td></tr>'
          ).join('') +
          '</tbody>' +
        '</table>' +
        '<p class="tabla-talles__nota">*Las medidas pueden variar &plusmn; 1&ndash;2 cm.</p>'
      );
    }

    function pintar(tipo) {
      const filas = datos[tipo] || [];
      tabs.forEach(function (t) {
        const activo = t.dataset.tallesTab === tipo;
        t.setAttribute('aria-pressed', String(activo));
      });
      if (!filas.length) {
        // No se inventan medidas: se avisa que faltan.
        cont.innerHTML =
          '<div class="aviso">' +
            '<strong>Todavía no tenemos publicada la tabla de ' + esc(tipo) + '.</strong> ' +
            'Escribinos por WhatsApp y te pasamos las medidas exactas de la prenda que quieras.' +
          '</div>';
      } else {
        cont.innerHTML = tabla(filas);
      }
    }

    tabs.forEach(function (t) {
      t.addEventListener('click', () => pintar(t.dataset.tallesTab));
    });

    pintar('remeras');

    // Disparadores en toda la pagina (incluye los inyectados por JS).
    document.addEventListener('click', function (e) {
      const btn = e.target.closest('[data-abrir-talles]');
      if (!btn) return;
      e.preventDefault();
      pintar(btn.dataset.abrirTalles || 'remeras');
      abrir(modal, { disparador: null });
    });

    $$('[data-cerrar-modal]', modal).forEach(function (n) {
      n.addEventListener('click', () => cerrar(modal));
    });
  }

  /* --------------------------------------------------- CONTROLES COMUNES */
  /* Grupos radio accesibles: swatches de color y talles.
     Se manejan con click y con flechas del teclado. */
  function initGruposRadio(contenedor) {
    $$('[data-grupo-radio]', contenedor || document).forEach(function (grupo) {
      if (grupo.dataset.radioListo === '1') return;
      grupo.dataset.radioListo = '1';

      grupo.addEventListener('click', function (e) {
        const opcion = e.target.closest('[role="radio"]');
        if (!opcion || !grupo.contains(opcion)) return;
        seleccionar(grupo, opcion);
      });

      grupo.addEventListener('keydown', function (e) {
        const teclas = ['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp'];
        if (teclas.indexOf(e.key) === -1) return;
        e.preventDefault();
        const opciones = $$('[role="radio"]', grupo);
        const actual = opciones.findIndex(o => o.getAttribute('aria-checked') === 'true');
        const paso = (e.key === 'ArrowRight' || e.key === 'ArrowDown') ? 1 : -1;
        const proximo = opciones[(actual + paso + opciones.length) % opciones.length];
        seleccionar(grupo, proximo);
        proximo.focus();
      });
    });
  }

  function seleccionar(grupo, opcion) {
    $$('[role="radio"]', grupo).forEach(function (o) {
      const activo = o === opcion;
      o.setAttribute('aria-checked', String(activo));
      o.tabIndex = activo ? 0 : -1;
    });
    grupo.dispatchEvent(new CustomEvent('blonk:cambio', {
      bubbles: true,
      detail: { valor: opcion.dataset.valor, opcion: opcion }
    }));
  }

  /** Stepper de cantidad. Devuelve el valor actual mediante evento. */
  function initCantidades(contenedor) {
    $$('[data-cantidad]', contenedor || document).forEach(function (caja) {
      if (caja.dataset.cantidadListo === '1') return;
      caja.dataset.cantidadListo = '1';

      const input = $('.cantidad__valor', caja);
      const menos = $('[data-cantidad-menos]', caja);
      const mas = $('[data-cantidad-mas]', caja);
      const min = Number(caja.dataset.min || 1);
      const max = Number(caja.dataset.max || 99);

      function set(valor) {
        const v = Math.min(max, Math.max(min, Number(valor) || min));
        input.value = v;
        if (menos) menos.disabled = v <= min;
        if (mas) mas.disabled = v >= max;
        caja.dispatchEvent(new CustomEvent('blonk:cantidad', { bubbles: true, detail: { valor: v } }));
      }

      if (menos) menos.addEventListener('click', () => set(Number(input.value) - 1));
      if (mas) mas.addEventListener('click', () => set(Number(input.value) + 1));
      input.addEventListener('change', () => set(input.value));
      set(input.value || min);
    });
  }

  /* ------------------------------------------------------------- EXPORTS */
  BLONK.$ = $;
  BLONK.$$ = $$;
  BLONK.esc = esc;
  BLONK.fmtPrecio = fmtPrecio;
  BLONK.ph = ph;
  BLONK.icon = icon;
  BLONK.toast = toast;
  BLONK.irABusqueda = irABusqueda;
  BLONK.observarReveal = observarReveal;
  BLONK.redDeSeguridadIO = redDeSeguridadIO;
  BLONK.ioAnduvo = function () { return ioAnduvo; };
  BLONK.initGruposRadio = initGruposRadio;
  BLONK.initCantidades = initCantidades;
  BLONK.ui = {
    abrir: abrir,
    cerrar: cerrar,
    cerrarTodo: cerrarTodo,
    estaAbierto: estaAbierto
  };

  /* ---------------------------------------------------------------- INIT */
  document.addEventListener('DOMContentLoaded', function () {
    initHeader();
    initMenuMobile();
    initBuscador();
    initFormsBusqueda();
    initChipsBusqueda();
    initReveal();
    initGuiaTalles();
    initDetalles();
    initGruposRadio(document);
    initCantidades(document);
  });
})();
