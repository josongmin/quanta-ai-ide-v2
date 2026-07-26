import type { Preview } from '@storybook/react-vite';
import { UIRuntimeProvider } from '../src/shared/ui/runtime/UIRuntimeProvider';
import '../src/index.css';

const preview: Preview = {
  decorators: [
    (Story) => (
      <UIRuntimeProvider>
        <Story />
      </UIRuntimeProvider>
    ),
  ],
  parameters: {
    a11y: { test: 'error' },
    backgrounds: { disable: true },
    layout: 'fullscreen',
  },
};

export default preview;
