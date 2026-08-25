# ASSETS — BLONK

Estado: **la web ya usa todos los assets reales que hay en `/assets`.**
Solo quedan placeholders donde el archivo todavía no existe. Cada uno se ve en
el layout como un bloque punteado con el nombre exacto, la resolución y la
descripción de la toma.

---

## 1. Ya integrados ✅

### Marca y fondos

| Archivo | Dónde se usa |
|---|---|
| `logo.png` | Header y footer de las dos páginas |
| `fondo-hero.png` | Hero, fondo a sangre (100% del viewport) |
| `proceso-dtf.png` | Qué hace BLONK, foto de la mitad izquierda |
| `proceso-dtf-fondo.png` | Qué hace BLONK, textura detrás del copy |
| `fondo-configurador-remeras.jpg` | Escena del configurador de remeras |
| `fondo-configurador-buzos.jpg` | Escena del configurador de buzos |
| `fondo-categorias.jpg` | Escena de la sección Categorías |
| `fondo-buscador.jpg` | Escena de “Buscá tu próximo diseño” |
| `personalizados-proceso.png` | Sección Personalizados |
| `cta-final-blonk.png` | Fondo a sangre del CTA final |

### Categorías

| Archivo | Card |
|---|---|
| `categoria-remeras.png` | Remeras |
| `categoria-buzos.png` | Buzos |
| `categoria-conjuntos.png` | Conjuntos |
| `categoria-personalizados.png` | Personalizados |

Las cuatro se muestran en una caja fija de 5:6 con `object-fit: cover`, así que
la grilla queda pareja aunque los recortes no sean idénticos.

### Prendas base de los configuradores

| Archivo | Uso |
|---|---|
| `remera_blanca.png` | Base del configurador de remeras (10 colores) |
| `buzo_blanco.png` | Base del configurador de buzos (9 colores) |

**No hace falta una foto por color.** El color sale de apilar capas en CSS
(ver `js/prenda.js`). Las dos fotos tienen fondo transparente real, que es justo
lo que necesita el sistema.

Las dos estan en 1254 x 1254, resolucion de sobra.

> **Como funciona el color, en corto.** Tres capas dentro de la misma caja:
> abajo un `div` con `background-color`, enmascarado con el canal alfa del
> propio PNG (`mask-image`), asi el color existe solo adentro de la silueta;
> encima la foto blanca con `mix-blend-mode: multiply`, que deja pasar el color
> en la tela plana y lo oscurece en los pliegues; y arriba de todo el diseno
> del usuario, sin blend ni mascara, para que conserve sus colores.
>
> No hay canvas, ni filtros, ni recoloreado pixel por pixel. Cambiar de color
> es una sola linea: `colorLayer.style.backgroundColor = hex`.
>
> Las rutas de las mascaras estan en `css/styles.css`
> (`.garment-color--remera` y `.garment-color--buzo`): si se cambia una foto
> base hay que actualizarlas ahi tambien, no solo en `data/productos.js`.
> Los colores de tela estan en `COLORES_PRENDA`, en `data/productos.js`.
>
> **Abrir la web con `abrir-web.bat`, no con doble clic en `index.html`.**
> Las imagenes de `mask-image` se piden con CORS y en `file://` cada archivo
> tiene origen opaco: la peticion falla, el navegador toma la mascara como
> vacia y borra la capa de color, asi que la prenda queda blanca y los swatches
> no hacen nada. `abrir-web.bat` levanta un servidor local (no necesita Node ni
> Python) y abre el navegador. Servido por HTTP funciona, que es como va a
> estar en el hosting.

Las bases negras anteriores (`remera_negra.webp`, `buzo_negro.webp`) siguen en
la carpeta pero ya no se usan. Se pueden borrar.

`test-colores.html` (en la raíz) muestra las dos prendas en todos sus colores
con el mismo motor, para revisar de un vistazo. Es descartable.

### Catálogo — 16 productos reales

Están en `/assets/productos` y el catálogo se arma solo a partir de sus nombres:

```
prenda_etiqueta_color.ext
remera_malvinas-argentinas_negra.jpg  ->  Remera · Malvinas Argentinas · Negra
```

Hoy hay **8 remeras, 7 buzos y 1 conjunto**.

Para sumar un producto: dejá la foto en esa carpeta con ese formato de nombre y
agregá el nombre del archivo al array `ARCHIVOS_PRODUCTOS` de
`data/productos.js`. Nombre, categoría, precio, color y filtros salen del
nombre del archivo.

---

## 2. Pendiente

| Asset | Resolución | Sección | Uso |
|---|---:|---|---|
| `guia-medidas-remera.webp` | 1000×1200 | Modal Guía de talles | Remera de frente con flechas de ALTO (hombro→base) y ANCHO (axila→axila) |
| `guia-medidas-buzo.webp` | 1000×1200 | Modal Guía de talles | Solo cuando BLONK pase las medidas reales de buzo |
| `favicon.ico` | 32×32 | Ambas | Ícono de pestaña |
| `og-blonk.jpg` | 1200×630 | index | Preview al compartir la home |
| `og-blonk-catalogo.jpg` | 1200×630 | catálogo | Preview al compartir el catálogo |
| `logo-blonk.svg` | vectorial | Header/footer | Opcional: hoy anda con `logo.png`, en SVG se vería más nítido |
| `fonts/blonk-brush.woff2` | — | Titulares | Tipografía brush real de BLONK. Hoy se usa *Sedgwick Ave* de Google |

### Fotos extra de producto (opcional)

Cada producto tiene **una sola foto**. La ficha muestra esa y oculta la fila de
miniaturas. Si en algún momento se sacan más vistas, con dejarlas en
`/assets/productos` y sumarlas al array `imagenes` del producto la galería
vuelve a mostrar las miniaturas sola:

- espalda de la prenda — 1000×1200
- macro del estampado DTF — 1000×1200

---

## 3. Peso — la deuda pendiente

Los cuatro fondos de sección ya están optimizados (9,3 MB → 747 KB).
Lo que llegó después sigue sin comprimir:

| Archivo | Peso hoy |
|---|---:|
| `categoria-remeras.png` | 2,2 MB |
| `categoria-buzos.png` | 2,1 MB |
| `categoria-conjuntos.png` | 2,2 MB |
| `categoria-personalizados.png` | 1,9 MB |
| `fondo-hero.png` | 2,2 MB |
| `proceso-dtf-fondo.png` | 2,1 MB |
| `proceso-dtf.png` | 1,7 MB |
| `logo.png` | 519 KB |

Son **~15 MB** que hoy carga la home en desktop. Es lo más caro del proyecto en
performance y el paso a webp debería dejarlo en ~2,5 MB.

No se tocaron los archivos porque la conversión la hacés vos.

### Pasar todo a .webp

**1. Fondos** — tokens `--img-*` al inicio de `css/styles.css` (bloque `:root`).
Cambiás la extensión ahí y listo:

```css
--img-hero:           url('../assets/fondo-hero.webp');
--img-proceso-fondo:  url('../assets/proceso-dtf-fondo.webp');
--img-categorias:     url('../assets/fondo-categorias.webp');
--img-config-remeras: url('../assets/fondo-configurador-remeras.webp');
--img-config-buzos:   url('../assets/fondo-configurador-buzos.webp');
--img-buscador:       url('../assets/fondo-buscador.webp');
```

**2. Etiquetas `<img>` en el HTML**

| Archivo | Dónde |
|---|---|
| `logo.png` | index.html y catalogo.html (header + footer) |
| `fondo-hero.png` | token `--img-hero` (fondo CSS en las dos resoluciones) |
| `personalizados-proceso.png` | index.html, Personalizados |
| `cta-final-blonk.png` | index.html, CTA final |
| `proceso-dtf.png` | index.html, Qué hace BLONK |
| `categoria-*.png` | index.html, las 4 cards de Categorías |

**3. Prendas base** — `base:` dentro de `CONFIGURADORES` en `data/productos.js`.

**4. Productos** — cambiá la extensión en el array `ARCHIVOS_PRODUCTOS`.

> El logo tiene transparencia: exportarlo a webp **con canal alfa**.

---

## 4. Notas

- `assets/images.jfif` no se usa en ningún lado. Parece una descarga suelta;
  lo dejamos donde estaba por las dudas, pero se puede borrar.
- `assets/originales/` guarda los PNG sin comprimir de los cuatro fondos.
- El archivo `remera_malvias-argentinas-tres-estrellas_negra.jpg` tiene un error
  de tipeo en el nombre (*malvias*). **No se renombró.** En la web se muestra
  “Malvinas Argentinas Tres Estrellas” gracias al mapa `ETIQUETAS_CORREGIDAS`
  de `data/productos.js`. Si algún día se corrige el nombre del archivo, se
  puede sacar esa entrada del mapa.

---

## 5. Recomendaciones de producción

- **Formato:** webp calidad 80–85. Si el hosting lo permite, sumar avif.
- **Peso:** fotos grandes por debajo de ~250 KB; cards del catálogo por debajo
  de ~90 KB.
- **Fotos de producto:** el catálogo recorta todo a 7:8 desde el centro. Si una
  foto tiene el diseño muy arriba o muy abajo, se puede corregir por producto
  con `objectPosition` en `data/productos.js` sin tocar el CSS.
- **Fotografía:** lente medio, ángulo natural, luz lateral cálida, textura de
  tela visible. Sin render CGI ni prendas flotando.
