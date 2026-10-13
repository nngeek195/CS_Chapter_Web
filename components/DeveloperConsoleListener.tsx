'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

export default function DeveloperConsoleListener() {
  const router = useRouter();
  const pathname = usePathname();
  const [showToast, setShowToast] = useState(false);
  const isRedirectingRef = useRef(false);
  const wasOpenRef = useRef(false);

  useEffect(() => {
    const isSecretPage = pathname === '/developers' || pathname?.startsWith('/developers');

    // Styled console banners
    const printDeveloperMessage = (isTeleporting = false) => {
      const line = '═'.repeat(60);
      const subLine = '─'.repeat(60);

      console.log(
        `%c\n` +
        `╔${line}╗\n` +
        `║        🚀 IEEE CS SUSL · CONTACT THE DEVELOPERS           ║\n` +
        `╚${line}╝\n\n` +
        `%c👋 Hey curious developer! Looking under the hood?\n` +
        `You discovered our secret developer chamber!\n\n` +
        `┌${subLine}┐\n` +
        `│ 👨‍💻 LEAD DEVELOPER: Niranga Nayanajith                       │\n` +
        `│ 🔗 LinkedIn: https://www.linkedin.com/in/niranga-nayanajith/ │\n` +
        `├${subLine}┤\n` +
        `│ 👩‍💻 FRONT END DEVELOPER: Kaveesha Sandeepani                 │\n` +
        `│ 🔗 LinkedIn: https://www.linkedin.com/in/kaveesha-sandeepani/│\n` +
        `└${subLine}┘\n\n` +
        (isTeleporting
          ? `%c✨ Teleporting to the Secret Developer Chamber (/developers)... Hang on!\n`
          : `%c⭐ Welcome to the Secret Developer Chamber! Connect with us on LinkedIn.\n`),
        'color: #00629B; font-size: 13px; font-weight: bold; font-family: monospace;',
        'color: #FF6C0C; font-size: 13px; font-weight: 600; font-family: monospace;',
        'color: #00629B; font-size: 13px; font-weight: bold; font-style: italic; font-family: monospace;'
      );
    };

    if (isSecretPage) {
      // If already on the developers secret page, show the welcome banner once and do not redirect
      printDeveloperMessage(false);
      return;
    }

    const triggerRedirect = () => {
      if (isRedirectingRef.current) return;
      if (pathname === '/developers' || pathname?.startsWith('/developers')) return;

      const lastRedirect = sessionStorage.getItem('devtools_last_redirect');
      const now = Date.now();
      // 8 second cooldown between redirects
      if (lastRedirect && now - Number(lastRedirect) < 8000) {
        return;
      }

      isRedirectingRef.current = true;
      sessionStorage.setItem('devtools_last_redirect', String(now));
      sessionStorage.setItem('devtools_portal_visited', 'true');

      // Print contact information to console
      printDeveloperMessage(true);

      // Show sleek floating toast notification
      setShowToast(true);

      // Smoothly navigate to the secret page
      setTimeout(() => {
        router.push('/developers');
        setTimeout(() => {
          setShowToast(false);
          isRedirectingRef.current = false;
        }, 1500);
      }, 500);
    };

    // 1. Keyboard shortcuts for opening devtools / console
    const handleKeyDown = (e: KeyboardEvent) => {
      // F12
      if (e.key === 'F12') {
        triggerRedirect();
        return;
      }

      // Check common devtools shortcuts
      const isCmdOrCtrl = e.ctrlKey || e.metaKey;
      if (isCmdOrCtrl && e.shiftKey) {
        const k = e.key.toUpperCase();
        // I = Inspect/Devtools, J = Console, C = Inspect Element, K = Firefox Web Console
        if (k === 'I' || k === 'J' || k === 'C' || k === 'K') {
          triggerRedirect();
        }
      }
    };

    // 2. Viewport threshold check (detects docked DevTools opening)
    const threshold = 160;
    const checkDimensions = () => {
      const widthDiff = window.outerWidth - window.innerWidth > threshold;
      const heightDiff = window.outerHeight - window.innerHeight > threshold;
      const isOpen = widthDiff || heightDiff;

      if (isOpen && !wasOpenRef.current) {
        wasOpenRef.current = true;
        triggerRedirect();
      } else if (!isOpen) {
        wasOpenRef.current = false;
      }
    };

    // 3. Getter inspection check (evaluates when browser console panel renders)
    try {
      const element = new Image();
      Object.defineProperty(element, 'id', {
        get: function () {
          triggerRedirect();
          return 'ieee-devs';
        },
      });
      console.log('%c', element);
    } catch (e) {
      // Ignored if browser restricts getters
    }

    // Initial check on page load if opened initially
    const initialWidthDiff = window.outerWidth - window.innerWidth > threshold;
    const initialHeightDiff = window.outerHeight - window.innerHeight > threshold;
    if (initialWidthDiff || initialHeightDiff) {
      wasOpenRef.current = true;
      if (!sessionStorage.getItem('devtools_portal_visited')) {
        triggerRedirect();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', checkDimensions);

    const intervalId = setInterval(checkDimensions, 800);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', checkDimensions);
      clearInterval(intervalId);
    };
  }, [pathname, router]);

  if (!showToast) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: '24px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 999999,
        background: 'rgba(6, 19, 29, 0.95)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255, 108, 12, 0.6)',
        borderRadius: '999px',
        padding: '12px 24px',
        color: '#ffffff',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4), 0 0 25px rgba(255, 108, 12, 0.25)',
        fontSize: '14px',
        fontWeight: 600,
        fontFamily: 'Montserrat, sans-serif',
        animation: 'fadeIn 0.3s ease-out forwards',
        pointerEvents: 'none',
      }}
    >
      <span
        style={{
          width: '10px',
          height: '10px',
          borderRadius: '50%',
          background: '#FF6C0C',
          boxShadow: '0 0 10px #FF6C0C',
          display: 'inline-block',
        }}
      />
      <span>Console Opened · Contact the Developers 🚀 Moving to Secret Chamber...</span>
    </div>
  );
}
