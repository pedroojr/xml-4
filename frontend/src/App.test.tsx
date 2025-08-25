import { render, screen } from '@testing-library/react';
import App from './App';

vi.mock('@/services/api', () => ({
  statusAPI: {
    getStatus: vi.fn().mockResolvedValue({ ok: true })
  }
}));

test('renders navbar brand', () => {
  render(<App />);
  expect(screen.getByText(/NFE Import/i)).toBeInTheDocument();
});

