# Arquitectura Técnica - AparGestión

## Visión General

Arquitectura **Feature-First** orientada al dominio del negocio.

## Principios

1. **Nueva Arquitectura React Native** - Fabric + TurboModules
2. **Expo Managed Workflow** - CNG para compilación nativa
3. **Gerontecnología** - Interfaces accesibles para mayores

## Estructura de Carpetas

```
AparGestión/
├── app/                    # Rutas Expo Router
│   ├── (auth)/             # Autenticación (Login)
│   ├── (tabs)/             # Navegación principal
│   │   ├── calendar/       # Vista calendario
│   │   └── documents/      # Gestión documental
│   └── checkin/            # Ruta web pública
│       └── [id].tsx        # Check-in por reserva
│
├── src/
│   ├── core/               # Código fundacional
│   │   ├── theme/          # Tokens de diseño
│   │   ├── storage/        # MMKV/SecureStore
│   │   └── api/            # Cliente Supabase
│   │
│   ├── components/         # UI compartida
│   │   └── accessible/     # Componentes senior-friendly
│   │
│   └── features/           # Módulos de dominio
│       ├── calendar/       # iCal sync
│       ├── documents/      # PDF/DOCX
│       └── checkin/        # Verificación huésped
│
└── designs/                # Mockups UI de referencia
```

## Gestión de Estado

**Zustand** con stores separados:
- `useAuthStore` - Sesión y credenciales
- `useCalendarStore` - Reservas y sincronización

## Flujo de Datos

```
┌─────────────┐    ┌──────────────┐    ┌──────────────┐
│  Supabase   │◄──►│   Zustand    │◄──►│   UI React   │
│  (Backend)  │    │   (Estado)   │    │  (Pantallas) │
└─────────────┘    └──────────────┘    └──────────────┘
       ▲
       │
┌──────┴───────┐
│  iCal Feed   │
│ (Booking.com)│
└──────────────┘
```

## Plataformas

| Plataforma | Propósito |
|------------|-----------|
| Android | App propietario |
| iOS | App propietario |
| Web | Check-in huésped |
