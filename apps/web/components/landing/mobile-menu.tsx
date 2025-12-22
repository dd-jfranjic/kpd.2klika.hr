'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Menu,
  X,
  Sparkles,
  ChevronRight,
  LayoutDashboard,
  HelpCircle,
  Mail,
  ExternalLink,
  Building2,
  LogIn,
  UserPlus,
} from 'lucide-react';
import {
  ConditionalSignedIn,
  ConditionalSignedOut,
} from '@/components/auth/auth-wrapper';

const navLinks = [
  { href: '#features', label: 'Značajke', icon: Sparkles },
  { href: '#how-it-works', label: 'Kako radi', icon: ChevronRight },
  { href: '#pricing', label: 'Cijene', icon: ChevronRight },
  { href: '#faq', label: 'FAQ', icon: HelpCircle },
];

export function MobileMenu() {
  const [isOpen, setIsOpen] = useState(false);

  // Lock body scroll when menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Close menu on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, []);

  const closeMenu = () => setIsOpen(false);

  return (
    <>
      {/* Hamburger Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="kpd-mobile-menu__trigger"
        aria-label="Otvori meni"
        aria-expanded={isOpen}
      >
        <Menu className="w-6 h-6" />
      </button>

      {/* Overlay */}
      <div
        className={`kpd-mobile-menu__overlay ${isOpen ? 'kpd-mobile-menu__overlay--active' : ''}`}
        onClick={closeMenu}
        aria-hidden="true"
      />

      {/* Menu Panel */}
      <div
        className={`kpd-mobile-menu ${isOpen ? 'kpd-mobile-menu--open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label="Mobilni izbornik"
      >
        {/* Header */}
        <div className="kpd-mobile-menu__header">
          <Link href="/" className="kpd-logo" onClick={closeMenu}>
            <div className="kpd-logo__icon">
              <span>KPD</span>
            </div>
            <div className="kpd-logo__text-group">
              <span className="kpd-logo__text">AI KPD Klasifikator</span>
              <span className="kpd-logo__subtext">created by 2klika</span>
            </div>
          </Link>
          <button
            onClick={closeMenu}
            className="kpd-mobile-menu__close"
            aria-label="Zatvori meni"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Auth Section - At Top */}
        <div className="kpd-mobile-menu__auth">
          <ConditionalSignedOut>
            <Link
              href="/login"
              className="kpd-mobile-menu__auth-btn kpd-mobile-menu__auth-btn--outline"
              onClick={closeMenu}
            >
              <LogIn className="w-5 h-5" />
              Prijava
            </Link>
            <Link
              href="/register"
              className="kpd-mobile-menu__auth-btn kpd-mobile-menu__auth-btn--primary"
              onClick={closeMenu}
            >
              <UserPlus className="w-5 h-5" />
              Registracija
            </Link>
          </ConditionalSignedOut>
          <ConditionalSignedIn>
            <Link
              href="/dashboard"
              className="kpd-mobile-menu__auth-btn kpd-mobile-menu__auth-btn--primary kpd-mobile-menu__auth-btn--full"
              onClick={closeMenu}
            >
              <LayoutDashboard className="w-5 h-5" />
              Dashboard
              <ChevronRight className="w-5 h-5 ml-auto" />
            </Link>
          </ConditionalSignedIn>
        </div>

        {/* Navigation Links */}
        <nav className="kpd-mobile-menu__nav">
          <div className="kpd-mobile-menu__section-title">Navigacija</div>
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="kpd-mobile-menu__link"
              onClick={closeMenu}
            >
              <link.icon className="w-5 h-5 text-primary-600" />
              <span>{link.label}</span>
              <ChevronRight className="w-4 h-4 ml-auto text-gray-400" />
            </a>
          ))}
        </nav>

        {/* Divider */}
        <div className="kpd-mobile-menu__divider" />

        {/* Quick Links */}
        <div className="kpd-mobile-menu__quick">
          <div className="kpd-mobile-menu__section-title">Brzi linkovi</div>
          <Link
            href="/faq"
            className="kpd-mobile-menu__link"
            onClick={closeMenu}
          >
            <HelpCircle className="w-5 h-5 text-primary-600" />
            <span>Sva česta pitanja</span>
            <ChevronRight className="w-4 h-4 ml-auto text-gray-400" />
          </Link>
          <a
            href="mailto:info@2klika.hr"
            className="kpd-mobile-menu__link"
            onClick={closeMenu}
          >
            <Mail className="w-5 h-5 text-primary-600" />
            <span>info@2klika.hr</span>
            <ExternalLink className="w-4 h-4 ml-auto text-gray-400" />
          </a>
          <a
            href="https://2klika.hr"
            target="_blank"
            rel="noopener noreferrer"
            className="kpd-mobile-menu__link"
            onClick={closeMenu}
          >
            <ExternalLink className="w-5 h-5 text-primary-600" />
            <span>www.2klika.hr</span>
            <ExternalLink className="w-4 h-4 ml-auto text-gray-400" />
          </a>
        </div>

        {/* Footer - Company Info */}
        <div className="kpd-mobile-menu__footer">
          <div className="kpd-mobile-menu__company">
            <Building2 className="w-5 h-5 text-primary-600" />
            <div className="kpd-mobile-menu__company-info">
              <strong>2 KLIKA</strong>
              <span>Obrt za promidžbu i računalne djelatnosti</span>
              <span>vl. Josip Franjić</span>
              <span>OIB: 99991580018</span>
            </div>
          </div>
          <div className="kpd-mobile-menu__legal">
            <Link href="/privacy" onClick={closeMenu}>Privatnost</Link>
            <span>•</span>
            <Link href="/terms" onClick={closeMenu}>Uvjeti</Link>
          </div>
        </div>
      </div>
    </>
  );
}

export default MobileMenu;
