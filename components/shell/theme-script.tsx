// Aplica o modo (claro/escuro) e a moldura do aluno antes de a página aparecer: sem «piscar» e sem a página a saltar para o lado.
// Usado uma só vez, no <head> de app/layout.tsx; vale para todas as páginas, com ou sem sessão.
const SCRIPT =
  "try{var d=document.documentElement,t=localStorage.getItem('tw-tema');if(t==='dark'||t==='light')d.dataset.theme=t;if(localStorage.getItem('tw-shell')==='aluno')d.dataset.shell='aluno'}catch(e){}"

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: SCRIPT }} />
}
