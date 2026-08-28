/* ============================================================================
   BLONK · js/admin.js
   ----------------------------------------------------------------------------
   Panel de administración del catálogo. Todo contra Supabase:
     · Auth  -> login email + contraseña (signInWithPassword).
     · DB    -> tabla `productos` (insert / update / delete / select).
     · Storage -> bucket de fotos (upload / getPublicUrl / remove).

   Reutiliza helpers del sitio (window.BLONK: esc, fmtPrecio, toast, ui.abrir…)
   y las paletas de color de data/productos.js (window.BLONK_DATA).
   ========================================================================== */
(function () {
  'use strict';

  const BLONK = (window.BLONK = window.BLONK || {});
  const { $, $$, esc, fmtPrecio, toast } = BLONK;
  const DATA = window.BLONK_DATA || {};
  const cfg = window.BLONK_SUPABASE || {};

  const COLORES_REMERA = DATA.COLORES_REMERA || [];
  const COLORES_BUZO = DATA.COLORES_BUZO || [];

  const TALLES_TODOS = ['S', 'M', 'L', 'XL', 'XXL', '6', '8', '10'];
  const TALLES_DEFECTO = {
    remeras: ['S', 'M', 'L', 'XL', 'XXL', '6', '8', '10'],
    personalizados: ['S', 'M', 'L', 'XL', 'XXL', '6', '8', '10'],
    buzos: ['S', 'M', 'L', 'XL', 'XXL'],
    conjuntos: ['S', 'M', 'L', 'XL', 'XXL']
  };
  const TAGS_TODOS = ['unisex', 'urbano', 'argentina', 'futbol', 'blonk', 'minimal', 'oversize', 'personalizados'];
  const CAT_ETIQUETA = { remeras: 'Remeras', buzos: 'Buzos', conjuntos: 'Conjuntos', personalizados: 'Personalizados' };

  let sb = null;          // cliente Supabase
  let productos = [];     // todas las filas (incluye ocultos)
  let editandoId = null;  // id en edición, o null si es alta
  let fotoArchivo = null; // File seleccionado en el editor (o null)
  let borrarId = null;    // id pendiente de borrado

  /* ------------------------------------------------------------- UTILES */
  function slugify(txt) {
    return String(txt || '')
      .toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/ñ/g, 'n')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  function paletaDe(categoria) {
    return (categoria === 'buzos' || categoria === 'conjuntos') ? COLORES_BUZO : COLORES_REMERA;
  }

  /* Si la URL apunta a NUESTRO bucket, devuelve el path del objeto; si no, null.
     Sirve para no intentar borrar fotos que viven en /assets del repo. */
  function pathEnBucket(url) {
    if (!url || !cfg.url) return null;
    const marca = '/storage/v1/object/public/' + cfg.bucket + '/';
    const i = url.indexOf(marca);
    return i === -1 ? null : decodeURIComponent(url.slice(i + marca.length));
  }

  /* ------------------------------------------------------------- AUTH */
  function initCliente() {
    if (sb) return sb;
    if (!window.supabase || !cfg.url || !cfg.publishable) return null;
    sb = window.supabase.createClient(cfg.url, cfg.publishable);
    return sb;
  }

  function mostrarLogin(mensaje) {
    $('#login-pantalla').hidden = false;
    $('#panel').hidden = true;
    const err = $('#login-error');
    if (mensaje) { err.textContent = mensaje; err.classList.add('is-visible'); }
    else { err.textContent = ''; err.classList.remove('is-visible'); }
  }

  function mostrarPanel(user) {
    $('#login-pantalla').hidden = true;
    $('#panel').hidden = false;
    const u = $('#admin-user');
    if (u && user) u.textContent = user.email || '';
    cargar();
  }

  function initLogin() {
    const form = $('#login-form');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      const btn = $('#login-btn');
      const email = $('#login-email').value.trim();
      const pass = $('#login-pass').value;
      if (!sb) { mostrarLogin('No se pudo conectar con Supabase. Revisá js/supabase-config.js.'); return; }

      btn.disabled = true;
      btn.textContent = 'Entrando…';
      sb.auth.signInWithPassword({ email: email, password: pass }).then(function (resp) {
        btn.disabled = false;
        btn.textContent = 'Entrar';
        if (resp.error) {
          mostrarLogin('Email o contraseña incorrectos.');
          return;
        }
        $('#login-pass').value = '';
        // onAuthStateChange se encarga de mostrar el panel.
      });
    });

    $('#btn-salir').addEventListener('click', function () {
      if (sb) sb.auth.signOut();
    });
  }

  /* ------------------------------------------------------- CARGA / LISTADO */
  function cargar() {
    const cargando = $('#admin-cargando');
    const grilla = $('#admin-grilla');
    const vacio = $('#admin-vacio');
    cargando.hidden = false;
    grilla.hidden = true;
    vacio.hidden = true;

    sb.from('productos')
      .select('*')
      .order('orden', { ascending: true })
      .order('id', { ascending: true })
      .then(function (resp) {
        cargando.hidden = true;
        if (resp.error) {
          toast('No se pudieron cargar los productos.');
          return;
        }
        productos = resp.data || [];
        render();
      });
  }

  function productosFiltrados() {
    const q = slugify($('#admin-buscar').value);
    const cat = $('#admin-filtro-cat').value;
    return productos.filter(function (p) {
      if (cat && p.categoria !== cat) return false;
      if (q && slugify(p.nombre).indexOf(q) === -1) return false;
      return true;
    });
  }

  function cardHTML(p) {
    const oculto = !p.visible;
    const precio = (p.precio == null) ? 'Consultar' : fmtPrecio(p.precio);
    const media = p.imagen_url
      ? '<img src="' + esc(p.imagen_url) + '" alt="' + esc(p.nombre) + '" loading="lazy">'
      : '<span class="admin-card__sinfoto">Sin foto</span>';

    return (
      '<article class="admin-card' + (oculto ? ' es-oculto' : '') + '">' +
        '<div class="admin-card__media">' +
          media +
          '<span class="admin-card__estado ' + (oculto ? 'es-oculto' : 'es-visible') + '">' +
            (oculto ? 'Oculto' : 'Visible') + '</span>' +
          (p.destacado
            ? '<span class="admin-card__destacado" title="Destacado">' +
                '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.8-5.2 2.8 1-5.8L3.5 9.7l5.9-.9z"/></svg></span>'
            : '') +
        '</div>' +
        '<div class="admin-card__cuerpo">' +
          '<span class="admin-card__cat">' + esc(CAT_ETIQUETA[p.categoria] || p.categoria) + '</span>' +
          '<h3 class="admin-card__nombre">' + esc(p.nombre) + '</h3>' +
          '<p class="admin-card__precio' + (p.precio == null ? ' es-consultar' : '') + '">' + precio + '</p>' +
        '</div>' +
        '<div class="admin-card__acciones">' +
          '<button class="admin-mini btn--full" type="button" data-editar="' + p.id + '">' +
            '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20l4.5-1L20 7.5 16.5 4 5 15.5z"/><path d="M15 5.5L18.5 9"/></svg>' +
            'Editar</button>' +
          '<button class="admin-mini" type="button" data-toggle="' + p.id + '">' +
            (oculto ? 'Mostrar' : 'Ocultar') + '</button>' +
          '<button class="admin-mini admin-mini--peligro" type="button" data-borrar="' + p.id + '">Eliminar</button>' +
        '</div>' +
      '</article>'
    );
  }

  function render() {
    const grilla = $('#admin-grilla');
    const vacio = $('#admin-vacio');
    const contador = $('#admin-contador');
    const lista = productosFiltrados();

    const total = productos.length;
    const ocultos = productos.filter(p => !p.visible).length;
    contador.innerHTML = 'Mostrando <b>' + lista.length + '</b> de <b>' + total + '</b> ' +
      (total === 1 ? 'producto' : 'productos') +
      (ocultos ? ' · <b>' + ocultos + '</b> ' + (ocultos === 1 ? 'oculto' : 'ocultos') : '');

    if (!lista.length) {
      grilla.hidden = true; grilla.innerHTML = '';
      vacio.hidden = false;
      return;
    }
    vacio.hidden = true;
    grilla.hidden = false;
    grilla.innerHTML = lista.map(cardHTML).join('');
  }

  /* ------------------------------------------------------------- CHIPS */
  function pintarChips(cont, opciones, activos) {
    cont.innerHTML = opciones.map(function (v) {
      const on = activos.indexOf(v) !== -1;
      return '<button class="chip-check' + (on ? ' es-activo' : '') + '" type="button" data-chip="' + esc(v) + '">' + esc(v) + '</button>';
    }).join('');
  }
  function leerChips(cont) {
    return $$('.chip-check.es-activo', cont).map(b => b.dataset.chip);
  }
  function initChips(cont) {
    cont.addEventListener('click', function (e) {
      const b = e.target.closest('.chip-check');
      if (b) b.classList.toggle('es-activo');
    });
  }

  /* --------------------------------------------------------- COLOR SELECT */
  function pintarColores(categoria, selId) {
    const sel = $('#f-color');
    const pal = paletaDe(categoria);
    const hay = pal.some(c => c.id === selId);
    sel.innerHTML = pal.map(function (c) {
      return '<option value="' + esc(c.id) + '" data-hex="' + esc(c.hex) + '" data-nombre="' + esc(c.nombre) + '"' +
        ((hay ? c.id === selId : c === pal[0]) ? ' selected' : '') + '>' + esc(c.nombre) + '</option>';
    }).join('');
  }

  /* --------------------------------------------------------------- EDITOR */
  function abrirEditor(prod) {
    editandoId = prod ? prod.id : null;
    fotoArchivo = null;

    $('#editor-titulo').textContent = prod ? 'Editar producto' : 'Nuevo producto';
    $('#editor-guardar').textContent = prod ? 'Guardar cambios' : 'Crear producto';

    const categoria = prod ? prod.categoria : 'remeras';
    $('#f-nombre').value = prod ? (prod.nombre || '') : '';
    $('#f-precio').value = (prod && prod.precio != null) ? prod.precio : '';
    $('#f-categoria').value = categoria;
    pintarColores(categoria, prod ? prod.color_id : null);
    $('#f-visible').checked = prod ? !!prod.visible : true;
    $('#f-destacado').checked = prod ? !!prod.destacado : false;
    $('#f-diseno').value = (prod && prod.tipo_diseno) ? prod.tipo_diseno : 'clasico';
    $('#f-descripcion').value = (prod && prod.descripcion) ? prod.descripcion : '';
    $('#f-slug').value = prod ? (prod.slug || '') : '';

    const ordenDefecto = productos.reduce((m, p) => Math.max(m, p.orden || 0), 0) + 1;
    $('#f-orden').value = prod ? (prod.orden != null ? prod.orden : '') : ordenDefecto;

    pintarChips($('#f-talles'), TALLES_TODOS,
      (prod && prod.talles && prod.talles.length) ? prod.talles : TALLES_DEFECTO[categoria]);
    pintarChips($('#f-tags'), TAGS_TODOS,
      (prod && prod.tags && prod.tags.length) ? prod.tags : ['unisex']);

    /* Foto */
    const preview = $('#foto-preview');
    const drop = $('#foto-drop');
    $('#foto-input').value = '';
    if (prod && prod.imagen_url) {
      preview.src = prod.imagen_url; preview.hidden = false; drop.classList.add('tiene-foto');
    } else {
      preview.src = ''; preview.hidden = true; drop.classList.remove('tiene-foto');
    }

    BLONK.ui.abrir($('#modal-editor'));
  }

  function initEditor() {
    // Cerrar
    $$('[data-cerrar-editor]').forEach(b => b.addEventListener('click', () => BLONK.ui.cerrar($('#modal-editor'))));

    // Nombre -> slug automático (solo si el slug está vacío o es alta sin tocar)
    $('#f-nombre').addEventListener('input', function () {
      const slugCampo = $('#f-slug');
      if (editandoId) return; // en edición no repisamos el slug existente
      slugCampo.value = slugify($('#f-categoria').value + '-' + this.value);
    });

    // Cambio de categoría -> repinta colores (y talles si es alta)
    $('#f-categoria').addEventListener('change', function () {
      const cat = this.value;
      const colorActual = $('#f-color').value;
      pintarColores(cat, colorActual);
      if (!editandoId) {
        pintarChips($('#f-talles'), TALLES_TODOS, TALLES_DEFECTO[cat]);
        $('#f-slug').value = slugify(cat + '-' + $('#f-nombre').value);
      }
    });

    // Selección de foto -> preview
    $('#foto-input').addEventListener('change', function () {
      const file = this.files && this.files[0];
      if (!file) return;
      fotoArchivo = file;
      const preview = $('#foto-preview');
      preview.src = URL.createObjectURL(file);
      preview.hidden = false;
      $('#foto-drop').classList.add('tiene-foto');
      $('#foto-hint').innerHTML = 'Cambiar foto<br><small>' + esc(file.name) + '</small>';
    });

    initChips($('#f-talles'));
    initChips($('#f-tags'));

    // Guardar
    $('#editor-form').addEventListener('submit', onGuardar);
  }

  /* --------------------------------------------------------------- GUARDAR */
  function onGuardar(e) {
    e.preventDefault();
    const btn = $('#editor-guardar');
    const nombre = $('#f-nombre').value.trim();
    if (!nombre) { toast('Poné un nombre.'); return; }

    const categoria = $('#f-categoria').value;
    const precioRaw = $('#f-precio').value.trim();
    const colorSel = $('#f-color').options[$('#f-color').selectedIndex];
    const ordenRaw = $('#f-orden').value.trim();

    let slug = slugify($('#f-slug').value) || slugify(categoria + '-' + nombre) || ('producto-' + Date.now().toString(36));

    const payload = {
      nombre: nombre,
      categoria: categoria,
      precio: precioRaw === '' ? null : Math.round(Number(precioRaw)),
      color_id: colorSel ? colorSel.value : 'negro',
      color_nombre: colorSel ? colorSel.dataset.nombre : 'Negro',
      color_hex: colorSel ? colorSel.dataset.hex : '#151515',
      talles: leerChips($('#f-talles')),
      tags: leerChips($('#f-tags')),
      tipo_diseno: $('#f-diseno').value,
      descripcion: $('#f-descripcion').value.trim() || null,
      destacado: $('#f-destacado').checked,
      visible: $('#f-visible').checked,
      orden: ordenRaw === '' ? 0 : Math.round(Number(ordenRaw)),
      slug: slug
    };
    if (!payload.talles.length) payload.talles = TALLES_DEFECTO[categoria];
    if (!payload.tags.length) payload.tags = ['unisex'];

    btn.disabled = true;
    btn.textContent = 'Guardando…';

    const previo = editandoId ? productos.find(p => p.id === editandoId) : null;

    // 1) Subir foto si hay una nueva, luego 2) guardar la fila.
    subirFotoSiHay().then(function (nuevaUrl) {
      if (nuevaUrl) payload.imagen_url = nuevaUrl;

      const op = editandoId
        ? sb.from('productos').update(payload).eq('id', editandoId).select().single()
        : sb.from('productos').insert(payload).select().single();

      return op.then(function (resp) {
        if (resp.error) throw resp.error;
        // Si reemplazamos la foto, borramos la anterior del bucket (si era nuestra).
        if (nuevaUrl && previo && previo.imagen_url) {
          const viejo = pathEnBucket(previo.imagen_url);
          if (viejo) sb.storage.from(cfg.bucket).remove([viejo]);
        }
        return resp.data;
      });
    }).then(function () {
      btn.disabled = false;
      btn.textContent = editandoId ? 'Guardar cambios' : 'Crear producto';
      BLONK.ui.cerrar($('#modal-editor'));
      toast(editandoId ? 'Producto actualizado.' : 'Producto creado.');
      cargar();
    }).catch(function (err) {
      btn.disabled = false;
      btn.textContent = editandoId ? 'Guardar cambios' : 'Crear producto';
      if (err && (err.code === '23505' || /duplicate|unique/i.test(err.message || ''))) {
        toast('Ya existe un producto con ese identificador (slug). Cambialo en Avanzado.');
      } else {
        toast('No se pudo guardar. ' + ((err && err.message) || ''));
      }
    });
  }

  function subirFotoSiHay() {
    if (!fotoArchivo) return Promise.resolve(null);
    const ext = (fotoArchivo.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
    const path = Date.now() + '-' + slugify($('#f-nombre').value || 'producto').slice(0, 40) + '.' + ext;
    return sb.storage.from(cfg.bucket).upload(path, fotoArchivo, {
      cacheControl: '3600', upsert: false, contentType: fotoArchivo.type || undefined
    }).then(function (resp) {
      if (resp.error) throw resp.error;
      return sb.storage.from(cfg.bucket).getPublicUrl(path).data.publicUrl;
    });
  }

  /* ------------------------------------------------- TOGGLE / BORRAR */
  function toggleVisible(id) {
    const p = productos.find(x => x.id === id);
    if (!p) return;
    sb.from('productos').update({ visible: !p.visible }).eq('id', id).then(function (resp) {
      if (resp.error) { toast('No se pudo actualizar.'); return; }
      p.visible = !p.visible;
      render();
      toast(p.visible ? 'Producto visible.' : 'Producto oculto.');
    });
  }

  function pedirBorrar(id) {
    const p = productos.find(x => x.id === id);
    if (!p) return;
    borrarId = id;
    $('#confirm-nombre').textContent = p.nombre;
    BLONK.ui.abrir($('#modal-confirm'));
  }

  function confirmarBorrar() {
    if (borrarId == null) return;
    const id = borrarId;
    const p = productos.find(x => x.id === id);
    const btn = $('#confirm-borrar');
    btn.disabled = true; btn.textContent = 'Eliminando…';

    sb.from('productos').delete().eq('id', id).then(function (resp) {
      btn.disabled = false; btn.textContent = 'Sí, eliminar';
      if (resp.error) { toast('No se pudo eliminar.'); return; }
      // Borra la foto del bucket si era nuestra.
      const path = p && pathEnBucket(p.imagen_url);
      if (path) sb.storage.from(cfg.bucket).remove([path]);
      borrarId = null;
      BLONK.ui.cerrar($('#modal-confirm'));
      productos = productos.filter(x => x.id !== id);
      render();
      toast('Producto eliminado.');
    });
  }

  /* ------------------------------------------------------------- EVENTOS */
  function initEventos() {
    $('#admin-buscar').addEventListener('input', render);
    $('#admin-filtro-cat').addEventListener('change', render);
    $('#btn-nuevo').addEventListener('click', () => abrirEditor(null));

    $('#admin-grilla').addEventListener('click', function (e) {
      const ed = e.target.closest('[data-editar]');
      const tg = e.target.closest('[data-toggle]');
      const br = e.target.closest('[data-borrar]');
      if (ed) { const p = productos.find(x => x.id === Number(ed.dataset.editar)); if (p) abrirEditor(p); }
      else if (tg) toggleVisible(Number(tg.dataset.toggle));
      else if (br) pedirBorrar(Number(br.dataset.borrar));
    });

    $$('[data-cerrar-confirm]').forEach(b => b.addEventListener('click', () => BLONK.ui.cerrar($('#modal-confirm'))));
    $('#confirm-borrar').addEventListener('click', confirmarBorrar);
  }

  /* ---------------------------------------------------------------- INIT */
  document.addEventListener('DOMContentLoaded', function () {
    initLogin();
    initEditor();
    initEventos();

    if (!initCliente()) {
      mostrarLogin('Falta configurar Supabase (js/supabase-config.js) o no cargó el SDK.');
      return;
    }

    sb.auth.getSession().then(function (resp) {
      const session = resp.data ? resp.data.session : null;
      if (session) mostrarPanel(session.user);
      else mostrarLogin();
    });

    sb.auth.onAuthStateChange(function (_evento, session) {
      if (session) mostrarPanel(session.user);
      else mostrarLogin();
    });
  });
})();
