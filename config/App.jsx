import React, { lazy, Suspense } from "react";

const Component = lazy(() => import(COMPONENT_ENTRY));

const App = (outerProps) => {
  return (
    <Suspense fallback={null}>
      <Component {...outerProps}></Component>
    </Suspense>
  );
}

export default App
