import ReactDOM from "react-dom/client";
import App from "./App";

function init(config?: any) {
  // Find the CMS modal (replace selector with your CMS modal class)
  const cmsModal = document.querySelector<HTMLElement>('.cms-modal-selector');
  if (!cmsModal) {
    console.warn('[VENN] CMS modal not found');
    return;
  }

  // Only inject once
  if (cmsModal.querySelector('#venn-widget-root')) return;

  // Create container and mount the React component
  const mount = document.createElement("div");
  mount.id = "venn-widget-root";
  mount.style.display = "inline-block";
  cmsModal.appendChild(mount);

  // Prevent clicks from bubbling up and closing CMS modal
  mount.addEventListener('click', (e) => e.stopPropagation());

  const root = ReactDOM.createRoot(mount);
  root.render(<App {...config} />);
}

(window as any).VennWidget = { init };
