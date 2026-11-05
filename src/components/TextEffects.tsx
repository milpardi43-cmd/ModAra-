import { useEffect } from 'react';

const TEXT_SELECTOR = 'main h1, main h2, main h3, main p, main blockquote, footer h3, footer p';
const HEADING_SELECTOR = 'main h1, main h2, footer h3';

/** Applies one restrained editorial reveal to text as it enters the viewport. */
export default function TextEffects() {
  useEffect(() => {
    if (
      typeof IntersectionObserver === 'undefined' ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return;
    }

    let sequence = 0;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('text-effect-visible');
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -36px 0px' },
    );

    const observeText = (root: ParentNode) => {
      const elements = [...root.querySelectorAll<HTMLElement>(TEXT_SELECTOR)];
      if (root instanceof HTMLElement && root.matches(TEXT_SELECTOR)) elements.unshift(root);

      elements.forEach((element) => {
        if (
          element.dataset.textEffectReady ||
          element.closest('[aria-hidden="true"], [data-no-text-effect]')
        ) {
          return;
        }

        if (element.tagName === 'P' && Number.parseFloat(getComputedStyle(element).fontSize) < 14) {
          return;
        }

        element.dataset.textEffectReady = 'true';
        element.classList.add(
          element.matches(HEADING_SELECTOR) ? 'text-effect-heading' : 'text-effect-copy',
        );
        element.style.setProperty('--text-effect-delay', `${Math.min(sequence * 24, 144)}ms`);
        sequence += 1;
        observer.observe(element);
      });
    };

    observeText(document);
    const mutationObserver = new MutationObserver((records) => {
      records.forEach((record) => {
        record.addedNodes.forEach((node) => {
          if (node instanceof Element || node instanceof DocumentFragment) observeText(node);
        });
      });
    });
    mutationObserver.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      mutationObserver.disconnect();
    };
  }, []);

  return null;
}
