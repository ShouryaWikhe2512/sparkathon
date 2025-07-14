"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useUser } from "@clerk/nextjs";
import Sidebar from "../../components/Sidebar";
import MobileNav from "../../components/MobileNav";
import PodHeader from "../../components/PodHeader";
import ProductGrid from "../../components/ProductGrid";
import PodMembers from "../../components/PodMembers";
import PodCart from "../../components/PodCart";
import CreatePodModal from "../../components/CreatePodModal";
import InviteModal from "../../components/InviteModal";
import JoinPodModal from "../../components/JoinPodModal";
import PaymentModal from "../../components/PaymentModal";
import EmptyState from "../../components/EmptyState";
import Loader from "../../components/Loader";
import { useSocketIO } from "../../hooks/useWebSocket";
import { getRandomizedProducts, ProductItem } from "../../utils/productLoader";
import { toast } from "react-toastify";
import { useRef as useClickRef } from "react";

interface PodMember {
  id: string;
  name: string;
  avatar: string;
  isOwner: boolean;
}

interface PodItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  addedBy: {
    id: string;
    name: string;
    avatar: string;
  };
  addedAt: Date;
}

interface Pod {
  id: string;
  name: string;
  inviteCode: string;
  members: PodMember[];
  items: PodItem[];
  createdAt: Date;
  ownerId: string;
}

// Get randomized products from the JSON file
const PRODUCTS: ProductItem[] = getRandomizedProducts();

export default function ShoppingPodPage() {
  const { user, isLoaded } = useUser();
  const [pods, setPods] = useState<Pod[]>([]);
  const [currentPod, setCurrentPod] = useState<Pod | null>(null);
  const [showCreatePod, setShowCreatePod] = useState(false);
  const [newPodName, setNewPodName] = useState("");
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [copiedInvite, setCopiedInvite] = useState<string | null>(null);
  const [joinPodCode, setJoinPodCode] = useState("");
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [realtimeStatus, setRealtimeStatus] = useState<string>("disconnected");
  const [currentUserDbId, setCurrentUserDbId] = useState<string | null>(null);
  const [isPodsLoading, setIsPodsLoading] = useState(false); // Loading state for fetching pods
  const [isJoining, setIsJoining] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Ref to track if we're in the middle of creating/joining a pod
  const isCreatingOrJoiningRef = useRef(false);

  // Users dropdown state
  const [showUsersDropdown, setShowUsersDropdown] = useState(false);
  const usersDropdownRef = useClickRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        usersDropdownRef.current &&
        !usersDropdownRef.current.contains(event.target as Node)
      ) {
        setShowUsersDropdown(false);
      }
    }
    if (showUsersDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showUsersDropdown]);

  // Get current user from Clerk
  const currentUser = user
    ? {
        id: user.id,
        name: user.fullName || user.firstName || "Unknown User",
        avatar: "👤", // Use default avatar instead of Clerk image
        email: user.emailAddresses[0]?.emailAddress || "",
      }
    : null;

  // WebSocket connection - only connect when we have a current pod and user
  const { isConnected, sendMessage } = useSocketIO({
    podId: currentPod?.id || "",
    userId: currentUser?.id || "",
    onMessage: handleWebSocketMessage,
    onConnect: () => setRealtimeStatus("connected"),
    onDisconnect: () => setRealtimeStatus("disconnected"),
  });

  // Initialize with data from database
  useEffect(() => {
    async function fetchPods() {
      if (!currentUser) return;

      setIsPodsLoading(true);
      try {
        const res = await fetch(`/api/pod/user?userId=${currentUser.id}`);
        const data = await res.json();
        if (data.pods && data.pods.length > 0) {
          console.log(
            "Fetched pods:",
            data.pods.map((p: any) => ({ id: p.id, name: p.name }))
          );
          console.log("Current pod:", currentPod?.id);
          console.log("Is creating/joining:", isCreatingOrJoiningRef.current);

          setPods(data.pods);
          // Only set current pod if none is currently selected and we're not creating/joining
          if (!currentPod && !isCreatingOrJoiningRef.current) {
            console.log("Setting current pod to:", data.pods[0].name);
            setCurrentPod(data.pods[0]);
          }
        } else {
          setPods([]);
          setCurrentPod(null);
        }
      } catch (error) {
        console.error("Failed to fetch pods:", error);
      } finally {
        setIsPodsLoading(false);
      }
    }

    if (isLoaded && currentUser) {
      fetchPods();

      // Also fetch the current user's database ID
      const fetchCurrentUserDbId = async () => {
        try {
          const res = await fetch(`/api/user/db-id?clerkId=${currentUser.id}`);
          const data = await res.json();
          if (data.dbId) {
            setCurrentUserDbId(data.dbId);
          }
        } catch (error) {
          console.error("Failed to fetch user DB ID:", error);
        }
      };

      fetchCurrentUserDbId();
    }
  }, [isLoaded, currentUser?.id]); // Only depend on the user ID, not the entire user object

  function handleWebSocketMessage(message: any) {
    console.log("WebSocket message received:", message);

    switch (message.type) {
      case "member_joined":
        if (currentPod && message.podId === currentPod.id) {
          const updatedPod = {
            ...currentPod,
            members: [...currentPod.members, message.newMember],
          };
          setCurrentPod(updatedPod);
          setPods((prev) =>
            prev.map((pod) => (pod.id === currentPod.id ? updatedPod : pod))
          );
        }
        break;

      case "item_added":
        if (currentPod && message.podId === currentPod.id) {
          console.log("WebSocket: Adding item with ID:", message.item.id);
          const existingItemIndex = currentPod.items.findIndex(
            (item) => item.productId === message.item.productId
          );

          let updatedItems;
          if (existingItemIndex !== -1) {
            // Update existing item
            updatedItems = [...currentPod.items];
            updatedItems[existingItemIndex] = message.item;
          } else {
            // Add new item
            updatedItems = [...currentPod.items, message.item];
          }

          const updatedPod = {
            ...currentPod,
            items: updatedItems,
          };
          setCurrentPod(updatedPod);
          setPods((prev) =>
            prev.map((pod) => (pod.id === currentPod.id ? updatedPod : pod))
          );
        }
        break;

      case "item_updated":
        if (currentPod && message.podId === currentPod.id) {
          const updatedPod = {
            ...currentPod,
            items: currentPod.items.map((item) =>
              item.id === message.item.id ? message.item : item
            ),
          };
          setCurrentPod(updatedPod);
          setPods((prev) =>
            prev.map((pod) => (pod.id === currentPod.id ? updatedPod : pod))
          );
        }
        break;

      case "item_removed":
        if (currentPod && message.podId === currentPod.id) {
          const updatedPod = {
            ...currentPod,
            items: currentPod.items.filter(
              (item) => item.id !== message.itemId
            ),
          };
          setCurrentPod(updatedPod);
          setPods((prev) =>
            prev.map((pod) => (pod.id === currentPod.id ? updatedPod : pod))
          );
        }
        break;

      case "invite_sent":
        // Handle invite sent notification
        console.log("Invite sent:", message.inviteCode);
        break;

      default:
        console.log("Unknown message type:", message.type);
    }
  }

  const createPod = useCallback(async () => {
    if (!newPodName.trim() || !currentUser) return;

    isCreatingOrJoiningRef.current = true;
    setIsCreating(true);
    try {
      const response = await fetch("/api/pod/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: newPodName,
          ownerId: currentUser.id,
          ownerName: currentUser.name,
          ownerAvatar: currentUser.avatar,
          ownerEmail: currentUser.email,
        }),
      });

      const data = await response.json();

      if (data.success) {
        const newPod = data.pod;
        console.log("Created new pod:", newPod.name, "ID:", newPod.id);
        setPods((prev) => [...prev, newPod]);
        // Immediately set the new pod as current pod
        console.log("Setting current pod to newly created pod:", newPod.name);
        setCurrentPod(newPod);
        setShowCreatePod(false);
        setNewPodName("");

        // Send WebSocket message about new pod creation
        if (isConnected) {
          sendMessage({
            type: "pod_created",
            podId: newPod.id,
            podName: newPod.name,
          });
        }
      } else {
        console.error("Failed to create pod:", data.error);
      }
    } catch (error) {
      console.error("Error creating pod:", error);
    } finally {
      // Small delay to ensure state updates are processed before allowing pod switching
      setTimeout(() => {
        isCreatingOrJoiningRef.current = false;
        setIsCreating(false);
      }, 100);
    }
  }, [newPodName, currentUser, isConnected, sendMessage]);

  const generateInviteCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const addItemToPod = useCallback(
    async (productId: string) => {
      if (!currentPod || !currentUser) return;

      const product = PRODUCTS.find((p) => p.id === productId);
      if (!product) return;

      try {
        const response = await fetch("/api/pod/item", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            podId: currentPod.id,
            productId,
            name: product.name,
            price: product.price,
            quantity: 1,
            addedById: currentUser.id,
          }),
        });

        const data = await response.json();

        if (data.success) {
          console.log("API response item:", data.item);
          // Update local state with the real item data from API response
          const updatedPod = { ...currentPod };
          const existingItem = updatedPod.items.find(
            (item) => item.productId === productId
          );

          if (existingItem) {
            // Update existing item with new quantity
            console.log(
              "Updating existing item:",
              existingItem.id,
              "to quantity:",
              data.item.quantity
            );
            existingItem.quantity = data.item.quantity;
          } else {
            // Add new item with real ID from database
            console.log("Adding new item with ID:", data.item.id);
            updatedPod.items.push({
              id: data.item.id, // Use real ID from database
              productId: data.item.productId,
              name: data.item.name,
              price: data.item.price,
              quantity: data.item.quantity,
              addedBy: data.item.addedBy,
              addedAt: new Date(data.item.addedAt),
            });
          }

          setCurrentPod(updatedPod);
          setPods((prev) =>
            prev.map((pod) => (pod.id === currentPod.id ? updatedPod : pod))
          );

          // Send WebSocket message
          if (isConnected) {
            sendMessage({
              type: "item_added",
              podId: currentPod.id,
              item: data.item,
            });
          }
        }
      } catch (error) {
        console.error("Error adding item to pod:", error);
      }
    },
    [currentPod, currentUser, isConnected, sendMessage]
  );

  const updateItemQuantity = useCallback(
    async (itemId: string, change: number) => {
      if (!currentPod) return;

      try {
        const item = currentPod.items.find((item) => item.id === itemId);
        if (!item) return;

        const newQuantity = item.quantity + change;

        if (newQuantity <= 0) {
          // Remove item
          const response = await fetch(`/api/pod/item/${itemId}`, {
            method: "DELETE",
          });

          if (response.ok) {
            const updatedPod = {
              ...currentPod,
              items: currentPod.items.filter((item) => item.id !== itemId),
            };
            setCurrentPod(updatedPod);
            setPods((prev) =>
              prev.map((pod) => (pod.id === currentPod.id ? updatedPod : pod))
            );

            // Send WebSocket message
            if (isConnected) {
              sendMessage({
                type: "item_removed",
                podId: currentPod.id,
                itemId: itemId,
              });
            }
          }
        } else {
          // Update quantity
          const response = await fetch(`/api/pod/item/${itemId}`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ quantity: newQuantity }),
          });

          if (response.ok) {
            const updatedPod = {
              ...currentPod,
              items: currentPod.items.map((item) =>
                item.id === itemId ? { ...item, quantity: newQuantity } : item
              ),
            };
            setCurrentPod(updatedPod);
            setPods((prev) =>
              prev.map((pod) => (pod.id === currentPod.id ? updatedPod : pod))
            );

            // Send WebSocket message
            if (isConnected) {
              sendMessage({
                type: "item_updated",
                podId: currentPod.id,
                item: updatedPod.items.find((item) => item.id === itemId),
              });
            }
          }
        }
      } catch (error) {
        console.error("Error updating item quantity:", error);
      }
    },
    [currentPod, isConnected, sendMessage]
  );

  const removeItem = useCallback(
    async (itemId: string) => {
      if (!currentPod) return;

      try {
        const response = await fetch(`/api/pod/item/${itemId}`, {
          method: "DELETE",
        });

        if (response.ok) {
          const updatedPod = {
            ...currentPod,
            items: currentPod.items.filter((item) => item.id !== itemId),
          };
          setCurrentPod(updatedPod);
          setPods((prev) =>
            prev.map((pod) => (pod.id === currentPod.id ? updatedPod : pod))
          );

          // Send WebSocket message
          if (isConnected) {
            sendMessage({
              type: "item_removed",
              podId: currentPod.id,
              itemId: itemId,
            });
          }
        }
      } catch (error) {
        console.error("Error removing item:", error);
      }
    },
    [currentPod, isConnected, sendMessage]
  );

  const copyInviteCode = useCallback(
    async (inviteCode: string) => {
      navigator.clipboard.writeText(inviteCode);
      setCopiedInvite(inviteCode);
      setTimeout(() => setCopiedInvite(null), 2000);

      // Send WebSocket message about invite being shared
      if (isConnected && currentPod && currentUser) {
        sendMessage({
          type: "invite_sent",
          podId: currentPod.id,
          inviteCode: inviteCode,
          sentBy: currentUser.id,
        });
      }
    },
    [isConnected, currentPod, sendMessage, currentUser]
  );

  const copyInviteLink = useCallback(
    async (inviteCode: string) => {
      const inviteLink = `${window.location.origin}/pod/join/${inviteCode}`;
      navigator.clipboard.writeText(inviteLink);
      setCopiedInvite(inviteCode);
      setTimeout(() => setCopiedInvite(null), 2000);

      // Send WebSocket message about invite being shared
      if (isConnected && currentPod && currentUser) {
        sendMessage({
          type: "invite_sent",
          podId: currentPod.id,
          inviteCode: inviteCode,
          sentBy: currentUser.id,
        });
      }
    },
    [isConnected, currentPod, sendMessage, currentUser]
  );

  const joinPod = useCallback(async () => {
    if (!joinPodCode.trim() || !currentUser) return;

    isCreatingOrJoiningRef.current = true;
    setIsJoining(true);
    try {
      const response = await fetch("/api/pod/invite", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "join_pod",
          inviteCode: joinPodCode,
          userId: currentUser.id,
          userName: currentUser.name,
          userAvatar: currentUser.avatar,
          userEmail: currentUser.email,
        }),
      });

      const data = await response.json();

      if (data.success) {
        const joinedPod = data.pod;
        setPods((prev) => [...prev, joinedPod]);
        // Immediately set the joined pod as current pod
        setCurrentPod(joinedPod);
        setShowJoinModal(false);
        setJoinPodCode("");

        // Send WebSocket message about joining
        if (isConnected) {
          sendMessage({
            type: "member_joined",
            podId: joinedPod.id,
            newMember: {
              id: currentUser.id,
              name: currentUser.name,
              avatar: currentUser.avatar,
              isOwner: false,
            },
          });
        }
      } else {
        console.error("Failed to join pod:", data.error);
      }
    } catch (error) {
      console.error("Error joining pod:", error);
    } finally {
      // Small delay to ensure state updates are processed before allowing pod switching
      setTimeout(() => {
        isCreatingOrJoiningRef.current = false;
        setIsJoining(false);
      }, 100);
    }
  }, [joinPodCode, currentUser, isConnected, sendMessage]);

  const totalItems =
    currentPod?.items.reduce((sum, item) => sum + item.quantity, 0) || 0;
  const totalPrice =
    currentPod?.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    ) || 0;

  const deletePod = async () => {
    if (!currentPod) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/pod/${currentPod.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success("Pod deleted successfully!");
        // Remove pod from list
        setPods((prev) => prev.filter((pod) => pod.id !== currentPod.id));
        setCurrentPod((prev) => {
          const remaining = pods.filter((pod) => pod.id !== prev?.id);
          return remaining.length > 0 ? remaining[0] : null;
        });
        setShowDeleteModal(false);
      } else {
        toast.error("Failed to delete pod.");
      }
    } catch (e) {
      toast.error("Failed to delete pod.");
    } finally {
      setIsDeleting(false);
    }
  };

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

  // Show loading state while pods are being fetched and before currentPod is set
  if (isLoaded && currentUser && isPodsLoading && !currentPod) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader className="mx-auto mb-4" />
          <p className="text-gray-600">Loading your pods...</p>
        </div>
      </div>
    );
  }

  // Show message if user is not authenticated
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">
            Please sign in to access the shopping pod.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar for desktop */}
      <Sidebar />

      {/* Mobile navigation */}
      <MobileNav />

      {/* Main content */}
      <div className="lg:pl-64">
        <div className="relative">
          {/* Pulsing background blobs */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden"></div>

          {/* Real-time Status Indicator */}
          {currentPod && (
            <div className="absolute top-4 right-4 z-10">
              <div
                className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${
                  isConnected
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                <div
                  className={`w-2 h-2 rounded-full ${
                    isConnected ? "bg-green-500 animate-pulse" : "bg-red-500"
                  }`}
                ></div>
                {isConnected ? "Live" : "Offline"}
              </div>
            </div>
          )}

          {/* Header */}
          <PodHeader
            pods={pods}
            currentPod={currentPod}
            onPodSelect={setCurrentPod}
            onCreatePod={() => setShowCreatePod(true)}
            onJoinPod={() => setShowJoinModal(true)}
            onDeletePod={() => setShowDeleteModal(true)}
          />

          {/* Content */}
          {currentPod ? (
            <div className="relative px-4 sm:px-6 lg:px-8 pb-16">
              <div className="max-w-7xl mx-auto">
                {/* Mobile Layout - Cart First */}
                <div className="block lg:hidden space-y-6">
                  {/* Shopping Cart - Mobile */}
                  <div>
                    <PodCart
                      podName={currentPod.name}
                      items={currentPod.items}
                      totalItems={totalItems}
                      totalPrice={totalPrice}
                      onUpdateQuantity={updateItemQuantity}
                      onRemoveItem={removeItem}
                      onPaymentClick={() => setShowPaymentModal(true)}
                      members={currentPod.members.map(({ id, name }) => ({
                        id,
                        name,
                      }))}
                      showUsersDropdown={showUsersDropdown}
                      setShowUsersDropdown={setShowUsersDropdown}
                      usersDropdownRef={usersDropdownRef}
                    />
                  </div>

                  {/* Product List - Mobile */}
                  <div>
                    <ProductGrid
                      products={PRODUCTS}
                      currentPod={currentPod}
                      onAddItem={addItemToPod}
                      onUpdateQuantity={updateItemQuantity}
                      onShowInvite={() => setShowInviteModal(true)}
                      onDeletePod={() => setShowDeleteModal(true)}
                    />
                  </div>
                </div>

                {/* Desktop Layout - Original Grid */}
                <div className="hidden lg:grid lg:grid-cols-3 gap-8">
                  {/* Product List */}
                  <div className="lg:col-span-2">
                    <ProductGrid
                      products={PRODUCTS}
                      currentPod={currentPod}
                      onAddItem={addItemToPod}
                      onUpdateQuantity={updateItemQuantity}
                      onShowInvite={() => setShowInviteModal(true)}
                      onDeletePod={() => setShowDeleteModal(true)}
                    />
                  </div>

                  {/* Shopping Cart */}
                  <div className="lg:col-span-1">
                    <PodCart
                      podName={currentPod.name}
                      items={currentPod.items}
                      totalItems={totalItems}
                      totalPrice={totalPrice}
                      onUpdateQuantity={updateItemQuantity}
                      onRemoveItem={removeItem}
                      onPaymentClick={() => setShowPaymentModal(true)}
                      members={currentPod.members.map(({ id, name }) => ({
                        id,
                        name,
                      }))}
                      showUsersDropdown={showUsersDropdown}
                      setShowUsersDropdown={setShowUsersDropdown}
                      usersDropdownRef={usersDropdownRef}
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <EmptyState
              onCreatePod={() => setShowCreatePod(true)}
              onJoinPod={() => setShowJoinModal(true)}
            />
          )}
        </div>
      </div>

      {/* Modals */}
      <CreatePodModal
        isOpen={showCreatePod}
        podName={newPodName}
        onPodNameChange={setNewPodName}
        onCreatePod={createPod}
        onClose={() => setShowCreatePod(false)}
        isCreating={isCreating}
      />

      <InviteModal
        isOpen={showInviteModal}
        podName={currentPod?.name || ""}
        inviteCode={currentPod?.inviteCode || ""}
        copiedInvite={copiedInvite}
        onCopyInvite={copyInviteCode}
        onClose={() => setShowInviteModal(false)}
      />

      <JoinPodModal
        isOpen={showJoinModal}
        joinPodCode={joinPodCode}
        onJoinPodCodeChange={setJoinPodCode}
        onJoinPod={joinPod}
        onClose={() => setShowJoinModal(false)}
        isJoining={isJoining}
      />

      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        totalAmount={totalPrice}
        items={currentPod?.items || []}
        currentUser={currentUser}
        currentPod={currentPod}
        currentUserDbId={currentUserDbId}
        onPaymentSuccess={() => {
          console.log("Payment successful!");
          // You can add additional logic here like clearing the cart, etc.
        }}
      />

      {/* Delete Pod Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">
              Delete Pod
            </h3>
            <p className="mb-6 text-gray-700">
              Are you sure you want to delete the pod{" "}
              <span className="font-bold">{currentPod?.name}</span>? This action
              cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors"
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                onClick={deletePod}
                className="flex-1 bg-red-500 text-white py-2 px-4 rounded-lg hover:bg-red-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <Loader size={18} /> Deleting...
                  </>
                ) : (
                  "Delete"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
