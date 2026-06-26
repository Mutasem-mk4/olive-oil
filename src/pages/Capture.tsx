// ============================================================
// Capture — Demo Selection & Camera Capture Page
// ============================================================
// Tab toggle between Demo Mode (3 scenario cards) and Live
// Camera / File Upload mode. Shows LoadingOlive during analysis.
// ============================================================

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { useAnalysisStore } from '@/store/analysisStore';
import { analyzeImage } from '@/services/api';
import LoadingOlive from '@/components/shared/LoadingOlive';
import type { DemoScenario } from '@/types';

type TabMode = 'demo' | 'camera';

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { delay: i * 0.12, type: 'spring', stiffness: 200, damping: 20 },
  }),
};

export default function Capture() {
  const [activeTab, setActiveTab] = useState<TabMode>('demo');
  const [sampleName, setSampleName] = useState('');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const navigate = useNavigate();

  const {
    demoScenarios,
    loadingState,
    loadingMessage,
    runDemoAnalysis,
    setResult,
    setLoadingState,
  } = useAnalysisStore();

  // Navigate to results when analysis completes
  useEffect(() => {
    if (loadingState === 'complete') {
      const timer = setTimeout(() => navigate('/results'), 400);
      return () => clearTimeout(timer);
    }
  }, [loadingState, navigate]);

  // Cleanup camera stream on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  // Stop camera when switching tabs
  useEffect(() => {
    if (activeTab === 'demo' && stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  }, [activeTab, stream]);

  const handleScenarioClick = async (scenario: DemoScenario) => {
    await runDemoAnalysis(scenario);
  };

  const startCamera = async () => {
    setCameraError(null);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      setStream(mediaStream);
      
      // Delay slightly to ensure video element is rendered
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      }, 100);
    } catch (err) {
      console.error("Camera access failed:", err);
      setCameraError("Unable to access camera. Please ensure permissions are granted and you are using HTTPS.");
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const captureImage = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg');
        handleAnalysis(dataUrl);
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        handleAnalysis(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAnalysis = async (dataUrl: string) => {
    stopCamera();
    setLoadingState('analyzing', 'Uploading sample to Azure...');
    try {
      const result = await analyzeImage(dataUrl, sampleName || 'Live Sample');
      setResult(result);
    } catch (err) {
      console.error("Analysis failed:", err);
      setLoadingState('error', 'Analysis failed. Please check backend connection.');
    }
  };

  const isAnalyzing = loadingState === 'analyzing' || loadingState === 'capturing' || loadingState === 'uploading';

  return (
    <div className="min-h-screen gradient-mesh px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <div className="max-w-4xl mx-auto">
        {/* Page Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-dark mb-2">
            Analyze Sample
          </h1>
          <p className="font-arabic text-lg text-dark/50">تحليل العينة</p>
        </motion.div>

        {/* Tab Toggle */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex justify-center mb-10"
        >
          <div className="glass rounded-xl p-1.5 flex gap-1">
            {[
              { key: 'demo' as TabMode, label: 'Demo Mode', labelAr: 'الوضع التجريبي', icon: '🎯' },
              { key: 'camera' as TabMode, label: 'Live Camera', labelAr: 'الكاميرا الحية', icon: '📷' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`relative px-5 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                  activeTab === tab.key
                    ? 'text-white'
                    : 'text-dark/60 hover:text-dark'
                }`}
              >
                {activeTab === tab.key && (
                  <motion.div
                    layoutId="capture-tab"
                    className="absolute inset-0 gradient-olive rounded-lg"
                    transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                  />
                )}
                <span className="relative z-10">{tab.icon}</span>
                <span className="relative z-10">{tab.label}</span>
              </button>
            ))}
          </div>
        </motion.div>

        {/* Content */}
        <AnimatePresence mode="wait">
          {isAnalyzing ? (
            /* Loading State */
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-20"
            >
              <LoadingOlive
                message={loadingMessage}
                size={80}
              />
            </motion.div>
          ) : activeTab === 'demo' ? (
            /* Demo Mode - Scenario Cards */
            <motion.div
              key="demo"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center text-sm text-dark/50 mb-8"
              >
                Select a pre-loaded scenario to test the analysis pipeline
                <br />
                <span className="font-arabic text-xs">اختر سيناريو محمّل مسبقاً لاختبار خط التحليل</span>
              </motion.p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                {demoScenarios.map((scenario, index) => (
                  <motion.button
                    key={scenario.id}
                    custom={index}
                    variants={cardVariants}
                    initial="hidden"
                    animate="show"
                    whileHover={{ y: -6, scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => handleScenarioClick(scenario)}
                    className="relative glass rounded-2xl p-6 text-left group overflow-hidden cursor-pointer"
                  >
                    {/* Colored left border */}
                    <div
                      className="absolute left-0 top-0 bottom-0 w-1.5 rounded-l-2xl"
                      style={{ backgroundColor: scenario.thumbnailColor }}
                    />

                    {/* Icon */}
                    <motion.span
                      whileHover={{ scale: 1.2, rotate: 10 }}
                      className="text-4xl block mb-4"
                    >
                      {scenario.icon}
                    </motion.span>

                    {/* Name */}
                    <h3 className="font-display text-lg font-bold text-dark mb-1 group-hover:text-primary transition-colors">
                      {scenario.name}
                    </h3>
                    <p className="font-arabic text-sm text-accent mb-3">
                      {scenario.nameAr}
                    </p>

                    {/* Description */}
                    <p className="text-xs text-dark/50 leading-relaxed mb-3">
                      {scenario.description}
                    </p>

                    {/* Status preview */}
                    <div
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium text-white"
                      style={{ backgroundColor: scenario.thumbnailColor }}
                    >
                      Score: {scenario.result.purityScore}%
                    </div>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          ) : (
            /* Camera Mode */
            <motion.div
              key="camera"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="max-w-3xl mx-auto"
            >
              {/* Sample Name Input */}
              <div className="glass rounded-xl p-4 mb-6">
                <label className="block text-xs font-semibold text-dark/60 uppercase tracking-wider mb-2">
                  Sample Name / <span className="font-arabic">اسم العينة</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Jerash Organic EVOO"
                  value={sampleName}
                  onChange={(e) => setSampleName(e.target.value)}
                  className="w-full bg-white/50 border border-dark/10 rounded-lg px-4 py-2.5 text-dark placeholder-dark/30 font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 1. Live Camera */}
                <div className="glass rounded-2xl p-6 text-center flex flex-col items-center justify-between min-h-[340px]">
                  <div className="w-full">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-display text-lg font-bold text-dark text-left">
                        📷 Live UV Camera
                      </h3>
                      <span className="font-arabic text-xs text-accent">الكاميرا الحية</span>
                    </div>

                    <div className="relative aspect-video w-full bg-black/5 rounded-xl overflow-hidden mb-4 border border-dark/5 flex items-center justify-center">
                      {stream ? (
                        <video
                          ref={videoRef}
                          autoPlay
                          playsInline
                          muted
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="p-6 text-center">
                          <span className="text-4xl block mb-2">💡</span>
                          <p className="text-xs text-dark/50">
                            Place your olive oil sample in the UV light box and activate the camera feed.
                          </p>
                        </div>
                      )}
                      
                      {cameraError && (
                        <div className="absolute inset-0 bg-white/95 flex items-center justify-center p-4">
                          <p className="text-xs text-danger font-medium">{cameraError}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="w-full">
                    {stream ? (
                      <div className="flex gap-2">
                        <button
                          onClick={captureImage}
                          className="flex-1 py-3 rounded-xl gradient-olive text-white font-semibold shadow-md hover:shadow-lg transition-all active:scale-95"
                        >
                          ⚡ Capture & Analyze
                        </button>
                        <button
                          onClick={stopCamera}
                          className="px-4 py-3 rounded-xl border border-dark/10 hover:bg-dark/5 text-dark transition-all"
                        >
                          Stop
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={startCamera}
                        className="w-full py-3 rounded-xl gradient-gold text-white font-semibold shadow-md hover:shadow-lg transition-all active:scale-95"
                      >
                        🎥 Start Camera Feed
                      </button>
                    )}
                  </div>
                </div>

                {/* 2. File Upload / Drag-and-Drop */}
                <div
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  className={`glass rounded-2xl p-6 text-center flex flex-col items-center justify-between min-h-[340px] border-2 border-dashed transition-all ${
                    dragOver ? 'border-primary bg-primary/5 scale-[1.01]' : 'border-dark/10 hover:border-primary/40'
                  }`}
                >
                  <div className="w-full flex flex-col items-center">
                    <div className="flex items-center justify-between mb-4 w-full">
                      <h3 className="font-display text-lg font-bold text-dark text-left">
                        📁 Upload Image File
                      </h3>
                      <span className="font-arabic text-xs text-accent">تحميل ملف صورة</span>
                    </div>

                    <div className="py-10 flex flex-col items-center justify-center">
                      <span className="text-5xl mb-4 transition-transform block">📤</span>
                      <p className="text-sm font-medium text-dark/70 mb-1">
                        Drag and drop your sample image here
                      </p>
                      <p className="text-xs text-dark/40 mb-4">
                        Supports JPEG, PNG or BMP files under 4MB
                      </p>
                      
                      <label className="cursor-pointer px-4 py-2 bg-white hover:bg-dark/5 border border-dark/10 rounded-lg text-xs font-semibold text-dark/70 shadow-sm transition-all active:scale-95">
                        Browse Files
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleFileUpload}
                        />
                      </label>
                    </div>
                  </div>

                  <div className="w-full bg-dark/5 rounded-xl p-3 text-left">
                    <p className="text-[10px] text-dark/50 leading-relaxed">
                      💡 <strong>Tip:</strong> Crop the image to focus on the oil bottle or vial, ensuring clear visibility under fluorescent/UV lighting for optimal Custom Vision accuracy.
                    </p>
                  </div>
                </div>
              </div>

              {/* Hidden canvas for capturing video frames */}
              <canvas ref={canvasRef} className="hidden" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
