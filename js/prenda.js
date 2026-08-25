/* ============================================================================
   BLONK · js/prenda.js
   ----------------------------------------------------------------------------
   COLOR DE PRENDA POR COMPOSICIÓN DE CAPAS

   NO hay canvas. NO hay filter. NO hay hue-rotate. NO hay recoloreado píxel
   por píxel. NO se cambia el src de ninguna imagen. Si algún día aparece algo
   de eso tocando la preview, está de más: este archivo es la única fuente de
   verdad del cambio de color.

   El sistema es puro CSS y son tres capas apiladas en la misma caja:

       CAPA 3   .custom-design-layer   el PNG/JPG que sube el usuario
       CAPA 2   .garment-texture       la foto blanca de la prenda
       CAPA 1   .garment-color         el color elegido

   CAPA 1 — color
       Un <div> con background-color al que se le aplica como máscara el canal
       alfa del propio PNG de la prenda (mask-image + mask-size: contain).
       El color existe SOLAMENTE adentro de la silueta: el fondo transparente
       nunca se pinta y el color no sobresale ni un píxel del contorno.

   CAPA 2 — textura
       La foto blanca original, encima, con mix-blend-mode: multiply.
       El multiply va en la IMAGEN, nunca en el contenedor ni en el diseño.
       Multiplicar escala el color de abajo por el brillo de arriba:

           tela plana, casi blanca  ->  deja pasar el color elegido
           gris de un pliegue       ->  oscurece el color: se ve el pliegue
           costuras y sombras       ->  siguen visibles

   CAPA 3 — diseño
       Sin blend, sin filtros y sin máscara. Un PNG rojo se ve rojo aunque la
       remera pase a verde.

   El contenedor lleva isolation: isolate para que el multiply se resuelva
   contra la capa de color y no contra el fondo de la sección.

   ASSETS
       assets/remera_blanca.png   1254×1254 RGBA, fondo transparente
       assets/buzo_blanco.png     1254×1254 RGBA, fondo transparente

   Las rutas de la máscara viven en css/styles.css
   (.garment-color--remera / .garment-color--buzo). Si se cambia una foto
   base, hay que actualizar la ruta en los DOS lugares: el <img> lo pone este
   archivo desde cfg.base, la máscara la pone el CSS.

   DEBUG
       Desde la consola, con la home abierta:

           BLONK.setGarmentColor(document.querySelector('.garment-preview'), '#ff0000');

       La prenda tiene que quedar visiblemente roja. Si no, el problema está
       en la máscara o en el multiply, no en el JS.
       Hay una página de prueba completa en test-colores.html.
   ========================================================================== */
(function () {
  'use strict';

  const BLONK = (window.BLONK = window.BLONK || {});

  const TIPOS_OK = ['image/png', 'image/jpeg', 'image/webp'];
  const PESO_MAX = 12 * 1024 * 1024;

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  /* ========================================================================
     avisarSiEsFile — el único modo conocido en que este sistema NO anda
     ------------------------------------------------------------------------
     Las imágenes de `mask-image` se piden CON CORS. En file:// cada archivo
     tiene origen opaco, así que la petición falla; el navegador NO ignora la
     máscara: la toma como vacía y borra la capa de color. Se ve la foto
     blanca y los swatches parecen no hacer nada.

     Comprobado: una máscara cross-origin sin cabeceras CORS hace desaparecer
     el elemento por completo. file:// es el mismo caso.

     Servido por HTTP el origen es real y anda. Para eso está abrir-web.bat.
     ====================================================================== */
  function avisarSiEsFile() {
    if (window.location.protocol !== 'file:') return;
    console.warn(
      '[BLONK] La página está abierta con file://.\n' +
      'El color de la prenda no va a funcionar: el navegador pide las máscaras\n' +
      'CSS con CORS y en file:// eso falla, así que la capa de color se borra y\n' +
      'la prenda queda blanca.\n' +
      'Abrí el sitio con abrir-web.bat (lo sirve por HTTP en localhost).'
    );
  }

  /* ========================================================================
     setGarmentColor — el cambio de color, entero
     ------------------------------------------------------------------------
     Recibe el contenedor .garment-preview (o cualquier ancestro que lo
     contenga) y un color CSS. Lo único que toca es el background-color de la
     capa 1: la foto no se recarga, el diseño no se toca, no corre ningún
     algoritmo.
     ====================================================================== */
  function setGarmentColor(preview, color) {
    if (!preview || !color) return null;
    const capa = preview.classList && preview.classList.contains('garment-color')
      ? preview
      : preview.querySelector('.garment-color');
    if (!capa) {
      console.warn('[BLONK] setGarmentColor: no encontré .garment-color en', preview);
      return null;
    }
    capa.style.backgroundColor = color;
    return capa;
  }

  /* ========================================================================
     PrendaPreview — integración con el configurador de la home
     ====================================================================== */
  function PrendaPreview(contenedor, cfg) {
    this.cont = contenedor;
    this.cfg = cfg;
    this.color = cfg.colores[0];
    this.escala = cfg.zonaImpresion.ancho;
    this.disenoUrl = null;
    avisarSiEsFile();
    this._construirDom();
    this.setColor(this.color, true);
  }

  PrendaPreview.prototype._construirDom = function () {
    const z = this.cfg.zonaImpresion;
    /* La clase modificadora es la que trae la máscara con la silueta correcta.
       cfg.id es 'remera' o 'buzo' (ver data/productos.js). */
    const variante = this.cfg.id ? ' garment-color--' + BLONK.esc(this.cfg.id) : '';

    this.cont.innerHTML =
      '<div class="garment-preview" role="img" aria-label="' +
          BLONK.esc(this.cfg.baseAlt) + '">' +
        '<div class="garment-color' + variante + '"></div>' +
        '<img class="garment-texture" src="' + BLONK.esc(this.cfg.base) + '" alt="" ' +
          'draggable="false">' +
        '<div class="custom-design-layer" hidden>' +
          '<img alt="" draggable="false">' +
        '</div>' +
      '</div>';

    this.wrap    = this.cont.querySelector('.garment-preview');
    this.capaColor   = this.cont.querySelector('.garment-color');
    this.capaTextura = this.cont.querySelector('.garment-texture');
    this.capaDiseno  = this.cont.querySelector('.custom-design-layer');
    this.imgDiseno   = this.capaDiseno.querySelector('img');

    this.wrap.style.setProperty('--zona-x', z.cx + '%');
    this.wrap.style.setProperty('--zona-y', z.cy + '%');
    this.capaDiseno.style.setProperty('--zona-ancho', this.escala + '%');

    const self = this;
    this.capaTextura.addEventListener('error', function () {
      console.error('[BLONK] No se pudo cargar la foto base: ' + self.cfg.base);
    });
  };

  /**
   * Cambia el color de la prenda. Una línea: el background de la capa 1.
   * @param {{id:string, hex:string}} color
   */
  PrendaPreview.prototype.setColor = function (color, forzar) {
    if (!color) return;
    if (!forzar && this.color && color.id === this.color.id) return;
    this.color = color;
    setGarmentColor(this.wrap, color.hex);
  };

  /**
   * Diseño del usuario, en su propia capa (z-index 3).
   * PNG con transparencia se respeta tal cual; JPG/WebP conservan su fondo.
   * El color de la prenda no lo afecta de ninguna manera.
   */
  PrendaPreview.prototype.setDiseno = function (file) {
    const self = this;
    return new Promise(function (resolver, rechazar) {
      if (!file) { self.quitarDiseno(); resolver(null); return; }
      if (TIPOS_OK.indexOf(file.type) === -1) {
        rechazar(new Error('Formato no soportado. Aceptamos PNG, JPG y WebP.')); return;
      }
      if (file.size > PESO_MAX) {
        rechazar(new Error('La imagen pesa más de 12 MB. Probá con una más liviana.')); return;
      }
      const url = URL.createObjectURL(file);
      const prueba = new Image();
      prueba.onload = function () {
        if (self.disenoUrl) URL.revokeObjectURL(self.disenoUrl);
        self.disenoUrl = url;
        self.imgDiseno.src = url;
        self.capaDiseno.hidden = false;
        self.wrap.classList.add('tiene-diseno');
        resolver({ ancho: prueba.naturalWidth, alto: prueba.naturalHeight, nombre: file.name });
      };
      prueba.onerror = function () {
        URL.revokeObjectURL(url);
        rechazar(new Error('No pudimos leer esa imagen.'));
      };
      prueba.src = url;
    });
  };

  PrendaPreview.prototype.quitarDiseno = function () {
    if (this.disenoUrl) URL.revokeObjectURL(this.disenoUrl);
    this.disenoUrl = null;
    this.imgDiseno.removeAttribute('src');
    this.capaDiseno.hidden = true;
    this.wrap.classList.remove('tiene-diseno');
    this.setEscala(this.cfg.zonaImpresion.ancho);
  };

  PrendaPreview.prototype.setEscala = function (pct) {
    const z = this.cfg.zonaImpresion;
    this.escala = clamp(Number(pct) || z.ancho, z.min, z.max);
    this.capaDiseno.style.setProperty('--zona-ancho', this.escala + '%');
    return this.escala;
  };

  PrendaPreview.prototype.tieneDiseno = function () { return !!this.disenoUrl; };

  /* -------------------------------------------------------------- EXPORTS */
  BLONK.PrendaPreview = PrendaPreview;
  BLONK.setGarmentColor = setGarmentColor;
  BLONK.PRENDA_TIPOS_OK = TIPOS_OK;
})();
