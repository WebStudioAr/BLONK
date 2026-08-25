# ============================================================================
#  BLONK - servidor local
#  ---------------------------------------------------------------------------
#  Sirve la carpeta del sitio por HTTP en localhost y abre el navegador.
#
#  POR QUE HACE FALTA
#  El configurador recorta el color de la prenda con una mascara CSS
#  (mask-image). El navegador pide las imagenes de mascara CON CORS, y en
#  file:// cada archivo tiene "origen opaco": la peticion falla, Chrome trata
#  la mascara como vacia y BORRA la capa de color. Resultado: la prenda queda
#  blanca y los swatches no hacen nada.
#
#  Servido por HTTP el origen es real, la mascara carga y todo funciona.
#  Es la misma razon por la que conviene probar asi: es lo que va a pasar en
#  el hosting de verdad.
#
#  No necesita Node ni Python: usa HttpListener, que ya viene en Windows.
#  Para cerrarlo, cerra esta ventana o apreta Ctrl+C.
# ============================================================================

$ErrorActionPreference = 'Stop'

# La raiz del sitio es la carpeta que contiene a /herramientas
$Root = Split-Path -Parent $PSScriptRoot
if (-not (Test-Path (Join-Path $Root 'index.html'))) {
  Write-Host "No encuentro index.html en $Root" -ForegroundColor Red
  Read-Host "Enter para salir"
  exit 1
}

$mime = @{
  '.html'='text/html; charset=utf-8'; '.css'='text/css; charset=utf-8'
  '.js'='application/javascript; charset=utf-8'; '.json'='application/json'
  '.png'='image/png'; '.jpg'='image/jpeg'; '.jpeg'='image/jpeg'
  '.webp'='image/webp'; '.gif'='image/gif'; '.svg'='image/svg+xml'
  '.ico'='image/x-icon'; '.woff2'='font/woff2'; '.woff'='font/woff'
  '.txt'='text/plain; charset=utf-8'; '.md'='text/plain; charset=utf-8'
}

# Primer puerto libre a partir de 4173
$listener = $null
foreach ($port in 4173..4183) {
  try {
    $l = New-Object System.Net.HttpListener
    $l.Prefixes.Add("http://localhost:$port/")
    $l.Start()
    $listener = $l
    $puerto = $port
    break
  } catch { }
}

if (-not $listener) {
  Write-Host "No pude abrir ningun puerto entre 4173 y 4183." -ForegroundColor Red
  Read-Host "Enter para salir"
  exit 1
}

$url = "http://localhost:$puerto/index.html"
Write-Host ""
Write-Host "  BLONK sirviendose en $url" -ForegroundColor Green
Write-Host "  Carpeta: $Root"
Write-Host ""
Write-Host "  Dejala abierta mientras trabajes. Ctrl+C o cerrar la ventana lo apaga."
Write-Host ""
Start-Process $url

while ($listener.IsListening) {
  try {
    $ctx = $listener.GetContext()
    $rel = [System.Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath).TrimStart('/')
    if ($rel -eq '') { $rel = 'index.html' }

    $path = Join-Path $Root ($rel -replace '/', '\')
    # No dejar salir de la carpeta del sitio
    $full = [System.IO.Path]::GetFullPath($path)
    if (-not $full.StartsWith([System.IO.Path]::GetFullPath($Root))) {
      $ctx.Response.StatusCode = 403
      $ctx.Response.OutputStream.Close()
      continue
    }
    if (Test-Path -LiteralPath $full -PathType Container) { $full = Join-Path $full 'index.html' }

    if (Test-Path -LiteralPath $full -PathType Leaf) {
      $bytes = [System.IO.File]::ReadAllBytes($full)
      $ext = [System.IO.Path]::GetExtension($full).ToLower()
      $ctx.Response.ContentType = if ($mime.ContainsKey($ext)) { $mime[$ext] } else { 'application/octet-stream' }
      # Sin cache: editas un archivo, refrescas y ves el cambio.
      $ctx.Response.AddHeader('Cache-Control', 'no-store, must-revalidate')
      $ctx.Response.ContentLength64 = $bytes.Length
      $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length)
    } else {
      $ctx.Response.StatusCode = 404
      $b = [System.Text.Encoding]::UTF8.GetBytes("404 - no existe: $rel")
      $ctx.Response.OutputStream.Write($b, 0, $b.Length)
    }
    $ctx.Response.OutputStream.Close()
  } catch { }
}
