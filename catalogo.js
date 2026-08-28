/* ============================================================================
   BLONK · js/catalogo.js
   Logica exclusiva de catalogo.html:
   - busqueda (toma ?q= de la home), filtros, orden y paginacion
   - grilla de productos (2 cols mobile / 3 tablet / 4 desktop)
   - ficha de producto como pantalla expandible (overlay grande)
   - el estado vive en la URL, asi que se puede compartir y volver sin perderlo
   ========================================================================== */
(function () {
  'use strict';

  const BLONK = (window.BLONK = window.BLONK || {});
  const { $, $$, esc, fmtPrecio, ph, icon, toast } = BLONK;

  const DATOS = window.BLONK_DATA || {};
  const PRODUCTOS = DATOS.PRODUCTOS || [];

  const POR_PAGINA = 12;

  /* Etiquetas legibles para chips de filtro activo. */
  const ETIQUETAS = {
    categoria: { remeras: 'Remeras', buzos: 'Buzos', conjuntos: 'Conjuntos', personalizados: 'Personalizados' },
    tipoDiseno: { clasico: 'Clásicos', graffiti: 'Graffiti', minimal: 'Minimal', tipografico: 'Tipográficos' },
    tag: {
      argentina: 'Argentina', futbol: 'Fútbol', urbano: 'Urbanos', blonk: 'BLONK',
      personalizados: 'Personalizados', unisex: 'Unisex', oversize: 'Oversize', minimal: 'Minimal'
    }
  };

  /* Tags que se ofrecen como filtro tematico (el resto queda solo para buscar). */
  const TAGS_TEMATICOS = ['argentina', 'futbol', 'urbano', 'blonk', 'personalizados', 'oversize'];

  const estado = {
    q: '',
    categoria: [],
    color: [],
    talle: [],
    tipoDiseno: [],
    tag: [],
    orden: 'destacados',
    pagina: 1
  };

  /* ------------------------------------------------------------------ URL */
  function leerURL() {
    const p = new URLSearchParams(window.location.search);
    estado.q = p.get('q') || '';
    estado.categoria = lista(p.get('cat'));
    estado.color = lista(p.get('color'));
    estado.talle = lista(p.get('talle'));
    estado.tipoDiseno = lista(p.get('diseno'));
    estado.tag = lista(p.get('tag'));
    estado.orden = p.get('orden') || 'destacados';
    estado.pagina = Math.max(1, Number(p.get('pag')) || 1);
  }

  function lista(v) { return v ? v.split(',').filter(Boolean) : []; }

  function escribirURL(reemplazar) {
    const p = new URLSearchParams();
    if (estado.q) p.set('q', estado.q);
    if (estado.categoria.length) p.set('cat', estado.categoria.join(','));
    if (estado.color.length) p.set('color', estado.color.join(','));
    if (estado.talle.length) p.set('talle', estado.talle.join(','));
    if (estado.tipoDiseno.length) p.set('diseno', estado.tipoDiseno.join(','));
    if (estado.tag.length) p.set('tag', estado.tag.join(','));
    if (estado.orden !== 'destacados') p.set('orden', estado.orden);
    if (estado.pagina > 1) p.set('pag', String(estado.pagina));

    const qs = p.toString();
    const url = window.location.pathname + (qs ? '?' + qs : '');
    if (reemplazar) window.history.replaceState({}, '', url);
    else window.history.pushState({}, '', url);
  }

  /* --------------------------------------------------------- FILTRO Y ORDEN */
  function normalizar(txt) {
    // Saca tildes para que "diseno" encuentre "diseño" y "bordo" encuentre "bordó".
    return String(txt || '').toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/ñ/g, 'n');
  }

  function coincideBusqueda(prod, q) {
    if (!q) return true;
    const aguja = normalizar(q);
    const pajar = normalizar([
      prod.nombre, prod.categoria, prod.tipoPrenda, prod.tipoDiseno,
      prod.descripcion, prod.tags.join(' '),
      prod.colores.map(c => c.nombre).join(' ')
    ].join(' '));
    // Todas las palabras tienen que aparecer.
    return aguja.split(/\s+/).filter(Boolean).every(t => pajar.indexOf(t) !== -1);
  }

  function filtrar() {
    return PRODUCTOS.filter(function (p) {
      if (!coincideBusqueda(p, estado.q)) return false;
      if (estado.categoria.length && estado.categoria.indexOf(p.categoria) === -1) return false;
      if (estado.tipoDiseno.length && estado.tipoDiseno.indexOf(p.tipoDiseno) === -1) return false;
      if (estado.tag.length && !estado.tag.some(t => p.tags.indexOf(t) !== -1)) return false;
      if (estado.color.length && !estado.color.some(c => p.colores.some(pc => pc.id === c))) return false;
      if (estado.talle.length && !estado.talle.some(t => p.talles.indexOf(t) !== -1)) return false;
      return true;
    });
  }

  function ordenar(arr) {
    const copia = arr.slice();
    switch (estado.orden) {
      case 'recientes':
        return copia.sort((a, b) => (a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : 0));
      case 'precio-asc':
        // Los "Consultar" van siempre al final, no arriba con precio 0.
        return copia.sort((a, b) => (a.precio == null) - (b.precio == null) || (a.precio || 0) - (b.precio || 0));
      case 'precio-desc':
        return copia.sort((a, b) => (a.precio == null) - (b.precio == null) || (b.precio || 0) - (a.precio || 0));
      default:
        return copia.sort((a, b) => (b.destacado === true) - (a.destacado === true) || a.orden - b.orden);
    }
  }

  /* ------------------------------------------------------------- FILTROS UI */
  function contar(clave, valor) {
    return PRODUCTOS.filter(function (p) {
      if (clave === 'categoria') return p.categoria === valor;
      if (clave === 'tipoDiseno') return p.tipoDiseno === valor;
      if (clave === 'tag') return p.tags.indexOf(valor) !== -1;
      return false;
    }).length;
  }

  function pintarFiltros() {
    /* Categorias */
    pintarChecks('#filtro-categoria', 'categoria', Object.keys(ETIQUETAS.categoria));
    /* Tipo de diseno */
    pintarChecks('#filtro-diseno', 'tipoDiseno', Object.keys(ETIQUETAS.tipoDiseno));
    /* Tematicas */
    pintarChecks('#filtro-tag', 'tag', TAGS_TEMATICOS);

    /* Colores: union de todas las paletas presentes en el catalogo. */
    const cont = $('#filtro-color');
    if (cont) {
      const vistos = {};
      PRODUCTOS.forEach(p => p.colores.forEach(function (c) { vistos[c.id] = c; }));
      const colores = Object.keys(vistos).map(k => vistos[k]);
      cont.innerHTML = colores.map(function (c) {
        const activo = estado.color.indexOf(c.id) !== -1;
        return (
          '<button class="filtro-color" type="button" style="--c:' + esc(c.hex) + '" ' +
            'data-filtro="color" data-valor="' + esc(c.id) + '" ' +
            'aria-pressed="' + activo + '" title="' + esc(c.nombre) + '">' +
            '<span class="visually-hidden">' + esc(c.nombre) + '</span>' +
          '</button>'
        );
      }).join('');
    }

    /* Talles: union de todos los talles cargados. */
    const contT = $('#filtro-talle');
    if (contT) {
      const set = [];
      PRODUCTOS.forEach(p => p.talles.forEach(function (t) { if (set.indexOf(t) === -1) set.push(t); }));
      const orden = ['S', 'M', 'L', 'XL', 'XXL', '6', '8', '10'];
      set.sort((a, b) => orden.indexOf(a) - orden.indexOf(b));
      contT.innerHTML = set.map(function (t) {
        const activo = estado.talle.indexOf(t) !== -1;
        return (
          '<button class="talle" type="button" data-filtro="talle" data-valor="' + esc(t) + '" ' +
            'aria-checked="' + activo + '" role="checkbox">' + esc(t) + '</button>'
        );
      }).join('');
    }
  }

  function pintarChecks(sel, clave, valores) {
    const cont = $(sel);
    if (!cont) return;
    const dicc = ETIQUETAS[clave === 'tipoDiseno' ? 'tipoDiseno' : clave] || {};
    // No se muestran opciones sin productos.
    const utiles = valores.filter(v => contar(clave, v) > 0);
    cont.innerHTML = utiles.map(function (v) {
      const activo = estado[clave].indexOf(v) !== -1;
      return (
        '<label class="check">' +
          '<input type="checkbox" data-filtro="' + clave + '" value="' + esc(v) + '"' + (activo ? ' checked' : '') + '>' +
          '<span class="check__caja" aria-hidden="true"></span>' +
          '<span class="check__texto">' + esc(dicc[v] || v) + '</span>' +
          '<span class="check__cant">(' + contar(clave, v) + ')</span>' +
        '</label>'
      );
    }).join('');
  }

  function pintarActivos() {
    const cont = $('#filtros-activos');
    if (!cont) return;
    const chips = [];

    if (estado.q) chips.push({ clave: 'q', valor: estado.q, texto: '"' + estado.q + '"' });
    estado.categoria.forEach(v => chips.push({ clave: 'categoria', valor: v, texto: ETIQUETAS.categoria[v] || v }));
    estado.tipoDiseno.forEach(v => chips.push({ clave: 'tipoDiseno', valor: v, texto: ETIQUETAS.tipoDiseno[v] || v }));
    estado.tag.forEach(v => chips.push({ clave: 'tag', valor: v, texto: ETIQUETAS.tag[v] || v }));
    estado.talle.forEach(v => chips.push({ clave: 'talle', valor: v, texto: 'Talle ' + v }));
    estado.color.forEach(function (v) {
      let nombre = v;
      PRODUCTOS.some(p => p.colores.some(function (c) { if (c.id === v) { nombre = c.nombre; return true; } }));
      chips.push({ clave: 'color', valor: v, texto: nombre });
    });

    cont.innerHTML = chips.map(c =>
      '<button class="activo" type="button" data-sacar="' + esc(c.clave) + '" data-valor="' + esc(c.valor) + '">' +
        esc(c.texto) + icon('cerrar', 12) +
      '</button>'
    ).join('');
  }

  /* ------------------------------------------------------------- GRILLA */
  /**
   * Área de imagen de una card. Siempre 7/8 y siempre recortada con cover,
   * para que la grilla quede pareja pase lo que pase con el asset.
   */
  function mediaProducto(img, clasePh, ansioso) {
    if (img && img.src && !img.w) {
      return '<img src="' + esc(img.src) + '" alt="' + esc(img.alt || '') + '" ' +
             'loading="' + (ansioso ? 'eager' : 'lazy') + '" decoding="async" ' +
             'style="object-position:' + esc(img.objectPosition || 'center') + '">';
    }
    /* Sin foto real todavía: placeholder con la misma caja. */
    return ph(img, { clase: clasePh, ratio: '7 / 8' });
  }

  /**
   * Imagen de la ficha. Acá se usa `contain` en vez de `cover`: la caja se
   * mantiene igual para todos los productos, pero no se recorta nada, así se
   * ve el diseño completo de la prenda.
   */
  function mediaGaleria(img, clasePh) {
    if (img && img.src && !img.w) {
      return '<img src="' + esc(img.src) + '" alt="' + esc(img.alt || '') + '">';
    }
    return ph(img, { clase: clasePh, ratio: '7 / 8' });
  }

  function cardProducto(p, i) {
    const precio = p.precio == null ? 'Consultar' : fmtPrecio(p.precio);
    return (
      '<article class="prod-card reveal">' +
        '<div class="prod-card__media">' +
          /* La primera fila se carga sin lazy: es la que entra en pantalla. */
          mediaProducto(p.imagenes[0], 'ph--compacto', i < 4) +
          '<span class="badge prod-card__badge">' + esc(ETIQUETAS.categoria[p.categoria] || p.categoria) + '</span>' +
        '</div>' +
        '<div class="prod-card__cuerpo">' +
          '<h3 class="prod-card__nombre" title="' + esc(p.nombre) + '">' + esc(p.nombre) + '</h3>' +
          '<p class="prod-card__precio' + (p.precio == null ? ' es-consultar' : '') + '">' + precio + '</p>' +
          '<button class="btn btn--solido btn--chico btn--bloque prod-card__cta" type="button" ' +
            'data-detalle="' + esc(p.slug) + '">Ver detalle</button>' +
        '</div>' +
      '</article>'
    );
  }

  function pintarGrilla() {
    const grilla = $('#grilla');
    const contador = $('#catalogo-contador');
    const vacio = $('#catalogo-vacio');
    if (!grilla) return;

    const resultado = ordenar(filtrar());
    const totalPaginas = Math.max(1, Math.ceil(resultado.length / POR_PAGINA));
    if (estado.pagina > totalPaginas) estado.pagina = totalPaginas;

    const desde = (estado.pagina - 1) * POR_PAGINA;
    const pagina = resultado.slice(desde, desde + POR_PAGINA);

    if (contador) {
      contador.innerHTML = resultado.length
        ? 'Mostrando <b>' + (desde + 1) + '&ndash;' + (desde + pagina.length) + '</b> de <b>' + resultado.length + '</b> ' +
          (resultado.length === 1 ? 'producto' : 'productos')
        : 'Sin resultados';
    }

    if (!resultado.length) {
      grilla.innerHTML = '';
      grilla.hidden = true;
      if (vacio) vacio.hidden = false;
      pintarPaginacion(1);
      return;
    }

    grilla.hidden = false;
    if (vacio) vacio.hidden = true;
    grilla.innerHTML = pagina.map(cardProducto).join('');
    BLONK.observarReveal(grilla);
    pintarPaginacion(totalPaginas);
  }

  function pintarPaginacion(totalPaginas) {
    const cont = $('#paginacion');
    if (!cont) return;

    if (totalPaginas <= 1) { cont.innerHTML = ''; return; }

    const actual = estado.pagina;
    const numeros = [];
    for (let i = 1; i <= totalPaginas; i++) {
      if (i === 1 || i === totalPaginas || Math.abs(i - actual) <= 1) numeros.push(i);
      else if (numeros[numeros.length - 1] !== '...') numeros.push('...');
    }

    cont.innerHTML =
      '<button class="paginacion__btn" type="button" data-pagina="' + (actual - 1) + '"' +
        (actual === 1 ? ' disabled' : '') + ' aria-label="Página anterior">&lsaquo;</button>' +
      numeros.map(function (n) {
        if (n === '...') return '<span class="paginacion__puntos" aria-hidden="true">&hellip;</span>';
        return '<button class="paginacion__btn" type="button" data-pagina="' + n + '"' +
          (n === actual ? ' aria-current="page"' : '') + '>' + n + '</button>';
      }).join('') +
      '<button class="paginacion__btn" type="button" data-pagina="' + (actual + 1) + '"' +
        (actual === totalPaginas ? ' disabled' : '') + ' aria-label="Página siguiente">&rsaquo;</button>';
  }

  function refrescar(opciones) {
    const o = opciones || {};
    pintarActivos();
    pintarGrilla();
    escribirURL(o.reemplazar !== false);
    const inp = $('#catalogo-q');
    if (inp && inp.value !== estado.q) inp.value = estado.q;
  }

  /* -------------------------------------------- FICHA EXPANDIBLE DE PRODUCTO */
  function abrirDetalle(slug, disparador) {
    const p = PRODUCTOS.find(x => x.slug === slug);
    const modal = $('#modal-producto');
    if (!p || !modal) return;

    const caja = $('#producto-contenido', modal);
    const sel = {
      color: p.colores[0],
      talle: p.talles.indexOf('M') !== -1 ? 'M' : p.talles[0],
      cantidad: 1,
      imagen: 0
    };
    const tipoTalles = p.categoria === 'buzos' ? 'buzos' : 'remeras';

    caja.innerHTML =
      '<div class="producto__layout">' +
        /* --- GALERIA: miniaturas + principal grande.
               Con una sola foto real la fila de miniaturas se oculta. --- */
        '<div class="galeria' + (p.imagenes.length < 2 ? ' galeria--simple' : '') + '">' +
          (p.imagenes.length > 1
            ? '<div class="galeria__thumbs" role="tablist" aria-label="Fotos de ' + esc(p.nombre) + '">' +
                p.imagenes.map(function (img, i) {
                  return '<button class="galeria__thumb" type="button" role="tab" data-thumb="' + i + '" ' +
                    'aria-current="' + (i === 0) + '" aria-label="Ver foto ' + (i + 1) + '">' +
                    mediaGaleria(img, 'ph--min') + '</button>';
                }).join('') +
              '</div>'
            : '') +
          '<div class="galeria__principal" id="galeria-principal">' +
            mediaGaleria(p.imagenes[0]) +
          '</div>' +
        '</div>' +

        /* --- INFORMACION --- */
        '<div class="producto__info">' +
          '<span class="badge producto__badge">' + esc(ETIQUETAS.categoria[p.categoria] || p.categoria) + '</span>' +
          '<h2 class="producto__nombre" id="producto-titulo">' + esc(p.nombre) + '</h2>' +
          '<p class="producto__tipo">' + esc(p.tipoPrenda) + '</p>' +
          '<p class="precio producto__precio' + (p.precio == null ? ' precio--consultar' : '') + '">' +
            (p.precio == null ? 'Precio a consultar' : fmtPrecio(p.precio)) + '</p>' +
          '<p class="producto__desc">' + esc(p.descripcion) + '</p>' +

          '<div class="producto__bloque">' +
            '<span class="paso-label">Color</span>' +
            '<div class="swatches" data-grupo-radio role="radiogroup" aria-label="Color de la prenda" id="det-colores">' +
              p.colores.map(function (c, i) {
                return '<button class="swatch" type="button" role="radio" data-valor="' + esc(c.id) + '" ' +
                  'aria-checked="' + (i === 0) + '" tabindex="' + (i === 0 ? '0' : '-1') + '">' +
                  '<span class="swatch__disco" style="--c:' + esc(c.hex) + '"></span>' +
                  '<span class="swatch__nombre">' + esc(c.nombre) + '</span></button>';
              }).join('') +
            '</div>' +
          '</div>' +

          '<div class="producto__bloque">' +
            '<div class="producto__bloque-head">' +
              '<span class="paso-label">Talle</span>' +
              '<button class="config__link-talles" type="button" data-abrir-talles="' + tipoTalles + '">' +
                'Guía de talles</button>' +
            '</div>' +
            '<div class="talles" data-grupo-radio role="radiogroup" aria-label="Talle" id="det-talles">' +
              p.talles.map(function (t) {
                return '<button class="talle" type="button" role="radio" data-valor="' + esc(t) + '" ' +
                  'aria-checked="' + (t === sel.talle) + '" tabindex="' + (t === sel.talle ? '0' : '-1') + '">' +
                  esc(t) + '</button>';
              }).join('') +
            '</div>' +
          '</div>' +

          '<div class="producto__bloque">' +
            '<span class="paso-label">Cantidad</span>' +
            '<div class="cantidad" data-cantidad data-min="1" data-max="99">' +
              '<button class="cantidad__btn" type="button" data-cantidad-menos aria-label="Quitar una unidad">&minus;</button>' +
              '<input class="cantidad__valor" type="number" value="1" min="1" max="99" aria-label="Cantidad">' +
              '<button class="cantidad__btn" type="button" data-cantidad-mas aria-label="Sumar una unidad">+</button>' +
            '</div>' +
          '</div>' +

          '<div class="producto__acciones">' +
            '<button class="btn btn--primario btn--grande" type="button" id="det-agregar">' +
              icon('carrito', 20) + 'Agregar al carrito</button>' +
            '<button class="btn btn--solido" type="button" id="det-wsp">' +
              icon('wsp', 20) + 'Consultar por WhatsApp</button>' +
          '</div>' +

          /* --- Calidad / materiales / envio integrados en el detalle --- */
          '<div class="producto__fichas">' +
            '<details class="detalles">' +
              '<summary class="detalles__resumen">Calidad y materiales</summary>' +
              '<div class="detalles__cuerpo">' +
                '<ul class="detalles__lista">' +
                  '<li>' + esc(p.ficha.material) + '</li>' +
                  '<li>' + esc(p.ficha.dtf) + '</li>' +
                  '<li>' + esc(p.ficha.cuidado) + '</li>' +
                '</ul>' +
              '</div>' +
            '</details>' +
            '<details class="detalles">' +
              '<summary class="detalles__resumen">Cómo imprimimos (DTF)</summary>' +
              '<div class="detalles__cuerpo">' +
                '<p>Imprimimos el diseño en DTF y lo pasamos a la prenda con prensa de calor. ' +
                'Se consiguen colores intensos, buena definición en los detalles finos y una ' +
                'terminación prolija sobre tela clara u oscura.</p>' +
                '<p>Si mandás un archivo propio, lo preparamos antes de imprimir para que ' +
                'salga con el tamaño y la posición que buscás.</p>' +
              '</div>' +
            '</details>' +
            '<details class="detalles">' +
              '<summary class="detalles__resumen">Envíos</summary>' +
              '<div class="detalles__cuerpo">' +
                '<p>Hacemos envíos a todo el país. El costo se calcula según destino, peso y ' +
                'modalidad, así que lo confirmamos al cerrar el pedido.</p>' +
                '<p>Para coordinarlo te vamos a pedir: nombre completo, DNI, email, código postal, ' +
                'localidad y teléfono.</p>' +
              '</div>' +
            '</details>' +
          '</div>' +
        '</div>' +
      '</div>';

    /* --- Galeria --- */
    const principal = $('#galeria-principal', caja);
    $$('[data-thumb]', caja).forEach(function (btn) {
      btn.addEventListener('click', function () {
        const i = Number(btn.dataset.thumb);
        if (i === sel.imagen) return;
        sel.imagen = i;
        $$('[data-thumb]', caja).forEach(b => b.setAttribute('aria-current', String(Number(b.dataset.thumb) === i)));
        principal.classList.add('esta-cambiando');
        window.setTimeout(function () {
          principal.innerHTML = mediaGaleria(p.imagenes[i]);
          principal.classList.remove('esta-cambiando');
        }, 130);
      });
    });

    /* --- Selectores --- */
    const gColores = $('#det-colores', caja);
    if (gColores) gColores.addEventListener('blonk:cambio', function (e) {
      sel.color = p.colores.find(c => c.id === e.detail.valor) || sel.color;
    });
    const gTalles = $('#det-talles', caja);
    if (gTalles) gTalles.addEventListener('blonk:cambio', function (e) { sel.talle = e.detail.valor; });
    const cantCaja = $('[data-cantidad]', caja);
    if (cantCaja) cantCaja.addEventListener('blonk:cantidad', function (e) { sel.cantidad = e.detail.valor; });

    BLONK.initGruposRadio(caja);
    BLONK.initCantidades(caja);

    /* --- Acciones --- */
    $('#det-agregar', caja).addEventListener('click', function () {
      BLONK.carrito.agregar(p, {
        colorId: sel.color.id, colorNombre: sel.color.nombre, colorHex: sel.color.hex,
        talle: sel.talle, cantidad: sel.cantidad, img: p.imagenes[0]
      });
      BLONK.ui.cerrar(modal);
      BLONK.carrito.abrir();
    });

    $('#det-wsp', caja).addEventListener('click', function () {
      BLONK.carrito.consultar(
        'Hola BLONK! Me interesa "' + p.nombre + '" en color ' + sel.color.nombre +
        ', talle ' + sel.talle + ', cantidad ' + sel.cantidad + '.'
      );
    });

    /* --- Abrir --- */
    BLONK.ui.abrir(modal, {
      disparador: disparador || null,
      alCerrar: function () {
        // Saca ?producto= sin tocar filtros ni scroll.
        const pms = new URLSearchParams(window.location.search);
        if (pms.has('producto')) { pms.delete('producto'); escribirURL(true); }
      }
    });

    // Deja el producto en la URL para poder compartir la ficha.
    const pms = new URLSearchParams(window.location.search);
    pms.set('producto', p.slug);
    window.history.replaceState({}, '', window.location.pathname + '?' + pms.toString());
  }

  /* --------------------------------------------------------------- EVENTOS */
  function initEventos() {
    /* Buscador de la pagina */
    const form = $('#catalogo-form');
    if (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        estado.q = $('#catalogo-q').value.trim();
        estado.pagina = 1;
        refrescar();
      });
    }

    /* Checkboxes (categoria / diseno / tematica) */
    $('#filtros').addEventListener('change', function (e) {
      const inp = e.target.closest('input[data-filtro]');
      if (!inp) return;
      const clave = inp.dataset.filtro;
      const valor = inp.value;
      const i = estado[clave].indexOf(valor);
      if (inp.checked && i === -1) estado[clave].push(valor);
      if (!inp.checked && i !== -1) estado[clave].splice(i, 1);
      estado.pagina = 1;
      refrescar();
    });

    /* Botones de color y talle */
    $('#filtros').addEventListener('click', function (e) {
      const btn = e.target.closest('button[data-filtro]');
      if (!btn) return;
      const clave = btn.dataset.filtro;
      const valor = btn.dataset.valor;
      const i = estado[clave].indexOf(valor);
      if (i === -1) estado[clave].push(valor); else estado[clave].splice(i, 1);
      const activo = i === -1;
      if (clave === 'color') btn.setAttribute('aria-pressed', String(activo));
      else btn.setAttribute('aria-checked', String(activo));
      estado.pagina = 1;
      refrescar();
    });

    /* Limpiar todo */
    const limpiar = $('#filtros-limpiar');
    if (limpiar) limpiar.addEventListener('click', function () {
      estado.q = '';
      estado.categoria = []; estado.color = []; estado.talle = [];
      estado.tipoDiseno = []; estado.tag = [];
      estado.pagina = 1;
      pintarFiltros();
      refrescar();
    });

    /* Chips de filtro activo */
    const activos = $('#filtros-activos');
    if (activos) activos.addEventListener('click', function (e) {
      const btn = e.target.closest('[data-sacar]');
      if (!btn) return;
      const clave = btn.dataset.sacar;
      if (clave === 'q') estado.q = '';
      else {
        const i = estado[clave].indexOf(btn.dataset.valor);
        if (i !== -1) estado[clave].splice(i, 1);
      }
      estado.pagina = 1;
      pintarFiltros();
      refrescar();
    });

    /* Orden */
    const orden = $('#catalogo-orden');
    if (orden) orden.addEventListener('change', function () {
      estado.orden = orden.value;
      estado.pagina = 1;
      refrescar();
    });

    /* Paginacion */
    const pag = $('#paginacion');
    if (pag) pag.addEventListener('click', function (e) {
      const btn = e.target.closest('[data-pagina]');
      if (!btn || btn.disabled) return;
      estado.pagina = Number(btn.dataset.pagina);
      refrescar();
      const ancla = $('#catalogo-top');
      if (ancla) ancla.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    /* Ver detalle */
    const grilla = $('#grilla');
    if (grilla) grilla.addEventListener('click', function (e) {
      const btn = e.target.closest('[data-detalle]');
      if (!btn) return;
      abrirDetalle(btn.dataset.detalle, btn);
    });

    /* Drawer de filtros en mobile */
    const panel = $('#filtros');
    const abrirF = $('#btn-filtros');
    if (panel && abrirF) {
      abrirF.addEventListener('click', function () {
        BLONK.ui.abrir(panel, { disparador: abrirF });
      });
      $$('[data-filtros-cerrar]', panel).forEach(function (b) {
        b.addEventListener('click', () => BLONK.ui.cerrar(panel));
      });
      // Al pasar a desktop el panel vuelve a ser sidebar fija.
      const mq = window.matchMedia('(min-width: 900px)');
      const onCambio = () => { if (mq.matches && BLONK.ui.estaAbierto(panel)) BLONK.ui.cerrar(panel); };
      if (mq.addEventListener) mq.addEventListener('change', onCambio);
      else if (mq.addListener) mq.addListener(onCambio);
    }

    /* Cerrar ficha de producto */
    const modal = $('#modal-producto');
    if (modal) $$('[data-cerrar-modal]', modal).forEach(function (b) {
      b.addEventListener('click', () => BLONK.ui.cerrar(modal));
    });

    /* Boton atras del navegador */
    window.addEventListener('popstate', function () {
      leerURL();
      pintarFiltros();
      const ordenSel = $('#catalogo-orden');
      if (ordenSel) ordenSel.value = estado.orden;
      pintarActivos();
      pintarGrilla();
      const inp = $('#catalogo-q');
      if (inp) inp.value = estado.q;
    });
  }

  /* --------------------------------------------------------------- PUBLICO */
  /* Lo usa ui.js: si ya estamos en el catalogo, filtra sin recargar. */
  BLONK.catalogo = {
    buscar: function (q) {
      estado.q = q || '';
      estado.pagina = 1;
      refrescar();
      BLONK.ui.cerrarTodo();
      const ancla = $('#catalogo-top');
      if (ancla) ancla.scrollIntoView({ behavior: 'smooth', block: 'start' });
    },
    abrirDetalle: abrirDetalle
  };

  /* ------------------------------------------------------------------ INIT */
  function arrancar() {
    leerURL();

    const ordenSel = $('#catalogo-orden');
    if (ordenSel) ordenSel.value = estado.orden;
    const inp = $('#catalogo-q');
    if (inp) inp.value = estado.q;

    pintarFiltros();
    refrescar({ reemplazar: true });
    initEventos();

    /* Deep link a una ficha concreta: catalogo.html?producto=slug */
    const slug = new URLSearchParams(window.location.search).get('producto');
    if (slug) window.setTimeout(() => abrirDetalle(slug, null), 120);
  }

  document.addEventListener('DOMContentLoaded', function () {
    /* Primero intentamos traer el catálogo en vivo de Supabase; el loader
       reemplaza PRODUCTOS en el lugar (misma referencia que ya capturamos).
       Si no existe el loader o falla, arrancamos con el catálogo estático.
       cargarProductos() nunca rechaza, así que la web siempre se dibuja. */
    const carga = (BLONK.cargarProductos ? BLONK.cargarProductos() : Promise.resolve());
    carga.then(arrancar, arrancar);
  });
})();
