// /components/shapeUtils.ts
// Helper functions for shape bounding boxes, collision checks, cloning, etc.

export type ShapeType = "select" | "rectangle" | "circle" | "line" | "freehand" | "text" | "polygon";

export interface Point {
  x: number;
  y: number;
}

// Rectangle
export interface Rectangle {
  type: "rectangle";
  x: number;
  y: number;
  width: number;
  height: number;
  options: any;
}

// Circle
export interface CircleShape {
  type: "circle";
  x: number;
  y: number;
  radius: number;
  options: any;
}


// Polygon
export interface PolygonShape {
  type: "polygon";
  points:Point[]
  options: any;
}

// Line
export interface LineShape {
  type: "line";
  start: Point;
  end: Point;
  options: any;
}

// Freehand
export interface Freehand {
  type: "freehand";
  points: Point[];
  options: any;
}

/**
 * TextShape: includes the position (x,y), some text string,
 * and maybe a measured width & height or a font setting.
 */
export interface TextShape {
  type: "text";
  x: number;
  y: number;
  text: string;
  font: string; // e.g. "16px sans-serif"
  width: number;
  height: number;
  options: any; // stroke color is optional, fill color, etc.
}

export type Element = Rectangle | CircleShape | LineShape | Freehand | TextShape | PolygonShape ;

/** Returns the bounding box [x1, y1, x2, y2] for a shape. */
export function getBoundingBox(element: Element): [number, number, number, number] {
  switch (element.type) {
    case "rectangle": {
      const x1 = element.x;
      const y1 = element.y;
      const x2 = element.x + element.width;
      const y2 = element.y + element.height;
      return [
        Math.min(x1, x2),
        Math.min(y1, y2),
        Math.max(x1, x2),
        Math.max(y1, y2),
      ];
    }
    case "circle": {
      const x1 = element.x - element.radius;
      const y1 = element.y - element.radius;
      const x2 = element.x + element.radius;
      const y2 = element.y + element.radius;
      return [x1, y1, x2, y2];
    }
    case "line": {
      const x1 = Math.min(element.start.x, element.end.x);
      const y1 = Math.min(element.start.y, element.end.y);
      const x2 = Math.max(element.start.x, element.end.x);
      const y2 = Math.max(element.start.y, element.end.y);
      return [x1, y1, x2, y2];
    }
    case "freehand": {
      const xValues = element.points.map((p) => p.x);
      const yValues = element.points.map((p) => p.y);
      const x1 = Math.min(...xValues);
      const x2 = Math.max(...xValues);
      const y1 = Math.min(...yValues);
      const y2 = Math.max(...yValues);
      return [x1, y1, x2, y2];
    }


    case "text": {
      // We'll approximate bounding box with text width & height
      const x1 = element.x;
      const y1 = element.y - element.height; // text baseline
      const x2 = element.x + element.width;
      const y2 = element.y; // baseline
      return [x1, y1, x2, y2];
    }

      case "polygon": {
        const xs = element.points.map((p) => p.x);
        const ys = element.points.map((p) => p.y);
        const x1 = Math.min(...xs);
        const x2 = Math.max(...xs);
        const y1 = Math.min(...ys);
        const y2 = Math.max(...ys);
        return [x1, y1, x2, y2];
        }

  }
}

/** Checks if (x, y) is within [x1, y1, x2, y2]. */
export function isPointInBoundingBox(
  x: number,
  y: number,
  box: [number, number, number, number]
): boolean {
  const [x1, y1, x2, y2] = box;
  return x >= x1 && x <= x2 && y >= y1 && y <= y2;
}


/**
 * For more accurate selection:
 * - rectangle/circle/text => bounding box is okay
 * - line => check line distance
 * - freehand => check if point is within threshold of any segment
 */
export function isPointOnElement(x: number, y: number, element: Element) {
  // For rectangle/circle/text, bounding box might be enough
  if (
    element.type === "rectangle" ||
    element.type === "circle" ||
    element.type === "text"
  ) {
    const box = getBoundingBox(element);
    return isPointInBoundingBox(x, y, box);
  } else if (element.type === "line") {
    return isPointOnLine(x, y, element.start, element.end, 5); // 5 px threshold
  } else if (element.type === "freehand") {
    // Check each segment between consecutive points
    for (let i = 0; i < element.points.length - 1; i++) {
      const p1 = element.points[i];
      const p2 = element.points[i + 1];
      if (isPointOnLine(x, y, p1, p2, 5)) {
        return true;
      }
    }
    return false;
  }
}

/** Distance from a point to a line segment (p1->p2). Return true if within threshold. */
function isPointOnLine(
  x: number,
  y: number,
  p1: Point,
  p2: Point,
  threshold: number
) {
  const A = x - p1.x;
  const B = y - p1.y;
  const C = p2.x - p1.x;
  const D = p2.y - p1.y;

  const dot = A * C + B * D;
  const lenSq = C * C + D * D;
  let param = -1;
  if (lenSq !== 0) param = dot / lenSq;

  let xx, yy;
  if (param < 0) {
    xx = p1.x;
    yy = p1.y;
  } else if (param > 1) {
    xx = p2.x;
    yy = p2.y;
  } else {
    xx = p1.x + param * C;
    yy = p1.y + param * D;
  }

  const dx = x - xx;
  const dy = y - yy;
  const dist = Math.sqrt(dx * dx + dy * dy);
  return dist < threshold;
}



/** Creates a shallow copy of an element with an offset for duplication. */
export function cloneElement(element: Element): Element {
  const OFFSET = 20;
  switch (element.type) {
    case "rectangle":
      return {
        ...element,
        x: element.x + OFFSET,
        y: element.y + OFFSET,
      };
    case "circle":
      return {
        ...element,
        x: element.x + OFFSET,
        y: element.y + OFFSET,
      };
    case "line":
      return {
        ...element,
        start: { x: element.start.x + OFFSET, y: element.start.y + OFFSET },
        end: { x: element.end.x + OFFSET, y: element.end.y + OFFSET },
      };
    case "freehand":
      return {
        ...element,
        points: element.points.map((p) => ({
          x: p.x + OFFSET,
          y: p.y + OFFSET,
        })),
      };
    case "text":
      return {
        ...element,
        x: element.x + OFFSET,
        y: element.y + OFFSET,
      };
  }
}
