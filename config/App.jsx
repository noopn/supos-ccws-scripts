import React, { lazy, Suspense } from "react";

const Component = lazy(() => import(COMPONENT_ENTRY));

window.scriptUtil = scriptUtil;

const App = (outerProps) => {
  return (
    <Suspense fallback={null}>
      <Component {...outerProps}></Component>
    </Suspense>
  );
};

export default App;
