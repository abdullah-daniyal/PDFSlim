export interface PDFPage {
  pageNumber: number;
  canvas: HTMLCanvasElement;
  highlights: Highlight[];
  cropArea?: CropArea;
}

export interface Highlight {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  page: number;
}

export interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type EditorMode = 'highlight' | 'crop' | 'view';