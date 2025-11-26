import React from "react";
import { UserPlus, CheckCircle, Clock, XCircle } from "lucide-react";
import { colors } from "../../colors";
import { EnrollmentStats } from "../../types";
import { getCountOfEnrolleesStatus } from "@/app/utils/getCountStatusEnrollees";
const StatsCards = () => {
  const [localStats, setLocalStats] = React.useState<EnrollmentStats>({
    total: 0,
    enrolled: 0,
    completed: 0,
    pending: 0,
    dropped: 0,
  });

  React.useEffect(() => {
    const fetchStatusCounts = async () => {
      const statusCounts = await getCountOfEnrolleesStatus();

      const newStats = {
        total: 0,
        enrolled: 0,
        completed: 0,
        pending: 0,
        dropped: 0,
      };

      statusCounts.forEach((count: any) => {
        const countValue = count._count?.admission_status || count._count || 0;

        switch (count.admission_status) {
          case "enrolled":
            newStats.enrolled = countValue;
            break;
          case "completed":
            newStats.completed = countValue;
            break;
          case "pending":
            newStats.pending = countValue;
            break;
          case "dropped":
            newStats.dropped = countValue;
            break;
        }
        newStats.total += countValue;
      });

      setLocalStats(newStats);
    };
    fetchStatusCounts();
  }, []);
  return (
    <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4'>
      <div className='bg-white rounded-2xl shadow-sm border border-gray-100 p-5'>
        <div className='flex items-center justify-between'>
          <div>
            <p className='text-sm text-gray-600 mb-1'>Total</p>
            <p className='text-2xl font-bold text-gray-900'>
              {localStats.total}
            </p>
          </div>
          <div
            className='p-3 rounded-xl'
            style={{ backgroundColor: `${colors.primary}10` }}
          >
            <UserPlus className='w-6 h-6' style={{ color: colors.primary }} />
          </div>
        </div>
      </div>
      <div className='bg-white rounded-2xl shadow-sm border border-gray-100 p-5'>
        <div className='flex items-center justify-between'>
          <div>
            <p className='text-sm text-blue-600 mb-1'>Enrolled</p>
            <p className='text-2xl font-bold text-blue-900'>
              {localStats?.enrolled}
            </p>
          </div>
          <div className='p-3 rounded-xl bg-blue-50'>
            <CheckCircle className='w-6 h-6 text-blue-500' />
          </div>
        </div>
      </div>
      <div className='bg-white rounded-2xl shadow-sm border border-gray-100 p-5'>
        <div className='flex items-center justify-between'>
          <div>
            <p className='text-sm text-emerald-600 mb-1'>Completed</p>
            <p className='text-2xl font-bold text-emerald-900'>
              {localStats.completed}
            </p>
          </div>
          <div className='p-3 rounded-xl bg-emerald-50'>
            <CheckCircle className='w-6 h-6 text-emerald-500' />
          </div>
        </div>
      </div>
      <div className='bg-white rounded-2xl shadow-sm border border-gray-100 p-5'>
        <div className='flex items-center justify-between'>
          <div>
            <p className='text-sm text-yellow-600 mb-1'>Pending</p>
            <p className='text-2xl font-bold text-yellow-900'>
              {localStats.pending}
            </p>
          </div>
          <div className='p-3 rounded-xl bg-yellow-50'>
            <Clock className='w-6 h-6 text-yellow-500' />
          </div>
        </div>
      </div>
      <div className='bg-white rounded-2xl shadow-sm border border-gray-100 p-5'>
        <div className='flex items-center justify-between'>
          <div>
            <p className='text-sm text-red-600 mb-1'>Dropped</p>
            <p className='text-2xl font-bold text-red-900'>
              {localStats.dropped}
            </p>
          </div>
          <div className='p-3 rounded-xl bg-red-50'>
            <XCircle className='w-6 h-6 text-red-500' />
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatsCards;
