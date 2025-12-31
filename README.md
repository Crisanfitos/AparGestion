# AparGestión

Plataforma de gestión de alquileres centrada en **Gerontecnología** - diseñada para propietarios de la tercera edad.

## 🎯 Propósito

AparGestión es una aplicación móvil desarrollada en React Native destinada a propietarios mayores que gestionan alquileres turísticos o de larga duración. Se fundamenta en el principio de **"Utilidad sin Edad"** (Ageless Utility).

## 🏗️ Stack Tecnológico

| Componente | Tecnología |
|------------|------------|
| Framework | Expo SDK 54 (Nueva Arquitectura) |
| Navegación | Expo Router 6.0 |
| Estado | Zustand |
| Backend | Supabase |
| UI Calendario | react-native-calendars |

## 📱 Características Principales

1. **Calendario Inteligente** - Sincronización iCal con Booking.com
2. **Gestión Documental** - Facturas PDF y contratos DOCX editables
3. **Auto Check-in** - Enlace web para verificación de huéspedes

## ♿ Accesibilidad (WCAG 2.1 AAA)

- Fuentes mínimo 18sp
- Objetivos táctiles 60x60dp
- Contraste 7:1
- Sin gestos complejos

## � Inicio Rápido

```bash
# Instalar dependencias
npm install

# Ejecutar en Android
npm run android

# Ejecutar en Web
npm run web
```

## � Estructura del Proyecto

```
app/                # Rutas Expo Router
src/
├── core/           # Código fundacional
├── components/     # Componentes UI accesibles
└── features/       # Módulos de dominio
designs/            # Ejemplos de UI
```

## � Licencia

Privado - © 2025
