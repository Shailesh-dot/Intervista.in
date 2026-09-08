import React, { useEffect, useState } from "react";
import { FiPlus } from "react-icons/fi";

export default function CompanySecondarySidebar({
  onCreateTest,
  isCreatingTest,
  selectedTestId,
  onSelectTest,
}) {
  const [tests, setTests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTests = async () => {
      try {
        const token = localStorage.getItem("companyToken");
        const response = await fetch("/api/company/test/list", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.ok) {
          const data = await response.json();
          setTests(data);
        }
      } catch (error) {
        console.error("Error fetching tests:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTests();
  }, []);

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";

    return new Date(dateString).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className="content-anim w-80 bg-white border-r border-gray-100 flex flex-col h-full relative z-5">
      <div className="p-6 pb-2">
        <button
          type="button"
          onClick={onCreateTest}
          disabled={isCreatingTest}
          className="flex items-center gap-3 w-full p-4 bg-[#DAFF0C] text-[#144542] font-black rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 active:scale-95 group disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-[#144542] text-xl font-bold border border-[#144542]/10 group-hover:rotate-90 transition-transform">
            <FiPlus />
          </div>
          <span className="tracking-tight text-lg">
            {isCreatingTest ? "Creating..." : "Create Test"}
          </span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 custom-scrollbar">
        {isLoading ? (
          <div className="flex justify-center py-10">
            <div className="w-6 h-6 border-2 border-[#144542] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : tests.length === 0 ? (
          <div className="text-center py-10 text-gray-400 text-sm font-medium">
            No tests created yet.
          </div>
        ) : (
          tests.map((test) => {
            const isSelected = test.testId === selectedTestId;

            return (
              <div
                key={test.testId}
                onClick={() => onSelectTest(test)}
                className={`rounded-2xl p-6 mb-4 cursor-pointer transition-all duration-300 border ${
                  isSelected
                    ? "bg-[#144542]/[0.02] border-[#144542] shadow-md shadow-[#144542]/5 border-[1.5px]"
                    : "bg-white border-gray-200 shadow-sm hover:shadow hover:border-gray-300"
                }`}
              >
                <div className="flex justify-between items-start mb-4">
                  <span
                    className={`px-3 py-1 text-[10px] font-bold tracking-widest uppercase rounded-full shadow-sm h-fit ${
                      isSelected
                        ? "bg-[#144542] text-white"
                        : "bg-white border border-gray-200 text-gray-700"
                    }`}
                  >
                    {isSelected ? "Selected" : "Draft"}
                  </span>
                  <div className="flex flex-col items-end gap-2">
                    <span className="text-[11px] font-medium text-gray-400">
                      ID: {test.testId}
                    </span>
                    <div className="flex items-center -space-x-1.5">
                      {test.interviewModule && (
                        <div
                          className="w-4 h-4 rounded-full bg-[#00d1c1] ring-1 ring-white"
                          title="AI-Interview"
                        />
                      )}
                      {test.verbalModule && (
                        <div
                          className="w-4 h-4 rounded-full bg-[#a855f7] ring-1 ring-white"
                          title="Communication"
                        />
                      )}
                      {test.codingModule && (
                        <div
                          className="w-4 h-4 rounded-full bg-[#db830f] ring-1 ring-white"
                          title="Coding"
                        />
                      )}
                      {test.aptitudeModule && (
                        <div
                          className="w-4 h-4 rounded-full bg-[#facc15] ring-1 ring-white"
                          title="Aptitude"
                        />
                      )}
                    </div>
                  </div>
                </div>

                <h2
                  className="text-[20px] font-black text-gray-900 mb-6 tracking-tight truncate"
                  title={test.testName || test.testId}
                >
                  {test.testName || test.testId}
                </h2>

                <div className="border-b border-gray-100 mb-6" />

                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-[13px] text-gray-500 font-medium">
                      Created
                    </span>
                    <span className="text-[13px] text-gray-900 font-bold">
                      {formatDate(test.createdAt)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[13px] text-gray-500 font-medium">
                      Owner
                    </span>
                    <span className="text-[13px] text-gray-900 font-bold truncate max-w-[130px] text-right">
                      {test.hrName || "N/A"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[13px] text-gray-500 font-medium">
                      Status
                    </span>
                    <span className="text-[13px] text-gray-900 font-bold">
                      Active Config
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
