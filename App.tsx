import React, { useState, useRef } from 'react';
import { MagnifyingGlassIcon, BookOpenIcon, ArrowPathIcon, XMarkIcon, MicrophoneIcon, StopIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import { lookupWord, transcribeAudio } from './services/geminiService';
import { DictionaryResponse } from './types';
import { EntryCard } from './components/EntryCard';

function App() {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<DictionaryResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Voice Input State
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  const performSearch = async (term: string) => {
    if (!term.trim()) return;
    
    setQuery(term);
    setLoading(true);
    setError(null);
    setResult(null);
    
    // Dismiss mobile keyboard
    inputRef.current?.blur();

    try {
      const data = await lookupWord(term);
      setResult(data);
    } catch (err) {
      console.error(err);
      setError("Could not find a definition. Please check your connection or try a simpler term.");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    performSearch(query);
  };

  const clearSearch = () => {
    setQuery('');
    setResult(null);
    setError(null);
    inputRef.current?.focus();
  };

  const getSupportedMimeType = () => {
    // iOS Safari requires audio/mp4, usually does not support webm.
    // Chrome supports webm.
    const types = [
      'audio/mp4',
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg'
    ];
    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }
    return ''; // Let browser use default if nothing matches
  };

  const startRecording = async () => {
    setError(null);
    try {
      // Audio: true is usually enough, but sometimes explicitly requesting echoCancellation helps mobile quality
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { 
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      
      const mimeType = getSupportedMimeType();
      const options = mimeType ? { mimeType } : undefined;

      const recorder = new MediaRecorder(stream, options);
      const chunks: BlobPart[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = async () => {
        // Stop all tracks to release mic explicitly on iOS
        stream.getTracks().forEach(track => track.stop());

        if (chunks.length === 0) {
            setIsRecording(false);
            return;
        }

        // Use the mimeType we determined, or fallback to recorder.mimeType if we let browser choose
        const finalMimeType = mimeType || recorder.mimeType || 'audio/mp4';
        const blob = new Blob(chunks, { type: finalMimeType });
        
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = async () => {
            const resultString = reader.result as string;
            // Guard against empty reads
            if (!resultString || !resultString.includes(',')) {
                setError("Audio processing failed.");
                setLoading(false);
                return;
            }

            const base64String = resultString.split(',')[1];
            
            setLoading(true);
            try {
                const text = await transcribeAudio(base64String, finalMimeType);
                const trimmedText = text?.trim();
                
                if (trimmedText) {
                    performSearch(trimmedText);
                } else {
                    setError("Could not understand audio. Please try again.");
                    setLoading(false); 
                }
            } catch (err) {
                console.error("Transcription error", err);
                setError("Error processing audio.");
                setLoading(false); 
            }
        };
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      setError("Microphone access denied. Please check your permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center py-6 sm:py-12 px-4 sm:px-6 lg:px-8 font-sans">
      
      <div className="w-full max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8 sm:mb-10">
            <div className="flex justify-center mb-4">
                <div className="p-3 bg-white rounded-2xl shadow-md border border-slate-100">
                    <BookOpenIcon className="w-8 h-8 sm:w-10 sm:h-10 text-brand-600" />
                </div>
            </div>
            <h1 className="text-2xl sm:text-4xl font-bold text-slate-900 tracking-tight mb-2">
            Tri-Lingual Dictionary
            </h1>
            <p className="text-slate-500 text-base sm:text-lg">
            Deutsch • English • 中文
            </p>
        </div>

        {/* Search Input */}
        <div className="relative w-full max-w-2xl mx-auto mb-8 sm:mb-12">
            <form onSubmit={handleSearch} className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <MagnifyingGlassIcon className="h-5 w-5 sm:h-6 sm:w-6 text-slate-400 group-focus-within:text-brand-500 transition-colors" />
                </div>
                <input
                    ref={inputRef}
                    type="text"
                    inputMode="search"
                    enterKeyHint="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className={`block w-full pl-10 sm:pl-12 pr-32 sm:pr-36 py-3 sm:py-4 rounded-xl sm:rounded-2xl border-slate-200 bg-white shadow-lg shadow-slate-200/50 text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-brand-500 focus:border-transparent focus:outline-none text-lg sm:text-xl transition-all duration-200 ease-in-out ${isRecording ? 'ring-2 ring-red-500 border-red-500' : ''}`}
                    placeholder={isRecording ? "Listening..." : "Enter a word..."}
                    autoFocus
                    autoComplete="off"
                    autoCapitalize="none"
                />
                
                <div className="absolute inset-y-0 right-0 pr-2 flex items-center gap-1">
                    {query && (
                        <button
                            type="button"
                            onClick={clearSearch}
                            className="hidden sm:flex items-center justify-center text-slate-400 hover:text-slate-600 p-2 rounded-full hover:bg-slate-100 transition-colors"
                            aria-label="Clear search"
                        >
                            <XMarkIcon className="h-5 w-5" />
                        </button>
                    )}
                    
                    <button
                        type="button"
                        onClick={toggleRecording}
                        className={`flex items-center justify-center p-2 rounded-full transition-all duration-200 ${isRecording ? 'bg-red-100 text-red-600 hover:bg-red-200 animate-pulse' : 'text-slate-400 hover:text-brand-600 hover:bg-slate-100'}`}
                        aria-label={isRecording ? "Stop recording" : "Start recording"}
                    >
                        {isRecording ? (
                            <StopIcon className="h-5 w-5" />
                        ) : (
                            <MicrophoneIcon className="h-5 w-5" />
                        )}
                    </button>

                    <div className="h-6 w-px bg-slate-200 mx-1"></div>

                    <button
                        type="submit"
                        disabled={!query.trim() || loading}
                        className="flex items-center justify-center p-2 rounded-full text-brand-500 hover:text-brand-700 hover:bg-brand-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        aria-label="Search"
                    >
                        <ArrowRightIcon className="h-5 w-5 sm:h-6 sm:w-6" />
                    </button>
                </div>
            </form>
            
            {/* Suggestions or Helper Text */}
            {!result && !loading && !error && !isRecording && (
                 <div className="mt-4 text-center">
                    <p className="text-sm text-slate-400">
                      Try: <button onClick={() => performSearch('Zeitgeist')} className="text-brand-600 hover:underline px-1">Zeitgeist</button> 
                      <button onClick={() => performSearch('Serendipity')} className="text-brand-600 hover:underline px-1">Serendipity</button> 
                      <button onClick={() => performSearch('危机')} className="text-brand-600 hover:underline px-1">危机</button>
                    </p>
                 </div>
            )}
             {isRecording && (
                 <div className="mt-4 text-center">
                    <p className="text-sm text-red-500 font-medium animate-pulse">
                      Listening... tap stop when done.
                    </p>
                 </div>
            )}
        </div>

        {/* Loading State */}
        {loading && (
            <div className="flex flex-col items-center justify-center py-8 sm:py-12">
                <ArrowPathIcon className="w-8 h-8 sm:w-10 sm:h-10 text-brand-500 animate-spin mb-4" />
                <p className="text-slate-500 font-medium animate-pulse text-sm sm:text-base">Consulting the linguist AI...</p>
            </div>
        )}

        {/* Error State */}
        {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center max-w-2xl mx-auto">
                <p className="text-red-600 font-medium">{error}</p>
                <button onClick={() => performSearch(query)} className="mt-4 text-red-700 hover:text-red-800 font-medium underline">
                    Try Again
                </button>
            </div>
        )}

        {/* Results */}
        {result && !loading && (
            <div className="animate-fade-in-up pb-8">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 px-2 gap-2">
                    <h2 className="text-xl sm:text-2xl font-bold text-slate-800 truncate">
                        Results for <span className="text-brand-600">"{result.sourceTerm}"</span>
                    </h2>
                    <span className="self-start sm:self-auto px-3 py-1 rounded-full bg-slate-200 text-slate-600 text-xs font-bold uppercase tracking-wide whitespace-nowrap">
                        Detected: {result.detectedLanguage}
                    </span>
                </div>

                <div className="space-y-6">
                    {result.entries.map((entry, idx) => (
                        <EntryCard key={idx} entry={entry} index={idx} />
                    ))}
                </div>

                <div className="mt-12 pt-8 border-t border-slate-200 text-center">
                    <p className="text-xs text-slate-400">
                        Translations generated by Gemini 2.5 Flash. Accuracy may vary.
                    </p>
                </div>
            </div>
        )}
      </div>
    </div>
  );
}

export default App;