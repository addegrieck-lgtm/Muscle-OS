export const INTRO_SEEN_KEY = "lumeance.intro.seen";

/** Script inline (dans <head>) : décide AVANT le premier rendu si l'intro doit être jouée. */
export const INTRO_BOOT_SCRIPT = `try{var d=document.documentElement;if(location.pathname==='/'&&d.classList.contains('js-motion')&&!sessionStorage.getItem('${INTRO_SEEN_KEY}')&&!/[?&]intro=0/.test(location.search))d.classList.add('intro-on')}catch(e){}`;
