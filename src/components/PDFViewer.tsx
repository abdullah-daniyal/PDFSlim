import React, { useRef, useEffect, useState, useCallback } from 'react';
import { EditorMode, Highlight, CropArea } from '../types/pdf';
import * as pdfjsLib from 'pdfjs-dist';

// Set up PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

interface PDFViewerProps {
  file: File;
  mode: EditorMode;
  onHighlightsChange: (highlights: Highlight[]) => void;
  onCropAreaChange: (cropArea: CropArea | null) => void;
  highlights: Highlight[];
  cropArea: CropArea | null;
  onPageChange: (page: number) => void;
  selectedHighlightColor: string;
}

export default function PDFViewer({
  file,
  mode,
  onHighlightsChange,
  onCropAreaChange,
  highlights,
  cropArea,
  onPageChange,
  selectedHighlightColor
}: PDFViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderTaskRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [currentDrag, setCurrentDrag] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [scale, setScale] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pdfDocument, setPdfDocument] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Load PDF document
  useEffect(() => {
    if (!file) return;

    const loadPDF = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        
        setPdfDocument(pdf);
        setTotalPages(pdf.numPages);
        setCurrentPage(1);
      } catch (err) {
        console.error('Error loading PDF:', err);
        setError('Failed to load PDF. Please try a different file.');
      } finally {
        setIsLoading(false);
      }
    };

    loadPDF();
  }, [file]);

  // Render current page
  const renderPage = useCallback(async () => {
    if (!pdfDocument || !canvasRef.current) return;

    // Cancel any existing render task
    if (renderTaskRef.current) {
      renderTaskRef.current.cancel();
      renderTaskRef.current = null;
    }

    try {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const page = await pdfDocument.getPage(currentPage);
      
      // Simple scaling - start with scale 1.5 for readability
      const viewport = page.getViewport({ scale: 1.5 * scale });
      
      // Set canvas size
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      canvas.style.width = `${viewport.width}px`;
      canvas.style.height = `${viewport.height}px`;

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Render PDF page
      const renderContext = {
        canvasContext: ctx,
        viewport: viewport
      };

      const renderTask = page.render(renderContext);
      renderTaskRef.current = renderTask;
      await renderTask.promise;
      renderTaskRef.current = null;
    } catch (err) {
      if (err.name !== 'RenderingCancelledException') {
        console.error('Error rendering page:', err);
        setError('Failed to render PDF page.');
      }
    }
  }, [pdfDocument, currentPage, scale]);

  // Render page when dependencies change
  useEffect(() => {
    if (pdfDocument && !isLoading) {
      renderPage();
    }
    
    // Cleanup function to cancel any pending render task
    return () => {
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
        renderTaskRef.current = null;
      }
    };
  }, [pdfDocument, currentPage, scale, renderPage, isLoading]);

  const getRelativePosition = useCallback((e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (mode === 'view') return;
    
    const pos = getRelativePosition(e);
    setStartPos(pos);
    setIsDrawing(true);
  }, [mode, getRelativePosition]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDrawing || mode === 'view') return;
    
    const currentPos = getRelativePosition(e);
    const width = Math.abs(currentPos.x - startPos.x);
    const height = Math.abs(currentPos.y - startPos.y);
    const x = Math.min(startPos.x, currentPos.x);
    const y = Math.min(startPos.y, currentPos.y);

    // Show real-time preview while dragging
    if (mode === 'highlight') {
      setCurrentDrag({ x, y, width, height });
    } else if (mode === 'crop') {
      onCropAreaChange({ x, y, width, height });
    }
  }, [isDrawing, mode, startPos, getRelativePosition, onCropAreaChange]);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (!isDrawing || mode === 'view') return;
    
    const currentPos = getRelativePosition(e);
    const width = Math.abs(currentPos.x - startPos.x);
    const height = Math.abs(currentPos.y - startPos.y);
    const x = Math.min(startPos.x, currentPos.x);
    const y = Math.min(startPos.y, currentPos.y);

    if (mode === 'highlight' && width > 10 && height > 10) {
      const newHighlight: Highlight = {
        id: `${currentPage}-${Date.now()}`,
        x,
        y,
        width,
        height,
        color: selectedHighlightColor,
        page: currentPage
      };
      onHighlightsChange([...highlights, newHighlight]);
    }

    setIsDrawing(false);
    setCurrentDrag(null);
  }, [isDrawing, mode, startPos, getRelativePosition, highlights, onHighlightsChange, currentPage]);

  const removeHighlight = useCallback((id: string) => {
    onHighlightsChange(highlights.filter(h => h.id !== id));
  }, [highlights, onHighlightsChange]);

  // UNDO FUNCTIONALITY
  const handleUndo = useCallback(() => {
    if (mode === 'highlight' && highlights.length > 0) {
      // Remove the last highlight
      const newHighlights = [...highlights];
      newHighlights.pop();
      onHighlightsChange(newHighlights);
    } else if (mode === 'crop' && cropArea) {
      // Remove crop area
      onCropAreaChange(null);
    }
  }, [mode, highlights, cropArea, onHighlightsChange, onCropAreaChange]);

  const handleZoomOut = useCallback(() => {
    setScale(Math.max(0.25, scale - 0.25));
  }, [scale]);

  const handleZoomIn = useCallback(() => {
    setScale(Math.min(5, scale + 0.25));
  }, [scale]);

  const handlePrevPage = useCallback(() => {
    if (currentPage > 1) {
      const newPage = currentPage - 1;
      setCurrentPage(newPage);
      onPageChange(newPage);
      // Clear crop area when changing pages (keep highlights per page)
      onCropAreaChange(null);
    }
  }, [currentPage, onPageChange, onCropAreaChange]);

  const handleNextPage = useCallback(() => {
    if (currentPage < totalPages) {
      const newPage = currentPage + 1;
      setCurrentPage(newPage);
      onPageChange(newPage);
      // Clear crop area when changing pages (keep highlights per page)
      onCropAreaChange(null);
    }
  }, [currentPage, totalPages, onPageChange, onCropAreaChange]);

  // Filter highlights for current page
  const currentPageHighlights = highlights.filter(h => h.page === currentPage);

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">⚠️</div>
          <div className="text-2xl font-bold text-red-600 mb-3">
            Error Loading PDF
          </div>
          <div className="text-lg text-gray-600 mb-4">
            {error}
          </div>
          <div className="text-sm text-gray-500">
            Please try uploading a different PDF file.
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin h-16 w-16 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-6"></div>
          <div className="text-2xl font-bold text-gray-700 mb-3">
            Loading PDF: {file.name}
          </div>
          <div className="text-lg text-gray-500">
            Preparing document for editing...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-gray-50">
      {/* Page Navigation */}
      <div className="bg-white border-b border-gray-200 p-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center space-x-4">
          <button
            onClick={handlePrevPage}
            disabled={currentPage === 1}
            className="px-6 py-3 bg-blue-500 text-white font-medium rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            ← Previous
          </button>
          <span className="text-xl font-bold text-gray-800 px-4">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={handleNextPage}
            disabled={currentPage === totalPages}
            className="px-6 py-3 bg-blue-500 text-white font-medium rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            Next →
          </button>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* UNDO BUTTON */}
          <button
            onClick={handleUndo}
            disabled={
              (mode === 'highlight' && currentPageHighlights.length === 0) ||
              (mode === 'crop' && !cropArea) ||
              mode === 'view'
            }
            className="px-4 py-2 bg-orange-500 text-white font-medium rounded-lg hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            ↶ Undo
          </button>
          
          <button
            onClick={handleZoomOut}
            className="px-4 py-2 bg-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-300 transition-colors"
          >
            Zoom Out
          </button>
          <span className="text-lg font-bold text-gray-800 min-w-[80px] text-center">
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={handleZoomIn}
            className="px-4 py-2 bg-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-300 transition-colors"
          >
            Zoom In
          </button>
        </div>
      </div>

      {/* PDF Viewer */}
      <div className="flex-1 overflow-auto p-6">
        <div className="relative max-w-full">
          <div className="relative shadow-lg border border-gray-300 rounded-lg overflow-hidden bg-white inline-block">
            <canvas
              ref={canvasRef}
              className={`cursor-${mode === 'view' ? 'default' : 'crosshair'} bg-white block shadow-2xl`}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
            />
            
            {/* Overlay for highlights and crop area */}
            <div className="absolute inset-0 pointer-events-none">
              {/* Render current page highlights */}
              {currentPageHighlights.map((highlight) => {
                const canvas = canvasRef.current;
                if (!canvas) return null;
                
                const rect = canvas.getBoundingClientRect();
                const scaleX = rect.width / canvas.width;
                const scaleY = rect.height / canvas.height;
                
                return (
                  <div
                    key={highlight.id}
                    className="absolute border-2 pointer-events-auto cursor-pointer hover:opacity-80 transition-all duration-200 hover:shadow-xl"
                    style={{
                      left: `${highlight.x * scaleX}px`,
                      top: `${highlight.y * scaleY}px`,
                      width: `${highlight.width * scaleX}px`,
                      height: `${highlight.height * scaleY}px`,
                      backgroundColor: highlight.color,
                      borderColor: highlight.color.replace('0.4', '0.8')
                    }}
                    onClick={() => removeHighlight(highlight.id)}
                    title="Click to remove this highlight"
                  />
                );
              })}
              
              {/* Render real-time highlight while dragging */}
              {currentDrag && mode === 'highlight' && (() => {
                const canvas = canvasRef.current;
                if (!canvas) return null;
                
                const rect = canvas.getBoundingClientRect();
                const scaleX = rect.width / canvas.width;
                const scaleY = rect.height / canvas.height;
                
                return (
                  <div
                    className="absolute border-2 border-dashed animate-pulse"
                    style={{
                      left: `${currentDrag.x * scaleX}px`,
                      top: `${currentDrag.y * scaleY}px`,
                      width: `${currentDrag.width * scaleX}px`,
                      height: `${currentDrag.height * scaleY}px`,
                      backgroundColor: selectedHighlightColor,
                      borderColor: selectedHighlightColor.replace('0.4', '0.8')
                    }}
                  />
                );
              })()}
              
              {/* Render crop area */}
              {cropArea && (() => {
                const canvas = canvasRef.current;
                if (!canvas) return null;
                
                const rect = canvas.getBoundingClientRect();
                const scaleX = rect.width / canvas.width;
                const scaleY = rect.height / canvas.height;
                
                return (
                  <div
                    className="absolute border-4 border-green-500 border-dashed bg-green-200 bg-opacity-40 shadow-lg"
                    style={{
                      left: `${cropArea.x * scaleX}px`,
                      top: `${cropArea.y * scaleY}px`,
                      width: `${cropArea.width * scaleX}px`,
                      height: `${cropArea.height * scaleY}px`,
                      backdropFilter: 'blur(1px)'
                    }}
                  />
                );
              })()}
            </div>
          </div>
        </div>
      </div>
      
      {/* Instructions */}
      <div className="bg-white border-t border-gray-200 p-6 shadow-sm">
        <div className="text-center text-lg text-gray-700 font-medium">
          {mode === 'view' && 'From Abdullah ❤️ I love you!'}
          {mode === 'highlight' && '🖍️ Highlight mode: Click and drag to highlight text. Click highlights to remove them. Use Undo button to remove last highlight.'}
          {mode === 'crop' && '✂️ Crop mode: Click and drag to select the area you want to crop and save. Use Undo to clear crop area.'}
        </div>
        <div className="text-center text-sm text-gray-500 mt-2">
          File: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB) • Page {currentPage} of {totalPages} • {currentPageHighlights.length} highlights on this page
        </div>
      </div>
    </div>
  );
}