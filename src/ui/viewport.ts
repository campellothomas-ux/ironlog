/** Safari's keyboard can resize the visual viewport without changing dvh. */
export function observeViewport(): void {
  const viewport=window.visualViewport;
  if(!viewport)return;
  const update=()=>{
    // Ignore pinch zoom: users must retain browser magnification.
    if(viewport.scale!==1)return;
    document.documentElement.style.setProperty('--visual-height',`${viewport.height}px`);
  };
  viewport.addEventListener('resize',update);update();
}
