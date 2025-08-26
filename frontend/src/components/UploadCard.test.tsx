import { render, screen, fireEvent, createEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { UploadCard } from './UploadCard';

test('renders upload instructions', () => {
  render(<UploadCard onFileSelect={() => {}} />);
  expect(
    screen.getByText(/Arraste ou selecione um arquivo XML da NF-e/i)
  ).toBeInTheDocument();
});

test('calls handler on XML file drop', () => {
  const handleSelect = vi.fn();
  render(<UploadCard onFileSelect={handleSelect} />);
  const dropZone = screen.getByText(/Arraste ou selecione/).parentElement!;
  const file = new File(['<xml></xml>'], 'test.xml', { type: 'text/xml' });
  fireEvent.drop(dropZone, { dataTransfer: { files: [file] } });
  expect(handleSelect).toHaveBeenCalledWith(file);
});

test('ignores non-XML files on drop', () => {
  const handleSelect = vi.fn();
  render(<UploadCard onFileSelect={handleSelect} />);
  const dropZone = screen.getByText(/Arraste ou selecione/).parentElement!;
  const file = new File(['content'], 'test.txt', { type: 'text/plain' });
  fireEvent.drop(dropZone, { dataTransfer: { files: [file] } });
  expect(handleSelect).not.toHaveBeenCalled();
});

test('prevents default on drag over', () => {
  const prevent = vi.fn();
  const stop = vi.fn();
  render(<UploadCard onFileSelect={() => {}} />);
  const dropZone = screen.getByText(/Arraste ou selecione/).parentElement!;
  const event = createEvent.dragOver(dropZone);
  Object.assign(event, { preventDefault: prevent, stopPropagation: stop });
  fireEvent(dropZone, event);
  expect(prevent).toHaveBeenCalled();
  expect(stop).toHaveBeenCalled();
});
