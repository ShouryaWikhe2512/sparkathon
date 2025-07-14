"use client";

import { useState, useCallback, forwardRef, useImperativeHandle } from "react";
import ProductSelector from "./ProductSelector";
import StoreMap from "./StoreMap";
import DirectionsPanel from "./DirectionsPanel";
import {
  aisles,
  products,
  createGrid,
  entrance,
  checkout,
} from "../data/storeData";
import { AStar } from "../utils/pathfinding";
import { PathStep } from "../types/store";

const StoreNavigationApp = forwardRef(function StoreNavigationApp(_, ref) {
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [highlightedAisles, setHighlightedAisles] = useState<string[]>([]);
  const [path, setPath] = useState<PathStep[]>([]);
  const [isRouteGenerated, setIsRouteGenerated] = useState(false);

  const handleProductSelect = useCallback((productId: string) => {
    setSelectedProducts((prev) => [...prev, productId]);
  }, []);

  const handleProductRemove = useCallback((productId: string) => {
    setSelectedProducts((prev) => prev.filter((id) => id !== productId));
  }, []);

  const generateRoute = useCallback(() => {
    if (selectedProducts.length === 0) {
      setPath([]);
      setHighlightedAisles([]);
      return;
    }

    // Get unique aisles from selected products
    const selectedAisles = new Set(
      selectedProducts
        .map((productId) => {
          const product = products.find((p) => p.id === productId);
          return product?.aisle;
        })
        .filter(Boolean)
    );

    const uniqueAisles = Array.from(selectedAisles) as string[];
    setHighlightedAisles(uniqueAisles);

    // Create grid for pathfinding
    const grid = createGrid();
    const pathfinder = new AStar(grid);

    // Calculate route through all aisles
    const aislePositions = uniqueAisles
      .map((aisleId) => {
        const aisle = aisles.find((a) => a.id === aisleId);
        if (!aisle) return null;

        // Find the closest walkable position to the aisle center
        const centerX = aisle.position.x + Math.floor(aisle.width / 2);
        const centerY = aisle.position.y + Math.floor(aisle.height / 2);

        // Find nearest walkable cell
        for (let radius = 1; radius <= 5; radius++) {
          for (let dx = -radius; dx <= radius; dx++) {
            for (let dy = -radius; dy <= radius; dy++) {
              const x = centerX + dx;
              const y = centerY + dy;
              if (
                x >= 0 &&
                x < 20 &&
                y >= 0 &&
                y < 15 &&
                grid[y][x].isWalkable
              ) {
                return { x, y };
              }
            }
          }
        }
        return null;
      })
      .filter(Boolean);

    // Calculate full path: Entrance → Aisles → Checkout
    const fullPath: PathStep[] = [];
    let currentPosition = entrance;

    // Visit each aisle
    for (const aislePos of aislePositions) {
      if (aislePos) {
        const segmentPath = pathfinder.findPath(currentPosition, aislePos);
        if (segmentPath.length > 0) {
          // Remove the first step if it's not the very first segment (to avoid duplicates)
          const pathToAdd =
            fullPath.length > 0 ? segmentPath.slice(1) : segmentPath;
          fullPath.push(...pathToAdd);
          currentPosition = aislePos;
        }
      }
    }

    // Path to checkout
    const checkoutPath = pathfinder.findPath(currentPosition, checkout);
    if (checkoutPath.length > 0) {
      fullPath.push(...checkoutPath.slice(1));
    }

    setPath(fullPath);
    setIsRouteGenerated(false);
  }, [selectedProducts]);

  const handlePathComplete = useCallback(() => {
    setIsRouteGenerated(true);
  }, []);

  // Expose addProductsToList to parent
  useImperativeHandle(ref, () => ({
    addProductsToList: (productIds: string[]) => {
      setSelectedProducts((prev) => {
        // Add only products not already in the list
        const newIds = productIds.filter((id) => !prev.includes(id));
        return [...prev, ...newIds];
      });
    },
    generateRoute: () => generateRoute(),
    removeProductsFromList: (productIds: string[]) => {
      setSelectedProducts((prev) =>
        prev.filter((id) => !productIds.includes(id))
      );
    },
  }));

  const estimatedTime = Math.ceil(path.length * 0.5); // Rough estimate
  const totalDistance = path.length;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Product Selector */}
      <div className="lg:col-span-1">
        <ProductSelector
          products={products}
          selectedProducts={selectedProducts}
          onProductSelect={handleProductSelect}
          onProductRemove={handleProductRemove}
          onGenerateRoute={generateRoute}
        />
      </div>

      {/* Store Map */}
      <div className="lg:col-span-2">
        <StoreMap
          aisles={aisles}
          highlightedAisles={highlightedAisles}
          path={path}
          onPathComplete={handlePathComplete}
        />
      </div>

      {/* Directions Panel */}
      <div className="lg:col-span-1 h-50 overflow-auto">
        <DirectionsPanel
          path={path}
          estimatedTime={estimatedTime}
          totalDistance={totalDistance}
        />
      </div>
    </div>
  );
});

export default StoreNavigationApp;
