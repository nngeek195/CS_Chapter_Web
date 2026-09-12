'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Logo from '../images/logo.png';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    // Clear any previously stored dark theme
    try {
      document.body.classList.remove('dark');
      localStorage.removeItem('ieeecs-theme');
    } catch (e) {}

    // Scroll listener
    const handleScroll = () => {
      setScrolled(window.scrollY > 24);
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Do not show the common header on the admin dashboard
  if (pathname?.startsWith('/admin')) {
    return null;
  }

  const navLinks = [
    { name: 'Home', href: '/' },
    { name: 'About', href: '/about' },
    { name: 'Events', href: '/events' },
    { name: 'Leadership', href: '/leadership' },
    { name: 'Resources', href: '/resources' },
    { name: 'Membership', href: '/membership' },
    { name: 'Gallery', href: '/gallery' },
    { name: 'Contact', href: '/contact' },
  ];

  return (
    <>
      <header className={`site-head ${scrolled ? 'scrolled' : ''}`}>
        <div className="container nav-inner">
          <Link href="/" className="brand" aria-label="IEEE CS SUSL Chapter Home">
            <img
              src={Logo.src}
              alt="IEEE Computer Society SUSL Logo"
              className="brand-logo"
            />
          </Link>

          <nav className="nav-links">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={isActive ? 'active' : ''}
                >
                  {link.name}
                </Link>
              );
            })}
          </nav>

          <div className="nav-actions">
            <button
              className="menu-btn"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Open menu"
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? '✕' : '☰'}
            </button>
          </div>
        </div>
      </header>

      <div className={`mobile-menu ${mobileMenuOpen ? 'open' : ''}`}>
        <Link
          href="/"
          className="mobile-brand"
          onClick={() => setMobileMenuOpen(false)}
        >
          <img
            src="/images/logo.png"
            alt="IEEE Computer Society SUSL Logo"
            className="brand-logo"
          />
          <span className="brand-name">IEEE CS · SUSL</span>
        </Link>
        {navLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            onClick={() => setMobileMenuOpen(false)}
            className={pathname === link.href ? 'active' : ''}
          >
            {link.name}
          </Link>
        ))}
      </div>
    </>
  );
}
