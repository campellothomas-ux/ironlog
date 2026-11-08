/** Safari's keyboard can resize the visual viewport without changing dvh. */
export function observeViewport(): void {
  const viewport=window.visualViewport;
  if(!viewport)return;
  const update=()=>{
    // Do not resize the app to a magnified Safari viewport if accessibility overrides zoom limits.
    if(viewport.scale!==1)return;
    document.documentElement.style.setProperty('--visual-height',`${viewport.height}px`);
  };
  viewport.addEventListener('resize',update);update();
}
