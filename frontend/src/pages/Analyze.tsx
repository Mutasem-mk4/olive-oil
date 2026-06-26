import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UploadCloud, X, AlertCircle, ImagePlus, Sun, Zap, Play, Activity } from 'lucide-react';
import { fetchModelInfo, predictImage } from '../api/client';
import type { ModelInfo, PredictionResult } from '../types';

type UploadStatus = 'idle' | 'preview' | 'loading' | 'error';
type LightingMode = 'uv' | 'blue' | 'flash';

const MODES: {
  id: LightingMode;
  label: string;
  sublabel: string;
  icon: React.ReactNode;
  confidence: string;
  color: string;
  selectedBg: string;
}[] = [
  {
    id: 'uv',
    label: '365 nm UV',
    sublabel: 'Best accuracy',
    icon: <Zap size={18} />,
    confidence: 'High Confidence',
    color: 'text-purple-700',
    selectedBg: 'border-purple-500 bg-purple-50',
  },
  {
    id: 'blue',
    label: 'Blue Light',
    sublabel: 'Medium accuracy',
    icon: <Sun size={18} />,
    confidence: 'Medium Confidence',
    color: 'text-blue-600',
    selectedBg: 'border-blue-500 bg-blue-50',
  },
  {
    id: 'flash',
    label: 'Flash / Daylight',
    sublabel: 'Accessibility mode',
    icon: <Sun size={18} />,
    confidence: 'Lower Confidence',
    color: 'text-amber-600',
    selectedBg: 'border-amber-500 bg-amber-50',
  },
];

export default function Analyze() {
  const [status, setStatus]         = useState<UploadStatus>('idle');
  const [file, setFile]             = useState<File | null>(null);
  const [preview, setPreview]       = useState<string | null>(null);
  const [error, setError]           = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [mode, setMode]             = useState<LightingMode>('uv');
  const [modelInfo, setModelInfo]   = useState<ModelInfo | null>(null);

  const inputRef  = useRef<HTMLInputElement>(null);
  const navigate  = useNavigate();

  const acceptedTypes = ['image/jpeg', 'image/jpg', 'image/png'];

  useEffect(() => {
    fetchModelInfo()
      .then(setModelInfo)
      .catch(() => setModelInfo(null));
  }, []);

  const handleFile = (f: File) => {
    if (!acceptedTypes.includes(f.type)) {
      setError('Only JPG, JPEG, and PNG images are accepted.');
      return;
    }
    setError(null);
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setStatus('preview');
  };

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  };

  const onDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  }, []);

  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => setIsDragging(false);

  const clearFile = () => {
    setFile(null);
    setPreview(null);
    setStatus('idle');
    setError(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleSubmit = async () => {
    if (!file) return;
    setStatus('loading');
    setError(null);

    try {
      const result: PredictionResult = await predictImage(file, mode);
      localStorage.setItem('zaytoun_result', JSON.stringify(result));
      navigate('/result');
    } catch (err: unknown) {
      let msg = 'Unable to reach the analysis server. Please try again in a moment.';
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosErr = err as { response?: { data?: { detail?: string } } };
        if (axiosErr.response?.data?.detail) {
          msg = axiosErr.response.data.detail;
        }
      }
      setError(msg);
      setStatus('preview');
    }
  };

  const runDemoSample = () => {
    const demoResult: PredictionResult = {
      valid: true,
      demo: true,
      sample_name: 'Hackathon reference sample',
      raw: { R: 177.4, G: 92.6, B: 44.2 },
      normalized_counts: {
        red_670nm: 695.69,
        green_530nm: 363.14,
        blue_440nm: 173.33,
      },
      fraud_detection: {
        passed: true,
        verdict: 'authentic_evoo',
        label: 'Authentic EVOO profile detected',
        message: 'Demo sample with strong chlorophyll fluorescence and low blue oxidation signal.',
        confidence: 96.2,
      },
      quality_grading: {
        purity_index: 80.08,
        aging_step: 2,
        grade: 'Excellent to Medium Quality',
        description: 'Normal degradation signal. Still suitable as a high-quality olive oil sample.',
        color: 'green',
        green_phenols: 363.14,
        oxidation_marker: 173.33,
      },
      nonzero_pixels: 184920,
      timestamp: new Date().toISOString(),
      model_info: modelInfo ?? undefined,
      azure_custom_vision: {
        enabled: true,
        model_name: 'ZaytounModel',
        top_label: 'pure_evoo',
        confidence: 94.8,
        predictions: [
          { label: 'pure_evoo', confidence: 94.8 },
          { label: 'light_adulteration', confidence: 4.1 },
          { label: 'heavy_adulteration', confidence: 1.1 },
        ],
      },
      fluorescence_classifier: {
        model: 'Physics-informed UV Fluorescence Index Classifier',
        status: 'authentic',
        label: 'Authentic olive oil fluorescence profile',
        confidence: 94.8,
        message: 'Strong chlorophyll fluorescence and low blue oxidation/reflection signal were detected.',
        scores: {
          authentic: 92.4,
          adulterated: 12.8,
        },
        indices: {
          red_blue_ratio: 4.014,
          green_blue_ratio: 2.095,
          chlorophyll_index: 80.08,
        },
      },
      final_decision: {
        status: 'authentic',
        label: 'Authentic olive oil fluorescence profile',
        confidence: 94.8,
        message: 'Strong chlorophyll fluorescence and low blue oxidation/reflection signal were detected. Azure Custom Vision supports the fluorescence-index result.',
        agreement: 'supporting_agreement',
        primary_model: 'Physics-informed UV Fluorescence Index Classifier',
        spectral_group: 'authentic',
        azure_group: 'authentic',
      },
    };

    localStorage.setItem('zaytoun_result', JSON.stringify(demoResult));
    navigate('/result');
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-14">
      {/* Page header */}
      <div className="text-center mb-10">
        <h1 className="text-3xl font-extrabold text-gray-900 mb-2">Analyze your olive oil</h1>
        <p className="text-gray-500 text-sm max-w-sm mx-auto">
          Upload a UV-light photo of your sample. The AI will extract fluorescence features
          and return a purity verdict in seconds.
        </p>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mb-6 flex items-start gap-3 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm animate-fade-in">
          <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <div className="mb-6 card shadow-card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-olive-50 text-olive-500 flex items-center justify-center border border-olive-100">
              <Activity size={20} />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-olive-500">Primary camera model</p>
              <h2 className="text-sm font-bold text-gray-900 mt-0.5">
                {modelInfo?.primary_camera_model?.name || 'Physics-informed UV Fluorescence Index Classifier'}
              </h2>
              <p className="text-xs text-gray-600 mt-1">
                Uses red, green, and blue fluorescence ratios for live UV or flash screening.
              </p>
              {modelInfo?.azure_custom_vision?.enabled && (
                <p className="text-xs text-olive-600 mt-1">
                  Supporting Azure model ready: {modelInfo.azure_custom_vision.published_name}
                </p>
              )}
              {modelInfo?.public_eem_adulteration_model?.loaded && (
                <p className="text-xs text-olive-600 mt-1">
                  Public EEM adulteration model:{' '}
                  {modelInfo.public_eem_adulteration_model.metrics?.holdout_balanced_accuracy
                    ? `${(modelInfo.public_eem_adulteration_model.metrics.holdout_balanced_accuracy * 100).toFixed(1)}% holdout balanced`
                    : modelInfo.public_eem_adulteration_model.selected_model}
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={runDemoSample}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-olive-500 text-white font-bold text-sm hover:bg-olive-600 transition-colors shadow-sm"
          >
            <Play size={15} />
            Run demo sample
          </button>
        </div>
      </div>

      {/* ── Lighting Mode Selector ── */}
      <div className="mb-6 p-5 rounded-2xl border border-gray-100 bg-white shadow-sm">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
          Step 1 — Select your lighting mode
        </p>
        <div className="grid grid-cols-3 gap-2">
          {MODES.map((m) => (
            <button
              key={m.id}
              id={`mode-${m.id}`}
              onClick={() => setMode(m.id)}
              className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all duration-200 text-center cursor-pointer
                ${mode === m.id
                  ? `${m.selectedBg} shadow-sm`
                  : 'border-gray-200 bg-gray-50 hover:bg-gray-100'
                }`}
            >
              <span className={mode === m.id ? m.color : 'text-gray-400'}>{m.icon}</span>
              <span className={`text-xs font-bold ${mode === m.id ? m.color : 'text-gray-600'}`}>
                {m.label}
              </span>
              <span className="text-[10px] text-gray-400 leading-tight">{m.sublabel}</span>
            </button>
          ))}
        </div>
        <p className="text-[10px] text-gray-400 mt-3 text-center">
          {MODES.find((m) => m.id === mode)?.confidence} — algorithm thresholds adjust automatically
        </p>
      </div>

      {/* ── Drop Zone ── */}
      <div className="mb-1">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
          Step 2 — Upload your sample photo
        </p>
      </div>

      <div
        id="dropzone"
        role="button"
        tabIndex={0}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onClick={() => status !== 'loading' && inputRef.current?.click()}
        onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
        className={`
          relative w-full rounded-2xl border-2 border-dashed transition-all duration-200 cursor-pointer
          ${isDragging ? 'dropzone-active' : 'border-gray-200 bg-gray-50 hover:bg-olive-50 hover:border-olive-300'}
          ${status === 'loading' ? 'pointer-events-none opacity-60' : ''}
        `}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".jpg,.jpeg,.png"
          className="hidden"
          onChange={onInputChange}
          id="file-upload"
        />

        {/* Idle state */}
        {status === 'idle' && (
          <div className="flex flex-col items-center justify-center gap-4 py-16 px-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-olive-50 border border-olive-100 flex items-center justify-center text-olive-400">
              <UploadCloud size={28} />
            </div>
            <div>
              <p className="text-base font-semibold text-gray-700">Drop your UV image here or click to upload</p>
              <p className="text-xs text-gray-400 mt-1">Accepted: JPG, JPEG, PNG · Any resolution</p>
            </div>
            <span className="px-4 py-2 rounded-lg border border-olive-200 text-olive-600 text-sm font-medium hover:bg-olive-50 transition-colors">
              Browse files
            </span>
          </div>
        )}

        {/* Preview state */}
        {status === 'preview' && preview && (
          <div className="p-6 flex flex-col items-center gap-5">
            <div className="relative group">
              <img
                src={preview}
                alt="UV sample preview"
                className="rounded-xl max-h-64 object-contain shadow-sm border border-gray-100"
              />
              <button
                onClick={(e) => { e.stopPropagation(); clearFile(); }}
                id="clear-file-btn"
                className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 shadow-sm transition-colors"
                aria-label="Remove image"
              >
                <X size={14} />
              </button>
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-gray-700">{file?.name}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {file ? (file.size / 1024).toFixed(1) : 0} KB · Click to change
              </p>
            </div>
          </div>
        )}

        {/* Loading state */}
        {status === 'loading' && (
          <div className="flex flex-col items-center justify-center gap-4 py-16 px-8">
            <div className="w-14 h-14 rounded-full border-4 border-olive-200 border-t-olive-500 animate-spin" />
            <div className="text-center">
              <p className="text-sm font-semibold text-gray-700">Analyzing UV fluorescence patterns…</p>
              <p className="text-xs text-gray-400 mt-1">Running {MODES.find((m) => m.id === mode)?.label} pipeline</p>
            </div>
          </div>
        )}
      </div>

      {/* Action buttons */}
      {status === 'preview' && (
        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <button
            id="analyze-btn"
            onClick={handleSubmit}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-olive-500 text-white font-bold text-base hover:bg-olive-600 transition-all duration-200 hover:scale-[1.02] shadow-md"
          >
            <ImagePlus size={18} />
            Analyze now
          </button>
          <button
            onClick={clearFile}
            id="clear-btn"
            className="px-5 py-3.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Clear
          </button>
        </div>
      )}

      {/* Scientific pipeline info */}
      <div className="mt-8 card shadow-card">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">🔬 Scientific UV Preprocessing Pipeline</h3>
        <div className="flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center justify-center px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg font-medium text-gray-600 w-full md:w-auto text-center">
            📸 Your Captured Photo
          </div>
          <div className="hidden md:block text-gray-300 font-bold">──➔</div>
          <div className="md:hidden text-gray-300 font-bold">⬇</div>
          <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg font-medium text-green-700 w-full md:w-auto">
            <span className="w-2.5 h-2.5 rounded bg-green-500 flex-shrink-0" />
            <span><strong>Step 1:</strong> Crop Liquid ROI (10–90% margin)</span>
          </div>
          <div className="hidden md:block text-gray-300 font-bold">──➔</div>
          <div className="md:hidden text-gray-300 font-bold">⬇</div>
          <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg font-medium text-red-700 w-full md:w-auto">
            <span className="w-2.5 h-2.5 rounded bg-red-500 flex-shrink-0" />
            <span><strong>Step 2:</strong> Threshold Mask (≥50 brightness)</span>
          </div>
          <div className="hidden md:block text-gray-300 font-bold">──➔</div>
          <div className="md:hidden text-gray-300 font-bold">⬇</div>
          <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg font-medium text-blue-700 w-full md:w-auto">
            <span className="flex-shrink-0 font-bold text-[10px] bg-blue-500 text-white w-4 h-4 rounded-full flex items-center justify-center">μ</span>
            <span><strong>Step 3:</strong> RGB Mean → 0–1000 Counts</span>
          </div>
        </div>
      </div>

      {/* Tips */}
      <div className="mt-8 card shadow-card">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">📸 Tips for best results</h3>
        <ul className="space-y-2 text-xs text-gray-500">
          <li className="flex items-start gap-2"><span className="text-olive-400 font-bold mt-0.5">•</span>Use a 365 nm UV lamp for the highest accuracy (UV mode).</li>
          <li className="flex items-start gap-2"><span className="text-olive-400 font-bold mt-0.5">•</span>Place the sample inside a darkbox to isolate the UV fluorescence signal.</li>
          <li className="flex items-start gap-2"><span className="text-olive-400 font-bold mt-0.5">•</span>Center the vial or bottle in the smartphone camera frame.</li>
          <li className="flex items-start gap-2"><span className="text-olive-400 font-bold mt-0.5">•</span>Ensure the camera focus is sharp on the liquid layer.</li>
          <li className="flex items-start gap-2"><span className="text-olive-400 font-bold mt-0.5">•</span>If UV is unavailable, select Flash/Daylight mode — accuracy is lower but still useful.</li>
        </ul>
      </div>
    </div>
  );
}
