import { javascript } from '@codemirror/lang-javascript';
import { css } from '@codemirror/lang-css';
import { json } from '@codemirror/lang-json';
import { markdown } from '@codemirror/lang-markdown';
import type { Extension } from '@codemirror/state';
import type { FileRecord } from '@entities/repo';

export function languageExtension(file: FileRecord): Extension {
  switch (file.language) {
    case 'ts':
      return javascript({ typescript: true });
    case 'tsx':
      return javascript({ typescript: true, jsx: true });
    case 'js':
      return javascript();
    case 'css':
      return css();
    case 'md':
      return markdown();
    default:
      return json();
  }
}
