import React, { useRef } from 'react';
import { FileData } from '../types';
import { fileToBase64, getMimeType } from '../utils/fileUtils';

interface FileUploadProps {
  label: string;
  onFileSelect: (data: FileData) => void;
  selectedFile: FileData | null;
  disabled?: boolean;
}

const FileUpload: React.FC<FileUploadProps> = ({ label, onFileSelect, selectedFile, disabled }) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const base64 = await fileToBase64(file);
      const mimeType = getMimeType(file);
      const previewUrl = URL.createObjectURL(file);
      
      onFileSelect({
        file,
        previewUrl,
        base64,
        mimeType
      });
    }
  };

  const handleClick = () => {
    if (!disabled) {
      inputRef.current?.click();
    }
  };

  const isImage = selectedFile?.mimeType.startsWith('image/');

  return (
    <div 
      className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center transition-all cursor-pointer h-64 group
        ${selectedFile ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50 bg-white'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
      onClick={handleClick}
    >
      <input 
        type="file" 
        ref={inputRef} 
        onChange={handleChange} 
        className="hidden" 
        accept="image/*,application/pdf,text/plain,text/csv"
      />
      
      {selectedFile ? (
        <div className="text-center w-full h-full flex flex-col items-center justify-center">
          {isImage ? (
            <img 
              src={selectedFile.previewUrl} 
              alt="Preview" 
              className="max-h-32 object-contain mb-3 rounded shadow-sm bg-white" 
            />
          ) : (
             <div className="w-16 h-16 mb-3 bg-white border border-gray-200 text-blue-600 rounded-lg flex items-center justify-center shadow-sm">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg>
             </div>
          )}
          <p className="font-medium text-gray-800 truncate max-w-full px-4">{selectedFile.file.name}</p>
          <span className="inline-block mt-2 px-2 py-1 bg-white border border-gray-200 text-xs text-gray-500 rounded-md uppercase">
            {selectedFile.file.name.split('.').pop()}
          </span>
        </div>
      ) : (
        <>
          <div className="w-14 h-14 bg-blue-50 group-hover:bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
          </div>
          <h3 className="text-sm font-semibold text-gray-900">Clique para enviar {label}</h3>
          <p className="text-xs text-gray-500 mt-2 text-center max-w-[200px]">
            Suporta Imagens, PDF, TXT ou CSV
          </p>
        </>
      )}
    </div>
  );
};

export default FileUpload;