"use client";

import React, { useState } from "react";
import { Element, ShapeType } from "./shapeUtils";
import { Toolbar } from "./Toolbar";
import CanvasArea from "./CanvasArea";

const DrawPage = () => {
  const [elements, setElements] = useState<Element[]>([]);
  const [selectedShape, setSelectedShape] = useState<ShapeType>("select");
  const [strokeColor, setStrokeColor] = useState("#000000");
  const [fillColor, setFillColor] = useState("");
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [canvasColor, setCanvasColor] = useState("#ffffff");

  // New: font size for text
  const [fontSize, setFontSize] = useState(24);

  const [selectedElementIndex, setSelectedElementIndex] = useState<
    number | null
  >(null);

  const handleClear = () => {
    setElements([]);
    setSelectedElementIndex(null);
  };

  const handleDownload = () => {
    const canvas = document.querySelector("canvas");
    if (!canvas) return;
    const dataURL = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = dataURL;
    link.download = "drawing.png";
    link.click();
  };

  return (
    <div className="flex flex-col h-screen">
      <Toolbar
        selectedShape={selectedShape}
        setSelectedShape={setSelectedShape}
        strokeColor={strokeColor}
        setStrokeColor={setStrokeColor}
        fillColor={fillColor}
        setFillColor={setFillColor}
        strokeWidth={strokeWidth}
        setStrokeWidth={setStrokeWidth}
        canvasColor={canvasColor}
        setCanvasColor={setCanvasColor}
        onClear={handleClear}
        onDownload={handleDownload}
        // pass font size too
        fontSize={fontSize}
        setFontSize={setFontSize}
      />

      <div className="flex-grow mt-20 p-4">
        <CanvasArea
          elements={elements}
          setElements={setElements}
          selectedShape={selectedShape}
          strokeColor={strokeColor}
          fillColor={fillColor}
          strokeWidth={strokeWidth}
          canvasColor={canvasColor}
          selectedElementIndex={selectedElementIndex}
          setSelectedElementIndex={setSelectedElementIndex}
          // Pass fontSize
          fontSize={fontSize}
        />
      </div>
    </div>
  );
};

export default DrawPage;
