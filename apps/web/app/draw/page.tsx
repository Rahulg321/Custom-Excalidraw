"use client";

import React, { useEffect, useRef, useState } from "react";
import rough from "roughjs";

type ShapeType = "rectangle" | "circle" | "line" | "freehand";

interface Point {
  x: number;
  y: number;
}

interface Rectangle {
  type: "rectangle";
  x: number;
  y: number;
  width: number;
  height: number;
  options: any;
}

interface Circle {
  type: "circle";
  x: number;
  y: number;
  radius: number;
  options: any;
}

interface Line {
  type: "line";
  start: Point;
  end: Point;
  options: any;
}

interface Freehand {
  type: "freehand";
  points: Point[];
  options: any;
}

type Element = Rectangle | Circle | Line | Freehand;

const DrawPage = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [selectedShape, setSelectedShape] = useState<ShapeType>("line");
  const [elements, setElements] = useState<Element[]>([]);
  const [roughCanvas, setRoughCanvas] = useState<any>(null);
  const [startPoint, setStartPoint] = useState<Point | null>(null);
  const [currentPoint, setCurrentPoint] = useState<Point | null>(null);

  // Using a ref for freehand points so we can update immediately while drawing
  const freehandPointsRef = useRef<Point[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Set actual canvas size
    canvas.width = window.innerWidth - 50; // adjust as you wish
    canvas.height = window.innerHeight - 150; // adjust as you wish

    const rc = rough.canvas(canvas);
    setRoughCanvas(rc);
  }, []);

  // Helper to get { x, y } from mouse or touch events relative to canvas
  const getCoordinates = (
    event:
      | React.MouseEvent<HTMLCanvasElement>
      | React.TouchEvent<HTMLCanvasElement>
  ): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    if ("touches" in event) {
      return {
        x: event.touches[0].clientX - rect.left,
        y: event.touches[0].clientY - rect.top,
      };
    } else {
      return {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      };
    }
  };

  // Start drawing
  const startDrawing = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    e.preventDefault();
    const coords = getCoordinates(e);
    setIsDrawing(true);

    if (selectedShape === "freehand") {
      // Start collecting points for the freehand shape
      freehandPointsRef.current = [coords];
    } else {
      setStartPoint(coords);
    }
  };

  // Mouse/touch move => draw
  const draw = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    if (!roughCanvas || !isDrawing) return;

    e.preventDefault();
    const coords = getCoordinates(e);
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    // Clear and redraw existing elements first
    context.clearRect(0, 0, canvas.width, canvas.height);
    drawElements();

    // Freehand preview
    if (selectedShape === "freehand") {
      // Add this coordinate to the path
      freehandPointsRef.current.push(coords);

      // Convert from {x, y} objects into [[x, y], [x, y], ...]
      const pointsArray = freehandPointsRef.current.map((pt) => [pt.x, pt.y]);
      if (pointsArray.length > 1) {
        roughCanvas.linearPath(pointsArray, {
          stroke: "#000",
          strokeWidth: 2,
        });
      }
      return;
    }

    // Other shapes (rectangle, circle, line)
    if (!startPoint) return;
    setCurrentPoint(coords);

    if (selectedShape === "rectangle") {
      const width = coords.x - startPoint.x;
      const height = coords.y - startPoint.y;
      roughCanvas.rectangle(startPoint.x, startPoint.y, width, height, {
        stroke: "#000",
        strokeWidth: 2,
      });
    } else if (selectedShape === "circle") {
      const radius = Math.sqrt(
        Math.pow(coords.x - startPoint.x, 2) +
          Math.pow(coords.y - startPoint.y, 2)
      );
      // rough.js circle expects a diameter
      roughCanvas.circle(startPoint.x, startPoint.y, radius * 2, {
        stroke: "#000",
        strokeWidth: 2,
      });
    } else if (selectedShape === "line") {
      roughCanvas.line(startPoint.x, startPoint.y, coords.x, coords.y, {
        stroke: "#000",
        strokeWidth: 2,
      });
    }
  };

  // End drawing
  const endDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);

    if (!roughCanvas) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (selectedShape === "freehand") {
      // Only finalize if we actually have more than one point
      if (freehandPointsRef.current.length > 1) {
        const newFreehand: Freehand = {
          type: "freehand",
          points: [...freehandPointsRef.current],
          options: { stroke: "#000", strokeWidth: 2 },
        };
        setElements((prev) => [...prev, newFreehand]);
      }
      freehandPointsRef.current = [];
    } else if (startPoint && currentPoint) {
      if (selectedShape === "rectangle") {
        const width = currentPoint.x - startPoint.x;
        const height = currentPoint.y - startPoint.y;
        const newRectangle: Rectangle = {
          type: "rectangle",
          x: startPoint.x,
          y: startPoint.y,
          width,
          height,
          options: {
            stroke: "#000",
            strokeWidth: 2,
          },
        };
        setElements((prev) => [...prev, newRectangle]);
      } else if (selectedShape === "circle") {
        const radius = Math.sqrt(
          Math.pow(currentPoint.x - startPoint.x, 2) +
            Math.pow(currentPoint.y - startPoint.y, 2)
        );
        const newCircle: Circle = {
          type: "circle",
          x: startPoint.x,
          y: startPoint.y,
          radius,
          options: {
            stroke: "#000",
            strokeWidth: 2,
          },
        };
        setElements((prev) => [...prev, newCircle]);
      } else if (selectedShape === "line") {
        const newLine: Line = {
          type: "line",
          start: startPoint,
          end: currentPoint,
          options: {
            stroke: "#000",
            strokeWidth: 2,
          },
        };
        setElements((prev) => [...prev, newLine]);
      }
    }

    // Reset start/current
    setStartPoint(null);
    setCurrentPoint(null);
  };

  // Draw all existing elements
  const drawElements = () => {
    if (!roughCanvas) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    context.clearRect(0, 0, canvas.width, canvas.height);

    elements.forEach((element) => {
      if (element.type === "rectangle") {
        roughCanvas.rectangle(
          element.x,
          element.y,
          element.width,
          element.height,
          element.options
        );
      } else if (element.type === "circle") {
        roughCanvas.circle(
          element.x,
          element.y,
          element.radius * 2,
          element.options
        );
      } else if (element.type === "line") {
        roughCanvas.line(
          element.start.x,
          element.start.y,
          element.end.x,
          element.end.y,
          element.options
        );
      } else if (element.type === "freehand") {
        // Convert from {x, y} array to [[x, y], ...]
        const pointsArray = element.points.map((pt) => [pt.x, pt.y]);
        if (pointsArray.length > 1) {
          roughCanvas.linearPath(pointsArray, element.options);
        }
      }
    });
  };

  // Redraw whenever elements or roughCanvas changes
  useEffect(() => {
    drawElements();
  }, [elements, roughCanvas]);

  // Clear button => reset the elements array
  const clearCanvas = () => {
    setElements([]);
  };

  return (
    <div>
      {/* Toolbar */}
      <div
        style={{
          backgroundColor: "#eee",
          padding: "10px",
          display: "flex",
          gap: "10px",
          position: "fixed",
          top: "0",
          left: "0",
          width: "100%",
          zIndex: 10,
        }}
      >
        <button
          onClick={() => setSelectedShape("rectangle")}
          style={{
            backgroundColor:
              selectedShape === "rectangle" ? "lightblue" : "white",
          }}
        >
          Rectangle
        </button>
        <button
          onClick={() => setSelectedShape("circle")}
          style={{
            backgroundColor: selectedShape === "circle" ? "lightblue" : "white",
          }}
        >
          Circle
        </button>
        <button
          onClick={() => setSelectedShape("line")}
          style={{
            backgroundColor: selectedShape === "line" ? "lightblue" : "white",
          }}
        >
          Line
        </button>
        <button
          onClick={() => setSelectedShape("freehand")}
          style={{
            backgroundColor:
              selectedShape === "freehand" ? "lightblue" : "white",
          }}
        >
          Freehand
        </button>
        <button
          onClick={clearCanvas}
          style={{
            backgroundColor: "white",
          }}
        >
          Clear Canvas
        </button>
      </div>

      <canvas
        ref={canvasRef}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={endDrawing}
        onMouseLeave={endDrawing}
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={endDrawing}
        style={{
          border: "2px solid #ccc",
          display: "block",
          marginTop: "60px", // push the canvas below the fixed toolbar
          touchAction: "none", // prevents scrolling during touch-draw
        }}
      />
    </div>
  );
};

export default DrawPage;
