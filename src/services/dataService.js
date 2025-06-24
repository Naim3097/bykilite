import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  writeBatch,
  query,
  orderBy,
  where,
  setDoc
} from 'firebase/firestore';
import { db, auth } from '../config/firebaseConfig';

// ============================================================================
// 🔐 USER-SCOPED DATA HELPERS (Phase 1 Implementation)
// ============================================================================

/**
 * Helper function to get current authenticated user ID
 * @returns {string} The current user's UID
 * @throws {Error} If user is not authenticated
 */
const getCurrentUserId = () => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('User not authenticated');
  }
  return user.uid;
};

/**
 * Helper function to get user-scoped collection reference
 * @param {string} collectionName - Name of the collection
 * @returns {CollectionReference} User-scoped collection reference
 */
const getUserCollection = (collectionName) => {
  const userId = getCurrentUserId();
  return collection(db, 'users', userId, collectionName);
};

/**
 * Helper function to get user-scoped document reference
 * @param {string} collectionName - Name of the collection
 * @param {string} docId - Document ID
 * @returns {DocumentReference} User-scoped document reference
 */
const getUserDoc = (collectionName, docId) => {
  const userId = getCurrentUserId();
  return doc(db, 'users', userId, collectionName, docId);
};

// ============================================================================
// 📦 PARTS OPERATIONS (User-Scoped)
// ============================================================================

// Parts operations
export const getParts = async () => {
  try {
    const userPartsCollection = getUserCollection('parts');
    const querySnapshot = await getDocs(userPartsCollection);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting parts:', error);
    throw error;
  }
};

export const getPartById = async (id) => {
  try {
    const docRef = getUserDoc('parts', id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    } else {
      throw new Error('Part not found');
    }
  } catch (error) {
    console.error('Error getting part:', error);
    throw error;
  }
};

export const createPart = async (partData) => {
  try {
    const userPartsCollection = getUserCollection('parts');
    const docRef = await addDoc(userPartsCollection, {
      ...partData,
      currentStock: partData.currentStock || 0
    });
    return docRef.id;
  } catch (error) {
    console.error('Error creating part:', error);
    throw error;
  }
};

export const updatePart = async (id, partData) => {
  try {
    const docRef = getUserDoc('parts', id);
    await updateDoc(docRef, partData);
  } catch (error) {
    console.error('Error updating part:', error);
    throw error;
  }
};

export const deletePart = async (id) => {
  try {
    const docRef = getUserDoc('parts', id);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Error deleting part:', error);
    throw error;
  }
};

// ============================================================================
// 🏪 SUPPLIERS OPERATIONS (User-Scoped)
// ============================================================================

export const getSuppliers = async () => {
  try {
    const userSuppliersCollection = getUserCollection('suppliers');
    const querySnapshot = await getDocs(userSuppliersCollection);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting suppliers:', error);
    throw error;
  }
};

export const createSupplier = async (supplierData) => {
  try {
    const userSuppliersCollection = getUserCollection('suppliers');
    const docRef = await addDoc(userSuppliersCollection, supplierData);
    return docRef.id;
  } catch (error) {
    console.error('Error creating supplier:', error);
    throw error;
  }
};

export const updateSupplier = async (id, supplierData) => {
  try {
    const docRef = getUserDoc('suppliers', id);
    await updateDoc(docRef, supplierData);
  } catch (error) {
    console.error('Error updating supplier:', error);
    throw error;
  }
};

export const deleteSupplier = async (id) => {
  try {
    const docRef = getUserDoc('suppliers', id);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Error deleting supplier:', error);
    throw error;
  }
};

// ============================================================================
// 📋 PURCHASE ORDERS OPERATIONS (User-Scoped)
// ============================================================================

export const getPurchaseOrders = async () => {
  try {
    const userPOCollection = getUserCollection('purchaseOrders');
    const q = query(userPOCollection, orderBy('date', 'desc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting purchase orders:', error);
    throw error;
  }
};

export const createPurchaseOrder = async (poData) => {
  try {
    const batch = writeBatch(db);
    
    // Add the purchase order to user scope
    const userPOCollection = getUserCollection('purchaseOrders');
    const poRef = doc(userPOCollection);
    batch.set(poRef, {
      ...poData,
      date: new Date().toISOString()
    });
    
    // Update stock for each item in user scope
    for (const item of poData.items) {
      const partRef = getUserDoc('parts', item.partId);
      const partDoc = await getDoc(partRef);
      if (partDoc.exists()) {
        const currentStock = partDoc.data().currentStock || 0;
        batch.update(partRef, {
          currentStock: currentStock + item.qty
        });
      }
    }
    
    await batch.commit();
    return poRef.id;
  } catch (error) {
    console.error('Error creating purchase order:', error);
    throw error;
  }
};

// ============================================================================
// 🧾 INVOICES OPERATIONS (User-Scoped)
// ============================================================================

// Get all invoices (includes both work-order and legacy invoices)
export const getInvoices = async () => {
  try {
    const userInvoicesCollection = getUserCollection('invoices');
    const q = query(userInvoicesCollection, orderBy('date', 'desc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting invoices:', error);
    throw error;
  }
};

// Get invoices by work order ID
export const getInvoicesByWorkOrder = async (workOrderId) => {
  try {
    const userInvoicesCollection = getUserCollection('invoices');
    const q = query(
      userInvoicesCollection, 
      where('workOrderId', '==', workOrderId),
      orderBy('date', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting invoices by work order:', error);
    throw error;
  }
};

// DEPRECATED: Manual invoice creation bypasses work order flow
// Use draftInvoiceForJob() instead for proper workflow integration
export const createInvoice = async (invoiceData) => {
  console.warn('DEPRECATED: Manual invoice creation. Use work order completion flow instead.');
  try {
    const batch = writeBatch(db);
    
    // Add the invoice to user scope
    const userInvoicesCollection = getUserCollection('invoices');
    const invoiceRef = doc(userInvoicesCollection);
    batch.set(invoiceRef, {
      ...invoiceData,
      date: new Date().toISOString(),
      source: 'manual' // Mark as manual for tracking
    });
    
    // Update stock for each item in user scope
    for (const item of invoiceData.items) {
      const partRef = getUserDoc('parts', item.partId);
      const partDoc = await getDoc(partRef);
      if (partDoc.exists()) {
        const currentStock = partDoc.data().currentStock || 0;
        const newStock = Math.max(0, currentStock - item.qty);
        batch.update(partRef, {
          currentStock: newStock
        });
      }
    }
    
    await batch.commit();
    return invoiceRef.id;
  } catch (error) {
    console.error('Error creating invoice:', error);
    throw error;
  }
};

// ============================================================================
// 📦 STOCK OPERATIONS (User-Scoped)
// ============================================================================

export const updateStock = async (partId, newStock) => {
  try {
    const docRef = getUserDoc('parts', partId);
    await updateDoc(docRef, {
      currentStock: newStock
    });
  } catch (error) {
    console.error('Error updating stock:', error);
    throw error;
  }
};

export const submitStockCount = async (stockCountData) => {
  try {
    const batch = writeBatch(db);
    
    // Add the stock count record to user scope
    const userStockCountsCollection = getUserCollection('stockCounts');
    const stockCountRef = doc(userStockCountsCollection);
    batch.set(stockCountRef, {
      ...stockCountData,
      date: new Date().toISOString()
    });
    
    // Update stock for each counted item in user scope
    for (const item of stockCountData.items) {
      const partRef = getUserDoc('parts', item.partId);
      batch.update(partRef, {
        currentStock: item.countedQty
      });
    }
    
    await batch.commit();
    return stockCountRef.id;
  } catch (error) {
    console.error('Error submitting stock count:', error);
    throw error;
  }
};

// ============================================================================
// 📊 DASHBOARD DATA (User-Scoped)
// ============================================================================

export const getDashboardData = async () => {
  try {
    const parts = await getParts();
    const lowStockParts = parts.filter(part => part.currentStock < 5);
    
    const recentPOs = await getPurchaseOrders();
    const allInvoices = await getInvoices();
    
    // Prioritize work-order invoices, then legacy invoices
    const recentInvoices = allInvoices
      .sort((a, b) => {
        // Sort by work-order invoices first, then by date
        if (a.workOrderId && !b.workOrderId) return -1;
        if (!a.workOrderId && b.workOrderId) return 1;
        return new Date(b.date) - new Date(a.date);
      });
    
    return {
      totalParts: parts.length,
      lowStockCount: lowStockParts.length,
      lowStockParts: lowStockParts.slice(0, 5), // Top 5 low stock items
      recentPOs: recentPOs.slice(0, 5), // 5 most recent POs
      recentInvoices: recentInvoices.slice(0, 5) // 5 most recent invoices (work-order prioritized)
    };
  } catch (error) {
    console.error('Error getting dashboard data:', error);
    throw error;
  }
};

// ============================================================================
// 👥 CUSTOMERS OPERATIONS (User-Scoped)
// ============================================================================

export const getCustomers = async () => {
  try {
    const userCustomersCollection = getUserCollection('customers');
    const querySnapshot = await getDocs(userCustomersCollection);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting customers:', error);
    throw error;
  }
};

export const createCustomer = async (customerData) => {
  try {
    const userCustomersCollection = getUserCollection('customers');
    const docRef = await addDoc(userCustomersCollection, customerData);
    return docRef.id;
  } catch (error) {
    console.error('Error creating customer:', error);
    throw error;
  }
};

export const updateCustomer = async (id, customerData) => {
  try {
    const docRef = getUserDoc('customers', id);
    await updateDoc(docRef, customerData);
  } catch (error) {
    console.error('Error updating customer:', error);
    throw error;
  }
};

export const deleteCustomer = async (id) => {
  try {
    const docRef = getUserDoc('customers', id);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Error deleting customer:', error);
    throw error;
  }
};

// ============================================================================
// 🔧 MECHANICS OPERATIONS (User-Scoped)
// ============================================================================

export const getMechanics = async () => {
  try {
    const userMechanicsCollection = getUserCollection('mechanics');
    const querySnapshot = await getDocs(userMechanicsCollection);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting mechanics:', error);
    throw error;
  }
};

export const createMechanic = async (mechanicData) => {
  try {
    const userMechanicsCollection = getUserCollection('mechanics');
    const docRef = await addDoc(userMechanicsCollection, mechanicData);
    return docRef.id;
  } catch (error) {
    console.error('Error creating mechanic:', error);
    throw error;
  }
};

export const updateMechanic = async (id, mechanicData) => {
  try {
    const docRef = getUserDoc('mechanics', id);
    await updateDoc(docRef, mechanicData);
  } catch (error) {
    console.error('Error updating mechanic:', error);
    throw error;
  }
};

export const deleteMechanic = async (id) => {
  try {
    const docRef = getUserDoc('mechanics', id);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Error deleting mechanic:', error);
    throw error;
  }
};

// ============================================================================
// 🔨 WORK ORDERS OPERATIONS (User-Scoped)
// ============================================================================

export const getWorkOrders = async () => {
  try {
    const userWorkOrdersCollection = getUserCollection('workOrders');
    const q = query(userWorkOrdersCollection, orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting work orders:', error);
    throw error;
  }
};

export const getWorkOrderById = async (id) => {
  try {
    const docRef = getUserDoc('workOrders', id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    } else {
      throw new Error('Work order not found');
    }
  } catch (error) {
    console.error('Error getting work order:', error);
    throw error;
  }
};

export const createWorkOrder = async (workOrderData) => {
  try {
    // Generate a user-friendly work order ID
    const workOrderId = await generateWorkOrderId();
    
    // Create the work order with a custom ID in user scope
    const docRef = getUserDoc('workOrders', workOrderId);
    await setDoc(docRef, {
      ...workOrderData,
      id: workOrderId, // Store ID in the document for easier access
      status: 'Requested',
      createdAt: new Date().toISOString()
    });
    
    return workOrderId;
  } catch (error) {
    console.error('Error creating work order:', error);
    throw error;
  }
};

export const updateWorkOrderStatus = async (id, status, additionalData = {}) => {
  try {
    const docRef = getUserDoc('workOrders', id);
    const updateData = { status, ...additionalData };
    await updateDoc(docRef, updateData);
  } catch (error) {
    console.error('Error updating work order status:', error);
    throw error;
  }
};

// ============================================================================
// 📋 ORDER ITEMS OPERATIONS (User-Scoped)
// ============================================================================

export const getOrderItems = async (workOrderId) => {
  try {
    const userOrderItemsCollection = getUserCollection('orderItems');
    const q = query(
      userOrderItemsCollection, 
      where('workOrderId', '==', workOrderId),
      orderBy('issuedAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting order items:', error);
    throw error;
  }
};

export const issuePartToOrder = async (workOrderId, partId, qty) => {
  try {
    const batch = writeBatch(db);
    
    // Add order item to user scope
    const userOrderItemsCollection = getUserCollection('orderItems');
    const orderItemRef = doc(userOrderItemsCollection);
    batch.set(orderItemRef, {
      workOrderId,
      partId,
      qty,
      issuedAt: new Date().toISOString()
    });
    
    // Update part stock in user scope
    const partRef = getUserDoc('parts', partId);
    const partDoc = await getDoc(partRef);
    if (partDoc.exists()) {
      const currentStock = partDoc.data().currentStock || 0;
      const newStock = Math.max(0, currentStock - qty);
      batch.update(partRef, {
        currentStock: newStock
      });
    }
    
    await batch.commit();
    return orderItemRef.id;
  } catch (error) {
    console.error('Error issuing part to order:', error);
    throw error;
  }
};

export const draftInvoiceForJob = async (workOrderId, laborCharges = []) => {
  try {
    // Get work order details from user scope
    const workOrder = await getWorkOrderById(workOrderId);
    if (!workOrder) {
      throw new Error('Work order not found');
    }

    // Get customer details from user scope
    const customerDoc = await getDoc(getUserDoc('customers', workOrder.customerId));
    if (!customerDoc.exists()) {
      throw new Error('Customer not found');
    }
    const customer = customerDoc.data();

    // Get order items from user scope
    const orderItems = await getOrderItems(workOrderId);
    
    // Create invoice items from order items (parts)
    const invoiceItems = [];
    for (const item of orderItems) {
      const partDoc = await getDoc(getUserDoc('parts', item.partId));
      if (partDoc.exists()) {
        const part = partDoc.data();
        invoiceItems.push({
          type: 'part',
          partId: item.partId,
          partName: part.name, // Include part name for invoice display
          qty: item.qty,
          price: part.unitPrice
        });
      }
    }

    // Add labor charges if provided
    if (laborCharges && laborCharges.length > 0) {
      laborCharges.forEach(labor => {
        invoiceItems.push({
          type: 'labor',
          laborId: labor.id || `labor_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          partName: labor.description, // Use partName field for consistency with existing UI
          qty: labor.hours || 1,
          price: labor.rate || 0
        });
      });
    }

    // Create invoice data
    const invoiceData = {
      customerName: customer.name,
      workOrderId: workOrderId,
      items: invoiceItems,
      date: new Date().toISOString(),
      source: 'work-order', // Mark as work-order generated
      notes: `Auto-drafted from Work Order: ${workOrder.description}`,
      hasLaborCharges: laborCharges && laborCharges.length > 0
    };

    // Create invoice in user scope
    const userInvoicesCollection = getUserCollection('invoices');
    const invoiceRef = await addDoc(userInvoicesCollection, invoiceData);
    return invoiceRef.id;
  } catch (error) {
    console.error('Error drafting invoice for job:', error);
    throw error;
  }
};

// Work Dashboard data
export const getWorkDashboardData = async () => {
  try {
    const workOrders = await getWorkOrders();
    const today = new Date();
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const openJobs = workOrders.filter(wo => wo.status === 'Requested').length;
    const inProgressJobs = workOrders.filter(wo => wo.status === 'In Progress').length;
    const completedThisWeek = workOrders.filter(wo => 
      wo.status === 'Completed' && 
      new Date(wo.createdAt) >= weekAgo
    ).length;
    
    return {
      openJobs,
      inProgressJobs,
      completedThisWeek,
      recentWorkOrders: workOrders.slice(0, 5)
    };
  } catch (error) {
    console.error('Error getting work dashboard data:', error);
    throw error;
  }
};

// ============================================================================
// 📈 REVENUE REPORTING & FILTERING (User-Scoped)
// ============================================================================

export const getInvoicesByDateRange = async (startDate, endDate) => {
  try {
    const userInvoicesCollection = getUserCollection('invoices');
    const q = query(
      userInvoicesCollection,
      where('date', '>=', startDate),
      where('date', '<=', endDate),
      orderBy('date', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting invoices by date range:', error);
    throw error;
  }
};

export const getRevenueReport = async (startDate, endDate) => {
  try {
    const invoices = await getInvoicesByDateRange(startDate, endDate);
    
    let totalRevenue = 0;
    let totalInvoices = invoices.length;
    let workOrderInvoices = 0;
    let legacyInvoices = 0;
    
    const dailyRevenue = {};
    const customerRevenue = {};
    
    invoices.forEach(invoice => {
      const invoiceTotal = invoice.items?.reduce((total, item) => {
        return total + (item.qty * item.price);
      }, 0) || 0;
      
      totalRevenue += invoiceTotal;
      
      // Track source type
      if (invoice.workOrderId) {
        workOrderInvoices++;
      } else {
        legacyInvoices++;
      }
      
      // Daily breakdown
      const dateKey = new Date(invoice.date).toISOString().split('T')[0];
      if (!dailyRevenue[dateKey]) {
        dailyRevenue[dateKey] = 0;
      }
      dailyRevenue[dateKey] += invoiceTotal;
      
      // Customer breakdown
      const customerName = invoice.customerName || 'Unknown';
      if (!customerRevenue[customerName]) {
        customerRevenue[customerName] = 0;
      }
      customerRevenue[customerName] += invoiceTotal;
    });
    
    return {
      totalRevenue,
      totalInvoices,
      workOrderInvoices,
      legacyInvoices,
      averageInvoiceValue: totalInvoices > 0 ? totalRevenue / totalInvoices : 0,
      dailyRevenue,
      customerRevenue,
      invoices
    };
  } catch (error) {
    console.error('Error generating revenue report:', error);
    throw error;
  }
};

export const exportRevenueReportCSV = (reportData, startDate, endDate) => {
  try {
    const headers = [
      'Date',
      'Customer',
      'Work Order ID',
      'Invoice Type',
      'Items Count',
      'Total Amount'
    ];
    
    const rows = reportData.invoices.map(invoice => {
      const total = invoice.items?.reduce((sum, item) => sum + (item.qty * item.price), 0) || 0;
      return [
        new Date(invoice.date).toLocaleDateString(),
        invoice.customerName || 'Unknown',
        invoice.workOrderId || 'N/A',
        invoice.workOrderId ? 'Work Order' : 'Legacy',
        invoice.items?.length || 0,
        total.toFixed(2)
      ];
    });
    
    // Add summary row
    rows.push([]);
    rows.push(['SUMMARY', '', '', '', '', '']);
    rows.push(['Total Revenue', '', '', '', '', reportData.totalRevenue.toFixed(2)]);
    rows.push(['Total Invoices', '', '', '', '', reportData.totalInvoices]);
    rows.push(['Work Order Invoices', '', '', '', '', reportData.workOrderInvoices]);
    rows.push(['Legacy Invoices', '', '', '', '', reportData.legacyInvoices]);
    rows.push(['Average Invoice Value', '', '', '', '', reportData.averageInvoiceValue.toFixed(2)]);
    
    const csvContent = [headers, ...rows]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `revenue-report-${startDate}-to-${endDate}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    return true;
  } catch (error) {
    console.error('Error exporting CSV:', error);
    throw error;
  }
};

export const getCustomerWorkOrderHistory = async (customerId) => {
  try {
    const userWorkOrdersCollection = getUserCollection('workOrders');
    const q = query(
      userWorkOrdersCollection,
      where('customerId', '==', customerId),
      orderBy('dateCreated', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    const workOrders = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Get associated invoices for each work order
    const workOrdersWithInvoices = await Promise.all(
      workOrders.map(async (workOrder) => {
        const invoices = await getInvoicesByWorkOrder(workOrder.id);
        return {
          ...workOrder,
          invoices
        };
      })
    );
    
    return workOrdersWithInvoices;
  } catch (error) {
    console.error('Error getting customer work order history:', error);
    throw error;
  }
};

export const getFilteredInvoices = async (filters = {}) => {
  try {
    const userInvoicesCollection = getUserCollection('invoices');
    let constraints = [];
    
    if (filters.startDate) {
      constraints.push(where('date', '>=', filters.startDate));
    }
    
    if (filters.endDate) {
      constraints.push(where('date', '<=', filters.endDate));
    }
    
    if (filters.customer) {
      constraints.push(where('customerName', '==', filters.customer));
    }
    
    // Add ordering
    constraints.push(orderBy('date', 'desc'));
    
    const q = query(userInvoicesCollection, ...constraints);
    const querySnapshot = await getDocs(q);
    
    let invoices = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Apply additional filters that can't be done in Firestore query
    if (filters.source) {
      if (filters.source === 'work-order') {
        invoices = invoices.filter(invoice => invoice.workOrderId);
      } else if (filters.source === 'legacy') {
        invoices = invoices.filter(invoice => !invoice.workOrderId);
      }
    }
    
    if (filters.minAmount) {
      invoices = invoices.filter(invoice => {
        const total = invoice.items?.reduce((sum, item) => sum + (item.qty * item.price), 0) || 0;
        return total >= parseFloat(filters.minAmount);
      });
    }
    
    if (filters.maxAmount) {
      invoices = invoices.filter(invoice => {
        const total = invoice.items?.reduce((sum, item) => sum + (item.qty * item.price), 0) || 0;
        return total <= parseFloat(filters.maxAmount);
      });
    }
    
    return invoices;
  } catch (error) {
    console.error('Error getting filtered invoices:', error);
    throw error;
  }
};

// PHASE 2 ENHANCEMENTS - Smart Job Scheduling (Calendar Integration)

// Schedules operations
// ============================================================================
// 📅 SCHEDULES OPERATIONS (User-Scoped)
// ============================================================================

export const getSchedules = async () => {
  try {
    const userSchedulesCollection = getUserCollection('schedules');
    const q = query(userSchedulesCollection, orderBy('scheduledDate', 'asc'), orderBy('startTime', 'asc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting schedules:', error);
    throw error;
  }
};

export const getSchedulesByDate = async (startDate, endDate) => {
  try {
    const userSchedulesCollection = getUserCollection('schedules');
    const q = query(
      userSchedulesCollection,
      where('scheduledDate', '>=', startDate),
      where('scheduledDate', '<=', endDate),
      orderBy('scheduledDate', 'asc'),
      orderBy('startTime', 'asc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting schedules by date:', error);
    throw error;
  }
};

export const getSchedulesByMechanic = async (mechanicId, startDate, endDate) => {
  try {
    const userSchedulesCollection = getUserCollection('schedules');
    const q = query(
      userSchedulesCollection,
      where('mechanicId', '==', mechanicId),
      where('scheduledDate', '>=', startDate),
      where('scheduledDate', '<=', endDate),
      orderBy('scheduledDate', 'asc'),
      orderBy('startTime', 'asc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting schedules by mechanic:', error);
    throw error;
  }
};

export const createSchedule = async (scheduleData) => {
  try {
    // Validate time slot availability
    const existingSchedules = await getSchedulesByMechanic(
      scheduleData.mechanicId,
      scheduleData.scheduledDate,
      scheduleData.scheduledDate
    );
    
    // Check for time conflicts
    const hasConflict = existingSchedules.some(schedule => {
      if (schedule.status === 'cancelled') return false;
      
      const existingStart = schedule.startTime;
      const existingEnd = schedule.endTime;
      const newStart = scheduleData.startTime;
      const newEnd = scheduleData.endTime;
      
      return (
        (newStart >= existingStart && newStart < existingEnd) ||
        (newEnd > existingStart && newEnd <= existingEnd) ||
        (newStart <= existingStart && newEnd >= existingEnd)
      );
    });
    
    if (hasConflict) {
      throw new Error('Time slot conflict detected. Mechanic is already scheduled during this time.');
    }
    
    // Create schedule in user scope
    const userSchedulesCollection = getUserCollection('schedules');
    const docRef = await addDoc(userSchedulesCollection, {
      ...scheduleData,
      status: 'scheduled',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    return docRef.id;
  } catch (error) {
    console.error('Error creating schedule:', error);
    throw error;
  }
};

export const updateSchedule = async (id, scheduleData) => {
  try {
    // If updating time/date/mechanic, validate conflicts
    if (scheduleData.mechanicId || scheduleData.scheduledDate || scheduleData.startTime || scheduleData.endTime) {
      const currentSchedule = await getScheduleById(id);
      const updatedSchedule = { ...currentSchedule, ...scheduleData };
      
      const existingSchedules = await getSchedulesByMechanic(
        updatedSchedule.mechanicId,
        updatedSchedule.scheduledDate,
        updatedSchedule.scheduledDate
      );
      
      // Filter out current schedule from conflict check
      const otherSchedules = existingSchedules.filter(schedule => schedule.id !== id);
      
      const hasConflict = otherSchedules.some(schedule => {
        if (schedule.status === 'cancelled') return false;
        
        const existingStart = schedule.startTime;
        const existingEnd = schedule.endTime;
        const newStart = updatedSchedule.startTime;
        const newEnd = updatedSchedule.endTime;
        
        return (
          (newStart >= existingStart && newStart < existingEnd) ||
          (newEnd > existingStart && newEnd <= existingEnd) ||
          (newStart <= existingStart && newEnd >= existingEnd)
        );
      });
      
      if (hasConflict) {
        throw new Error('Time slot conflict detected. Mechanic is already scheduled during this time.');
      }
    }
      const docRef = getUserDoc('schedules', id);
    await updateDoc(docRef, {
      ...scheduleData,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error updating schedule:', error);
    throw error;
  }
};

export const getScheduleById = async (id) => {
  try {
    const docRef = getUserDoc('schedules', id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    } else {
      throw new Error('Schedule not found');
    }
  } catch (error) {
    console.error('Error getting schedule:', error);
    throw error;
  }
};

export const deleteSchedule = async (id) => {
  try {
    const docRef = getUserDoc('schedules', id);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Error deleting schedule:', error);
    throw error;
  }
};

export const cancelSchedule = async (id) => {
  try {
    await updateSchedule(id, { status: 'cancelled' });
  } catch (error) {
    console.error('Error cancelling schedule:', error);
    throw error;
  }
};

// Schedule utilities
export const generateTimeSlots = (startHour = 8, endHour = 18, intervalMinutes = 30) => {
  const slots = [];
  for (let hour = startHour; hour < endHour; hour++) {
    for (let minute = 0; minute < 60; minute += intervalMinutes) {
      const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      slots.push(time);
    }
  }
  return slots;
};

export const calculateScheduleDuration = (startTime, endTime) => {
  const [startHour, startMinute] = startTime.split(':').map(Number);
  const [endHour, endMinute] = endTime.split(':').map(Number);
  
  const startMinutes = startHour * 60 + startMinute;
  const endMinutes = endHour * 60 + endMinute;
  
  return endMinutes - startMinutes;
};

export const getAvailableTimeSlots = async (mechanicId, date, duration = 30) => {
  try {
    const timeSlots = generateTimeSlots();
    const existingSchedules = await getSchedulesByMechanic(mechanicId, date, date);
    
    // Filter out occupied slots
    const availableSlots = timeSlots.filter(slot => {
      const [hour, minute] = slot.split(':').map(Number);
      const slotMinutes = hour * 60 + minute;
      const slotEndMinutes = slotMinutes + duration;
      
      // Check if this slot conflicts with any existing schedule
      return !existingSchedules.some(schedule => {
        if (schedule.status === 'cancelled') return false;
        
        const [scheduleStartHour, scheduleStartMinute] = schedule.startTime.split(':').map(Number);
        const [scheduleEndHour, scheduleEndMinute] = schedule.endTime.split(':').map(Number);
        
        const scheduleStartMinutes = scheduleStartHour * 60 + scheduleStartMinute;
        const scheduleEndMinutes = scheduleEndHour * 60 + scheduleEndMinute;
        
        return (
          (slotMinutes >= scheduleStartMinutes && slotMinutes < scheduleEndMinutes) ||
          (slotEndMinutes > scheduleStartMinutes && slotEndMinutes <= scheduleEndMinutes) ||
          (slotMinutes <= scheduleStartMinutes && slotEndMinutes >= scheduleEndMinutes)
        );
      });
    });
    
    return availableSlots;
  } catch (error) {
    console.error('Error getting available time slots:', error);
    throw error;
  }
};

// Schedule analytics
export const getScheduleMetrics = async (startDate, endDate) => {
  try {
    // If no date range provided, use current week
    if (!startDate || !endDate) {
      const today = new Date();
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay()); // Start of week (Sunday)
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6); // End of week (Saturday)
      
      startDate = weekStart.toISOString().split('T')[0];
      endDate = weekEnd.toISOString().split('T')[0];
    }
    
    const schedules = await getSchedulesByDate(startDate, endDate);
    const today = new Date().toISOString().split('T')[0];
    
    const totalScheduled = schedules.filter(s => s.status !== 'cancelled').length;
    const todayScheduled = schedules.filter(s => 
      s.scheduledDate === today && s.status !== 'cancelled'
    ).length;
    
    // Count upcoming scheduled (future dates)
    const upcomingScheduled = schedules.filter(s => 
      s.scheduledDate > today && s.status !== 'cancelled'
    ).length;
    
    return {
      totalScheduled,
      todayScheduled,
      upcomingScheduled
    };
  } catch (error) {
    console.error('Error getting schedule metrics:', error);
    throw error;
  }
};

// Get schedule by work order ID
export const getScheduleByWorkOrderId = async (workOrderId) => {
  try {
    const schedules = await getSchedules();
    return schedules.find(schedule => schedule.workOrderId === workOrderId) || null;
  } catch (error) {
    console.error('Error getting schedule by work order ID:', error);
    throw error;
  }
};

// Get today's schedules for dashboard
export const getTodaySchedules = async () => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const todaySchedules = await getSchedulesByDate(today, today);
    
    // Enrich with customer and mechanic names and work order details
    const [customers, mechanics, workOrders] = await Promise.all([
      getCustomers(),
      getMechanics(),
      getWorkOrders()
    ]);
    
    return todaySchedules.map(schedule => {
      const customer = customers.find(c => {
        const workOrder = workOrders.find(wo => wo.id === schedule.workOrderId);
        return workOrder && c.id === workOrder.customerId;
      });
      
      const mechanic = mechanics.find(m => m.id === schedule.mechanicId);
      const workOrder = workOrders.find(wo => wo.id === schedule.workOrderId);
      
      return {
        ...schedule,
        customerName: customer?.name || 'Unknown Customer',
        mechanicName: mechanic?.name || 'Unknown Mechanic',
        workOrderDescription: workOrder?.description || 'No description'
      };
    });
  } catch (error) {
    console.error('Error getting today\'s schedules:', error);
    throw error;
  }
};

// PHASE 3 ENHANCEMENTS - Essential Financial Tracking

// Expenses operations
export const createExpense = async (expenseData) => {
  try {
    const userExpensesCollection = getUserCollection('expenses');
    const docRef = await addDoc(userExpensesCollection, {
      ...expenseData,
      date: expenseData.date || new Date().toISOString(),
      createdAt: new Date().toISOString()
    });
    return docRef.id;
  } catch (error) {
    console.error('Error creating expense:', error);
    throw error;
  }
};

// ============================================================================
// 💰 EXPENSES OPERATIONS (User-Scoped)
// ============================================================================

export const getExpenses = async () => {
  try {
    const userExpensesCollection = getUserCollection('expenses');
    const q = query(userExpensesCollection, orderBy('date', 'desc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting expenses:', error);
    throw error;
  }
};

export const getExpensesByDateRange = async (startDate, endDate) => {
  try {
    const userExpensesCollection = getUserCollection('expenses');
    const q = query(
      userExpensesCollection,
      where('date', '>=', startDate),
      where('date', '<=', endDate),
      orderBy('date', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting expenses by date range:', error);
    throw error;
  }
};

// Auto-create expense when purchase order is completed
export const createExpenseFromPurchaseOrder = async (purchaseOrderId) => {
  try {
    const poDoc = await getDoc(getUserDoc('purchaseOrders', purchaseOrderId));
    if (!poDoc.exists()) {
      throw new Error('Purchase order not found');
    }
    
    const po = poDoc.data();
    const totalCost = po.items.reduce((total, item) => total + (item.qty * item.cost), 0);
    
    const expenseData = {
      amount: totalCost,
      category: 'parts_purchase',
      description: `Parts purchase from ${po.supplierName}`,
      date: po.date,
      purchaseOrderId: purchaseOrderId
    };
    
    return await createExpense(expenseData);
  } catch (error) {
    console.error('Error creating expense from purchase order:', error);
    throw error;
  }
};

// Invoice payment tracking
export const markInvoiceAsPaid = async (invoiceId, paidAmount, paymentMethod = 'cash') => {
  try {
    const invoiceRef = getUserDoc('invoices', invoiceId);
    await updateDoc(invoiceRef, {
      paymentStatus: 'paid',
      paidAmount: paidAmount,
      paidDate: new Date().toISOString(),
      paymentMethod: paymentMethod
    });
  } catch (error) {
    console.error('Error marking invoice as paid:', error);
    throw error;
  }
};

export const getUnpaidInvoices = async () => {
  try {
    const userInvoicesCollection = getUserCollection('invoices');
    const q = query(
      userInvoicesCollection,
      where('paymentStatus', 'in', ['pending', null]),
      orderBy('date', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      paymentStatus: doc.data().paymentStatus || 'pending'
    }));
  } catch (error) {
    console.error('Error getting unpaid invoices:', error);
    // Fallback for invoices without paymentStatus field
    try {
      const userInvoicesCollection = getUserCollection('invoices');
      const allQuery = query(userInvoicesCollection, orderBy('date', 'desc'));
      const allSnapshot = await getDocs(allQuery);
      return allSnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(invoice => !invoice.paymentStatus || invoice.paymentStatus === 'pending');
    } catch (fallbackError) {
      console.error('Error in fallback unpaid invoices query:', fallbackError);
      throw error;
    }
  }
};

// ============================================================================
// 💼 COMMISSION TRACKING (User-Scoped)
// ============================================================================

export const addCommissionToWorkOrder = async (workOrderId, mechanicId, rate, amount) => {
  try {
    // Input validation
    if (!workOrderId) throw new Error('Work order ID is required');
    if (!mechanicId) throw new Error('Mechanic ID is required');
    if (isNaN(amount) || amount <= 0) throw new Error('Commission amount must be greater than zero');
    
    const workOrderRef = getUserDoc('workOrders', workOrderId);
    const workOrderDoc = await getDoc(workOrderRef);
    
    if (!workOrderDoc.exists()) {
      throw new Error(`Work order ${workOrderId} not found`);
    }
    
    const workOrderData = workOrderDoc.data();
    
    // Validate work order is completed
    if (workOrderData.status !== 'Completed') {
      throw new Error('Commission can only be added to completed work orders');
    }
    
    // Check if commission already exists
    if (workOrderData.commission) {
      // If commission exists, confirm it's for the same mechanic
      if (workOrderData.commission.mechanicId !== mechanicId) {
        throw new Error('A commission for a different mechanic already exists on this work order');
      }
      
      // Update existing commission instead of creating new one
      await updateDoc(workOrderRef, {
        commission: {
          ...workOrderData.commission,
          rate: rate,
          amount: amount,
          updatedAt: new Date().toISOString()
        }
      });
      
      return { updated: true, message: 'Commission updated successfully' };
    }
    
    // Create new commission
    await updateDoc(workOrderRef, {
      commission: {
        mechanicId: mechanicId,
        rate: rate,
        amount: amount,
        paid: false,
        createdAt: new Date().toISOString()
      }
    });
    
    return { updated: false, message: 'Commission added successfully' };
  } catch (error) {
    console.error('Error adding commission to work order:', error);
    throw error;
  }
};

export const markCommissionAsPaid = async (workOrderId, amount) => {
  try {
    const workOrderRef = getUserDoc('workOrders', workOrderId);
    const workOrderDoc = await getDoc(workOrderRef);
    
    if (workOrderDoc.exists()) {
      const currentCommission = workOrderDoc.data().commission || {};
      await updateDoc(workOrderRef, {
        commission: {
          ...currentCommission,
          paid: true,
          paidDate: new Date().toISOString(),
          paidAmount: amount
        }
      });
    }
  } catch (error) {
    console.error('Error marking commission as paid:', error);
    throw error;
  }
};

export const updateCommissionStatus = async (workOrderId, isPaid, paymentMethod = 'Cash', notes = '') => {
  try {
    // Input validation
    if (!workOrderId) throw new Error('Work order ID is required');
    
    const workOrderRef = getUserDoc('workOrders', workOrderId);
    const workOrderDoc = await getDoc(workOrderRef);
    
    if (!workOrderDoc.exists()) {
      throw new Error(`Work order ${workOrderId} not found`);
    }
    
    const workOrderData = workOrderDoc.data();
    
    // Check if commission exists
    if (!workOrderData.commission) {
      throw new Error('No commission found for this work order');
    }
    
    const currentCommission = workOrderData.commission;
    const paymentDate = new Date();
    
    // Prepare commission update object
    const commissionUpdate = {
      ...currentCommission,
      paid: isPaid,
      // Payment info only added when marking as paid
      ...(isPaid ? {
        paidDate: paymentDate.toISOString(),
        paymentMethod: paymentMethod,
        paymentNotes: notes || '',
        paymentReference: `COM-${paymentDate.getFullYear()}${String(paymentDate.getMonth() + 1).padStart(2, '0')}${String(paymentDate.getDate()).padStart(2, '0')}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`
      } : {
        paidDate: null,
        paymentMethod: null,
        paymentNotes: null,
        paymentReference: null
      })
    };
    
    // Update the work order with the new commission status
    await updateDoc(workOrderRef, {
      commission: commissionUpdate
    });
    
    // Return detailed status information
    return {
      success: true,
      workOrderId: workOrderId,
      mechanicId: currentCommission.mechanicId,
      amount: currentCommission.amount,
      isPaid: isPaid,
      paymentDate: isPaid ? paymentDate.toISOString() : null,
      paymentReference: isPaid ? commissionUpdate.paymentReference : null
    };
  } catch (error) {
    console.error('Error updating commission status:', error);
    throw error;
  }
};

export const getUnpaidCommissions = async (options = {}) => {
  try {
    const { mechanicId = null, fromDate = null, toDate = null, limit = null } = options;
    
    const userWorkOrdersCollection = getUserCollection('workOrders');
    
    // Build query with filters
    const queryFilters = [
      where('status', '==', 'Completed')
    ];
    
    // Add mechanic filter if specified
    if (mechanicId) {
      queryFilters.push(where('mechanicId', '==', mechanicId));
    }
    
    // Apply date range filters if specified
    // Note: Firebase doesn't support multiple range filters on different fields
    // So we'll filter by date range in JS after getting the results
    
    // Apply the filters and order
    let q = query(
      userWorkOrdersCollection,
      ...queryFilters,
      orderBy('createdAt', 'desc')
    );
    
    // Apply limit if specified
    if (limit && Number.isInteger(limit) && limit > 0) {
      q = query(q, limit(limit));
    }
    
    const querySnapshot = await getDocs(q);
    const workOrders = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Get mechanics for name lookup
    const mechanics = await getMechanics();
    
    // Get customers for name lookup
    const customers = await getCustomers();
    
    // Filter work orders with unpaid commissions
    let filteredWorkOrders = workOrders.filter(wo => wo.commission && !wo.commission.paid);
    
    // Apply date filtering if needed
    if (fromDate) {
      const fromDateObj = new Date(fromDate);
      filteredWorkOrders = filteredWorkOrders.filter(wo => 
        new Date(wo.createdAt) >= fromDateObj
      );
    }
    
    if (toDate) {
      const toDateObj = new Date(toDate);
      // Set to end of day
      toDateObj.setHours(23, 59, 59, 999);
      filteredWorkOrders = filteredWorkOrders.filter(wo => 
        new Date(wo.createdAt) <= toDateObj
      );
    }
    
    // Map the filtered work orders to commission data
    const unpaidCommissions = filteredWorkOrders.map(wo => {
      const mechanic = mechanics.find(m => m.id === wo.commission.mechanicId);
      const customer = customers.find(c => c.id === wo.customerId);
      
      // Calculate days outstanding
      const completedDate = new Date(wo.completedAt || wo.createdAt); // Fall back to createdAt if completedAt is missing
      const daysOutstanding = Math.floor((new Date() - completedDate) / (1000 * 60 * 60 * 24));
      
      return {
        workOrderId: wo.id,
        workOrderNumber: wo.id.startsWith('WO-') ? wo.id : `WO-${wo.id}`, // Ensure consistent format
        customerId: wo.customerId,
        customerName: customer?.name || 'Unknown Customer',
        mechanicId: wo.commission.mechanicId,
        mechanicName: mechanic?.name || 'Unknown Mechanic',
        mechanicContact: mechanic?.contact || null,
        amount: wo.commission.amount,
        rate: wo.commission.rate,
        completedDate: wo.completedAt || wo.createdAt,
        createdAt: wo.createdAt,
        jobDescription: wo.description || '',
        vehicleInfo: wo.vehicleInfo || '',
        daysOutstanding: daysOutstanding,
        priority: daysOutstanding > 30 ? 'high' : daysOutstanding > 15 ? 'medium' : 'normal'
      };
    });
    
    // Sort by priority and then by days outstanding
    unpaidCommissions.sort((a, b) => {
      if (a.priority === 'high' && b.priority !== 'high') return -1;
      if (a.priority !== 'high' && b.priority === 'high') return 1;
      if (a.priority === 'medium' && b.priority === 'normal') return -1;
      if (a.priority === 'normal' && b.priority === 'medium') return 1;
      return b.daysOutstanding - a.daysOutstanding; // Most outstanding first
    });
    
    return unpaidCommissions;
  } catch (error) {
    console.error('Error getting unpaid commissions:', error);
    throw error;
  }
};

// Financial overview for dashboard
export const getFinancialOverview = async () => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();
    
    // Get monthly revenue from invoices
    const monthlyInvoices = await getInvoicesByDateRange(startOfMonth, endOfMonth);
    const monthlyRevenue = monthlyInvoices.reduce((total, invoice) => {
      return total + (invoice.items?.reduce((sum, item) => sum + (item.qty * item.price), 0) || 0);
    }, 0);
    
    // Get monthly expenses
    const monthlyExpenses = await getExpensesByDateRange(startOfMonth, endOfMonth);
    const totalExpenses = monthlyExpenses.reduce((total, expense) => total + expense.amount, 0);
    
    // Get unpaid invoices total
    const unpaidInvoices = await getUnpaidInvoices();
    const unpaidTotal = unpaidInvoices.reduce((total, invoice) => {
      return total + (invoice.items?.reduce((sum, item) => sum + (item.qty * item.price), 0) || 0);
    }, 0);
    
    // Get unpaid commissions total
    const unpaidCommissions = await getUnpaidCommissions();
    const unpaidCommissionsTotal = unpaidCommissions.reduce((total, commission) => total + commission.amount, 0);
    
    // Create recent activity feed
    const recentActivity = [];
    
    // Add recent invoices
    monthlyInvoices.slice(0, 3).forEach(invoice => {
      const amount = invoice.items?.reduce((sum, item) => sum + (item.qty * item.price), 0) || 0;
      recentActivity.push({
        type: 'income',
        icon: '💰',
        description: `Invoice - ${invoice.customerName}`,
        amount: amount,
        date: invoice.date
      });
    });
    
    // Add recent expenses
    monthlyExpenses.slice(0, 2).forEach(expense => {
      recentActivity.push({
        type: 'expense',
        icon: '💸',
        description: `${expense.category.replace('_', ' ')} - ${expense.description}`,
        amount: expense.amount,
        date: expense.date
      });
    });
    
    // Sort by date and take top 5
    recentActivity.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    return {
      monthlyRevenue,
      monthlyExpenses: totalExpenses,
      profit: monthlyRevenue - totalExpenses,
      unpaidInvoices: unpaidTotal,
      unpaidCommissions: unpaidCommissionsTotal,
      recentActivity: recentActivity.slice(0, 5)
    };
  } catch (error) {
    console.error('Error getting financial overview:', error);
    throw error;
  }
};

// Labor charge management for invoices
export const addLaborChargeToInvoice = async (invoiceId, laborCharge) => {
  try {
    const invoiceRef = getUserDoc('invoices', invoiceId);
    const invoiceDoc = await getDoc(invoiceRef);
    
    if (!invoiceDoc.exists()) {
      throw new Error('Invoice not found');
    }
    
    const currentInvoice = invoiceDoc.data();
    const currentItems = currentInvoice.items || [];
    
    // Create new labor item
    const newLaborItem = {
      type: 'labor',
      laborId: laborCharge.id || `labor_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      partName: laborCharge.description, // Use partName for consistency
      qty: laborCharge.hours || 1,
      price: laborCharge.rate || 0
    };
    
    // Add to items array
    const updatedItems = [...currentItems, newLaborItem];
    
    await updateDoc(invoiceRef, {
      items: updatedItems,
      hasLaborCharges: true,
      lastModified: new Date().toISOString()
    });
    
    return invoiceId;
  } catch (error) {
    console.error('Error adding labor charge to invoice:', error);
    throw error;
  }
};

export const updateLaborChargeInInvoice = async (invoiceId, laborId, updatedLaborCharge) => {
  try {
    const invoiceRef = getUserDoc('invoices', invoiceId);
    const invoiceDoc = await getDoc(invoiceRef);
    
    if (!invoiceDoc.exists()) {
      throw new Error('Invoice not found');
    }
    
    const currentInvoice = invoiceDoc.data();
    const currentItems = currentInvoice.items || [];
    
    // Find and update the labor item
    const updatedItems = currentItems.map(item => {
      if (item.type === 'labor' && item.laborId === laborId) {
        return {
          ...item,
          partName: updatedLaborCharge.description,
          qty: updatedLaborCharge.hours || item.qty,
          price: updatedLaborCharge.rate || item.price
        };
      }
      return item;
    });
    
    await updateDoc(invoiceRef, {
      items: updatedItems,
      lastModified: new Date().toISOString()
    });
    
    return invoiceId;
  } catch (error) {
    console.error('Error updating labor charge in invoice:', error);
    throw error;
  }
};

export const removeLaborChargeFromInvoice = async (invoiceId, laborId) => {
  try {
    const invoiceRef = getUserDoc('invoices', invoiceId);
    const invoiceDoc = await getDoc(invoiceRef);
    
    if (!invoiceDoc.exists()) {
      throw new Error('Invoice not found');
    }
    
    const currentInvoice = invoiceDoc.data();
    const currentItems = currentInvoice.items || [];
    
    // Remove the labor item
    const updatedItems = currentItems.filter(item => 
      !(item.type === 'labor' && item.laborId === laborId)
    );
    
    // Check if there are still labor charges
    const hasLaborCharges = updatedItems.some(item => item.type === 'labor');
    
    await updateDoc(invoiceRef, {
      items: updatedItems,
      hasLaborCharges: hasLaborCharges,
      lastModified: new Date().toISOString()
    });
    
    return invoiceId;
  } catch (error) {
    console.error('Error removing labor charge from invoice:', error);
    throw error;
  }
};

// PHASE 3 ENHANCEMENT - Improved Work Order IDs

/**
 * Generates a user-friendly work order ID with format: WO-YYMMDD-XXXX
 * Where:
 * - WO: Prefix for Work Order
 * - YYMMDD: Current date in YYMMDD format
 * - XXXX: Sequential number based on count of work orders for the day + random suffix
 */
export const generateWorkOrderId = async () => {
  try {
    // Get today's date in YYMMDD format
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const datePrefix = `${year}${month}${day}`;
      // Find how many work orders exist for today to generate sequential number
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString();
    
    const userWorkOrdersCollection = getUserCollection('workOrders');
    const q = query(
      userWorkOrdersCollection,
      where('createdAt', '>=', startOfDay),
      where('createdAt', '<=', endOfDay)
    );
    
    const querySnapshot = await getDocs(q);
    const todayOrdersCount = querySnapshot.size;
    
    // Generate sequential number (1-based) with padding
    const sequentialNum = (todayOrdersCount + 1).toString().padStart(3, '0');
    
    // Add a single random character to ensure uniqueness in case of simultaneous creation
    const randomChar = Math.random().toString(36).substring(2, 3).toUpperCase();
    
    // Combine to create the work order ID
    return `WO-${datePrefix}-${sequentialNum}${randomChar}`;
  } catch (error) {
    console.error('Error generating work order ID:', error);
    // Fallback to a guaranteed unique ID in case of errors
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `WO-${timestamp}-${randomSuffix}`;
  }
};
