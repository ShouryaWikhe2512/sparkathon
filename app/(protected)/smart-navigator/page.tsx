"use client";
import { useState, useRef } from "react";
import { Navigation, Image as ImageIcon, Loader2 } from "lucide-react";
import Sidebar from "../../components/Sidebar";
import MobileNav from "../../components/MobileNav";
import StoreNavigationApp from "../../components/StoreNavigationApp";

export default function SmartNavigatorPage() {
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<string[]>([]);
  const [added, setAdded] = useState<string[]>([]);
  const navRef = useRef<any>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setImage(file);
    setResults([]);
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => setPreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setPreview(null);
    }
  };

  const handleAnalyze = async () => {
    if (!image) return;
    setLoading(true);
    setResults([]);
    try {
      // Convert image to base64
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const base64 = ev.target?.result as string;
        const res = await fetch("/api/gemini-analyze-photo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageBase64: base64 }),
        });
        const data = await res.json();
        setResults(data.products || []);
        setLoading(false);
      };
      reader.readAsDataURL(image);
    } catch (e) {
      setLoading(false);
      setResults([]);
      alert("Failed to analyze photo.");
    }
  };

  const handleAddProduct = (product: string) => {
    if (!navRef.current) return;
    // Find product ID by name (case-insensitive)
    const productObj = require("../../data/storeData").products.find(
      (p: any) => p.name.toLowerCase() === product.toLowerCase()
    );
    if (productObj) {
      navRef.current.addProductsToList([productObj.id]);
      navRef.current.generateRoute();
      setAdded((prev) => [...prev, product]);
    }
  };

  const handleAddAll = () => {
    if (!navRef.current) return;
    const storeProducts = require("../../data/storeData").products;
    const idsToAdd: string[] = [];
    const namesToAdd: string[] = [];
    results.forEach((product) => {
      const productObj = storeProducts.find(
        (p: any) => p.name.toLowerCase() === product.toLowerCase()
      );
      if (productObj && !added.includes(product)) {
        idsToAdd.push(productObj.id);
        namesToAdd.push(product);
      }
    });
    if (idsToAdd.length > 0) {
      navRef.current.addProductsToList(idsToAdd);
      navRef.current.generateRoute();
      setAdded((prev) => [...prev, ...namesToAdd]);
    }
  };

  // Undo handler for removing a product from the route and 'added' state
  const handleUndoProduct = (product: string) => {
    if (!navRef.current) return;
    const productObj = require("../../data/storeData").products.find(
      (p: any) => p.name.toLowerCase() === product.toLowerCase()
    );
    if (productObj) {
      navRef.current.removeProductsFromList([productObj.id]);
      navRef.current.generateRoute();
      setAdded((prev) => prev.filter((p) => p !== product));
    }
  };

  // Cancel all handler for removing all added products that are available
  const handleCancelAll = () => {
    if (!navRef.current) return;
    const storeProducts = require("../../data/storeData").products;
    const addedAvailable = added.filter((product) =>
      storeProducts.some(
        (p: any) => p.name.toLowerCase() === product.toLowerCase()
      )
    );
    const idsToRemove = addedAvailable
      .map((product) => {
        const productObj = storeProducts.find(
          (p: any) => p.name.toLowerCase() === product.toLowerCase()
        );
        return productObj?.id;
      })
      .filter(Boolean);
    if (idsToRemove.length > 0) {
      navRef.current.removeProductsFromList(idsToRemove);
      navRef.current.generateRoute();
      setAdded((prev) => prev.filter((p) => !addedAvailable.includes(p)));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="hidden lg:block">
        <Sidebar />
      </div>
      <MobileNav />

      <div className="lg:pl-64">
        <div className="px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 bg-gradient-to-br from-[#04b7cf] to-[#04cf84] rounded-lg flex items-center justify-center">
                <Navigation className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">
                Smart Store Navigator
              </h1>
            </div>
            <p className="text-gray-600">
              Navigate your store with intelligent pathfinding and voice
              guidance
            </p>
          </div>

          {/* Photo Analysis UI */}
          <div className="bg-white rounded-xl shadow-md p-6 mb-8">
            <div className="flex flex-col md:flex-row gap-8">
              {/* Upload Photo Section */}
              <div className="flex flex-col items-center md:items-start md:w-1/2">
                <label className="flex flex-col items-center cursor-pointer">
                  <span className="flex items-center gap-2 text-[#04b7cf] font-medium mb-2">
                    <ImageIcon className="w-5 h-5" /> Upload Photo
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageChange}
                  />
                  {preview && (
                    <img
                      src={preview}
                      alt="Preview"
                      className="mt-2 w-32 h-32 object-cover rounded-lg border"
                    />
                  )}
                </label>
                <button
                  onClick={handleAnalyze}
                  disabled={!image || loading}
                  className="mt-4 bg-[#04b7cf] text-white px-6 py-2 rounded-lg hover:bg-[#04cf84] transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : null}
                  Analyze Photo
                </button>
              </div>

              {/* Suggested Products Section */}
              <div className="md:w-1/2 w-full mt-8 md:mt-0">
                <h3 className="font-semibold text-gray-800 mb-2">
                  Suggested Products:
                </h3>
                {(() => {
                  const storeProducts =
                    require("../../data/storeData").products;
                  const availableResults = results.filter((item) =>
                    storeProducts.some(
                      (p: any) => p.name.toLowerCase() === item.toLowerCase()
                    )
                  );
                  const allAdded =
                    availableResults.length > 0 &&
                    availableResults.every((p) => added.includes(p));
                  if (allAdded) {
                    return (
                      <button
                        onClick={handleCancelAll}
                        className="mb-4 bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors"
                      >
                        Cancel All
                      </button>
                    );
                  } else {
                    return (
                      <button
                        onClick={handleAddAll}
                        disabled={
                          availableResults.length === 0 ||
                          availableResults.every((p) => added.includes(p))
                        }
                        className="mb-4 bg-[#04b7cf] text-white px-4 py-2 rounded-lg hover:bg-[#04cf84] transition-colors disabled:opacity-50"
                      >
                        Add All to Route
                      </button>
                    );
                  }
                })()}
                <ol className="list-decimal pl-6 text-gray-700">
                  {results.length === 0 ? (
                    <li className="text-gray-400">
                      No products suggested yet.
                    </li>
                  ) : (
                    results.map((item, idx) => {
                      const storeProducts =
                        require("../../data/storeData").products;
                      const isAvailable = storeProducts.some(
                        (p: any) => p.name.toLowerCase() === item.toLowerCase()
                      );
                      return (
                        <li key={idx} className="flex items-center gap-2 mb-2">
                          <span className="min-w-[120px]">{`${
                            idx + 1
                          }. ${item}`}</span>
                          {!isAvailable && (
                            <span className="text-xs text-red-500 font-semibold ml-1">
                              Not available
                            </span>
                          )}
                          {isAvailable && (
                            <button
                              onClick={() =>
                                added.includes(item)
                                  ? handleUndoProduct(item)
                                  : handleAddProduct(item)
                              }
                              className={`w-16 px-2 py-1 rounded text-xs font-medium text-center transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#04b7cf] shadow-sm
                                ${
                                  added.includes(item)
                                    ? "bg-red-500 text-white hover:bg-red-600"
                                    : "bg-[#04b7cf] text-white hover:bg-[#04cf84]"
                                }
                              `}
                            >
                              {added.includes(item) ? "Cancel" : "Add"}
                            </button>
                          )}
                        </li>
                      );
                    })
                  )}
                </ol>
              </div>
            </div>
          </div>

          <StoreNavigationApp ref={navRef} />
        </div>
      </div>
    </div>
  );
}
