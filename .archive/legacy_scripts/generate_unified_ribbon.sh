#!/bin/bash
sed -n '944,2035p' src/modules/editor/components/EditorPanel.tsx > ribbon.txt

cat << 'INNER_EOF' > test_ribbon.tsx
import React from 'react';
export const Test = () => {
  return (
    <>
INNER_EOF

cat ribbon.txt >> test_ribbon.tsx

cat << 'INNER_EOF' >> test_ribbon.tsx
    </>
  );
};
INNER_EOF

npx tsc --noEmit --jsx react test_ribbon.tsx
