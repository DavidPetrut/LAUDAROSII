import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
} from "react";

/**
 * Context global pentru Drag and Drop
 * Gestionează starea drag-ului și comunicarea între DraggableItem și DropZone
 */

const DragContext = createContext(null);

export const DragProvider = ({ children }) => {
  // Item-ul care este în curs de drag
  const [draggedItem, setDraggedItem] = useState(null);
  // Poziția curentă a item-ului (pentru detectare drop zone)
  const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 });
  // Dacă drag-ul este activ
  const [isDragging, setIsDragging] = useState(false);

  // Referință pentru drop zones înregistrate
  const dropZonesRef = useRef(new Map());

  /**
   * Înregistrează o drop zone
   */
  const registerDropZone = useCallback((id, config) => {
    dropZonesRef.current.set(id, config);
  }, []);

  /**
   * Deînregistrează o drop zone
   */
  const unregisterDropZone = useCallback((id) => {
    dropZonesRef.current.delete(id);
  }, []);

  /**
   * Începe drag-ul
   */
  const startDrag = useCallback((item, position) => {
    setDraggedItem(item);
    setDragPosition(position);
    setIsDragging(true);
  }, []);

  /**
   * Actualizează poziția în timpul drag-ului
   */
  const updateDragPosition = useCallback((position) => {
    setDragPosition(position);
  }, []);

  /**
   * Termină drag-ul și verifică dacă s-a făcut drop pe o zonă validă
   */
  const endDrag = useCallback(
    (finalPosition) => {
      let dropResult = null;

      // Verifică fiecare drop zone înregistrată
      dropZonesRef.current.forEach((config, id) => {
        if (config.bounds && isPositionInBounds(finalPosition, config.bounds)) {
          // Verifică dacă zona acceptă acest item
          if (
            !config.acceptTypes ||
            config.acceptTypes.includes(draggedItem?.type)
          ) {
            dropResult = {
              zoneId: id,
              item: draggedItem,
              position: finalPosition,
            };
            // Apelează callback-ul de drop
            config.onDrop?.(draggedItem);
          }
        }
      });

      // Reset state
      setDraggedItem(null);
      setDragPosition({ x: 0, y: 0 });
      setIsDragging(false);

      return dropResult;
    },
    [draggedItem]
  );

  /**
   * Verifică dacă poziția este în interiorul bounds-urilor
   */
  const isPositionInBounds = (position, bounds) => {
    return (
      position.x >= bounds.x &&
      position.x <= bounds.x + bounds.width &&
      position.y >= bounds.y &&
      position.y <= bounds.y + bounds.height
    );
  };

  /**
   * Verifică dacă poziția curentă este deasupra unei drop zone
   */
  const getActiveDropZone = useCallback(() => {
    let activeZone = null;

    dropZonesRef.current.forEach((config, id) => {
      if (config.bounds && isPositionInBounds(dragPosition, config.bounds)) {
        if (
          !config.acceptTypes ||
          config.acceptTypes.includes(draggedItem?.type)
        ) {
          activeZone = id;
        }
      }
    });

    return activeZone;
  }, [dragPosition, draggedItem]);

  const value = {
    draggedItem,
    dragPosition,
    isDragging,
    startDrag,
    updateDragPosition,
    endDrag,
    registerDropZone,
    unregisterDropZone,
    getActiveDropZone,
  };

  return <DragContext.Provider value={value}>{children}</DragContext.Provider>;
};

export const useDrag = () => {
  const context = useContext(DragContext);
  if (!context) {
    throw new Error("useDrag must be used within a DragProvider");
  }
  return context;
};

export default DragContext;
