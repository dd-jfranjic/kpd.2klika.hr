'use client';

import { useState, useEffect } from 'react';
import { Search, CheckCircle, Loader2 } from 'lucide-react';

interface Result {
  code: string;
  title: string;
  confidence: number;
  selected?: boolean;
}

const mockResults: Result[] = [
  {
    code: '69.20',
    title: 'Računovodstvene i knjigovodstvene djelatnosti',
    confidence: 98,
    selected: true,
  },
  {
    code: '69.10',
    title: 'Pravne djelatnosti',
    confidence: 72,
  },
  {
    code: '70.22',
    title: 'Savjetovanje u vezi s poslovanjem',
    confidence: 65,
  },
];

const searchText = 'Knjigovodstvene usluge za malu tvrtku';

export function HeroMockupAnimated() {
  const [phase, setPhase] = useState<'typing' | 'loading' | 'results'>('typing');
  const [typedText, setTypedText] = useState('');
  const [visibleResults, setVisibleResults] = useState(0);
  const [showCheck, setShowCheck] = useState(false);

  // Typing animation
  useEffect(() => {
    if (phase !== 'typing') return;

    if (typedText.length < searchText.length) {
      const timeout = setTimeout(() => {
        setTypedText(searchText.slice(0, typedText.length + 1));
      }, 50 + Math.random() * 50); // Variable typing speed for realism
      return () => clearTimeout(timeout);
    } else {
      // Typing complete, wait then start loading
      const timeout = setTimeout(() => {
        setPhase('loading');
      }, 500);
      return () => clearTimeout(timeout);
    }
  }, [phase, typedText]);

  // Loading phase
  useEffect(() => {
    if (phase !== 'loading') return;

    const timeout = setTimeout(() => {
      setPhase('results');
    }, 1500);
    return () => clearTimeout(timeout);
  }, [phase]);

  // Results appearing one by one
  useEffect(() => {
    if (phase !== 'results') return;

    if (visibleResults < mockResults.length) {
      const timeout = setTimeout(() => {
        setVisibleResults(prev => prev + 1);
      }, 400);
      return () => clearTimeout(timeout);
    } else {
      // All results shown, show check after delay
      const timeout = setTimeout(() => {
        setShowCheck(true);
      }, 600);
      return () => clearTimeout(timeout);
    }
  }, [phase, visibleResults]);

  // Reset animation cycle
  useEffect(() => {
    if (!showCheck) return;

    const timeout = setTimeout(() => {
      // Reset everything for next cycle
      setPhase('typing');
      setTypedText('');
      setVisibleResults(0);
      setShowCheck(false);
    }, 4000); // Wait 4 seconds before restarting

    return () => clearTimeout(timeout);
  }, [showCheck]);

  return (
    <div className="kpd-hero__visual">
      <div className="kpd-hero__mockup">
        <div className="kpd-hero__mockup-header">
          <span className="kpd-hero__mockup-dot kpd-hero__mockup-dot--red"></span>
          <span className="kpd-hero__mockup-dot kpd-hero__mockup-dot--yellow"></span>
          <span className="kpd-hero__mockup-dot kpd-hero__mockup-dot--green"></span>
        </div>
        <div className="kpd-hero__mockup-content">
          <div className="kpd-mockup-inner">
            {/* Search Input */}
            <div className="kpd-mockup-search">
              <Search className="kpd-mockup-search__icon" />
              <span className="kpd-mockup-search__text">
                {typedText}
                {phase === 'typing' && (
                  <span className="kpd-mockup-cursor">|</span>
                )}
              </span>
            </div>

            {/* Loading State */}
            {phase === 'loading' && (
              <div className="kpd-mockup-loading">
                <Loader2 className="kpd-mockup-loading__spinner" />
                <span className="kpd-mockup-loading__text">AI analizira opis...</span>
              </div>
            )}

            {/* Results */}
            {phase === 'results' && (
              <div className="kpd-mockup-results">
                {mockResults.slice(0, visibleResults).map((result, index) => (
                  <div
                    key={result.code}
                    className={`kpd-mockup-result ${result.selected ? 'kpd-mockup-result--selected' : ''}`}
                    style={{
                      animationDelay: `${index * 0.1}s`,
                      opacity: 0,
                      animation: 'kpd-result-appear 0.4s ease-out forwards'
                    }}
                  >
                    <div className="kpd-mockup-result__code">{result.code}</div>
                    <div className="kpd-mockup-result__info">
                      <span className="kpd-mockup-result__title">{result.title}</span>
                      <span className="kpd-mockup-result__confidence">{result.confidence}% pouzdanost</span>
                    </div>
                    {result.selected && showCheck && (
                      <CheckCircle className="kpd-mockup-result__check" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Floating notification - only show when check is visible */}
      {showCheck && (
        <div className="kpd-hero__notification kpd-hero__notification--animated">
          <div className="kpd-hero__notification-icon">
            <CheckCircle size={20} />
          </div>
          <div className="kpd-hero__notification-content">
            <span className="kpd-hero__notification-label">Status klasifikacije</span>
            <span className="kpd-hero__notification-text">Uspješno klasificirano (KPD 69.20)</span>
          </div>
        </div>
      )}
    </div>
  );
}
