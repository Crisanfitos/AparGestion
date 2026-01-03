-- ============================================
-- APARGESTION - SQL Migration: Add booking_url to properties
-- Ejecuta esto en Supabase SQL Editor
-- ============================================

-- Añadir columna booking_url si no existe
ALTER TABLE public.properties 
ADD COLUMN IF NOT EXISTS booking_url TEXT;

-- Añadir columna square_meters si no existe (tamaño del apartamento)
ALTER TABLE public.properties 
ADD COLUMN IF NOT EXISTS square_meters INTEGER;

-- ✅ Migración completada
