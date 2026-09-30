import React from "react";
import ReactDOM from "react-dom/client";
import "./styles/tokens.css";
import "./styles/global.css";
import "./styles/ui-tokens.css";
import "./styles/ui-governance.css";
import App from "./App";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
