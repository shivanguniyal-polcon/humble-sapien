import { useEffect, useState } from 'react';

// Whether the reader has asked the operating system for less motion.
//
// Both the background field and the output timeline animate, and both have to
// stop when this preference is on. Reading it once at mount is not enough: a
// reader can change the setting while the page is open, so the media query is
// watched for changes and the hook re-renders when it flips.

export const useReducedMotion = () => {
  const [reduce, setReduce] = useState(false);

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const read = () => setReduce(query.matches);
    read();
    query.addEventListener('change', read);
    return () => query.removeEventListener('change', read);
  }, []);

  return reduce;
};
