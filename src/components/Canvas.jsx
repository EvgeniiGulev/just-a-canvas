import React, { useRef, useState, useEffect } from "react";

export const DrawingCanvas = () => {
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isEraser, setIsEraser] = useState(false); // Track whether eraser is active
  const [history, setHistory] = useState([]); // Store canvas history (for undo)
  const [redoHistory, setRedoHistory] = useState([]); // Store canvas history (for redo)
  const [currentHistoryIndex, setCurrentHistoryIndex] = useState(-1); // Track the current history position

  // Set up canvas context once the component mounts
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.strokeStyle = "black"; // Default drawing color
    ctx.lineCap = "round"; // Optional: for smoother lines
    ctxRef.current = ctx;

    // Listen for the "Control + Z" (or "Command + Z" on Mac) key press for undo
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        undoLastStroke();
      }
      // Listen for "Ctrl + Y" or "Cmd + Y" to redo the last undone stroke
      if ((e.ctrlKey || e.metaKey) && e.key === "y") {
        redoLastStroke();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [history, redoHistory]); // Re-run this when history or redoHistory changes

  // Capture the current canvas state to the history stack
  const saveStateToHistory = () => {
    const canvas = canvasRef.current;
    const imageData = canvas.toDataURL(); // Capture the current canvas as an image data URL

    // Trim the history stack if we are in the middle of it (in case of new strokes after undo)
    if (currentHistoryIndex < history.length - 1) {
      setHistory((prev) => prev.slice(0, currentHistoryIndex + 1));
    }

    // Push the current state to history and update the history index
    setHistory((prev) => [...prev, imageData]);
    setCurrentHistoryIndex((prev) => prev + 1);

    // Clear the redo history when a new stroke is made
    setRedoHistory([]);
  };

  // Start drawing or erasing
  const startDrawing = (e) => {
    if (e.button === 0 || e.button === 2) {
      const canvas = canvasRef.current;
      const ctx = ctxRef.current;
      ctx.beginPath();
      ctx.moveTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
      setIsDrawing(true);

      // Check if eraser is active
      if (e.button === 2 || isEraser) {
        ctx.globalCompositeOperation = "destination-out"; // Erasing mode
        ctx.lineWidth = 20; // Eraser size
      } else {
        ctx.globalCompositeOperation = "source-over"; // Drawing mode
        ctx.lineWidth = 2; // Pen size
      }
    }
  };

  // Draw while mouse is down
  const draw = (e) => {
    if (!isDrawing) return;
    const ctx = ctxRef.current;
    ctx.lineTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
    ctx.stroke();
  };

  // Stop drawing or erasing
  const stopDrawing = () => {
    const ctx = ctxRef.current;
    ctx.closePath();
    setIsDrawing(false);
    saveStateToHistory(); // Save state to history after drawing
  };

  // Undo the last stroke
  const undoLastStroke = () => {
    if (currentHistoryIndex > 0) {
      const canvas = canvasRef.current;
      const ctx = ctxRef.current;

      // Save the current state to redoHistory before undoing
      setRedoHistory((prev) => [
        ...prev,
        history[currentHistoryIndex], // Save the undone state to redo
      ]);

      // Move the current history index back
      setCurrentHistoryIndex((prev) => prev - 1);

      const prevState = history[currentHistoryIndex - 1]; // Get the previous state

      // Redraw the previous state on the canvas
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear the canvas
        ctx.drawImage(img, 0, 0); // Draw the previous state
      };
      img.src = prevState;
    }
  };

  // Redo the last undone stroke
  const redoLastStroke = () => {
    if (redoHistory.length > 0) {
      const canvas = canvasRef.current;
      const ctx = ctxRef.current;

      // Get the last undone stroke from redoHistory
      const lastUndoneState = redoHistory[redoHistory.length - 1];

      // Redraw the last undone state on the canvas
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear the canvas
        ctx.drawImage(img, 0, 0); // Draw the previous state
      };
      img.src = lastUndoneState;

      // Add the last undone state back to history
      setHistory((prev) => [...prev, lastUndoneState]);
      setCurrentHistoryIndex((prev) => prev + 1);

      // Remove the last undone state from redoHistory
      setRedoHistory((prev) => prev.slice(0, prev.length - 1));
    }
  };

  return (
    <div>
      <canvas
        className="canvas"
        ref={canvasRef}
        width={1280}
        height={720}
        style={{
          cursor: isEraser ? "cell" : "crosshair", // Change cursor based on mode
          border: "1px solid black", // Optional styling to see canvas boundaries
        }}
        onMouseDown={(e) => startDrawing(e)} // Start drawing when mouse is pressed
        onMouseMove={(e) => draw(e)} // Draw while moving the mouse
        onMouseUp={stopDrawing} // Stop drawing when mouse is released
        onMouseLeave={stopDrawing} // Stop drawing when mouse leaves the canvas
        onContextMenu={(e) => e.preventDefault()} // Disable right-click context menu
      ></canvas>
    </div>
  );
};
