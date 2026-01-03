-- ============================================
-- APARGESTION - SQL Script 4: properties
-- Ejecuta esto DESPUÉS del Script 3
-- ============================================

-- 1. Crear tabla properties
CREATE TABLE IF NOT EXISTS public.properties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    address TEXT,
    city TEXT,
    country TEXT DEFAULT 'España',
    description TEXT,
    photos TEXT[] DEFAULT '{}',
    price_per_night DECIMAL(10, 2),
    max_guests INTEGER DEFAULT 2,
    bedrooms INTEGER DEFAULT 1,
    bathrooms INTEGER DEFAULT 1,
    amenities JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Habilitar RLS
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

-- 3. Políticas
CREATE POLICY "Users can view own properties" ON public.properties
    FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "Users can insert own properties" ON public.properties
    FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update own properties" ON public.properties
    FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete own properties" ON public.properties
    FOR DELETE USING (auth.uid() = owner_id);

-- 4. Trigger para updated_at
CREATE TRIGGER on_properties_updated
    BEFORE UPDATE ON public.properties
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- 5. Índices
CREATE INDEX IF NOT EXISTS idx_properties_owner ON public.properties(owner_id);
CREATE INDEX IF NOT EXISTS idx_properties_city ON public.properties(city);
CREATE INDEX IF NOT EXISTS idx_properties_active ON public.properties(owner_id, is_active);

-- ✅ Script 4 completado
-- Ahora ejecuta el Script 5 (ical_syncs)
