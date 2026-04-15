import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Maximize, Minimize, RefreshCw, Award } from 'lucide-react';
import confetti from 'canvas-confetti';

// --- Audio Utility ---
let audioCtx: AudioContext | null = null;

const initAudio = () => {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
};

const playSound = (type: 'correct' | 'incorrect' | 'complete') => {
  try {
    const ctx = initAudio();
    if (!ctx) return;

    const playTone = (freq: number, oscType: OscillatorType, timeOffset: number, duration: number, vol: number = 0.1) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = oscType;
      osc.frequency.setValueAtTime(freq, ctx.currentTime + timeOffset);
      
      gain.gain.setValueAtTime(vol, ctx.currentTime + timeOffset);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + timeOffset + duration);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(ctx.currentTime + timeOffset);
      osc.stop(ctx.currentTime + timeOffset + duration);
    };

    if (type === 'correct') {
      playTone(523.25, 'sine', 0, 0.1, 0.1); // C5
      playTone(659.25, 'sine', 0.1, 0.2, 0.1); // E5
    } else if (type === 'incorrect') {
      playTone(200, 'sawtooth', 0, 0.2, 0.05);
      playTone(150, 'sawtooth', 0.1, 0.3, 0.05);
    } else if (type === 'complete') {
      playTone(523.25, 'sine', 0, 0.15, 0.1); // C5
      playTone(659.25, 'sine', 0.15, 0.15, 0.1); // E5
      playTone(783.99, 'sine', 0.3, 0.15, 0.1); // G5
      playTone(1046.50, 'sine', 0.45, 0.4, 0.1); // C6
    }
  } catch (e) {
    console.error("Audio playback failed", e);
  }
};
// -------------------

const R = 105;
const W = 2 * R;
const H = Math.sqrt(3) * R;
const GAP = 6; // Gap between hexagons

const dist = Math.sqrt(3) * R;
const scaleFactor = (dist + GAP) / dist;

const centralText = "Овладение приёмами в наплавке валиков в нижнем положении сварного шва";
const stepsData = [
  { id: 1, text: "подготовить металл к сварке" },
  { id: 2, text: "настроить сварочный аппарат" },
  { id: 3, text: "установить электрод в электрододержатель" },
  { id: 4, text: "выполнить наплавку валика" },
  { id: 5, text: "произвести зачистку наплавленного валика от шлака" },
  { id: 6, text: "проверить наплавленный валик на наличие дефектов" },
];

const getSlotPosition = (index: number) => {
  const positions = [
    { x: 0, y: -H * scaleFactor }, // 1. Top
    { x: 1.5 * R * scaleFactor, y: -H / 2 * scaleFactor }, // 2. Top-Right
    { x: 1.5 * R * scaleFactor, y: H / 2 * scaleFactor }, // 3. Bottom-Right
    { x: 0, y: H * scaleFactor }, // 4. Bottom
    { x: -1.5 * R * scaleFactor, y: H / 2 * scaleFactor }, // 5. Bottom-Left
    { x: -1.5 * R * scaleFactor, y: -H / 2 * scaleFactor }, // 6. Top-Left
  ];
  return positions[index];
};

interface HexagonProps {
  text: string | number;
  isCenter?: boolean;
  isEmpty?: boolean;
  isNumber?: boolean;
  style?: React.CSSProperties;
  className?: string;
}

const Hexagon = ({ text, isCenter, isEmpty, isNumber, style, className = "" }: HexagonProps) => {
  return (
    <div 
      className={`relative flex items-center justify-center text-center ${className}`}
      style={{
        width: `${W}px`,
        height: `${H}px`,
        ...style
      }}
    >
      <svg 
        viewBox={`0 0 ${W} ${H}`} 
        className="absolute inset-0 w-full h-full drop-shadow-md"
        style={{ zIndex: -1 }}
      >
        <polygon
          points={`${W*0.25},0 ${W*0.75},0 ${W},${H/2} ${W*0.75},${H} ${W*0.25},${H} 0,${H/2}`}
          fill={isEmpty ? '#f8fafc' : isCenter ? '#3b82f6' : '#10b981'}
          stroke={isEmpty ? '#64748b' : isCenter ? '#1e3a8a' : '#065f46'}
          strokeWidth="4"
          strokeLinejoin="round"
        />
      </svg>
      <div 
        className={`z-10 p-4 select-none ${isNumber ? 'text-6xl font-bold text-slate-200' : 'text-sm sm:text-base font-medium leading-snug text-white'}`} 
      >
        {text}
      </div>
    </div>
  )
}

export default function App() {
  const [currentStep, setCurrentStep] = useState(1);
  const [placedSteps, setPlacedSteps] = useState<number[]>([]);
  const [shuffledSteps, setShuffledSteps] = useState<{id: number, text: string}[]>([]);
  const [wrongStepId, setWrongStepId] = useState<number | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    resetGame();
    
    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const scaleW = Math.min(1, (width - 32) / 650);
      const scaleH = Math.min(1, (height - 250) / 600);
      setScale(Math.min(scaleW, scaleH));
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const resetGame = () => {
    setCurrentStep(1);
    setPlacedSteps([]);
    setShuffledSteps([...stepsData].sort(() => Math.random() - 0.5));
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  const handleStepClick = (step: {id: number, text: string}) => {
    // Initialize audio context on first user interaction
    initAudio();

    if (step.id === currentStep) {
      setPlacedSteps(prev => [...prev, step.id]);
      setCurrentStep(prev => prev + 1);
      
      if (step.id === 6) {
        playSound('complete');
        setTimeout(() => {
          confetti({
            particleCount: 150,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#10b981', '#3b82f6', '#f59e0b']
          });
        }, 300);
      } else {
        playSound('correct');
      }
    } else {
      playSound('incorrect');
      setWrongStepId(step.id);
      setTimeout(() => setWrongStepId(null), 500);
    }
  };

  const isComplete = currentStep > 6;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans selection:bg-blue-200">
      {/* Header */}
      <header className="bg-white shadow-sm p-4 flex justify-between items-center z-10 relative">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center shadow-inner">
            <Award className="text-white" size={24} />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-slate-800 leading-tight">Гекс-игра по сварке</h1>
            <p className="text-xs sm:text-sm text-slate-500 font-medium">от НГПК</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={resetGame} 
            className="group relative p-2 sm:px-4 sm:py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors flex items-center gap-2 font-medium"
            aria-label="Начать заново"
          >
            <RefreshCw size={18} />
            <span className="hidden sm:inline">Заново</span>
            <div className="absolute top-full mt-2 right-0 sm:left-1/2 sm:-translate-x-1/2 px-3 py-1.5 bg-slate-800 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-lg">
              Сбросить прогресс
            </div>
          </button>
          <button 
            onClick={toggleFullscreen} 
            className="group relative p-2 sm:px-4 sm:py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors flex items-center gap-2 font-medium"
            aria-label="На весь экран"
          >
            {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
            <span className="hidden sm:inline">{isFullscreen ? 'Свернуть' : 'На весь экран'}</span>
            <div className="absolute top-full mt-2 right-0 sm:left-1/2 sm:-translate-x-1/2 px-3 py-1.5 bg-slate-800 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-lg">
              {isFullscreen ? 'Выйти из полноэкранного режима' : 'Развернуть на весь экран'}
            </div>
          </button>
        </div>
      </header>
      
      {/* Main Game Area */}
      <main className="flex-1 flex flex-col items-center justify-start p-4 overflow-hidden relative">
        
        {/* Hex Grid Area */}
        <div className="relative w-full flex-1 flex items-center justify-center min-h-[450px]">
          <div 
            className="relative transition-transform duration-300 ease-out" 
            style={{ 
              width: '1px', 
              height: '1px',
              transform: `scale(${scale})` 
            }}
          >
            {/* Center Hex */}
            <div className="absolute" style={{ left: 0, top: 0, width: `${W}px`, height: `${H}px`, transform: 'translate(-50%, -50%)', zIndex: 10 }}>
              <Hexagon text={centralText} isCenter />
            </div>
            
            {/* 6 Slots */}
            {stepsData.map((step, index) => {
              const pos = getSlotPosition(index);
              const isPlaced = placedSteps.includes(step.id);
              
              return (
                <div 
                  key={`slot-${step.id}`}
                  className="absolute"
                  style={{ 
                    left: pos.x,
                    top: pos.y,
                    width: `${W}px`,
                    height: `${H}px`,
                    transform: 'translate(-50%, -50%)',
                    zIndex: isPlaced ? 20 : 5
                  }}
                >
                  {/* Empty Slot Background */}
                  <Hexagon text={index + 1} isEmpty isNumber />
                  
                  {/* Placed Step */}
                  <AnimatePresence>
                    {isPlaced && (
                      <motion.div
                        layoutId={`step-${step.id}`}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ type: "spring", stiffness: 250, damping: 25 }}
                        className="absolute inset-0"
                      >
                        <Hexagon text={step.text} />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom Options Area */}
        <div className="w-full max-w-5xl mt-4 mb-8 z-20 bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-slate-100">
          <h2 className="text-center text-lg sm:text-xl font-bold text-slate-800 mb-6">
            {isComplete 
              ? "🎉 Поздравляем! Вы собрали правильную последовательность." 
              : `Шаг ${currentStep} из 6: Выберите следующее действие`}
          </h2>
          
          <div className="flex flex-wrap justify-center gap-3 sm:gap-4 min-h-[120px]">
            <AnimatePresence mode="popLayout">
              {shuffledSteps.map((step) => {
                if (placedSteps.includes(step.id)) return null;
                const isWrong = wrongStepId === step.id;
                
                return (
                  <motion.button
                    key={`option-${step.id}`}
                    layoutId={`step-${step.id}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={isWrong ? { x: [-8, 8, -8, 8, 0], opacity: 1, y: 0 } : { opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: isWrong ? 0.4 : 0.2 }}
                    onClick={() => handleStepClick(step)}
                    className={`px-5 py-3 rounded-xl shadow-sm border-2 text-sm sm:text-base font-semibold transition-all
                      ${isWrong
                        ? 'bg-red-50 border-red-600 text-red-700 shadow-red-100'
                        : 'bg-white border-slate-400 text-slate-700 hover:border-blue-700 hover:bg-blue-50 hover:text-blue-700 hover:shadow-md hover:-translate-y-1'
                      }
                    `}
                    style={{ maxWidth: '280px', flex: '1 1 200px' }}
                  >
                    {step.text}
                  </motion.button>
                );
              })}
            </AnimatePresence>
            
            {isComplete && (
              <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={resetGame}
                className="px-8 py-4 rounded-xl shadow-md border-2 border-green-500 bg-green-500 text-white text-lg font-bold hover:bg-green-600 hover:border-green-600 transition-all hover:-translate-y-1"
              >
                Пройти еще раз
              </motion.button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
