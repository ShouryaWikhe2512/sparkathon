import { Package, Plus, Minus, Trash2, CreditCard, User } from "lucide-react";

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

interface PodCartProps {
  podName: string;
  items: PodItem[];
  totalItems: number;
  totalPrice: number;
  onUpdateQuantity: (itemId: string, change: number) => void;
  onRemoveItem: (itemId: string) => void;
  onPaymentClick: () => void;
  // New props for users dropdown
  members?: { id: string; name: string }[];
  showUsersDropdown?: boolean;
  setShowUsersDropdown?: (v: boolean) => void;
  usersDropdownRef?: React.RefObject<HTMLDivElement>;
}

export default function PodCart({
  podName,
  items,
  totalItems,
  totalPrice,
  onUpdateQuantity,
  onRemoveItem,
  onPaymentClick,
  members = [],
  showUsersDropdown = false,
  setShowUsersDropdown = () => {},
  usersDropdownRef,
}: PodCartProps) {
  const formatTimeAgo = (date: Date | string) => {
    // Convert string to Date if needed
    const dateObj = typeof date === "string" ? new Date(date) : date;
    const now = new Date();
    const diffInMinutes = Math.floor(
      (now.getTime() - dateObj.getTime()) / 60000
    );

    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  return (
    <div className="bg-white rounded-2xl shadow-md p-6 sticky top-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-800">{podName}</h2>
        <div className="flex items-center gap-2">
          {totalItems > 0 && (
            <span className="bg-[#04cf84] text-white px-3 py-1 rounded-full text-sm font-medium">
              {totalItems} items
            </span>
          )}
          {/* Users Button */}
          {members.length > 0 && (
            <div className="relative">
              <button
                className="flex items-center gap-1 bg-[#04b7cf] text-white px-3 py-1 rounded-full text-sm font-semibold hover:bg-[#04cf84] transition-colors"
                onClick={() => setShowUsersDropdown(!showUsersDropdown)}
              >
                <User className="w-4 h-4" />
                Users
              </button>
              {showUsersDropdown && (
                <div
                  ref={usersDropdownRef}
                  className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-20 p-4"
                >
                  <div className="font-semibold text-gray-700 mb-2">
                    Pod Members
                  </div>
                  <ul className="list-disc pl-5 text-gray-800">
                    {members.map((member) => (
                      <li key={member.id}>{member.name}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-12">
          <Package className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500 mb-2">Pod is empty</p>
          <p className="text-sm text-gray-400">Add products to get started</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Cart Items */}
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {items
              .filter(
                (item, index, self) =>
                  index === self.findIndex((t) => t.id === item.id)
              )
              .map((item) => (
                <div
                  key={item.id}
                  className="p-3 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-800 text-sm">
                        {item.name}
                      </h4>
                      <p className="text-[#04b7cf] font-semibold">
                        ₹{item.price.toFixed(2)} × {item.quantity}
                      </p>
                    </div>
                    <button
                      onClick={() => onRemoveItem(item.id)}
                      className="w-6 h-6 rounded-full bg-red-100 text-red-600 hover:bg-red-200 flex items-center justify-center transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">👤</span>
                      <div>
                        <p className="text-xs text-gray-600">
                          Added by {item.addedBy.name}
                        </p>
                        <p className="text-xs text-gray-400">
                          {formatTimeAgo(item.addedAt)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onUpdateQuantity(item.id, -1)}
                        className="w-6 h-6 rounded-full bg-red-100 text-red-600 hover:bg-red-200 flex items-center justify-center transition-colors"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="font-semibold text-gray-800 min-w-[1.5rem] text-center text-sm">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => onUpdateQuantity(item.id, 1)}
                        className="w-6 h-6 rounded-full bg-[#04cf84] text-white hover:bg-[#04b7cf] flex items-center justify-center transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
          </div>

          {/* Total */}
          <div className="border-t border-gray-200 pt-4">
            <div className="flex justify-between items-center mb-4">
              <span className="text-lg font-semibold text-gray-800">Total</span>
              <span className="text-2xl font-bold text-[#04b7cf]">
                ₹{totalPrice.toFixed(2)}
              </span>
            </div>

            {/* Payment Button */}
            {totalItems > 0 && (
              <button
                onClick={onPaymentClick}
                className="w-full bg-[#04b7cf] text-white py-3 px-6 rounded-lg font-semibold hover:bg-[#04cf84] transition-colors flex items-center justify-center gap-2"
              >
                <CreditCard className="w-5 h-5" />
                Proceed to Payment
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
