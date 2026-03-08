-- ============================================
-- APARGESTION - SQL Script 10: template_variable_groups
-- Ejecuta esto DESPUÉS del Script 9
-- ============================================

-- 1. Crear tabla template_variable_groups
-- Define grupos de variables repetibles para plantillas
CREATE TABLE IF NOT EXISTS public.template_variable_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES public.document_templates(id) ON DELETE CASCADE,
    name TEXT NOT NULL,                    -- Nombre técnico del grupo (ej: "inquilino")
    display_name TEXT,                     -- Nombre para mostrar (ej: "Datos del Inquilino")
    separator TEXT DEFAULT '; ',           -- Separador entre instancias repetidas
    min_instances INTEGER DEFAULT 1,       -- Mínimo de instancias requeridas
    max_instances INTEGER DEFAULT 10,      -- Máximo de instancias permitidas
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Añadir columna group_id a template_variables para asociar variable a grupo
ALTER TABLE public.template_variables 
ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES public.template_variable_groups(id) ON DELETE SET NULL;

-- 3. Habilitar RLS
ALTER TABLE public.template_variable_groups ENABLE ROW LEVEL SECURITY;

-- 4. Políticas (basadas en el template padre)
CREATE POLICY "Users can view own template groups" ON public.template_variable_groups
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.document_templates dt
            WHERE dt.id = template_id AND dt.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert own template groups" ON public.template_variable_groups
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.document_templates dt
            WHERE dt.id = template_id AND dt.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update own template groups" ON public.template_variable_groups
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.document_templates dt
            WHERE dt.id = template_id AND dt.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete own template groups" ON public.template_variable_groups
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.document_templates dt
            WHERE dt.id = template_id AND dt.user_id = auth.uid()
        )
    );

-- 5. Índices
CREATE INDEX IF NOT EXISTS idx_template_variable_groups_template ON public.template_variable_groups(template_id);
CREATE INDEX IF NOT EXISTS idx_template_variable_groups_sort ON public.template_variable_groups(template_id, sort_order);

-- 6. Unique constraint: Un grupo por nombre por plantilla
CREATE UNIQUE INDEX IF NOT EXISTS idx_template_variable_groups_unique_name ON public.template_variable_groups(template_id, name);

-- 7. Índice para la nueva columna en template_variables
CREATE INDEX IF NOT EXISTS idx_template_variables_group ON public.template_variables(group_id);

-- ✅ Script 10 completado
-- Ejecuta este script en tu panel de Supabase (SQL Editor)
