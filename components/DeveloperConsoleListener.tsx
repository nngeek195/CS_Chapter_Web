'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

// The developer page path
const DEV_PAGE_PATH = '/login/developer';

/**
 * DeveloperConsoleListener
 *
 * Prints developer contact information in the browser console when devtools
 * are opened. Does NOT redirect or navigate the user away from their current
 * page — it only logs a styled message so curious developers can discover the
 * team's LinkedIn profiles.
 */
export default function DeveloperConsoleListener() {
  const pathname = usePathname();
  const hasPrintedRef = useRef(false);

  useEffect(() => {
    const isDevPage =
      pathname === DEV_PAGE_PATH || pathname?.startsWith(DEV_PAGE_PATH);

    // Styled console banner
    const printDeveloperMessage = () => {
      const line = '═'.repeat(60);
      const subLine = '─'.repeat(60);

      console.log(
        `%c\n` +
          `╔${line}╗\n` +
          `║        🚀 IEEE CS SUSL · CONTACT THE DEVELOPERS           ║\n` +
          `╚${line}╝\n\n` +
          `%c👋 Hey curious developer! Looking under the hood?\n` +
          `Nice to see you here!\n\n` +
          `┌${subLine}┐\n` +
          `│ 👨‍💻 LEAD DEVELOPER: Niranga Nayanajith                       │\n` +
          `│ 🔗 LinkedIn: https://www.linkedin.com/in/niranga-nayanajith/ │\n` +
          `├${subLine}┤\n` +
          `│ 👩‍💻 FRONT END DEVELOPER: Kaveesha Sandeepani                 │\n` +
          `│ 🔗 LinkedIn: https://www.linkedin.com/in/kaveesha-sandeepani/│\n` +
          `└${subLine}┘\n\n` +
          `%c⭐ Feel free to connect with us on LinkedIn!\n`,
        'color: #00629B; font-size: 13px; font-weight: bold; font-family: monospace;',
        'color: #FF6C0C; font-size: 13px; font-weight: 600; font-family: monospace;',
        'color: #00629B; font-size: 13px; font-weight: bold; font-style: italic; font-family: monospace;',
      );
    };

    // If on the developer page, print the banner once
    if (isDevPage) {
      printDeveloperMessage();
      return;
    }

    // On other pages, use the getter-inspection technique to print contact
    // info ONLY inside the console — no redirects, no navigation, no toast.
    if (!hasPrintedRef.current) {
      try {
        const element = new Image();
        Object.defineProperty(element, 'id', {
          get: function () {
            if (!hasPrintedRef.current) {
              hasPrintedRef.current = true;
              printDeveloperMessage();
            }
            return 'ieee-devs';
          },
        });
        console.log('%c', element);
      } catch {
        // Ignored if browser restricts getters
      }
    }

    // No keyboard listeners, no viewport checks, no resize watchers,
    // no redirects — just the console message.
  }, [pathname]);

  // This component renders nothing to the DOM
  return null;
}
