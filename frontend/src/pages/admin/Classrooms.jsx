import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/adminService';
import { Modal } from '../../components/common/Modal';
import { LoadingSkeleton } from '../../components/common/LoadingSkeleton';
import { useToast } from '../../components/common/Toast';
import { Building2, Plus, Radio, Users } from 'lucide-react';

export const Classrooms = () => {
  const [classrooms, setClassrooms] = useState([]);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    building: '',
    room_number: '',
    capacity: 60,
    ble_identifier: ''
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { showToast } = useToast();

  const fetchClassrooms = async () => {
    try {
      const data = await adminService.getClassrooms();
      setClassrooms(data);
    } catch (e) {
      showToast('Failed to load classrooms', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchClassrooms();
  }, []);

  const handleRoomNumberChange = (val) => {
    const cleanRoom = val.replace(/\s+/g, '').toUpperCase();
    setFormData(prev => ({
      ...prev,
      room_number: val,
      name: prev.name || `Room ${val}`,
      ble_identifier: `SMARTATTEND-RM${cleanRoom}`
    }));
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!formData.room_number || !formData.name || !formData.building) return;
    setIsSubmitting(true);
    try {
      await adminService.createClassroom({
        name: formData.name,
        building: formData.building,
        room_number: formData.room_number,
        capacity: Number(formData.capacity),
        ble_identifier: formData.ble_identifier || `SMARTATTEND-RM${formData.room_number}`
      });
      showToast(`Classroom ${formData.name} added!`, 'success');
      setIsAddOpen(false);
      setFormData({ name: '', building: '', room_number: '', capacity: 60, ble_identifier: '' });
      fetchClassrooms();
    } catch (err) {
      showToast(err.response?.data?.detail || 'Failed to create classroom', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) return <LoadingSkeleton type="cards" count={3} />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
            Classrooms & BLE Beacons
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Physical lecture halls, seating capacities, and assigned Bluetooth Low Energy identifiers
          </p>
        </div>

        <button
          onClick={() => setIsAddOpen(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Classroom
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {classrooms.map((c) => (
          <div
            key={c.id}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow space-y-4"
          >
            <div className="flex items-center justify-between">
              <span className="px-3 py-1 rounded-lg text-xs font-mono font-bold bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20">
                Room {c.room_number}
              </span>
              <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 font-semibold">
                <Users className="w-3.5 h-3.5" />
                {c.capacity} seats
              </div>
            </div>

            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">{c.name}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{c.building}</p>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/60 text-xs">
              <div className="flex items-center gap-1.5 text-teal-600 dark:text-teal-400 font-bold mb-1">
                <Radio className="w-3.5 h-3.5 animate-pulse" />
                <span>BLE Beacon Identifier</span>
              </div>
              <p className="font-mono text-[11px] text-slate-700 dark:text-slate-300 truncate">
                {c.ble_identifier}
              </p>
            </div>
          </div>
        ))}
      </div>

      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Create Classroom">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Room Number
              </label>
              <input
                type="text"
                required
                placeholder="e.g. 204"
                value={formData.room_number}
                onChange={(e) => handleRoomNumberChange(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:border-teal-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Seating Capacity
              </label>
              <input
                type="number"
                min="10"
                max="500"
                required
                value={formData.capacity}
                onChange={(e) => setFormData({ ...formData, capacity: Number(e.target.value) })}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:border-teal-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Classroom Display Name
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Room 204"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:border-teal-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Building / Block Name
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Computing Block"
              value={formData.building}
              onChange={(e) => setFormData({ ...formData, building: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:border-teal-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              BLE Beacon Identifier (Auto-generated)
            </label>
            <input
              type="text"
              required
              value={formData.ble_identifier}
              onChange={(e) => setFormData({ ...formData, ble_identifier: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:border-teal-500 font-mono text-teal-600 dark:text-teal-400"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsAddOpen(false)}
              className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-sm font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-md transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Creating...' : 'Create Classroom'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
