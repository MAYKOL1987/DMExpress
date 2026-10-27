# Configurar CORS para DMExpress en IIS

El navegador compara el origen de la tienda con el de la API. Un origen incluye esquema, dominio y puerto, pero no incluye la ruta. Por ejemplo, `https://tienda.ejemplo.pe` y `https://api.ejemplo.pe` son orígenes diferentes.

El enlace `/Help/Api/POST-api-Category-ListaTotalItem` parece corresponder a la página de ayuda de ASP.NET Web API. La tienda llama a la ruta de API configurada en `js/services/api.js`:

```text
POST https://10446394229sanchezapi.spk.com.pe/api/Category/ListaTotalItem
```

## 1. Anota el origen de la tienda

Abre la tienda por HTTP/HTTPS y copia solo el origen de la barra de direcciones. Algunos ejemplos:

- Desarrollo local con Live Server: `http://localhost:5500`
- Sitio publicado: `https://tienda.tudominio.pe`

No uses `file:///...` para probar módulos JavaScript ni agregues una ruta como `/index.html` al origen. Si usas otro puerto o `www`, copia exactamente ese origen. Si necesitas permitir desarrollo y producción, configura ambos.

## 2. Identifica el tipo de API

La URL de ayuda es característica de ASP.NET Web API 2 sobre .NET Framework. Confírmalo en el código de la API:

- Si existe `App_Start/WebApiConfig.cs`, sigue la sección **ASP.NET Web API 2**.
- Si existe `Program.cs` y se registra `builder.Services.AddControllers()`, sigue la sección **ASP.NET Core**.

No apliques las dos configuraciones a la vez.

## 3. ASP.NET Web API 2 (.NET Framework)

### 3.1 Instala el paquete CORS

En Visual Studio, abre **Tools → NuGet Package Manager → Package Manager Console**, selecciona el proyecto de la API y ejecuta:

```powershell
Install-Package Microsoft.AspNet.WebApi.Cors
```

### 3.2 Habilita CORS en `App_Start/WebApiConfig.cs`

Agrega el `using` y llama `config.EnableCors()` al inicio de `Register`:

```csharp
using System.Web.Http;

public static class WebApiConfig
{
    public static void Register(HttpConfiguration config)
    {
        config.EnableCors();

        // Conserva aquí las rutas que ya tiene tu API.
    }
}
```

No reemplaces las rutas actuales de la API por este ejemplo; solo agrega la llamada a `EnableCors()`.

### 3.3 Autoriza el origen en `CategoryController`

En el archivo donde está la acción `ListaTotalItem`, agrega el atributo directamente a esa acción. Reemplaza `https://tienda.tudominio.pe` y el origen local por los valores reales:

```csharp
using System.Web.Http.Cors;

[EnableCors(
    origins: "https://tienda.tudominio.pe,http://localhost:5500",
    headers: "accept,content-type,origin",
    methods: "POST")]
public IHttpActionResult ListaTotalItem(/* conserva los parámetros existentes */)
{
    // Conserva el cuerpo actual de la acción.
}
```

Si la tienda ya está publicada, puedes retirar `http://localhost:5500`. No agregues una barra final a los orígenes. Mantén los parámetros y el cuerpo existentes de la acción: este cambio solo habilita el acceso del navegador.

### 3.4 Permite que IIS pase el preflight `OPTIONS`

El POST JSON de la tienda puede provocar una solicitud previa `OPTIONS`. Primero publica y prueba la configuración de Web API. Si IIS responde `404` o `405` al `OPTIONS`, agrega estos handlers dentro del `<system.webServer>` que ya existe en el `web.config` de la API:

```xml
<system.webServer>
  <handlers>
    <remove name="ExtensionlessUrlHandler-Integrated-4.0" />
    <remove name="OPTIONSVerbHandler" />
    <add name="ExtensionlessUrlHandler-Integrated-4.0"
         path="*."
         verb="*"
         type="System.Web.Handlers.TransferRequestHandler"
         preCondition="integratedMode,runtimeVersionv4.0" />
  </handlers>
</system.webServer>
```

Si `web.config` ya contiene `<system.webServer>` o `<handlers>`, integra los `<remove>` y `<add>` dentro de esos bloques existentes; no dupliques las secciones. Haz copia del `web.config` antes de modificarlo.

## 4. ASP.NET Core

En `Program.cs`, registra una política con los orígenes reales y coloca `UseCors` después de `UseRouting` y antes de autorización/endpoints:

```csharp
var builder = WebApplication.CreateBuilder(args);

builder.Services.AddCors(options =>
{
    options.AddPolicy("DMExpressStore", policy =>
        policy.WithOrigins(
                "https://tienda.tudominio.pe",
                "http://localhost:5500")
              .WithMethods("POST")
              .WithHeaders("Accept", "Content-Type"));
});

builder.Services.AddControllers();

var app = builder.Build();
app.UseHttpsRedirection();
app.UseRouting();
app.UseCors("DMExpressStore");
app.UseAuthorization();
app.MapControllers();
app.Run();
```

Conserva el resto de servicios y middleware que ya usa tu `Program.cs`. El orden de `UseCors` importa en ASP.NET Core.

## 5. Publica en IIS

1. Guarda una copia de los archivos de la API publicados y de `web.config`.
2. Aplica el cambio en el proyecto fuente de la API, compílalo y publícalo en la carpeta del sitio de IIS. Cambiar solo el proyecto frontend no activa CORS en el servidor.
3. En **IIS Manager → Sites**, selecciona el sitio de la API y confirma en **Basic Settings…** la ruta física donde publicaste.
4. Comprueba que el sitio tiene binding HTTPS y certificado válido. La tienda ya llama a la API mediante HTTPS.
5. Recicla el application pool de la API o reinicia el sitio después de publicar.
6. Abre la tienda desde el origen que autorizaste y revisa las herramientas del navegador: **F12 → Network**.
7. La solicitud `OPTIONS` debe responder con `Access-Control-Allow-Origin` igual al origen de la tienda y permitir `POST` y los encabezados `content-type` y `accept`. Después debe aparecer el `POST` con su respuesta JSON.

No intentes arreglar CORS agregando `mode: "no-cors"` al `fetch`: el navegador no expondría el JSON a la tienda. Tampoco agregues encabezados CORS a la vez desde IIS Manager y desde la aplicación, porque podrías terminar con encabezados duplicados.

## 6. Diagnóstico rápido

- **No aparece el POST y falla `OPTIONS`:** revisa el handler de IIS, `config.EnableCors()` y el atributo/política de origen.
- **Aparece “No `Access-Control-Allow-Origin`”:** el origen permitido no coincide exactamente con el origen visible en la barra del navegador (protocolo, subdominio o puerto).
- **El POST devuelve `400` o `415`:** CORS ya permitió llegar a la API; revisa el cuerpo JSON que exige `ListaTotalItem`.
- **La API responde bien, pero la tienda no muestra las categorías:** ajusta los nombres/campos de la respuesta en `getCategoryRows()` y `normalizeCategory()` de `js/services/api.js`.

La guía de Web API 2 de Microsoft incluye el paquete CORS y el ajuste de handlers de IIS para que `OPTIONS` llegue a la aplicación: <https://learn.microsoft.com/en-us/aspnet/web-api/overview/security/enabling-cross-origin-requests-in-web-api>. La documentación de ASP.NET Core explica la política y el orden de `UseCors`: <https://learn.microsoft.com/en-us/aspnet/core/security/cors>.
