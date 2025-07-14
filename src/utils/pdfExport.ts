import { PDFDocument, rgb } from 'pdf-lib';
import { saveAs } from 'file-saver';
import { Highlight, CropArea } from '../types/pdf';
import * as pdfjsLib from 'pdfjs-dist';

// Convert RGBA color string to RGB values for pdf-lib
function parseRGBAColor(rgbaString: string): { r: number; g: number; b: number } {
  // Handle rgba(r, g, b, a) format
  const match = rgbaString.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\)/);
  if (match) {
    return {
      r: parseInt(match[1]) / 255,
      g: parseInt(match[2]) / 255,
      b: parseInt(match[3]) / 255
    };
  }
  
  // Fallback to yellow if parsing fails
  return { r: 1, g: 1, b: 0 };
}

export async function downloadHighlightedPDF(
  originalFile: File,
  highlights: Highlight[],
  canvasWidth: number,
  canvasHeight: number
): Promise<boolean> {
  try {
    if (!originalFile || highlights.length === 0) {
      throw new Error('No file or highlights available');
    }

    if (canvasWidth <= 0 || canvasHeight <= 0) {
      throw new Error('Invalid canvas dimensions');
    }

    const arrayBuffer = await originalFile.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer);
    
    const pages = pdfDoc.getPages();
    
    // Group highlights by page
    const highlightsByPage = highlights.reduce((acc, highlight) => {
      if (!acc[highlight.page]) {
        acc[highlight.page] = [];
      }
      acc[highlight.page].push(highlight);
      return acc;
    }, {} as Record<number, Highlight[]>);
    
    // Apply highlights to each page
    Object.entries(highlightsByPage).forEach(([pageNum, pageHighlights]) => {
      const pageIndex = parseInt(pageNum) - 1; // Convert to 0-based index
      if (pageIndex >= 0 && pageIndex < pages.length) {
        const page = pages[pageIndex];
        const { width: pageWidth, height: pageHeight } = page.getSize();
        
        pageHighlights.forEach((highlight) => {
          // Parse the highlight color
          const color = parseRGBAColor(highlight.color);
          
          // Convert canvas coordinates to PDF coordinates
          const x = (highlight.x / canvasWidth) * pageWidth;
          const y = pageHeight - ((highlight.y + highlight.height) / canvasHeight) * pageHeight;
          const width = (highlight.width / canvasWidth) * pageWidth;
          const height = (highlight.height / canvasHeight) * pageHeight;
          
          page.drawRectangle({
            x,
            y,
            width,
            height,
            color: rgb(color.r, color.g, color.b),
            opacity: 0.3,
          });
        });
      }
    });
    
    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    
    const fileName = `highlighted-${originalFile.name.replace('.pdf', '')}-${new Date().toISOString().slice(0, 10)}.pdf`;
    saveAs(blob, fileName);
    return true;
  } catch (error) {
    console.error('Error creating highlighted PDF:', error);
    throw error;
  }
}

export async function downloadCroppedPNG(
  originalFile: File,
  cropArea: CropArea,
  highlights: Highlight[],
  canvasWidth: number,
  canvasHeight: number,
  currentPage: number = 1
): Promise<boolean> {
  try {
    console.log('Starting PNG crop download...');
    
    if (!originalFile || !cropArea) {
      throw new Error('No file or crop area available');
    }

    if (canvasWidth <= 0 || canvasHeight <= 0) {
      throw new Error('Invalid canvas dimensions');
    }

    if (cropArea.width <= 0 || cropArea.height <= 0) {
      throw new Error('Invalid crop area dimensions');
    }

    // Load PDF
    const arrayBuffer = await originalFile.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const page = await pdf.getPage(currentPage);
    
    // Create a high-resolution canvas for rendering
    const scale = 2; // High DPI for better quality
    const viewport = page.getViewport({ scale });
    
    // Create canvas for PDF rendering
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get canvas context');
    
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    
    // Render PDF page to canvas
    await page.render({
      canvasContext: ctx,
      viewport: viewport
    }).promise;
    
    // Calculate crop coordinates in the high-res canvas
    const scaleX = viewport.width / canvasWidth;
    const scaleY = viewport.height / canvasHeight;
    
    const cropX = cropArea.x * scaleX;
    const cropY = cropArea.y * scaleY;
    const cropWidth = cropArea.width * scaleX;
    const cropHeight = cropArea.height * scaleY;
    
    // Create a new canvas for the cropped area
    const croppedCanvas = document.createElement('canvas');
    const croppedCtx = croppedCanvas.getContext('2d');
    if (!croppedCtx) throw new Error('Could not get cropped canvas context');
    
    croppedCanvas.width = cropWidth;
    croppedCanvas.height = cropHeight;
    
    // Draw the cropped area
    croppedCtx.drawImage(
      canvas,
      cropX, cropY, cropWidth, cropHeight,
      0, 0, cropWidth, cropHeight
    );
    
    // NOW ADD HIGHLIGHTS ON TOP
    const pageHighlights = highlights.filter(h => h.page === currentPage);
    
    pageHighlights.forEach((highlight) => {
      // Check if highlight overlaps with crop area
      const highlightRight = highlight.x + highlight.width;
      const highlightBottom = highlight.y + highlight.height;
      const cropRight = cropArea.x + cropArea.width;
      const cropBottom = cropArea.y + cropArea.height;
      
      const overlaps = !(
        highlight.x >= cropRight ||
        highlightRight <= cropArea.x ||
        highlight.y >= cropBottom ||
        highlightBottom <= cropArea.y
      );
      
      if (overlaps) {
        // Calculate intersection
        const intersectX = Math.max(highlight.x, cropArea.x);
        const intersectY = Math.max(highlight.y, cropArea.y);
        const intersectRight = Math.min(highlightRight, cropRight);
        const intersectBottom = Math.min(highlightBottom, cropBottom);
        
        const intersectWidth = intersectRight - intersectX;
        const intersectHeight = intersectBottom - intersectY;
        
        if (intersectWidth > 0 && intersectHeight > 0) {
          // Convert to canvas coordinates
          const canvasX = (intersectX - cropArea.x) * scaleX;
          const canvasY = (intersectY - cropArea.y) * scaleY;
          const canvasWidth = intersectWidth * scaleX;
          const canvasHeight = intersectHeight * scaleY;
          
          // Parse color
          const match = highlight.color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\)/);
          if (match) {
            const r = parseInt(match[1]);
            const g = parseInt(match[2]);
            const b = parseInt(match[3]);
            
            // Draw highlight rectangle
            croppedCtx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.4)`;
            croppedCtx.fillRect(canvasX, canvasY, canvasWidth, canvasHeight);
          }
        }
      }
    });
    
    // Convert to PNG blob and download
    // Convert canvas to PDF
    const imgData = croppedCanvas.toDataURL('image/png', 1.0);
    
    // Create new PDF document
    const pdfDoc = await PDFDocument.create();
    const outputPage = pdfDoc.addPage([cropWidth, cropHeight]);
    
    // Embed the image
    const pngImage = await pdfDoc.embedPng(imgData);
    
    // Draw the image on the PDF page
    outputPage.drawImage(pngImage, {
      x: 0,
      y: 0,
      width: cropWidth,
      height: cropHeight,
    });
    
    // Save as PDF
    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    
      if (blob) {
        const fileName = `cropped-page${currentPage}-${originalFile.name.replace('.pdf', '')}-${new Date().toISOString().slice(0, 10)}.pdf`;
        saveAs(blob, fileName);
      }
    
    return true;
  } catch (error) {
    console.error('Error creating cropped PNG:', error);
    throw error;
  }
}

// Keep the old function name for compatibility but make it call the PNG version
export async function downloadCroppedPDF(
  originalFile: File,
  cropArea: CropArea,
  highlights: Highlight[],
  canvasWidth: number,
  canvasHeight: number,
  currentPage: number = 1
): Promise<boolean> {
  return downloadCroppedPNG(originalFile, cropArea, highlights, canvasWidth, canvasHeight, currentPage);
}