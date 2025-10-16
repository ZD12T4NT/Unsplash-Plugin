import ReactDOM from "react-dom/client";
import App from "./App";

function init(config?: any) {
  const interval = setInterval(() => {
    const field = document.querySelector<HTMLElement>(
      '.dev-module-field[data-module-fieldid="Image"]'
    );

    const libraryBtn = field?.querySelector<HTMLElement>('.toggle-gallery');

    if (!field || !libraryBtn) {
      console.log('[VENN] Waiting for CMS modal...');
      return;
    }

    clearInterval(interval);

    if (field.querySelector('#venn-widget-root')) return;

    const mount = document.createElement("div");
    mount.id = "venn-widget-root";
    mount.style.display = "inline-block";
    libraryBtn.insertAdjacentElement('afterend', mount);

    mount.addEventListener('click', (e) => e.stopPropagation());

    const root = ReactDOM.createRoot(mount);
    root.render(<App {...config} />);

    console.log('[VENN] Widget injected');
  }, 200); // check every 200ms
}


(window as any).VennWidget = { init };
