'use client';

import { useEffect } from 'react';

/**
 * Microsoft Clarity analytics snippet.
 *
 * Set NEXT_PUBLIC_CLARITY_PROJECT_ID in .env.local to enable.
 * Clarity provides session recordings, heatmaps, andrage analysis
 * — invaluable for understanding how staff interact with the CRM.
 *
 * GDPR: Clarity auto-masks input fields by default (passwords, emails in forms).
 * No cookies are set for users who don't interact.
 */

const CLARITY_ID = process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID;

export function MicrosoftClarity() {
  useEffect(() => {
    if (!CLARITY_ID || typeof window === 'undefined') return;

    // Prevent double-injection (React StrictMode, hot reloads)
    if (document.getElementById('ms-clarity-script')) return;

    const script = document.createElement('script');
    script.id = 'ms-clarity-script';
    script.innerHTML = `
      (function(c,l,a,r,i,t,y){
        c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
        t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
        y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
      })(window, document, "clarity", "script", "${CLARITY_ID}");
    `;
    document.head.appendChild(script);
  }, []);

  return null;
}