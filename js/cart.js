/* ============================================================================
   BLONK · js/cart.js
   Carrito lateral derecho, persistente entre index.html y catalogo.html.
   - guarda en localStorage bajo la clave "blonk.carrito.v1"
   - drawer anclado a la derecha que entra de derecha a izquierda
   - arma el mensaje de pedido para WhatsApp
   ========================================================================== */
(function () {
  'use strict';

  const BLONK = (window.BLONK = window.BLONK || {});
  const { $, $$, esc, fmtPrecio, ph, icon, toast } = BLONK;

  /* ==========================================================================
     DATOS DE CONTACTO — COMPLETAR ANTES DE PUBLICAR
     --------------------------------------------------------------------------
     No se inventan numero, usuario ni casilla. Mientras esten vacios, la web
     avisa que falta el dato en lugar de mandar a un destino falso.

       whatsapp  -> solo digitos, con codigo de pais. Ej: '5493764000000'
       instagram -> handle sin arroba.  Ej: 'blonk.indumentaria'
       email     -> casilla comercial de BLONK.
     ========================================================================== */
  const CONTACTO = {
    whatsapp: '',
    instagram: 'blonk_oficial_',
    instagramUrl: 'https://www.instagram.com/blonk_oficial_?igsi=OWl3OHhhdnZ4Y2xr',
    email: ''
  };

  const CLAVE = 'blonk.carrito.v1';

  let items = [];

  /* ------------------------------------------------------- PERSISTENCIA */
  function cargar() {
    try {
      const crudo = window.localStorage.getItem(CLAVE);
      items = crudo ? JSON.parse(crudo) : [];
      if (!Array.isArray(items)) items = [];
    } catch (e) {
      items = [];
    }
  }

  function guardar() {
    try {
      window.localStorage.setItem(CLAVE, JSON.stringify(items));
    } catch (e) {
      /* Modo privado o storage lleno: el carrito sigue vivo en memoria. */
    }
  }

  /* -------------------------------------------------------------- CALCULO */
  function claveItem(it) {
    return [it.slug, it.colorId || '-', it.talle || '-'].join('|');
  }

  function cantidadTotal() {
    return items.reduce((n, it) => n + it.cantidad, 0);
  }

  function subtotal() {
    return items.reduce((n, it) => n + (it.precio ? it.precio * it.cantidad : 0), 0);
  }

  function hayAConsultar() {
    return items.some(it => !it.precio);
  }

  /* --------------------------------------------------------------- API */
  function agregar(producto, opciones) {
    const o = opciones || {};
    const it = {
      id: producto.id,
      slug: producto.slug,
      nombre: producto.nombre,
      categoria: producto.categoria,
      precio: producto.precio == null ? null : producto.precio,
      colorId: o.colorId || null,
      colorNombre: o.colorNombre || null,
      colorHex: o.colorHex || null,
      talle: o.talle || null,
      cantidad: Math.max(1, Number(o.cantidad) || 1),
      img: o.img || (producto.imagenes && producto.imagenes[0]) || null
    };
    it.key = claveItem(it);

    const existente = items.find(x => x.key === it.key);
    if (existente) existente.cantidad = Math.min(99, existente.cantidad + it.cantidad);
    else items.push(it);

    guardar();
    render();
    toast(producto.nombre + ' agregado al carrito');
    return it;
  }

  function quitar(key) {
    const i = items.findIndex(x => x.key === key);
    if (i === -1) return;
    const nombre = items[i].nombre;
    items.splice(i, 1);
    guardar();
    render();
    toast(nombre + ' eliminado del carrito');
  }

  /* Actualiza solo lo que cambia. Rehacer todo el drawer haria perder el foco
     del boton +/- que el usuario esta usando. */
  function setCantidad(key, cantidad) {
    const it = items.find(x => x.key === key);
    if (!it) return;
    const nueva = Math.min(99, Math.max(1, Number(cantidad) || 1));
    if (nueva === it.cantidad) return;
    it.cantidad = nueva;
    guardar();

    const caja = $('[data-cantidad][data-key="' + key + '"]');
    const linea = caja && caja.closest('.carrito-item');
    const precio = linea && $('.carrito-item__precio', linea);
    if (precio) precio.textContent = it.precio ? fmtPrecio(it.precio * it.cantidad) : 'Consultar';

    actualizarTotales();
  }

  /* Contadores del header + subtotal del pie. */
  function actualizarTotales() {
    const total = cantidadTotal();
    $$('[data-carrito-contador]').forEach(function (n) {
      n.textContent = total > 99 ? '99+' : String(total);
      n.classList.toggle('is-visible', total > 0);
    });
    $$('[data-carrito-abrir]').forEach(function (n) {
      n.setAttribute('aria-label', total
        ? 'Abrir carrito, ' + total + (total === 1 ? ' producto' : ' productos')
        : 'Abrir carrito, vacío');
    });

    const cuenta = $('#carrito-cuenta');
    if (cuenta) cuenta.textContent = total ? '(' + total + ')' : '';

    const monto = $('#carrito-subtotal');
    if (monto) monto.textContent = fmtPrecio(subtotal());
  }

  function vaciar() {
    items = [];
    guardar();
    render();
  }

  /* ------------------------------------------------------------- RENDER */
  function render() {
    actualizarTotales();

    const cuerpo = $('#carrito-cuerpo');
    const pie = $('#carrito-pie');
    if (!cuerpo) return;

    if (!items.length) {
      cuerpo.innerHTML =
        '<div class="carrito__vacio">' +
          icon('carrito', 42) +
          '<p>Todavía no agregaste nada.<br>Entrá al catálogo y elegí tu próximo diseño.</p>' +
          '<a class="btn btn--primario" href="catalogo.html">Ver catálogo ' + icon('flecha', 18, 'flecha') + '</a>' +
        '</div>';
      if (pie) pie.hidden = true;
      return;
    }

    cuerpo.innerHTML = items.map(function (it) {
      const imagen = it.img || { src: '', w: 1400, h: 1600, desc: '' };
      /* Foto real si existe; si no, placeholder con la misma caja. */
      const media = (imagen.src && !imagen.w)
        ? '<img src="' + esc(imagen.src) + '" alt="' + esc(imagen.alt || it.nombre) + '">'
        : ph(imagen, { clase: 'ph--min' });
      const precioTxt = it.precio
        ? fmtPrecio(it.precio * it.cantidad)
        : 'Consultar';
      return (
        '<article class="carrito-item">' +
          '<div class="carrito-item__media">' + media + '</div>' +
          '<div class="carrito-item__info">' +
            '<h3 class="carrito-item__nombre">' + esc(it.nombre) + '</h3>' +
            '<button class="carrito-item__quitar" type="button" data-quitar="' + esc(it.key) + '" ' +
              'aria-label="Eliminar ' + esc(it.nombre) + ' del carrito">' + icon('cerrar', 16) + '</button>' +
            '<p class="carrito-item__meta">' +
              (it.colorNombre
                ? '<i><span class="carrito-item__punto" style="background:' + esc(it.colorHex || '#333') + '"></span>' + esc(it.colorNombre) + '</i>'
                : '') +
              (it.talle ? '<i>Talle ' + esc(it.talle) + '</i>' : '') +
            '</p>' +
            '<div class="carrito-item__fila">' +
              '<div class="cantidad" data-cantidad data-min="1" data-max="99" data-key="' + esc(it.key) + '">' +
                '<button class="cantidad__btn" type="button" data-cantidad-menos aria-label="Quitar una unidad">&minus;</button>' +
                '<input class="cantidad__valor" type="number" value="' + it.cantidad + '" min="1" max="99" ' +
                  'aria-label="Cantidad de ' + esc(it.nombre) + '">' +
                '<button class="cantidad__btn" type="button" data-cantidad-mas aria-label="Sumar una unidad">+</button>' +
              '</div>' +
              '<span class="carrito-item__precio' + (it.precio ? '' : ' es-consultar') + '">' + precioTxt + '</span>' +
            '</div>' +
          '</div>' +
        '</article>'
      );
    }).join('');

    // Steppers de cada linea.
    BLONK.initCantidades(cuerpo);
    $$('[data-cantidad]', cuerpo).forEach(function (caja) {
      caja.addEventListener('blonk:cantidad', function (e) {
        setCantidad(caja.dataset.key, e.detail.valor);
      });
    });
    $$('[data-quitar]', cuerpo).forEach(function (btn) {
      btn.addEventListener('click', () => quitar(btn.dataset.quitar));
    });

    if (pie) {
      pie.hidden = false;
      const monto = $('#carrito-subtotal', pie);
      const nota = $('#carrito-nota', pie);
      if (monto) monto.textContent = fmtPrecio(subtotal());
      if (nota) {
        nota.innerHTML = hayAConsultar()
          ? 'Hay productos a cotizar. El subtotal no los incluye. El envío se calcula aparte según destino.'
          : 'El costo de envío se calcula aparte según destino, peso y modalidad.';
      }
    }
  }

  /* ---------------------------------------------------- MENSAJE WHATSAPP */
  function textoPedido() {
    const lineas = ['Hola BLONK! Quiero hacer este pedido:', ''];

    items.forEach(function (it, i) {
      const partes = [];
      if (it.colorNombre) partes.push('color ' + it.colorNombre);
      if (it.talle) partes.push('talle ' + it.talle);
      lineas.push(
        (i + 1) + ') ' + it.nombre +
        (partes.length ? ' (' + partes.join(', ') + ')' : '') +
        ' x' + it.cantidad +
        ' - ' + (it.precio ? fmtPrecio(it.precio * it.cantidad) : 'a consultar')
      );
    });

    lineas.push('');
    lineas.push('Subtotal productos: ' + fmtPrecio(subtotal()));
    if (hayAConsultar()) lineas.push('(Hay productos a cotizar que no entran en el subtotal.)');
    lineas.push('');
    lineas.push('Para coordinar el envio te paso: nombre completo, DNI, email, código postal, localidad y teléfono.');

    return lineas.join('\n');
  }

  function finalizarPorWhatsApp() {
    if (!items.length) { toast('El carrito está vacío'); return; }
    const texto = textoPedido();

    if (!CONTACTO.whatsapp) {
      // Falta el dato real: no se inventa un numero.
      if (navigator.clipboard) {
        navigator.clipboard.writeText(texto).then(
          () => toast('Falta cargar el WhatsApp en js/cart.js. Copiamos el pedido al portapapeles.'),
          () => toast('Falta cargar el número de WhatsApp en js/cart.js (CONTACTO.whatsapp).')
        );
      } else {
        toast('Falta cargar el número de WhatsApp en js/cart.js (CONTACTO.whatsapp).');
      }
      console.warn('[BLONK] CONTACTO.whatsapp vacio. Pedido armado:\n' + texto);
      return;
    }

    window.open(
      'https://wa.me/' + CONTACTO.whatsapp + '?text=' + encodeURIComponent(texto),
      '_blank',
      'noopener'
    );
  }

  /** Consulta suelta por WhatsApp (no usa el carrito). */
  function consultar(mensaje) {
    const texto = mensaje || 'Hola BLONK! Quería hacerles una consulta.';
    if (!CONTACTO.whatsapp) {
      toast('Falta cargar el número de WhatsApp en js/cart.js (CONTACTO.whatsapp).');
      console.warn('[BLONK] CONTACTO.whatsapp vacio. Mensaje:\n' + texto);
      return;
    }
    window.open(
      'https://wa.me/' + CONTACTO.whatsapp + '?text=' + encodeURIComponent(texto),
      '_blank',
      'noopener'
    );
  }

  /* --------------------------------------------------------------- DRAWER */
  function initDrawer() {
    const drawer = $('#carrito');
    if (!drawer) return;

    $$('[data-carrito-abrir]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        BLONK.ui.abrir(drawer, { disparador: btn });
      });
    });

    $$('[data-carrito-cerrar]', drawer).forEach(function (btn) {
      btn.addEventListener('click', () => BLONK.ui.cerrar(drawer));
    });

    const wsp = $('[data-carrito-wsp]', drawer);
    if (wsp) wsp.addEventListener('click', finalizarPorWhatsApp);
  }

  /* Cualquier boton con data-wsp="mensaje" abre WhatsApp con ese texto. */
  function initBotonesWsp() {
    document.addEventListener('click', function (e) {
      const btn = e.target.closest('[data-wsp]');
      if (!btn) return;
      e.preventDefault();
      consultar(btn.dataset.wsp || undefined);
    });
  }

  /* Enlaces de Instagram: se completan solos desde CONTACTO. */
  function initInstagram() {
    $$('[data-instagram]').forEach(function (a) {
      if (CONTACTO.instagram) {
        a.href = CONTACTO.instagramUrl || ('https://www.instagram.com/' + CONTACTO.instagram);
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.removeAttribute('aria-disabled');
        const label = $('[data-instagram-handle]', a);
        if (label) label.textContent = '@' + CONTACTO.instagram;
      } else {
        a.setAttribute('aria-disabled', 'true');
        a.addEventListener('click', function (e) {
          e.preventDefault();
          toast('Falta cargar el usuario de Instagram en js/cart.js (CONTACTO.instagram).');
        });
      }
    });
  }

  /* Sincroniza entre pestanas abiertas. */
  window.addEventListener('storage', function (e) {
    if (e.key === CLAVE) { cargar(); render(); }
  });

  /* -------------------------------------------------------------- EXPORT */
  BLONK.CONTACTO = CONTACTO;
  BLONK.carrito = {
    agregar: agregar,
    quitar: quitar,
    setCantidad: setCantidad,
    vaciar: vaciar,
    items: () => items.slice(),
    subtotal: subtotal,
    total: cantidadTotal,
    render: render,
    textoPedido: textoPedido,
    finalizarPorWhatsApp: finalizarPorWhatsApp,
    consultar: consultar,
    abrir: function () {
      const d = $('#carrito');
      if (d) BLONK.ui.abrir(d, {});
    }
  };

  document.addEventListener('DOMContentLoaded', function () {
    cargar();
    initDrawer();
    initBotonesWsp();
    initInstagram();
    render();
  });
})();
