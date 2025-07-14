import { Group, Package, Trash2, User, Users } from "lucide-react";

interface Pod {
  id: string;
  name: string;
  inviteCode: string;
  members: any[];
  items: any[];
  createdAt: Date;
  ownerId: string;
}

interface PodHeaderProps {
  pods: Pod[];
  currentPod: Pod | null;
  onPodSelect: (pod: Pod) => void;
  onCreatePod: () => void;
  onJoinPod: () => void;
  onDeletePod?: () => void;
}

export default function PodHeader({
  pods,
  currentPod,
  onPodSelect,
  onCreatePod,
  onJoinPod,
  onDeletePod,
}: PodHeaderProps) {
  return (
    <>
      {/* Header */}
      <div className="relative px-4 sm:px-6 lg:px-8 pt-8 pb-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Users className="w-8 h-8 text-[#04b7cf]" />
              <h1 className="text-3xl font-bold text-gray-900">
                Shopping Pods
              </h1>
            </div>
            <div className="flex gap-2">
              <button
                onClick={onJoinPod}
                className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                Join Pod
              </button>
              <button
                onClick={onCreatePod}
                className="bg-[#04b7cf] text-white px-4 py-2 rounded-lg hover:bg-[#04cf84] transition-colors font-medium"
              >
                Create Pod
              </button>
            </div>
          </div>
          <p className="text-gray-600">
            Create and join shopping pods to collaborate with friends and family
          </p>
        </div>
      </div>

      {/* Pod Selection */}
      {pods.length > 0 && (
        <div className="relative px-4 sm:px-6 lg:px-8 pb-4">
          <div className="max-w-7xl mx-auto">
            <div className="flex gap-2 overflow-x-auto pb-2">
              {pods.map((pod) => (
                <button
                  key={pod.id}
                  onClick={() => onPodSelect(pod)}
                  className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                    currentPod?.id === pod.id
                      ? "bg-[#04b7cf] text-white"
                      : "bg-white text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {pod.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
