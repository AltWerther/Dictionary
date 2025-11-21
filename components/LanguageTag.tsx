import React from 'react';
import { Language } from '../types';

interface LanguageTagProps {
  lang: Language | string;
  className?: string;
}

export const LanguageTag: React.FC<LanguageTagProps> = ({ lang, className = '' }) => {
  const getStyles = (l: string) => {
    switch (l) {
      case 'EN':
      case 'english':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'DE':
      case 'german':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'CN':
      case 'chinese':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const label = lang === Language.CN ? 'CN' : lang === Language.DE ? 'DE' : lang === Language.EN ? 'EN' : lang;

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${getStyles(lang.toString())} ${className}`}>
      {label}
    </span>
  );
};
