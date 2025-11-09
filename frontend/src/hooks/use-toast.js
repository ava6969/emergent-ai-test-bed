import { useState, useCallback } from 'react';

let globalToast = null;

export function useToast() {
  const [toasts, setToasts] = useState([]);

  const toast = useCallback((props) => {
    const id = Date.now();
    const newToast = { id, ...props };
    
    setToasts((prev) => [...prev, newToast]);
    
    // Auto dismiss after 3 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
    
    // Also use browser alert for now (can be improved with toast component)
    if (props.variant === 'destructive') {
      console.error(props.title, props.description);
    } else {
      console.log(props.title, props.description);
    }
  }, []);

  globalToast = toast;

  return { toast, toasts };
}

// Export for use without hook
export const toast = (props) => {
  if (globalToast) {
    globalToast(props);
  }
};
