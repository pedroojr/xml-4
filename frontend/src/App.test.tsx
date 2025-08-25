import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';

vi.mock('@/services/api', () => ({
  statusAPI: {
    getStatus: vi.fn().mockResolvedValue({ ok: true })
  },
  nfeAPI: {
    getAll: vi.fn().mockResolvedValue([]),
    save: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    getById: vi.fn()
  }
}));

test('renders navbar brand', () => {
  const queryClient = new QueryClient();
  render(
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  );
  expect(screen.getByText(/NFE Import/i)).toBeInTheDocument();
});
