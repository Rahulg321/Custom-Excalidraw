"use client";

import React, { useEffect, useRef, useState } from "react";
import rough from "roughjs";
import { RoughCanvas } from "roughjs/bin/canvas";
import {
  ShapeType,
  Element,
  Point,
  cloneElement,
  isPointOnElement,
  getBoundingBox,
} from "./shapeUtils";

/**
 * Text editing state: tracks if we are in the middle of editing text,
 * at which (x,y), initial text, and if it’s editing an existing shape index.
 */
interface EditingTextState {
  isEditing: boolean;
  x: number;
  y: number;
  initialValue: string;
  shapeIndex: number | null;
}

interface CanvasAreaProps {
  elements: Element[];
  setElements: React.Dispatch<React.SetStateAction<Element[]>>;
  selectedShape: ShapeType;
  strokeColor: string;
  fillColor: string;
  strokeWidth: number;
  canvasColor: string;
  fontSize: number;
  selectedElementIndex: number | null;
  setSelectedElementIndex: React.Dispatch<React.SetStateAction<number | null>>;
}



const CanvasArea: React.FC<CanvasAreaProps> = ({
  elements,
  setElements,
  selectedShape,
  strokeColor,
  fillColor,
  strokeWidth,
  canvasColor,
  fontSize,
  selectedElementIndex,
  setSelectedElementIndex,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [roughCanvas, setRoughCanvas] = useState<RoughCanvas | null>(null);
  // Refs to store partial points for freehand or polygon
  const freehandPointsRef = React.useRef<Point[]>([]);
  const polygonPointsRef = React.useRef<Point[]>([]);
  // For shape drawing
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState<Point | null>(null);
  const [currentPoint, setCurrentPoint] = useState<Point | null>(null);

  // For dragging an element
  const [draggingElementIndex, setDraggingElementIndex] = useState<
    number | null
  >(null);
  const dragStartElementRef = useRef<Element | null>(null);
  const [dragStartPoint, setDragStartPoint] = useState<Point | null>(null);

  // For resizing
  const [resizing, setResizing] = useState(false);
  const [resizingHandleIndex, setResizingHandleIndex] = useState<number | null>(
    null
  );

  // For in-place text editing
  const [editingText, setEditingText] = useState<EditingTextState>({
    isEditing: false,
    x: 0,
    y: 0,
    initialValue: "",
    shapeIndex: null,
  });

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Setup the canvas once
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = window.innerWidth - 50;
    canvas.height = window.innerHeight - 150;

    const rc = rough.canvas(canvas);
    setRoughCanvas(rc);
  }, []);

  // --- Helpers ---
  function getCoords(
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ): Point {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    if ("touches" in e) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    } else {
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    }
  }

  // ----- TEXT EDITING -----
  function startEditingText(
    x: number,
    y: number,
    initialValue: string,
    shapeIndex: number | null
  ) {
    setEditingText({
      isEditing: true,
      x,
      y,
      initialValue,
      shapeIndex,
    });
  }

  function finishEditingText(newText: string) {
    setEditingText((prev) => {
      // If user typed nothing, just reset
      if (!newText.trim()) {
        return {
          isEditing: false,
          x: 0,
          y: 0,
          initialValue: "",
          shapeIndex: null,
        };
      }

      const canvas = canvasRef.current;
      if (!canvas) return prev;
      const ctx = canvas.getContext("2d");
      if (!ctx) return prev;

      const font = `${fontSize}px ExacliFont`;
      ctx.font = font;
      const textMetrics = ctx.measureText(newText);
      const textWidth = textMetrics.width;
      const textHeight = fontSize; // approximate

      // If editing existing shape
      if (prev.shapeIndex != null) {
        setElements((els) => {
          const newEls = [...els];
          const shape = newEls[prev.shapeIndex!];
          if (shape && shape.type === "text") {
            shape.text = newText;
            shape.width = textWidth;
            shape.height = textHeight;
            shape.font = font;
          }
          return newEls;
        });
      } else {
        // create new
        setElements((els) => [
          ...els,
          {
            type: "text" as const,
            x: prev.x,
            y: prev.y,
            text: newText,
            font,
            width: textWidth,
            height: textHeight,
            options: {
              fill: fillColor || "#000",
              strokeWidth,
            },
          },
        ]);
      }

      return {
        isEditing: false,
        x: 0,
        y: 0,
        initialValue: "",
        shapeIndex: null,
      };
    });
  }

  function renderTextEditor() {
    if (!editingText.isEditing) return null;
    return (
      <textarea
        ref={textareaRef}
        style={{
          position: "absolute",
          top: editingText.y,
          left: editingText.x,
          fontSize,
          fontFamily: "ExacliFont",
        }}
        defaultValue={editingText.initialValue}
        autoFocus
        onBlur={(e) => finishEditingText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            finishEditingText((e.target as HTMLTextAreaElement).value);
          }
        }}
      />
    );
  }

  // ----- DOUBLE CLICK -----
  function handleDoubleClick(e: React.MouseEvent<HTMLCanvasElement>) {
    const coords = getCoords(e);

    // 1) text creation
    if (selectedShape === "text") {
      startEditingText(coords.x, coords.y, "", null);
    }
    // 2) text editing if select mode
    else if (selectedShape === "select") {
      for (let i = elements.length - 1; i >= 0; i--) {
        if (isPointOnElement(coords.x, coords.y, elements[i])) {
          const shape = elements[i];
          if (shape.type === "text") {
            startEditingText(shape.x, shape.y, shape.text, i);
            break;
          }
        }
      }
    }
    // 3) finalize polygon if we have >=3 points
    if (selectedShape === "polygon" && polygonPointsRef.current.length >= 3) {
      const newPoly = {
        type: "polygon" as const,
        points: [...polygonPointsRef.current],
        options: {
          stroke: strokeColor,
          fill: fillColor || undefined,
          strokeWidth,
        },
      };
      setElements((prev) => [...prev, newPoly]);
      polygonPointsRef.current = [];
      setIsDrawing(false);
    }
  }

  // ---- HELPER: BOUNDING BOX & HANDLES ----
  function drawAllElements() {
    if (!roughCanvas) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = canvasColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    elements.forEach((el, index) => {
      // Draw shape
      switch (el.type) {
        case "rectangle":
          roughCanvas.rectangle(el.x, el.y, el.width, el.height, el.options);
          break;
        case "circle":
          roughCanvas.circle(el.x, el.y, el.radius * 2, el.options);
          break;
        case "line":
          roughCanvas.line(
            el.start.x,
            el.start.y,
            el.end.x,
            el.end.y,
            el.options
          );
          break;
        case "freehand": {
          const pts = el.points.map((p) => [p.x, p.y]);
          if (pts.length > 1) {
            roughCanvas.linearPath(pts, el.options);
          }
          break;
        }
        case "text": {
          ctx.save();
          ctx.font = el.font;
          ctx.fillStyle = el.options.fill || "#000";
          ctx.fillText(el.text, el.x, el.y);
          ctx.restore();
          break;
        }
        case "polygon": {
          const polygonPts = el.points.map((p) => [p.x, p.y]);
          roughCanvas.polygon(polygonPts, el.options);
          break;
        }
      }

      // highlight if selected
      if (index === selectedElementIndex) {
        const [x1, y1, x2, y2] = getBoundingBox(el);
        roughCanvas.rectangle(x1, y1, x2 - x1, y2 - y1, {
          stroke: "blue",
          strokeWidth: 1,
          strokeLineDash: [5, 5],
        });
        // draw a single bottom-right handle for demonstration
        // (You can expand to all 8 handles.)
        drawSingleResizeHandle(ctx, x2, y2);
      }
    });
  }

  // Let's just do a single handle at the bottom-right corner.
  function drawSingleResizeHandle(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number
  ) {
    const size = 10;
    ctx.save();
    ctx.fillStyle = "blue";
    ctx.fillRect(x - size / 2, y - size / 2, size, size);
    ctx.restore();
  }

  // We'll detect if user clicks that bottom-right handle. If yes, we do "resizing".
  function hitTestSingleHandle(coords: Point, element: Element): boolean {
    const [x1, y1, x2, y2] = getBoundingBox(element);
    const size = 10;
    const half = size / 2;
    const hx = x2;
    const hy = y2;
    if (
      coords.x >= hx - half &&
      coords.x <= hx + half &&
      coords.y >= hy - half &&
      coords.y <= hy + half
    ) {
      return true;
    }
    return false;
  }

  // ------------- MOUSE DOWN ------------- //
  function onMouseDown(
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) {
    e.preventDefault();
    const coords = getCoords(e);

    // If user is editing text => optional finalize
    if (editingText.isEditing) {
      // ...
    }

    // If there's a selected element, check if we hit the resize handle
    if (selectedElementIndex != null) {
      const el = elements[selectedElementIndex];
      if (hitTestSingleHandle(coords, el)) {
        // We are resizing
        setResizing(true);
        return;
      }
    }

    // text mode => wait for double-click
    if (selectedShape === "text") {
      return;
    }

    // select mode => check if user clicked a shape => drag
    if (selectedShape === "select") {
      let foundIndex: number | null = null;
      for (let i = elements.length - 1; i >= 0; i--) {
        if (isPointOnElement(coords.x, coords.y, elements[i])) {
          foundIndex = i;
          break;
        }
      }
      if (foundIndex !== null) {
        setSelectedElementIndex(foundIndex);
        setDraggingElementIndex(foundIndex);
        setDragStartPoint(coords);
        dragStartElementRef.current = structuredClone(elements[foundIndex]);
      } else {
        setSelectedElementIndex(null);
      }
      return;
    }

    // shape creation mode
    setIsDrawing(true);
    if (selectedShape === "freehand") {
      freehandPointsRef.current = [coords];
    } else if (selectedShape === "polygon") {
      polygonPointsRef.current.push(coords);
    } else {
      setStartPoint(coords);
    }
  }

  // ------------- MOUSE MOVE ------------- //
  function onMouseMove(
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) {
    if (!roughCanvas) return;

    const coords = getCoords(e);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // If resizing
    if (resizing && selectedElementIndex != null) {
      e.preventDefault();
      const shape = elements[selectedElementIndex];
      const [x1, y1, x2, y2] = getBoundingBox(shape);

      // We'll do minimal logic: if shape is rectangle => adjust width/height
      // if shape is circle => adjust radius
      setElements((prev) => {
        const newEls = [...prev];
        const currentEl = { ...newEls[selectedElementIndex] };

        if (currentEl.type === "rectangle") {
          // anchor is top-left corner => we move bottom-right corner
          currentEl.width = coords.x - currentEl.x;
          currentEl.height = coords.y - currentEl.y;
        } else if (currentEl.type === "circle") {
          // anchor is circle.x, circle.y => new radius
          const dx = coords.x - currentEl.x;
          const dy = coords.y - currentEl.y;
          currentEl.radius = Math.sqrt(dx * dx + dy * dy);
        }

        newEls[selectedElementIndex] = currentEl;
        return newEls;
      });

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      drawAllElements();
      return;
    }

    // If dragging
    if (
      draggingElementIndex != null &&
      dragStartPoint &&
      dragStartElementRef.current
    ) {
      e.preventDefault();
      const dx = coords.x - dragStartPoint.x;
      const dy = coords.y - dragStartPoint.y;

      setElements((prev) => {
        const newEls = [...prev];
        const shape = { ...newEls[draggingElementIndex] };
        const original = dragStartElementRef.current!;

        switch (shape.type) {
          case "rectangle":
            if (original.type === "rectangle") {
              shape.x = original.x + dx;
              shape.y = original.y + dy;
            }
            break;
          case "circle":
            if (original.type === "circle") {
              shape.x = original.x + dx;
              shape.y = original.y + dy;
            }
            break;
          case "line":
            if (original.type === "line") {
              shape.start = {
                x: original.start.x + dx,
                y: original.start.y + dy,
              };
              shape.end = {
                x: original.end.x + dx,
                y: original.end.y + dy,
              };
            }
            break;
          case "freehand":
            if (original.type === "freehand") {
              shape.points = original.points.map((p) => ({
                x: p.x + dx,
                y: p.y + dy,
              }));
            }
            break;
          case "polygon":
            if (original.type === "polygon") {
              shape.points = original.points.map((p) => ({
                x: p.x + dx,
                y: p.y + dy,
              }));
            }
            break;
          case "text":
            if (original.type === "text") {
              shape.x = original.x + dx;
              shape.y = original.y + dy;
            }
            break;
        }

        newEls[draggingElementIndex] = shape;
        return newEls;
      });

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      drawAllElements();
      return;
    }

    // If not resizing or dragging => maybe drawing
    if (!isDrawing) return;
    if (selectedShape === "select" || selectedShape === "text") return;

    e.preventDefault();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawAllElements();

    // polygon partial preview
    if (selectedShape === "polygon") {
      const pts = polygonPointsRef.current.map((p) => [p.x, p.y]);
      if (pts.length > 1) {
        roughCanvas.polygon(pts, {
          stroke: strokeColor,
          fill: fillColor || undefined,
          strokeWidth,
        });
      }
      if (pts.length > 0) {
        const last = pts[pts.length - 1];
        roughCanvas.line(last[0], last[1], coords.x, coords.y, {
          stroke: strokeColor,
          strokeWidth,
        });
      }
      return;
    }

    // freehand
    if (selectedShape === "freehand") {
      freehandPointsRef.current.push(coords);
      const pathPts = freehandPointsRef.current.map((p) => [p.x, p.y]);
      if (pathPts.length > 1) {
        roughCanvas.linearPath(pathPts, {
          stroke: strokeColor,
          fill: fillColor || undefined,
          strokeWidth,
        });
      }
      return;
    }

    // rectangle/circle/line
    if (!startPoint) return;
    setCurrentPoint(coords);

    if (selectedShape === "rectangle") {
      const w = coords.x - startPoint.x;
      const h = coords.y - startPoint.y;
      roughCanvas.rectangle(startPoint.x, startPoint.y, w, h, {
        stroke: strokeColor,
        fill: fillColor || undefined,
        strokeWidth,
      });
    } else if (selectedShape === "circle") {
      const r = Math.sqrt(
        (coords.x - startPoint.x) ** 2 + (coords.y - startPoint.y) ** 2
      );
      roughCanvas.circle(startPoint.x, startPoint.y, r * 2, {
        stroke: strokeColor,
        fill: fillColor || undefined,
        strokeWidth,
      });
    } else if (selectedShape === "line") {
      roughCanvas.line(startPoint.x, startPoint.y, coords.x, coords.y, {
        stroke: strokeColor,
        strokeWidth,
      });
    }
  }

  // ------------- MOUSE UP ------------- //
  function onMouseUp() {
    // finalize resizing
    if (resizing) {
      setResizing(false);
      setResizingHandleIndex(null);
      return;
    }

    // finalize dragging
    if (draggingElementIndex != null) {
      setDraggingElementIndex(null);
      setDragStartPoint(null);
      dragStartElementRef.current = null;
      return;
    }

    // finalize shape
    if (!isDrawing) return;
    setIsDrawing(false);
    if (!roughCanvas) return;
    if (selectedShape === "select" || selectedShape === "text") return;

    if (selectedShape === "freehand") {
      if (freehandPointsRef.current.length > 1) {
        const newFreehand = {
          type: "freehand" as const,
          points: [...freehandPointsRef.current],
          options: {
            stroke: strokeColor,
            fill: fillColor || undefined,
            strokeWidth,
          },
        };
        setElements((prev) => [...prev, newFreehand]);
      }
      freehandPointsRef.current = [];
    } else if (selectedShape === "polygon") {
      // do nothing on mouse up, finalize on double-click
    } else if (startPoint && currentPoint) {
      if (selectedShape === "rectangle") {
        const w = currentPoint.x - startPoint.x;
        const h = currentPoint.y - startPoint.y;
        const newRect = {
          type: "rectangle" as const,
          x: startPoint.x,
          y: startPoint.y,
          width: w,
          height: h,
          options: {
            stroke: strokeColor,
            fill: fillColor || undefined,
            strokeWidth,
          },
        };
        setElements((prev) => [...prev, newRect]);
      } else if (selectedShape === "circle") {
        const r = Math.sqrt(
          (currentPoint.x - startPoint.x) ** 2 +
            (currentPoint.y - startPoint.y) ** 2
        );
        const newCircle = {
          type: "circle" as const,
          x: startPoint.x,
          y: startPoint.y,
          radius: r,
          options: {
            stroke: strokeColor,
            fill: fillColor || undefined,
            strokeWidth,
          },
        };
        setElements((prev) => [...prev, newCircle]);
      } else if (selectedShape === "line") {
        const newLine = {
          type: "line" as const,
          start: startPoint,
          end: currentPoint,
          options: {
            stroke: strokeColor,
            strokeWidth,
          },
        };
        setElements((prev) => [...prev, newLine]);
      }
    }

    setStartPoint(null);
    setCurrentPoint(null);
  }

  // Re-draw whenever elements or relevant states change
  useEffect(() => {
    drawAllElements();
  }, [elements, roughCanvas, selectedElementIndex, canvasColor]);

  // Keyboard shortcuts (delete, duplicate)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectedElementIndex == null) return;
      if (e.key === "Backspace") {
        e.preventDefault();
        setElements((prev) =>
          prev.filter((_, i) => i !== selectedElementIndex)
        );
        setSelectedElementIndex(null);
      } else if (e.key.toLowerCase() === "d" && e.ctrlKey) {
        e.preventDefault();
        setElements((prev) => {
          const shape = prev[selectedElementIndex];
          if (!shape) return prev;
          const cloned = cloneElement(shape);
          cloned.options = { ...shape.options };
          return [...prev, cloned];
        });
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedElementIndex]);

  return (
    <div className="relative w-full h-full">
      <canvas
        ref={canvasRef}
        onDoubleClick={handleDoubleClick}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        className="border-2 border-gray-300 rounded-lg w-full h-full touch-none"
      />
      {renderTextEditor()}
    </div>
  );
};


export default CanvasArea