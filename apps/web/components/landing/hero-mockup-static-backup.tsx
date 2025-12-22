/**
 * BACKUP: Original static hero mockup visual
 * Created: 2025-12-16
 * This is the original static version before animation was added
 */

import { Search, CheckCircle } from 'lucide-react';

export function HeroMockupStaticBackup() {
  return (
    <div className="kpd-hero__visual">
      <div className="kpd-hero__mockup">
        <div className="kpd-hero__mockup-header">
          <span className="kpd-hero__mockup-dot kpd-hero__mockup-dot--red"></span>
          <span className="kpd-hero__mockup-dot kpd-hero__mockup-dot--yellow"></span>
          <span className="kpd-hero__mockup-dot kpd-hero__mockup-dot--green"></span>
        </div>
        <div className="kpd-hero__mockup-content">
          {/* Mockup content - simplified dashboard preview */}
          <div className="kpd-mockup-inner">
            <div className="kpd-mockup-search">
              <Search className="kpd-mockup-search__icon" />
              <span className="kpd-mockup-search__text">Knjigovodstvene usluge...</span>
            </div>
            <div className="kpd-mockup-results">
              <div className="kpd-mockup-result kpd-mockup-result--selected">
                <div className="kpd-mockup-result__code">69.20</div>
                <div className="kpd-mockup-result__info">
                  <span className="kpd-mockup-result__title">Računovodstvene i knjigovodstvene djelatnosti</span>
                  <span className="kpd-mockup-result__confidence">98% pouzdanost</span>
                </div>
                <CheckCircle className="kpd-mockup-result__check" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating notification */}
      <div className="kpd-hero__notification">
        <div className="kpd-hero__notification-icon">
          <CheckCircle size={20} />
        </div>
        <div className="kpd-hero__notification-content">
          <span className="kpd-hero__notification-label">Status klasifikacije</span>
          <span className="kpd-hero__notification-text">Uspješno klasificirano (KPD 69.20)</span>
        </div>
      </div>
    </div>
  );
}
