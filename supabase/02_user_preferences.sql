-- ============================================
-- APARGESTION - SQL Script 2: user_preferences
-- Ejecuta esto DESPUÉS del Script 1
-- ============================================

-- 1. Crear tabla user_preferences
CREATE TABLE IF NOT EXISTS public.user_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    key TEXT NOT NULL,
    value JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Evitar duplicados de key por usuario
    UNIQUE(user_id, key)
);

-- 2. Habilitar RLS
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- 3. Políticas
CREATE POLICY "Users can view own preferences" ON public.user_preferences
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences" ON public.user_preferences
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences" ON public.user_preferences
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own preferences" ON public.user_preferences
    FOR DELETE USING (auth.uid() = user_id);

-- 4. Trigger para updated_at
CREATE TRIGGER on_user_preferences_updated
    BEFORE UPDATE ON public.user_preferences
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- 5. Índices
CREATE INDEX IF NOT EXISTS idx_user_preferences_user ON public.user_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_preferences_key ON public.user_preferences(user_id, key);

-- ✅ Script 2 completado
-- Ahora ejecuta el Script 3 (document_templates)
