import React, { Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { BrowserRouter } from 'react-router-dom';
import AnimatedCursor from 'react-animated-cursor';
import Progress from './Components/Progress';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <AnimatedCursor
      innerSize={8}
      outerSize={15}
      color="255, 255, 255"
      outerAlpha={0.2}
      innerScale={0.7}
      outerScale={5}
      clickables={[
        "a",
        'input[type="text"]',
        'input[type="email"]',
        'input[type="number"]',
        'input[type="submit"]',
        'input[type="image"]',
        "label[for]",
        "select",
        "textarea",
        "button",
        ".link",
      ]}
    />
    <BrowserRouter>
      <Suspense fallback={<Progress />}>
        <App />
      </Suspense>
    </BrowserRouter>
  </React.StrictMode>
);