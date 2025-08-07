import React from 'react';
import { getLevelStats } from '../utils/storage';

const StatsModal = ({ isOpen, onClose, levelId, levelName }) => {
  if (!isOpen) return null;

  const stats = getLevelStats(levelId);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getDifficultyLevel = (avgScore) => {
    if (avgScore >= 90) return 'Fácil';
    if (avgScore >= 70) return 'Medio';
    if (avgScore >= 50) return 'Difícil';
    return 'Muy Difícil';
  };

  if (stats.totalAttempts === 0) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-2xl max-w-md w-full animate-fadeIn">
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-800">📊 Estadísticas de {levelName}</h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
              >
                ×
              </button>
            </div>
            <div className="text-center py-8">
              <div className="text-6xl mb-4">📈</div>
              <p className="text-gray-600">No hay estadísticas disponibles para este nivel.</p>
              <p className="text-sm text-gray-500 mt-2">Completa el nivel para ver tus estadísticas.</p>
            </div>
            <div className="flex justify-end">
              <button
                onClick={onClose}
                className="btn btn-gray"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-fadeIn">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-800">📊 Estadísticas de {levelName}</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
            >
              ×
            </button>
          </div>

          {/* Resumen de estadísticas */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="stat-card">
              <div className="stat-value">{stats.totalAttempts}</div>
              <div className="stat-label">Intentos</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stats.bestScore.toFixed(1)}%</div>
              <div className="stat-label">Mejor Puntaje</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stats.averageScore.toFixed(1)}%</div>
              <div className="stat-label">Promedio</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{formatTime(stats.averageTime)}</div>
              <div className="stat-label">Tiempo Promedio</div>
            </div>
          </div>

          {/* Último intento */}
          {stats.lastAttempt && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h3 className="text-lg font-semibold text-blue-800 mb-3">🕐 Último Intento</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <div className="text-sm text-blue-600">Puntaje</div>
                  <div className="text-lg font-semibold text-blue-800">{stats.lastAttempt.score.toFixed(1)}%</div>
                </div>
                <div>
                  <div className="text-sm text-blue-600">Tiempo</div>
                  <div className="text-lg font-semibold text-blue-800">{formatTime(stats.lastAttempt.time)}</div>
                </div>
                <div>
                  <div className="text-sm text-blue-600">Fecha</div>
                  <div className="text-lg font-semibold text-blue-800">{formatDate(stats.lastAttempt.timestamp)}</div>
                </div>
              </div>
            </div>
          )}

          {/* Resumen adicional */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">📋 Resumen</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Tiempo total invertido:</span>
                <span className="font-semibold">{formatTime(stats.totalTime)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Mejora desde el primer intento:</span>
                <span className="font-semibold">
                  {stats.improvement ? `${stats.improvement.toFixed(1)}%` : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Nivel de dificultad percibida:</span>
                <span className="font-semibold">{getDifficultyLevel(stats.averageScore)}</span>
              </div>
            </div>
          </div>

          <div className="flex justify-end mt-6">
            <button
              onClick={onClose}
              className="btn btn-gray"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatsModal; 