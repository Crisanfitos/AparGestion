-- ============================================
-- APARGESTION - SQL Migration: Additional Tables & Storage
-- Ejecuta esto en Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. Añadir booking_url a properties (si no existe)
-- ============================================
ALTER TABLE public.properties 
ADD COLUMN IF NOT EXISTS booking_url TEXT;

-- ============================================
-- 2. Crear tabla template_versions (versionado de plantillas)
-- ============================================
CREATE TABLE IF NOT EXISTS public.template_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES public.document_templates(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    html_content TEXT NOT NULL,
    variables TEXT[] DEFAULT '{}',
    change_summary TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(template_id, version_number)
);

-- RLS para template_versions
ALTER TABLE public.template_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own template versions" ON public.template_versions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.document_templates dt 
            WHERE dt.id = template_id AND dt.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert own template versions" ON public.template_versions
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.document_templates dt 
            WHERE dt.id = template_id AND dt.user_id = auth.uid()
        )
    );

CREATE INDEX IF NOT EXISTS idx_template_versions_template ON public.template_versions(template_id);

-- ============================================
-- 3. Crear tabla generated_documents (historial de documentos)
-- ============================================
CREATE TABLE IF NOT EXISTS public.generated_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    template_id UUID REFERENCES public.document_templates(id) ON DELETE SET NULL,
    
    -- Metadatos del documento
    title TEXT NOT NULL,
    document_type TEXT NOT NULL CHECK (document_type IN ('invoice', 'contract', 'checkin', 'other')),
    
    -- Archivo generado
    file_url TEXT, -- URL en Supabase Storage
    file_name TEXT,
    file_size_bytes INTEGER,
    
    -- Variables usadas para rellenar el template
    variables_used JSONB DEFAULT '{}'::jsonb,
    
    -- Metadatos adicionales
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS para generated_documents
ALTER TABLE public.generated_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own documents" ON public.generated_documents
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own documents" ON public.generated_documents
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own documents" ON public.generated_documents
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own documents" ON public.generated_documents
    FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER on_generated_documents_updated
    BEFORE UPDATE ON public.generated_documents
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX IF NOT EXISTS idx_generated_documents_user ON public.generated_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_generated_documents_type ON public.generated_documents(user_id, document_type);
CREATE INDEX IF NOT EXISTS idx_generated_documents_created ON public.generated_documents(user_id, created_at DESC);

-- ============================================
-- 4. Crear Storage Buckets (ejecutar en Supabase Dashboard > Storage)
-- ============================================
-- NOTA: Los buckets se crean mejor desde el Dashboard de Supabase:
--   1. Ve a Storage > Create a new bucket
--   2. Crea estos buckets:
--      - "avatars" (público) - Fotos de perfil
--      - "property-photos" (público) - Fotos de propiedades
--      - "documents" (privado) - PDFs generados
--      - "signatures" (privado) - Firmas de huéspedes
--      - "id-documents" (privado) - Fotos de DNI/pasaporte

-- Alternativamente, con SQL (requiere permisos de storage):
INSERT INTO storage.buckets (id, name, public)
VALUES 
    ('avatars', 'avatars', true),
    ('property-photos', 'property-photos', true),
    ('documents', 'documents', false),
    ('signatures', 'signatures', false),
    ('id-documents', 'id-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Políticas para buckets públicos (avatars, property-photos)
CREATE POLICY "Avatar images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'avatars' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Property photos are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'property-photos');

CREATE POLICY "Users can upload property photos"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'property-photos' 
    AND auth.uid() IS NOT NULL
);

-- Políticas para buckets privados (documents, signatures, id-documents)
CREATE POLICY "Users can access own documents"
ON storage.objects FOR SELECT
USING (
    bucket_id = 'documents' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can upload documents"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'documents' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can access own signatures"
ON storage.objects FOR SELECT
USING (
    bucket_id = 'signatures' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can upload signatures"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'signatures' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can access own id-documents"
ON storage.objects FOR SELECT
USING (
    bucket_id = 'id-documents' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can upload id-documents"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'id-documents' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);

-- ✅ Migración completada
-- Tablas añadidas: template_versions, generated_documents
-- Buckets: avatars, property-photos, documents, signatures, id-documents
