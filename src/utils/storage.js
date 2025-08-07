// Utilidades para el almacenamiento local
export const STORAGE_KEYS = {
  LEVELS: 'hablanLevels',
  EXERCISES: 'hablanExercises',
  ATTEMPTS: 'hablanAttempts'
};

// Función para cargar datos del localStorage
export const loadFromStorage = (key) => {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error(`Error cargando datos de ${key}:`, error);
    return null;
  }
};

// Función para guardar datos en localStorage
export const saveToStorage = (key, data) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error(`Error guardando datos en ${key}:`, error);
    return false;
  }
};

// Función para cargar todos los datos
export const loadAllData = () => {
  const levels = loadFromStorage(STORAGE_KEYS.LEVELS) || [];
  const exercises = loadFromStorage(STORAGE_KEYS.EXERCISES) || [];
  const attempts = loadFromStorage(STORAGE_KEYS.ATTEMPTS) || {};
  
  return { levels, exercises, attempts };
};

// Función para guardar un intento de nivel
export const saveAttempt = (levelId, attemptData) => {
  const attempts = loadFromStorage(STORAGE_KEYS.ATTEMPTS) || {};
  
  if (!attempts[levelId]) {
    attempts[levelId] = [];
  }
  
  attempts[levelId].push({
    id: Date.now(),
    timestamp: new Date().toISOString(),
    ...attemptData
  });
  
  return saveToStorage(STORAGE_KEYS.ATTEMPTS, attempts);
};

// Función para obtener estadísticas de un nivel
export const getLevelStats = (levelId) => {
  const attempts = loadFromStorage(STORAGE_KEYS.ATTEMPTS) || {};
  const levelAttempts = attempts[levelId] || [];
  
  if (levelAttempts.length === 0) {
    return {
      totalAttempts: 0,
      bestScore: 0,
      averageScore: 0,
      totalTime: 0,
      averageTime: 0,
      lastAttempt: null
    };
  }
  
  const scores = levelAttempts.map(attempt => attempt.score);
  const times = levelAttempts.map(attempt => attempt.time);
  
  return {
    totalAttempts: levelAttempts.length,
    bestScore: Math.max(...scores),
    averageScore: scores.reduce((a, b) => a + b, 0) / scores.length,
    totalTime: times.reduce((a, b) => a + b, 0),
    averageTime: times.reduce((a, b) => a + b, 0) / times.length,
    lastAttempt: levelAttempts[levelAttempts.length - 1]
  };
};

// Función para verificar si un ejercicio está en uso
export const isExerciseInUse = (exerciseId) => {
  const levels = loadFromStorage(STORAGE_KEYS.LEVELS) || [];
  return levels.some(level => level.exercises.includes(exerciseId));
};

// Función para obtener niveles que usan un ejercicio
export const getLevelsUsingExercise = (exerciseId) => {
  const levels = loadFromStorage(STORAGE_KEYS.LEVELS) || [];
  return levels.filter(level => level.exercises.includes(exerciseId));
};

// Función para limpiar todos los datos (útil para desarrollo)
export const clearAllData = () => {
  try {
    localStorage.removeItem(STORAGE_KEYS.LEVELS);
    localStorage.removeItem(STORAGE_KEYS.EXERCISES);
    localStorage.removeItem(STORAGE_KEYS.ATTEMPTS);
    return true;
  } catch (error) {
    console.error('Error limpiando localStorage:', error);
    return false;
  }
}; 