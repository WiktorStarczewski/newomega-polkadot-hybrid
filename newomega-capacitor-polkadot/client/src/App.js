import * as Sentry from "@sentry/react";
import { Integrations } from "@sentry/tracing";
import './App.css';
import OmegaApp from './OmegaApp';


window.oncontextmenu = function() { return false; }

document.addEventListener('deviceready', () => {
  window.screen.orientation.lock('landscape');
  document.addEventListener('backbutton', () => {
  }, false);
});

Sentry.init({
  dsn: "https://adf39eeb31a04f4c9e2ae1613a647396@o509705.ingest.sentry.io/5604612",
  debug: true,
  autoSessionTracking: true,

  // We recommend adjusting this value in production, or using tracesSampler
  // for finer control
  tracesSampleRate: 1.0,
});

function App() {
  return (
    <div className="App">
      <OmegaApp/>
    </div>
  );
}

export default App;
