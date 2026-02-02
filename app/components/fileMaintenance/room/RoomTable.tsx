import React from "react";
import {
  DoorOpen,
  Building2,
  Layers,
  Users,
  Edit2,
  Trash2,
} from "lucide-react";
import { Room } from "../../../types";
import { colors } from "../../../colors";
import { getRoomStatusColor, getTypeColor } from "./utils";
import TableSkeleton from "../../common/TableSkeleton";

interface RoomTableProps {
  rooms: (Room & { buildingName?: string })[];
  onEdit: (room: Room) => void;
  onDelete: (id: number) => void;
  isLoading?: boolean;
}

const RoomTable: React.FC<RoomTableProps> = ({ rooms, onEdit, onDelete, isLoading = false }) => {
  return (
    <div className='bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden'>
      <div className='overflow-x-auto'>
        <table className='w-full min-w-[900px]'>
          <thead>
            <tr
              style={{
                backgroundColor: `${colors.primary}05`,
                borderBottom: `1px solid ${colors.primary}10`,
              }}
            >
              <th className='px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-600'>
                Room Number
              </th>
              <th className='px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-600'>
                Building
              </th>
              <th className='px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-600'>
                Type
              </th>
              <th className='px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-600'>
                Floor
              </th>
              <th className='px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-600'>
                Capacity
              </th>
              <th className='px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-600'>
                Status
              </th>
              <th className='px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-gray-600'>
                Actions
              </th>
            </tr>
          </thead>
          <tbody className='divide-y divide-gray-100'>
            {isLoading ? (
              <TableSkeleton
                rows={5}
                columns={7}
                columnConfigs={[
                  { type: "avatar-text" }, // Room Number
                  { type: "icon-text" }, // Building
                  { type: "badge" }, // Type
                  { type: "icon-text" }, // Floor
                  { type: "icon-text" }, // Capacity
                  { type: "badge" }, // Status
                  { type: "actions" }, // Actions
                ]}
              />
            ) : rooms.length === 0 ? (
              <tr>
                <td colSpan={7} className='px-6 py-12 text-center text-gray-500'>
                  <div className='flex flex-col items-center justify-center gap-3'>
                    <div
                      className='p-3 rounded-full'
                      style={{ backgroundColor: `${colors.primary}05` }}
                    >
                      <DoorOpen
                        className='w-6 h-6'
                        style={{ color: colors.primary }}
                      />
                    </div>
                    <p className='font-medium'>No rooms found</p>
                    <p className='text-sm text-gray-400'>
                      Try adjusting your search or filters
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              rooms.map((room) => {
                const statusStyles = getRoomStatusColor(room.status);
                return (
                  <tr
                    key={room.id}
                    className='group hover:bg-gray-50/50 transition-colors'
                  >
                    <td className='px-6 py-4 whitespace-nowrap'>
                      <div className='flex items-center'>
                        <div className='flex-shrink-0 h-10 w-10'>
                          <div
                            className='h-10 w-10 rounded-xl flex items-center justify-center shadow-sm'
                            style={{
                              backgroundColor: "white",
                              border: `1px solid ${colors.primary}10`,
                            }}
                          >
                            <DoorOpen
                              className='h-5 w-5'
                              style={{ color: colors.primary }}
                            />
                          </div>
                        </div>
                        <div className='ml-4'>
                          <div
                            className='text-sm font-semibold'
                            style={{ color: colors.primary }}
                          >
                            {room.room_number}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap'>
                      <div className='flex items-center gap-2'>
                        <Building2 className='w-3.5 h-3.5 text-gray-400' />
                        <span className='text-sm text-gray-600'>
                          {room.buildingName || "N/A"}
                        </span>
                      </div>
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap'>
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTypeColor(
                          room.room_type
                        )}`}
                      >
                        {room.room_type.charAt(0).toUpperCase() +
                          room.room_type.slice(1)}
                      </span>
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap'>
                      <div className='flex items-center gap-2'>
                        <Layers className='w-3.5 h-3.5 text-gray-400' />
                        <span className='text-sm text-gray-600'>{room.floor}</span>
                      </div>
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap'>
                      <div className='flex items-center gap-2'>
                        <Users className='w-3.5 h-3.5 text-gray-400' />
                        <span className='text-sm font-medium text-gray-700'>
                          {room.capacity}
                        </span>
                      </div>
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap'>
                      <span
                        className='inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border'
                        style={{
                          backgroundColor: statusStyles.bg,
                          color: statusStyles.text,
                          borderColor: statusStyles.border,
                        }}
                      >
                        <span
                          className='w-1.5 h-1.5 rounded-full mr-1.5'
                          style={{ backgroundColor: statusStyles.text }}
                        />
                        {room.status.charAt(0).toUpperCase() +
                          room.status.slice(1)}
                      </span>
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap text-right text-sm font-medium'>
                      <div className='flex justify-end gap-2'>
                        <button
                          onClick={() => onEdit(room)}
                          className='p-2 rounded-lg hover:bg-white hover:shadow-sm border border-transparent hover:border-gray-200 transition-all text-blue-600'
                          title='Edit'
                        >
                          <Edit2 className='w-4 h-4' />
                        </button>
                        <button
                          onClick={() => onDelete(room.id)}
                          className='p-2 rounded-lg hover:bg-white hover:shadow-sm border border-transparent hover:border-gray-200 transition-all text-red-600'
                          title='Delete'
                        >
                          <Trash2 className='w-4 h-4' />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RoomTable;



