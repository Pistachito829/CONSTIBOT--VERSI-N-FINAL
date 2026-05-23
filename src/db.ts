/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { UserProfile, FalloCase, RagDoc, ChatMessage, StudentFicha } from './types';

// Pre-seeded Students & Teachers
const DEFAULT_PROFILES: UserProfile[] = [
  { id: 'usr-1', username: 'ALU2024', name: 'Santiago Fernández', role: 'student', createdAt: new Date().toISOString() },
  { id: 'usr-2', username: 'DOC101', name: 'Dra. Elena Bianchi', role: 'teacher', createdAt: new Date().toISOString() },
  { id: 'usr-3', username: 'ALU456', name: 'Marta Rodriguez', role: 'student', createdAt: new Date().toISOString() },
];

// Pre-seeded Jurisprudence Cases
const DEFAULT_CASES: FalloCase[] = [
  {
    id: 'arenzon',
    title: 'Caso Arenzon (1984)',
    year: 1984,
    court: 'Corte Suprema de Justicia de la Nación',
    theme: 'Principio de Razonabilidad y No Discriminación',
    summary: 'Gabriel Arenzon fue rechazado de su profesorado de matemáticas debido a que su estatura (1.48m) no alcanzaba el mínimo de 1.60m exigido por el reglamento de Sanidad Escolar. La Corte Suprema declaró la inconstitucionalidad de dicha exigencia por resultar arbitraria e irrazonable en virtud del Art. 28 de la CN.',
    guarantees: ['Derecho a Trabajar (Art. 14)', 'Derecho de Enseñar y Aprender (Art. 14)', 'Principio de Igualdad (Art. 16)'],
    coreFacts: 'Gabriel Arenzon completó sus estudios para enseñar matemáticas pero se le negó el diploma habilitante porque medía 1.48 metros. La normativa vigente en el Ministerio de Educación exigía 1.60 metros de altura mínima para cargos docentes.',
    socraticPhases: [
      {
        name: 'Hechos del Caso',
        question: 'Hola Santiago, comencemos analizando los hechos del Caso Arenzon. ¿Por qué motivo concreto el organismo de Sanidad Escolar catalogó como "no apto" a Gabriel Arenzon para dictar clases de matemáticas?',
        targetConcepts: ['estatura', 'altura', 'metro', 'medida', 'física', 'físico', '1.48', '1,48', 'escasas dimensiones', 'dimensiones escasas'],
        hint: 'Fíjate en las características físicas de Arenzon y qué requisito formal ponía el reglamento del Ministerio sobre la altura requerida.'
      },
      {
        name: 'Derechos Constitucionales',
        question: 'Excelente. Detectas con claridad la discriminación física. Ahora pasemos al aspecto normativo. ¿Qué derechos constitucionales reconocidos en el Artículo 14 y Artículo 16 de la Constitución Nacional se vieron afectados por este reglamento?',
        targetConcepts: ['igualdad', 'trabajar', 'enseñar', 'aprender', 'ejercer industria lícita', 'reclamar', 'art. 14', 'art. 16'],
        hint: 'Recuerda que Arenzon era un profesional capacitado que quería ejercer la docencia. ¿Qué derechos le dan la CN para ganarse la vida y transmitir conocimientos?'
      },
      {
        name: 'Test de Razonabilidad (Art. 28)',
        question: 'Perfecto, identificaste los derechos a enseñar, aprender, trabajar y la garantía de igualdad. Ahora bien, el Estado puede regular los derechos, pero con límites. Analiza el Artículo 28 de la CN. ¿Existe una relación coherente e inteligente (razonable) entre tener una estatura menor a 1.60m y la aptitud intelectual para enseñar matemáticas?',
        targetConcepts: ['no existe', 'razonable', 'irracional', 'arbitrario', 'artículo 28', 'art 28', 'relación', 'coherencia', 'capacidad intelectual', 'ninguna relación', 'intelecto'],
        hint: 'Piensa si la estatura influye en la capacidad de resolver ecuaciones o explicar teoremas a los alumnos. ¿Se justifica cercenar un derecho por un criterio de altura?'
      },
      {
        name: 'Resolución de la Corte Suprema',
        question: '¡Formidable análisis normativo! Has conceptualizado el desvío de razonabilidad del Art. 28 de la Constitución Nacional. Para concluir, ¿cuál fue la doctrina sentada por la Corte Suprema al resolver el caso? ¿Qué declaró respecto a la resolución ministerial de Sanidad Escolar?',
        targetConcepts: ['inconstitucional', 'inconstitucionalidad', 'arbitrario', 'nulo', 'ilegal', 'favorable', 'lugar', 'amparo'],
        hint: '¿La Corte consintió la discriminación o declaró que la norma chocaba frontalmente con la Ley Fundamental ordenando otorgar el apto?'
      }
    ]
  },
  {
    id: 'halabi',
    title: 'Caso Halabi (2009)',
    year: 2009,
    court: 'Corte Suprema de Justicia de la Nación',
    theme: 'Acciones de Clase y Derechos de Incidencia Colectiva',
    summary: 'Ernesto Halabi interpuso amparo contra la Ley de Telecomunicaciones que autorizaba la recolección de llamadas y tráfico de datos sin control judicial. La Corte Suprema reconoció la categoría de "derechos de incidencia colectiva referentes a intereses individuales homogéneos" dando origen pretoriano a la acción de clase en Argentina.',
    guarantees: ['Derecho a la Intimidad (Art. 19)', 'Inviolabilidad de la Correspondencia y Papeles (Art. 18)', 'Amparo Colectivo (Art. 43)'],
    coreFacts: 'Halabi, abogado, interpuso amparo por entender que el registro forzoso de sus telecomunicaciones violaba el secreto profesional e intimidad, extendiéndose este agravio a todos los usuarios del país.',
    socraticPhases: [
      {
        name: 'Hechos del Amparo',
        question: 'Buenas, analicemos el Caso Halabi. ¿Qué medida estatal (o qué ley) impugnaba el abogado Ernesto Halabi y qué recolectaba esta norma sobre todos los ciudadanos?',
        targetConcepts: ['ley de telecomunicaciones', 'registro', 'llamadas', 'intervención', 'datos', 'comunicaciones', 'teléfono', 'intrusión', 'vigilancia'],
        hint: 'Halabi protestaba contra una norma (Ley 25.873) que autorizaba el acopio masivo de información de telecomunicaciones sin orden escrita de un juez competente.'
      },
      {
        name: 'Categoría de Derechos',
        question: 'Muy bien. Ahora, el punto clave de este fallo es procesal. Hasta 1994 y 2009 los derechos eran individuales o colectivos tradicionales (como medio ambiente). ¿Qué nueva categoría jurídica de derechos "homogéneos" introdujo la Corte en este Fallo?',
        targetConcepts: ['incidencia colectiva', 'intereses individuales homogéneos', 'homogéneo', 'acción de clase', 'interés colectivo'],
        hint: 'Consiste en una categoría donde hay muchos damnificados individuales por un solo hecho común, afectando de manera idéntica a todo el grupo (como usuarios de telefonía).'
      },
      {
        name: 'Derechos Individuales en Juego',
        question: 'Exactamente, "derechos de incidencia colectiva referentes a intereses individuales homogéneos". ¿Qué garantías clásicas contenidas en los Artículos 18 y 19 de la CN se amparan aquí?',
        targetConcepts: ['intimidad', 'privacidad', 'inviolabilidad de la correspondencia', 'art 18', 'art 19', 'secreto profesional'],
        hint: 'Piensa en las conversaciones privadas, los mensajes, y el secreto que compartes con tus corresponsales sin la intrusión del Estado.'
      }
    ]
  },
  {
    id: 'kot',
    title: 'Caso Kot (1958)',
    year: 1958,
    court: 'Corte Suprema de Justicia de la Nación',
    theme: 'Acceso Directo a la Justicia y Amparo de Particulares',
    summary: 'A través de un conflicto gremial, la fábrica textil de Kot fue tomada por obreros. Kot alegó que sufría la usurpación del derecho a la propiedad. La Corte falló que la acción de amparo es perfectamente admisible frente a actos ilegítimos cometidos no solo por el Estado, sino también por particulares.',
    guarantees: ['Derecho de Propiedad (Art. 17)', 'Libertad de Trabajo y Comercio (Art. 14)', 'Acción de Amparo pretoriana'],
    coreFacts: 'Tras las ocupaciones de la planta textil de la firma Samuel Kot S.R.L. y habiéndose librado vías penales poco idóneas, Kot entabla la acción directa constitucional ya sentada en el caso Siri, extendiendo la cobertura frente a particulares.',
    socraticPhases: [
      {
        name: 'Conflicto de Hecho',
        question: 'Estudiemos el Caso Kot. ¿Cuál fue el suceso fáctico específico que impidió a Samuel Kot hacer uso normal de su fábrica e instalaciones?',
        targetConcepts: ['huelga', 'toma de la fábrica', 'ocupación', 'usurpación', 'obreros', 'plantón', 'conflicto gremial'],
        hint: 'Los trabajadores de la fábrica decretaron una huelga e ingresaron por la fuerza, ocupando físicamente las instalaciones del establecimiento fabril.'
      },
      {
        name: 'Doble Vía y Amparo frente a quiénes',
        question: 'Excelente reconocimiento del hecho. El aporte histórico de Kot junto con Siri creó el Amparo pretoriano. Siri lo creó contra actos administrativos del Estado. Pero, ¿cuál fue el giro de Kot? ¿Contra los actos de quiénes determinó la Corte que procede el Amparo?',
        targetConcepts: ['particulares', 'privados', 'sindicatos', 'personas privadas', 'no estatales'],
        hint: 'Piensa en quiénes eran los agresores del derecho en Kot: no eran militares ni policías estatales, sino obreros despedidos (actores individuales privados).'
      }
    ]
  }
];

// Pre-seeded RAG Knowledge Base Files
const DEFAULT_DOCUMENTS: RagDoc[] = [
  { id: 'doc-1', name: 'fallo_arenzon_completo.pdf', size: '2.4 MB', status: 'Indexado', caseId: 'arenzon', uploadedAt: '12/03/2026 14:22' },
  { id: 'doc-2', name: 'analisis_principales_vulneraciones_art_28.docx', size: '420 KB', status: 'Indexado', caseId: 'arenzon', uploadedAt: '15/03/2026 09:10' },
  { id: 'doc-3', name: 'fallo_halabi_dictamen_procuracion.pdf', size: '3.1 MB', status: 'Indexado', caseId: 'halabi', uploadedAt: '02/04/2026 11:05' },
  { id: 'doc-4', name: 'resumen_jurisprudencia_siri_y_kot.txt', size: '94 KB', status: 'Indexado', caseId: 'kot', uploadedAt: '18/04/2026 18:30' }
];

// Pre-seeded chat messages to represent student activities for live telemetry
const DEFAULT_CHATS: ChatMessage[] = [
  // Santiago Fernandez (ALU2024) - Arenzon (In Progress)
  { id: 'msg-1', username: 'ALU2024', caseId: 'arenzon', sender: 'bot', text: 'Hola Santiago, comencemos analizando los hechos del Caso Arenzon. ¿Por qué motivo concreto el organismo de Sanidad Escolar catalogó como "no apto" a Gabriel Arenzon para dictar clases de matemáticas?', timestamp: '2026-05-22T21:30:00Z' },
  { id: 'msg-2', username: 'ALU2024', caseId: 'arenzon', sender: 'user', text: 'Fue porque medía un metro cuarenta y ocho, y le exigían medir un metro sesenta para habilitarle el título docente.', timestamp: '2026-05-22T21:32:10Z', ragSource: 'fallo_arenzon_completo.pdf (pág. 1)', ragSimilarity: 0.95 },
  { id: 'msg-3', username: 'ALU2024', caseId: 'arenzon', sender: 'bot', text: 'Excelente. Detectas con claridad la discriminación física. Ahora pasemos al aspecto normativo. ¿Qué derechos constitucionales reconocidos en el Artículo 14 y Artículo 16 de la Constitución Nacional se vieron afectados por este reglamento?', timestamp: '2026-05-22T21:33:00Z' },
  { id: 'msg-4', username: 'ALU2024', caseId: 'arenzon', sender: 'user', text: 'Afectaba el derecho a trabajar del artículo 14, derecho de enseñar y aprender, y la igualdad de oportunidades ante el artículo 16.', timestamp: '2026-05-22T21:36:22Z', ragSource: 'fallo_arenzon_completo.pdf (pág. 3)', ragSimilarity: 0.92 },
  { id: 'msg-5', username: 'ALU2024', caseId: 'arenzon', sender: 'bot', text: 'Perfecto, identificaste los derechos a enseñar, aprender, trabajar y la garantía de igualdad. Ahora bien, el Estado puede regular los derechos, pero con límites. Analiza el Artículo 28 de la CN. ¿Existe una relación coherente e inteligente (razonable) entre tener una estatura menor a 1.60m y la aptitud intelectual para enseñar matemáticas?', timestamp: '2026-05-22T21:37:05Z' },

  // Marta Rodriguez (ALU456) - Arenzon (Completed)
  { id: 'msg-101', username: 'ALU456', caseId: 'arenzon', sender: 'bot', text: 'Hola Santiago, comencemos analizando los hechos del Caso Arenzon...', timestamp: '2026-05-20T10:00:00Z' },
  { id: 'msg-102', username: 'ALU456', caseId: 'arenzon', sender: 'user', text: 'Su altura física era de 1.48m y no llegaba al requisito del reglamento.', timestamp: '2026-05-20T10:02:00Z', ragSource: 'fallo_arenzon_completo.pdf (pág. 1)', ragSimilarity: 0.96 },
  { id: 'msg-103', username: 'ALU456', caseId: 'arenzon', sender: 'bot', text: 'Excelente. ¿Qué derechos del Art 14 y 16 se vieron afectados?', timestamp: '2026-05-20T10:03:00Z' },
  { id: 'msg-104', username: 'ALU456', caseId: 'arenzon', sender: 'user', text: 'El derecho de enseñar, el derecho de trabajar y la garantía de igualdad.', timestamp: '2026-05-20T10:05:00Z', ragSource: 'fallo_arenzon_completo.pdf (pág. 3)', ragSimilarity: 0.94 },
  { id: 'msg-105', username: 'ALU456', caseId: 'arenzon', sender: 'bot', text: 'Perfecto. ¿Existe relación razonable según Art. 28?', timestamp: '2026-05-20T10:06:00Z' },
  { id: 'msg-106', username: 'ALU456', caseId: 'arenzon', sender: 'user', text: 'Ninguna relación razonable. No medir 1.60m no te impide dictar álgebra o geometría con excelencia intelectual. Es un desvío arbitrario.', timestamp: '2026-05-20T10:09:00Z', ragSource: 'analisis_principales_vulneraciones_art_28.docx (pág. 2)', ragSimilarity: 0.89 },
  { id: 'msg-107', username: 'ALU456', caseId: 'arenzon', sender: 'bot', text: '¡Excelente! ¿Qué resolvió la Corte Suprema?', timestamp: '2026-05-20T10:10:00Z' },
  { id: 'msg-108', username: 'ALU456', caseId: 'arenzon', sender: 'user', text: 'Declaró la inconstitucionalidad del reglamento de aptitud física porque contradecía de modo absurdo la supremacía de la constitución.', timestamp: '2026-05-20T10:13:00Z', ragSource: 'fallo_arenzon_completo.pdf (pág. 5)', ragSimilarity: 0.91 },
  { id: 'msg-109', username: 'ALU456', caseId: 'arenzon', sender: 'bot', text: 'Felicitaciones Marta, has resuelto y completado exitosamente la sintonía del Caso Arenzon y tu Ficha de Síntesis Académica ha sido certificada al 100%. ¡Gran nivel constitucional!', timestamp: '2026-05-20T10:14:00Z' }
];

// Pre-seeded status on summary cards
const DEFAULT_FICHAS: StudentFicha[] = [
  {
    username: 'ALU2024',
    caseId: 'arenzon',
    actor: 'Gabriel Arenzon',
    year: '1984',
    guarantees: ['Art. 14 Constitucional (Trabajar, Enseñar)', 'Art. 16 Constitucional (Igualdad ante la Ley)'],
    concepts: [],
    resolution: 'Pendiente de resolución',
    completed: false,
    currentPhaseIndex: 2,
    updatedAt: new Date().toISOString()
  },
  {
    username: 'ALU456',
    caseId: 'arenzon',
    actor: 'Gabriel Arenzon',
    year: '1984',
    guarantees: ['Art. 14 Constitucional', 'Art. 16 Constitucional'],
    concepts: ['Test de Razonabilidad del Art. 28', 'Habilitación Académica vs Estructura Física'],
    resolution: 'Declarar la inconstitucionalidad de la resolución ministerial limitante, otorgando habilitación.',
    completed: true,
    currentPhaseIndex: 4,
    updatedAt: new Date('2026-05-20T10:14:00Z').toISOString()
  }
];

// Helper to dry-run localStorage initialization and pull from Supabase
export function initializeDB(): void {
  if (typeof window === 'undefined') return;

  // 1. Seed fallbacks locally first so there is never blank content during load
  if (!localStorage.getItem('cb_profiles')) {
    localStorage.setItem('cb_profiles', JSON.stringify(DEFAULT_PROFILES));
  }
  if (!localStorage.getItem('cb_cases')) {
    localStorage.setItem('cb_cases', JSON.stringify(DEFAULT_CASES));
  }
  if (!localStorage.getItem('cb_documents')) {
    localStorage.setItem('cb_documents', JSON.stringify(DEFAULT_DOCUMENTS));
  }
  if (!localStorage.getItem('cb_chats')) {
    localStorage.setItem('cb_chats', JSON.stringify(DEFAULT_CHATS));
  }
  if (!localStorage.getItem('cb_fichas')) {
    localStorage.setItem('cb_fichas', JSON.stringify(DEFAULT_FICHAS));
  }

  // 2. Perform async, non-blocking synchronization from Supabase server
  fetch("/api/supabase/sync")
    .then(res => res.json())
    .then(data => {
      if (data.configured) {
        if (data.profiles && data.profiles.length > 0) {
          localStorage.setItem('cb_profiles', JSON.stringify(data.profiles));
        }
        if (data.cases && data.cases.length > 0) {
          localStorage.setItem('cb_cases', JSON.stringify(data.cases));
        }
        if (data.documents) {
          localStorage.setItem('cb_documents', JSON.stringify(data.documents));
        }
        if (data.chats) {
          localStorage.setItem('cb_chats', JSON.stringify(data.chats));
        }
        if (data.fichas) {
          localStorage.setItem('cb_fichas', JSON.stringify(data.fichas));
        }
        console.log("[Supabase Sync]: Sincronización de base de datos exitosa.");
      } else {
        console.log("[Supabase Sync]: Supabase no está configurado de forma externa aún. Usando storage local.");
      }
    })
    .catch(err => {
      console.warn("[Supabase Sync Error]: Falló la sincronización con el servidor backend.", err);
    });
}

// Global invocation
if (typeof window !== 'undefined') {
  initializeDB();
}

// DB Access Methods
export const db = {
  // --- USERS SECTION ---
  getProfiles(): UserProfile[] {
    if (typeof window === 'undefined') return DEFAULT_PROFILES;
    const data = localStorage.getItem('cb_profiles');
    return data ? JSON.parse(data) : DEFAULT_PROFILES;
  },

  getStudents(): UserProfile[] {
    return this.getProfiles().filter(p => p.role === 'student');
  },

  addStudent(username: string, name: string): UserProfile {
    const profiles = this.getProfiles();
    // Validate duplicates
    if (profiles.some(p => p.username.toUpperCase() === username.toUpperCase())) {
      throw new Error(`El legajo/usuario "${username}" ya se encuentra registrado.`);
    }

    const newUser: UserProfile = {
      id: `usr-${Date.now()}`,
      username: username.toUpperCase(),
      name,
      role: 'student',
      createdAt: new Date().toISOString()
    };

    profiles.push(newUser);
    localStorage.setItem('cb_profiles', JSON.stringify(profiles));

    // HTTP Background POST to Supabase Node server
    fetch("/api/supabase/profiles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newUser)
    }).catch(err => console.error("Error sincronizando estudiante con Supabase:", err));

    return newUser;
  },

  deleteStudent(username: string): void {
    let profiles = this.getProfiles();
    profiles = profiles.filter(p => p.username.toUpperCase() !== username.toUpperCase() || p.role !== 'student');
    localStorage.setItem('cb_profiles', JSON.stringify(profiles));

    // Cascade: delete chat audits and summary sheets
    let chats = this.getChats();
    chats = chats.filter(c => c.username.toUpperCase() !== username.toUpperCase());
    localStorage.setItem('cb_chats', JSON.stringify(chats));

    let fichas = this.getFichas();
    fichas = fichas.filter(f => f.username.toUpperCase() !== username.toUpperCase());
    localStorage.setItem('cb_fichas', JSON.stringify(fichas));

    // HTTP Background DELETE to Supabase Node server
    fetch(`/api/supabase/profiles/${encodeURIComponent(username)}`, {
      method: "DELETE"
    }).catch(err => console.error("Error eliminando estudiante de Supabase:", err));
  },

  // --- CASES SECTION ---
  getCases(): FalloCase[] {
    if (typeof window === 'undefined') return DEFAULT_CASES;
    const data = localStorage.getItem('cb_cases');
    return data ? JSON.parse(data) : DEFAULT_CASES;
  },

  addCase(newCase: FalloCase): FalloCase {
    const cases = this.getCases();
    if (cases.some(c => c.id.toLowerCase() === newCase.id.toLowerCase())) {
      throw new Error(`Ya existe un caso registrado con la clave "${newCase.id}".`);
    }

    const formattedCase = { ...newCase, isCustom: true };
    cases.push(formattedCase);
    localStorage.setItem('cb_cases', JSON.stringify(cases));

    // HTTP Background POST to Supabase Node server
    fetch("/api/supabase/cases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formattedCase)
    }).catch(err => console.error("Error sincronizando caso con Supabase:", err));

    return formattedCase;
  },

  deleteCase(caseId: string): void {
    let cases = this.getCases();
    cases = cases.filter(c => c.id !== caseId);
    localStorage.setItem('cb_cases', JSON.stringify(cases));

    // Cascade delete on related documents, chats, and fichas
    let docs = this.getDocuments();
    docs = docs.filter(d => d.caseId !== caseId);
    localStorage.setItem('cb_documents', JSON.stringify(docs));

    let chats = this.getChats();
    chats = chats.filter(c => c.caseId !== caseId);
    localStorage.setItem('cb_chats', JSON.stringify(chats));

    let fichas = this.getFichas();
    fichas = fichas.filter(f => f.caseId !== caseId);
    localStorage.setItem('cb_fichas', JSON.stringify(fichas));

    // HTTP Background DELETE to Supabase Node server
    fetch(`/api/supabase/cases/${encodeURIComponent(caseId)}`, {
      method: "DELETE"
    }).catch(err => console.error("Error eliminando caso de Supabase:", err));
  },

  // --- DOCUMENTS / RAG SECTION ---
  getDocuments(): RagDoc[] {
    if (typeof window === 'undefined') return DEFAULT_DOCUMENTS;
    const data = localStorage.getItem('cb_documents');
    return data ? JSON.parse(data) : DEFAULT_DOCUMENTS;
  },

  addDocument(doc: RagDoc): RagDoc {
    const docs = this.getDocuments();
    docs.push(doc);
    localStorage.setItem('cb_documents', JSON.stringify(docs));

    // HTTP Background POST to Supabase Node server
    fetch("/api/supabase/documents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(doc)
    }).catch(err => console.error("Error sincronizando documento con Supabase:", err));

    return doc;
  },

  updateDocStatus(docId: string, status: 'Indexado' | 'Error'): void {
    const docs = this.getDocuments();
    const idx = docs.findIndex(d => d.id === docId);
    if (idx !== -1) {
      docs[idx].status = status;
      localStorage.setItem('cb_documents', JSON.stringify(docs));

      // HTTP Background POST to Supabase Node server
      fetch("/api/supabase/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(docs[idx])
      }).catch(err => console.error("Error actualizando estado de documento con Supabase:", err));
    }
  },

  deleteDocument(docId: string): void {
    let docs = this.getDocuments();
    docs = docs.filter(d => d.id !== docId);
    localStorage.setItem('cb_documents', JSON.stringify(docs));

    // HTTP Background DELETE to Supabase Node server
    fetch(`/api/supabase/documents/${encodeURIComponent(docId)}`, {
      method: "DELETE"
    }).catch(err => console.error("Error eliminando documento de Supabase:", err));
  },

  // --- CHAT ARCHIVE SECTION ---
  getChats(): ChatMessage[] {
    if (typeof window === 'undefined') return DEFAULT_CHATS;
    const data = localStorage.getItem('cb_chats');
    return data ? JSON.parse(data) : DEFAULT_CHATS;
  },

  getChatsForStudent(username: string, caseId: string): ChatMessage[] {
    return this.getChats().filter(c => c.username.toUpperCase() === username.toUpperCase() && c.caseId === caseId);
  },

  addChatMessage(msg: ChatMessage): ChatMessage {
    const chats = this.getChats();
    chats.push(msg);
    localStorage.setItem('cb_chats', JSON.stringify(chats));

    // HTTP Background POST to Supabase Node server
    fetch("/api/supabase/chats", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(msg)
    }).catch(err => console.error("Error sincronizando mensaje de chat con Supabase:", err));

    return msg;
  },

  clearChat(username: string, caseId: string): void {
    let chats = this.getChats();
    chats = chats.filter(c => c.username.toUpperCase() !== username.toUpperCase() || c.caseId !== caseId);
    localStorage.setItem('cb_chats', JSON.stringify(chats));

    // HTTP Background DELETE to Supabase Node server
    fetch(`/api/supabase/chats/clear?username=${encodeURIComponent(username)}&caseId=${encodeURIComponent(caseId)}`, {
      method: "DELETE"
    }).catch(err => console.error("Error vaciando chats de Supabase:", err));
  },

  // --- SUMMARY CARDS (FICHAS) SECTION ---
  getFichas(): StudentFicha[] {
    if (typeof window === 'undefined') return DEFAULT_FICHAS;
    const data = localStorage.getItem('cb_fichas');
    const parsed: StudentFicha[] = data ? JSON.parse(data) : DEFAULT_FICHAS;
    return parsed.map(f => ({
      ...f,
      nombreDelFallo: f.nombreDelFallo || '—',
      fallos: f.fallos || '—',
      ano: f.ano || f.year || '—',
      hechos: f.hechos || '—',
      cuestionesPresentadas: f.cuestionesPresentadas || '—',
      primeraInstancia: f.primeraInstancia || '—',
      segundaInstancia: f.segundaInstancia || '—',
      tipoJurisdiccionInvocada: f.tipoJurisdiccionInvocada || '—',
      procuradorGeneral_principios: f.procuradorGeneral_principios || '—',
      procuradorGeneral_razonamiento: f.procuradorGeneral_razonamiento || '—',
      decisionCorte_principios: f.decisionCorte_principios || '—',
      decisionCorte_razonamiento: f.decisionCorte_razonamiento || f.resolution || '—',
      disidenciaConcurrencia_principios: f.disidenciaConcurrencia_principios || '—',
      disidenciaConcurrencia_razonamiento: f.disidenciaConcurrencia_razonamiento || '—',
      obiterDictumSignificativo: f.obiterDictumSignificativo || '—'
    }));
  },

  getFichaForStudent(username: string, caseId: string): StudentFicha {
    const fichas = this.getFichas();
    const found = fichas.find(f => f.username.toUpperCase() === username.toUpperCase() && f.caseId === caseId);
    
    if (found) return found;

    // Build standard initial card if not present with PDF fields
    const newFicha: StudentFicha = {
      username: username,
      caseId: caseId,
      actor: '—',
      year: '—',
      guarantees: [],
      concepts: [],
      resolution: '—',
      completed: false,
      currentPhaseIndex: 0,
      updatedAt: new Date().toISOString(),
      nombreDelFallo: '—',
      fallos: '—',
      ano: '—',
      hechos: '—',
      cuestionesPresentadas: '—',
      primeraInstancia: '—',
      segundaInstancia: '—',
      tipoJurisdiccionInvocada: '—',
      procuradorGeneral_principios: '—',
      procuradorGeneral_razonamiento: '—',
      decisionCorte_principios: '—',
      decisionCorte_razonamiento: '—',
      disidenciaConcurrencia_principios: '—',
      disidenciaConcurrencia_razonamiento: '—',
      obiterDictumSignificativo: '—'
    };
    
    // Save to list
    const allRaw = typeof window !== 'undefined' && localStorage.getItem('cb_fichas') 
      ? JSON.parse(localStorage.getItem('cb_fichas')!) 
      : DEFAULT_FICHAS;
    allRaw.push(newFicha);
    if (typeof window !== 'undefined') {
      localStorage.setItem('cb_fichas', JSON.stringify(allRaw));
    }

    // HTTP Background POST to Supabase Node server
    fetch("/api/supabase/fichas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newFicha)
    }).catch(err => console.error("Error creando ficha en Supabase:", err));

    return newFicha;
  },

  saveFicha(ficha: StudentFicha): void {
    const fichas = this.getFichas();
    const idx = fichas.findIndex(f => f.username.toUpperCase() === ficha.username.toUpperCase() && f.caseId === ficha.caseId);
    
    let updatedFicha: StudentFicha;
    if (idx !== -1) {
      updatedFicha = { ...ficha, updatedAt: new Date().toISOString() };
      fichas[idx] = updatedFicha;
    } else {
      updatedFicha = { ...ficha, updatedAt: new Date().toISOString() };
      fichas.push(updatedFicha);
    }
    localStorage.setItem('cb_fichas', JSON.stringify(fichas));

    // HTTP Background POST to Supabase Node server
    fetch("/api/supabase/fichas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updatedFicha)
    }).catch(err => console.error("Error sincronizando ficha con Supabase:", err));
  }
};
