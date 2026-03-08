-- ============================================
-- APARGESTION - SQL Script 9: template_variables
-- Ejecuta esto DESPUÉS del Script 8
-- ============================================

-- 1. Crear tabla template_variables
CREATE TABLE IF NOT EXISTS public.template_variables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES public.document_templates(id) ON DELETE CASCADE,
    name TEXT NOT NULL,                    -- Nombre técnico de la variable (ej: "nombre_inquilino")
    display_name TEXT,                     -- Nombre para mostrar (ej: "Nombre del Inquilino")
    variable_type TEXT DEFAULT 'text' CHECK (variable_type IN (
        'text',       -- Texto libre
        'number',     -- Solo números
        'date',       -- Selector de fecha
        'dni',        -- Formato DNI español (8 dígitos + letra)
        'email',      -- Validación email
        'phone',      -- Teléfono
        'select',     -- Lista de opciones
        'uppercase',  -- Texto en mayúsculas
        'lowercase',  -- Texto en minúsculas
        'currency'    -- Formato moneda (€)
    )),
    is_required BOOLEAN DEFAULT false,
    default_value TEXT,
    options TEXT[] DEFAULT '{}',           -- Para tipo 'select': opciones disponibles
    validation_regex TEXT,                 -- Regex personalizado para validación
    transform TEXT DEFAULT 'none' CHECK (transform IN ('uppercase', 'lowercase', 'capitalize', 'none')),
    placeholder TEXT,
    help_text TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Habilitar RLS
ALTER TABLE public.template_variables ENABLE ROW LEVEL SECURITY;

-- 3. Políticas (basadas en el template padre)
-- Los usuarios pueden ver variables de sus propias plantillas
CREATE POLICY "Users can view own template variables" ON public.template_variables
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.document_templates dt
            WHERE dt.id = template_id AND dt.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert own template variables" ON public.template_variables
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.document_templates dt
            WHERE dt.id = template_id AND dt.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update own template variables" ON public.template_variables
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.document_templates dt
            WHERE dt.id = template_id AND dt.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete own template variables" ON public.template_variables
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.document_templates dt
            WHERE dt.id = template_id AND dt.user_id = auth.uid()
        )
    );

-- 4. Índices
CREATE INDEX IF NOT EXISTS idx_template_variables_template ON public.template_variables(template_id);
CREATE INDEX IF NOT EXISTS idx_template_variables_sort ON public.template_variables(template_id, sort_order);

-- 5. Unique constraint: Una variable por nombre por plantilla
CREATE UNIQUE INDEX IF NOT EXISTS idx_template_variables_unique_name ON public.template_variables(template_id, name);

-- ✅ Script 9 completado
-- Ejecuta este script en tu panel de Supabase (SQL Editor)
