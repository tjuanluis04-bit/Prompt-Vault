# PromptVault

App para archivar prompts (de **Imagen** o de **Texto**) por categoría, con copiado rápido al portapapeles. Funciona 100% offline: los datos se guardan en el propio dispositivo (localStorage del WebView).

## Qué incluye
- `www/` — la app (HTML/CSS/JS puro, sin frameworks).
- `capacitor.config.json` — configuración de Capacitor (appId `com.promptvault.app`).
- `resources/icons/` — el ícono de la app ya generado en todas las densidades (mdpi a xxxhdpi), más el de 512×512 para la Play Store.
- `.github/workflows/build-apk.yml` — workflow de GitHub Actions que genera el APK automáticamente y aplica el ícono.

## Cómo subirlo a GitHub y compilar el APK

1. Crea un repositorio nuevo en GitHub (puede ser privado).
2. Sube todo el contenido de esta carpeta a la raíz del repo:
   ```bash
   git init
   git add .
   git commit -m "PromptVault inicial"
   git branch -M main
   git remote add origin https://github.com/TU_USUARIO/TU_REPO.git
   git push -u origin main
   ```
3. Ve a la pestaña **Actions** de tu repositorio en GitHub. El workflow "Build APK" se ejecuta solo al hacer push a `main`, o puedes lanzarlo manualmente con el botón **Run workflow**.
4. Cuando termine (unos 3-5 minutos), entra en la ejecución finalizada y baja hasta **Artifacts**:
   - `promptvault-debug-apk` → contiene `app-debug.apk`, listo para instalar en tu Android (activa "orígenes desconocidos" para instalarlo).
   - `playstore-icon` → el ícono de 512×512 por si algún día lo subes a Play Store.

## Notas
- Es un APK de **debug**, pensado para instalar y probar directamente. Si más adelante quieres publicarlo en Google Play, habría que generar una versión firmada (release) — puedo ayudarte a preparar ese paso cuando lo necesites.
- El ícono se aplica automáticamente en cada build: el workflow copia `resources/icons/mipmap-*` dentro de la carpeta Android generada, sobreescribiendo el ícono por defecto de Capacitor, antes de compilar.
- Las imágenes adjuntas a los prompts se guardan comprimidas (máx. 900px, calidad ~72%) para no llenar el almacenamiento del teléfono.
- Usa el menú **⋮** (arriba a la derecha) para exportar/importar una copia de seguridad en `.json`, o para añadir categorías nuevas.
- Para probar la app en el navegador antes de compilar, simplemente abre `www/index.html`.
