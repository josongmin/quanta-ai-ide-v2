import type { Meta, StoryObj } from '@storybook/react-vite';
import { Modal } from './Modal';

const meta = {
  title: 'Shared/UI/Modal',
  component: Modal,
  args: {
    open: true,
    onClose: () => undefined,
    ariaLabel: 'Example dialog',
    children: (
      <div className="p-5">
        <h2 className="text-lg font-bold">Example dialog</h2>
        <button type="button" className="mt-4 rounded border px-3 py-2">Primary action</button>
      </div>
    ),
  },
} satisfies Meta<typeof Modal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Open: Story = {};
