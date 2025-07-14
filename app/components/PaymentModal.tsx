import { useState } from "react";
import {
  CreditCard,
  Smartphone,
  QrCode,
  Banknote,
  CheckCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  Shield,
  AlertCircle,
} from "lucide-react";
import QRCodeModal from "./QRCodeModal";
import Loader from "./Loader";

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  totalAmount: number;
  items: any[];
  currentUser: any;
  currentPod: any;
  currentUserDbId: string | null;
  onPaymentSuccess: () => void;
}

type PaymentMethod = "upi" | "card" | "cod";

interface PaymentDetails {
  method: PaymentMethod;
  upiId?: string;
  cardNumber?: string;
  cardName?: string;
  cardExpiry?: string;
  cardCvv?: string;
  bank?: string;
}

export default function PaymentModal({
  isOpen,
  onClose,
  totalAmount,
  items,
  currentUser,
  currentPod,
  currentUserDbId,
  onPaymentSuccess,
}: PaymentModalProps) {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("upi");
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails>({
    method: "upi",
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [payForAll, setPayForAll] = useState(true);
  const [showCardDetails, setShowCardDetails] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);

  const banks = [
    "HDFC Bank",
    "ICICI Bank",
    "State Bank of India",
    "Kotak Mahindra Bank",
    "Axis Bank",
    "Punjab National Bank",
    "Canara Bank",
    "Bank of Baroda",
  ];

  const upiApps = [
    { name: "PhonePe", color: "bg-purple-500" },
    { name: "Google Pay", color: "bg-blue-500" },
    { name: "Paytm", color: "bg-blue-600" },
    { name: "BHIM", color: "bg-green-600" },
  ];

  const cardTypes = [
    { name: "Visa", logo: "💳" },
    { name: "Mastercard", logo: "💳" },
    { name: "RuPay", logo: "💳" },
  ];

  const gstRate = 0.18; // 18% GST
  const subtotal = totalAmount;
  const gstAmount = subtotal * gstRate;
  const totalWithGst = subtotal + gstAmount;

  // Use the database user ID directly if available, otherwise fall back to name matching
  const userItems = items.filter((item) =>
    currentUserDbId
      ? item.addedBy.id === currentUserDbId
      : item.addedBy.name === currentUser?.name
  );
  const otherItems = items.filter((item) =>
    currentUserDbId
      ? item.addedBy.id !== currentUserDbId
      : item.addedBy.name !== currentUser?.name
  );

  console.log("PaymentModal Debug:", {
    currentUser: currentUser?.name,
    currentUserDbId,
    userItemsCount: userItems.length,
    totalItemsCount: items.length,
    items: items.map((item) => ({ name: item.name, addedBy: item.addedBy })),
  });

  const userSubtotal = userItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  const userGst = userSubtotal * gstRate;
  const userTotal = userSubtotal + userGst;

  const finalAmount = payForAll ? totalWithGst : userTotal;

  const handlePayment = async () => {
    setIsProcessing(true);

    // Simulate payment processing
    await new Promise((resolve) => setTimeout(resolve, 3000));

    setIsProcessing(false);
    setIsSuccess(true);

    // Show success for 2 seconds then close
    setTimeout(() => {
      setIsSuccess(false);
      onPaymentSuccess();
      onClose();
    }, 2000);
  };

  const generateTransactionId = () => {
    return `TXN${Date.now().toString().slice(-8)}${Math.random()
      .toString(36)
      .substring(2, 6)
      .toUpperCase()}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-800">Payment</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            This is a simulated payment gateway. No real payment will be made.
          </p>
        </div>

        {/* Payment Options */}
        <div className="p-6">
          {/* Payment Method Tabs */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setPaymentMethod("upi")}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium transition-colors ${
                paymentMethod === "upi"
                  ? "bg-[#04b7cf] text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              <Smartphone className="w-4 h-4" />
              UPI
            </button>
            <button
              onClick={() => setPaymentMethod("card")}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium transition-colors ${
                paymentMethod === "card"
                  ? "bg-[#04b7cf] text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              <CreditCard className="w-4 h-4" />
              Card
            </button>
            <button
              onClick={() => setPaymentMethod("cod")}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium transition-colors ${
                paymentMethod === "cod"
                  ? "bg-[#04b7cf] text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              <Banknote className="w-4 h-4" />
              COD
            </button>
          </div>

          {/* Payment Method Content */}
          {paymentMethod === "upi" && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  UPI ID
                </label>
                <input
                  type="text"
                  placeholder="example@upi"
                  value={paymentDetails.upiId || ""}
                  onChange={(e) =>
                    setPaymentDetails({
                      ...paymentDetails,
                      upiId: e.target.value,
                    })
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#04b7cf] focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bank
                </label>
                <select
                  value={paymentDetails.bank || ""}
                  onChange={(e) =>
                    setPaymentDetails({
                      ...paymentDetails,
                      bank: e.target.value,
                    })
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#04b7cf] focus:border-transparent"
                >
                  <option value="">Select Bank</option>
                  {banks.map((bank) => (
                    <option key={bank} value={bank}>
                      {bank}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-700 mb-3">
                  Popular UPI Apps
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {upiApps.map((app) => (
                    <button
                      key={app.name}
                      className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:border-[#04b7cf] transition-colors"
                    >
                      <div
                        className={`w-8 h-8 rounded-full ${app.color} flex items-center justify-center text-white text-sm font-bold`}
                      >
                        {app.name.charAt(0)}
                      </div>
                      <span className="text-sm font-medium">{app.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={() => setShowQRModal(true)}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 border border-gray-300 rounded-lg hover:border-[#04b7cf] transition-colors"
              >
                <QrCode className="w-4 h-4" />
                Scan QR Code
              </button>
            </div>
          )}

          {paymentMethod === "card" && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Card Number
                </label>
                <input
                  type="text"
                  placeholder="1234 5678 9012 3456"
                  value={paymentDetails.cardNumber || ""}
                  onChange={(e) =>
                    setPaymentDetails({
                      ...paymentDetails,
                      cardNumber: e.target.value,
                    })
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#04b7cf] focus:border-transparent"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Expiry Date
                  </label>
                  <input
                    type="text"
                    placeholder="MM/YY"
                    value={paymentDetails.cardExpiry || ""}
                    onChange={(e) =>
                      setPaymentDetails({
                        ...paymentDetails,
                        cardExpiry: e.target.value,
                      })
                    }
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#04b7cf] focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    CVV
                  </label>
                  <input
                    type="text"
                    placeholder="123"
                    value={paymentDetails.cardCvv || ""}
                    onChange={(e) =>
                      setPaymentDetails({
                        ...paymentDetails,
                        cardCvv: e.target.value,
                      })
                    }
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#04b7cf] focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cardholder Name
                </label>
                <input
                  type="text"
                  placeholder="Rajesh Kumar"
                  value={paymentDetails.cardName || ""}
                  onChange={(e) =>
                    setPaymentDetails({
                      ...paymentDetails,
                      cardName: e.target.value,
                    })
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#04b7cf] focus:border-transparent"
                />
              </div>

              <div>
                <p className="text-sm font-medium text-gray-700 mb-3">
                  Accepted Cards
                </p>
                <div className="flex gap-3">
                  {cardTypes.map((card) => (
                    <div
                      key={card.name}
                      className="flex items-center gap-2 p-2 border border-gray-200 rounded-lg"
                    >
                      <span className="text-lg">{card.logo}</span>
                      <span className="text-sm font-medium">{card.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {paymentMethod === "cod" && (
            <div className="text-center py-8">
              <Banknote className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                Cash on Delivery
              </h3>
              <p className="text-gray-600 mb-4">
                You'll pay ₹{finalAmount.toFixed(2)} upon delivery
              </p>
              <div className="flex items-center gap-2 justify-center text-sm text-gray-500">
                <Shield className="w-4 h-4" />
                <span>Secure payment on delivery</span>
              </div>
            </div>
          )}

          {/* Split Payment Options */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-medium text-gray-800 mb-4">Payment Split</h3>

            {/* Payment Options */}
            <div className="space-y-3 mb-4">
              <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:border-[#04b7cf] transition-colors cursor-pointer">
                <input
                  type="radio"
                  name="paymentSplit"
                  checked={payForAll}
                  onChange={() => setPayForAll(true)}
                  className="text-[#04b7cf] focus:ring-[#04b7cf]"
                />
                <div className="flex-1">
                  <div className="font-medium text-gray-800">
                    Pay for all items
                  </div>
                  <div className="text-sm text-gray-500">
                    Pay the full amount for the entire group
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-[#04b7cf]">
                    ₹{totalWithGst.toFixed(2)}
                  </div>
                  <div className="text-xs text-gray-500">
                    {items.length} items
                  </div>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:border-[#04b7cf] transition-colors cursor-pointer">
                <input
                  type="radio"
                  name="paymentSplit"
                  checked={!payForAll}
                  onChange={() => setPayForAll(false)}
                  className="text-[#04b7cf] focus:ring-[#04b7cf]"
                />
                <div className="flex-1">
                  <div className="font-medium text-gray-800">
                    Split bill - Pay only your items
                  </div>
                  <div className="text-sm text-gray-500">
                    Pay only for items you added
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-[#04b7cf]">
                    ₹{userTotal.toFixed(2)}
                  </div>
                  <div className="text-xs text-gray-500">
                    {userItems.length} items
                  </div>
                </div>
              </label>
            </div>

            {/* Detailed Breakdown */}
            {!payForAll && (
              <div className="border-t pt-4">
                <h4 className="font-medium text-gray-700 mb-3">
                  Your Items Breakdown
                </h4>
                <div className="space-y-2">
                  {userItems.map((item, index) => (
                    <div key={index} className="flex justify-between text-sm">
                      <span className="text-gray-600">
                        {item.name} × {item.quantity}
                      </span>
                      <span>₹{(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                  <div className="border-t pt-2 space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>Subtotal</span>
                      <span>₹{userSubtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-gray-500">
                      <span>GST (18%)</span>
                      <span>₹{userGst.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-medium text-[#04b7cf]">
                      <span>Your total</span>
                      <span>₹{userTotal.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {payForAll && (
              <div className="border-t pt-4">
                <h4 className="font-medium text-gray-700 mb-3">
                  All Items Breakdown
                </h4>
                <div className="space-y-2">
                  {items.map((item, index) => (
                    <div key={index} className="flex justify-between text-sm">
                      <span className="text-gray-600">
                        {item.name} × {item.quantity}
                        <span className="text-xs text-gray-400 ml-2">
                          (added by {item.addedBy.name})
                        </span>
                      </span>
                      <span>₹{(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                  <div className="border-t pt-2 space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>Subtotal</span>
                      <span>₹{subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-gray-500">
                      <span>GST (18%)</span>
                      <span>₹{gstAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-medium text-[#04b7cf]">
                      <span>Total amount</span>
                      <span>₹{totalWithGst.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Payment Button */}
          <button
            onClick={handlePayment}
            disabled={isProcessing || isSuccess}
            className="w-full mt-6 bg-[#04b7cf] text-white py-4 px-6 rounded-lg font-semibold hover:bg-[#04cf84] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isProcessing ? (
              <>
                <Loader size={20} /> Processing Payment...
              </>
            ) : isSuccess ? (
              <>
                <CheckCircle className="w-5 h-5" />
                Payment Successful! 🎉
              </>
            ) : (
              <>Pay ₹{finalAmount.toFixed(2)}</>
            )}
          </button>

          {/* Success Message */}
          {isSuccess && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="font-medium text-green-800">
                  Payment Confirmed
                </span>
              </div>
              <div className="text-sm text-green-700 space-y-1">
                <p>Transaction ID: {generateTransactionId()}</p>
                <p>Amount: ₹{finalAmount.toFixed(2)}</p>
                <p>Method: {paymentMethod.toUpperCase()}</p>
                <p>Time: {new Date().toLocaleString()}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* QR Code Modal */}
      <QRCodeModal
        isOpen={showQRModal}
        onClose={() => setShowQRModal(false)}
        amount={finalAmount}
        upiId={paymentDetails.upiId || "shoppingpod@upi"}
      />
    </div>
  );
}
