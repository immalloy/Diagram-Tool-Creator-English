// Undo/Redo history hook
const { useState, useRef, useCallback, useEffect } = React;

function useHistory(initial){
  const [state, setState] = useState(() => {
    try {
      const saved = localStorage.getItem('sankaku_saved_data');
      if (saved) {
        return { ...initial, ...JSON.parse(saved) };
      }
    } catch(e) {
      console.warn('Failed to parse saved data', e);
    }
    return initial;
  });
  const pastRef = useRef([]);
  const futureRef = useRef([]);
  const [, force] = useState(0);

  useEffect(() => {
    const tm = setTimeout(() => {
      try {
        localStorage.setItem('sankaku_saved_data', JSON.stringify(state));
      } catch(e) {}
    }, 500);
    return () => clearTimeout(tm);
  }, [state]);

  const set = useCallback((updater, opts = {}) => {
    setState(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      if (next === prev) return prev;
      if (!opts.skipHistory){
        pastRef.current.push(prev);
        if (pastRef.current.length > 80) pastRef.current.shift();
        futureRef.current = [];
        force(x=>x+1);
      }
      return next;
    });
  }, []);

  const undo = useCallback(()=>{
    setState(prev => {
      if (pastRef.current.length === 0) return prev;
      const last = pastRef.current.pop();
      futureRef.current.push(prev);
      force(x=>x+1);
      return last;
    });
  },[]);

  const redo = useCallback(()=>{
    setState(prev => {
      if (futureRef.current.length === 0) return prev;
      const next = futureRef.current.pop();
      pastRef.current.push(prev);
      force(x=>x+1);
      return next;
    });
  },[]);

  const reset = useCallback((value)=>{
    pastRef.current = [];
    futureRef.current = [];
    setState(value);
    force(x=>x+1);
  },[]);

  return {
    state, set, undo, redo, reset,
    canUndo: pastRef.current.length>0,
    canRedo: futureRef.current.length>0,
  };
}

window.useHistory = useHistory;