/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import crypto from "crypto";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse");

// Load Environment Variables
dotenv.config();

import { getSupabaseClient } from "./src/lib/supabaseServer";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Memory Vector Store fallback & Helpers
interface MemoryChunk {
  id: string;
  documentId: string;
  documentName: string;
  caseId: string;
  content: string;
  embedding: number[];
}
let memoryChunks: MemoryChunk[] = [];

function chunkText(text: string, size: number = 800, overlap: number = 150): string[] {
  const chunks: string[] = [];
  let i = 0;
  while (i < text.length) {
    const chunk = text.slice(i, i + size);
    chunks.push(chunk);
    i += size - overlap;
    if (i >= text.length - overlap) break;
  }
  return chunks;
}

function cosineSimilarity(vecA: number[], vecB: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Lazy-loaded Gemini AI client to prevent crash if key is initialized at build-time without secret
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("La clave secreta GEMINI_API_KEY no está configurada en las variables de entorno. Por favor, añádela en Settings > Secrets.");
    }
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Body parsers
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }))  // --- API ROUTE: CHAT SOCRÁTICO ---
  app.post("/api/chat", async (req, res) => {
    try {
      const { username, caseId, messages, ficha, caseData } = req.body;

      if (!caseData || !caseData.socraticPhases) {
        return res.status(400).json({ error: "Datos del caso insuficientes." });
      }

      const client = getGeminiClient();
      const currentPhaseIndex = ficha.currentPhaseIndex;
      const totalPhases = caseData.socraticPhases.length;
      const currentPhase = caseData.socraticPhases[currentPhaseIndex] || caseData.socraticPhases[totalPhases - 1];

      // Real-time text embedding of the student's message using text-embedding-004
      const userMessages = (messages || []).filter((m: any) => m.sender === 'user');
      const latestUserMessage = userMessages[userMessages.length - 1];
      const queryText = latestUserMessage ? latestUserMessage.text : '';

      let queryEmbedding: number[] | null = null;
      if (queryText) {
        try {
          const embedRes = (await client.models.embedContent({
            model: "text-embedding-004",
            contents: queryText,
          })) as any;
          queryEmbedding = embedRes.embedding?.values || embedRes.embeddings?.[0]?.values || null;
        } catch (embedErr) {
          console.warn("Fallo al pre-calcular embedding text-embedding-004 de consulta:", embedErr);
        }
      }

      // Semantic matching using retrieved vector or in-memory backup store
      let matchedChunks: { content: string; similarity: number; documentName: string }[] = [];
      const sClient = getSupabaseClient();
      let foundInSupabase = false;

      if (queryEmbedding && queryEmbedding.length > 0) {
        if (sClient) {
          try {
            const { data, error } = await sClient.rpc('match_document_chunks', {
              query_embedding: queryEmbedding,
              match_threshold: 0.1,
              match_count: 4,
              filter_case_id: caseId
            });
            if (!error && data && data.length > 0) {
              matchedChunks = data.map((item: any) => ({
                content: item.content,
                similarity: item.similarity || 0.85,
                documentName: item.document_name || 'Documento Cátedra C'
              }));
              foundInSupabase = true;
              console.log(`[RAG DB-Match]: Encontrado(s) ${data.length} fragmento(s) en Supabase.`);
            } else if (error) {
              console.warn("Retorno RPC match_document_chunks vacío o fallido:", error);
            }
          } catch (rpcErr) {
            console.warn("RPC match_document_chunks falló, usando fallback en memoria:", rpcErr);
          }
        }

        if (!foundInSupabase) {
          // Fallback matching in local Memory Store
          const caseChks = memoryChunks.filter(c => c.caseId === caseId);
          const scored = caseChks.map(c => {
            const sim = cosineSimilarity(queryEmbedding!, c.embedding);
            return {
              content: c.content,
              similarity: sim,
              documentName: c.documentName
            };
          });
          scored.sort((a, b) => b.similarity - a.similarity);
          // Take top 4 chunks with similarity > 0.1
          matchedChunks = scored.slice(0, 4).filter(item => item.similarity > 0.1);
          console.log(`[RAG Local-Match]: Encontrado(s) ${matchedChunks.length} fragmento(s) en memoria de servidor.`);
        }
      }

      // Formulate retrieval context
      let ragContextStr = 'Utilizar la base de jurisprudencia oficial.';
      let retrievedSourceName = 'Constitución y Leyes Cátedra C';
      let retrievedSimilarity = 0.94;

      if (matchedChunks.length > 0) {
        ragContextStr = matchedChunks.map((c, i) => {
          return `[Fragmento #${i + 1} de: "${c.documentName}" (Relevancia: ${Math.round(c.similarity * 100)}%)]:\n${c.content}`;
        }).join('\n\n');
        
        retrievedSourceName = matchedChunks[0].documentName;
        retrievedSimilarity = parseFloat(matchedChunks[0].similarity.toFixed(4));
      }

      // Formulate a clean socratic state description
      const promptInstruction = `
Eres CONSTI-BOT, un tutor de Inteligencia Artificial que guía a estudiantes en la cátedra "Derecho Constitucional C" de Argentina utilizando el método socrático de enseñanza legal.
Tu objetivo es formular preguntas y contra-preguntas y ofrecer breves pistas pedagógicas para guiar al estudiante a descubrir las respuestas por sí mismo. ¡Bajo ninguna circunstancia debes formular la respuesta correcta redactada literalmente de forma inicial!

Caso Constitucional Actual:
- ID del Caso: "${caseData.id}"
- Nombre: "${caseData.title}"
- Año: ${caseData.year}
- Tribunal: "${caseData.court}"
- Eje Constitucional: "${caseData.theme}"
- Hechos Básicos: "${caseData.coreFacts}"
- Doctrina Constitucional: "${caseData.summary}"
- Derechos/Garantías Claves: ${JSON.stringify(caseData.guarantees)}

Fases Socráticas del Programa de Aprendizaje (Fase Actual del alumno: ${currentPhaseIndex} - "${currentPhase.name}"):
${caseData.socraticPhases.map((p: any, idx: number) => {
  return `* Fase $${idx}: "${p.name}"
  - Pregunta socrática: "${p.question}"
  - Objetivos analíticos / Palabras Clave: ${JSON.stringify(p.targetConcepts)}
  - Pista si falla: "${p.hint}"`;
}).join('\n')}

Instrucciones para evaluar y responder:
1. Evalúa el mensaje del Estudiante (User Message) del final de la conversación considerando todo el contexto del diálogo previo.
2. Determina si el Estudiante comprende o aborda correctamente el objetivo y conceptos clave de la Fase Actual $${currentPhaseIndex} ("${currentPhase.name}").
   - SI LO HACE: Reconoce el acierto, felicítalo de forma sobria pero motivadora, inyecta los nuevos datos en su Ficha (como actor, garantías o categorías de razonabilidad descubiertos) y AVANZA EL INDICADOR "currentPhaseIndex" al siguiente nivel ($${currentPhaseIndex + 1}). Formula la pregunta de la nueva fase inmediatamente.
   - SI NO LO HACE: No le dejes avanzar todavía. Haz una contrapregunta que guie su razonamiento apoyándote en el contexto suministrado, o proporciónale la pista socrática de esta fase ("${currentPhase.hint}") como orientación estimulante. No reveles la solución formal.
3. Si el estudiante se encuentra en la última fase y responde bien, felicítalo por completar el análisis constitucional. Marca la ficha como completada ("completed": true) y actualiza la "resolution" con la doctrina sentada de forma comprensiva.

Contexto Real Recuperado por Búsqueda Semántica RAG (text-embedding-004):
${ragContextStr}

Ficha Académica de Síntesis del Estudiante (Estado Actual):
${JSON.stringify(ficha)}

DEBES responder con un objeto JSON válido respetando estrictamente el siguiente esquema de respuesta de la API:
{
  "botResponse": "Tu respuesta socrática e interactiva para el estudiante (escrita en español de Argentina con excelente rigor académico)",
  "updatedFicha": {
    "actor": "Nombre o entidad actora (por ejemplo, 'Gabriel Arenzon' si superó la fase Hechos)",
    "year": "Año del fallo (por ejemplo, '${caseData.year}' si superó Hechos)",
    "guarantees": ["lista de garantías constitucionales que fue verbalizando/descubriendo"],
    "concepts": ["lista de conceptos y doctrinas que deostró comprender"],
    "resolution": "Resumen institucional de la resolución (solo si completó el análisis o 'Pendiente de resolución')",
    "completed": true_o_false_segun_si_completo_exitosamente_todas_las_fases,
    "currentPhaseIndex": numero_de_etapa_actualizada_desde_0_hasta_longitud_maxima,
    
    "nombreDelFallo": "Nombre del Fallo/Causa (ej: '${caseData.title}')",
    "fallos": "Registro del volumen de Fallos CSJN si se conoce (por ejemplo, '306:400' para Arenzon, o'332:111' para Halabi, o similar)",
    "ano": "Año de dictado del fallo (ej: '${caseData.year}')",
    "hechos": "Síntesis de los hechos de la causa según los identificó el alumno",
    "cuestionesPresentadas": "Cuestiones constitucionales en pugna / qué se debate",
    "primeraInstancia": "Resolución de Primera Instancia (ej: 'Declaración de inconstitucionalidad de la norma limitativa')",
    "segundaInstancia": "Resolución de Segunda Instancia (ej: 'Cámara confirma fallo al amparar al actor')",
    "tipoJurisdiccionInvocada": "Tipo de jurisdicción invocada (ej: 'Recurso Extraordinario Federal - Ley 48')",
    "procuradorGeneral_principios": "Principios constitucionales formulados por el Procurador",
    "procuradorGeneral_razonamiento": "Estructura del dictamen y opinión del Procurador General",
    "decisionCorte_principios": "Principios de supremacía, razonabilidad y no discriminación establecidos",
    "decisionCorte_razonamiento": "Fundamento argumental medular de la decisión de la Corte Suprema",
    "disidenciaConcurrencia_principios": "Doctrina de disidencias o concurrentes (si las hubiere)",
    "disidenciaConcurrencia_razonamiento": "Razonamientos individuales de los ministros concurrentes/disidentes",
    "obiterDictumSignificativo": "Consideraciones marginales u obiter dicta de especial relevancia"
  },
  "ragBadge": {
    "source": "${retrievedSourceName}",
    "similarity": ${retrievedSimilarity}
  }
}
`;

      const contents = [
        { role: 'user', parts: [{ text: promptInstruction }] },
        ...messages.map((m: any) => ({
          role: m.sender === 'user' ? 'user' : 'model',
          parts: [{ text: m.text }]
        }))
      ];

      const response = await client.models.generateContent({
        model: "gemini-3.5-flash",
        contents: contents,
        config: {
          responseMimeType: "application/json",
          temperature: 0.7,
        }
      });

      const responseText = response.text;
      if (!responseText) {
        throw new Error("No se recibió respuesta del modelo Gemini.");
      }

      const cleanJson = JSON.parse(responseText.trim());
      res.json(cleanJson);

    } catch (error: any) {
      console.error("Error en endpoint /api/chat:", error);
      res.status(500).json({
        error: "Problema al interactuar con el docente virtual IA socrático.",
        details: error.message
      });
    }
  });

  // --- API ROUTE: PROCESAR NUEVO CASO CON IA (CREACIÓN EN VIVO) ---
  app.post("/api/process-case", async (req, res) => {
    try {
      const { rawText } = req.body;
      if (!rawText || rawText.trim().length === 0) {
        return res.status(400).json({ error: "Se requiere texto legal para procesar el caso." });
      }

      const client = getGeminiClient();

      const promptInstruction = `
Analiza el siguiente texto legal, sumario o borrador de jurisprudencia constitucional argentina y extrae los datos requeridos para conformar una ficha académica estructurada y un programa guiado de tutoría socrática interactiva.

Texto de entrada:
"""
${rawText}
"""

Debes generar un objeto JSON estructurado con el siguiente formato, identificando el actor del litigio, el año del fallo, el tribunal dictante, el eje central (vínculo conceptual), las garantías vulneradas primarias, un resumen doctrinal del fallo, los hechos condensados y redactando 4 etapas socráticas estructuradas (Fases) que guiarán al estudiante paso a paso desde los Hechos, pasando por los Derechos, la Razonabilidad (Art. 28 CN), hasta la Doctrina final.

Esquema del JSON esperado:
{
  "id": "clave-url-unica-en-minusculas-sin-espacios-ej-arenzon-o-siri",
  "title": "Título Académico Oficial (ej: Caso Arenzon (1984) o Fallo Siri (1957))",
  "year": 1984, -- Año en número entero
  "court": "Tribunal evaluador (ej: Corte Suprema de Justicia de la Nación u otro)",
  "theme": "Eje temático de derecho constitucional (ej: Acción de Amparo, Razonabilidad, Libertad de Expresión)",
  "summary": "Resumen apretado y muy claro de la doctrina sentada por el fallo (máximo 4 renglones)",
  "guarantees": ["Garantía vulnerable 1 (Art. X)", "Garantía vulnerable 2 (Art. Y)"],
  "coreFacts": "Síntesis amena de los sucesos fundamentales del litigio (máximo 5 renglones)",
  "socraticPhases": [
    {
      "name": "Hechos del Caso",
      "question": "Pregunta socrática inicial para que el estudiante exponga qué sucedió en términos fácticos...",
      "targetConcepts": ["concepto_clave_1", "concepto_clave_2", "ej_nombre_actor", "ej_hechos_centrales"],
      "hint": "Pista orientativa por si el alumno no sabe qué responder o se traba sobre los sucesos"
    },
    {
      "name": "Derechos Constitucionales",
      "question": "Pregunta socrática sobre cuáles son las libertades o artículos constitucionales que entraron en colisión...",
      "targetConcepts": ["art", "derecho", "libertad", "num_articulos_ej_14_16_18"],
      "hint": "Pista regulada para situar al alumno en la carta de derechos de la Constitución Nacional"
    },
    {
      "name": "Análisis Jurídico y Razonabilidad",
      "question": "Pregunta de razonabilidad o constitucionalidad profunda que conecte la ley restrictiva y el Artículo 28 de la CN...",
      "targetConcepts": ["razonabilidad", "razonable", "arbitrario", "desproporción", "coherencia", "art 28"],
      "hint": "Pista legal para relacionar el medio legislativo (la restricción) y el fin de la norma"
    },
    {
      "name": "Fallo y Doctrina de la Corte",
      "question": "Pregunta definitiva para que el alumno sintetice qué dictaminó la Suprema Corte y cómo sienta jurisprudencia...",
      "targetConcepts": ["inconstitucional", "inconstitucionalidad", "amparo", "lugar", "revocar"],
      "hint": "Pista del veredicto final si el alumno flaquea en las consecuencias del fallo"
    }
  ]
}
`;

      const response = await client.models.generateContent({
        model: "gemini-3.5-flash",
        contents: promptInstruction,
        config: {
          responseMimeType: "application/json",
          temperature: 0.3,
        }
      });

      const responseText = response.text;
      if (!responseText) {
        throw new Error("No se recibió respuesta del procesador automático Gemini.");
      }

      const structuredCase = JSON.parse(responseText.trim());
      res.json(structuredCase);

    } catch (error: any) {
      console.error("Error en endpoint /api/process-case:", error);
      res.status(500).json({
        error: "Problema al procesar y vectorizar el caso con Inteligencia Artificial.",
        details: error.message
      });
    }
  });

  // ====================================================================
  // SUPABASE DATABASE MAPPERS (JS <-> SQL Snake Case)
  // ====================================================================

  function mapProfileToJS(p: any) {
    if (!p) return null;
    return {
      id: p.id,
      username: p.username,
      name: p.name,
      role: p.es_docente || p.role === 'teacher' ? 'teacher' : 'student',
      esDocente: !!(p.es_docente || p.role === 'teacher'),
      activated: !!p.password_hash,
      createdAt: p.created_at,
      sessionToken: p.session_token
    };
  }

  function mapCaseToJS(c: any) {
    if (!c) return null;
    return {
      id: c.id,
      title: c.title,
      year: c.year,
      court: c.court,
      theme: c.theme,
      summary: c.summary,
      guarantees: c.guarantees || [],
      coreFacts: c.core_facts,
      socraticPhases: c.socratic_phases || [],
      isCustom: c.is_custom
    };
  }

  function mapDocumentToJS(d: any) {
    if (!d) return null;
    return {
      id: d.id,
      name: d.name,
      size: d.size,
      status: d.status,
      caseId: d.case_id,
      uploadedAt: d.uploaded_at
    };
  }

  function mapChatToJS(m: any) {
    if (!m) return null;
    return {
      id: m.id,
      username: m.username,
      caseId: m.case_id,
      sender: m.sender,
      text: m.text,
      timestamp: m.timestamp,
      ragSource: m.rag_source,
      ragSimilarity: m.rag_similarity
    };
  }

  function mapFichaToJS(f: any) {
    if (!f) return null;
    return {
      username: f.username,
      caseId: f.case_id,
      actor: f.actor,
      year: f.year,
      guarantees: f.guarantees || [],
      concepts: f.concepts || [],
      resolution: f.resolution,
      completed: f.completed,
      currentPhaseIndex: f.current_phase_index,
      updatedAt: f.updated_at,
      nombreDelFallo: f.nombre_del_fallo,
      fallos: f.fallos,
      ano: f.ano,
      hechos: f.hechos,
      cuestionesPresentadas: f.cuestiones_presentadas,
      primeraInstancia: f.primera_instancia,
      segundaInstancia: f.segunda_instancia,
      tipoJurisdiccionInvocada: f.tipo_jurisdiccion_invocada,
      procuradorGeneral_principios: f.procurador_general_principios,
      procuradorGeneral_razonamiento: f.procurador_general_razonamiento,
      decisionCorte_principios: f.decision_corte_principios,
      decisionCorte_razonamiento: f.decision_corte_razonamiento,
      disidenciaConcurrencia_principios: f.disidencia_concurrencia_principios,
      disidenciaConcurrencia_razonamiento: f.disidencia_concurrencia_razonamiento,
      obiterDictumSignificativo: f.obiter_dictum_significativo
    };
  }

  function mapProfileToSQL(p: any) {
    return {
      id: p.id,
      username: p.username,
      name: p.name,
      role: p.role || (p.esDocente ? 'teacher' : 'student'),
      es_docente: !!(p.esDocente || p.role === 'teacher'),
      password_hash: p.passwordHash || null,
      session_token: p.sessionToken || null,
      created_at: p.createdAt || new Date().toISOString()
    };
  }

  function mapCaseToSQL(c: any) {
    return {
      id: c.id,
      title: c.title,
      year: parseInt(String(c.year || 0)),
      court: c.court,
      theme: c.theme,
      summary: c.summary,
      guarantees: c.guarantees || [],
      core_facts: c.coreFacts,
      socratic_phases: c.socraticPhases || [],
      is_custom: c.isCustom || false
    };
  }

  function mapDocumentToSQL(d: any) {
    return {
      id: d.id,
      name: d.name,
      size: d.size,
      status: d.status,
      case_id: d.caseId,
      uploaded_at: d.uploadedAt || new Date().toISOString()
    };
  }

  function mapChatToSQL(m: any) {
    return {
      id: m.id,
      username: m.username,
      case_id: m.caseId,
      sender: m.sender,
      text: m.text,
      timestamp: m.timestamp || new Date().toISOString(),
      rag_source: m.ragSource || null,
      rag_similarity: m.ragSimilarity || null
    };
  }

  function mapFichaToSQL(f: any) {
    return {
      username: f.username,
      case_id: f.caseId,
      actor: f.actor || '—',
      year: f.year || '—',
      guarantees: f.guarantees || [],
      concepts: f.concepts || [],
      resolution: f.resolution || '—',
      completed: !!f.completed,
      current_phase_index: parseInt(String(f.currentPhaseIndex || 0)),
      updated_at: f.updatedAt || new Date().toISOString(),
      nombre_del_fallo: f.nombreDelFallo || '—',
      fallos: f.fallos || '—',
      ano: f.ano || '—',
      hechos: f.hechos || '—',
      cuestiones_presentadas: f.cuestionesPresentadas || '—',
      primera_instancia: f.primeraInstancia || '—',
      segunda_instancia: f.segundaInstancia || '—',
      tipo_jurisdiccion_invocada: f.tipoJurisdiccionInvocada || '—',
      procurador_general_principios: f.procuradorGeneral_principios || '—',
      procurador_general_razonamiento: f.procuradorGeneral_razonamiento || '—',
      decision_corte_principios: f.decisionCorte_principios || '—',
      decision_corte_razonamiento: f.decisionCorte_razonamiento || '—',
      disidencia_concurrencia_principios: f.disidenciaConcurrencia_principios || '—',
      disidencia_concurrencia_razonamiento: f.disidenciaConcurrencia_razonamiento || '—',
      obiter_dictum_significativo: f.obiterDictumSignificativo || '—'
    };
  }

  // ====================================================================
  // SUPABASE SECURE PROXY API ENDPOINTS (Backend Storage)
  // ====================================================================

  function hashPassword(password: string): string {
    return crypto.createHash("sha256").update(password + "consti_salt_2026").digest("hex");
  }

  async function ensureDbDataIsSeeded(sClient: any) {
    if (!sClient) return;
    console.log("[AUTO-SEED]: Checking database state...");
    
    // 1. Seed Profiles
    try {
      const { data: profileCheck, error: pError } = await sClient.from("profiles").select("username");
      if (!pError && (!profileCheck || profileCheck.length === 0)) {
        console.log("[AUTO-SEED]: Seeding empty 'profiles' table with defaults...");
        const defaultProfiles = [
          { id: "11111111-1111-1111-1111-111111111111", username: "ALU2024", name: "Santiago Fernández", role: "student", es_docente: false, password_hash: null },
          { id: "22222222-2222-2222-2222-222222222222", username: "DOC101", name: "Dra. Elena Bianchi", role: "teacher", es_docente: true, password_hash: hashPassword("123") },
          { id: "33333333-3333-3333-3333-333333333333", username: "ALU456", name: "Marta Rodriguez", role: "student", es_docente: false, password_hash: null }
        ];
        const { error: insError } = await sClient.from("profiles").insert(defaultProfiles);
        if (insError) console.error("[AUTO-SEED]: Profiles insertion error:", insError);
      } else if (!pError && profileCheck && profileCheck.length > 0) {
        // Ensure DOC101 has the correct hash for "123" with the current salt
        const correctHash = hashPassword("123");
        const docUser = profileCheck.find((p: any) => p.username === "DOC101");
        if (docUser) {
          const { data: exactDoc } = await sClient.from("profiles").select("password_hash").eq("username", "DOC101");
          if (exactDoc && exactDoc[0] && exactDoc[0].password_hash !== correctHash) {
            console.log("[AUTO-SEED]: Correcting DOC101 hash in profiles...");
            await sClient.from("profiles").update({ password_hash: correctHash }).eq("username", "DOC101");
          }
        }
      }
    } catch (err) {
      console.error("[AUTO-SEED ERROR during Profiles stage]:", err);
    }

    // 2. Seed Cases
    try {
      const { data: casesCheck, error: cError } = await sClient.from("cases").select("id");
      if (!cError && (!casesCheck || casesCheck.length === 0)) {
        console.log("[AUTO-SEED]: Seeding empty 'cases' table with defaults...");
        const seedCases = [
          {
            id: 'arenzon',
            title: 'Caso Arenzon (1984)',
            year: 1984,
            court: 'Corte Suprema de Justicia de la Nación',
            theme: 'Principio de Razonabilidad y No Discriminación',
            summary: 'Gabriel Arenzon fue rechazado de su profesorado de matemáticas debido a que su estatura (1.48m) no alcanzaba el mínimo de 1.60m exigido por el reglamento de Sanidad Escolar. La Corte Suprema declaró la inconstitucionalidad de dicha exigencia por resultar arbitraria e irrazonable en virtud del Art. 28 de la CN.',
            guarantees: ['Derecho a Trabajar (Art. 14)', 'Derecho de Enseñar y Aprender (Art. 14)', 'Principio de Igualdad (Art. 16)'],
            core_facts: 'Gabriel Arenzon completó sus estudios para enseñar matemáticas pero se le negó el diploma habilitante porque medía 1.48 metros. La normativa vigente en el Ministerio de Educación exigía 1.60 metros de altura mínima para cargos docentes.',
            socratic_phases: [
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
                "hint": "¿La Corte consintió la discriminación o declaró que la norma chocaba frontalmente con la Ley Fundamental ordenando otorgar el opto?"
              }
            ],
            is_custom: false
          },
          {
            id: 'halabi',
            title: 'Caso Halabi (2009)',
            year: 2009,
            court: 'Corte Suprema de Justicia de la Nación',
            theme: 'Acciones de Clase y Derechos de Incidencia Colectiva',
            summary: 'Ernesto Halabi interpuso amparo contra la Ley de Telecomunicaciones que autorizaba la recolección de llamadas y tráfico de datos sin control judicial. La Corte Suprema reconoció la categoría de "derechos de incidencia colectiva referentes a intereses individuales homogéneos" dando origen pretoriano a la acción de clase en Argentina.',
            guarantees: ['Derecho a la Intimidad (Art. 19)', 'Inviolabilidad de la Correspondencia y Papeles (Art. 18)', 'Amparo Colectivo (Art. 43)'],
            core_facts: 'Halabi, abogado, interpuso amparo por entender que el registro forzoso de sus telecomunicaciones violaba el secreto profesional e intimidad, extendiéndose este agravio a todos los usuarios del país.',
            socratic_phases: [
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
            ],
            is_custom: false
          },
          {
            id: 'kot',
            title: 'Caso Kot (1958)',
            year: 1958,
            court: 'Corte Suprema de Justicia de la Nación',
            theme: 'Acceso Directo a la Justicia y Amparo de Particulares',
            summary: 'A través de un conflicto gremial, la fábrica textil de Kot fue tomada por obreros. Kot alegó que sufría la usurpación del derecho a la propiedad. La Corte falló que la acción de amparo es perfectamente admisible frente a actos ilegítimos cometidos no solo por el Estado, sino también por particulares.',
            guarantees: ['Derecho de Propiedad (Art. 17)', 'Libertad de Trabajo y Comercio (Art. 14)', 'Acción de Amparo pretoriana'],
            core_facts: 'Tras las ocupaciones de la planta textil de la firma Samuel Kot S.R.L. y habiéndose librado vías penales poco idóneas, Kot entabla la acción directa constitucional ya sentada en el caso Siri, extendiendo la cobertura frente a particulares.',
            socratic_phases: [
              {
                "name": "Conflicto de Hecho",
                "question": "Estudiemos el Caso Kot. ¿Cuál fue el suceso fáctico específico que impidió a Samuel Kot hacer uso normal de su fábrica e instalaciones?",
                "targetConcepts": ["huelga", "toma de la fábrica", "ocupación", "usurpación", "obreros", "plantón", "conflicto gremial"],
                "hint": "Los trabajadores de la fábrica decretaron una huelga e ingresaron por la fuerza, ocupando físicamente las instalaciones del establecimiento fabril."
              },
              {
                "name": "Doble Vía y Amparo frente a quiénes",
                "question": "Excelente reconocimiento del hecho. El aporte histórico de Kot junto con Siri creó el Amparo pretoriano. Siri lo creó contra actos administrativos del Estado. Pero, ¿cuál fue el giro de Kot? ¿Contra los actos de quiénes determiná la Corte que procede el Amparo?",
                "targetConcepts": ["particulares", "privados", "sindicatos", "personas privadas", "no estatales"],
                "hint": "Piensa en quiénes eran los agresores del derecho en Kot: no eran militares ni policías estatales, sino obreros despedidos (actores individuales privados)."
              }
            ],
            is_custom: false
          }
        ];
        const { error: insError } = await sClient.from("cases").insert(seedCases);
        if (insError) console.error("[AUTO-SEED]: Cases insertion error:", insError);
      }
    } catch (err) {
      console.error("[AUTO-SEED ERROR during Cases stage]:", err);
    }

    // 3. Seed Documents
    try {
      const { data: docCheck, error: dError } = await sClient.from("documents").select("id");
      if (!dError && (!docCheck || docCheck.length === 0)) {
        console.log("[AUTO-SEED]: Seeding empty 'documents' table with defaults...");
        const seedDocs = [
          { id: 'doc-1', name: 'fallo_arenzon_completo.pdf', size: '2.4 MB', status: 'Indexado', case_id: 'arenzon' },
          { id: 'doc-2', name: 'analisis_principales_vulneraciones_art_28.docx', size: '420 KB', status: 'Indexado', case_id: 'arenzon' },
          { id: 'doc-3', name: 'fallo_halabi_dictamen_procuracion.pdf', size: '3.1 MB', status: 'Indexado', case_id: 'halabi' },
          { id: 'doc-4', name: 'resumen_jurisprudencia_siri_y_kot.txt', size: '94 KB', status: 'Indexado', case_id: 'kot' }
        ];
        const { error: insError } = await sClient.from("documents").insert(seedDocs);
        if (insError) console.error("[AUTO-SEED]: Documents insertion error:", insError);
      }
    } catch (err) {
      console.error("[AUTO-SEED ERROR during Documents stage]:", err);
    }

    // 4. Seed Fichas
    try {
      const { data: fichasCheck, error: fError } = await sClient.from("fichas").select("username");
      if (!fError && (!fichasCheck || fichasCheck.length === 0)) {
        console.log("[AUTO-SEED]: Seeding empty 'fichas' table...");
        const seedFichas = [
          {
            username: 'ALU2024',
            case_id: 'arenzon',
            actor: 'Gabriel Arenzon',
            year: '1984',
            guarantees: ['Art. 14 Constitucional (Trabajar, Enseñar)', 'Art. 16 Constitucional (Igualdad ante la Ley)'],
            concepts: [],
            resolution: 'Pendiente de resolución',
            completed: false,
            current_phase_index: 2,
            nombre_del_fallo: 'Caso Arenzon (1984)',
            fallos: 'Fallos: 306:400',
            ano: '1984',
            hechos: 'Gabriel Arenzon completó sus estudios para enseñar matemáticas pero se le negó el diploma habilitante porque medía 1.48 metros. La normativa vigente en el Ministerio de Educación exigía 1.60 metros de altura mínima para cargos docentes.',
            cuestiones_presentadas: '—',
            primera_instancia: '—',
            segunda_instancia: '—',
            tipo_jurisdiccion_invocada: '—',
            procurador_general_principios: '—',
            procurador_general_razonamiento: '—',
            decision_corte_principios: '—',
            decision_corte_razonamiento: '—',
            disidencia_concurrencia_principios: '—',
            disidencia_concurrencia_razonamiento: '—',
            obiter_dictum_significativo: '—'
          },
          {
            username: 'ALU456',
            case_id: 'arenzon',
            actor: 'Gabriel Arenzon',
            year: '1984',
            guarantees: ['Art. 14 Constitucional', 'Art. 16 Constitucional'],
            concepts: ['Test de Razonabilidad del Art. 28', 'Habilitación Académica vs Estructura Física'],
            resolution: 'Declarar la inconstitucionalidad de la resolución ministerial limitante, otorgando habilitación.',
            completed: true,
            current_phase_index: 4,
            nombre_del_fallo: 'Caso Arenzon (1984)',
            fallos: 'Fallos: 306:400',
            ano: '1984',
            hechos: 'Gabriel Arenzon completó sus estudios para enseñar matemáticas pero se le negó el diploma habilitante porque medía 1.48 metros. La normativa vigente en el Ministerio de Educación exigía 1.60 metros de altura mínima para cargos docentes.',
            cuestiones_presentadas: 'Incompatibilidad de la estatura de 1,60 metros con los derechos de trabajar y enseñar matemáticas del Art. 14 de la CN.',
            primera_instancia: 'Hace lugar al amparo. Declara inconstitucional la norma.',
            segunda_instancia: 'Confirma la sentencia de primera instancia.',
            tipo_jurisdiccion_invocada: 'Recurso Extraordinario Federal - Ley 48',
            procurador_general_principios: 'Igualdad ante la ley e idoneidad para el cargo público.',
            procurador_general_razonamiento: 'La estatura no es indicativa de potencial intelectual o pedagógico docente.',
            decision_corte_principios: 'Supremacía Constitucional (Art. 31) y Test de Razonabilidad del Art. 28.',
            decision_corte_razonamiento: 'Gabriel Arenzon fue rechazado de su profesorado de matemáticas debido a que su estatura (1.48m) no alcanzaba el mínimo de 1.60m exigido por el reglamento de Sanidad Escolar. La Corte Suprema declaró la inconstitucionalidad de dicha exigencia por resultar arbitraria e irrazonable en virtud del Art. 28 de la CN.',
            disidencia_concurrencia_principios: 'Sin disidencias',
            disidencia_concurrencia_razonamiento: 'Fallo dictado por unanimidad.',
            obiter_dictum_significativo: 'La idoneidad de un docente reside en su intelecto y formación, no en su escala de estatura física.'
          }
        ];
        const { error: insError } = await sClient.from("fichas").insert(seedFichas);
        if (insError) console.error("[AUTO-SEED]: Fichas insertion error:", insError);
      }
    } catch (err) {
      console.error("[AUTO-SEED ERROR during Fichas stage]:", err);
    }
  }

  // --- API: LOGIN ---
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ error: "Faltan legajo o contraseña obligatorios." });
      }

      const normalizedUsername = String(username).trim().toUpperCase();

      const sClient = getSupabaseClient();
      if (!sClient) {
        // Fallback local mode
        const defaultProfiles = [
          { id: "usr-1", username: "ALU2024", name: "Santiago Fernández", role: "student", es_docente: false, created_at: new Date().toISOString() },
          { id: "usr-2", username: "DOC101", name: "Dra. Elena Bianchi", role: "teacher", es_docente: true, created_at: new Date().toISOString() },
          { id: "usr-3", username: "ALU456", name: "Marta Rodriguez", role: "student", es_docente: false, created_at: new Date().toISOString() }
        ];

        const matched = defaultProfiles.find(p => p.username === normalizedUsername);
        if (matched) {
          if (password === "123") {
            const token = `loc-token-${normalizedUsername}-${Date.now()}`;
            const mapped = mapProfileToJS({ ...matched, session_token: token });
            return res.json({ success: true, profile: mapped, isLocal: true });
          } else {
            return res.status(401).json({ error: "Contraseña incorrecta para el entorno local." });
          }
        }
        return res.status(404).json({ error: "Legajo académico no registrado en base local." });
      }

      // Supabase Mode
      await ensureDbDataIsSeeded(sClient);
      const { data, error } = await sClient
        .from("profiles")
        .select("*")
        .eq("username", normalizedUsername);

      if (error) throw error;

      if (!data || data.length === 0) {
        return res.status(404).json({ error: "Este Legajo académico no figura registrado ni pre-autorizado por la cátedra." });
      }

      const dbUser = data[0];

      // Check if activated
      if (!dbUser.password_hash) {
        return res.status(403).json({
          error: "Legajo académico pre-autorizado pero aún no ha sido activado por el alumno.",
          activationRequired: true
        });
      }

      const incomingHash = hashPassword(password);
      if (dbUser.password_hash !== incomingHash) {
        return res.status(401).json({ error: "Contraseña incorrecta para este legajo." });
      }

      // Generate session token to secure calls
      const sessionToken = hashPassword(normalizedUsername + Date.now().toString());
      await sClient.from("profiles").update({ session_token: sessionToken }).eq("username", normalizedUsername);

      const profile = mapProfileToJS({ ...dbUser, session_token: sessionToken });
      res.json({ success: true, profile });

    } catch (err: any) {
      console.error("Auth Login Error:", err);
      res.status(500).json({ error: "Fallo de conexión o consulta de autenticación con Supabase.", details: err.message });
    }
  });

  // --- API: REGISTER / ACTIVATION ---
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { username, name, password } = req.body;
      if (!username || !name || !password) {
        return res.status(400).json({ error: "Legajo, Nombre completo y Contraseña son obligatorios." });
      }

      const normalizedUsername = String(username).trim().toUpperCase();

      const sClient = getSupabaseClient();
      if (!sClient) {
        // Fallback local mode
        const token = `loc-token-${normalizedUsername}-${Date.now()}`;
        const newLocalUser = {
          id: `usr-loc-${Date.now()}`,
          username: normalizedUsername,
          name: name.trim(),
          role: "student",
          es_docente: false,
          session_token: token,
          created_at: new Date().toISOString()
        };
        return res.json({ success: true, profile: mapProfileToJS(newLocalUser), isLocal: true });
      }

      // 1. Get pre-authorized profile
      await ensureDbDataIsSeeded(sClient);
      const { data, error } = await sClient
        .from("profiles")
        .select("*")
        .eq("username", normalizedUsername);

      if (error) throw error;

      if (!data || data.length === 0) {
        return res.status(403).json({
          error: "Su legajo no figura en el padrón de 150 alumnos matriculados y autorizados para esta cátedra. Por favor, consulte con su docente para ser agregado."
        });
      }

      const dbUser = data[0];

      // 2. Check if already activated
      if (dbUser.password_hash) {
        return res.status(400).json({ error: "Este legajo ya ha sido activado con anterioridad. Inicie sesión con su contraseña." });
      }

      // 3. Activate legajo
      const secretHash = hashPassword(password);
      const sessionToken = hashPassword(normalizedUsername + Date.now().toString());

      const { data: updatedData, error: updateError } = await sClient
        .from("profiles")
        .update({
          name: name.trim() || dbUser.name,
          password_hash: secretHash,
          session_token: sessionToken
        })
        .eq("username", normalizedUsername)
        .select();

      if (updateError) throw updateError;

      const profile = mapProfileToJS(updatedData?.[0]);
      res.json({ success: true, profile });

    } catch (err: any) {
      console.error("Auth Register Error:", err);
      res.status(500).json({ error: "Error al activar el legajo académico en el servidor con Supabase.", details: err.message });
    }
  });

  // --- API: STRICT TOKEN VALIDATION ---
  app.post("/api/auth/verify", async (req, res) => {
    try {
      const { token, username } = req.body;
      if (!token || !username) {
        return res.status(400).json({ error: "Parámetros de sesión insuficientes." });
      }

      const normalizedUsername = String(username).trim().toUpperCase();

      const sClient = getSupabaseClient();
      if (!sClient) {
        // Fallback local verification
        return res.json({ success: true, profile: { id: "usr-1", username: normalizedUsername, name: "Santiago Fernández", role: normalizedUsername === 'DOC101' ? 'teacher' : 'student', esDocente: normalizedUsername === 'DOC101', createdAt: new Date().toISOString() } });
      }

      const { data, error } = await sClient
        .from("profiles")
        .select("*")
        .eq("username", normalizedUsername)
        .eq("session_token", token);

      if (error) throw error;

      if (!data || data.length === 0) {
        return res.status(401).json({ error: "Sesión inválida o expirada. Por favor vuelva a identificarse." });
      }

      const profile = mapProfileToJS(data[0]);
      res.json({ success: true, profile });

    } catch (err: any) {
      console.error("Auth Verify Error:", err);
      res.status(500).json({ error: "Error de verificación de sesión con Supabase.", details: err.message });
    }
  });

  // Check connection status
  app.get("/api/supabase/config", (req, res) => {
    const sClient = getSupabaseClient();
    res.json({ configured: !!sClient });
  });

  // Pull complete data arrays (Centralized Synchronization)
  app.get("/api/supabase/sync", async (req, res) => {
    try {
      const sClient = getSupabaseClient();
      if (!sClient) {
        return res.json({ configured: false, profiles: [], cases: [], documents: [], chats: [], fichas: [] });
      }

      await ensureDbDataIsSeeded(sClient);

      const [profilesRes, casesRes, documentsRes, chatsRes, fichasRes] = await Promise.all([
        sClient.from("profiles").select("*"),
        sClient.from("cases").select("*"),
        sClient.from("documents").select("*"),
        sClient.from("chats").select("*"),
        sClient.from("fichas").select("*")
      ]);

      const missingTables: string[] = [];
      const tablesCheck = [
        { name: "profiles", res: profilesRes },
        { name: "cases", res: casesRes },
        { name: "documents", res: documentsRes },
        { name: "chats", res: chatsRes },
        { name: "fichas", res: fichasRes }
      ];

      for (const t of tablesCheck) {
        if (t.res.error) {
          const errMsg = t.res.error.message || "";
          const isMissing = t.res.error.code === '42P01' || 
                            errMsg.includes("Could not find the table") ||
                            (errMsg.includes("relation") && errMsg.includes("does not exist"));
          if (isMissing) {
            missingTables.push(t.name);
            console.warn(`[SUPABASE CONFIG WARNING]: La tabla '${t.name}' no existe en la base de datos Supabase. Por favor ejecute el archivo 'supabase_schema.sql' en su editor SQL de Supabase para solucionarlo.`);
          } else {
            console.error(`Error fetching ${t.name}:`, t.res.error.message || t.res.error);
          }
        }
      }

      const profiles = (profilesRes.data || []).map(mapProfileToJS);
      const cases = (casesRes.data || []).map(mapCaseToJS);
      const documents = (documentsRes.data || []).map(mapDocumentToJS);
      const chats = (chatsRes.data || []).map(mapChatToJS);
      const fichas = (fichasRes.data || []).map(mapFichaToJS);

      res.json({
        configured: true,
        profiles: !profilesRes.error ? profiles : undefined,
        cases: !casesRes.error ? cases : undefined,
        documents: !documentsRes.error ? documents : undefined,
        chats: !chatsRes.error ? chats : undefined,
        fichas: !fichasRes.error ? fichas : undefined,
        missingTables: missingTables.length > 0 ? missingTables : undefined
      });
    } catch (err: any) {
      console.error("[SUPABASE SYNC ERROR]:", err);
      res.status(500).json({ error: "Fallo al sincronizar datos con SupabaseSQL.", details: err.message });
    }
  });

  // Save/Update human/student profile
  app.post("/api/supabase/profiles", async (req, res) => {
    try {
      const sClient = getSupabaseClient();
      if (!sClient) return res.status(503).json({ error: "Supabase no configurado" });

      const profile = req.body;
      const dbRow = mapProfileToSQL(profile);

      const { data, error } = await sClient.from("profiles").upsert(dbRow).select();
      if (error) throw error;

      res.json({ success: true, profile: mapProfileToJS(data?.[0]) });
    } catch (err: any) {
      console.error("Error upserting profile:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // Delete student profile and all associated data
  app.delete("/api/supabase/profiles/:username", async (req, res) => {
    try {
      const sClient = getSupabaseClient();
      if (!sClient) return res.status(503).json({ error: "Supabase no configurado" });

      const username = req.params.username.toUpperCase();

      await Promise.all([
        sClient.from("profiles").delete().eq("username", username),
        sClient.from("fichas").delete().eq("username", username),
        sClient.from("chats").delete().eq("username", username)
      ]);

      res.json({ success: true });
    } catch (err: any) {
      console.error("Error deleting profile:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // Create/Update teaching case
  app.post("/api/supabase/cases", async (req, res) => {
    try {
      const sClient = getSupabaseClient();
      if (!sClient) return res.status(503).json({ error: "Supabase no configurado" });

      const singleCase = req.body;
      const dbRow = mapCaseToSQL(singleCase);

      const { data, error } = await sClient.from("cases").upsert(dbRow).select();
      if (error) throw error;

      res.json({ success: true, case: mapCaseToJS(data?.[0]) });
    } catch (err: any) {
      console.error("Error upserting case:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // Delete case & related records
  app.delete("/api/supabase/cases/:id", async (req, res) => {
    try {
      const sClient = getSupabaseClient();
      if (!sClient) return res.status(503).json({ error: "Supabase no configurado" });

      const caseId = req.params.id;

      await Promise.all([
        sClient.from("cases").delete().eq("id", caseId),
        sClient.from("documents").delete().eq("case_id", caseId),
        sClient.from("chats").delete().eq("case_id", caseId),
        sClient.from("fichas").delete().eq("case_id", caseId)
      ]);

      res.json({ success: true });
    } catch (err: any) {
      console.error("Error deleting case:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // --- REAL RAG UPLOAD AND CHUNKING PIPELINE WITH GOOGLE EMBEDDINGS ---
  app.post("/api/upload-document", async (req, res) => {
    try {
      const { fileName, fileSize, caseId, fileData, fileType } = req.body;

      if (!fileName || !fileData || !caseId) {
        return res.status(400).json({ error: "Faltan parámetros obligatorios (fileName, fileData, caseId)." });
      }

      console.log(`Iniciando procesamiento RAG para: ${fileName} (${fileSize || 'Desconocido'}) del caso ${caseId}`);
      
      const buffer = Buffer.from(fileData, 'base64');
      let rawText = '';
      
      try {
        if (fileName.toLowerCase().endsWith('.pdf') || (fileType && fileType.includes('pdf'))) {
          // Parse PDF using pdf-parse
          const parsed = await pdfParse(buffer);
          rawText = parsed.text || '';
        } else {
          rawText = buffer.toString('utf-8');
        }
      } catch (parseErr: any) {
        console.error("Error al extraer texto bruto del archivo:", parseErr);
        return res.status(400).json({ error: "Fallo de decodificación de archivo. Verifique que no esté corrupto.", details: parseErr.message });
      }

      if (!rawText || rawText.trim().length === 0) {
        return res.status(400).json({ error: "El archivo cargado no contiene texto indexable legible o está vacío." });
      }

      // 1. Core metadata creation
      const docId = `doc-${Date.now()}`;
      const newDoc = {
        id: docId,
        name: fileName,
        size: fileSize || `${Math.round(buffer.length / 1024)} KB`,
        status: 'Indexado',
        caseId: caseId,
        uploadedAt: new Date().toLocaleString('es-AR')
      };

      // 2. Fragmenting text into semantic chunks
      const chunks = chunkText(rawText, 800, 150);
      console.log(`[RAG-Pipeline]: Se generaron ${chunks.length} fragmentos de texto para ${fileName}`);

      // 3. Compute vector representations for each chunk using Google text-embedding-004 model
      const ai = getGeminiClient();
      const chunksWithEmbeddings: any[] = [];

      for (let j = 0; j < chunks.length; j++) {
        const chunkTextStr = chunks[j];
        if (!chunkTextStr.trim()) continue;

        try {
          const embedRes = (await ai.models.embedContent({
            model: "text-embedding-004",
            contents: chunkTextStr,
          })) as any;
          const embeddingValues = embedRes.embedding?.values || embedRes.embeddings?.[0]?.values;
          if (embeddingValues) {
            chunksWithEmbeddings.push({
              id: `chunk-${docId}-${j}`,
              document_id: docId,
              document_name: fileName,
              case_id: caseId,
              content: chunkTextStr,
              embedding: embeddingValues
            });
          }
        } catch (embedError: any) {
          console.error(`Error generando embedding para el fragmento ${j}:`, embedError);
        }
      }

      if (chunksWithEmbeddings.length === 0) {
        return res.status(500).json({ error: "No se pudieron calcular embeddings para ningún fragmento del PDF." });
      }

      // 4. Persistence Path 1: Write to Supabase Database Tables if active
      const sClient = getSupabaseClient();
      let savedToSupabase = false;

      if (sClient) {
        try {
          // Write document metadata record
          const dbRow = mapDocumentToSQL(newDoc);
          const { error: docErr } = await sClient.from("documents").upsert(dbRow);
          if (docErr) throw docErr;

          // Write document chunks references
          const { error: chunksErr } = await sClient.from("document_chunks").insert(chunksWithEmbeddings);
          if (chunksErr) throw chunksErr;

          savedToSupabase = true;
          console.log(`[RAG-Pipeline]: ${chunksWithEmbeddings.length} fragmentos vectoriales almacenados con éxito en Supabase Postgres.`);
        } catch (dbErr: any) {
          console.warn("Fallo persistiendo en tablas Supabase, activando redundancia de memoria:", dbErr.message);
        }
      }

      // 5. Persistence Path 2: Redundant local memory store to keep sandbox 100% stable out of the box
      for (const item of chunksWithEmbeddings) {
        memoryChunks.push({
          id: item.id,
          documentId: item.document_id,
          documentName: item.document_name,
          caseId: item.case_id,
          content: item.content,
          embedding: item.embedding
        });
      }

      console.log(`[RAG-Pipeline]: Completado con éxito para ${fileName}. Almacenados en caché local de servidor: ${memoryChunks.length} fragmentos totales.`);

      res.json({
        success: true,
        document: newDoc,
        chunkCount: chunksWithEmbeddings.length,
        persistedInDB: savedToSupabase
      });

    } catch (error: any) {
      console.error("Fallo general en la canalización RAG /api/upload-document:", error);
      res.status(500).json({ error: "Ocurrió un error inesperado al procesar, fraccionar e indexar el documento.", details: error.message });
    }
  });

  // Create/Update document record info
  app.post("/api/supabase/documents", async (req, res) => {
    try {
      const sClient = getSupabaseClient();
      const doc = req.body;

      if (sClient) {
        const dbRow = mapDocumentToSQL(doc);
        const { data, error } = await sClient.from("documents").upsert(dbRow).select();
        if (error) throw error;
        return res.json({ success: true, document: mapDocumentToJS(data?.[0]) });
      }

      res.json({ success: true, message: "Modo fuera de línea local (Supabase no conectado)", document: doc });
    } catch (err: any) {
      console.error("Error upserting document:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // Delete document
  app.delete("/api/supabase/documents/:id", async (req, res) => {
    try {
      const docId = req.params.id;
      console.log(`Borrando documento: ${docId} de todos los motores vectoriales.`);
      
      // Cleanup RAG server-side memory chunks
      memoryChunks = memoryChunks.filter(c => c.documentId !== docId);

      const sClient = getSupabaseClient();
      if (sClient) {
        // Suppress errors if public.document_chunks table does not exist or isn't synchronized
        try {
          await sClient.from("document_chunks").delete().eq("document_id", docId);
        } catch (chunksDelErr) {
          console.warn("Fallo el borrado directo de chunks en Supabase:", chunksDelErr);
        }
        
        const { error } = await sClient.from("documents").delete().eq("id", docId);
        if (error) throw error;
      }

      res.json({ success: true });
    } catch (err: any) {
      console.error("Error deleting document:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // Save new chat message
  app.post("/api/supabase/chats", async (req, res) => {
    try {
      const sClient = getSupabaseClient();
      if (!sClient) return res.status(503).json({ error: "Supabase no configurado" });

      const msg = req.body;
      const dbRow = mapChatToSQL(msg);

      const { data, error } = await sClient.from("chats").upsert(dbRow).select();
      if (error) throw error;

      res.json({ success: true, message: mapChatToJS(data?.[0]) });
    } catch (err: any) {
      console.error("Error upserting chat message:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // Clear chats for individual user and case
  app.delete("/api/supabase/chats/clear", async (req, res) => {
    try {
      const sClient = getSupabaseClient();
      if (!sClient) return res.status(503).json({ error: "Supabase no configurado" });

      const { username, caseId } = req.query;
      if (!username || !caseId) {
        return res.status(400).json({ error: "Faltan parámetros query 'username' o 'caseId'" });
      }

      const { error } = await sClient.from("chats")
        .delete()
        .eq("username", String(username).toUpperCase())
        .eq("case_id", String(caseId));

      if (error) throw error;
      res.json({ success: true });
    } catch (err: any) {
      console.error("Error clearing chats:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // Create/Update/Save student Ficha
  app.post("/api/supabase/fichas", async (req, res) => {
    try {
      const sClient = getSupabaseClient();
      if (!sClient) return res.status(503).json({ error: "Supabase no configurado" });

      const ficha = req.body;
      const dbRow = mapFichaToSQL(ficha);

      const { data, error } = await sClient.from("fichas").upsert(dbRow).select();
      if (error) throw error;

      res.json({ success: true, ficha: mapFichaToJS(data?.[0]) });
    } catch (err: any) {
      console.error("Error upserting ficha:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // --- INTEGRACIÓN VITE Y RUTA DE ARCHIVOS ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[CONSTI-BOT] Servidor en ejecución en el puerto ${PORT}`);
    console.log(`[CONSTI-BOT] Ambiente: ${process.env.NODE_ENV || 'development'}`);
  });
}

startServer();
