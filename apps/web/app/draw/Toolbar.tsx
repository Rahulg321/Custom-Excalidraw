"use client";

import type React from "react";
import { Button } from "@repo/ui/components/ui/button";
import {
  Square,
  CircleIcon,
  Minus,
  Pencil,
  Trash2,
  Download,
  MousePointer2,
  Keyboard,
  Triangle,
} from "lucide-react";
import type { ShapeType } from "./shapeUtils";
import { Separator } from "@repo/ui/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@repo/ui/components/ui/tooltip";
import { Slider } from "@repo/ui/components/ui/slider";
import { Label } from "@repo/ui/components/ui/label";

interface ToolbarProps {
  selectedShape: ShapeType;
  setSelectedShape: (shape: ShapeType) => void;
  strokeColor: string;
  setStrokeColor: (color: string) => void;
  fillColor: string;
  setFillColor: (color: string) => void;
  strokeWidth: number;
  setStrokeWidth: (width: number) => void;
  canvasColor: string;
  setCanvasColor: (color: string) => void;
  onClear: () => void;
  onDownload: () => void;
  fontSize: number; // << add
  setFontSize: (size: number) => void; // << add
}

export const Toolbar: React.FC<ToolbarProps> = ({
  selectedShape,
  setSelectedShape,
  strokeColor,
  setStrokeColor,
  fillColor,
  setFillColor,
  strokeWidth,
  setStrokeWidth,
  canvasColor,
  setCanvasColor,
  onClear,
  onDownload,
  fontSize,
  setFontSize,
}) => {
  return (
    <TooltipProvider>
      <div className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b p-2 shadow-sm fixed top-0 left-0 right-0 z-10">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <ToolButton
              icon={<MousePointer2 className="w-4 h-4" />}
              label="Select"
              isActive={selectedShape === "select"}
              onClick={() => setSelectedShape("select")}
            />
            <ToolButton
              icon={<Triangle className="w-4 h-4" />}
              label="Polygon"
              isActive={selectedShape === "polygon"}
              onClick={() => setSelectedShape("polygon")}
            />
            <ToolButton
              icon={<Square className="w-4 h-4" />}
              label="Rectangle"
              isActive={selectedShape === "rectangle"}
              onClick={() => setSelectedShape("rectangle")}
            />
            <ToolButton
              icon={<CircleIcon className="w-4 h-4" />}
              label="Circle"
              isActive={selectedShape === "circle"}
              onClick={() => setSelectedShape("circle")}
            />
            <ToolButton
              icon={<Minus className="w-4 h-4" />}
              label="Line"
              isActive={selectedShape === "line"}
              onClick={() => setSelectedShape("line")}
            />
            <ToolButton
              icon={<Pencil className="w-4 h-4" />}
              label="Freehand"
              isActive={selectedShape === "freehand"}
              onClick={() => setSelectedShape("freehand")}
            />

            <ToolButton
              icon={<Keyboard className="w-4 h-4" />}
              label="Type"
              isActive={selectedShape === "text"}
              onClick={() => setSelectedShape("text")}
            />
          </div>

          <Separator orientation="vertical" className="h-8" />

          <div className="flex items-center space-x-4">
            <ColorPicker
              id="strokeColor"
              label="Stroke"
              value={strokeColor}
              onChange={setStrokeColor}
            />
            <ColorPicker
              id="fillColor"
              label="Fill"
              value={fillColor}
              onChange={setFillColor}
            />
            <ColorPicker
              id="canvasColor"
              label="Canvas"
              value={canvasColor}
              onChange={setCanvasColor}
            />
            <div className="flex items-center space-x-2">
              <Label htmlFor="strokeWidth" className="text-sm font-medium">
                Width:
              </Label>
              <Slider
                id="strokeWidth"
                min={1}
                max={10}
                step={1}
                value={[strokeWidth]}
                onValueChange={(value) => setStrokeWidth(value[0])}
                className="w-24"
              />
              <span className="text-sm font-medium w-6 text-center">
                {strokeWidth}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <label htmlFor="fontSize" className="text-sm font-medium">
                Font Size:
              </label>
              <input
                type="range"
                id="fontSize"
                min={10}
                max={60}
                value={fontSize}
                onChange={(e) => setFontSize(Number(e.target.value))}
              />
              <span>{fontSize}px</span>
            </div>
          </div>

          <Separator orientation="vertical" className="h-8" />

          <div className="flex items-center space-x-2">
            <Button variant="destructive" size="sm" onClick={onClear}>
              <Trash2 className="w-4 h-4 mr-2" />
              Clear
            </Button>
            <Button variant="outline" size="sm" onClick={onDownload}>
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
};

const ToolButton: React.FC<{
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  onClick: () => void;
}> = ({ icon, label, isActive, onClick }) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <Button
        variant={isActive ? "default" : "ghost"}
        size="sm"
        onClick={onClick}
        className="w-9 h-9 p-0"
      >
        {icon}
      </Button>
    </TooltipTrigger>
    <TooltipContent>
      <p>{label}</p>
    </TooltipContent>
  </Tooltip>
);

const ColorPicker: React.FC<{
  id: string;
  label: string;
  value: string;
  onChange: (color: string) => void;
}> = ({ id, label, value, onChange }) => (
  <div className="flex items-center space-x-2">
    <Label htmlFor={id} className="text-sm font-medium">
      {label}:
    </Label>
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="w-6 h-6 rounded-full border border-gray-300 overflow-hidden">
          <input
            id={id}
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-8 h-8 p-0 border-none bg-transparent transform translate-x-[-4px] translate-y-[-4px]"
          />
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <p>Choose {label.toLowerCase()} color</p>
      </TooltipContent>
    </Tooltip>
  </div>
);
