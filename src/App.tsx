/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect, Component } from 'react';
import { 
  Plus, 
  MapPin, 
  Clock, 
  Train, 
  ChevronRight, 
  Wallet, 
  History,
  UserPlus,
  Trash2,
  Calendar,
  Navigation,
  Footprints,
  Car,
  ExternalLink,
  LogOut,
  LogIn,
  Share2,
  Download,
  X,
  Receipt,
  FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { auth, db, googleProvider, signInWithPopup, signOut, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from './firebase';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  setDoc,
  getDoc,
  orderBy,
  serverTimestamp,
  getDocFromServer
} from 'firebase/firestore';

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
  userId: string;
}

interface Expense {
  id: string;
  description: string;
  amount: number;
  category: string;
  member?: string;
  userId: string;
}

interface Member {
  id: string;
  name: string;
  userId: string;
}

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}

function AppContent() {
  const [user, setUser] = useState<any>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [activeTab, setActiveTab] = useState<'travel' | 'expense'>('travel');
  const [trips, setTrips] = useState<Trip[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  
  // Email/Password Auth State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Error handling for Firestore
  const handleFirestoreError = (error: any, operation: OperationType, path: string) => {
    const errInfo = {
      error: error.message || String(error),
      operationType: operation,
      path,
      authInfo: {
        userId: auth.currentUser?.uid || '',
        email: auth.currentUser?.email || '',
        emailVerified: auth.currentUser?.emailVerified || false,
        isAnonymous: auth.currentUser?.isAnonymous || false,
        tenantId: auth.currentUser?.tenantId || '',
        providerInfo: auth.currentUser?.providerData.map(provider => ({
          providerId: provider.providerId,
          displayName: provider.displayName || '',
          email: provider.email || '',
          photoUrl: provider.photoURL || ''
        })) || []
      }
    };
    const errString = JSON.stringify(errInfo);
    console.error('Firestore Error:', errString);
    throw new Error(errString);
  };

  // Auth State Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setIsAuthReady(true);
      if (!user) {
        // Reset state on logout
        setTrips([]);
        setExpenses([]);
        setMembers([]);
      }
    });
    return () => unsubscribe();
  }, []);

  // Firestore Sync
  useEffect(() => {
    if (!user) return;

    const tripsQuery = query(collection(db, 'trips'), where('userId', '==', user.uid));
    const unsubscribeTrips = onSnapshot(tripsQuery, (snapshot) => {
      const tripsData = snapshot.docs.map(doc => ({ ...doc.data() } as Trip));
      setTrips(tripsData);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'trips'));

    const expensesQuery = query(collection(db, 'expenses'), where('userId', '==', user.uid));
    const unsubscribeExpenses = onSnapshot(expensesQuery, (snapshot) => {
      const expensesData = snapshot.docs.map(doc => ({ ...doc.data() } as Expense));
      setExpenses(expensesData);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'expenses'));

    const membersQuery = query(collection(db, 'members'), where('userId', '==', user.uid));
    const unsubscribeMembers = onSnapshot(membersQuery, (snapshot) => {
      const membersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Member));
      setMembers(membersData);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'members'));

    // Test connection
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error: any) {
        if (error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration.");
        }
      }
    };
    testConnection();

    return () => {
      unsubscribeTrips();
      unsubscribeExpenses();
      unsubscribeMembers();
    };
  }, [user]);

  const login = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      await initializeUserDoc(user);
      setShowAuthModal(false);
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  const initializeUserDoc = async (user: any) => {
    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      await setDoc(userRef, {
        role: 'user',
        email: user.email,
        displayName: user.displayName || displayName,
        createdAt: new Date().toISOString()
      });
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    try {
      if (isSignUp) {
        const result = await createUserWithEmailAndPassword(auth, email, password);
        if (displayName) {
          await updateProfile(result.user, { displayName });
        }
        await initializeUserDoc(result.user);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      setShowAuthModal(false);
      setEmail('');
      setPassword('');
      setDisplayName('');
    } catch (error: any) {
      console.error('Auth failed:', error);
      setAuthError(error.message);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const [showAddTrip, setShowAddTrip] = useState(false);
  const [newTripName, setNewTripName] = useState('');
  const [showAddMember, setShowAddMember] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');

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

  const addTrip = async () => {
    if (!user) return;
    if (!newTripName.trim()) {
      alert("Please enter an event name.");
      return;
    }
    const trimmedName = newTripName.trim();
    const tripId = Date.now().toString();
    const newTrip: Trip = {
      id: tripId,
      name: trimmedName,
      status: 'ongoing',
      date: new Date().toLocaleDateString(),
      activities: [],
      userId: user.uid
    };

    try {
      // Mark others as previous in Firestore
      const ongoingTrips = trips.filter(t => t.status === 'ongoing');
      for (const t of ongoingTrips) {
        await updateDoc(doc(db, 'trips', t.id), { status: 'previous' });
      }
      await setDoc(doc(db, 'trips', tripId), newTrip);
      setNewTripName('');
      setShowAddTrip(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `trips/${tripId}`);
    }
  };

  const addActivity = (tripId: string) => {
    setActiveTripId(tripId);
    setShowAddActivity(true);
  };

  const handleAddActivity = async () => {
    if (!activeTripId || !newActivity.type || !user) return;
    
    const activityId = Date.now().toString();
    const activity: Activity = {
      id: activityId,
      ...newActivity,
      completed: false
    };

    try {
      const trip = trips.find(t => t.id === activeTripId);
      if (trip) {
        await updateDoc(doc(db, 'trips', activeTripId), {
          activities: [...trip.activities, activity]
        });
      }
      setNewActivity({
        type: '',
        location: '',
        time: '',
        navigationUrl: '',
        transportMode: 'walking'
      });
      setShowAddActivity(false);
      setActiveTripId(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `trips/${activeTripId}`);
    }
  };

  const [newExpenseDesc, setNewExpenseDesc] = useState('');
  const [newExpenseAmount, setNewExpenseAmount] = useState('');
  const [selectedMember, setSelectedMember] = useState('All');

  const addExpense = async () => {
    if (!newExpenseDesc || !newExpenseAmount || !user) return;
    const expenseId = Date.now().toString();
    const newExp: Expense = {
      id: expenseId,
      description: newExpenseDesc,
      amount: parseFloat(newExpenseAmount),
      category: 'General',
      member: selectedMember,
      userId: user.uid
    };
    try {
      await setDoc(doc(db, 'expenses', expenseId), newExp);
      setNewExpenseDesc('');
      setNewExpenseAmount('');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `expenses/${expenseId}`);
    }
  };

  const handleAddMember = async () => {
    if (!user) return;
    if (!newMemberName.trim()) {
      alert("Please enter a member name.");
      return;
    }
    const trimmedName = newMemberName.trim();
    if (members.some(m => m.name.toLowerCase() === trimmedName.toLowerCase())) {
      alert("Member already exists!");
      return;
    }
    const memberId = Date.now().toString();
    try {
      await setDoc(doc(db, 'members', memberId), { name: trimmedName, userId: user.uid });
      setNewMemberName('');
      setShowAddMember(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `members/${memberId}`);
    }
  };

  const exportBill = () => {
    let text = "--- EXPENSE SUMMARY ---\n\n";
    text += `Total Expense: $${totalExpense.toFixed(2)}\n\n`;
    text += "Member Breakdown:\n";
    Object.entries(memberBreakdown).forEach(([name, amount]) => {
      text += `${name}: $${amount.toFixed(2)}\n`;
    });
    text += "\nDetailed Expenses:\n";
    expenses.forEach(e => {
      text += `- ${e.description}: $${e.amount.toFixed(2)} (${e.member})\n`;
    });
    
    navigator.clipboard.writeText(text);
    alert("Bill summary copied to clipboard!");
  };

  const downloadBill = () => {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(22);
    doc.setTextColor(79, 70, 229); // Indigo-600
    doc.text("EXPENSE SUMMARY", 105, 20, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 105, 28, { align: 'center' });
    
    // Total
    doc.setFontSize(16);
    doc.setTextColor(0);
    doc.text(`Total Expense: $${totalExpense.toFixed(2)}`, 20, 45);
    
    // Member Breakdown Table
    doc.setFontSize(14);
    doc.text("Member Breakdown", 20, 55);
    
    const breakdownData = Object.entries(memberBreakdown).map(([name, amount]) => [
      name, 
      `$${amount.toFixed(2)}`
    ]);
    
    autoTable(doc, {
      startY: 60,
      head: [['Member Name', 'Total Share']],
      body: breakdownData,
      theme: 'striped',
      headStyles: { fillColor: [79, 70, 229] }
    });
    
    // Detailed Expenses Table
    const finalY = (doc as any).lastAutoTable.finalY || 60;
    doc.setFontSize(14);
    doc.text("Detailed Expenses", 20, finalY + 15);
    
    const expenseData = expenses.map(e => [
      e.description,
      e.member || 'All',
      `$${e.amount.toFixed(2)}`
    ]);
    
    autoTable(doc, {
      startY: finalY + 20,
      head: [['Description', 'Member', 'Amount']],
      body: expenseData,
      theme: 'grid',
      headStyles: { fillColor: [31, 41, 55] }
    });
    
    doc.save('expense_summary.pdf');
  };

  const downloadIndividualBill = (memberName: string) => {
    const doc = new jsPDF();
    const memberTotal = memberBreakdown[memberName] || 0;
    const memberExpenses = expenses.filter(e => e.member === memberName || e.member === 'All');
    
    // Header
    doc.setFontSize(22);
    doc.setTextColor(79, 70, 229);
    doc.text(`BILL FOR: ${memberName.toUpperCase()}`, 105, 20, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 105, 28, { align: 'center' });
    
    // Total
    doc.setFontSize(16);
    doc.setTextColor(0);
    doc.text(`Total Share: $${memberTotal.toFixed(2)}`, 20, 45);
    
    // Detailed Expenses Table
    doc.setFontSize(14);
    doc.text("Expense Details", 20, 55);
    
    const expenseData = memberExpenses.map(e => {
      const share = e.member === 'All' ? e.amount / members.length : e.amount;
      return [
        e.description,
        e.member === 'All' ? 'Split' : 'Individual',
        `$${e.amount.toFixed(2)}`,
        `$${share.toFixed(2)}`
      ];
    });
    
    autoTable(doc, {
      startY: 60,
      head: [['Description', 'Type', 'Total Amount', 'Your Share']],
      body: expenseData,
      theme: 'striped',
      headStyles: { fillColor: [79, 70, 229] }
    });
    
    doc.save(`${memberName}_bill.pdf`);
  };

  const memberBreakdown = useMemo(() => {
    const breakdown: Record<string, number> = {};
    const currentMemberNames = members.map(m => m.name);
    currentMemberNames.forEach(name => breakdown[name] = 0);
    
    expenses.forEach(e => {
      if (e.member === 'All') {
        if (members.length > 0) {
          const splitAmount = e.amount / members.length;
          currentMemberNames.forEach(name => {
            breakdown[name] = (breakdown[name] || 0) + splitAmount;
          });
        }
      } else if (e.member && currentMemberNames.includes(e.member)) {
        breakdown[e.member] = (breakdown[e.member] || 0) + e.amount;
      }
    });
    return breakdown;
  }, [expenses, members]);

  const removeMember = async (name: string) => {
    if (!user) return;
    
    const memberToDelete = members.find(m => m.name === name);
    if (!memberToDelete) return;

    try {
      // Delete the member
      await deleteDoc(doc(db, 'members', memberToDelete.id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `members/${memberToDelete.id}`);
    }
  };

  const toggleActivity = async (tripId: string, activityId: string) => {
    if (!user) return;
    const trip = trips.find(t => t.id === tripId);
    if (!trip) return;

    const updatedActivities = trip.activities.map(a => 
      a.id === activityId ? { ...a, completed: !a.completed } : a
    );

    try {
      await updateDoc(doc(db, 'trips', tripId), { activities: updatedActivities });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `trips/${tripId}`);
    }
  };

  const removeActivity = async (tripId: string, activityId: string) => {
    if (!user) return;
    const trip = trips.find(t => t.id === tripId);
    if (!trip) return;

    const updatedActivities = trip.activities.filter(a => a.id !== activityId);

    try {
      await updateDoc(doc(db, 'trips', tripId), { activities: updatedActivities });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `trips/${tripId}`);
    }
  };

  const removeTrip = async (tripId: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'trips', tripId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `trips/${tripId}`);
    }
  };

  if (!isAuthReady) {
    return (
      <div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500 font-medium">Loading your events...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F5F5] text-[#1A1A1A] font-sans">
      {/* Header */}
      <header className="bg-white border-b border-black/5 px-6 py-8">
        <div className="max-w-md mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-light tracking-tight">Expense Tracker</h1>
            {user ? (
              <div className="flex items-center gap-3">
                <img 
                  src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName || user.email}`} 
                  alt={user.displayName || user.email} 
                  className="w-8 h-8 rounded-full border border-black/5"
                  referrerPolicy="no-referrer"
                />
                <button 
                  onClick={logout}
                  className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                  title="Logout"
                >
                  <LogOut size={20} />
                </button>
              </div>
            ) : (
              <button 
                onClick={() => setShowAuthModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-500/10"
              >
                <LogIn size={18} />
                Login
              </button>
            )}
          </div>
          
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
        {!user && isAuthReady && (
          <div className="bg-indigo-50 border border-indigo-100 rounded-3xl p-8 text-center mb-8">
            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
              <LogIn className="text-indigo-600" size={32} />
            </div>
            <h3 className="text-xl font-medium text-indigo-900 mb-2">Restore Your Data</h3>
            <p className="text-sm text-indigo-700/70 mb-6">Login to sync your events and expenses across all your devices.</p>
            <button 
              onClick={() => setShowAuthModal(true)}
              className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-medium hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-500/20"
            >
              Get Started
            </button>
          </div>
        )}

        <AnimatePresence mode="wait">
          {activeTab === 'travel' ? (
            <motion.div 
              key="travel"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              {/* Add Event Button */}
              <button 
                onClick={() => setShowAddTrip(true)}
                className="w-full flex items-center justify-center gap-2 bg-white border border-black/5 p-4 rounded-2xl hover:bg-gray-50 transition-colors"
              >
                <Plus size={20} className="text-gray-400" />
                <span className="font-medium">Add event</span>
              </button>

              {/* Ongoing Event */}
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">Ongoing event</h2>
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
                          title="Delete event"
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
                    <p className="text-sm text-gray-500">No ongoing event. Add one to start tracking!</p>
                  </div>
                )}
              </section>

              {/* Previous Events */}
              <section>
                <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-4">Previous events</h2>
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
                  <h2 className="text-5xl font-light tracking-tight">${totalExpense.toFixed(2)}</h2>
                  
                  <div className="flex gap-2 mt-4">
                    <button 
                      onClick={exportBill}
                      className="flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      <Share2 size={12} />
                      Share
                    </button>
                    <button 
                      onClick={downloadBill}
                      className="flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      <Download size={12} />
                      Download
                    </button>
                  </div>

                  <div className="mt-6 flex flex-wrap gap-3">
                    {Object.entries(memberBreakdown).map(([name, amount]) => (
                      <div key={name} className="bg-white/10 backdrop-blur-md rounded-xl px-3 py-2 border border-white/5 flex items-center gap-2">
                        <div>
                          <p className="text-[10px] uppercase font-bold tracking-wider text-white/40">{name}</p>
                          <p className="text-sm font-medium">${amount.toFixed(2)}</p>
                        </div>
                        <button 
                          onClick={() => removeMember(name)}
                          className="p-1 hover:bg-white/10 rounded-full transition-colors text-white/40 hover:text-white"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-white/5 rounded-full blur-2xl" />
                <div className="absolute right-6 top-6">
                  <Wallet size={24} className="text-white/20" />
                </div>
              </div>

              {/* Detailed Bill Section */}
              <section>
                <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-4">Individual Bills</h2>
                <div className="space-y-4">
                  {Object.entries(memberBreakdown).map(([name, total]) => (
                    <div key={name} className="bg-white rounded-3xl p-6 border border-black/5">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <h3 className="font-semibold text-lg">{name}</h3>
                          <button 
                            onClick={() => downloadIndividualBill(name)}
                            className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="Download Individual Bill"
                          >
                            <FileText size={16} />
                          </button>
                        </div>
                        <p className="text-indigo-600 font-bold">${total.toFixed(2)}</p>
                      </div>
                      <div className="space-y-2">
                        {expenses.filter(e => e.member === name || e.member === 'All').map(e => (
                          <div key={e.id} className="flex items-center justify-between text-sm text-gray-500">
                            <span>
                              {e.description} 
                              {e.member === 'All' && (
                                <span className="ml-2 text-[10px] bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">
                                  Split
                                </span>
                              )}
                            </span>
                            <span className="font-medium text-gray-700">
                              ${e.member === 'All' ? (e.amount / members.length).toFixed(2) : e.amount.toFixed(2)}
                            </span>
                          </div>
                        ))}
                        {expenses.filter(e => e.member === name || e.member === 'All').length === 0 && (
                          <p className="text-xs text-gray-400 italic">No expenses recorded.</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Individual Expenses */}
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">Travel Expenses</h2>
                  <button 
                    onClick={() => setShowAddMember(true)}
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
                          {expense.category === 'General' ? <Receipt size={18} /> : <Train size={18} />}
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
                          onClick={async () => {
                            try {
                              await deleteDoc(doc(db, 'expenses', expense.id));
                            } catch (err) {
                              handleFirestoreError(err, OperationType.DELETE, `expenses/${expense.id}`);
                            }
                          }}
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
                          <option value="All">All</option>
                          {members.map(m => (
                            <option key={m.id} value={m.name}>{m.name}</option>
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

      {/* Auth Modal */}
      <AnimatePresence>
        {showAuthModal && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAuthModal(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              className="relative w-full max-w-md bg-white rounded-t-[2.5rem] sm:rounded-[2.5rem] p-8 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-light">{isSignUp ? 'Create Account' : 'Welcome Back'}</h3>
                <button onClick={() => setShowAuthModal(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <X size={20} className="text-gray-400" />
                </button>
              </div>

              <form onSubmit={handleEmailAuth} className="space-y-4">
                {isSignUp && (
                  <div>
                    <label className="text-[10px] uppercase font-bold tracking-widest text-gray-400 mb-2 block">Name</label>
                    <input 
                      type="text" 
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Your Name"
                      className="w-full bg-gray-50 border border-black/5 rounded-2xl px-6 py-4 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      required
                    />
                  </div>
                )}
                <div>
                  <label className="text-[10px] uppercase font-bold tracking-widest text-gray-400 mb-2 block">Email</label>
                  <input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@example.com"
                    className="w-full bg-gray-50 border border-black/5 rounded-2xl px-6 py-4 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold tracking-widest text-gray-400 mb-2 block">Password</label>
                  <input 
                    type="password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-gray-50 border border-black/5 rounded-2xl px-6 py-4 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    required
                  />
                </div>

                {authError && (
                  <p className="text-xs text-red-500 bg-red-50 p-3 rounded-xl">{authError}</p>
                )}

                <button 
                  type="submit"
                  className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-medium hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-500/20"
                >
                  {isSignUp ? 'Sign Up' : 'Login'}
                </button>
              </form>

              <div className="mt-6">
                <div className="relative flex items-center justify-center mb-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-100"></div>
                  </div>
                  <span className="relative px-4 bg-white text-xs text-gray-400 uppercase tracking-widest">Or continue with</span>
                </div>

                <button 
                  onClick={login}
                  className="w-full py-4 bg-white border border-black/5 text-gray-700 rounded-2xl font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-3"
                >
                  <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" />
                  Google
                </button>
              </div>

              <p className="mt-8 text-center text-sm text-gray-500">
                {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
                <button 
                  onClick={() => setIsSignUp(!isSignUp)}
                  className="text-indigo-600 font-medium hover:underline"
                >
                  {isSignUp ? 'Login' : 'Sign Up'}
                </button>
              </p>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
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
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-light">Create New Event</h3>
                <button onClick={() => setShowAddTrip(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <X size={20} className="text-gray-400" />
                </button>
              </div>
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  addTrip();
                }}
                className="space-y-4"
              >
                <div>
                  <label className="text-[10px] uppercase font-bold tracking-widest text-gray-400 mb-2 block">Event Name</label>
                  <input 
                    autoFocus
                    type="text" 
                    value={newTripName}
                    onChange={(e) => setNewTripName(e.target.value)}
                    placeholder="e.g. Monthly Groceries"
                    className="w-full bg-gray-50 border border-black/5 rounded-2xl px-6 py-4 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <button 
                    type="button"
                    onClick={() => setShowAddTrip(false)}
                    className="flex-1 py-4 rounded-2xl font-medium text-gray-500 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-medium hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-500/20"
                  >
                    Start Event
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* Add Member Modal */}
        {showAddMember && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddMember(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              className="relative w-full max-w-md bg-white rounded-t-[2.5rem] sm:rounded-[2.5rem] p-8 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-light">Add Member</h3>
                <button onClick={() => setShowAddMember(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <X size={20} className="text-gray-400" />
                </button>
              </div>
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  handleAddMember();
                }}
                className="space-y-4"
              >
                <div>
                  <label className="text-[10px] uppercase font-bold tracking-widest text-gray-400 mb-2 block">Member Name</label>
                  <input 
                    autoFocus
                    type="text" 
                    value={newMemberName}
                    onChange={(e) => setNewMemberName(e.target.value)}
                    placeholder="e.g. John Doe"
                    className="w-full bg-gray-50 border border-black/5 rounded-2xl px-6 py-4 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <button 
                    type="button"
                    onClick={() => setShowAddMember(false)}
                    className="flex-1 py-4 rounded-2xl font-medium text-gray-500 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-medium hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-500/20"
                  >
                    Add Member
                  </button>
                </div>
              </form>
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
            <span className="text-[10px] font-bold uppercase tracking-tighter">Events</span>
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
