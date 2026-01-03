-- ============================================
-- APARGESTION - SQL Script 3: document_templates
-- Ejecuta esto DESPUÉS del Script 2
-- ============================================

-- 1. Crear tabla document_templates
CREATE TABLE IF NOT EXISTS public.document_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    html_content TEXT NOT NULL,
    variables TEXT[] DEFAULT '{}',
    type TEXT DEFAULT 'other' CHECK (type IN ('contract', 'invoice', 'checkin', 'other')),
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Habilitar RLS
ALTER TABLE public.document_templates ENABLE ROW LEVEL SECURITY;

-- 3. Políticas
CREATE POLICY "Users can view own templates" ON public.document_templates
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own templates" ON public.document_templates
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own templates" ON public.document_templates
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own templates" ON public.document_templates
    FOR DELETE USING (auth.uid() = user_id);

-- 4. Trigger para updated_at
CREATE TRIGGER on_document_templates_updated
    BEFORE UPDATE ON public.document_templates
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- 5. Índices
CREATE INDEX IF NOT EXISTS idx_document_templates_user ON public.document_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_document_templates_type ON public.document_templates(user_id, type);

-- ✅ Script 3 completado
-- Ahora ejecuta el Script 4 (properties)
