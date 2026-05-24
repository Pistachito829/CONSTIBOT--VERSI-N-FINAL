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
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('123'); // Preset for easy evaluation
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
          setError('Este legajo está pre-autorizado pero aún no ha sido activado. Por favor, consulte con su docente para que active su cuenta.');
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
          Tutor Socrático Inteligente para la cátedra de Derecho Constitucional C
        </p>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1, duration: 0.4 }}
        className="mt-8 sm:mx-auto sm:w-full sm:max-w-md"
      >
        <div className="bg-white py-8 px-6 shadow-xl rounded-2xl border border-gray-150/60 sm:px-10">
          
          {/* --- LOGIN FORM --- */}
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
        </div>
      </motion.div>
    </div>
  );
}
