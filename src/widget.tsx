import ReactDOM from "react-dom/client";
import App from "./App"; // your Unsplash UI component

function init(config?: any) {
  // Find the CMS Image field
  const field = document.querySelector<HTMLElement>(
    '.dev-module-field[data-module-fieldid="Image"]'
  );

  if (!field) {
    console.warn('[VENN] CMS field not found');
    return;
  }

  // Find the "or select from library" button
  const libraryBtn = field.querySelector<HTMLElement>('.toggle-gallery');

  if (!libraryBtn) {
    console.warn('[VENN] Library button not found');
    return;
  }

  // Only inject once
  if (field.querySelector('#venn-widget-root')) return;

  // Create container and mount the React component
  const mount = document.createElement("div");
  mount.id = "venn-widget-root";
  mount.style.display = "inline-block"; // optional styling
  libraryBtn.insertAdjacentElement('afterend', mount);

  const root = ReactDOM.createRoot(mount);
  root.render(<App {...config} />);
}

(window as any).VennWidget = { init };
