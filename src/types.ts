/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = 'student' | 'teacher';

export interface UserProfile {
  id: string;
  username: string; // Legajo o usuario
  name: string;
  role: UserRole;
  esDocente?: boolean;
  sessionToken?: string;
  activated?: boolean;
  createdAt: string;
}

export interface SocraticPhase {
  name: string; // e.g., 'Hechos', 'Derechos', 'Razonabilidad', 'Fallo'
  question: string; // Socratic question to ask the student
  targetConcepts: string[]; // Keywords to check if student understands
  hint: string; // Guidance if they struggle
}

export interface FalloCase {
  id: string; // URL-safe key (e.g. 'arenzon')
  title: string;
  year: number;
  court: string;
  theme: string;
  summary: string;
  guarantees: string[];
  coreFacts: string;
  socraticPhases: SocraticPhase[];
  isCustom?: boolean;
}

export interface RagDoc {
  id: string;
  name: string;
  size: string;
  status: 'Procesando' | 'Indexado' | 'Error';
  caseId: string;
  uploadedAt: string;
}

export interface ChatMessage {
  id: string;
  username: string;
  caseId: string;
  sender: 'user' | 'bot';
  text: string;
  ragSource?: string;
  ragSimilarity?: number;
  timestamp: string;
}

export interface StudentFicha {
  username: string;
  caseId: string;
  actor: string;
  year: string;
  guarantees: string[];
  concepts: string[];
  resolution: string;
  completed: boolean;
  currentPhaseIndex: number;
  updatedAt: string;

  // Official fields matching the Cátedra Derecho Constitucional C PDF model
  nombreDelFallo?: string;
  fallos?: string;
  ano?: string;
  hechos?: string;
  cuestionesPresentadas?: string;
  primeraInstancia?: string;
  segundaInstancia?: string;
  tipoJurisdiccionInvocada?: string;
  procuradorGeneral_principios?: string;
  procuradorGeneral_razonamiento?: string;
  decisionCorte_principios?: string;
  decisionCorte_razonamiento?: string;
  disidenciaConcurrencia_principios?: string;
  disidenciaConcurrencia_razonamiento?: string;
  obiterDictumSignificativo?: string;
}

export interface StudentStatsSummary {
  username: string;
  name: string;
  activeCaseId: string;
  progressPercentage: number;
  totalMessages: number;
  lastActive: string;
}
