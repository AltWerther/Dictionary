import React from 'react';
import { DictionaryEntry, Language } from '../types';
import { LanguageTag } from './LanguageTag';
import { SpeakerWaveIcon } from '@heroicons/react/24/outline';

interface EntryCardProps {
  entry: DictionaryEntry;
  index: number;
}

export const EntryCard: React.FC<EntryCardProps> = ({ entry, index }) => {
  
  // Helper to speak text (simple browser TTS)
  const speak = (text: string, lang: string) => {
    if ('speechSynthesis' in window) {
      // Cancel any current speech
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      // Map common codes
      const langMap: Record<string, string> = {
        'en': 'en-US',
        'de': 'de-DE',
        'cn': 'zh-CN'
      };
      utterance.lang = langMap[lang] || lang;
      
      // On iOS, sometimes rate needs adjustment or voice needs selection, 
      // but defaults are usually safest for simple implementations.
      utterance.rate = 0.9; 
      
      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-6 transition-all hover:shadow-md">
      {/* Header: Definition & POS */}
      <div className="bg-slate-50 px-4 sm:px-6 py-3 border-b border-slate-100 flex items-start sm:items-center justify-between gap-2">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 w-full">
            <div className="flex items-center gap-2 mb-1 sm:mb-0">
              <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-slate-200 text-slate-600 text-xs font-bold">
                  {index + 1}
              </span>
              <span className="italic text-slate-500 font-medium text-sm sm:text-base">{entry.partOfSpeech}</span>
            </div>
            <span className="text-slate-700 font-medium border-l-0 sm:border-l border-slate-300 sm:pl-3 text-sm sm:text-base leading-snug">
              {entry.definition}
            </span>
        </div>
      </div>

      {/* Languages Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-100">
        
        {/* German */}
        <div className="p-4 sm:p-5 group relative">
            <div className="flex justify-between items-start mb-2">
                <LanguageTag lang={Language.DE} />
                <button 
                  onClick={() => speak(entry.german.word, 'de')} 
                  className="text-slate-400 hover:text-brand-600 transition-colors p-2 -mr-2 -mt-2 active:scale-95 touch-manipulation"
                  aria-label="Listen to German pronunciation"
                >
                    <SpeakerWaveIcon className="w-5 h-5" />
                </button>
            </div>
            <div className="mb-1">
                <span className="text-xl font-serif font-bold text-slate-900 break-words">
                    {entry.german.gender && <span className="text-sm font-sans font-normal text-slate-500 mr-1 italic">{entry.german.gender}</span>}
                    {entry.german.word}
                </span>
            </div>
             {entry.german.context && <p className="text-xs text-slate-500 mb-3">({entry.german.context})</p>}
             <p className="text-sm text-slate-600 mt-4 border-t border-slate-100 pt-2 italic leading-relaxed">
                "{entry.example.de}"
             </p>
        </div>

        {/* English */}
        <div className="p-4 sm:p-5 group relative">
            <div className="flex justify-between items-start mb-2">
                <LanguageTag lang={Language.EN} />
                <button 
                  onClick={() => speak(entry.english.word, 'en')} 
                  className="text-slate-400 hover:text-brand-600 transition-colors p-2 -mr-2 -mt-2 active:scale-95 touch-manipulation"
                  aria-label="Listen to English pronunciation"
                >
                    <SpeakerWaveIcon className="w-5 h-5" />
                </button>
            </div>
            <div className="mb-1">
                <span className="text-xl font-serif font-bold text-slate-900 break-words">{entry.english.word}</span>
            </div>
            {entry.english.pronunciation && <p className="text-xs text-slate-400 font-mono mb-3">/{entry.english.pronunciation}/</p>}
            {entry.english.context && <p className="text-xs text-slate-500 mb-3">({entry.english.context})</p>}
            <p className="text-sm text-slate-600 mt-4 border-t border-slate-100 pt-2 italic leading-relaxed">
                "{entry.example.en}"
             </p>
        </div>

        {/* Chinese */}
        <div className="p-4 sm:p-5 group relative">
            <div className="flex justify-between items-start mb-2">
                <LanguageTag lang={Language.CN} />
                <button 
                  onClick={() => speak(entry.chinese.word, 'cn')} 
                  className="text-slate-400 hover:text-brand-600 transition-colors p-2 -mr-2 -mt-2 active:scale-95 touch-manipulation"
                  aria-label="Listen to Chinese pronunciation"
                >
                    <SpeakerWaveIcon className="w-5 h-5" />
                </button>
            </div>
            <div className="mb-1">
                <span className="text-2xl font-sc font-bold text-slate-900 break-words">{entry.chinese.word}</span>
            </div>
            <p className="text-sm text-slate-500 font-medium mb-3">{entry.chinese.pronunciation}</p>
            {entry.chinese.context && <p className="text-xs text-slate-500 mb-3">({entry.chinese.context})</p>}
            <p className="text-sm text-slate-600 mt-4 border-t border-slate-100 pt-2 italic leading-relaxed">
                "{entry.example.cn}"
             </p>
        </div>

      </div>
    </div>
  );
};