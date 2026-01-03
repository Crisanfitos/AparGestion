-- ============================================
-- APARGESTION - SQL Script 5: ical_syncs
-- Ejecuta esto DESPUÉS del Script 4
-- ============================================

-- 1. Crear tabla ical_syncs
CREATE TABLE IF NOT EXISTS public.ical_syncs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    source TEXT NOT NULL CHECK (source IN ('booking', 'airbnb', 'google', 'vrbo', 'manual', 'other')),
    ical_url TEXT NOT NULL,
    last_synced_at TIMESTAMPTZ,
    sync_status TEXT DEFAULT 'pending' CHECK (sync_status IN ('ok', 'error', 'pending', 'syncing')),
    error_message TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Habilitar RLS
ALTER TABLE public.ical_syncs ENABLE ROW LEVEL SECURITY;

-- 3. Políticas (acceso a través del owner de la property)
CREATE POLICY "Users can view own ical_syncs" ON public.ical_syncs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.properties 
            WHERE properties.id = ical_syncs.property_id 
            AND properties.owner_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert own ical_syncs" ON public.ical_syncs
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.properties 
            WHERE properties.id = ical_syncs.property_id 
            AND properties.owner_id = auth.uid()
        )
    );

CREATE POLICY "Users can update own ical_syncs" ON public.ical_syncs
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.properties 
            WHERE properties.id = ical_syncs.property_id 
            AND properties.owner_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete own ical_syncs" ON public.ical_syncs
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.properties 
            WHERE properties.id = ical_syncs.property_id 
            AND properties.owner_id = auth.uid()
        )
    );

-- 4. Índices
CREATE INDEX IF NOT EXISTS idx_ical_syncs_property ON public.ical_syncs(property_id);
CREATE INDEX IF NOT EXISTS idx_ical_syncs_active ON public.ical_syncs(property_id, is_active);

-- ✅ Script 5 completado
-- Ahora ejecuta el Script 6 (reservations)
