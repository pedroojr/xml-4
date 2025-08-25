import { render, screen } from '@testing-library/react';
import { UploadCard } from './UploadCard';

test('renders upload instructions', () => {
  render(<UploadCard onFileSelect={() => {}} />);
  expect(
    screen.getByText(/Arraste ou selecione um arquivo XML da NF-e/i)
  ).toBeInTheDocument();
});
