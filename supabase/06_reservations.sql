-- ============================================
-- APARGESTION - SQL Script 6: reservations
-- Ejecuta esto DESPUÉS del Script 5
-- ============================================

-- 1. Crear tabla reservations
CREATE TABLE IF NOT EXISTS public.reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    external_id TEXT,
    guest_name TEXT NOT NULL,
    guest_email TEXT,
    guest_phone TEXT,
    check_in DATE NOT NULL,
    check_out DATE NOT NULL,
    num_guests INTEGER DEFAULT 1,
    total_price DECIMAL(10, 2),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed', 'no_show')),
    source TEXT DEFAULT 'manual' CHECK (source IN ('manual', 'booking', 'airbnb', 'vrbo', 'ical', 'other')),
    notes TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Validación: check_out debe ser después de check_in
    CONSTRAINT valid_dates CHECK (check_out > check_in)
);

-- 2. Habilitar RLS
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;

-- 3. Políticas
CREATE POLICY "Users can view own reservations" ON public.reservations
    FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "Users can insert own reservations" ON public.reservations
    FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update own reservations" ON public.reservations
    FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete own reservations" ON public.reservations
    FOR DELETE USING (auth.uid() = owner_id);

-- 4. Trigger para updated_at
CREATE TRIGGER on_reservations_updated
    BEFORE UPDATE ON public.reservations
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- 5. Índices
CREATE INDEX IF NOT EXISTS idx_reservations_owner ON public.reservations(owner_id);
CREATE INDEX IF NOT EXISTS idx_reservations_property ON public.reservations(property_id);
CREATE INDEX IF NOT EXISTS idx_reservations_dates ON public.reservations(property_id, check_in, check_out);
CREATE INDEX IF NOT EXISTS idx_reservations_status ON public.reservations(owner_id, status);
CREATE INDEX IF NOT EXISTS idx_reservations_external ON public.reservations(external_id);

-- ✅ Script 6 completado
-- Ahora ejecuta el Script 7 (guests)
