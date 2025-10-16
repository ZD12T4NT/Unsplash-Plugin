import ReactDOM from "react-dom/client";
import App from "./App"; // your Unsplash UI component

function init(config?: any) {
  const mount = document.createElement("div");
  mount.id = "venn-widget-root";
  document.body.appendChild(mount);
  const root = ReactDOM.createRoot(mount);
  root.render(<App {...config} />);
}

(window as any).VennWidget = { init };
