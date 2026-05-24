/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Send, Sparkles, FileDown, RotateCw, CheckCircle, GraduationCap, Gavel, HelpCircle, AlertTriangle } from 'lucide-react';
import { db } from '../db';
import { FalloCase, UserProfile, ChatMessage, StudentFicha } from '../types';
import { generateAcademicPDF } from '../utils/pdfGenerator';

interface SocraticChatroomProps {
  user: UserProfile;
  caseId: string;
  onGoBack: () => void;
}

export function SocraticChatroom({ user, caseId, onGoBack }: SocraticChatroomProps) {
  const caseData = db.getCases().find(c => c.id === caseId)!;
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [ficha, setFicha] = useState<StudentFicha | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [apiKeyError, setApiKeyError] = useState(false);
  
  const bottomRef = useRef<HTMLDivElement>(null);

  // Initialize conversations and ficha
  useEffect(() => {
    // 1. Fetch persistent summary card (ficha)
    const activeFicha = db.getFichaForStudent(user.username, caseId);
    setFicha(activeFicha);

    // 2. Fetch or seed chat history
    let chatHist = db.getChatsForStudent(user.username, caseId);
    if (chatHist.length === 0) {
      // First boot: Seed first socratic question from active phase index
      const firstMsgText = caseData.socraticPhases[activeFicha.currentPhaseIndex]?.question || caseData.socraticPhases[0].question;
      const seedMsg = db.addChatMessage({
        id: crypto.randomUUID(),
        username: user.username,
        caseId: caseId,
        sender: 'bot',
        text: firstMsgText,
        timestamp: new Date().toISOString(),
        ragSource: `Base de Jurisprudencias C - Guía Inicial`
      });
      chatHist = [seedMsg];
    }
    setMessages(chatHist);
  }, [user.username, caseId]);

  // Auto Scroll down on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Socratic Keyword Mock-Engine (Fidelity Fallback if Gemini API Key isn't configured in the Secrets panel)
  const computeLocalFallbackSocraticAnswer = (userText: string, currentFicha: StudentFicha): any => {
    const textLower = userText.toLowerCase();
    const phaseIdx = currentFicha.currentPhaseIndex;
    const currentPhaseDef = caseData.socraticPhases[phaseIdx];
    
    let isCorrect = false;
    // Check if user text hits any target concept keys for the current phase
    if (currentPhaseDef) {
       isCorrect = currentPhaseDef.targetConcepts.some((word) => textLower.includes(word.toLowerCase()));
    }

    const nextFicha = { ...currentFicha };

    let reply = "";
    let source = "Manual Académico de Cátedra C";

    if (phaseIdx === 0) {
      if (isCorrect || textLower.length > 15) {
        // Advanced
        nextFicha.currentPhaseIndex = 1;
        nextFicha.actor = caseData.id === 'arenzon' ? 'Gabriel Arenzon' : 'Estudiante Litigante';
        nextFicha.year = String(caseData.year);
        
        nextFicha.nombreDelFallo = caseData.title;
        nextFicha.fallos = caseData.id === 'arenzon' ? 'Fallos: 306:400' : caseData.id === 'halabi' ? 'Fallos: 332:111' : 'Fallos: Colección CSJN';
        nextFicha.ano = String(caseData.year);
        nextFicha.hechos = caseData.coreFacts;
        
        db.saveFicha(nextFicha);
        
        reply = `¡Muy acertado! Entiendes perfectamente los hechos iniciales. Queda registrado en tu informe: Actor "${nextFicha.actor}" y Año "${nextFicha.year}".

Ahora avancemos intelectualmente. ¿Qué libertades o derechos consagrados en la Constitución Nacional considerarías que se vieron vulnerados por este reglamento ministerial restrictivo? Pensá en los Artículos 14 y 16 de la Carta Magna.`;
        source = `fallo_${caseData.id}_analítico.pdf (pág. 1)`;
      } else {
        reply = `Comprendo tu punto, pero analicemos más el conflicto central. ${currentPhaseDef.hint} ¿Podrías ser más específico con el motivo de rechazo físico o de estatura que detona el amparo?`;
      }
    } else if (phaseIdx === 1) {
      const guaranteesMatched = caseData.guarantees.filter(g => {
        const words = g.toLowerCase().replace(/[^a-z0-9 ]/g, '').split(' ');
        return words.some(w => w.length > 3 && textLower.includes(w));
      });

      if (isCorrect || guaranteesMatched.length > 0 || textLower.length > 15) {
        nextFicha.currentPhaseIndex = 2;
        nextFicha.guarantees = Array.from(new Set([...ficha?.guarantees || [], ...caseData.guarantees]));
        
        nextFicha.cuestionesPresentadas = caseData.id === 'arenzon' 
          ? 'Incompatibilidad de la estatura de 1,60 metros con los derechos de trabajar y enseñar matemáticas del Art. 14 de la CN.' 
          : 'Privacidad y correspondencia postal/electrónica frente al acopio estatal sin orden judicial';
        nextFicha.tipoJurisdiccionInvocada = 'Recurso Extraordinario Federal';
        
        db.saveFicha(nextFicha);

        reply = `¡Excelente deducción dogmática! Ha quedado registrado el agravio constitucional en el informe lateral: Derechos vulnerados procesados.

Ahora pasemos al núcleo de la materia "Derecho Constitucional C": El Test de Razonabilidad. Te convoco a leer el Artículo 28 de la CN. ¿Te parece razonable o arbitrario privar del derecho a enseñar matemáticas a alguien por medir 1.48m? ¿Existe relación lógica entre altura e idoneidad intelectual?`;
        source = `fallo_${caseData.id}_analítico.pdf (pág. 3)`;
      } else {
        reply = `Vas bien encaminado, pero repasemos las garantías constitucionales primarias. ${currentPhaseDef.hint} ¿Qué garantías del Art. 14 se violan si se restringe la docencia?`;
      }
    } else if (phaseIdx === 2) {
      if (isCorrect || textLower.includes('art') || textLower.includes('razon') || textLower.length > 15) {
        nextFicha.currentPhaseIndex = 3;
        nextFicha.concepts = Array.from(new Set([...ficha?.concepts || [], "Análisis de Razonabilidad del Artículo 28 CN", "Test de Aptitud Intelectual vs Idoneidad Física"]));
        
        nextFicha.procuradorGeneral_principios = 'Control de constitucionalidad estricto, principio de idoneidad.';
        nextFicha.procuradorGeneral_razonamiento = 'Falta de nexo de razonabilidad entre la limitación formal y la aptitud académica.';
        nextFicha.primeraInstancia = 'Hace lugar al amparo. Declara inconstitucional la norma.';
        nextFicha.segundaInstancia = 'Confirma la sentencia de primera instancia.';
        
        db.saveFicha(nextFicha);

        reply = `¡Excelente! Claramente has comprendido el principio constitucional de razonabilidad. No hay un nexo razonable que justifique esta medida.

Para cerrar este análisis: ¿Qué doctrina sentó finalmente esta causa? ¿De qué manera decidió resolver el tribunal sobre la constitucionalidad de dicho reglamento ministerial?`;
        source = `jurisprudencia_razonabilidad_art28.txt (f. 223)`;
      } else {
        reply = `Analicemos la estructura del Artículo 28. ${currentPhaseDef.hint} ¿Estás seguro que hay una relación de causa-efecto lógica entre altura y matemáticas?`;
      }
    } else {
      // Final Phase Completed
      nextFicha.currentPhaseIndex = 4;
      nextFicha.completed = true;
      nextFicha.resolution = caseData.summary;
      
      nextFicha.nombreDelFallo = caseData.title;
      nextFicha.fallos = caseData.id === 'arenzon' ? 'Fallos: 306:400' : caseData.id === 'halabi' ? 'Fallos: 332:111' : 'Fallos: Colección CSJN';
      nextFicha.ano = String(caseData.year);
      nextFicha.hechos = caseData.coreFacts;
      nextFicha.cuestionesPresentadas = caseData.id === 'arenzon' 
        ? 'Incompatibilidad de la estatura de 1,60 metros con los derechos de trabajar y enseñar matemáticas del Art. 14 de la CN.' 
        : 'Privacidad y correspondencia de llamadas y tráfico de datos sin orden judicial.';
      nextFicha.tipoJurisdiccionInvocada = 'Recurso Extraordinario Federal - Ley 48';
      nextFicha.procuradorGeneral_principios = 'Igualdad ante la ley e idoneidad para el cargo público.';
      nextFicha.procuradorGeneral_razonamiento = 'La estatura no es indicativa de potencial intelectual o pedagógico docente.';
      nextFicha.primeraInstancia = 'Hace lugar a la acción del actor.';
      nextFicha.segundaInstancia = 'Confirma sentencia de primera instancia.';
      nextFicha.decisionCorte_principios = 'Supremacía Constitucional (Art. 31) y Test de Razonabilidad del Art. 28.';
      nextFicha.decisionCorte_razonamiento = caseData.summary;
      nextFicha.disidenciaConcurrencia_principios = 'Sin disidencia';
      nextFicha.disidenciaConcurrencia_razonamiento = 'Fallo dictado por unanimidad.';
      nextFicha.obiterDictumSignificativo = caseData.id === 'arenzon'
        ? 'La idoneidad de un docente reside en su intelecto y formación, no en su escala de estatura física.'
        : 'El amparo es la vía idónea inmediata para contrarrestar vulneraciones sistémicas directas.';
      
      db.saveFicha(nextFicha);

      reply = `¡Excelente respuesta! Tu análisis constitucional ha sido sobresaliente. Has demostrado comprender con rigor socrático los hechos, el test de razonabilidad y el fallo de fondo de la Corte Suprema de Justicia. 

Se completó y certificó tu Ficha Académica al 100%. Ya puedes exportarla en formato PDF haciendo clic en el botón de descarga académica lateral. ¡Felicitaciones!`;
      source = `resolucion_completa_fallo_oficial.pdf (conclusiones)`;
    }

    return {
      botResponse: reply,
      updatedFicha: nextFicha,
      ragBadge: {
        source,
        similarity: Math.round(85 + Math.random() * 13) // Similarity score 85%-98%
      }
    };
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isTyping || !ficha) return;

    const userText = inputText.trim();
    setInputText('');

    // Append user message local representation
    const userMsg = db.addChatMessage({
      id: crypto.randomUUID(),
      username: user.username,
      caseId: caseId,
      sender: 'user',
      text: userText,
      timestamp: new Date().toISOString()
    });

    setMessages(prev => [...prev, userMsg]);
    setIsTyping(true);

    try {
      // Call standard Server api POST '/api/chat' to drive Socratic Agent utilizing Google Gemini
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username: user.username,
          caseId: caseId,
          messages: [...messages, userMsg],
          ficha: ficha,
          caseData: caseData,
          ragContext: `Jurisprudencia oficial del expediente: ${caseData.title}. Hechos: ${caseData.coreFacts}. Filtro razonabilidad Art. 28.`
        })
      });

      if (!response.ok) {
        throw new Error("El servidor retornó un código de error de API.");
      }

      const replyJson = await response.json();

      // Check if success
      if (replyJson.botResponse) {
        // Save Bot Chat message
        const botMsg = db.addChatMessage({
          id: crypto.randomUUID(),
          username: user.username,
          caseId: caseId,
          sender: 'bot',
          text: replyJson.botResponse,
          timestamp: new Date().toISOString()
        });

        setMessages(prev => [...prev, botMsg]);
        
        // ONLY update phase progression from AI, DO NOT overwrite student's manual Ficha fields
        if (replyJson.updatedFicha) {
          const newFicha = { 
            ...ficha, 
            completed: replyJson.updatedFicha.completed || ficha.completed,
            currentPhaseIndex: replyJson.updatedFicha.currentPhaseIndex !== undefined ? replyJson.updatedFicha.currentPhaseIndex : ficha.currentPhaseIndex
          };
          setFicha(newFicha);
          db.saveFicha(newFicha);
        }
        
        setApiKeyError(false);
      } else {
        throw new Error("Formato de respuesta Gemini inválido.");
      }

    } catch (err) {
      // FAILOVER: If API key is missing or server fails, run local high-fidelity mock state machine!
      console.warn("Se activó el modo de simulación académica socrática por falta de clave secreta GEMINI_API_KEY o servidor offline:", err);
      
      // Delay to represent AI typing speed
      setTimeout(() => {
        const mockResult = computeLocalFallbackSocraticAnswer(userText, ficha);

        const botMockMsg = db.addChatMessage({
          id: crypto.randomUUID(),
          username: user.username,
          caseId: caseId,
          sender: 'bot',
          text: mockResult.botResponse,
          timestamp: new Date().toISOString(),
          ragSource: mockResult.ragBadge.source,
          ragSimilarity: mockResult.ragBadge.similarity / 100
        });

        setMessages(prev => [...prev, botMockMsg]);
        setFicha(mockResult.updatedFicha);
        setApiKeyError(true); // Flag to notify they are on simulation mode but functional
      }, 1100);
    } finally {
      setIsTyping(false);
    }
  };

  const handleRestartChat = () => {
    if (!window.confirm("¿Estás seguro que querés reiniciar el chat y blanquear la ficha para volver a practicar?")) return;
    
    db.clearChat(user.username, caseId);
    
    const initialFicha: StudentFicha = {
      username: user.username,
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
    db.saveFicha(initialFicha);
    setFicha(initialFicha);

    const firstMsgText = caseData.socraticPhases[0].question;
    const seedMsg = db.addChatMessage({
      id: crypto.randomUUID(),
      username: user.username,
      caseId: caseId,
      sender: 'bot',
      text: "Hola, estudiante! estoy aqui para guiarte en este caso. " + firstMsgText,
      timestamp: new Date().toISOString()
    });

    setMessages([seedMsg]);
    setApiKeyError(false);
  };

  const handleFichaChange = (field: keyof StudentFicha, value: string) => {
    if (!ficha) return;
    const newFicha = { ...ficha, [field]: value };
    setFicha(newFicha);
    db.saveFicha(newFicha);
  };

  const handlesExportPDF = () => {
    if (!ficha) return;
    generateAcademicPDF(ficha, caseData, user.name);
  };

  if (!ficha) return null;

  return (
    <div className="min-h-screen bg-academic-50 flex flex-col">
      {/* Top Bar Classroom Header */}
      <header className="bg-academic-500 text-white shadow-lg border-b border-academic-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <button
              onClick={onGoBack}
              className="p-1.5 px-3 bg-academic-600 hover:bg-white hover:text-academic-500 rounded-lg transition-all text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer shadow-3xs"
            >
              <ArrowLeft size={13} />
              Volver al Aula
            </button>
            <div className="h-6 w-px bg-academic-300"></div>
            <div className="flex items-center gap-2">
              <div className="p-1 px-1.5 bg-white rounded text-academic-500 font-serif font-bold text-xs">C│B</div>
              <div>
                <h1 className="font-serif text-base font-bold tracking-tight text-white">{caseData.title}</h1>
                <p className="text-[9px] text-academic-200 hidden sm:block font-sans uppercase font-semibold">Tutor Socrático Académico de Constitucional</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleRestartChat}
              className="px-3 py-1.5 bg-academic-600 hover:bg-red-700 hover:border-red-500 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition-colors border border-transparent shadow-3xs"
              title="Reiniciar diálogo socrático"
            >
              <RotateCw size={12} />
              Reiniciar Case
            </button>
            <button
              onClick={handlesExportPDF}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg inline-flex items-center gap-1.5 transition-all text-white cursor-pointer shadow-3xs border border-transparent ${
                ficha.completed 
                  ? 'bg-emerald-600 hover:bg-emerald-700' 
                  : 'bg-academic-600 hover:bg-academic-700'
              }`}
              title={ficha.completed ? "Descargar ficha oficial" : "Descargar ficha en progreso"}
            >
              <FileDown size={14} />
              Exportar PDF
              {ficha.completed && <CheckCircle size={12} className="text-white fill-emerald-600" />}
            </button>
          </div>
        </div>
      </header>

      {/* Split Window Workspace Layout */}
      <div className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-hidden">
        {/* Left Side: Chatbot Panel */}
        <div className="lg:col-span-7 flex flex-col h-[78vh] bg-white rounded-2xl shadow-md border border-gray-150/70 overflow-hidden">
          {/* Header instructions */}
          <div className="bg-[#fcf9f8] px-4 py-3.5 border-b border-gray-150 flex items-center justify-between text-xs text-gray-700 font-semibold font-sans">
            <div className="flex items-center gap-2">
              <GraduationCap size={16} className="text-academic-500" />
              <span>Interacción socrática con CONSTI-BOT</span>
            </div>
            {apiKeyError && (
              <span className="bg-amber-100 text-amber-900 border border-amber-250 px-2 py-0.5 rounded font-bold text-[9px] inline-flex items-center gap-1 uppercase tracking-wider">
                <AlertTriangle size={10} />
                Modo Simulado
              </span>
            )}
          </div>

          {/* Actual Message Box */}
          <div className="flex-grow p-4 overflow-y-auto space-y-4">
            {messages.map((m) => {
              const isBot = m.sender === 'bot';
              return (
                <div
                  key={m.id}
                  className={`flex gap-3 max-w-[85%] ${isBot ? 'mr-auto' : 'ml-auto flex-row-reverse'}`}
                >
                  {/* Round Avatar badge */}
                  <div className={`p-2.5 rounded-full shrink-0 flex items-center justify-center font-bold text-xs h-9 w-9 ${
                    isBot ? 'bg-academic-500 text-white' : 'bg-gray-100 text-gray-700'
                  }`}>
                    {isBot ? <Gavel size={16} /> : user.name[0]}
                  </div>

                  {/* Message Bubble box */}
                  <div className="space-y-1">
                    <div className={`rounded-lg px-4 py-3 text-sm leading-relaxed ${
                      isBot 
                        ? 'bg-academic-50 text-gray-800 rounded-tl-none border border-academic-100/30' 
                        : 'bg-academic-500 text-white rounded-tr-none'
                    }`}>
                      <p className="whitespace-pre-line">{m.text}</p>
                    </div>

                  </div>
                </div>
              );
            })}

            {isTyping && (
              <div className="flex gap-3 max-w-[80%] mr-auto items-center">
                <div className="p-2 bg-academic-500 text-white rounded-full shrink-0 animate-bounce">
                  <Gavel size={14} />
                </div>
                <div className="bg-academic-50 text-xs text-gray-400 px-4 py-2 rounded-lg font-mono">
                  Socrates reflexionando argumentos...
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Chat Form panel */}
          <form onSubmit={handleSendMessage} className="p-3 bg-gray-50 border-t border-gray-100 flex gap-2">
            <input
              type="text"
              placeholder="Escribe tu argumento jurídico aquí..."
              className="flex-grow px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-academic-500 text-sm text-gray-905"
              autoFocus
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              disabled={isTyping}
            />
            <button
              type="submit"
              className={`p-2 px-3.5 bg-academic-500 text-white rounded-md text-xs font-semibold cursor-pointer shrink-0 transition-colors ${
                (isTyping || !inputText.trim()) ? 'bg-academic-400 cursor-not-allowed' : 'hover:bg-academic-600'
              }`}
              disabled={isTyping || !inputText.trim()}
            >
              <Send size={14} />
            </button>
          </form>
        </div>

        {/* Right Side: Interactive Ficha (Case Summary Sheet) */}
        <div className="lg:col-span-5 flex flex-col h-[78vh] bg-white rounded-2xl shadow-md border border-gray-150/70 overflow-hidden">
          {/* Header of summary sheet */}
          <div className="bg-academic-900 text-white p-4 font-serif relative">
            <span className="text-[10px] bg-academic-500 text-white px-2 py-0.5 rounded font-mono uppercase font-bold tracking-wider">
              INFORME DIGITAL DE SÍNTESIS
            </span>
            <h3 className="text-lg font-bold mt-1">Evolución del Análisis Jurídico</h3>
            <p className="text-xs text-academic-200 mt-0.5">Se actualiza automáticamente al dominar cada fase socrática.</p>
          </div>

          {/* Phase completion stepper display */}
          <div className="bg-academic-50 border-b border-gray-100 px-4 py-3">
            <div className="flex justify-between items-center text-[10px] mb-2 font-mono text-gray-400">
              <span>Hito Académico Socrático:</span>
              <span className="text-academic-500 font-bold">FASE {ficha.currentPhaseIndex} de {caseData.socraticPhases.length}</span>
            </div>
            
            {/* Horizontal progress markers */}
            <div className="flex items-center gap-1.5">
              {caseData.socraticPhases.map((phase, idx) => {
                const isActive = ficha.currentPhaseIndex === idx;
                const isCompleted = ficha.currentPhaseIndex > idx;
                return (
                  <React.Fragment key={phase.name}>
                    {idx > 0 && <div className={`flex-grow h-0.5 ${isCompleted ? 'bg-emerald-500' : 'bg-gray-200'}`} />}
                    <div 
                      className={`h-4 w-4 rounded-full flex items-center justify-center text-[8px] font-bold ${
                        isCompleted 
                          ? 'bg-emerald-500 text-white' 
                          : isActive 
                            ? 'bg-academic-500 text-white ring-4 ring-academic-150 animate-pulse' 
                            : 'bg-gray-200 text-gray-400'
                      }`}
                      title={phase.name}
                    >
                      {isCompleted ? '✓' : idx + 1}
                    </div>
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          {/* Summary Sheet Body */}
          <div id="printable-summary-sheet" className="flex-grow p-4 py-5 overflow-y-auto space-y-5 bg-academic-50/20">
            {/* Header detail inside sheet for PDF preview parity */}
            <div className="border-b border-academic-200 pb-2.5">
              <h4 className="font-serif text-sm font-bold text-academic-500 tracking-tight uppercase">Modelo de ficha de jurisprudencia</h4>
              <p className="text-[10px] font-mono text-gray-400">Tutor: CONSTI-BOT | Cátedra Derecho Constitucional C | Estudiante: {user.name}</p>
            </div>

            {/* NOMBRE DEL FALLO */}
            <div className="bg-white p-3 rounded border border-gray-150 shadow-3xs">
              <span className="text-[9px] text-gray-400 font-mono block mb-1">NOMBRE DEL FALLO</span>
              <input 
                type="text"
                value={ficha.nombreDelFallo && ficha.nombreDelFallo !== '—' ? ficha.nombreDelFallo : caseData.title} 
                onChange={(e) => handleFichaChange('nombreDelFallo', e.target.value)}
                className="w-full text-xs font-semibold text-gray-800 focus:outline-none focus:border-b focus:border-academic-500 bg-transparent"
              />
            </div>

            {/* Fallos & Año */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white p-3 rounded border border-gray-150 shadow-3xs">
                <span className="text-[9px] text-gray-400 font-mono block mb-1">FALLOS</span>
                <input 
                  type="text"
                  value={ficha.fallos || ''} 
                  onChange={(e) => handleFichaChange('fallos', e.target.value)}
                  className="w-full text-xs font-semibold text-gray-800 focus:outline-none focus:border-b focus:border-academic-500 bg-transparent"
                  placeholder="Ej: Fallos: 306:400"
                />
              </div>
              <div className="bg-white p-3 rounded border border-gray-150 shadow-3xs">
                <span className="text-[9px] text-gray-400 font-mono block mb-1">AÑO</span>
                <input 
                  type="text"
                  value={ficha.ano && ficha.ano !== '—' ? ficha.ano : caseData.year} 
                  onChange={(e) => handleFichaChange('ano', e.target.value)}
                  className="w-full text-xs font-semibold text-gray-800 focus:outline-none focus:border-b focus:border-academic-500 bg-transparent"
                />
              </div>
            </div>

            {/* Hechos */}
            <div className="bg-white p-3.5 rounded border border-gray-150 shadow-3xs">
              <span className="text-[9px] text-gray-400 font-mono block mb-1">HECHOS</span>
              <textarea 
                value={ficha.hechos || ''} 
                onChange={(e) => handleFichaChange('hechos', e.target.value)}
                className="w-full text-xs text-gray-800 leading-relaxed font-normal focus:outline-none resize-none bg-transparent"
                rows={4}
                placeholder="Redactá los hechos aquí..."
              />
            </div>

            {/* Cuestiones presentadas */}
            <div className="bg-white p-3.5 rounded border border-gray-150 shadow-3xs">
              <span className="text-[9px] text-gray-400 font-mono block mb-1">CUESTIONES PRESENTADAS</span>
              <textarea 
                value={ficha.cuestionesPresentadas || ''} 
                onChange={(e) => handleFichaChange('cuestionesPresentadas', e.target.value)}
                className="w-full text-xs text-gray-800 leading-relaxed font-normal focus:outline-none resize-none bg-transparent"
                rows={3}
                placeholder="¿Qué se debate?"
              />
            </div>

            {/* Primera y Segunda Instancia */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-white p-3 rounded border border-gray-150 shadow-3xs">
                <span className="text-[9px] text-gray-400 font-mono block mb-1">PRIMERA INSTANCIA</span>
                <textarea 
                  value={ficha.primeraInstancia || ''} 
                  onChange={(e) => handleFichaChange('primeraInstancia', e.target.value)}
                  className="w-full text-xs font-semibold text-gray-800 focus:outline-none resize-none bg-transparent"
                  rows={2}
                  placeholder="Resolución primera instancia..."
                />
              </div>
              <div className="bg-white p-3 rounded border border-gray-150 shadow-3xs">
                <span className="text-[9px] text-gray-400 font-mono block mb-1">SEGUNDA INSTANCIA</span>
                <textarea 
                  value={ficha.segundaInstancia || ''} 
                  onChange={(e) => handleFichaChange('segundaInstancia', e.target.value)}
                  className="w-full text-xs font-semibold text-gray-800 focus:outline-none resize-none bg-transparent"
                  rows={2}
                  placeholder="Resolución segunda instancia..."
                />
              </div>
            </div>

            {/* Tipo de jurisdicción invocada */}
            <div className="bg-white p-3.5 rounded border border-gray-150 shadow-3xs">
              <span className="text-[9px] text-gray-400 font-mono block mb-1">TIPO DE JURISDICCIÓN INVOCADA PARA ACCEDER A LA CORTE SUPREMA</span>
              <textarea 
                value={ficha.tipoJurisdiccionInvocada || ''} 
                onChange={(e) => handleFichaChange('tipoJurisdiccionInvocada', e.target.value)}
                className="w-full text-xs text-gray-800 leading-relaxed font-normal focus:outline-none resize-none bg-transparent"
                rows={2}
                placeholder="Ej: Recurso Extraordinario Federal..."
              />
            </div>

            {/* Opinión del Procurador General */}
            <div className="bg-white p-4.5 rounded border border-gray-150 shadow-3xs border-l-4 border-academic-300 space-y-3">
              <span className="text-[10px] text-academic-700 font-bold font-sans uppercase tracking-wider block">OPINIÓN DEL PROCURADOR GENERAL</span>
              <div className="pl-2 border-l border-gray-200 space-y-2">
                <div>
                  <span className="text-[8.5px] text-gray-400 font-mono block uppercase mb-1">Principios elaborados</span>
                  <textarea 
                    value={ficha.procuradorGeneral_principios || ''} 
                    onChange={(e) => handleFichaChange('procuradorGeneral_principios', e.target.value)}
                    className="w-full text-xs text-gray-800 font-medium leading-relaxed focus:outline-none resize-none bg-transparent"
                    rows={2}
                  />
                </div>
                <div>
                  <span className="text-[8.5px] text-gray-400 font-mono block uppercase mb-1">Razonamiento</span>
                  <textarea 
                    value={ficha.procuradorGeneral_razonamiento || ''} 
                    onChange={(e) => handleFichaChange('procuradorGeneral_razonamiento', e.target.value)}
                    className="w-full text-xs text-gray-800 leading-relaxed focus:outline-none resize-none bg-transparent"
                    rows={3}
                  />
                </div>
              </div>
            </div>

            {/* Decisión de la Corte Suprema */}
            <div className="bg-white p-4.5 rounded border border-gray-150 shadow-3xs border-l-4 border-academic-500 space-y-3">
              <span className="text-[10px] text-academic-900 font-bold font-sans uppercase tracking-wider block">DECISIÓN DE LA CORTE SUPREMA</span>
              <div className="pl-2 border-l border-gray-200 space-y-2">
                <div>
                  <span className="text-[8.5px] text-gray-400 font-mono block uppercase mb-1">Principios elaborados</span>
                  <textarea 
                    value={ficha.decisionCorte_principios || ''} 
                    onChange={(e) => handleFichaChange('decisionCorte_principios', e.target.value)}
                    className="w-full text-xs text-gray-800 font-medium leading-relaxed focus:outline-none resize-none bg-transparent"
                    rows={2}
                  />
                </div>
                <div>
                  <span className="text-[8.5px] text-gray-400 font-mono block uppercase mb-1">Razonamiento</span>
                  <textarea 
                    value={ficha.decisionCorte_razonamiento || ''} 
                    onChange={(e) => handleFichaChange('decisionCorte_razonamiento', e.target.value)}
                    className="w-full text-xs text-gray-800 leading-relaxed focus:outline-none resize-none bg-transparent"
                    rows={3}
                  />
                </div>
              </div>
            </div>

            {/* Disidencia o concurrencia */}
            <div className="bg-white p-4.5 rounded border border-gray-150 shadow-3xs border-l-4 border-gray-400 space-y-3">
              <span className="text-[10px] text-gray-600 font-bold font-sans uppercase tracking-wider block">DISIDENCIA O CONCURRENCIA</span>
              <div className="pl-2 border-l border-gray-200 space-y-2">
                <div>
                  <span className="text-[8.5px] text-gray-400 font-mono block uppercase mb-1">Principios elaborados</span>
                  <textarea 
                    value={ficha.disidenciaConcurrencia_principios || ''} 
                    onChange={(e) => handleFichaChange('disidenciaConcurrencia_principios', e.target.value)}
                    className="w-full text-xs text-gray-800 font-medium leading-relaxed focus:outline-none resize-none bg-transparent"
                    rows={2}
                  />
                </div>
                <div>
                  <span className="text-[8.5px] text-gray-400 font-mono block uppercase mb-1">Razonamiento</span>
                  <textarea 
                    value={ficha.disidenciaConcurrencia_razonamiento || ''} 
                    onChange={(e) => handleFichaChange('disidenciaConcurrencia_razonamiento', e.target.value)}
                    className="w-full text-xs text-gray-800 leading-relaxed focus:outline-none resize-none bg-transparent"
                    rows={3}
                  />
                </div>
              </div>
            </div>

            {/* Obiter dictum */}
            <div className="bg-white p-3.5 rounded border border-gray-150 shadow-3xs">
              <span className="text-[9px] text-gray-400 font-mono block mb-1">OBITER DICTUM SIGNIFICATIVO</span>
              <textarea 
                value={ficha.obiterDictumSignificativo || ''} 
                onChange={(e) => handleFichaChange('obiterDictumSignificativo', e.target.value)}
                className="w-full text-xs text-gray-800 italic leading-relaxed font-medium focus:outline-none resize-none bg-transparent"
                rows={3}
              />
            </div>
          </div>

          {/* Helper panel to help student learn if stuck */}
          <div className="bg-academic-50 p-3 border-t border-gray-100 flex gap-2 items-start justify-between">
            <div className="flex gap-2 items-start">
              <HelpCircle className="text-academic-500 shrink-0 mt-0.5" size={16} />
              <div className="text-[10px] text-gray-500">
                <span className="font-semibold text-academic-900 block">¿Te trabaste con la pregunta socrática?</span>
                <span className="italic block mt-0.5">"${caseData.socraticPhases[ficha.currentPhaseIndex]?.hint || '¡Análisis finalizado exitosamente!'}"</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
