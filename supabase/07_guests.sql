-- ============================================
-- APARGESTION - SQL Script 7: guests
-- Ejecuta esto DESPUÉS del Script 6
-- ============================================

-- 1. Crear tabla guests
CREATE TABLE IF NOT EXISTS public.guests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reservation_id UUID NOT NULL REFERENCES public.reservations(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    document_type TEXT CHECK (document_type IN ('dni', 'passport', 'nie', 'driving_license', 'other')),
    document_number TEXT,
    nationality TEXT,
    birth_date DATE,
    signature_url TEXT,
    document_photo_url TEXT,
    extra_data JSONB DEFAULT '{}'::jsonb,
    checked_in_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Habilitar RLS
ALTER TABLE public.guests ENABLE ROW LEVEL SECURITY;

-- 3. Políticas
-- Propietario puede ver huéspedes de sus reservas
CREATE POLICY "Owners can view guests" ON public.guests
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.reservations 
            WHERE reservations.id = guests.reservation_id 
            AND reservations.owner_id = auth.uid()
        )
    );

-- Propietario puede insertar huéspedes
CREATE POLICY "Owners can insert guests" ON public.guests
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.reservations 
            WHERE reservations.id = guests.reservation_id 
            AND reservations.owner_id = auth.uid()
        )
    );

-- Propietario puede actualizar huéspedes
CREATE POLICY "Owners can update guests" ON public.guests
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.reservations 
            WHERE reservations.id = guests.reservation_id 
            AND reservations.owner_id = auth.uid()
        )
    );

-- Propietario puede eliminar huéspedes
CREATE POLICY "Owners can delete guests" ON public.guests
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.reservations 
            WHERE reservations.id = guests.reservation_id 
            AND reservations.owner_id = auth.uid()
        )
    );

-- NOTA: Para check-in público, añadiremos una política con token más adelante

-- 4. Índices
CREATE INDEX IF NOT EXISTS idx_guests_reservation ON public.guests(reservation_id);
CREATE INDEX IF NOT EXISTS idx_guests_document ON public.guests(document_type, document_number);

-- ✅ Script 7 completado
-- ¡Todas las tablas creadas!
