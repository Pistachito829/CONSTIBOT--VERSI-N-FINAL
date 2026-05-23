/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { Search, BookOpen, CheckCircle, Clock, ArrowRight, Gavel, FileText, Info } from 'lucide-react';
import { db } from '../db';
import { FalloCase, UserProfile } from '../types';

interface StudentDashboardProps {
  user: UserProfile;
  onSelectCase: (caseId: string) => void;
  onLogout: () => void;
}

export function StudentDashboard({ user, onSelectCase, onLogout }: StudentDashboardProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'completed' | 'pending'>('all');

  // Load cases from base/dynamic database
  const cases = useMemo(() => db.getCases(), []);

  // Map case ID to progress/fichas
  const caseProgressDetails = useMemo(() => {
    return cases.map(c => {
      const ficha = db.getFichaForStudent(user.username, c.id);
      return {
        ...c,
        completed: ficha.completed,
        phaseIndex: ficha.currentPhaseIndex,
        totalPhases: c.socraticPhases.length,
        progressPercent: ficha.completed 
          ? 100 
          : Math.round((ficha.currentPhaseIndex / c.socraticPhases.length) * 100)
      };
    });
  }, [cases, user.username]);

  // Combined Searching and Filtering
  const filteredCases = useMemo(() => {
    return caseProgressDetails.filter(c => {
      const matchesSearch = 
        c.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
        c.theme.toLowerCase().includes(searchQuery.toLowerCase()) || 
        c.summary.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      if (filterType === 'completed') return c.completed;
      if (filterType === 'pending') return !c.completed;
      return true;
    });
  }, [caseProgressDetails, searchQuery, filterType]);

  return (
    <div className="min-h-screen bg-academic-50 flex flex-col">
      {/* Top Bar Navigation */}
      <header className="bg-academic-500 text-white shadow-lg border-b border-academic-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4.5 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 py-1 bg-white rounded shadow-sm text-academic-500 font-serif font-bold text-lg tracking-tighter border border-academic-100/50">
              C│B
            </div>
            <h1 className="font-serif text-2xl font-bold tracking-tight text-white">CONSTI-BOT</h1>
          </div>
          <div className="flex items-center gap-5">
            <div className="text-right hidden sm:block">
              <p className="text-[9px] text-academic-300 font-bold font-mono tracking-wider">PORTAL ESTUDIANTE</p>
              <p className="text-sm font-semibold text-white">{user.name}</p>
            </div>
            <button
              onClick={onLogout}
              className="px-4 py-2 border border-academic-300/85 hover:border-white rounded-lg text-xs font-semibold bg-academic-600 hover:bg-white hover:text-academic-500 transition-all duration-200 cursor-pointer shadow-3xs"
            >
              Cerrar Sesión
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Banner with Socratic Metodology Guidance */}
        <div className="bg-white rounded-2xl p-6 shadow-md border border-gray-150/70 mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-2xl">
            <h2 className="font-serif text-3xl font-bold text-academic-500 mb-2.5">
              Bienvenido a Derecho Constitucional C
            </h2>
            <p className="text-sm text-gray-600 leading-relaxed font-sans">
              La plataforma de <b>CONSTI-BOT</b> te guiará mediante el <b>Método Socrático estructurado</b> para analizar jurisprudencias clave. No te daremos las respuestas fáciles: nuestro bot interactivo formulará preguntas guiadas que pondrán a prueba tu análisis sobre los hechos, las garantías constitucionales y el filtro de razonabilidad (Art. 28 de la Constitución Nacional).
            </p>
          </div>
          <div className="flex gap-4.5 p-4.5 bg-academic-100 rounded-xl border border-academic-200/50 self-start md:self-auto items-center">
            <Info className="text-academic-500 shrink-0" size={24} />
            <div className="text-xs text-gray-800 font-medium font-sans">
              <p className="font-semibold">Legajo académico: <span className="font-mono bg-white text-academic-700 px-2 py-0.5 rounded-md border border-academic-200/40 shadow-3xs ml-1">{user.username}</span></p>
              <p className="mt-1 text-[11px] text-gray-500">Completa tus resúmenes para descargar el PDF certificado.</p>
            </div>
          </div>
        </div>

        {/* Filters and Search Panel */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          {/* Tabs */}
          <div className="flex p-1 bg-gray-200/60 rounded-xl justify-start self-start border border-gray-200/40">
            <button
              onClick={() => setFilterType('all')}
              className={`px-4 py-2 rounded-lg text-xs font-bold tracking-wide transition-all cursor-pointer ${
                filterType === 'all' ? 'bg-white shadow-sm text-academic-500' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Todos los Fallos
            </button>
            <button
              onClick={() => setFilterType('pending')}
              className={`px-4 py-2 rounded-lg text-xs font-bold tracking-wide transition-all cursor-pointer ${
                filterType === 'pending' ? 'bg-white shadow-sm text-academic-500' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Pendientes
            </button>
            <button
              onClick={() => setFilterType('completed')}
              className={`px-4 py-2 rounded-lg text-xs font-bold tracking-wide transition-all cursor-pointer ${
                filterType === 'completed' ? 'bg-white shadow-sm text-academic-500' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Completados
            </button>
          </div>

          {/* Search Box */}
          <div className="relative max-w-sm w-full">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <Search size={16} className="text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Buscar caso, tema o artículo..."
              className="block w-full pl-10 pr-4 py-2.5 bg-white border border-gray-300 rounded-xl shadow-3xs placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-academic-500/10 focus:border-academic-500 text-xs text-gray-900 font-medium transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Fallo Cases Grid */}
        {filteredCases.length === 0 ? (
          <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-16 text-center shadow-3xs">
            <BookOpen size={44} className="mx-auto text-gray-300 mb-4" />
            <h3 className="text-sm font-semibold text-gray-700">No se encontraron fallos</h3>
            <p className="text-xs text-gray-400 mt-1.5 max-w-xs mx-auto">
              Prueba modificando los filtros de búsqueda o consulta con tu docente titular.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCases.map((c, idx) => (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05, duration: 0.3 }}
                className="bg-white rounded-2xl border border-gray-150 shadow-md hover:shadow-lg transition-all duration-200 p-6 flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start gap-2 mb-3.5">
                    <span className="text-[9px] bg-academic-100 text-academic-700 border border-academic-200/50 font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                      {c.theme}
                    </span>
                    {c.completed ? (
                      <span className="inline-flex items-center gap-1.5 text-emerald-600 text-xs font-bold font-sans">
                        <CheckCircle size={13} className="fill-emerald-50 text-emerald-600" />
                        Completo
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-amber-500 text-xs font-bold font-sans">
                        <Clock size={13} />
                        En Curso
                      </span>
                    )}
                  </div>

                  <h3 className="font-serif text-xl font-bold text-gray-900 line-clamp-1 group-hover:text-academic-500 transition-colors">
                    {c.title}
                  </h3>
                  
                  <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-1.5 font-medium">
                    <Gavel size={12} className="text-academic-400" />
                    <span>{c.court} ({c.year})</span>
                  </div>

                  <p className="text-xs text-gray-500 mt-3.5 line-clamp-3 leading-relaxed">
                    {c.summary}
                  </p>
                </div>

                <div className="mt-6 border-t border-gray-100 pt-5">
                  {/* Progress bar inside cards */}
                  <div className="mb-4.5">
                    <div className="flex justify-between text-[10px] mb-1.5 font-sans font-medium text-gray-500">
                      <span>Progreso del diálogo socrático:</span>
                      <span className="text-academic-500 font-bold">{c.progressPercent}%</span>
                    </div>
                    <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                      <div 
                        className="bg-academic-500 h-full transition-all duration-300"
                        style={{ width: `${c.progressPercent}%` }}
                      ></div>
                    </div>
                  </div>

                  <button
                    onClick={() => onSelectCase(c.id)}
                    className="w-full py-2.5 bg-[#fcf9f8] text-academic-500 hover:bg-academic-500 hover:text-white transition-all duration-150 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border border-academic-200/60 hover:border-academic-500 cursor-pointer shadow-3xs hover:shadow-xs"
                  >
                    {c.completed ? 'Revisar Ficha Completa' : 'Iniciar Análisis Socrático'}
                    <ArrowRight size={14} />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
