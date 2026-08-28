/* ============================================================================
   BLONK · js/supabase-config.js
   ----------------------------------------------------------------------------
   Credenciales de Supabase en UN SOLO lugar. Si algún día cambian el proyecto
   o rotan la clave pública, editá SOLO este archivo.

   · URL          -> Project URL de Supabase (Settings > API).
   · publishable  -> clave PÚBLICA (anon / publishable). Va en el navegador a
                     propósito: no da permisos de escritura por sí sola. La
                     seguridad real está en las políticas RLS + el login admin.
   · bucket       -> nombre del bucket de Storage donde viven las fotos.
   ========================================================================== */
window.BLONK_SUPABASE = {
  url: 'https://yczqpcwhzfuovirvljnq.supabase.co',
  publishable: 'sb_publishable_CCInkT0SfEP5W1CTYSw2NQ_Krd0FlpO',
  bucket: 'productos'
};
