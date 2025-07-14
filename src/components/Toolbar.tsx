import React from 'react';
import { Highlighter, Crop, Download, Eye, RotateCcw, AlertTriangle, ChevronDown } from 'lucide-react';
import { EditorMode } from '../types/pdf';

interface ToolbarProps {
  mode: EditorMode;
  onModeChange: (mode: EditorMode) => void;
  onDownloadHighlighted: () => void;
  onDownloadCropped: () => void;
  onReset: () => void;
  hasHighlights: boolean;
  hasCropArea: boolean;
  onResetClick: () => void;
  selectedHighlightColor: string;
  onHighlightColorChange: (color: string) => void;
}

export default function Toolbar({
  mode,
  onModeChange,
  onDownloadHighlighted,
  onDownloadCropped,
  onResetClick,
  hasHighlights,
  hasCropArea,
  selectedHighlightColor,
  onHighlightColorChange
}: ToolbarProps) {
  const highlightColors = [
    { name: 'Yellow', value: 'rgba(255, 255, 0, 0.4)', hex: '#FFFF00' },
    { name: 'Green', value: 'rgba(0, 255, 0, 0.4)', hex: '#00FF00' },
    { name: 'Blue', value: 'rgba(0, 150, 255, 0.4)', hex: '#0096FF' },
    { name: 'Pink', value: 'rgba(255, 0, 150, 0.4)', hex: '#FF0096' },
    { name: 'Orange', value: 'rgba(255, 165, 0, 0.4)', hex: '#FFA500' }
  ];

  const currentColor = highlightColors.find(c => c.value === selectedHighlightColor) || highlightColors[0];

  return (
    <div className="w-64 bg-white border-r border-gray-200 p-6 flex flex-col space-y-4">
      <h2 className="text-xl font-bold text-gray-800 mb-4">PDF Editor</h2>
      
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
          Edit Mode
        </h3>
        
        <button
          onClick={() => onModeChange('view')}
          className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg font-medium transition-colors ${
            mode === 'view'
              ? 'bg-blue-100 text-blue-700 border-2 border-blue-200'
              : 'text-gray-700 hover:bg-gray-100 border-2 border-transparent'
          }`}
        >
          <Eye className="h-5 w-5" />
          <span>View Only</span>
        </button>
        
        <button
          onClick={() => onModeChange('highlight')}
          className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg font-medium transition-colors ${
            mode === 'highlight'
              ? 'bg-yellow-100 text-yellow-700 border-2 border-yellow-200'
              : 'text-gray-700 hover:bg-gray-100 border-2 border-transparent'
          }`}
        >
          <Highlighter className="h-5 w-5" />
          <div 
            className="w-4 h-4 rounded-full border-2 border-gray-400"
            style={{ backgroundColor: currentColor.hex }}
          />
          <span>Highlight Text</span>
        </button>
        
        {/* Color Dropdown - only show when highlight mode is active */}
        {mode === 'highlight' && (
          <div className="ml-4 relative">
            <label className="block text-xs font-medium text-gray-600 mb-2">
              Highlight Color
            </label>
            <div className="relative">
              <select
                value={selectedHighlightColor}
                onChange={(e) => onHighlightColorChange(e.target.value)}
                className="w-full appearance-none bg-white border border-gray-300 rounded-lg px-3 py-2 pr-8 text-sm font-medium text-gray-700 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
              >
                {highlightColors.map((color) => (
                  <option key={color.value} value={color.value}>
                    {color.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            </div>
          </div>
        )}
        
        <button
          onClick={() => onModeChange('crop')}
          className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg font-medium transition-colors ${
            mode === 'crop'
              ? 'bg-green-100 text-green-700 border-2 border-green-200'
              : 'text-gray-700 hover:bg-gray-100 border-2 border-transparent'
          }`}
        >
          <Crop className="h-5 w-5" />
          <span>Crop Page</span>
        </button>
      </div>
      
      <hr className="border-gray-200 my-4" />
      
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
          Download
        </h3>
        
        <button
          onClick={onDownloadHighlighted}
          disabled={!hasHighlights}
          className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg font-medium transition-colors ${
            hasHighlights
              ? 'bg-yellow-500 text-white hover:bg-yellow-600'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          <Download className="h-5 w-5" />
          <span>Download Highlighted</span>
        </button>
        
        <button
          onClick={onDownloadCropped}
          disabled={!hasCropArea}
          className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg font-medium transition-colors ${
            hasCropArea
              ? 'bg-green-500 text-white hover:bg-green-600'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          <Download className="h-5 w-5" />
          <span>Download Cropped PDF</span>
        </button>
      </div>
      
      <hr className="border-gray-200 my-4" />
      
      <button
        onClick={onResetClick}
        className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg font-medium text-red-600 hover:bg-red-50 border-2 border-transparent hover:border-red-200 transition-colors"
      >
        <AlertTriangle className="h-5 w-5" />
        <span>Start Over</span>
      </button>
    </div>
  );
}