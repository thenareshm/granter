import { useEffect, useState } from 'react';
import { Button } from './Button';

export interface ProjectFile {
  id: string;
  name: string;
}

interface ProjectContextModalProps {
  isOpen: boolean;
  files: ProjectFile[];
  initialSelected: string[];
  onClose: () => void;
  onAttach: (selected: string[]) => void;
}

export const ProjectContextModal = ({
  isOpen,
  files,
  initialSelected,
  onClose,
  onAttach,
}: ProjectContextModalProps) => {
  const [selected, setSelected] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen) {
      setSelected(initialSelected);
    }
  }, [isOpen, initialSelected]);

  const toggleSelection = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const handleAttach = () => {
    onAttach(selected);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-card">
        <div className="mb-2 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Attach Project Context</h2>
            <p className="text-sm text-slate-600">
              Select one or more reference files from your Google Drive project folder.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100"
            aria-label="Close modal"
          >
            ×
          </button>
        </div>

        <div className="max-h-80 space-y-2 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50/70 p-3">
          {files.map((file) => (
            <label
              key={file.id}
              className="flex cursor-pointer items-start gap-3 rounded-lg bg-white px-3 py-2 text-sm shadow-sm transition hover:border-brand-100 hover:shadow"
            >
              <input
                type="checkbox"
                checked={selected.includes(file.id)}
                onChange={() => toggleSelection(file.id)}
                className="mt-1 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
              />
              <span className="text-slate-800">{file.name}</span>
            </label>
          ))}
          {files.length === 0 && (
            <div className="text-sm text-slate-500">No files available.</div>
          )}
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleAttach}>
            Attach
          </Button>
        </div>
      </div>
    </div>
  );
};
