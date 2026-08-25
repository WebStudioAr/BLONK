/* ============================================================================
   BLONK · js/main.js
   Logica exclusiva de index.html:
   - configuradores de remera y buzo (color, talle, cantidad)
   - preview con recolorizacion por software + diseño subido por el usuario
   - carrusel de categorias en mobile
   ========================================================================== */
(function () {
  'use strict';

  const BLONK = (window.BLONK = window.BLONK || {});
  const { $, $$, esc, fmtPrecio } = BLONK;

  /* --------------------------------------------------------- CONFIGURADOR */
  /**
   * Monta un configurador de prenda.
   * @param {string} clave  'remera' | 'buzo'  (lee window.BLONK_DATA.CONFIGURADORES)
   * @param {string} raiz   selector de la <section>
   * @param {string} tipoTalles  'remeras' | 'buzos' (para la guia de talles)
   */
  function montarConfigurador(clave, raiz, tipoTalles) {
    const seccion = $(raiz);
    if (!seccion) return;

    const cfg = (window.BLONK_DATA && window.BLONK_DATA.CONFIGURADORES || {})[clave];
    if (!cfg) return;

    const contMedia   = $('[data-config-media]', seccion);
    const contColores = $('[data-config-colores]', seccion);
    const contTalles  = $('[data-config-talles]', seccion);
    const contPrecio  = $('[data-config-precio]', seccion);
    const contNombre  = $('[data-config-nombre]', seccion);
    const contBajada  = $('[data-config-bajada]', seccion);

    const estado = {
      color: cfg.colores[0],
      talle: cfg.talles[Math.min(1, cfg.talles.length - 1)], // arranca en M
      cantidad: 1,
      diseno: null
    };

    /* --- Textos fijos --- */
    if (contNombre) contNombre.textContent = cfg.nombre;
    if (contBajada) contBajada.textContent = cfg.bajada;
    if (contPrecio) contPrecio.textContent = fmtPrecio(cfg.precio);

    /* --- Preview: prenda recolorizable + capa de diseño --- */
    const preview = contMedia ? new BLONK.PrendaPreview(contMedia, cfg) : null;

    /* --- Colores --- */
    if (contColores) {
      contColores.innerHTML = cfg.colores.map(function (c, i) {
        const activo = i === 0;
        return (
          '<button class="swatch" type="button" role="radio" data-valor="' + esc(c.id) + '" ' +
            'aria-checked="' + activo + '" tabindex="' + (activo ? '0' : '-1') + '">' +
            '<span class="swatch__disco" style="--c:' + esc(c.hex) + '"></span>' +
            '<span class="swatch__nombre">' + esc(c.nombre) + '</span>' +
          '</button>'
        );
      }).join('');

      contColores.addEventListener('blonk:cambio', function (e) {
        const c = cfg.colores.find(x => x.id === e.detail.valor);
        if (!c) return;
        estado.color = c;
        /* Solo se redibuja la prenda. El diseño subido no se toca. */
        if (preview) preview.setColor(c);
      });
    }

    /* --- Talles --- */
    if (contTalles) {
      contTalles.innerHTML = cfg.talles.map(function (t) {
        const activo = t === estado.talle;
        return (
          '<button class="talle" type="button" role="radio" data-valor="' + esc(t) + '" ' +
            'aria-checked="' + activo + '" tabindex="' + (activo ? '0' : '-1') + '">' + esc(t) + '</button>'
        );
      }).join('');

      contTalles.addEventListener('blonk:cambio', function (e) {
        estado.talle = e.detail.valor;
      });
    }

    /* --- Cantidad --- */
    const caja = $('[data-cantidad]', seccion);
    if (caja) {
      caja.addEventListener('blonk:cantidad', function (e) { estado.cantidad = e.detail.valor; });
    }

    /* ------------------------------------------------- SUBIR TU DISEÑO --- */
    const input   = $('[data-diseno-input]', seccion);
    const bloque  = $('[data-diseno-bloque]', seccion);
    const nombre  = $('[data-diseno-nombre]', seccion);
    const aviso   = $('[data-diseno-aviso]', seccion);
    const slider  = $('[data-diseno-escala]', seccion);
    const salida  = $('[data-diseno-escala-valor]', seccion);
    const btnQuitar = $('[data-diseno-quitar]', seccion);
    const btnReset  = $('[data-diseno-reset]', seccion);

    function mostrarAviso(texto, esError) {
      if (!aviso) return;
      aviso.textContent = texto || '';
      aviso.hidden = !texto;
      aviso.classList.toggle('es-error', !!esError);
    }

    function sincronizarSlider() {
      if (!slider || !preview) return;
      slider.value = preview.escala;
      if (salida) salida.textContent = Math.round(preview.escala) + '%';
    }

    if (slider) {
      slider.min = cfg.zonaImpresion.min;
      slider.max = cfg.zonaImpresion.max;
      slider.value = cfg.zonaImpresion.ancho;
      slider.addEventListener('input', function () {
        if (!preview) return;
        preview.setEscala(slider.value);
        if (salida) salida.textContent = Math.round(preview.escala) + '%';
      });
    }
    sincronizarSlider();

    if (input && preview) {
      input.addEventListener('change', function () {
        const file = input.files && input.files[0];
        if (!file) return;

        preview.setDiseno(file).then(function (info) {
          estado.diseno = info;
          if (nombre) nombre.textContent = info.nombre;
          if (bloque) bloque.classList.add('tiene-diseno');
          mostrarAviso('');
          sincronizarSlider();
        }).catch(function (err) {
          estado.diseno = null;
          input.value = '';
          mostrarAviso(err.message, true);
        });
      });
    }

    if (btnQuitar && preview) {
      btnQuitar.addEventListener('click', function () {
        preview.quitarDiseno();
        estado.diseno = null;
        if (input) input.value = '';
        if (nombre) nombre.textContent = '';
        if (bloque) bloque.classList.remove('tiene-diseno');
        mostrarAviso('');
        sincronizarSlider();
        BLONK.toast('Diseño quitado');
      });
    }

    if (btnReset && preview) {
      btnReset.addEventListener('click', function () {
        preview.setEscala(cfg.zonaImpresion.ancho);
        sincronizarSlider();
      });
    }

    /* --- Acciones --- */
    const btnPersonalizar = $('[data-config-personalizar]', seccion);
    if (btnPersonalizar) {
      btnPersonalizar.addEventListener('click', function () {
        let msg = 'Hola BLONK! Quiero personalizar ' + estado.cantidad + ' ' +
          cfg.nombre.toLowerCase() + ' en color ' + estado.color.nombre +
          ', talle ' + estado.talle + '. Precio de lista: ' + fmtPrecio(cfg.precio) + ' c/u.';
        msg += estado.diseno
          ? ' Ya armé la preview con mi diseño (' + estado.diseno.nombre + ') y se lo paso por acá.'
          : ' Te paso mi idea para el estampado.';
        BLONK.carrito.consultar(msg);
      });
    }

    const btnTalles = $('[data-abrir-talles]', seccion);
    if (btnTalles && tipoTalles) btnTalles.dataset.abrirTalles = tipoTalles;

    /* --- Arranque --- */
    BLONK.initGruposRadio(seccion);
    BLONK.initCantidades(seccion);
  }

  /* Los chips de busqueda rapida los maneja ui.js, porque tambien viven en
     el overlay de busqueda de catalogo.html. */

  /* ------------------------------------------- PROCESO: reveal progresivo */
  /* Cuando la linea de produccion entra en pantalla se marca .es-visible y el
     CSS encadena: primero se dibuja la linea, despues entran los cuatro pasos
     de izquierda a derecha con 100ms de diferencia entre uno y otro.
     Todo el timing vive en el CSS; aca solo se dispara. */
  function initProceso() {
    const lista = $('[data-proceso]');
    if (!lista) return;

    const sinMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (sinMotion || !('IntersectionObserver' in window)) {
      lista.classList.add('es-visible');
      return;
    }

    const obs = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (e) {
        if (!e.isIntersecting) return;
        /* Pequeña espera para que el titular entre primero. */
        window.setTimeout(function () { lista.classList.add('es-visible'); }, 100);
        obs.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.12 });

    obs.observe(lista);

    /* Si el observer no llega a funcionar, los pasos se muestran igual: nunca
       pueden quedar invisibles esperando una animación que no va a correr. */
    BLONK.redDeSeguridadIO(function () { lista.classList.add('es-visible'); });
  }

  /* --------------------------------------------- CATEGORIAS: pista de swipe */
  /* Oculta la pista una vez que el usuario deslizo. Detalle chico, nada mas. */
  function initCategorias() {
    const lista = $('#categorias-lista');
    const hint = $('#categorias-hint');
    if (!lista || !hint) return;
    lista.addEventListener('scroll', function () {
      if (lista.scrollLeft > 24) hint.style.opacity = '0';
    }, { passive: true, once: true });
  }

  /* ------------------------------------------------------------------ INIT */
  document.addEventListener('DOMContentLoaded', function () {
    montarConfigurador('remera', '#config-remeras', 'remeras');
    montarConfigurador('buzo', '#config-buzos', 'buzos');
    initProceso();
    initCategorias();
  });
})();
