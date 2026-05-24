/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { UserProfile, FalloCase, RagDoc, ChatMessage, StudentFicha } from './types';

/// Pre-seeded Students & Teachers
const DEFAULT_PROFILES: UserProfile[] = [
  { id: '22222222-2222-2222-2222-222222222222', username: 'DOC101', name: 'Administrador', role: 'teacher', createdAt: new Date().toISOString() }
];

// Pre-seeded Jurisprudence Cases
const DEFAULT_CASES: FalloCase[] = [];

// Pre-seeded RAG Knowledge Base Files
const DEFAULT_DOCUMENTS: RagDoc[] = [];

// Pre-seeded chat messages to represent student activities for live telemetry
const DEFAULT_CHATS: ChatMessage[] = [];

// Pre-seeded status on summary cards
const DEFAULT_FICHAS: StudentFicha[] = [];

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
      id: crypto.randomUUID(),
      username: username.toUpperCase(),
      name,
      role: 'student',
      activated: true,
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
