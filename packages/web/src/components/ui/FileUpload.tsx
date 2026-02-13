import { useCallback, useState } from 'react';
import { Upload, X, FileText } from 'lucide-react';
import { Button } from './Button';

interface FileUploadProps {
  accept?: string;
  onChange: (file: File | null) => void;
  value?: File | null;
  label?: string;
  error?: string;
  maxSizeMB?: number;
}

export function FileUpload({ accept, onChange, value, label, error, maxSizeMB = 10 }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [sizeError, setSizeError] = useState('');

  const validateAndSet = useCallback(
    (file: File | null) => {
      setSizeError('');
      if (file && file.size > maxSizeMB * 1024 * 1024) {
        setSizeError(`File size exceeds ${maxSizeMB}MB limit`);
        return;
      }
      onChange(file);
    },
    [onChange, maxSizeMB]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) {
        validateAndSet(file);
      }
    },
    [validateAndSet]
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0] || null;
      validateAndSet(file);
    },
    [validateAndSet]
  );

  const clearFile = useCallback(() => {
    onChange(null);
  }, [onChange]);

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
          {label}
        </label>
      )}

      {value ? (
        <div className="glass-panel flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-primary-500" />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              {value.name}
            </span>
            <span className="text-xs text-gray-500">
              ({(value.size / 1024).toFixed(1)} KB)
            </span>
          </div>
          <Button variant="ghost" size="sm" onClick={clearFile}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      ) : (
        <label
          className={`
            block w-full p-6 rounded-xl cursor-pointer transition-all duration-200
            border-2 border-dashed
            ${isDragging
              ? 'border-primary-500 bg-primary-50/50 dark:bg-primary-900/20'
              : 'border-gray-300 dark:border-gray-600 hover:border-primary-400 dark:hover:border-primary-500'
            }
            ${error ? 'border-red-500/50' : ''}
          `}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <input
            type="file"
            accept={accept}
            onChange={handleFileChange}
            className="hidden"
          />
          <div className="flex flex-col items-center gap-2">
            <Upload className="w-8 h-8 text-gray-400" />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Drop a file here or click to browse
            </span>
            {accept && (
              <span className="text-xs text-gray-500">
                Accepted: {accept}
              </span>
            )}
          </div>
        </label>
      )}

      {(error || sizeError) && (
        <p className="mt-1.5 text-sm text-red-500 dark:text-red-400">{error || sizeError}</p>
      )}
    </div>
  );
}
