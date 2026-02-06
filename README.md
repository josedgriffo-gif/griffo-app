# GRIFFO APP

Buscador de productos de suspensión automotor GRIFFO SRL.

## Estructura del proyecto

```
griffo-app/
├── api/                  ← Backend (serverless functions)
│   ├── _token.js         ← Módulo interno: auth token SpecParts (no expuesto)
│   ├── patent.js         ← GET /api/patent?plate=AB123CD
│   ├── parts.js          ← GET /api/parts?code=2035|search=fuelle|vehicle_id=123
│   └── vehicles.js       ← GET /api/vehicles?brand=X&model=Y
├── public/               ← Frontend
│   └── index.html        ← App completa (SPA)
├── .env.example          ← Template de variables de entorno
├── package.json
├── vercel.json
└── README.md
```

## Deploy en Vercel (5 minutos)

### 1. Crear cuenta en Vercel
- Ir a [vercel.com](https://vercel.com) y crear cuenta con GitHub

### 2. Subir el código a GitHub
```bash
cd griffo-app
git init
git add .
git commit -m "GRIFFO APP v1.0"
# Crear repo en GitHub y pushear
git remote add origin https://github.com/TU_USUARIO/griffo-app.git
git push -u origin main
```

### 3. Importar en Vercel
1. En Vercel Dashboard → **Add New Project**
2. Seleccionar el repo `griffo-app`
3. Framework Preset: **Other**
4. Deploy

### 4. Configurar variables de entorno
En Vercel Dashboard → tu proyecto → **Settings** → **Environment Variables**:

| Variable | Valor |
|---|---|
| `SPECPARTS_CLIENT_ID` | `gsGXZxtFux30YIXnmIYupqcj9wBcB49bmy8kH5dEsOV5o9eror` |
| `SPECPARTS_CLIENT_SECRET` | `dtEQnmBVlGJ0tq1j49nx2V85nGgpx9quyCVOu3a0Y24GemPi2uCnIEm0Q5zIt66emNEbrV` |

5. Re-deploy después de agregar las variables

### 5. ¡Listo!
Tu app estará disponible en `https://griffo-app.vercel.app`

## Dominio personalizado (opcional)
En Settings → Domains → agregar `app.griffo.com.ar` y configurar DNS.

## API Endpoints

| Endpoint | Parámetros | Descripción |
|---|---|---|
| GET `/api/patent` | `plate` | Busca vehículo por patente + productos |
| GET `/api/parts` | `code`, `search`, `vehicle_id`, `page`, `limit` | Busca productos GRIFFO |
| GET `/api/vehicles` | `brand`, `model` | Lista marcas/modelos/años |

## Tecnologías
- **Frontend:** HTML5 + CSS3 + JavaScript vanilla (SPA, mobile-first)
- **Backend:** Vercel Serverless Functions (Node.js)
- **API:** SpecParts External API (auth.specparts.ai / external-api.specparts.ai)
- **Auth:** Firebase Auth (próximo paso)

## Próximos pasos
- [ ] Firebase Auth (login con Google)
- [ ] PWA: manifest.json + service worker para offline
- [ ] Analytics: tracking de búsquedas y conversiones
- [ ] Cache de respuestas en Vercel Edge Config
