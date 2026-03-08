-- ============================================
-- APARGESTION - Template Drafts Table
-- Sistema de borradores para guardar progreso al rellenar plantillas
-- ============================================

-- ============================================
-- Crear tabla template_drafts
-- ============================================
CREATE TABLE IF NOT EXISTS public.template_drafts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    template_id UUID NOT NULL REFERENCES public.document_templates(id) ON DELETE CASCADE,
    
    -- Identificación del borrador
    name TEXT NOT NULL DEFAULT 'Borrador sin nombre',
    
    -- Datos guardados
    values JSONB DEFAULT '{}'::jsonb,           -- Valores de variables simples
    group_values JSONB DEFAULT '{}'::jsonb,     -- Valores de grupos repetibles
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Row Level Security
-- ============================================
ALTER TABLE public.template_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own drafts" ON public.template_drafts
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own drafts" ON public.template_drafts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own drafts" ON public.template_drafts
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own drafts" ON public.template_drafts
    FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- Trigger para updated_at
-- ============================================
CREATE TRIGGER on_template_drafts_updated
    BEFORE UPDATE ON public.template_drafts
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- ============================================
-- Índices
-- ============================================
CREATE INDEX IF NOT EXISTS idx_template_drafts_user ON public.template_drafts(user_id);
CREATE INDEX IF NOT EXISTS idx_template_drafts_template ON public.template_drafts(template_id);
CREATE INDEX IF NOT EXISTS idx_template_drafts_updated ON public.template_drafts(user_id, updated_at DESC);

-- ============================================
-- Añadir group_values a generated_documents si no existe
-- (Para guardar también los valores de grupos al generar PDF)
-- ============================================
ALTER TABLE public.generated_documents 
ADD COLUMN IF NOT EXISTS group_values_used JSONB DEFAULT '{}'::jsonb;

-- ✅ Migración completada
-- Tabla añadida: template_drafts
-- Columna añadida: generated_documents.group_values_used
