"use client";

import { useState, useEffect, useRef } from "react";
import { ShoppingCart, X, ChevronDown, ChevronUp, Users } from "lucide-react";
import { useUser } from "@clerk/nextjs";
import Sidebar from "../../components/Sidebar";
import MobileNav from "../../components/MobileNav";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Loader from "../../components/Loader";

export default function SmartSearchPage() {
  const { user, isLoaded } = useUser();
  const [userQuery, setUserQuery] = useState("");
  const [suggestions, setSuggestions] = useState<{ [key: string]: any[] }>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [maxPriceFilter, setMaxPriceFilter] = useState<number>(0);
  const [cart, setCart] = useState<any[]>([]); // 🛒 Cart state
  const [isCartOpen, setIsCartOpen] = useState(false); // Cart dropdown state
  const [showPodSelection, setShowPodSelection] = useState(false); // Pod selection modal
  const [availablePods, setAvailablePods] = useState<any[]>([]); // Available pods
  const [selectedPod, setSelectedPod] = useState<any>(null); // Selected pod
  const [isSendingToPod, setIsSendingToPod] = useState(false); // Loading state
  const [isFetchingPods, setIsFetchingPods] = useState(false); // Loading state for fetching pods
  const cartRef = useRef<HTMLDivElement>(null);

  // Close cart dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (cartRef.current && !cartRef.current.contains(event.target as Node)) {
        setIsCartOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleSmartSearch = async () => {
    if (!userQuery.trim()) return;

    setLoading(true);
    setError("");
    setSuggestions({});

    try {
      const response = await fetch("/api/ai-suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: userQuery }),
      });

      const raw = await response.text();
      const data = JSON.parse(raw);
      console.log("✅ Final suggestions to render:", data.products);

      if (!data.products || Object.keys(data.products).length === 0) {
        setSuggestions({});
        setError("No suggestions found.");
      } else {
        setSuggestions(data.products);
      }
    } catch (err) {
      console.error("❌ Fetch error:", err);
      setError("Something went wrong while fetching suggestions.");
    }

    setLoading(false);
  };

  const handleAddToCart = (item: any) => {
    setCart((prev) => [...prev, item]);
    console.log("🛒 Cart Updated:", [...cart, item]);
  };

  const getItemQuantity = (item: any) => {
    return cart.filter(
      (cartItem: any) =>
        (cartItem.title === item.title && cartItem.price === item.price) ||
        (cartItem.name === item.name && cartItem.price === item.price)
    ).length;
  };

  const handleQuantityChange = (item: any, change: number) => {
    const currentQuantity = getItemQuantity(item);
    const newQuantity = currentQuantity + change;

    if (newQuantity <= 0) {
      // Remove all instances of this item
      setCart((prev) =>
        prev.filter(
          (cartItem: any) =>
            !(
              (cartItem.title === item.title &&
                cartItem.price === item.price) ||
              (cartItem.name === item.name && cartItem.price === item.price)
            )
        )
      );
    } else {
      // Add or remove items based on change
      if (change > 0) {
        setCart((prev) => [...prev, item]);
      } else {
        // Remove one instance
        setCart((prev) => {
          const itemIndex = prev.findIndex(
            (cartItem: any) =>
              (cartItem.title === item.title &&
                cartItem.price === item.price) ||
              (cartItem.name === item.name && cartItem.price === item.price)
          );
          if (itemIndex !== -1) {
            return prev.filter((_, index) => index !== itemIndex);
          }
          return prev;
        });
      }
    }
  };

  const handleRemoveFromCart = (index: number) => {
    setCart((prev) => prev.filter((_, i) => i !== index));
  };

  const calculateTotalPrice = () => {
    return cart.reduce((total, item) => total + (item.price || 0), 0);
  };

  const getCartItemCount = () => {
    return cart.length;
  };

  // Fetch available shopping pods
  const fetchAvailablePods = async () => {
    if (!user) {
      console.error("No user found");
      return;
    }

    setIsFetchingPods(true);
    try {
      const response = await fetch(`/api/pod/user?userId=${user.id}`);
      const data = await response.json();

      if (data.pods) {
        setAvailablePods(data.pods);
      } else {
        console.error("Failed to fetch pods:", data.error);
        setAvailablePods([]);
      }
    } catch (error) {
      console.error("Error fetching pods:", error);
      setAvailablePods([]);
    } finally {
      setIsFetchingPods(false);
    }
  };

  // Send cart items to selected pod
  const sendToShoppingPod = async () => {
    if (!selectedPod || cart.length === 0 || !user) return;

    setIsSendingToPod(true);

    try {
      // Send each item to the pod
      const promises = cart.map(async (item) => {
        const response = await fetch("/api/pod/item", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            podId: selectedPod.id,
            productId:
              item.id || item.productId || `smart-search-${Date.now()}`,
            name: item.title || item.name,
            price: item.price || 0,
            quantity: getItemQuantity(item),
            addedById: user.id, // Use actual user ID
          }),
        });

        return response.json();
      });

      await Promise.all(promises);

      // Clear cart after successful send
      setCart([]);
      setSelectedPod(null);
      setShowPodSelection(false);

      // Show success message (you can add a toast notification here)
      toast.success(
        `Successfully sent ${cart.length} items to ${selectedPod.name}!`
      );
    } catch (error) {
      console.error("Error sending items to pod:", error);
      toast.error("Failed to send items to pod. Please try again.");
    } finally {
      setIsSendingToPod(false);
    }
  };

  const filteredSuggestions = Object.fromEntries(
    Object.entries(suggestions)
      .map(([type, items]) => [
        type,
        items.filter(
          (item) =>
            !maxPriceFilter ||
            (item.price !== undefined && item.price <= maxPriceFilter)
        ),
      ])
      .filter(([_, items]) => items.length > 0)
  );

  // Show loading state while Clerk is loading
  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader className="mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show message if user is not authenticated
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">
            Please sign in to access the smart search.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <ToastContainer
        position="top-center"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
      <Sidebar />
      <MobileNav />

      <div className="lg:pl-64">
        <div className="px-4 sm:px-6 lg:px-8 py-8">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-6">
              <h1 className="text-3xl font-bold mb-2">🛒 AI Smart Cart</h1>
              <p className="text-gray-600">
                Describe your trip or purpose and get AI-powered suggestions.
              </p>

              {/* Cart Dropdown */}
              <div className="relative inline-block mt-4" ref={cartRef}>
                <button
                  onClick={() => setIsCartOpen(!isCartOpen)}
                  className="flex items-center gap-2 bg-[#04b7cf] text-white px-4 py-2 rounded-lg hover:bg-[#04cf84] transition-colors"
                >
                  <ShoppingCart className="w-5 h-5" />
                  <span>Cart Items ({getCartItemCount()})</span>
                  {isCartOpen ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>

                {/* Cart Dropdown Menu */}
                {isCartOpen && (
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-lg font-semibold text-gray-800">
                          Shopping Cart
                        </h3>
                        <button
                          onClick={() => setIsCartOpen(false)}
                          className="text-gray-500 hover:text-gray-700"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>

                      {cart.length === 0 ? (
                        <div className="text-center py-6">
                          <ShoppingCart className="w-12 h-12 mx-auto text-gray-300 mb-2" />
                          <p className="text-gray-500">Your cart is empty</p>
                        </div>
                      ) : (
                        <>
                          <div className="max-h-64 overflow-y-auto space-y-2">
                            {cart.map((item, index) => (
                              <div
                                key={index}
                                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                              >
                                <div className="flex-1">
                                  <p className="font-medium text-sm text-gray-800">
                                    {item.title || item.name}
                                  </p>
                                  {item.price !== undefined && (
                                    <p className="text-sm text-green-600 font-semibold">
                                      ₹{Number(item.price).toFixed(2)}
                                    </p>
                                  )}
                                </div>
                                <button
                                  onClick={() => handleRemoveFromCart(index)}
                                  className="ml-2 text-red-500 hover:text-red-700"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            ))}
                          </div>

                          <div className="border-t border-gray-200 pt-3 mt-3">
                            <div className="flex justify-between items-center">
                              <span className="font-semibold text-gray-800">
                                Total:
                              </span>
                              <span className="text-lg font-bold text-green-600">
                                ₹{calculateTotalPrice().toFixed(2)}
                              </span>
                            </div>
                            {/* <button className="w-full mt-3 bg-green-500 text-white py-2 px-4 rounded-lg hover:bg-green-600 transition-colors">
                              Proceed to Checkout
                            </button> */}
                            <button
                              onClick={() => {
                                fetchAvailablePods();
                                setShowPodSelection(true);
                              }}
                              className="w-full mt-2 bg-[#04b7cf] text-white py-2 px-4 rounded-lg hover:bg-[#04cf84]
                               transition-colors flex items-center justify-center gap-2"
                            >
                              <Users className="w-4 h-4" />
                              Send to Shopping Pod
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Input Section */}
            <div className="bg-white p-6 rounded-xl shadow-md text-center">
              <input
                type="text"
                placeholder="e.g. Goa trip essentials"
                value={userQuery}
                onChange={(e) => setUserQuery(e.target.value)}
                className="w-full p-3 border rounded-lg mb-4"
              />
              <button
                onClick={handleSmartSearch}
                className="bg-[#04b7cf] text-white px-6 py-2 rounded-lg hover:bg-[#04cf84]"
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center gap-2 justify-center">
                    <Loader size={20} /> Loading...
                  </span>
                ) : (
                  "Get Suggestions"
                )}
              </button>
              {error && <p className="text-red-500 mt-4">{error}</p>}
            </div>

            {/* Filter UI */}
            {Object.keys(suggestions).length > 0 && (
              <div className="flex justify-end mt-6 mb-2">
                <label className="text-sm text-gray-700 mr-2">Max Price:</label>
                <select
                  onChange={(e) => setMaxPriceFilter(Number(e.target.value))}
                  className="border px-2 py-1 rounded"
                >
                  <option value={0}>No Filter</option>
                  <option value={10}>Under ₹10</option>
                  <option value={20}>Under ₹20</option>
                  <option value={50}>Under ₹50</option>
                  <option value={100}>Under ₹100</option>
                  <option value={200}>Under ₹200</option>
                </select>
              </div>
            )}

            {/* No suggestions yet */}
            {!loading && !error && Object.keys(suggestions).length === 0 && (
              <div className="text-center text-gray-500 mt-6">
                🤖 No suggestions yet. Try describing your trip!
              </div>
            )}

            {/* Render Filtered Suggestions */}
            {Object.keys(filteredSuggestions).length > 0 && (
              <div className="mt-4 bg-white p-6 rounded-xl shadow-md">
                <h2 className="text-xl font-semibold mb-6 text-center">
                  Suggested Items
                </h2>
                <div className="space-y-8">
                  {Object.entries(filteredSuggestions).map(
                    ([type, items]: any) => (
                      <div key={type} className="category-section">
                        <h3 className="text-xl font-bold text-black mb-4 capitalize flex items-center gap-2">
                          <span className="w-2 h-2 bg-[#04b7cf] rounded-full"></span>
                          {type}
                        </h3>

                        {/* Horizontal Scrolling Container */}
                        <div className="relative group">
                          {/* Gradient fade indicators */}
                          <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-white to-transparent pointer-events-none z-10"></div>
                          <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white to-transparent pointer-events-none z-10"></div>

                          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide horizontal-scroll">
                            {items.map((item: any, index: number) => (
                              <div
                                key={index}
                                className="flex-shrink-0 w-72 bg-gray-50 rounded-lg border border-gray-200 hover:shadow-md transition-shadow flex flex-col"
                              >
                                <div className="p-4 flex-1">
                                  <div className="flex items-start gap-3 mb-3">
                                    {item.image && (
                                      <img
                                        src={item.image}
                                        alt={item.title || item.name}
                                        className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
                                      />
                                    )}
                                    <div className="flex-1 min-w-0">
                                      <h4 className="font-semibold text-gray-800 text-sm leading-tight mb-1">
                                        {item.title || item.name}
                                      </h4>
                                      {item.price !== undefined && (
                                        <p className="text-sm text-green-600 font-bold mb-1">
                                          ₹{Number(item.price).toFixed(2)}
                                        </p>
                                      )}
                                      {item.quantity !== undefined && (
                                        <p className="text-xs text-gray-500">
                                          In Stock: {item.quantity}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {/* Uniform Add to Cart Button */}
                                <div className="px-4 pb-4">
                                  {getItemQuantity(item) > 0 ? (
                                    <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg p-2">
                                      <span className="text-xs text-green-700 font-medium">
                                        Qty: {getItemQuantity(item)}
                                      </span>
                                      <div className="flex items-center gap-1">
                                        <button
                                          onClick={() =>
                                            handleQuantityChange(item, -1)
                                          }
                                          className="w-6 h-6 bg-green-500 text-white rounded-full hover:bg-green-600 transition-colors flex items-center justify-center text-xs"
                                        >
                                          -
                                        </button>
                                        <button
                                          onClick={() =>
                                            handleQuantityChange(item, 1)
                                          }
                                          className="w-6 h-6 bg-green-500 text-white rounded-full hover:bg-green-600 transition-colors flex items-center justify-center text-xs"
                                        >
                                          +
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <button
                                      onClick={() => handleAddToCart(item)}
                                      className="w-full bg-[#04b7cf] text-white text-xs px-3 py-2 rounded-lg hover:bg-[#04cf84] transition-colors font-medium"
                                    >
                                      Add to Cart
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Scroll Indicators */}
                          <div className="flex justify-center mt-3">
                            <div className="flex gap-1">
                              {Array.from(
                                { length: Math.ceil(items.length / 3) },
                                (_, i) => (
                                  <div
                                    key={i}
                                    className="w-2 h-2 bg-gray-300 rounded-full"
                                  ></div>
                                )
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Pod Selection Modal */}
      {showPodSelection && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md mx-auto">
            <h2 className="text-xl font-semibold mb-4 text-center">
              Select a Shopping Pod
            </h2>
            {/* Loader while fetching pods */}
            {isFetchingPods ? (
              <Loader className="my-8" />
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-800">
                    Select Shopping Pod
                  </h3>
                  <button
                    onClick={() => setShowPodSelection(false)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {availablePods.length === 0 ? (
                  <div className="text-center py-6">
                    <Users className="w-12 h-12 mx-auto text-gray-300 mb-2" />
                    <p className="text-gray-500 mb-4">
                      No shopping pods available
                    </p>
                    <p className="text-sm text-gray-400">
                      Create a shopping pod first to send items
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {availablePods.map((pod) => (
                        <div
                          key={pod.id}
                          onClick={() => setSelectedPod(pod)}
                          className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                            selectedPod?.id === pod.id
                              ? "border-[#04b7cf] bg-blue-50"
                              : "border-gray-200 hover:border-gray-300"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium text-gray-800">
                                {pod.name}
                              </h4>
                              <p className="text-sm text-gray-500">
                                {pod.members?.length || 0} members
                              </p>
                            </div>
                            {selectedPod?.id === pod.id && (
                              <div className="w-4 h-4 bg-[#04b7cf] rounded-full flex items-center justify-center">
                                <div className="w-2 h-2 bg-white rounded-full"></div>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-6 flex gap-3">
                      <button
                        onClick={() => setShowPodSelection(false)}
                        className="flex-1 py-2 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={sendToShoppingPod}
                        disabled={!selectedPod || isSendingToPod}
                        className="flex-1 py-2 px-4 bg-[#04b7cf] text-white rounded-lg hover:bg-[#04cf84] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isSendingToPod ? (
                          <span className="flex items-center gap-2 justify-center">
                            <Loader size={20} /> Sending...
                          </span>
                        ) : (
                          "Send to Pod"
                        )}
                      </button>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
