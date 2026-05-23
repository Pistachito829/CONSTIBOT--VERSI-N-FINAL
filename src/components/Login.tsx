/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { GraduationCap, ArrowRight, ShieldCheck, HelpCircle, UserPlus, KeyRound, UserCheck } from 'lucide-react';
import { UserProfile } from '../types';

interface LoginProps {
  onLoginSuccess: (profile: UserProfile) => void;
}

export function Login({ onLoginSuccess }: LoginProps) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('123'); // Preset for easy evaluation
  const [confirmPassword, setConfirmPassword] = useState('123');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('Por favor ingrese su legajo y contraseña.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          password: password
        })
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle student not-activated state specially
        if (response.status === 403 && data.activationRequired) {
          setError('Este legajo está pre-autorizado en la cátedra pero aún no ha sido activado. Por favor, haga click abajo en "Activar mi Legajo académico".');
        } else {
          setError(data.error || 'Fallo de autenticación.');
        }
        setLoading(false);
        return;
      }

      setSuccess('Sesión iniciada con éxito. Redirigiendo...');
      setTimeout(() => {
        onLoginSuccess(data.profile);
      }, 800);

    } catch (err: any) {
      setError('Error de comunicación con el servidor. Intente de nuevo.');
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!username.trim() || !fullName.trim() || !password || !confirmPassword) {
      setError('Complete todos los campos requeridos para la activación.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas ingresadas no coinciden.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          name: fullName.trim(),
          password: password
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'No se pudo activar el legajo académico.');
        setLoading(false);
        return;
      }

      setSuccess('¡Legajo activado y registrado con éxito en la cátedra! Iniciando sesión...');
      setTimeout(() => {
        onLoginSuccess(data.profile);
      }, 1500);

    } catch (err: any) {
      setError('No se pudo establecer contacto con el servidor de autenticación.');
      setLoading(false);
    }
  };

  const loadDemoUser = (user: string) => {
    setUsername(user);
    setPassword('123');
    setConfirmPassword('123');
    setIsRegistering(false);
    setError('');
    setSuccess('');
  };

  return (
    <div className="min-h-screen bg-academic-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="sm:mx-auto sm:w-full sm:max-w-md text-center"
      >
        {/* Sleek C|B visual logo mark */}
        <div className="inline-flex items-center justify-center p-3 px-4 rounded-xl bg-academic-500 text-white shadow-md font-serif text-2xl font-bold tracking-tighter mb-4 border border-academic-600">
          C│B
        </div>
        <h2 className="font-serif text-4xl font-bold tracking-tight text-academic-500">
          CONSTI-BOT
        </h2>
        <p className="mt-2 text-sm text-gray-600 max-w-xs mx-auto font-sans leading-relaxed">
          Tutor Socrático Inteligente con RAG para la cátedra de Derecho Constitucional C
        </p>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1, duration: 0.4 }}
        className="mt-8 sm:mx-auto sm:w-full sm:max-w-md"
      >
        <div className="bg-white py-8 px-6 shadow-xl rounded-2xl border border-gray-150/60 sm:px-10">
          
          {/* Internal Navigation Tabs for Auth */}
          <div className="flex border-b border-gray-150 mb-6">
            <button
              onClick={() => { setIsRegistering(false); setError(''); setSuccess(''); }}
              className={`flex-1 pb-3 text-xs font-bold uppercase tracking-wider border-b-2 text-center transition-all cursor-pointer ${
                !isRegistering
                  ? 'border-academic-500 text-academic-600'
                  : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              Iniciar Sesión
            </button>
            <button
              onClick={() => { setIsRegistering(true); setError(''); setSuccess(''); }}
              className={`flex-1 pb-3 text-xs font-bold uppercase tracking-wider border-b-2 text-center transition-all cursor-pointer ${
                isRegistering
                  ? 'border-academic-500 text-academic-600'
                  : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              Activar mi Legajo
            </button>
          </div>

          {!isRegistering ? (
            /* --- LOGIN FORM --- */
            <form className="space-y-5" onSubmit={handleLoginSubmit}>
              <div>
                <label htmlFor="username" className="block text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Legajo / Usuario Académico
                </label>
                <div className="mt-1.5">
                  <input
                    id="username"
                    name="username"
                    type="text"
                    required
                    placeholder="Ej: ALU2024"
                    className="appearance-none block w-full px-3.5 py-2.5 border border-gray-300 rounded-lg shadow-2xs placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-academic-500/20 focus:border-academic-500 sm:text-xs text-gray-900 font-medium transition-all"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Contraseña
                </label>
                <div className="mt-1.5">
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    placeholder="••••••••"
                    className="appearance-none block w-full px-3.5 py-2.5 border border-gray-300 rounded-lg shadow-2xs placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-academic-500/20 focus:border-academic-500 sm:text-xs text-gray-900 font-mono transition-all"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>

              {error && (
                <div className="text-red-600 text-xs p-3 bg-red-50/80 rounded-lg border border-red-100 font-medium flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-red-500 rounded-full shrink-0"></span>
                  <span>{error}</span>
                </div>
              )}

              {success && (
                <div className="text-emerald-700 text-xs p-3 bg-emerald-50/80 rounded-lg border border-emerald-100 font-medium flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full shrink-0"></span>
                  <span>{success}</span>
                </div>
              )}

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-md text-xs font-bold uppercase tracking-wider text-white bg-academic-500 hover:bg-academic-650 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-academic-500 transition-all duration-200 cursor-pointer items-center gap-2 disabled:opacity-55 disabled:cursor-wait"
                >
                  {loading ? 'Identificando...' : 'Iniciar Sesión'}
                  {!loading && <ArrowRight size={14} />}
                </button>
              </div>
            </form>
          ) : (
            /* --- REGISTRATION / LEGADO ACTIVATION FORM --- */
            <form className="space-y-4" onSubmit={handleRegisterSubmit}>
              <div className="p-3 bg-academic-50 border border-academic-100/80 rounded-xl mb-4 text-[10.5px] text-academic-800 leading-relaxed font-medium flex gap-2">
                <UserCheck size={16} className="text-academic-500 shrink-0 mt-0.5" />
                <span>
                  <b>Ingresá tu legajo autorizado</b>. Verificaremos que figures en el padrón de matriculados antes de permitirte definir tu contraseña.
                </span>
              </div>

              <div>
                <label htmlFor="reg-username" className="block text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Legajo de Alumno (Autorizado)
                </label>
                <div className="mt-1.5">
                  <input
                    id="reg-username"
                    name="username"
                    type="text"
                    required
                    placeholder="Ej: ALU2024"
                    className="appearance-none block w-full px-3.5 py-2.5 border border-gray-300 rounded-lg shadow-2xs placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-academic-500/20 focus:border-academic-500 sm:text-xs text-gray-900 font-bold uppercase tracking-wider transition-all"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="fullname" className="block text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Nombre Completo (Como figura en actas)
                </label>
                <div className="mt-1.5">
                  <input
                    id="fullname"
                    name="fullname"
                    type="text"
                    required
                    placeholder="Ej: Santiago Fernández"
                    className="appearance-none block w-full px-3.5 py-2.5 border border-gray-300 rounded-lg shadow-2xs placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-academic-500/20 focus:border-academic-500 sm:text-xs text-gray-900 font-medium transition-all"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="reg-password" className="block text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Definir Contraseña Segura
                </label>
                <div className="mt-1.5">
                  <input
                    id="reg-password"
                    name="password"
                    type="password"
                    required
                    placeholder="Escriba su contraseña"
                    className="appearance-none block w-full px-3.5 py-2.5 border border-gray-300 rounded-lg shadow-2xs placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-academic-500/20 focus:border-academic-500 sm:text-xs text-gray-900 font-mono transition-all"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="confirm" className="block text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Confirmar Contraseña
                </label>
                <div className="mt-1.5">
                  <input
                    id="confirm"
                    name="confirm"
                    type="password"
                    required
                    placeholder="Repita su contraseña"
                    className="appearance-none block w-full px-3.5 py-2.5 border border-gray-300 rounded-lg shadow-2xs placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-academic-500/20 focus:border-academic-500 sm:text-xs text-gray-900 font-mono transition-all"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
              </div>

              {error && (
                <div className="text-red-600 text-xs p-3 bg-red-50/80 rounded-lg border border-red-100 font-medium flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-red-500 rounded-full shrink-0"></span>
                  <span>{error}</span>
                </div>
              )}

              {success && (
                <div className="text-emerald-700 text-xs p-3 bg-emerald-50/80 rounded-lg border border-emerald-100 font-medium flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full shrink-0"></span>
                  <span>{success}</span>
                </div>
              )}

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-md text-xs font-bold uppercase tracking-wider text-white bg-emerald-600 hover:bg-emerald-750 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-550 transition-all duration-200 cursor-pointer items-center gap-2 disabled:opacity-55"
                >
                  {loading ? 'Verificando en Padrón...' : 'Activar mi Cuenta'}
                  {!loading && <UserPlus size={14} />}
                </button>
              </div>
            </form>
          )}

          {/* Quick tester access boxes */}
          <div className="mt-8 border-t border-gray-150/80 pt-6">
            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center mb-4">
              Cuentas de Demostración para Evaluación
            </h3>
            
            <div className="bg-amber-50 border border-amber-200/60 rounded-xl p-3 mb-4 text-[10px] text-amber-800 leading-relaxed font-semibold">
              Nota: El sistema simula la validación restrictiva. Podés activar un legajo nuevo como <b>ALU2024</b> (estudiante pre-autorizado sin contraseña) o bien ingresar como docente ya activo <b>DOC101</b> (con clave "123").
            </div>

            <div className="space-y-2.5">
              <button
                type="button"
                onClick={() => loadDemoUser('ALU2024')}
                className="w-full flex items-center justify-between p-3 bg-[#fcf9f8] hover:bg-academic-100 rounded-xl text-left border border-academic-200/50 hover:border-academic-300 transition-all cursor-pointer shadow-3xs"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-academic-200 text-academic-700 rounded-lg">
                    <GraduationCap size={16} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-900">Santiago Fernández</p>
                    <p className="text-[10px] text-gray-500 font-medium">Estado: Pre-autorizado sin contraseña</p>
                  </div>
                </div>
                <span className="text-[9px] bg-sky-500 text-white px-2 py-0.5 rounded-md font-mono font-bold uppercase tracking-wider shadow-3xs">
                  ALU2024
                </span>
              </button>

              <button
                type="button"
                onClick={() => loadDemoUser('DOC101')}
                className="w-full flex items-center justify-between p-3 bg-emerald-50/50 hover:bg-emerald-100/40 rounded-xl text-left border border-emerald-200/50 hover:border-emerald-300 transition-all cursor-pointer shadow-3xs"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-100 text-emerald-800 rounded-lg">
                    <ShieldCheck size={16} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-900">Dra. Elena Bianchi</p>
                    <p className="text-[10px] text-emerald-700 font-medium">Estado: Docente Consolidado Activo</p>
                  </div>
                </div>
                <span className="text-[9px] bg-emerald-600 text-white px-2 py-0.5 rounded-md font-mono font-bold uppercase tracking-wider shadow-3xs">
                  DOC101
                </span>
              </button>
            </div>
            
            <div className="flex justify-center gap-2 mt-5 text-[10px] text-gray-400 font-medium items-center">
              <HelpCircle size={12} className="text-gray-300" />
              <span>Contraseña inicial para docente o local: <b className="text-gray-500">123</b></span>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
