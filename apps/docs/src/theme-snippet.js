// Inline pre-render script: applies a stored theme before first paint and marks the document as
// script-enabled (`docs-js`) so entrance animations only hide content when they will actually run.
// Shared by the layout (inline script) and the coexistence page (publishes its CSP hash).
export const themeSnippet = 'try{document.documentElement.classList.add("docs-js");var t=localStorage.getItem("iv-theme");if(t==="light"||t==="dark"||t==="system")document.documentElement.setAttribute("data-iv-theme",t)}catch(e){}';
