// Inline pre-render script that applies a stored theme before first paint. Shared by the layout
// (injected as an inline script) and the coexistence page (which publishes its CSP hash).
export const themeSnippet = 'try{var t=localStorage.getItem("iv-theme");if(t==="light"||t==="dark"||t==="system")document.documentElement.setAttribute("data-iv-theme",t)}catch(e){}';
