export function initHoverEdgeGlow() {
  if (typeof window === 'undefined') return;
  
  // Check if device supports fine pointers (not touch)
  if (window.matchMedia('(pointer: coarse)').matches) return;
  
  let animationFrameId: number | null = null;
  
  const handlePointerMove = (e: Event) => {
    const target = e.currentTarget as HTMLElement;
    if (!target.hasAttribute('data-hover-glow')) return;
    
    // Throttle updates with requestAnimationFrame
    if (animationFrameId) return;
    
    animationFrameId = requestAnimationFrame(() => {
      const rect = target.getBoundingClientRect();
      const x = (e as PointerEvent).clientX - rect.left;
      const y = (e as PointerEvent).clientY - rect.top;
      const width = rect.width;
      const height = rect.height;
      
      // Calculate distances to edges
      const dt = y; // distance to top
      const dr = width - x; // distance to right
      const db = height - y; // distance to bottom
      const dl = x; // distance to left
      
      // Find closest edge
      const distances = [dt, dr, db, dl];
      const edgeIndex = distances.indexOf(Math.min(...distances));
      const edgeNames = ['top', 'right', 'bottom', 'left'];
      
      // Calculate angle for conic gradient
      const centerX = width / 2;
      const centerY = height / 2;
      const angle = Math.atan2(y - centerY, x - centerX) * 180 / Math.PI + 90;
      
      // Set CSS variables
      target.style.setProperty('--mx', `${(x / width) * 100}%`);
      target.style.setProperty('--my', `${(y / height) * 100}%`);
      target.style.setProperty('--angle', `${angle}deg`);
      target.style.setProperty('--intensity', '1');
      target.setAttribute('data-edge', edgeNames[edgeIndex] || 'top');
      
      animationFrameId = null;
    });
  };
  
  const handlePointerLeave = (e: Event) => {
    const target = e.currentTarget as HTMLElement;
    if (!target.hasAttribute('data-hover-glow')) return;
    
    target.style.setProperty('--intensity', '0');
    target.removeAttribute('data-edge');
    
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
  };
  
  // Add event listeners to all elements with data-hover-glow
  const elements = document.querySelectorAll('[data-hover-glow]');
  elements.forEach(el => {
    el.addEventListener('pointermove', handlePointerMove as EventListener);
    el.addEventListener('pointerleave', handlePointerLeave as EventListener);
  });
  
  // Handle dynamically added elements
  const observer = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
      mutation.addedNodes.forEach(node => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const element = node as Element;
          if (element.hasAttribute('data-hover-glow')) {
            element.addEventListener('pointermove', handlePointerMove as EventListener);
            element.addEventListener('pointerleave', handlePointerLeave as EventListener);
          }
          // Also check children
          element.querySelectorAll('[data-hover-glow]').forEach(child => {
            child.addEventListener('pointermove', handlePointerMove as EventListener);
            child.addEventListener('pointerleave', handlePointerLeave as EventListener);
          });
        }
      });
    });
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
  
  // Cleanup function
  return () => {
    observer.disconnect();
    elements.forEach(el => {
      el.removeEventListener('pointermove', handlePointerMove as EventListener);
      el.removeEventListener('pointerleave', handlePointerLeave as EventListener);
    });
  };
}