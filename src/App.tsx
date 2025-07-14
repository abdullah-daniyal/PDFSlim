import React, { useState } from 'react';
import { useBeforeUnload } from './hooks/useBeforeUnload';
import PDFUpload from './components/PDFUpload';
import Toolbar from './components/Toolbar';
import PDFViewer from './components/PDFViewer';
import ConfirmationModal from './components/ConfirmationModal';
import { downloadHighlightedPDF, downloadCroppedPDF } from './utils/pdfExport';
import { EditorMode, Highlight, CropArea } from './types/pdf';

function App() {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [mode, setMode] = useState<EditorMode>('view');
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [cropArea, setCropArea] = useState<CropArea | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [showResetConfirmation, setShowResetConfirmation] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [selectedHighlightColor, setSelectedHighlightColor] = useState('rgba(255, 255, 0, 0.4)'); // Default yellow

  // Check if user has unsaved changes
  const hasUnsavedChanges = uploadedFile && (highlights.length > 0 || cropArea !== null);
  
  // Prevent accidental page refresh/navigation
  useBeforeUnload(!!hasUnsavedChanges);

  const handleFileUpload = async (file: File) => {
    setIsUploading(true);
    setDownloadError(null);
    
    try {
      // Validate file
      if (!file.type.includes('pdf')) {
        throw new Error('Please select a valid PDF file.');
      }
      
      if (file.size > 50 * 1024 * 1024) { // 50MB limit
        throw new Error('File size too large. Please select a PDF smaller than 50MB.');
      }
      
      // Simulate upload time for better UX
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setUploadedFile(file);
      setHighlights([]);
      setCropArea(null);
      setMode('view');
      setSuccessMessage('PDF loaded successfully! You can now highlight and crop.');
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      console.error('Error uploading file:', error);
      setDownloadError(error instanceof Error ? error.message : 'Failed to upload PDF. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownloadHighlighted = async () => {
    if (!uploadedFile || highlights.length === 0) return;
    
    setIsDownloading(true);
    setDownloadError(null);
    
    try {
      const canvas = document.querySelector('canvas');
      if (!canvas) {
        throw new Error('PDF viewer not ready. Please wait a moment and try again.');
      }
      
      const success = await downloadHighlightedPDF(
        uploadedFile,
        highlights,
        canvas.width,
        canvas.height
      );
      
      if (success) {
        setSuccessMessage('Highlighted PDF downloaded successfully!');
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    } catch (error) {
      console.error('Error downloading highlighted PDF:', error);
      setDownloadError('Failed to download highlighted PDF. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDownloadCropped = async () => {
    if (!uploadedFile || !cropArea) return;
    
    setIsDownloading(true);
    setDownloadError(null);
    
    try {
      const canvas = document.querySelector('canvas');
      if (!canvas) {
        throw new Error('PDF viewer not ready. Please wait a moment and try again.');
      }
      
      const success = await downloadCroppedPDF(
        uploadedFile,
        cropArea,
        highlights,
        canvas.width,
        canvas.height,
        currentPage
      );
      
      if (success) {
        setSuccessMessage('Cropped PDF downloaded successfully!');
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    } catch (error) {
      console.error('Error downloading cropped PDF:', error);
      setDownloadError('Failed to download cropped PDF. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleResetClick = () => {
    if (hasUnsavedChanges) {
      setShowResetConfirmation(true);
    } else {
      handleReset();
    }
  };

  const handleConfirmReset = () => {
    setShowResetConfirmation(false);
    handleReset();
  };

  const handleCancelReset = () => {
    setShowResetConfirmation(false);
  };

  const handleReset = () => {
    setUploadedFile(null);
    setHighlights([]);
    setCropArea(null);
    setMode('view');
    setDownloadError(null);
    setSuccessMessage(null);
  };

  // Success message component
  const SuccessDisplay = ({ message, onDismiss }: { message: string; onDismiss: () => void }) => (
    <div className="fixed top-4 right-4 bg-green-100 border border-green-400 text-green-700 px-6 py-4 rounded-lg shadow-lg z-50 max-w-md">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="text-green-600">✅</span>
          <span className="font-medium">{message}</span>
        </div>
        <button
          onClick={onDismiss}
          className="text-green-600 hover:text-green-800 ml-4"
        >
          ✕
        </button>
      </div>
    </div>
  );

  // Error display component
  const ErrorDisplay = ({ error, onDismiss }: { error: string; onDismiss: () => void }) => (
    <div className="fixed top-4 right-4 bg-red-100 border border-red-400 text-red-700 px-6 py-4 rounded-lg shadow-lg z-50 max-w-md">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="text-red-600">⚠️</span>
          <span className="font-medium">{error}</span>
        </div>
        <button
          onClick={onDismiss}
          className="text-red-600 hover:text-red-800 ml-4"
        >
          ✕
        </button>
      </div>
    </div>
  );

  if (!uploadedFile) {
    return (
      <>
        <PDFUpload onFileUpload={handleFileUpload} isUploading={isUploading} />
        {downloadError && (
          <ErrorDisplay 
            error={downloadError} 
            onDismiss={() => setDownloadError(null)} 
          />
        )}
        {successMessage && (
          <SuccessDisplay 
            message={successMessage} 
            onDismiss={() => setSuccessMessage(null)} 
          />
        )}
      </>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gray-100 flex">
        <Toolbar
          mode={mode}
          onModeChange={setMode}
          onDownloadHighlighted={handleDownloadHighlighted}
          onDownloadCropped={handleDownloadCropped}
          onResetClick={handleResetClick}
          hasHighlights={highlights.length > 0}
          hasCropArea={cropArea !== null}
          selectedHighlightColor={selectedHighlightColor}
          onHighlightColorChange={setSelectedHighlightColor}
        />
        <PDFViewer
          file={uploadedFile}
          mode={mode}
          onHighlightsChange={setHighlights}
          onCropAreaChange={setCropArea}
          highlights={highlights}
          cropArea={cropArea}
          onPageChange={setCurrentPage}
          selectedHighlightColor={selectedHighlightColor}
        />
        
        {/* Loading overlay for downloads */}
        {isDownloading && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-8 flex flex-col items-center space-y-4">
              <div className="animate-spin h-16 w-16 border-4 border-blue-500 border-t-transparent rounded-full"></div>
              <p className="text-xl font-bold text-gray-700">Preparing your PDF...</p>
              <p className="text-lg text-gray-500">This may take a moment</p>
            </div>
          </div>
        )}
      </div>
      
      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={showResetConfirmation}
        title="Start Over?"
        message="Are you sure you want to start over? All your highlights and crop selections will be lost permanently."
        confirmText="Yes, Start Over"
        cancelText="Keep Working"
        onConfirm={handleConfirmReset}
        onCancel={handleCancelReset}
        isDestructive={true}
      />
      
      {/* Success Display */}
      {successMessage && (
        <SuccessDisplay 
          message={successMessage} 
          onDismiss={() => setSuccessMessage(null)} 
        />
      )}
      
      {/* Error Display */}
      {downloadError && (
        <ErrorDisplay 
          error={downloadError} 
          onDismiss={() => setDownloadError(null)} 
        />
      )}
    </>
  );
}

export default App;