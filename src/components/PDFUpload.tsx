import React, { useCallback } from 'react';
import { Upload, FileText } from 'lucide-react';

interface PDFUploadProps {
  onFileUpload: (file: File) => void;
  isUploading: boolean;
}

export default function PDFUpload({ onFileUpload, isUploading }: PDFUploadProps) {
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files.length > 0 && files[0].type === 'application/pdf') {
      onFileUpload(files[0]);
    }
  }, [onFileUpload]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0 && files[0].type === 'application/pdf') {
      onFileUpload(files[0]);
    }
  }, [onFileUpload]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="max-w-md w-full mx-4">
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          className="border-4 border-dashed border-blue-300 rounded-lg p-12 text-center hover:border-blue-400 transition-colors bg-white"
        >
          <div className="flex flex-col items-center space-y-4">
            <div className="p-4 bg-blue-100 rounded-full">
              {isUploading ? (
                <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
              ) : (
                <Upload className="h-8 w-8 text-blue-500" />
              )}
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">
                {isUploading ? 'Loading PDF...' : 'Upload Your PDF'}
              </h3>
              <p className="text-gray-600 mb-4">
                Drag and drop your PDF file here, or click to browse
              </p>
              <div className="flex items-center justify-center text-sm text-gray-500">
                <FileText className="h-4 w-4 mr-1" />
                <span>PDF files only</span>
              </div>
            </div>
            {!isUploading && (
              <label className="cursor-pointer">
                <span className="inline-flex items-center px-6 py-3 bg-blue-500 text-white font-medium rounded-lg hover:bg-blue-600 transition-colors">
                  Choose File
                </span>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleFileInput}
                  className="hidden"
                />
              </label>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}