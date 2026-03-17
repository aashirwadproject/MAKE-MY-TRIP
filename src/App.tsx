/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  MapPin, 
  Clock, 
  Train, 
  ChevronRight, 
  Wallet, 
  Plane, 
  History,
  UserPlus,
  Trash2,
  Calendar,
  Navigation,
  Footprints,
  Car,
  ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Types
interface Activity {
  id: string;
  type: string;
  location: string;
  time: string;
  completed: boolean;
  navigationUrl?: string;
  transportMode?: 'walking' | 'auto' | 'train' | 'other';
}

interface Trip {
  id: string;
  name: string;
  status: 'ongoing' | 'previous';
  date: string;
  activities: Activity[];
}

interface Expense {
  id: string;
  description: string;
  amount: number;
  category: string;
  member?: string;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'travel' | 'expense'>('travel');
  const [trips, setTrips] = useState<Trip[]>([
    {
      id: '1',
      name: 'Summer Vacation 2024',
      status: 'ongoing',
      date: 'Mar 17, 2026',
      activities: [
        { id: 'a1', type: 'Railway', location: 'Central Station', time: '10:00 AM', completed: false },
        { id: 'a2', type: 'Hotel', location: 'Grand Plaza', time: '02:00 PM', completed: false },
      ]
    },
    {
      id: '2',
      name: 'Weekend Getaway',
      status: 'previous',
      date: 'Feb 12, 2026',
      activities: []
    }
  ]);

  const [expenses, setExpenses] = useState<Expense[]>([
    { id: 'e1', description: 'Train Tickets', amount: 120, category: 'Travel', member: 'Self' },
    { id: 'e2', description: 'Lunch at Station', amount: 45, category: 'Food', member: 'Self' },
  ]);

  const [members, setMembers] = useState<string[]>(['Self']);

  const [showAddTrip, setShowAddTrip] = useState(false);
  const [newTripName, setNewTripName] = useState('');

  const [showAddActivity, setShowAddActivity] = useState(false);
  const [activeTripId, setActiveTripId] = useState<string | null>(null);
  const [newActivity, setNewActivity] = useState({
    type: '',
    location: '',
    time: '',
    navigationUrl: '',
    transportMode: 'walking' as const
  });

  const ongoingTrip = trips.find(t => t.status === 'ongoing');
  const previousTrips = trips.filter(t => t.status === 'previous');

  const totalExpense = useMemo(() => expenses.reduce((sum, e) => sum + e.amount, 0), [expenses]);

  const addTrip = () => {
    if (!newTripName.trim()) return;
    const newTrip: Trip = {
      id: Date.now().toString(),
      name: newTripName,
      status: 'ongoing',
      date: new Date().toLocaleDateString(),
      activities: []
    };
    // Mark others as previous
    setTrips(prev => prev.map(t => ({ ...t, status: 'previous' as const })).concat(newTrip));
    setNewTripName('');
    setShowAddTrip(false);
  };

  const addActivity = (tripId: string) => {
    setActiveTripId(tripId);
    setShowAddActivity(true);
  };

  const handleAddActivity = () => {
    if (!activeTripId || !newActivity.type) return;
    
    const activity: Activity = {
      id: Date.now().toString(),
      ...newActivity,
      completed: false
    };

    setTrips(prev => prev.map(t => 
      t.id === activeTripId ? { ...t, activities: [...t.activities, activity] } : t
    ));

    setNewActivity({
      type: '',
      location: '',
      time: '',
      navigationUrl: '',
      transportMode: 'walking'
    });
    setShowAddActivity(false);
    setActiveTripId(null);
  };

  const [newExpenseDesc, setNewExpenseDesc] = useState('');
  const [newExpenseAmount, setNewExpenseAmount] = useState('');
  const [selectedMember, setSelectedMember] = useState('Self');

  const addExpense = () => {
    if (!newExpenseDesc || !newExpenseAmount) return;
    const newExp: Expense = {
      id: Date.now().toString(),
      description: newExpenseDesc,
      amount: parseFloat(newExpenseAmount),
      category: 'Travel',
      member: selectedMember
    };
    setExpenses(prev => [...prev, newExp]);
    setNewExpenseDesc('');
    setNewExpenseAmount('');
  };

  const addMember = () => {
    const name = prompt('Member name?');
    if (name && !members.includes(name)) {
      setMembers(prev => [...prev, name]);
    }
  };

  const memberBreakdown = useMemo(() => {
    const breakdown: Record<string, number> = {};
    members.forEach(m => breakdown[m] = 0);
    expenses.forEach(e => {
      if (e.member) {
        breakdown[e.member] = (breakdown[e.member] || 0) + e.amount;
      }
    });
    return breakdown;
  }, [expenses, members]);

  const removeMember = (name: string) => {
    if (name === 'Self') return;
    setMembers(prev => prev.filter(m => m !== name));
    // Also update expenses to 'Self' if the member is removed
    setExpenses(prev => prev.map(e => e.member === name ? { ...e, member: 'Self' } : e));
    if (selectedMember === name) setSelectedMember('Self');
  };

  const toggleActivity = (tripId: string, activityId: string) => {
    setTrips(prev => prev.map(t => 
      t.id === tripId ? {
        ...t,
        activities: t.activities.map(a => 
          a.id === activityId ? { ...a, completed: !a.completed } : a
        )
      } : t
    ));
  };

  const removeActivity = (tripId: string, activityId: string) => {
    setTrips(prev => prev.map(t => 
      t.id === tripId ? {
        ...t,
        activities: t.activities.filter(a => a.id !== activityId)
      } : t
    ));
  };

  const removeTrip = (tripId: string) => {
    setTrips(prev => prev.filter(t => t.id !== tripId));
  };

  return (
    <div className="min-h-screen bg-[#F5F5F5] text-[#1A1A1A] font-sans">
      {/* Header */}
      <header className="bg-white border-b border-black/5 px-6 py-8">
        <div className="max-w-md mx-auto">
          <h1 className="text-3xl font-light tracking-tight mb-6">Make My Trip</h1>
          
          <div className="flex bg-[#F0F0F0] p-1 rounded-xl">
            <button 
              onClick={() => setActiveTab('travel')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'travel' ? 'bg-white shadow-sm' : 'text-gray-500'}`}
            >
              TRAVEL
            </button>
            <button 
              onClick={() => setActiveTab('expense')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'expense' ? 'bg-white shadow-sm' : 'text-gray-500'}`}
            >
              EXPENSE
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto px-6 py-8 pb-24">
        <AnimatePresence mode="wait">
          {activeTab === 'travel' ? (
            <motion.div 
              key="travel"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              {/* Add Trip Button */}
              <button 
                onClick={() => setShowAddTrip(true)}
                className="w-full flex items-center justify-center gap-2 bg-white border border-black/5 p-4 rounded-2xl hover:bg-gray-50 transition-colors"
              >
                <Plus size={20} className="text-gray-400" />
                <span className="font-medium">Add trip</span>
              </button>

              {/* Ongoing Trip */}
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">Ongoing trip</h2>
                  {ongoingTrip && (
                    <button 
                      onClick={() => addActivity(ongoingTrip.id)}
                      className="p-1 hover:bg-gray-200 rounded-full transition-colors"
                    >
                      <Plus size={20} />
                    </button>
                  )}
                </div>

                {ongoingTrip ? (
                  <div className="bg-white rounded-3xl p-6 shadow-sm border border-black/5">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-xl font-medium">{ongoingTrip.name}</h3>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400">{ongoingTrip.date}</span>
                        <button 
                          onClick={() => removeTrip(ongoingTrip.id)}
                          className="p-1 text-gray-300 hover:text-red-500 transition-colors"
                          title="Delete trip"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {ongoingTrip.activities.map((activity) => (
                        <div 
                          key={activity.id} 
                          className="bg-gray-50 rounded-2xl p-4 border border-black/5"
                        >
                          <div className="flex items-start gap-4">
                            <button 
                              onClick={() => toggleActivity(ongoingTrip.id, activity.id)}
                              className={`mt-1 w-5 h-5 rounded border flex items-center justify-center transition-colors ${activity.completed ? 'bg-emerald-500 border-emerald-500' : 'border-gray-300'}`}
                            >
                              {activity.completed && <div className="w-2 h-2 bg-white rounded-full" />}
                            </button>
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  {activity.transportMode === 'walking' && <Footprints size={14} className="text-gray-400" />}
                                  {activity.transportMode === 'auto' && <Car size={14} className="text-gray-400" />}
                                  {activity.transportMode === 'train' && <Train size={14} className="text-gray-400" />}
                                  {activity.transportMode === 'other' && <Navigation size={14} className="text-gray-400" />}
                                  <span className={`font-medium ${activity.completed ? 'line-through text-gray-400' : ''}`}>
                                    {activity.type}
                                  </span>
                                </div>
                                {activity.navigationUrl && (
                                  <a 
                                    href={activity.navigationUrl} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="p-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider"
                                  >
                                    <Navigation size={12} />
                                    Navigate
                                  </a>
                                )}
                                <button 
                                  onClick={() => removeActivity(ongoingTrip.id, activity.id)}
                                  className="p-2 text-gray-300 hover:text-red-500 transition-colors ml-2"
                                  title="Remove activity"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                              <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                                <div className="flex items-center gap-1">
                                  <MapPin size={12} />
                                  <span>{activity.location}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Clock size={12} />
                                  <span>{activity.time}</span>
                                </div>
                                {activity.transportMode && (
                                  <span className="bg-gray-200 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase">
                                    {activity.transportMode}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                      {ongoingTrip.activities.length === 0 && (
                        <p className="text-sm text-gray-400 italic">No activities added yet.</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="bg-white/50 border border-dashed border-gray-300 rounded-3xl p-8 text-center">
                    <p className="text-sm text-gray-500">No ongoing trip. Add one to start tracking!</p>
                  </div>
                )}
              </section>

              {/* Previous Trips */}
              <section>
                <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-4">Previous trips</h2>
                <div className="space-y-3">
                  {previousTrips.map((trip) => (
                    <div key={trip.id} className="bg-white p-4 rounded-2xl flex items-center justify-between border border-black/5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
                          <History size={20} className="text-gray-400" />
                        </div>
                        <div>
                          <h4 className="font-medium">{trip.name}</h4>
                          <p className="text-xs text-gray-400">{trip.date}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => removeTrip(trip.id)}
                          className="p-2 text-gray-300 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                        <ChevronRight size={18} className="text-gray-300" />
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </motion.div>
          ) : (
            <motion.div 
              key="expense"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              {/* Total Expense Card */}
              <div className="bg-[#1A1A1A] text-white rounded-3xl p-8 shadow-xl relative overflow-hidden">
                <div className="relative z-10">
                  <p className="text-sm font-medium text-white/60 uppercase tracking-widest mb-2">Total Expense</p>
                  <h2 className="text-5xl font-light tracking-tight">${totalExpense}</h2>
                  
                  <div className="mt-6 flex flex-wrap gap-3">
                    {Object.entries(memberBreakdown).map(([name, amount]) => (
                      <div key={name} className="bg-white/10 backdrop-blur-md rounded-xl px-3 py-2 border border-white/5 flex items-center gap-2">
                        <div>
                          <p className="text-[10px] uppercase font-bold tracking-wider text-white/40">{name}</p>
                          <p className="text-sm font-medium">${amount}</p>
                        </div>
                        {name !== 'Self' && (
                          <button 
                            onClick={() => removeMember(name)}
                            className="p-1 hover:bg-white/10 rounded-full transition-colors text-white/40 hover:text-white"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-white/5 rounded-full blur-2xl" />
                <div className="absolute right-6 top-6">
                  <Wallet size={24} className="text-white/20" />
                </div>
              </div>

              {/* Individual Expenses */}
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">Travel Expenses</h2>
                  <button 
                    onClick={addMember}
                    className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700"
                  >
                    <UserPlus size={14} />
                    Add Member
                  </button>
                </div>
                
                <div className="bg-white rounded-3xl overflow-hidden border border-black/5">
                  {expenses.map((expense, idx) => (
                    <div 
                      key={expense.id} 
                      className={`p-5 flex items-center justify-between ${idx !== expenses.length - 1 ? 'border-bottom border-black/5' : ''}`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                          {expense.category === 'Travel' ? <Plane size={18} /> : <Train size={18} />}
                        </div>
                        <div>
                          <h4 className="font-medium text-sm">{expense.description}</h4>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400">{expense.category}</span>
                            <span className="w-1 h-1 bg-gray-300 rounded-full" />
                            <span className="text-[10px] text-gray-400">By {expense.member}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-sm">${expense.amount}</p>
                        <button 
                          onClick={() => setExpenses(prev => prev.filter(e => e.id !== expense.id))}
                          className="text-[10px] text-red-400 hover:text-red-600 mt-1"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                  
                  {/* Add Expense Form */}
                  <div className="p-5 bg-gray-50 border-t border-black/5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                      <input 
                        type="text" 
                        value={newExpenseDesc}
                        onChange={(e) => setNewExpenseDesc(e.target.value)}
                        placeholder="Description..." 
                        className="flex-1 bg-white border border-black/5 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      />
                      <div className="flex gap-2">
                        <input 
                          type="number" 
                          value={newExpenseAmount}
                          onChange={(e) => setNewExpenseAmount(e.target.value)}
                          placeholder="Amount" 
                          className="w-24 bg-white border border-black/5 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                        />
                        <select 
                          value={selectedMember}
                          onChange={(e) => setSelectedMember(e.target.value)}
                          className="flex-1 bg-white border border-black/5 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 appearance-none"
                        >
                          {members.map(m => (
                            <option key={m} value={m}>{m}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <button 
                      onClick={addExpense}
                      className="w-full py-3 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-500/10"
                    >
                      Add Expense
                    </button>
                  </div>
                </div>
              </section>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Add Trip Modal */}
      <AnimatePresence>
        {showAddTrip && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddTrip(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              className="relative w-full max-w-md bg-white rounded-t-[2.5rem] sm:rounded-[2.5rem] p-8 shadow-2xl"
            >
              <h3 className="text-2xl font-light mb-6">Create New Trip</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] uppercase font-bold tracking-widest text-gray-400 mb-2 block">Trip Name</label>
                  <input 
                    autoFocus
                    type="text" 
                    value={newTripName}
                    onChange={(e) => setNewTripName(e.target.value)}
                    placeholder="e.g. Paris Adventure"
                    className="w-full bg-gray-50 border border-black/5 rounded-2xl px-6 py-4 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <button 
                    onClick={() => setShowAddTrip(false)}
                    className="flex-1 py-4 rounded-2xl font-medium text-gray-500 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={addTrip}
                    className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-medium hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-500/20"
                  >
                    Start Trip
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Activity Modal */}
      <AnimatePresence>
        {showAddActivity && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddActivity(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              className="relative w-full max-w-md bg-white rounded-t-[2.5rem] sm:rounded-[2.5rem] p-8 shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <h3 className="text-2xl font-light mb-6">Add Activity</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] uppercase font-bold tracking-widest text-gray-400 mb-2 block">Activity Type</label>
                  <input 
                    type="text" 
                    value={newActivity.type}
                    onChange={(e) => setNewActivity(prev => ({ ...prev, type: e.target.value }))}
                    placeholder="e.g. Railway, Hotel, Museum"
                    className="w-full bg-gray-50 border border-black/5 rounded-2xl px-6 py-4 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold tracking-widest text-gray-400 mb-2 block">Location</label>
                  <input 
                    type="text" 
                    value={newActivity.location}
                    onChange={(e) => setNewActivity(prev => ({ ...prev, location: e.target.value }))}
                    placeholder="Where is it?"
                    className="w-full bg-gray-50 border border-black/5 rounded-2xl px-6 py-4 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] uppercase font-bold tracking-widest text-gray-400 mb-2 block">Time / Duration</label>
                    <input 
                      type="text" 
                      value={newActivity.time}
                      onChange={(e) => setNewActivity(prev => ({ ...prev, time: e.target.value }))}
                      placeholder="e.g. 10:00 AM or 2 hrs"
                      className="w-full bg-gray-50 border border-black/5 rounded-2xl px-6 py-4 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold tracking-widest text-gray-400 mb-2 block">Transport Mode</label>
                    <select 
                      value={newActivity.transportMode}
                      onChange={(e) => setNewActivity(prev => ({ ...prev, transportMode: e.target.value as any }))}
                      className="w-full bg-gray-50 border border-black/5 rounded-2xl px-6 py-4 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 appearance-none"
                    >
                      <option value="walking">Walking</option>
                      <option value="auto">Auto/Car</option>
                      <option value="train">Train</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold tracking-widest text-gray-400 mb-2 block">Navigation Link (Optional)</label>
                  <input 
                    type="url" 
                    value={newActivity.navigationUrl}
                    onChange={(e) => setNewActivity(prev => ({ ...prev, navigationUrl: e.target.value }))}
                    placeholder="https://maps.google.com/..."
                    className="w-full bg-gray-50 border border-black/5 rounded-2xl px-6 py-4 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <button 
                    onClick={() => setShowAddActivity(false)}
                    className="flex-1 py-4 rounded-2xl font-medium text-gray-500 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleAddActivity}
                    className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-medium hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-500/20"
                  >
                    Add
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Bottom Nav (Mobile Style) */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md border-t border-black/5 px-8 py-4 sm:hidden">
        <div className="max-w-md mx-auto flex justify-around items-center">
          <button 
            onClick={() => setActiveTab('travel')}
            className={`flex flex-col items-center gap-1 ${activeTab === 'travel' ? 'text-indigo-600' : 'text-gray-400'}`}
          >
            <MapPin size={24} />
            <span className="text-[10px] font-bold uppercase tracking-tighter">Trips</span>
          </button>
          <button 
            onClick={() => setActiveTab('expense')}
            className={`flex flex-col items-center gap-1 ${activeTab === 'expense' ? 'text-indigo-600' : 'text-gray-400'}`}
          >
            <Wallet size={24} />
            <span className="text-[10px] font-bold uppercase tracking-tighter">Budget</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
