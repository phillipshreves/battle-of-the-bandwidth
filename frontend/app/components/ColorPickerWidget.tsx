'use client';

import { useState, useRef, useEffect } from 'react';

interface ColorPickerWidgetProps {
    value: string;
    onChange: (color: string) => void;
    label?: string;
    disabled?: boolean;
}

export default function ColorPickerWidget({ value, onChange, label, disabled = false }: ColorPickerWidgetProps) {
    const [isOpen, setIsOpen] = useState(false);
    const colorInputRef = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Handle clicking outside to close the picker
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const handleColorChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const newColor = event.target.value;
        onChange(newColor);
    };

    const handleButtonClick = () => {
        if (!disabled) {
            setIsOpen(!isOpen);
            if (!isOpen && colorInputRef.current) {
                colorInputRef.current.click();
            }
        }
    };

    return (
        <div ref={containerRef} className="relative">
            {label && (
                <label className="block text-sm font-medium text-secondary mb-1">
                    {label}
                </label>
            )}
            
            <button
                type="button"
                onClick={handleButtonClick}
                disabled={disabled}
                className={`
                    w-12 h-8 rounded-md border-2 border-gray-300 relative overflow-hidden
                    ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:border-gray-400'}
                    transition-colors duration-200
                `}
                style={{ backgroundColor: value }}
            >
                {/* Color preview */}
                <div className="absolute inset-0" style={{ backgroundColor: value }} />
                
                {/* Border overlay for better visibility */}
                <div className="absolute inset-0 border border-black/10 rounded-md" />
            </button>

            {/* Hidden color input */}
            <input
                ref={colorInputRef}
                type="color"
                value={value}
                onChange={handleColorChange}
                disabled={disabled}
                className="absolute opacity-0 pointer-events-none"
                tabIndex={-1}
            />

            {/* Color value display */}
            <div className="mt-1 text-xs text-secondary font-mono">
                {value.toUpperCase()}
            </div>
        </div>
    );
} 