/* ============================================================================
   BLONK · js/supabase-productos.js
   ----------------------------------------------------------------------------
   Carga el catálogo EN VIVO desde Supabase y reemplaza los productos estáticos.

   Cómo encaja con el resto:
   · data/productos.js arma window.BLONK_DATA.PRODUCTOS con los 16 productos
     estáticos (derivados de nombres de archivo). Eso queda como FALLBACK.
   · Acá pedimos a Supabase los productos visibles y, si responde bien,
     REEMPLAZAMOS EN EL LUGAR el contenido de ese mismo array (splice + push),
     no lo reasignamos: así catalogo.js —que ya capturó la referencia— ve los
     datos nuevos sin cambios extra.
   · Si Supabase falla (sin red, mala config, RLS), no tocamos nada y el
     catálogo sigue mostrando los productos estáticos. La web nunca queda vacía.

   Expone: window.BLONK.cargarProductos() -> Promise
   ========================================================================== */
(function () {
  'use strict';

  const BLONK = (window.BLONK = window.BLONK || {});
  const cfg = window.BLONK_SUPABASE || {};
  const DATA = (window.BLONK_DATA = window.BLONK_DATA || {});

  /* Cliente Supabase (UMD del CDN expone `window.supabase`). */
  let cliente = null;
  function getCliente() {
    if (cliente) return cliente;
    if (!window.supabase || !cfg.url || !cfg.publishable) return null;
    cliente = window.supabase.createClient(cfg.url, cfg.publishable);
    return cliente;
  }
  BLONK.supabaseCliente = getCliente;

  /* categoría del catálogo -> config de prenda (precio, ficha, talles, tipo). */
  function cfgCategoria(categoria) {
    const P = DATA.PRENDAS || {};
    const mapa = {
      remeras: P.remera,
      buzos: P.buzo,
      conjuntos: P.conjunto,
      personalizados: P.estampado
    };
    return mapa[categoria] || P.remera || {
      categoria: 'remeras', tipoPrenda: 'Prenda', precio: null,
      talles: ['S', 'M', 'L', 'XL', 'XXL'],
      ficha: { material: '', dtf: '', cuidado: '' }
    };
  }

  /* Fila de la tabla `productos` -> objeto producto con el MISMO shape que usa
     catalogo.js (ver productoDesdeArchivo en data/productos.js). */
  function filaAProducto(row) {
    const prenda = cfgCategoria(row.categoria);
    const colorNombre = row.color_nombre || 'Negro';
    const color = {
      id: row.color_id || 'negro',
      nombre: colorNombre,
      hex: row.color_hex || '#151515'
    };

    const talles = (Array.isArray(row.talles) && row.talles.length)
      ? row.talles : prenda.talles;
    const tags = (Array.isArray(row.tags) && row.tags.length)
      ? row.tags : ['unisex'];

    const descripcion = row.descripcion ||
      (prenda.tipoPrenda + ' con estampado DTF de alta calidad. ' +
       'Diseño ' + row.nombre + ' sobre prenda ' + String(colorNombre).toLowerCase() + '.');

    /* Imagen: si hay URL usamos <img> real; si no, un placeholder con caja. */
    const imagen = row.imagen_url
      ? {
          src: row.imagen_url,
          alt: prenda.tipoPrenda + ' ' + row.nombre + ', color ' + String(colorNombre).toLowerCase(),
          objectPosition: 'center'
        }
      : { src: '', w: 1400, h: 1600, desc: 'Foto pendiente de ' + row.nombre + '.' };

    return {
      id: row.id,
      slug: row.slug,
      archivo: null,
      nombre: row.nombre,
      categoria: row.categoria,
      tipoPrenda: prenda.tipoPrenda,
      tipoDiseno: row.tipo_diseno || 'clasico',
      precio: (row.precio === undefined ? null : row.precio),
      orden: (row.orden == null ? 0 : row.orden),
      destacado: !!row.destacado,
      personalizable: true,
      descripcion: descripcion,
      colores: [color],
      talles: talles,
      tags: tags,
      ficha: prenda.ficha,
      imagenes: [imagen]
    };
  }

  BLONK.filaAProducto = filaAProducto;

  /**
   * Trae los productos VISIBLES desde Supabase y los vuelca en
   * window.BLONK_DATA.PRODUCTOS (en el lugar). Devuelve una promesa que
   * resuelve siempre (nunca rechaza): ante cualquier error deja el fallback.
   */
  function cargarProductos() {
    const sb = getCliente();
    const destino = DATA.PRODUCTOS;
    if (!sb || !Array.isArray(destino)) return Promise.resolve(false);

    return sb
      .from('productos')
      .select('*')
      .eq('visible', true)
      .order('orden', { ascending: true })
      .order('id', { ascending: true })
      .then(function (resp) {
        if (resp.error) throw resp.error;
        const filas = resp.data || [];
        if (!filas.length) return false; // sin datos: no piso el fallback
        const nuevos = filas.map(filaAProducto);
        destino.splice(0, destino.length);   // reemplazo EN EL LUGAR
        Array.prototype.push.apply(destino, nuevos);
        return true;
      })
      .catch(function (err) {
        // Silencioso a nivel UI: el catálogo sigue con los productos estáticos.
        if (window.console) console.warn('[BLONK] No se pudo cargar el catálogo desde Supabase, uso fallback estático.', err);
        return false;
      });
  }

  BLONK.cargarProductos = cargarProductos;
})();
