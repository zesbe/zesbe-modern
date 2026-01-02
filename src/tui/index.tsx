import React from "react";
import { render } from "ink";
import { App } from "./App";

export function startTUI() {
  const { waitUntilExit } = render(<App />);
  return waitUntilExit();
}

export { App };
