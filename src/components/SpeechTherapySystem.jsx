import React, { useState, useEffect } from 'react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { loadAllData, saveToStorage, saveAttempt, isExerciseInUse, getLevelsUsingExercise, STORAGE_KEYS } from '../utils/storage';
import StatsModal from './StatsModal';
import DeleteConfirmation from './DeleteConfirmation';

const SpeechTherapySystem = () => {
  const [currentView, setCurrentView] = useState('levels');
  const [levels, setLevels] = useState([]);
  const [exercises, setExercises] = useState([]);
  const [currentLevel, setCurrentLevel] = useState(null);
  const [selectedLevelFilter, setSelectedLevelFilter] = useState('all');
  const [activeAccordion, setActiveAccordion] = useState(null); // 'levels', 'exercises' o null

  // Función para manejar el toggle del acordeón
  const toggleAccordion = (section) => {
    console.log('Toggle accordion:', section, 'Current:', activeAccordion);
    setActiveAccordion(activeAccordion === section ? null : section);
  };
  
  // Nuevos estados para funcionalidades adicionales
  const [levelStartTime, setLevelStartTime] = useState(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [statsModal, setStatsModal] = useState({
    isOpen: false,
    levelId: null,
    levelName: ''
  });
  const [deleteDialog, setDeleteDialog] = useState({
    isOpen: false,
    type: null,
    item: null,
    message: '',
    warningMessage: ''
  });
  
  const [levelForm, setLevelForm] = useState({
    name: '',
    description: '',
    requiredPercentage: 70,
    prerequisiteLevel: null, // Nuevo campo para prerequisito
    isRestricted: false // Nuevo campo para indicar si tiene restricciones
  });

  const [exerciseForm, setExerciseForm] = useState({
    name: '',
    description: '',
    images: [''],
    options: ['', ''],
    correctAnswers: [],
    assignedLevels: []
  });

  // Estados para edición
  const [editingLevel, setEditingLevel] = useState(null);
  const [editingExercise, setEditingExercise] = useState(null);

  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState([]);
  const [results, setResults] = useState([]);
  const [showResult, setShowResult] = useState(false);
  const [levelCompleted, setLevelCompleted] = useState(null);

  // Cargar datos del localStorage al iniciar
  useEffect(() => {
    const { levels: savedLevels, exercises: savedExercises } = loadAllData();
    setLevels(savedLevels);
    setExercises(savedExercises);
  }, []);

  // Guardar datos en localStorage cuando cambien
  useEffect(() => {
    if (levels.length > 0) {
      saveToStorage(STORAGE_KEYS.LEVELS, levels);
    }
  }, [levels]);

  useEffect(() => {
    if (exercises.length > 0) {
      saveToStorage(STORAGE_KEYS.EXERCISES, exercises);
    }
  }, [exercises]);

  // Timer para el nivel actual
  useEffect(() => {
    let interval;
    if (levelStartTime && currentView === 'playLevel') {
      interval = setInterval(() => {
        setCurrentTime(Math.floor((Date.now() - levelStartTime) / 1000));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [levelStartTime, currentView]);

  // Función para verificar si un nivel está disponible
  const isLevelAvailable = (level) => {
    if (!level.isRestricted || !level.prerequisiteLevel) {
      return true; // Sin restricciones
    }
    
    const prerequisiteLevel = levels.find(l => l.id === level.prerequisiteLevel);
    return prerequisiteLevel && prerequisiteLevel.completed;
  };

  // Función para obtener ejercicios filtrados por nivel
  const getFilteredExercises = () => {
    if (selectedLevelFilter === 'all') {
      return exercises;
    }
    if (selectedLevelFilter === 'unassigned') {
      return exercises.filter(exercise => 
        !levels.some(level => level.exercises.includes(exercise.id))
      );
    }
    
    const selectedLevel = levels.find(level => level.id === parseInt(selectedLevelFilter));
    if (selectedLevel) {
      return exercises.filter(exercise => selectedLevel.exercises.includes(exercise.id));
    }
    
    return exercises;
  };

  const handleCreateLevel = () => {
    if (!levelForm.name.trim()) return;
    
    if (editingLevel) {
      // Editar nivel existente
      setLevels(levels.map(level => 
        level.id === editingLevel.id 
          ? {
              ...level,
              name: levelForm.name,
              description: levelForm.description,
              requiredPercentage: levelForm.requiredPercentage,
              prerequisiteLevel: levelForm.prerequisiteLevel,
              isRestricted: levelForm.isRestricted
            }
          : level
      ));
      toast.success(`Nivel "${levelForm.name}" actualizado exitosamente! 🎉`);
    } else {
      // Crear nuevo nivel
      const newLevel = {
        id: Date.now(),
        name: levelForm.name,
        description: levelForm.description,
        requiredPercentage: levelForm.requiredPercentage,
        prerequisiteLevel: levelForm.prerequisiteLevel,
        isRestricted: levelForm.isRestricted,
        exercises: [],
        progress: 0,
        completed: false
      };
      
      setLevels([...levels, newLevel]);
      toast.success(`Nivel "${levelForm.name}" creado exitosamente! 🎉`);
    }
    
    // Limpiar formulario y estados
    setLevelForm({
      name: '',
      description: '',
      requiredPercentage: 70,
      prerequisiteLevel: null,
      isRestricted: false
    });
    setEditingLevel(null);
    setCurrentView('levels');
  };

  const handleCreateExercise = () => {
    if (!exerciseForm.name.trim() || exerciseForm.correctAnswers.length === 0) return;
    
    if (editingExercise) {
      // Editar ejercicio existente
      setExercises(exercises.map(exercise => 
        exercise.id === editingExercise.id 
          ? {
              ...exercise,
              name: exerciseForm.name,
              description: exerciseForm.description,
              images: exerciseForm.images.filter(img => img.trim()),
              options: exerciseForm.options.filter(opt => opt.trim()),
              correctAnswers: exerciseForm.correctAnswers
            }
          : exercise
      ));
      toast.success(`Ejercicio "${exerciseForm.name}" actualizado exitosamente! ✏️`);
      
      // Actualizar asignaciones de niveles al editar
      setLevels(levels.map(level => {
        const shouldHaveExercise = exerciseForm.assignedLevels.includes(level.id);
        const currentlyHasExercise = level.exercises.includes(editingExercise.id);
        
        if (shouldHaveExercise && !currentlyHasExercise) {
          // Agregar ejercicio al nivel
          return {
            ...level,
            exercises: [...level.exercises, editingExercise.id]
          };
        } else if (!shouldHaveExercise && currentlyHasExercise) {
          // Quitar ejercicio del nivel
          return {
            ...level,
            exercises: level.exercises.filter(exId => exId !== editingExercise.id)
          };
        }
        return level;
      }));
    } else {
      // Crear nuevo ejercicio
      const newExercise = {
        id: Date.now(),
        name: exerciseForm.name,
        description: exerciseForm.description,
        images: exerciseForm.images.filter(img => img.trim()),
        options: exerciseForm.options.filter(opt => opt.trim()),
        correctAnswers: exerciseForm.correctAnswers
      };
      
      setExercises([...exercises, newExercise]);
      toast.success(`Ejercicio "${exerciseForm.name}" creado exitosamente! 🎯`);
      
      // Asignar automáticamente a los niveles seleccionados
      if (exerciseForm.assignedLevels.length > 0) {
        setLevels(levels.map(level => {
          if (exerciseForm.assignedLevels.includes(level.id)) {
            return {
              ...level,
              exercises: [...level.exercises, newExercise.id]
            };
          }
          return level;
        }));
      }
    }
    
    // Limpiar formulario y estados
    setExerciseForm({
      name: '',
      description: '',
      images: [''],
      options: ['', ''],
      correctAnswers: [],
      assignedLevels: []
    });
    setEditingExercise(null);
    setCurrentView('levels');
  };

  const assignExerciseToLevel = (levelId, exerciseId) => {
    setLevels(levels.map(level => {
      if (level.id === levelId) {
        const exercises = level.exercises.includes(exerciseId) 
          ? level.exercises.filter(id => id !== exerciseId)
          : [...level.exercises, exerciseId];
        return { ...level, exercises };
      }
      return level;
    }));
  };

  // Funciones para eliminar niveles y ejercicios
  const handleDeleteLevel = (level) => {
    console.log('Solicitando eliminación de nivel:', level.name);
    setDeleteDialog({
      isOpen: true,
      type: 'level',
      item: level,
      message: `¿Estás seguro de que quieres eliminar el nivel "${level.name}"?`,
      warningMessage: 'Esta acción no se puede deshacer y se eliminarán todos los datos asociados.'
    });
  };

  const handleDeleteExercise = (exercise) => {
    console.log('Solicitando eliminación de ejercicio:', exercise.name);
    const levelsUsingExercise = levels.filter(level => level.exercises.includes(exercise.id));
    const warningMessage = levelsUsingExercise.length > 0 
      ? `Este ejercicio está siendo usado por ${levelsUsingExercise.length} nivel(es): ${levelsUsingExercise.map(l => l.name).join(', ')}. Se eliminará de todos los niveles.`
      : 'Esta acción no se puede deshacer.';

    setDeleteDialog({
      isOpen: true,
      type: 'exercise',
      item: exercise,
      message: `¿Estás seguro de que quieres eliminar el ejercicio "${exercise.name}"?`,
      warningMessage
    });
  };

  const confirmDelete = () => {
    if (deleteDialog.type === 'level') {
      const level = deleteDialog.item;
      // Eliminar el nivel
      setLevels(levels.filter(l => l.id !== level.id));
      
      // Nota: Los ejercicios NO se eliminan, solo se desasocia el nivel
      // Los ejercicios quedan disponibles para otros niveles
      console.log(`Nivel "${level.name}" eliminado. Ejercicios desasociados pero conservados.`);
      toast.success(`Nivel "${level.name}" eliminado exitosamente! 🗑️`);
      
    } else if (deleteDialog.type === 'exercise') {
      const exercise = deleteDialog.item;
      // Eliminar el ejercicio
      setExercises(exercises.filter(e => e.id !== exercise.id));
      
      // Remover el ejercicio de todos los niveles que lo contengan
      setLevels(levels.map(level => ({
        ...level,
        exercises: level.exercises.filter(exId => exId !== exercise.id)
      })));
      
      console.log(`Ejercicio "${exercise.name}" eliminado y desasociado de todos los niveles.`);
      toast.success(`Ejercicio "${exercise.name}" eliminado exitosamente! 🗑️`);
    }
    
    // Cerrar el diálogo
    setDeleteDialog({ isOpen: false, type: null, item: null, message: '', warningMessage: '' });
  };

  // Funciones para editar niveles y ejercicios
  const editLevel = (level) => {
    setLevelForm({
      name: level.name,
      description: level.description,
      requiredPercentage: level.requiredPercentage,
      isRestricted: level.isRestricted,
      prerequisiteLevel: level.prerequisiteLevel || '',
      exercises: level.exercises
    });
    setEditingLevel(level);
    setCurrentView('createLevel');
  };

  const editExercise = (exercise) => {
    // Encontrar los niveles donde está asignado este ejercicio
    const assignedLevelIds = levels
      .filter(level => level.exercises.includes(exercise.id))
      .map(level => level.id);
    
    setExerciseForm({
      name: exercise.name,
      description: exercise.description,
      images: exercise.images.length > 0 ? exercise.images : [''],
      options: exercise.options.length > 0 ? exercise.options : ['', ''],
      correctAnswers: exercise.correctAnswers,
      assignedLevels: assignedLevelIds
    });
    setEditingExercise(exercise);
    setCurrentView('createExercise');
  };

  const startLevel = (level) => {
    // Verificar si el nivel está disponible
    if (!isLevelAvailable(level)) {
      const prerequisiteLevel = levels.find(l => l.id === level.prerequisiteLevel);
      alert(`Para acceder a este nivel debes completar primero: ${prerequisiteLevel.name}`);
      return;
    }

    const levelExercises = exercises.filter(ex => level.exercises.includes(ex.id));
    if (levelExercises.length === 0) {
      alert('Este nivel no tiene ejercicios asignados');
      return;
    }
    
    setCurrentLevel(level);
    setCurrentExerciseIndex(0);
    setResults([]);
    setShowResult(false);
    setSelectedAnswers([]);
    setLevelCompleted(null);
    setLevelStartTime(Date.now());
    setCurrentTime(0);
    setCurrentView('playLevel');
  };

  const handleAnswerSelection = (answerIndex) => {
    setSelectedAnswers(prev => {
      if (prev.includes(answerIndex)) {
        return prev.filter(index => index !== answerIndex);
      } else {
        return [...prev, answerIndex];
      }
    });
  };

  const handleAnswer = () => {
    if (selectedAnswers.length === 0) return;
    
    const levelExercises = exercises.filter(ex => currentLevel.exercises.includes(ex.id));
    const exercise = levelExercises[currentExerciseIndex];
    
    // Verificar si todas las respuestas correctas están seleccionadas y no hay extras
    const allCorrectSelected = exercise.correctAnswers.every(answer => selectedAnswers.includes(answer));
    const noExtraSelected = selectedAnswers.every(answer => exercise.correctAnswers.includes(answer));
    const isCorrect = allCorrectSelected && noExtraSelected;
    
    const newResult = { 
      exerciseId: exercise.id, 
      correct: isCorrect, 
      selectedAnswers: [...selectedAnswers],
      correctAnswers: exercise.correctAnswers
    };
    const newResults = [...results, newResult];
    setResults(newResults);
    setShowResult(true);
    
    // Toast notification basada en el resultado
    if (isCorrect) {
      toast.success('¡Respuesta correcta! 🎉', {
        position: "top-center",
        autoClose: 2000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
    } else {
      toast.error('Respuesta incorrecta 😔', {
        position: "top-center",
        autoClose: 2000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
    }
    
    setTimeout(() => {
      if (currentExerciseIndex < levelExercises.length - 1) {
        setCurrentExerciseIndex(currentExerciseIndex + 1);
        setSelectedAnswers([]);
        setShowResult(false);
      } else {
        const correctAnswers = newResults.filter(r => r.correct).length;
        const percentage = (correctAnswers / newResults.length) * 100;
        const passed = percentage >= currentLevel.requiredPercentage;
        const totalTime = Math.floor((Date.now() - levelStartTime) / 1000);
        
        // Guardar estadísticas del intento
        saveAttempt(currentLevel.id, {
          score: percentage,
          time: totalTime,
          correctAnswers,
          totalQuestions: newResults.length,
          passed
        });
        
        setLevels(levels.map(level => {
          if (level.id === currentLevel.id) {
            return { ...level, progress: percentage, completed: passed };
          }
          return level;
        }));
        
        setLevelCompleted({
          passed,
          percentage,
          correctAnswers,
          totalQuestions: newResults.length,
          levelName: currentLevel.name,
          time: totalTime
        });
        
        // Notificación de resultado
        if (passed) {
          toast.success(`¡Felicitaciones! Has completado el nivel "${currentLevel.name}" con ${percentage.toFixed(1)}%! 🎉`);
        } else {
          toast.warn(`Nivel no completado. Obtuviste ${percentage.toFixed(1)}%, necesitas ${currentLevel.requiredPercentage}%. ¡Sigue intentando! 💪`);
        }
        
        // Resetear timer
        setLevelStartTime(null);
        setCurrentTime(0);
      }
    }, 2000);
  };

  // Funciones para manejar imágenes
  const handleRemoveImage = (index) => {
    const newImages = exerciseForm.images.filter((_, i) => i !== index);
    setExerciseForm({
      ...exerciseForm,
      images: newImages.length > 0 ? newImages : ['']
    });
  };

  // Funciones para manejar opciones
  const handleRemoveOption = (index) => {
    if (exerciseForm.options.length <= 2) return; // Mínimo 2 opciones
    
    const removedOption = exerciseForm.options[index];
    const newOptions = exerciseForm.options.filter((_, i) => i !== index);
    const newCorrectAnswers = exerciseForm.correctAnswers.filter(answerIndex => {
      const optionText = exerciseForm.options[answerIndex];
      return newOptions.includes(optionText);
    }).map(answerIndex => {
      const optionText = exerciseForm.options[answerIndex];
      return newOptions.indexOf(optionText);
    });
    
    setExerciseForm({
      ...exerciseForm,
      options: newOptions,
      correctAnswers: newCorrectAnswers
    });
  };

  // Función para obtener la clase de galería de imágenes
  const getImageGalleryClass = (imageCount) => {
    if (imageCount === 1) return 'single';
    if (imageCount === 2) return 'double';
    if (imageCount === 3) return 'triple';
    if (imageCount === 4) return 'quad';
    if (imageCount === 5) return 'five';
    return 'many';
  };

  if (levelCompleted) {
    return (
      <div className="w-screen h-screen p-4 md:p-8 animate-fadeIn overflow-y-auto flex items-center justify-center">
        <div className="container-max w-full">
          <div className="card text-center">
          {levelCompleted.passed ? (
            <div>
              <div className="text-4xl md:text-6xl mb-4 md:mb-6 animate-bounce">🎉</div>
              <h1 className="text-3xl md:text-5xl text-green-600 mb-4 md:mb-6">¡Felicitaciones!</h1>
              <h2 className="text-lg md:text-2xl text-gray-700 mb-6 md:mb-8">Has completado el nivel: {levelCompleted.levelName}</h2>
              
              <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4 md:p-8 mb-6 md:mb-8">
                <div className="text-4xl md:text-6xl font-bold text-green-600 mb-2 md:mb-4">
                  {levelCompleted.percentage.toFixed(1)}%
                </div>
                <p className="text-base md:text-xl text-green-700 mb-2">
                  Respondiste correctamente {levelCompleted.correctAnswers} de {levelCompleted.totalQuestions} preguntas
                </p>
                <p className="text-sm md:text-base text-green-600">
                  ⏱️ Tiempo: {Math.floor(levelCompleted.time / 60)}:{(levelCompleted.time % 60).toString().padStart(2, '0')}
                </p>
              </div>

              <div className="flex flex-col sm:flex-row justify-center gap-4 md:gap-6">
                <button
                  onClick={() => {
                    setLevelCompleted(null);
                    setCurrentView('levels');
                  }}
                  className="btn btn-large"
                >
                  Continuar
                </button>
                <button
                  onClick={() => {
                    setLevelCompleted(null);
                    startLevel(currentLevel);
                  }}
                  className="btn btn-large btn-green"
                >
                  Jugar de Nuevo
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div className="text-4xl md:text-6xl mb-4 md:mb-6">😔</div>
              <h1 className="text-3xl md:text-5xl text-orange-600 mb-4 md:mb-6">¡Sigue Intentando!</h1>
              <h2 className="text-lg md:text-2xl text-gray-700 mb-6 md:mb-8">Nivel: {levelCompleted.levelName}</h2>
              
              <div className="bg-orange-50 border-2 border-orange-200 rounded-xl p-4 md:p-8 mb-6 md:mb-8">
                <div className="text-4xl md:text-6xl font-bold text-orange-600 mb-2 md:mb-4">
                  {levelCompleted.percentage.toFixed(1)}%
                </div>
                <p className="text-base md:text-xl text-orange-700 mb-2">
                  Respondiste correctamente {levelCompleted.correctAnswers} de {levelCompleted.totalQuestions} preguntas
                </p>
                <p className="text-sm md:text-base text-orange-600 mb-2">
                  ⏱️ Tiempo: {Math.floor(levelCompleted.time / 60)}:{(levelCompleted.time % 60).toString().padStart(2, '0')}
                </p>
                <p className="text-sm md:text-base text-gray-600">
                  Necesitas al menos {currentLevel.requiredPercentage}% para completar este nivel
                </p>
              </div>

              <div className="flex flex-col sm:flex-row justify-center gap-4 md:gap-6">
                <button
                  onClick={() => {
                    setLevelCompleted(null);
                    startLevel(currentLevel);
                  }}
                  className="btn btn-large btn-orange"
                >
                  Intentar de Nuevo
                </button>
                <button
                  onClick={() => {
                    setLevelCompleted(null);
                    setCurrentView('levels');
                  }}
                  className="btn btn-large btn-gray"
                >
                  Volver a Niveles
                </button>
              </div>
            </div>
          )}
        </div>
        </div>
      </div>
    );
  }

  if (currentView === 'playLevel') {
    const levelExercises = exercises.filter(ex => currentLevel.exercises.includes(ex.id));
    const exercise = levelExercises[currentExerciseIndex];
    
    if (!exercise) {
      return (
        <div className="w-screen h-screen p-4 md:p-8 overflow-y-auto">
          <div className="card text-center">
            <h2 className="text-2xl md:text-3xl font-bold mb-4 md:mb-6">No hay ejercicios disponibles</h2>
            <button
              onClick={() => setCurrentView('levels')}
              className="btn btn-large"
            >
              Volver a Niveles
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="w-screen min-h-screen p-1 md:p-4 lg:p-8 animate-fadeIn overflow-y-auto flex items-center justify-center">
        <div className="container-max w-full max-w-4xl mx-auto">
          <div className="card p-3 md:p-6">
          {/* Header compacto para móvil */}
          <div className="mb-3 md:mb-6 pt-1 md:pt-2 relative">
            {/* Botón X en esquina superior derecha */}
            <button
              onClick={() => setCurrentView('levels')}
              className="game-exit-button"
            >
              <span className="text-lg md:text-xl font-bold">×</span>
            </button>
            
            <div className="flex flex-col md:flex-row justify-between items-center gap-2 md:gap-3 mb-3 md:mb-4">
              <div className="flex-1 text-center md:text-left">
                <h1 className="text-base md:text-2xl lg:text-3xl text-blue-600 font-bold truncate">{currentLevel.name} - {exercise.name}</h1>
              </div>
              
              {/* Tiempo compacto */}
              <div className="flex-1 text-center">
                <div className="text-base md:text-xl lg:text-2xl font-bold text-emerald-600">
                  {Math.floor(currentTime / 60)}:{(currentTime % 60).toString().padStart(2, '0')}
                </div>
                <div className="text-xs md:text-sm text-emerald-500 font-medium">Tiempo</div>
              </div>
            </div>
            
            {/* Progreso compacto para móvil */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg md:rounded-xl p-2 md:p-4 lg:p-6 shadow-sm">
              <div className="bg-white rounded-lg px-2 md:px-4 py-2 md:py-3 shadow-sm border border-blue-200">
                <div className="mb-2 md:mb-3">
                  <span className="text-xs md:text-sm font-semibold text-gray-700">Ejercicio {currentExerciseIndex + 1} de {levelExercises.length}</span>
                </div>
                {/* Barra de progreso elegante - ancho completo */}
                <div className="relative">
                  {/* Barra de progreso principal */}
                  <div className="w-full h-4 md:h-6 mb-4 md:mb-6 relative overflow-hidden progress-bar-container">
                    {/* Parte verde del progreso */}
                    <div 
                      className="h-full progress-bar-fill"
                      style={{ 
                        width: `${Math.round((results.filter(r => r.correct).length / levelExercises.length) * 100)}%`,
                        minWidth: results.length > 0 ? '20px' : '0px'
                      }}
                    ></div>
                    
                    {/* Porcentaje centrado compacto */}
                    <div className="absolute inset-0 flex items-center justify-center z-20">
                      <div className="bg-white px-3 md:px-4 py-1 md:py-2 rounded-full shadow-lg border border-gray-200">
                        <span className="text-black text-sm md:text-base font-bold">
                          {Math.round((results.filter(r => r.correct).length / levelExercises.length) * 100)}%
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Marcadores de progreso con círculos mejorados */}
                  <div className="flex justify-between mt-4 md:mt-6 px-4 md:px-6">
                    {[0, 1, 2].map((progressNumber) => {
                      const completedCount = results.filter(r => r.correct).length;
                      const isCompleted = progressNumber <= completedCount;
                      const isCurrent = progressNumber === completedCount;
                      const isStart = progressNumber === 0;
                      const isEnd = progressNumber === 2;
                      
                      return (
                        <div key={progressNumber} className="flex flex-col items-center">
                          {/* Emoji arriba del círculo */}
                          <div className="text-base md:text-xl mb-2 md:mb-3">
                            {isStart ? '🏁' : isEnd ? '🏆' : '📍'}
                          </div>
                          
                          {/* Círculo del progreso mejorado */}
                          <div 
                            className={`w-8 h-8 md:w-12 md:h-12 rounded-full flex items-center justify-center text-sm md:text-lg font-bold progress-circle ${
                              isCompleted && !isStart
                                ? 'progress-circle completed text-white transform scale-110' 
                                : isCurrent || isStart
                                  ? 'progress-circle current text-white'
                                  : 'progress-circle pending text-gray-600'
                            }`}
                          >
                            {isCompleted && !isStart ? '✓' : progressNumber}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>

                      <div className="text-center mt-4">
            
            {/* Galería de imágenes cuadradas y redondeadas */}
            <div className="grid grid-cols-2 gap-4 md:gap-6 mt-4">
              {exercise.images.map((imageUrl, index) => (
                <div key={index} className="game-image-container">
                  <img
                    src={imageUrl}
                    alt={`Imagen ${index + 1}`}
                    className="w-full object-cover rounded-xl shadow-md border-2 border-gray-200"
                    onError={(e) => {
                      e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzUwIiBoZWlnaHQ9IjM1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4gPHJlY3Qgd2lkdGg9IjM1MCIgaGVpZ2h0PSIzNTAiIGZpbGw9IiNmMGYwZjAiLz4gPHRleHQgeD0iNTAlIiB5PSI0NSUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxOCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSI+SW1hZ2VuIG5vPC90ZXh0PiA8dGV4dCB4PSI1MCUiIHk9IjU1JSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE4IiBmaWxsPSIjOTk5IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5kaXNwb25pYmxlPC90ZXh0Pjwvc3ZnPg==';
                    }}
                  />
                </div>
              ))}
            </div>

            <div className="mb-6 md:mb-8 max-w-4xl mx-auto">
              <div className="text-center mb-6">
                {exercise.description && (
                  <p className="text-base md:text-lg text-gray-700 mb-3 font-medium">{exercise.description}</p>
                )}
                {exercise.correctAnswers.length > 1 && (
                  <p className="text-sm text-blue-600 font-normal">
                    (Puedes seleccionar {exercise.correctAnswers.length} opciones)
                  </p>
                )}
              </div>
              
              {/* Grid de opciones - 2 por fila */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                {exercise.options.map((option, index) => (
                  <button
                    key={index}
                    onClick={() => handleAnswerSelection(index)}
                    disabled={showResult}
                    className={`game-option-btn h-16 md:h-20 ${
                      selectedAnswers.includes(index)
                        ? showResult
                          ? exercise.correctAnswers.includes(index)
                            ? 'correct'
                            : 'incorrect'
                          : 'selected'
                        : showResult && exercise.correctAnswers.includes(index)
                        ? 'correct'
                        : ''
                    }`}
                  >
                    <span className="flex-1 text-left text-base md:text-lg">{option}</span>
                    {selectedAnswers.includes(index) && !showResult && (
                      <span className="text-xl flex-shrink-0 text-white">✓</span>
                    )}
                    {showResult && (
                      <span className="text-xl flex-shrink-0">
                        {exercise.correctAnswers.includes(index) ? '✓' : selectedAnswers.includes(index) ? '✗' : null}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {!showResult ? (
              <div className="text-center">
                <button
                  onClick={handleAnswer}
                  disabled={selectedAnswers.length === 0}
                  className={`btn btn-large max-w-sm mx-auto transition-all duration-300 ${
                    selectedAnswers.length > 0 
                      ? 'btn-green shadow-lg hover:shadow-xl transform hover:scale-105' 
                      : 'btn-gray opacity-50 cursor-not-allowed'
                  }`}
                >
                  Confirmar Respuesta
                </button>
                <div className="h-6 mt-2 flex items-center justify-center">
                  {selectedAnswers.length === 0 ? (
                    <p className="text-sm text-gray-500">Selecciona al menos una opción</p>
                  ) : (
                    <div className="h-5"></div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center">
                <div className={`text-3xl md:text-4xl font-bold mb-4 ${
                  results[results.length - 1]?.correct ? 'text-green-600' : 'text-red-600'
                }`}>
                  {results[results.length - 1]?.correct ? '🎉 ¡Correcto!' : '❌ Incorrecto'}
                </div>
                <div className={`p-4 rounded-lg mb-4 ${
                  results[results.length - 1]?.correct 
                    ? 'bg-green-50 border border-green-200' 
                    : 'bg-red-50 border border-red-200'
                }`}>
                  <p className="text-base md:text-lg text-gray-700">
                    {currentExerciseIndex < levelExercises.length - 1 
                      ? '🎯 Pasando al siguiente ejercicio...' 
                      : '🏆 ¡Nivel completado! Calculando resultados...'}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
        </div>
      </div>
    );
  }

  if (currentView === 'createLevel') {
    return (
      <div className="w-screen h-screen p-4 md:p-8 animate-slideIn overflow-y-auto flex items-center justify-center createLevel">
        <div className="card w-full max-w-2xl h-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl md:text-3xl text-blue-600">{editingLevel ? 'Editar Nivel' : 'Crear Nuevo Nivel'}</h1>
            <button
              onClick={() => {
                setCurrentView('levels');
                setEditingLevel(null);
                setLevelForm({
                  name: '',
                  description: '',
                  requiredPercentage: 70,
                  prerequisiteLevel: null,
                  isRestricted: false
                });
              }}
              className="btn btn-gray"
            >
              ← Volver
            </button>
          </div>

          <div className="space-y-4 md:space-y-6">
            <div>
              <label className="block text-base md:text-lg font-semibold mb-2 md:mb-3">Nombre del Nivel *</label>
              <input
                type="text"
                value={levelForm.name}
                onChange={(e) => setLevelForm({...levelForm, name: e.target.value})}
                className="input"
                placeholder="Ej: Nivel 1 - Animales"
              />
            </div>

            <div>
              <label className="block text-base md:text-lg font-semibold mb-2 md:mb-3">Descripción</label>
              <textarea
                value={levelForm.description}
                onChange={(e) => setLevelForm({...levelForm, description: e.target.value})}
                className="textarea"
                placeholder="Descripción del nivel y sus objetivos"
              />
            </div>

            <div>
              <label className="block text-base md:text-lg font-semibold mb-2 md:mb-3">Porcentaje Requerido para Completar</label>
              <input
                type="range"
                min="50"
                max="100"
                value={levelForm.requiredPercentage}
                onChange={(e) => setLevelForm({...levelForm, requiredPercentage: parseInt(e.target.value)})}
                className="w-full h-4 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <div className="text-center text-2xl md:text-4xl font-bold text-blue-600 mt-3 md:mt-4">
                {levelForm.requiredPercentage}%
              </div>
            </div>

            {/* Nueva sección de restricciones */}
            <div className="bg-gray-50 border-2 border-gray-200 rounded-xl p-4 md:p-6">
              <h3 className="text-lg md:text-xl font-semibold mb-3 md:mb-4 text-gray-800">🔒 Configuración de Acceso</h3>
              
              <div className="space-y-3 md:space-y-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={levelForm.isRestricted}
                    onChange={(e) => setLevelForm({
                      ...levelForm, 
                      isRestricted: e.target.checked,
                      prerequisiteLevel: e.target.checked ? levelForm.prerequisiteLevel : null
                    })}
                    className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0"
                  />
                  <span className="text-base md:text-lg font-medium">Este nivel requiere completar otro nivel primero</span>
                </label>

                {levelForm.isRestricted && (
                  <div className="ml-8">
                    <label className="block text-sm md:text-base font-medium mb-2 text-gray-700">
                      Nivel prerequisito requerido:
                    </label>
                    <select
                      value={levelForm.prerequisiteLevel || ''}
                      onChange={(e) => setLevelForm({
                        ...levelForm, 
                        prerequisiteLevel: e.target.value ? parseInt(e.target.value) : null
                      })}
                      className="select"
                    >
                      <option value="">Seleccionar nivel prerequisito...</option>
                      {levels.map(level => (
                        <option key={level.id} value={level.id}>
                          {level.name}
                        </option>
                      ))}
                    </select>
                    {levelForm.prerequisiteLevel && (
                      <p className="text-xs md:text-sm text-gray-600 mt-2">
                        ℹ️ Los usuarios deberán completar el nivel seleccionado antes de acceder a este nivel
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={handleCreateLevel}
              disabled={!levelForm.name.trim() || (levelForm.isRestricted && !levelForm.prerequisiteLevel)}
              className="btn btn-large btn-full"
            >
              {editingLevel ? 'Guardar Cambios' : 'Crear Nivel'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (currentView === 'createExercise') {
    return (
      <div className="w-screen h-screen p-4 md:p-8 animate-slideIn overflow-y-auto flex items-center justify-center createExercise">
        <div className="w-full max-w-4xl h-auto">
          <div className="card">
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl md:text-3xl text-green-600">{editingExercise ? 'Editar Ejercicio' : 'Crear Nuevo Ejercicio'}</h1>
              <button
                onClick={() => {
                  setCurrentView('levels');
                  setEditingExercise(null);
                  setExerciseForm({
                    name: '',
                    description: '',
                    images: [''],
                    options: ['', ''],
                    correctAnswers: [],
                    assignedLevels: []
                  });
                }}
                className="btn btn-gray"
              >
                ← Volver
              </button>
            </div>

            <div className="space-y-6 md:space-y-8">
              <div>
              <label className="block text-base md:text-lg font-semibold mb-2 md:mb-3">Nombre del Ejercicio *</label>
              <input
                type="text"
                value={exerciseForm.name}
                onChange={(e) => setExerciseForm({...exerciseForm, name: e.target.value})}
                className="input"
                placeholder="Ej: Categorizar Animales"
              />
            </div>

              <div>
                <label className="block text-base md:text-lg font-semibold mb-2 md:mb-3">Descripción</label>
                <textarea
                  value={exerciseForm.description}
                  onChange={(e) => setExerciseForm({...exerciseForm, description: e.target.value})}
                  className="textarea h-20"
                  placeholder="Descripción del ejercicio"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-2 md:mb-3">
                  <label className="text-base md:text-lg font-semibold">
                    URLs de las Imágenes ({exerciseForm.images.filter(img => img.trim()).length})
                  </label>
                  <button
                    onClick={() => setExerciseForm({
                      ...exerciseForm, 
                      images: [...exerciseForm.images, '']
                    })}
                    className="form-btn form-btn-add"
                  >
                    📷 Agregar
                  </button>
                </div>
                <div className="h-24 overflow-y-auto border border-gray-200 rounded-lg p-3">
                  <div className="space-y-2">
                    {exerciseForm.images.map((image, index) => (
                      <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                        <div className="flex-1">
                          <input
                            type="text"
                            value={image}
                            onChange={(e) => {
                              const newImages = [...exerciseForm.images];
                              newImages[index] = e.target.value;
                              setExerciseForm({...exerciseForm, images: newImages});
                            }}
                            className="input text-sm w-full h-8"
                            placeholder={`URL de la imagen ${index + 1}`}
                          />
                        </div>
                        {exerciseForm.images.length > 1 && (
                          <button
                            onClick={() => handleRemoveImage(index)}
                            className="form-btn form-btn-delete"
                            title="Eliminar imagen"
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

                <div>
                  <div className="flex justify-between items-center mb-2 md:mb-3">
                    <label className="text-base md:text-lg font-semibold">
                      Opciones de Respuesta ({exerciseForm.options.filter(opt => opt.trim()).length})
                    </label>
                    <button
                      onClick={() => setExerciseForm({
                        ...exerciseForm, 
                        options: [...exerciseForm.options, '']
                      })}
                      className="form-btn form-btn-add"
                    >
                      ➕ Agregar
                    </button>
                  </div>
                  <div className="h-32 overflow-y-auto border border-gray-200 rounded-lg p-3">
                    <div className="space-y-2">
                      {exerciseForm.options.map((option, index) => (
                        <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                          <div className="flex-1">
                            <input
                              type="text"
                              value={option}
                              onChange={(e) => {
                                const newOptions = [...exerciseForm.options];
                                newOptions[index] = e.target.value;
                                setExerciseForm({...exerciseForm, options: newOptions});
                              }}
                              className="input text-sm w-full h-8"
                              placeholder={`Opción ${index + 1}`}
                            />
                          </div>
                          <button
                            type="button"
                            className={`form-btn ${exerciseForm.correctAnswers.includes(index) ? 'form-btn-correct-active' : 'form-btn-correct'}`}
                            onClick={() => {
                              if (exerciseForm.correctAnswers.includes(index)) {
                                setExerciseForm({
                                  ...exerciseForm,
                                  correctAnswers: exerciseForm.correctAnswers.filter(i => i !== index)
                                });
                              } else {
                                setExerciseForm({
                                  ...exerciseForm,
                                  correctAnswers: [...exerciseForm.correctAnswers, index]
                                });
                              }
                            }}
                            disabled={!option.trim()}
                            title={exerciseForm.correctAnswers.includes(index) ? 'Marcar como incorrecta' : 'Marcar como correcta'}
                          >
                            {exerciseForm.correctAnswers.includes(index) ? '✓ Correcta' : '✗ Correcta'}
                          </button>
                          {exerciseForm.options.length > 2 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveOption(index)}
                              className="form-btn form-btn-delete"
                              title="Eliminar opción"
                            >
                              🗑️
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-base md:text-lg font-semibold mb-2 md:mb-3">Asignar a Niveles</label>
                  <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg p-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {levels.map(level => (
                        <label key={level.id} className="flex items-start gap-2 p-3 bg-gray-50 rounded-lg hover:bg-blue-50 cursor-pointer transition-all">
                          <input
                            type="checkbox"
                            checked={exerciseForm.assignedLevels.includes(level.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setExerciseForm({
                                  ...exerciseForm,
                                  assignedLevels: [...exerciseForm.assignedLevels, level.id]
                                });
                              } else {
                                setExerciseForm({
                                  ...exerciseForm,
                                  assignedLevels: exerciseForm.assignedLevels.filter(id => id !== level.id)
                                });
                              }
                            }}
                            className="w-4 h-4 mt-0.5 flex-shrink-0"
                          />
                          <span className="font-medium text-sm">{level.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <p className="text-xs md:text-sm text-gray-600 mt-2">
                    Selecciona los niveles a los que quieres asignar este ejercicio
                  </p>
                </div>

                <button
                  onClick={handleCreateExercise}
                  disabled={!exerciseForm.name.trim() || exerciseForm.correctAnswers.length === 0}
                  className="btn btn-full btn-green py-2"
                >
                  {editingExercise ? 'Guardar Cambios' : 'Crear Ejercicio'}
                </button>
          </div>
        </div>
      </div>
      </div>
    );
  }

  const filteredExercises = getFilteredExercises();

  return (
    <div className="w-full min-h-screen p-4 md:p-8 animate-fadeIn overflow-y-auto">
      <div className="container-max w-full">
      {/* Header */}
      <div className="content-section mb-4 md:mb-6">
        <div className="flex flex-col lg:flex-row justify-between items-center gap-3 md:gap-4">
          <h1 className="text-2xl md:text-4xl text-blue-600 text-center lg:text-left mb-2 lg:mb-0">Sistema de Actividades - Terapia del Habla</h1>
          <div className="flex flex-row gap-3 md:gap-4 w-full lg:w-auto justify-center">
            <button
              onClick={() => {
                setEditingLevel(null);
                setLevelForm({
                  name: '',
                  description: '',
                  requiredPercentage: 70,
                  prerequisiteLevel: null,
                  isRestricted: false
                });
                setCurrentView('createLevel');
              }}
              className="btn btn-large"
            >
              📚 CREAR NIVEL
            </button>
            <button
              onClick={() => {
                setEditingExercise(null);
                setExerciseForm({
                  name: '',
                  description: '',
                  images: [''],
                  options: ['', ''],
                  correctAnswers: [],
                  assignedLevels: []
                });
                setCurrentView('createExercise');
              }}
              className="btn btn-large btn-green"
            >
              🎯 CREAR EJERCICIO
            </button>
          </div>
        </div>
      </div>

      {/* Contenedor principal con acordeón para tablet/mobile */}
      <div className="lg:grid lg:grid-cols-2 lg:gap-4 lg:gap-6 lg:h-full">
        
        {/* Acordeón mejorado para todas las pantallas */}
        <div className="space-y-4 mb-6">
          {/* Acordeón Niveles */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden">
            <button
              onClick={() => toggleAccordion('levels')}
              className="w-full p-4 md:p-6 flex items-center justify-between text-left hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all duration-300 border-b border-gray-100"
            >
              <h2 className="text-lg md:text-xl font-bold text-gray-800">📚 Niveles Disponibles ({levels.length})</h2>
              <span className={`text-2xl transition-all duration-500 ease-in-out transform ${activeAccordion === 'levels' ? 'rotate-180' : 'rotate-0'}`}>
                {activeAccordion === 'levels' ? '▲' : '▼'}
              </span>
            </button>
            
            {activeAccordion === 'levels' && (
              <div className="px-4 md:px-6 pb-4 md:pb-6 bg-gradient-to-b from-gray-50 to-white">
                {levels.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-5xl mb-4 animate-bounce">📚</div>
                    <p className="text-gray-600 mb-3 text-lg">No hay niveles creados aún</p>
                    <p className="text-sm text-orange-600 font-medium">💡 Tip: Crea primero un nivel</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {levels.map(level => {
                      const levelExercises = exercises.filter(ex => level.exercises.includes(ex.id));
                      const isAvailable = isLevelAvailable(level);
                      
                      return (
                        <div key={level.id} className={`accordion-card bg-white rounded-lg border-2 border-gray-200 p-4 shadow-sm hover:shadow-md transition-all duration-300 ${level.completed ? 'border-green-300 bg-green-50' : ''} ${!isAvailable ? 'opacity-75' : ''}`}>
                          <div className="flex flex-col space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <h3 className="text-base md:text-lg font-semibold text-gray-800">{level.name}</h3>
                                {!isAvailable && <span className="text-lg">🔒</span>}
                                {level.completed && <span className="text-lg">✅</span>}
                              </div>
                            </div>
                            
                            <div className="text-sm text-gray-600">
                              {level.exercises.length} ejercicio{level.exercises.length !== 1 ? 's' : ''}
                            </div>
                            
                            <div className="flex items-center gap-2 pt-2">
                              <button
                                onClick={() => startLevel(level)}
                                className={`btn btn-small btn-blue flex-1 ${!isAvailable || levelExercises.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                                disabled={levelExercises.length === 0 || !isAvailable}
                                title={!isAvailable ? 'Bloqueado' : 'Jugar'}
                              >
                                {!isAvailable ? '🔒 Bloqueado' : '▶ Jugar'}
                              </button>
                              <button
                                onClick={() => editLevel(level)}
                                className="btn btn-small btn-gray flex-1"
                                title="Editar"
                              >
                                ✏️ Editar
                              </button>
                              <button
                                onClick={() => handleDeleteLevel(level)}
                                className="btn btn-small btn-red flex-1"
                                title="Eliminar"
                              >
                                🗑️ Eliminar
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Acordeón Ejercicios */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden">
            <button
              onClick={() => toggleAccordion('exercises')}
              className="w-full p-4 md:p-6 flex items-center justify-between text-left hover:bg-gradient-to-r hover:from-green-50 hover:to-emerald-50 transition-all duration-300 border-b border-gray-100"
            >
              <h2 className="text-lg md:text-xl font-bold text-gray-800">🎯 Ejercicios Disponibles ({exercises.length})</h2>
              <span className={`text-2xl transition-all duration-500 ease-in-out transform ${activeAccordion === 'exercises' ? 'rotate-180' : 'rotate-0'}`}>
                {activeAccordion === 'exercises' ? '▲' : '▼'}
              </span>
            </button>
            
            {activeAccordion === 'exercises' && (
              <div className="px-4 md:px-6 pb-4 md:pb-6 bg-gradient-to-b from-gray-50 to-white">
                {/* Filtro por Nivel */}
                <div className="mb-4">
                  <label className="text-sm font-semibold text-gray-700 block mb-2">Filtrar por:</label>
                  <select
                    value={selectedLevelFilter}
                    onChange={(e) => setSelectedLevelFilter(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg text-sm bg-white shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="all">📋 Todos los ejercicios ({exercises.length})</option>
                    <option value="unassigned">
                      🔄 Sin asignar ({exercises.filter(ex => !levels.some(level => level.exercises.includes(ex.id))).length})
                    </option>
                    {levels.map(level => {
                      const levelExerciseCount = exercises.filter(ex => level.exercises.includes(ex.id)).length;
                      return (
                        <option key={level.id} value={level.id}>
                          📚 {level.name} ({levelExerciseCount})
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Lista de ejercicios */}
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {getFilteredExercises().map(exercise => {
                    const assignedLevels = levels.filter(level => level.exercises.includes(exercise.id));
                    
                    return (
                      <div key={exercise.id} className="accordion-card bg-white rounded-lg border-2 border-gray-200 p-4 shadow-sm hover:shadow-md transition-all duration-300">
                        <div className="flex flex-col space-y-3">
                          <div className="flex items-center justify-between">
                            <h3 className="text-base md:text-lg font-semibold text-gray-800">🎯 {exercise.name}</h3>
                          </div>
                          
                          <div className="text-sm text-gray-600">
                            📷 {exercise.images.length} • 📝 {exercise.options.length} • ✅ {exercise.correctAnswers.length}
                          </div>
                          
                          {assignedLevels.length > 0 && (
                            <div className="text-xs text-blue-600">
                              Asignado a: {assignedLevels.map(l => l.name).join(', ')}
                            </div>
                          )}
                          
                          <div className="flex items-center gap-2 pt-2">
                            <button
                              onClick={() => editExercise(exercise)}
                              className="btn btn-small btn-gray flex-1"
                              title="Editar"
                            >
                              ✏️ Editar
                            </button>
                            <button
                              onClick={() => handleDeleteExercise(exercise)}
                              className="btn btn-small btn-red flex-1"
                              title="Eliminar"
                            >
                              🗑️ Eliminar
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        
      </div>

      {/* Modal de estadísticas */}
      <StatsModal
        isOpen={statsModal.isOpen}
        onClose={() => setStatsModal({ isOpen: false, levelId: null, levelName: '' })}
        levelId={statsModal.levelId}
        levelName={statsModal.levelName}
      />

      {/* Diálogo de confirmación de eliminación */}
      <DeleteConfirmation
        isOpen={deleteDialog.isOpen}
        onClose={() => setDeleteDialog({ isOpen: false, type: null, item: null, message: '', warningMessage: '' })}
        onConfirm={confirmDelete}
        title={deleteDialog.type === 'level' ? 'Eliminar Nivel' : 'Eliminar Ejercicio'}
        message={deleteDialog.message}
        warningMessage={deleteDialog.warningMessage}
        confirmText="Eliminar"
        cancelText="Cancelar"
      />
      
      {/* Toast Container para notificaciones */}
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
    </div>
    </div>
  );
};

export default SpeechTherapySystem; 