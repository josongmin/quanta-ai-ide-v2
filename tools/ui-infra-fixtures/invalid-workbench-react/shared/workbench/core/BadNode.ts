// Fixture (invalid): kernel core reverse-depends on React. Trips workbenchReactImport.
import { useState } from 'react';

export function bad() {
  return useState(0);
}
