import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { UploadCloud, X, AlertCircle, ImagePlus } from 'lucide-react';
import { predictImage } from '../api/client';
import type { PredictionResult } from '../types';

type UploadStatus = 'idle' | 'preview' | 'loading' | 'error';

export default function Analyze() {
  const [status, setStatus]       = useState<UploadStatus>('idle');
  const [file, setFile]           = useState<File | null>(null);
  const [preview, setPreview]     = useState<string | null>(null);
  const [error, setError]         = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const inputRef  = useRef<HTMLInputElement>(null);
  const navigate  = useNavigate();

  const acceptedTypes = ['image/jpeg', 'image/jpg', 'image/png'];

  const handleFile = (f: File) => {
    if (!acceptedTypes.includes(f.type)) {
      setError('Only JPG and PNG images are accepted.');
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
      const result: PredictionResult = await predictImage(file);
      // Persist to localStorage so Result page can read it
      localStorage.setItem('zaytoun_result', JSON.stringify(result));
      navigate('/result');
    } catch (err: unknown) {
      let msg = 'Unable to reach the analysis server. Please make sure the backend is running on port 8000.';
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

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-14">
      {/* Page header */}
      <div className="text-center mb-10">
        <h1 className="text-3xl font-extrabold text-gray-900 mb-2">Analyze your olive oil</h1>
        <p className="text-gray-500 text-sm max-w-sm mx-auto">
          Upload a UV-light photo of your sample. The AI will extract fluorescence features and return a purity verdict.
        </p>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mb-6 flex items-start gap-3 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm fade-in">
          <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Drop zone */}
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

        {/* Idle / dragging state */}
        {(status === 'idle') && (
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
        {(status === 'preview') && preview && (
          <div className="p-6 flex flex-col items-center gap-5 fade-in">
            <div className="relative group">
              <img
                src={preview}
                alt="UV sample preview"
                className="rounded-xl max-h-64 object-contain shadow-card border border-gray-100"
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
          <div className="flex flex-col items-center justify-center gap-4 py-16 px-8 fade-in">
            <div className="w-14 h-14 rounded-full border-4 border-olive-200 border-t-olive-500 spin" />
            <div className="text-center">
              <p className="text-sm font-semibold text-gray-700">Analyzing fluorescence patterns...</p>
              <p className="text-xs text-gray-400 mt-1">Extracting 26 image features</p>
            </div>
          </div>
        )}
      </div>

      {/* Action buttons */}
      {status === 'preview' && (
        <div className="mt-6 flex flex-col sm:flex-row gap-3 fade-in">
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

      {/* Scientific Image Processing Pipeline */}
      <div className="mt-8 card shadow-card">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">🔬 Image Processing Pipeline</h3>
        <div className="flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
          {/* Node 1 */}
          <div className="flex items-center justify-center px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg font-medium text-gray-600 w-full md:w-auto text-center">
            📸 Your Captured Photo
          </div>
          {/* Arrow */}
          <div className="hidden md:block text-gray-300 font-bold">──➔</div>
          <div className="md:hidden text-gray-300 font-bold">⬇</div>
          {/* Node 2 */}
          <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg font-medium text-green-700 w-full md:w-auto">
            <span className="w-2.5 h-2.5 rounded bg-green-500 flex-shrink-0" />
            <span><strong>Step 1:</strong> Crop to Liquid Layer</span>
          </div>
          {/* Arrow */}
          <div className="hidden md:block text-gray-300 font-bold">──➔</div>
          <div className="md:hidden text-gray-300 font-bold">⬇</div>
          {/* Node 3 */}
          <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg font-medium text-red-700 w-full md:w-auto">
            <span className="w-2.5 h-2.5 rounded bg-red-500 flex-shrink-0" />
            <span><strong>Step 2:</strong> Mask for Red Pixels</span>
          </div>
          {/* Arrow */}
          <div className="hidden md:block text-gray-300 font-bold">──➔</div>
          <div className="md:hidden text-gray-300 font-bold">⬇</div>
          {/* Node 4 */}
          <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg font-medium text-blue-700 w-full md:w-auto">
            <span className="flex-shrink-0 font-bold text-[10px] bg-blue-500 text-white w-4 h-4 rounded-full flex items-center justify-center">123</span>
            <span><strong>Step 3:</strong> Compute Mean Values</span>
          </div>
        </div>
      </div>

      {/* Tips */}
      <div className="mt-8 card shadow-card">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">📸 Tips for best results</h3>
        <ul className="space-y-2 text-xs text-gray-500">
          <li className="flex items-start gap-2"><span className="text-olive-400 font-bold mt-0.5">•</span> Use a 365 nm UV lamp for optimal fluorescence.</li>
          <li className="flex items-start gap-2"><span className="text-olive-400 font-bold mt-0.5">•</span> Darken the room — ambient light dilutes the fluorescence signal.</li>
          <li className="flex items-start gap-2"><span className="text-olive-400 font-bold mt-0.5">•</span> Fill about 50% of the frame with the oil sample.</li>
          <li className="flex items-start gap-2"><span className="text-olive-400 font-bold mt-0.5">•</span> Avoid motion blur — steady the phone against a surface.</li>
          <li className="flex items-start gap-2"><span className="text-olive-400 font-bold mt-0.5">•</span> A clear glass or petri dish works best as a container.</li>
        </ul>
      </div>
    </div>
  );
}
