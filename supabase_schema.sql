-- ====================================================================
-- SUPABASE POSTGRESQL DATABASE SCHEMA & PRE-SEEDED DATA
-- Cátedra Derecho Constitucional C - CONSTI-BOT
-- ====================================================================

-- 1. Create Profiles Table (Students and Teachers)
CREATE TABLE IF NOT EXISTS public.profiles (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('student', 'teacher')),
    es_docente BOOLEAN DEFAULT FALSE,
    password_hash TEXT DEFAULT NULL,
    session_token TEXT DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure the columns exist if the table already existed with an older structure
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS es_docente BOOLEAN DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS password_hash TEXT DEFAULT NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS session_token TEXT DEFAULT NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- 2. Create Cases Table
CREATE TABLE IF NOT EXISTS public.cases (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    year INTEGER NOT NULL,
    court TEXT NOT NULL,
    theme TEXT NOT NULL,
    summary TEXT,
    guarantees TEXT[] DEFAULT '{}',
    core_facts TEXT,
    socratic_phases JSONB NOT NULL,
    is_custom BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure the columns exist if the table already existed with an older structure
ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS socratic_phases JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS is_custom BOOLEAN DEFAULT FALSE;
ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS core_facts TEXT;
ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS guarantees TEXT[] DEFAULT '{}';


-- 3. Create Documents/RAG Table
CREATE TABLE IF NOT EXISTS public.rag_documents (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    size TEXT NOT NULL,
    status TEXT NOT NULL,
    case_id TEXT NOT NULL,
    uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create Chat Message Audit Table
CREATE TABLE IF NOT EXISTS public.chat_messages (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL,
    case_id TEXT NOT NULL,
    sender TEXT NOT NULL,
    text TEXT NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    rag_source TEXT,
    rag_similarity DOUBLE PRECISION
);

-- 5. Create Fichas Table (Student Summary Sheets)
CREATE TABLE IF NOT EXISTS public.student_fichas (
    username TEXT NOT NULL,
    case_id TEXT NOT NULL,
    actor TEXT DEFAULT '—',
    year TEXT DEFAULT '—',
    guarantees TEXT[] DEFAULT '{}',
    concepts TEXT[] DEFAULT '{}',
    resolution TEXT DEFAULT '—',
    completed BOOLEAN DEFAULT FALSE,
    current_phase_index INTEGER DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    nombre_del_fallo TEXT DEFAULT '—',
    fallos TEXT DEFAULT '—',
    ano TEXT DEFAULT '—',
    hechos TEXT DEFAULT '—',
    cuestiones_presentadas TEXT DEFAULT '—',
    primera_instancia TEXT DEFAULT '—',
    segunda_instancia TEXT DEFAULT '—',
    tipo_jurisdiccion_invocada TEXT DEFAULT '—',
    procurador_general_principios TEXT DEFAULT '—',
    procurador_general_razonamiento TEXT DEFAULT '—',
    decision_corte_principios TEXT DEFAULT '—',
    decision_corte_razonamiento TEXT DEFAULT '—',
    disidencia_concurrencia_principios TEXT DEFAULT '—',
    disidencia_concurrencia_razonamiento TEXT DEFAULT '—',
    obiter_dictum_significativo TEXT DEFAULT '—',
    PRIMARY KEY (username, case_id)
);

ALTER TABLE public.student_fichas ADD COLUMN IF NOT EXISTS actor TEXT DEFAULT '—';
ALTER TABLE public.student_fichas ADD COLUMN IF NOT EXISTS year TEXT DEFAULT '—';
ALTER TABLE public.student_fichas ADD COLUMN IF NOT EXISTS guarantees TEXT[] DEFAULT '{}';
ALTER TABLE public.student_fichas ADD COLUMN IF NOT EXISTS concepts TEXT[] DEFAULT '{}';
ALTER TABLE public.student_fichas ADD COLUMN IF NOT EXISTS resolution TEXT DEFAULT '—';
ALTER TABLE public.student_fichas ADD COLUMN IF NOT EXISTS completed BOOLEAN DEFAULT FALSE;
ALTER TABLE public.student_fichas ADD COLUMN IF NOT EXISTS current_phase_index INTEGER DEFAULT 0;
ALTER TABLE public.student_fichas ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.student_fichas ADD COLUMN IF NOT EXISTS nombre_del_fallo TEXT DEFAULT '—';
ALTER TABLE public.student_fichas ADD COLUMN IF NOT EXISTS fallos TEXT DEFAULT '—';
ALTER TABLE public.student_fichas ADD COLUMN IF NOT EXISTS ano TEXT DEFAULT '—';
ALTER TABLE public.student_fichas ADD COLUMN IF NOT EXISTS hechos TEXT DEFAULT '—';
ALTER TABLE public.student_fichas ADD COLUMN IF NOT EXISTS cuestiones_presentadas TEXT DEFAULT '—';
ALTER TABLE public.student_fichas ADD COLUMN IF NOT EXISTS primera_instancia TEXT DEFAULT '—';
ALTER TABLE public.student_fichas ADD COLUMN IF NOT EXISTS segunda_instancia TEXT DEFAULT '—';
ALTER TABLE public.student_fichas ADD COLUMN IF NOT EXISTS tipo_jurisdiccion_invocada TEXT DEFAULT '—';
ALTER TABLE public.student_fichas ADD COLUMN IF NOT EXISTS procurador_general_principios TEXT DEFAULT '—';
ALTER TABLE public.student_fichas ADD COLUMN IF NOT EXISTS procurador_general_razonamiento TEXT DEFAULT '—';
ALTER TABLE public.student_fichas ADD COLUMN IF NOT EXISTS decision_corte_principios TEXT DEFAULT '—';
ALTER TABLE public.student_fichas ADD COLUMN IF NOT EXISTS decision_corte_razonamiento TEXT DEFAULT '—';
ALTER TABLE public.student_fichas ADD COLUMN IF NOT EXISTS disidencia_concurrencia_principios TEXT DEFAULT '—';
ALTER TABLE public.student_fichas ADD COLUMN IF NOT EXISTS disidencia_concurrencia_razonamiento TEXT DEFAULT '—';
ALTER TABLE public.student_fichas ADD COLUMN IF NOT EXISTS obiter_dictum_significativo TEXT DEFAULT '—';

ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.cases DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.rag_documents DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_fichas DISABLE ROW LEVEL SECURITY;

-- ====================================================================
-- PRE-SEEDED DEMO DATA INSERTIONS
-- ====================================================================

-- Seed Profiles
INSERT INTO public.profiles (id, username, name, role, es_docente, password_hash) VALUES
('11111111-1111-1111-1111-111111111111', 'ALU2024', 'Santiago Fernández', 'student', FALSE, NULL),
('22222222-2222-2222-2222-222222222222', 'DOC101', 'Dra. Elena Bianchi', 'teacher', TRUE, '068038773fce594adf37ee1185813a35afe264ac628343de1449f1207eea6ea8'),
('33333333-3333-3333-3333-333333333333', 'ALU456', 'Marta Rodriguez', 'student', FALSE, NULL)
ON CONFLICT (username) DO NOTHING;

-- Seed Cases
INSERT INTO public.cases (id, title, year, court, theme, summary, guarantees, core_facts, socratic_phases, is_custom) VALUES
(
  'arenzon',
  'Caso Arenzon (1984)',
  1984,
  'Corte Suprema de Justicia de la Nación',
  'Principio de Razonabilidad y No Discriminación',
  'Gabriel Arenzon fue rechazado de su profesorado de matemáticas debido a que su estatura (1.48m) no alcanzaba el mínimo de 1.60m exigido por el reglamento de Sanidad Escolar. La Corte Suprema declaró la inconstitucionalidad de dicha exigencia por resultar arbitraria e irrazonable en virtud del Art. 28 de la CN.',
  ARRAY['Derecho a Trabajar (Art. 14)', 'Derecho de Enseñar y Aprender (Art. 14)', 'Principio de Igualdad (Art. 16)'],
  'Gabriel Arenzon completó sus estudios para enseñar matemáticas pero se le negó el diploma habilitante porque medía 1.48 metros. La normativa vigente en el Ministerio de Educación exigía 1.60 metros de altura mínima para cargos docentes.',
  '[
    {
      "name": "Hechos del Caso",
      "question": "Hola Santiago, comencemos analizando los hechos del Caso Arenzon. ¿Por qué motivo concreto el organismo de Sanidad Escolar catalogó como \"no apto\" a Gabriel Arenzon para dictar clases de matemáticas?",
      "targetConcepts": ["estatura", "altura", "metro", "medida", "física", "físico", "1.48", "1,48", "escasas dimensiones", "dimensiones escasas"],
      "hint": "Fíjate en las características físicas de Arenzon y qué requisito formal ponía el reglamento del Ministerio sobre la altura requerida."
    },
    {
      "name": "Derechos Constitucionales",
      "question": "Excelente. Detectas con claridad la discriminación física. Ahora pasemos al aspecto normativo. ¿Qué derechos constitucionales reconocidos en el Artículo 14 y Artículo 16 de la Constitución Nacional se vieron afectados por este reglamento?",
      "targetConcepts": ["igualdad", "trabajar", "enseñar", "aprender", "ejercer industria lícita", "reclamar", "art. 14", "art. 16"],
      "hint": "Recuerda que Arenzon era un profesional capacitado que quería ejercer la docencia. ¿Qué derechos le dan la CN para ganarse la vida y transmitir conocimientos?"
    },
    {
      "name": "Test de Razonabilidad (Art. 28)",
      "question": "Perfecto, identificaste los derechos a enseñar, aprender, trabajar y la garantía de igualdad. Ahora bien, el Estado puede regular los derechos, pero con límites. Analiza el Artículo 28 de la CN. ¿Existe una relación coherente e inteligente (razonable) entre tener una estatura menor a 1.60m y la aptitud intelectual para enseñar matemáticas?",
      "targetConcepts": ["no existe", "razonable", "irracional", "arbitrario", "artículo 28", "art 28", "relación", "coherencia", "capacidad intelectual", "ninguna relación", "intelecto"],
      "hint": "Piensa si la estatura influye en la capacidad de resolver ecuaciones o explicar teoremas a los alumnos. ¿Se justifica cercenar un derecho por un criterio de altura?"
    },
    {
      "name": "Resolución de la Corte Suprema",
      "question": "¡Formidable análisis normativo! Has conceptualizado el desvío de razonabilidad del Art. 28 de la Constitución Nacional. Para concluir, ¿cuál fue la doctrina sentada por la Corte Suprema al resolver el caso? ¿Qué declaró respecto a la resolución ministerial de Sanidad Escolar?",
      "targetConcepts": ["inconstitucional", "inconstitucionalidad", "arbitrario", "nulo", "ilegal", "favorable", "lugar", "amparo"],
      "hint": "¿La Corte consintió la discriminación o declaró que la norma chocaba frontalmente con la Ley Fundamental ordenando otorgar el apto?"
    }
  ]'::jsonb,
  FALSE
),
(
  'halabi',
  'Caso Halabi (2009)',
  2009,
  'Corte Suprema de Justicia de la Nación',
  'Acciones de Clase y Derechos de Incidencia Colectiva',
  'Ernesto Halabi interpuso amparo contra la Ley de Telecomunicaciones que autorizaba la recolección de llamadas y tráfico de datos sin control judicial. La Corte Suprema reconoció la categoría de "derechos de incidencia colectiva referentes a intereses individuales homogéneos" dando origen pretoriano a la acción de clase en Argentina.',
  ARRAY['Derecho a la Intimidad (Art. 19)', 'Inviolabilidad de la Correspondencia y Papeles (Art. 18)', 'Amparo Colectivo (Art. 43)'],
  'Halabi, abogado, interpuso amparo por entender que el registro forzoso de sus telecomunicaciones violaba el secreto profesional e intimidad, extendiéndose este agravio a todos los usuarios del país.',
  '[
    {
      "name": "Hechos del Amparo",
      "question": "Buenas, analicemos el Caso Halabi. ¿Qué medida estatal (o qué ley) impugnaba el abogado Ernesto Halabi y qué recolectaba esta norma sobre todos los ciudadanos?",
      "targetConcepts": ["ley de telecomunicaciones", "registro", "llamadas", "intervención", "datos", "comunicaciones", "teléfono", "intrusión", "vigilancia"],
      "hint": "Halabi protestaba contra una norma (Ley 25.873) que autorizaba el acopio masivo de información de telecomunicaciones sin orden escrita de un juez competente."
    },
    {
      "name": "Categoría de Derechos",
      "question": "Muy bien. Ahora, el punto clave de este fallo es procesal. Hasta 1994 y 2009 los derechos eran individuales o colectivos tradicionales (como medio ambiente). ¿Qué nueva categoría jurídica de derechos \"homogéneos\" introdujo la Corte en este Fallo?",
      "targetConcepts": ["incidencia colectiva", "intereses individuales homogéneos", "homogéneo", "acción de clase", "interés colectivo"],
      "hint": "Consiste en una categoría donde hay muchos damnificados individuales por un solo hecho común, afectando de manera idéntica a todo el grupo (como usuarios de telefonía)."
    },
    {
      "name": "Derechos Individuales en Juego",
      "question": "Exactamente, \"derechos de incidencia colectiva referentes a intereses individuales homogéneos\". ¿Qué garantías clásicas contenidas en los Artículos 18 y 19 de la CN se amparan aquí?",
      "targetConcepts": ["intimidad", "privacidad", "inviolabilidad de la correspondencia", "art 18", "art 19", "secreto profesional"],
      "hint": "Piensa en las conversaciones privadas, los mensajes, y el secreto que compartes con tus corresponsales sin la intrusión del Estado."
    }
  ]'::jsonb,
  FALSE
),
(
  'kot',
  'Caso Kot (1958)',
  1958,
  'Corte Suprema de Justicia de la Nación',
  'Acceso Directo a la Justicia y Amparo de Particulares',
  'A través de un conflicto gremial, la fábrica textil de Kot fue tomada por obreros. Kot alegó que sufría la usurpación del derecho a la propiedad. La Corte falló que la acción de amparo es perfectamente admisible frente a actos ilegítimos cometidos no solo por el Estado, sino también por particulares.',
  ARRAY['Derecho de Propiedad (Art. 17)', 'Libertad de Trabajo y Comercio (Art. 14)', 'Acción de Amparo pretoriana'],
  'Tras las ocupaciones de la planta textil de la firma Samuel Kot S.R.L. y habiéndose librado vías penales poco idóneas, Kot entabla la acción directa constitucional ya sentada en el caso Siri, extendiendo la cobertura frente a particulares.',
  '[
    {
      "name": "Conflicto de Hecho",
      "question": "Estudiemos el Caso Kot. ¿Cuál fue el suceso fáctico específico que impidió a Samuel Kot hacer uso normal de su fábrica e instalaciones?",
      "targetConcepts": ["huelga", "toma de la fábrica", "ocupación", "usurpación", "obreros", "plantón", "conflicto gremial"],
      "hint": "Los trabajadores de la fábrica decretaron una huelga e ingresaron por la fuerza, ocupando físicamente las instalaciones del establecimiento fabril."
    },
    {
      "name": "Doble Vía y Amparo frente a quiénes",
      "question": "Excelente reconocimiento del hecho. El aporte histórico de Kot junto con Siri creó el Amparo pretoriano. Siri lo creó contra actos administrativos del Estado. Pero, ¿cuál fue el giro de Kot? ¿Contra los actos de quiénes determinó la Corte que procede el Amparo?",
      "targetConcepts": ["particulares", "privados", "sindicatos", "personas privadas", "no estatales"],
      "hint": "Piensa en quiénes eran los agresores del derecho en Kot: no eran militares ni policías estatales, sino obreros despedidos (actores individuales privados)."
    }
  ]'::jsonb,
  FALSE
)
ON CONFLICT (id) DO NOTHING;

-- Seed Documents
INSERT INTO public.rag_documents (id, name, size, status, case_id) VALUES
('doc-1', 'fallo_arenzon_completo.pdf', '2.4 MB', 'Indexado', 'arenzon'),
('doc-2', 'analisis_principales_vulneraciones_art_28.docx', '420 KB', 'Indexado', 'arenzon'),
('doc-3', 'fallo_halabi_dictamen_procuracion.pdf', '3.1 MB', 'Indexado', 'halabi'),
('doc-4', 'resumen_jurisprudencia_siri_y_kot.txt', '94 KB', 'Indexado', 'kot')
ON CONFLICT (id) DO NOTHING;

-- Seed Fichas
INSERT INTO public.student_fichas (username, case_id, actor, year, guarantees, concepts, resolution, completed, current_phase_index, nombre_del_fallo, fallos, ano, hechos, cuestiones_presentadas, primera_instancia, segunda_instancia, tipo_jurisdiccion_invocada, procurador_general_principios, procurador_general_razonamiento, decision_corte_principios, decision_corte_razonamiento, disidencia_concurrencia_principios, disidencia_concurrencia_razonamiento, obiter_dictum_significativo) VALUES
('ALU2024', 'arenzon', 'Gabriel Arenzon', '1984', ARRAY['Art. 14 Constitucional (Trabajar, Enseñar)', 'Art. 16 Constitucional (Igualdad ante la Ley)'], ARRAY[]::text[], 'Pendiente de resolución', FALSE, 2, 'Caso Arenzon (1984)', 'Fallos: 306:400', '1984', 'Gabriel Arenzon completó sus estudios para enseñar matemáticas pero se le negó el diploma habilitante porque medía 1.48 metros. La normativa vigente en el Ministerio de Educación exigía 1.60 metros de altura mínima para cargos docentes.', '—', '—', '—', '—', '—', '—', '—', '—', '—', '—', '—'),
('ALU456', 'arenzon', 'Gabriel Arenzon', '1984', ARRAY['Art. 14 Constitucional', 'Art. 16 Constitucional'], ARRAY['Test de Razonabilidad del Art. 28', 'Habilitación Académica vs Estructura Física'], 'Declarar la inconstitucionalidad de la resolución ministerial limitante, otorgando habilitación.', TRUE, 4, 'Caso Arenzon (1984)', 'Fallos: 306:400', '1984', 'Gabriel Arenzon completó sus estudios para enseñar matemáticas pero se le negó el diploma habilitante porque medía 1.48 metros. La normativa vigente en el Ministerio de Educación exigía 1.60 metros de altura mínima para cargos docentes.', 'Incompatibilidad de la estatura de 1,60 metros con los derechos de trabajar y enseñar matemáticas del Art. 14 de la CN.', 'Hace lugar al amparo. Declara inconstitucional la norma.', 'Confirma la sentencia de primera instancia.', 'Recurso Extraordinario Federal - Ley 48', 'Igualdad ante la ley e idoneidad para el cargo público.', 'La estatura no es indicativa de potencial intelectual o pedagógico docente.', 'Supremacía Constitucional (Art. 31) y Test de Razonabilidad del Art. 28.', 'Gabriel Arenzon fue rechazado de su profesorado de matemáticas debido a que su estatura (1.48m) no alcanzaba el mínimo de 1.60m exigido por el reglamento de Sanidad Escolar. La Corte Suprema declaró la inconstitucionalidad de dicha exigencia por resultar arbitraria e irrazonable en virtud del Art. 28 de la CN.', 'Sin disidencias', 'Fallo dictado por unanimidad.', 'La idoneidad de un docente reside en su intelecto y formación, no en su escala de estatura física.')
ON CONFLICT (username, case_id) DO NOTHING;

-- 6. Enable pgvector extension and create Vector Store for socratic text fragmentation
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS public.document_chunks (
    id TEXT PRIMARY KEY,
    document_id TEXT REFERENCES public.rag_documents(id) ON DELETE CASCADE,
    document_name TEXT,
    case_id TEXT REFERENCES public.cases(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    embedding VECTOR(768), -- text-embedding-004 output dimension
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Stored Procedure for Cosine Distance Semantic Matching in Database
CREATE OR REPLACE FUNCTION match_document_chunks (
  query_embedding vector(768),
  match_threshold float,
  match_count int,
  filter_case_id text
)
RETURNS TABLE (
  id text,
  document_id text,
  document_name text,
  case_id text,
  content text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    dc.id,
    dc.document_id,
    dc.document_name,
    dc.case_id,
    dc.content,
    (1 - (dc.embedding <=> query_embedding))::float AS similarity
  FROM public.document_chunks dc
  WHERE dc.case_id = filter_case_id
    AND (1 - (dc.embedding <=> query_embedding)) > match_threshold
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

