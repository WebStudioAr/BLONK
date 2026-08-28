/* ============================================================================
   BLONK · data/productos.js
   ----------------------------------------------------------------------------
   El catálogo se arma a partir de los archivos reales de /assets/productos.

   CONVENCIÓN DE NOMBRE DE ARCHIVO
       prenda_etiqueta_color.ext

       _   separa  tipo de prenda | etiqueta | color
       -   dentro de la etiqueta representa un espacio

       remera_malvinas-argentinas_negra.webp
         -> Prenda: Remera · Nombre: Malvinas Argentinas · Color: Negra

   PARA DAR DE ALTA UN PRODUCTO
       1. Dejá la foto en /assets/productos con ese formato de nombre.
       2. Sumá el nombre del archivo al array ARCHIVOS_PRODUCTOS.
       No hace falta tocar nada más: nombre, categoría, precio, color y filtros
       salen del nombre del archivo.

   PRECIOS CONFIRMADOS
       Remera ...... $20.000
       Buzo ........ $32.500
       Conjunto .... sin precio provisto -> "Consultar"
   ========================================================================== */

/* ---------------------------------------------------------------------------
   COLORES DE PRENDA — fuente única
   ---------------------------------------------------------------------------
   Estos hex son el color de tela plana: es exactamente el tono que va a tomar
   la prenda en el configurador. La foto blanca se multiplica encima, así que
   las sombras y los pliegues salen solos y acá NO hay que compensar nada:
   poner el color tal cual se quiere ver.
   -------------------------------------------------------------------------- */
const COLORES_PRENDA = {
  negro:         { nombre: 'Negro',        hex: '#151515' },
  blanco:        { nombre: 'Blanco',       hex: '#f1f0eb' },
  gris:          { nombre: 'Gris',         hex: '#858581' },
  'gris-melange':{ nombre: 'Gris Melange', hex: '#B4B4B0' },
  rojo:          { nombre: 'Rojo',         hex: '#a9292f' },
  bordo:         { nombre: 'Bordó',        hex: '#6c2431' },
  natural:       { nombre: 'Natural',      hex: '#d2c1a4' },
  violeta:       { nombre: 'Violeta',      hex: '#544078' },
  azul:          { nombre: 'Azul',         hex: '#315886' },
  'azul-marino': { nombre: 'Azul Marino',  hex: '#1d2940' },
  'azul-claro':  { nombre: 'Azul claro',   hex: '#9abbd0' },
  celeste:       { nombre: 'Celeste',      hex: '#92b7d0' },
  verde:         { nombre: 'Verde',        hex: '#29503b' },
  rosa:          { nombre: 'Rosa',         hex: '#ca6c88' },
  naranja:       { nombre: 'Naranja',      hex: '#d86728' }
};

/** Arma una paleta a partir de una lista de ids. */
function paleta(ids) {
  return ids.map(function (id) {
    const c = COLORES_PRENDA[id];
    return { id: id, nombre: c.nombre, hex: c.hex };
  });
}

const COLORES_REMERA = paleta([
  'blanco', 'negro', 'gris-melange', 'bordo', 'azul-marino',
  'natural', 'celeste', 'verde', 'rosa', 'naranja'
]);

/* Colores de buzo confirmados por el cliente, más blanco (que es el color de
   la propia prenda base). */
const COLORES_BUZO = paleta([
  'blanco', 'negro', 'gris', 'rojo', 'bordo', 'natural',
  'violeta', 'azul', 'verde', 'azul-claro'
]);

/* Índice de color por id, para resolver el color que sale del nombre de archivo. */
const COLORES_INDICE = {};
COLORES_REMERA.concat(COLORES_BUZO).forEach(function (c) { COLORES_INDICE[c.id] = c; });

const TALLES_ADULTO = ['S', 'M', 'L', 'XL', 'XXL'];
const TALLES_EXT    = ['S', 'M', 'L', 'XL', 'XXL', '6', '8', '10'];

/* Textos de calidad/materiales. NO agregar promesas no confirmadas
   (cantidad de lavados, garantías, plazos) hasta validarlas con BLONK. */
const FICHA_REMERA = {
  material: 'Algodón premium, calce unisex.',
  dtf: 'Estampado DTF de alta calidad: colores intensos, buena definición y terminación prolija.',
  cuidado: 'Lavar del revés con agua fría. No planchar sobre la estampa.'
};
const FICHA_BUZO = {
  material: 'Frisado premium, calce unisex.',
  dtf: 'Estampado DTF de alta calidad: colores intensos, buena definición y terminación prolija.',
  cuidado: 'Lavar del revés con agua fría. No planchar sobre la estampa.'
};

/* ---------------------------------------------------------------------------
   ARCHIVOS REALES EN /assets/productos
   -------------------------------------------------------------------------- */
const ARCHIVOS_PRODUCTOS = [
  'remera_angel-armado_negra.jpg',
  'remera_michael-jordan_negra.jpg',
  'remera_honda-racing_negra.jpg',
  'remera_nike-dibujo_blanca.jpg',
  'remera_maradona-al-amigo-todo-al-enemigo-ni-justicia_negra.jpg',
  'remera_airbag-calavera_negra.jpg',
  'remera_michael-jordan-goat_negra.jpg',
  'remera_malvias-argentinas-tres-estrellas_negra.jpg',
  'buzo_nike-simple_negro.jpg',
  'buzo_adidas-simple_azul.jpg',
  'buzo_milo-j_negro.jpg',
  'buzo_honda-simple_negro.jpg',
  'buzo_nike-air-jordan_negro.jpg',
  'buzo_malvinas-argentinas_negro.jpg',
  'buzo_malvinas-argentinas-tres-estrellas_negro.jpg',
  'conjunto_blonk_negro.jpg'
];

/* Config por tipo de prenda: precio, talles, ficha y categoría del catálogo. */
const PRENDAS = {
  remera:    { categoria: 'remeras',        tipoPrenda: 'Remera unisex',   precio: 20000, talles: TALLES_EXT,    ficha: FICHA_REMERA, paleta: COLORES_REMERA },
  buzo:      { categoria: 'buzos',          tipoPrenda: 'Buzo unisex',     precio: 32500, talles: TALLES_ADULTO, ficha: FICHA_BUZO,   paleta: COLORES_BUZO },
  conjunto:  { categoria: 'conjuntos',      tipoPrenda: 'Conjunto unisex', precio: null,  talles: TALLES_ADULTO, ficha: FICHA_BUZO,   paleta: COLORES_BUZO },
  estampado: { categoria: 'personalizados', tipoPrenda: 'Estampado DTF',   precio: null,  talles: TALLES_EXT,    ficha: FICHA_REMERA, paleta: COLORES_REMERA }
};

/* Color que viene en el nombre del archivo -> id de la paleta.
   El nombre visible se conserva tal cual aparece en el archivo (Negra / Negro). */
const COLOR_ARCHIVO = {
  negra: 'negro', negro: 'negro',
  blanca: 'blanco', blanco: 'blanco',
  azul: 'azul', 'azul-claro': 'azul-claro',
  gris: 'gris', roja: 'rojo', rojo: 'rojo',
  bordo: 'bordo', natural: 'natural',
  violeta: 'violeta', verde: 'verde', naranja: 'naranja', rosa: 'rosa',
  celeste: 'celeste', 'gris-melange': 'gris-melange', 'azul-marino': 'azul-marino'
};

/* Palabras que no van en Title Case (siglas y marcas). */
const MAYUSCULAS = { blonk: 'BLONK', goat: 'GOAT', dtf: 'DTF', j: 'J' };

/* Correcciones de etiqueta SOLO para lo que se muestra en pantalla.
   Los nombres de archivo quedan intactos: no se renombra nada del cliente.
   · "malvias" es un error de tipeo en el nombre del archivo original. */
const ETIQUETAS_CORREGIDAS = {
  'malvias-argentinas-tres-estrellas': 'Malvinas Argentinas Tres Estrellas'
};

/* Temáticas por etiqueta, para que los filtros del catálogo tengan contenido real. */
const TAGS_POR_ETIQUETA = {
  'malvinas-argentinas': ['argentina'],
  'malvinas-argentinas-tres-estrellas': ['argentina'],
  'malvias-argentinas-tres-estrellas': ['argentina'],
  'maradona-al-amigo-todo-al-enemigo-ni-justicia': ['argentina', 'futbol'],
  'michael-jordan': ['urbano'],
  'michael-jordan-goat': ['urbano'],
  'nike-air-jordan': ['urbano'],
  'nike-simple': ['urbano'],
  'nike-dibujo': ['urbano'],
  'adidas-simple': ['urbano'],
  'honda-racing': ['urbano'],
  'honda-simple': ['urbano'],
  'milo-j': ['urbano'],
  'angel-armado': ['urbano'],
  'airbag-calavera': ['urbano'],
  'blonk': ['blonk']
};

/* Tipo de diseño por etiqueta (alimenta el filtro "Tipo de diseño"). */
const DISENO_POR_ETIQUETA = {
  'nike-simple': 'minimal',
  'adidas-simple': 'minimal',
  'honda-simple': 'minimal',
  'maradona-al-amigo-todo-al-enemigo-ni-justicia': 'tipografico',
  'michael-jordan-goat': 'tipografico',
  'angel-armado': 'graffiti',
  'airbag-calavera': 'graffiti'
};

/* --------------------------------------------------------------------------
   PARSER: nombre de archivo -> producto
   -------------------------------------------------------------------------- */
function titulizar(etiqueta) {
  if (ETIQUETAS_CORREGIDAS[etiqueta]) return ETIQUETAS_CORREGIDAS[etiqueta];
  return etiqueta.split('-').map(function (p) {
    if (MAYUSCULAS[p]) return MAYUSCULAS[p];
    return p.charAt(0).toUpperCase() + p.slice(1);
  }).join(' ');
}

function productoDesdeArchivo(archivo, i) {
  const sinExt = archivo.replace(/\.[^.]+$/, '');
  const partes = sinExt.split('_');
  const tipo = partes[0];
  const etiqueta = partes[1] || '';
  const colorArchivo = partes[2] || '';

  const prenda = PRENDAS[tipo] || PRENDAS.remera;
  const nombre = titulizar(etiqueta);

  /* Color: el id sale del mapa; el nombre visible, del propio archivo. */
  const colorId = COLOR_ARCHIVO[colorArchivo] || colorArchivo;
  const base = COLORES_INDICE[colorId];
  const color = base
    ? { id: base.id, nombre: titulizar(colorArchivo), hex: base.hex }
    : { id: colorId || 'negro', nombre: titulizar(colorArchivo || 'negro'), hex: '#141414' };

  const tags = (TAGS_POR_ETIQUETA[etiqueta] || []).concat(['unisex']);

  return {
    id: i + 1,
    slug: sinExt.replace(/_/g, '-'),
    archivo: archivo,
    nombre: nombre,
    categoria: prenda.categoria,
    tipoPrenda: prenda.tipoPrenda,
    tipoDiseno: DISENO_POR_ETIQUETA[etiqueta] || 'clasico',
    precio: prenda.precio,
    orden: i + 1,
    /* Los primeros seis son los que se muestran como destacados. */
    destacado: i < 6,
    personalizable: true,
    descripcion: prenda.tipoPrenda + ' con estampado DTF de alta calidad. ' +
                 'Diseño ' + nombre + ' sobre prenda ' + titulizar(colorArchivo).toLowerCase() + '.',
    /* El producto viene en el color en el que está fotografiado. */
    colores: [color],
    talles: prenda.talles,
    tags: tags,
    ficha: prenda.ficha,
    /* Una sola foto real por producto. Las vistas de espalda y el macro del
       estampado todavía no existen: están anotadas en ASSETS-NECESARIOS.md. */
    imagenes: [
      {
        src: 'assets/productos/' + archivo,
        alt: prenda.tipoPrenda + ' ' + nombre + ', color ' + titulizar(colorArchivo).toLowerCase(),
        /* Recorte uniforme: si un asset puntual necesita otro encuadre,
           agregar aquí objectPosition: 'center top' (o el valor que sea). */
        objectPosition: 'center'
      }
    ]
  };
}

const PRODUCTOS = ARCHIVOS_PRODUCTOS.map(productoDesdeArchivo);

/* ---------------------------------------------------------------------------
   CONFIGURADORES DE LA HOME
   ---------------------------------------------------------------------------
   Una sola foto por prenda, blanca y con fondo transparente. El color sale de
   apilar capas en CSS (ver js/prenda.js y el bloque PREVIEW DE PRENDA de
   css/styles.css): no hay una foto por color y no se recolorea nada.

   id ............. 'remera' | 'buzo'. Elige la clase .garment-color--<id>,
                    que es la que trae la mascara con la silueta de la prenda.
   base ........... foto de la prenda, con fondo transparente. Va como <img>
                    en la capa de textura.
   zonaImpresion .. donde cae el diseno que sube el usuario, en % de la preview.

   Si se cambia una foto base hay que actualizar la ruta en DOS lugares: aca
   (para el <img>) y en css/styles.css (para la mascara del color).
   -------------------------------------------------------------------------- */
const CONFIGURADORES = {
  remera: {
    id: 'remera',
    nombre: 'Remera clásica unisex',
    bajada: 'Algodón premium · DTF de alta calidad',
    precio: 20000,
    colores: COLORES_REMERA,
    talles: TALLES_ADULTO,
    base: 'assets/remera_blanca.png',
    baseAlt: 'Remera unisex vista de frente, apoyada en plano',
    zonaImpresion: { cx: 50, cy: 55, ancho: 32, min: 12, max: 52 }
  },
  buzo: {
    id: 'buzo',
    nombre: 'Buzo clásico unisex',
    bajada: 'Frisado premium · DTF de alta calidad',
    precio: 32500,
    colores: COLORES_BUZO,
    talles: TALLES_ADULTO,
    base: 'assets/buzo_blanco.png',
    baseAlt: 'Buzo unisex con capucha, vista de frente',
    zonaImpresion: { cx: 50, cy: 56, ancho: 28, min: 10, max: 46 }
  }
};

/* ---------------------------------------------------------------------------
   GUÍA DE TALLES
   Remeras: medidas REALES provistas por BLONK.
   Buzos:   NO provistas. No se inventan. Estructura lista para completar.
   -------------------------------------------------------------------------- */
const GUIA_TALLES = {
  remeras: [
    { talle: 'S',   alto: '68 cm', ancho: '51 cm' },
    { talle: 'M',   alto: '70 cm', ancho: '53 cm' },
    { talle: 'L',   alto: '71 cm', ancho: '55 cm' },
    { talle: 'XL',  alto: '72 cm', ancho: '56 cm' },
    { talle: 'XXL', alto: '73 cm', ancho: '57 cm' },
    { talle: '6',   alto: '76 cm', ancho: '62 cm' },
    { talle: '8',   alto: '78 cm', ancho: '64 cm' },
    { talle: '10',  alto: '80 cm', ancho: '66 cm' }
  ],
  /* Completar con las medidas reales de buzo cuando BLONK las pase.
     Mientras el array esté vacío, la web muestra un aviso en vez de
     inventar medidas. */
  buzos: []
};

/* Exposición global (el proyecto es JS vanilla, sin bundler).
   PRENDAS y COLORES_PRENDA se exponen también para que el catálogo de Supabase
   (js/supabase-productos.js) y el panel (js/admin.js) reconstruyan los productos
   con la misma ficha, talles y colores, sin duplicar tablas. */
window.BLONK_DATA = {
  PRODUCTOS, CONFIGURADORES, GUIA_TALLES,
  COLORES_REMERA, COLORES_BUZO, COLORES_PRENDA,
  PRENDAS
};
