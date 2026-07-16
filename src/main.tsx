
  import { createRoot } from "react-dom/client";
  import { HelmetProvider } from 'react-helmet-async';
  import App from "./app/App.tsx";
  import { ErrorBoundary } from "./app/components/ErrorBoundary";
  import "./styles/index.css";

  createRoot(document.getElementById("root")!).render(
    <HelmetProvider>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </HelmetProvider>
  );
  