import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  getWorkOrderById, 
  getCustomers, 
  getMechanics, 
  getParts,
  getOrderItems,
  updateWorkOrderStatus,
  issuePartToOrder,
  draftInvoiceForJob,
  getInvoicesByWorkOrder,
  getScheduleByWorkOrderId,
  deleteSchedule,
  addCommissionToWorkOrder,
  updateCommissionStatus
} from '../services/dataService';
import { db } from '../config/firebaseConfig';
import InvoiceDisplay from '../components/InvoiceDisplay';
import { toast } from 'react-toastify';

function WorkOrderDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();  const [workOrder, setWorkOrder] = useState(null);
  const [customer, setCustomer] = useState(null);
  const [mechanic, setMechanic] = useState(null);
  const [parts, setParts] = useState([]);
  const [orderItems, setOrderItems] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [schedule, setSchedule] = useState(null);
  const [loading, setLoading] = useState(true);  const [showPartForm, setShowPartForm] = useState(false);
  const [selectedPart, setSelectedPart] = useState('');
  const [partQty, setPartQty] = useState(1);
  const [showCommissionForm, setShowCommissionForm] = useState(false);
  const [commissionAmount, setCommissionAmount] = useState('');
  const [commissionNotes, setCommissionNotes] = useState('');
    // Labor charge management state
  const [showLaborForm, setShowLaborForm] = useState(false);
  const [laborCharges, setLaborCharges] = useState([]);
  const [laborDescription, setLaborDescription] = useState('');
  const [laborHours, setLaborHours] = useState(1);
  const [laborRate, setLaborRate] = useState(50); // Default rate in RM
  
  // Page-level tab management
  const [activeTab, setActiveTab] = useState('details');
  // Possible values: 'details', 'parts-labor', 'invoices'
  // Note: Commission is now outside the tab system
  
  const loadWorkOrderDetails = useCallback(async () => {
    try {
      console.log('Loading work order details for ID:', id);
      // Load work order
      const workOrderData = await getWorkOrderById(id);
      setWorkOrder(workOrderData);

      // Load existing labor charges from work order document
      if (workOrderData.laborCharges && Array.isArray(workOrderData.laborCharges)) {
        setLaborCharges(workOrderData.laborCharges);
      }

      // Load related data
      const [customersData, mechanicsData, partsData, orderItemsData, invoicesData, scheduleData] = await Promise.all([
        getCustomers(),
        getMechanics(),
        getParts(),
        getOrderItems(id),
        getInvoicesByWorkOrder(id),
        getScheduleByWorkOrderId(id)
      ]);

      const customerData = customersData.find(c => c.id === workOrderData.customerId);
      const mechanicData = mechanicsData.find(m => m.id === workOrderData.mechanicId);

      setCustomer(customerData);
      setMechanic(mechanicData);
      setParts(partsData);
      setOrderItems(orderItemsData);
      setInvoices(invoicesData);
      setSchedule(scheduleData);
    } catch (error) {
      console.error('Error loading work order details:', error);
      toast.error('Failed to load work order details');
      navigate('/work-orders');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);
  useEffect(() => {
    if (id) {
      loadWorkOrderDetails();
  }
  }, [id, loadWorkOrderDetails]);

  // Cleanup JSX artifacts useEffect
  useEffect(() => {
    // Clean up stray JSX artifacts after render
    const cleanupArtifacts = () => {
      const pageElement = document.querySelector('.page');
      if (!pageElement) return;
      
      const walker = document.createTreeWalker(
        pageElement,
        NodeFilter.SHOW_TEXT,
        {
          acceptNode: (node) => {
            // Target text nodes that only contain ")}" or similar artifacts
            return /^[\s]*\)\}[\s]*$/.test(node.textContent) 
              ? NodeFilter.FILTER_ACCEPT 
              : NodeFilter.FILTER_REJECT;
          }
        }
      );
      
      const artifactNodes = [];
      let node;
      while (node = walker.nextNode()) {
        artifactNodes.push(node);
      }
      
      // Remove the artifact nodes
      artifactNodes.forEach(node => {
        if (node.parentNode) {
          node.parentNode.removeChild(node);
        }
      });
    };
    
    // Run cleanup after a brief delay to ensure DOM is fully rendered
    const timer = setTimeout(cleanupArtifacts, 100);
    return () => clearTimeout(timer);
  }, [workOrder]); // Re-run when workOrder changes
    const handleStatusChange = async (newStatus) => {
    try {
      // Validate the status transition
      const validTransitions = {
        'Requested': ['In Progress', 'Cancelled'],
        'In Progress': ['Completed', 'On Hold'],
        'On Hold': ['In Progress', 'Cancelled'],
        'Completed': ['Reopened'],
        'Reopened': ['In Progress', 'Completed'],
        'Cancelled': ['Reopened']
      };
      
      const currentStatus = workOrder.status;
      const allowedTransitions = validTransitions[currentStatus] || [];
      
      if (!allowedTransitions.includes(newStatus)) {
        toast.error(`Invalid status transition: ${currentStatus} → ${newStatus}`);
        return;
      }
      
      // Check for requirements based on the target status
      if (newStatus === 'Completed') {
        if (!workOrder.mechanicId) {
          toast.error('Cannot complete: No mechanic assigned to this work order');
          return;
        }
        
        // Use the standard update function but also add a completion timestamp
        await updateWorkOrderStatus(id, newStatus, { 
          completedAt: new Date().toISOString() 
        });
      } else {
        // Standard update for other statuses
        await updateWorkOrderStatus(id, newStatus);
      }
      
      // Update local state with new status
      setWorkOrder({ 
        ...workOrder, 
        status: newStatus,
        ...(newStatus === 'Completed' ? { completedAt: new Date().toISOString() } : {})
      });
      
      // Show different message styles based on status
      const statusMessages = {
        'Completed': 'Work order completed successfully! 🎉',
        'In Progress': 'Work order is now in progress.',
        'On Hold': 'Work order placed on hold.',
        'Cancelled': 'Work order has been cancelled.',
        'Reopened': 'Work order has been reopened.'
      };
      
      toast.success(statusMessages[newStatus] || `Status updated to ${newStatus}`);

      // Special handling for Completed status
      if (newStatus === 'Completed') {
        // Create a completion workflow with sequential prompts
        showCompletionWorkflow();
      }
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status: ' + (error.message || 'Unknown error'));
    }
  };
  
  const showCompletionWorkflow = () => {
    // Step 1: Invoice creation
    if (orderItems.length > 0 || laborCharges.length > 0) {
      setTimeout(() => {
        const shouldCreateInvoice = window.confirm('Would you like to create an invoice for this completed job?');
        if (shouldCreateInvoice) {
          handleDraftInvoice();
        }
        
        // Step 2: Commission prompt (always show, even if invoice was declined)
        setTimeout(() => {
          const shouldAddCommission = window.confirm(`Would you like to add a commission for ${mechanic?.name || 'the mechanic'} who completed this work order?`);
          if (shouldAddCommission) {
            setShowCommissionForm(true);
          }
        }, 1000);
      }, 500);
    } else {
      // If no items to invoice, jump straight to commission prompt
      setTimeout(() => {
        const shouldAddCommission = window.confirm(`Would you like to add a commission for ${mechanic?.name || 'the mechanic'} who completed this work order?`);
        if (shouldAddCommission) {
          setShowCommissionForm(true);
        }
      }, 500);
    }
  };

  const handleIssuePart = async (e) => {
    e.preventDefault();
    
    if (!selectedPart || partQty < 1) {
      toast.error('Please select a part and valid quantity');
      return;
    }

    const part = parts.find(p => p.id === selectedPart);
    if (part.currentStock < partQty) {
      toast.error(`Insufficient stock. Available: ${part.currentStock}`);
      return;
    }

    try {
      await issuePartToOrder(id, selectedPart, partQty);
      toast.success('Part issued successfully');
      setSelectedPart('');
      setPartQty(1);
      setShowPartForm(false);
      loadWorkOrderDetails(); // Reload to show updated data
    } catch (error) {
      console.error('Error issuing part:', error);
      toast.error('Failed to issue part');
    }
  };  const handleDraftInvoice = async () => {
    try {
      await draftInvoiceForJob(id, laborCharges);
      toast.success('Invoice drafted successfully!');
      // Reload invoices to show the new one
      const updatedInvoices = await getInvoicesByWorkOrder(id);
      setInvoices(updatedInvoices);
      // Clear labor charges after successful invoice creation
      setLaborCharges([]);
    } catch (error) {
      console.error('Error drafting invoice:', error);
      toast.error('Failed to draft invoice');
    }
  };

  const handleAddCommission = async (e) => {
    e.preventDefault();
    
    // Enhanced input validation
    if (!commissionAmount || commissionAmount <= 0) {
      toast.error('Please enter a valid commission amount');
      return;
    }
    
    if (!workOrder.mechanicId) {
      toast.error('No mechanic assigned to this work order');
      return;
    }
    
    if (workOrder.status !== 'Completed') {
      toast.error('Commission can only be added to completed work orders');
      return;
    }
    
    try {
      const result = await addCommissionToWorkOrder(
        id, 
        workOrder.mechanicId, 
        0, // rate - 0 indicates flat amount commission
        parseFloat(commissionAmount)
      );
      
      // Handle update vs new commission
      if (result.updated) {
        toast.success('Commission updated successfully!');
      } else {
        toast.success('Commission added successfully!');
      }
      
      // Create a note with the commission details if notes provided
      if (commissionNotes) {
        try {
          // Log commission note (since addWorkOrderNote doesn't exist yet)
          console.log(`Commission ${result.updated ? 'updated' : 'added'}: RM${parseFloat(commissionAmount).toFixed(2)} - ${commissionNotes}`);
        } catch (noteError) {
          console.error('Error adding commission note:', noteError);
          // Don't fail the whole operation if just the note fails
        }
      }
      
      // Reset form and refresh data
      setCommissionAmount('');
      setCommissionNotes('');
      setShowCommissionForm(false);
      loadWorkOrderDetails(); // Reload to show updated data
    } catch (error) {
      console.error('Error adding commission:', error);
      
      // More detailed error messages
      if (error.message) {
        toast.error(`Commission error: ${error.message}`);
      } else {
        toast.error('Failed to add commission. Please try again.');
      }
    }
  };
  const handleAddLabor = async () => {
    if (!laborDescription.trim()) {
      toast.error('Please enter a labor description');
      return;
    }
    
    if (laborHours <= 0) {
      toast.error('Please enter valid hours');
      return;
    }
    
    if (laborRate <= 0) {
      toast.error('Please enter a valid rate');
      return;
    }
    
    const newLaborCharge = {
      id: `labor_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      description: laborDescription,
      hours: parseFloat(laborHours),
      rate: parseFloat(laborRate),
      addedAt: new Date().toISOString()
    };
    
    const updatedLaborCharges = [...laborCharges, newLaborCharge];
    
    try {
      // Save to Firestore using the dataService function for user-scoped access
      await updateWorkOrderStatus(id, workOrder.status, {
        laborCharges: updatedLaborCharges,
        updatedAt: new Date().toISOString()
      });
      
      // Update local state
      setLaborCharges(updatedLaborCharges);
      setLaborDescription('');
      setLaborHours(1);
      setLaborRate(50);
      setShowLaborForm(false);
      toast.success('Labor charge added and saved');
    } catch (error) {
      console.error('Error saving labor charge:', error);
      toast.error('Failed to save labor charge');
    }
  };
  const handleRemoveLabor = async (laborId) => {
    const updatedLaborCharges = laborCharges.filter(labor => labor.id !== laborId);
    
    try {
      // Use the user-scoped update function instead of direct Firestore update
      await updateWorkOrderStatus(id, workOrder.status, {
        laborCharges: updatedLaborCharges,
        updatedAt: new Date().toISOString()
      });
      
      // Update local state
      setLaborCharges(updatedLaborCharges);
      toast.success('Labor charge removed');
    } catch (error) {
      console.error('Error removing labor charge:', error);
      toast.error('Failed to remove labor charge');
    }
  };

  const getPartName = (partId) => {
    const part = parts.find(p => p.id === partId);
    return part ? part.name : 'Unknown Part';
  };

  const getPartPrice = (partId) => {
    const part = parts.find(p => p.id === partId);
    return part ? part.unitPrice : 0;
  };
  const calculateTotalCost = () => {
    return orderItems.reduce((total, item) => {
      const partPrice = getPartPrice(item.partId);
      return total + (partPrice * item.qty);
    }, 0);
  };

  const handleDeleteSchedule = async (scheduleId) => {
    if (!window.confirm('Are you sure you want to remove the schedule for this work order?')) {
      return;
    }

    try {
      await deleteSchedule(scheduleId);
      setSchedule(null);
      toast.success('Schedule removed successfully');
    } catch (error) {
      console.error('Error deleting schedule:', error);
      toast.error('Failed to remove schedule');
    }
  };

  if (loading) {
    return <div className="loading">Loading work order details...</div>;
  }

  if (!workOrder) {
    return (
      <div className="page">
        <div className="card">
          <div style={{ padding: '2rem', textAlign: 'center' }}>
            <h3>Work Order Not Found</h3>
            <Link to="/work-orders" className="btn btn-primary">
              Back to Work Orders
            </Link>
          </div>
        </div>
      </div>
    );
  }  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">
          {workOrder.id.startsWith('WO-') ? workOrder.id : `Work Order #${workOrder.id}`}
        </h1>
        <span 
          className={`badge ${
            workOrder.status === 'Requested' ? 'bg-green text-green' : 
            workOrder.status === 'In Progress' ? 'badge-warning' : 
            workOrder.status === 'Completed' ? 'bg-green text-green' : 'bg-gray text-gray'
          }`}
        >
          {workOrder.status}
        </span>      </div>

      {/* Page-Level Tab Navigation */}
      <div className="tab-navigation">
        <div className="tab-list">
          <button
            className={`tab-button ${activeTab === 'details' ? 'active' : ''}`}
            onClick={() => setActiveTab('details')}
          >
            Work Order Details
          </button>
          <button
            className={`tab-button ${activeTab === 'parts-labor' ? 'active' : ''}`}
            onClick={() => setActiveTab('parts-labor')}
          >
            Parts & Labor
          </button>
          <button
            className={`tab-button ${activeTab === 'invoices' ? 'active' : ''}`}
            onClick={() => setActiveTab('invoices')}
          >
            Invoices
          </button>
        </div>
      </div>

      {/* Tab Content Area */}
      <div className="tab-content">
        {/* Work Order Details Tab */}
        {activeTab === 'details' && (
          <div className="space-y-6">

            {/* Work Order Summary */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Work Order Summary</h3>
          <div className="btn-group">
            <Link to="/work-orders" className="btn btn-secondary">
              Back to List
            </Link>
            {workOrder.status === 'Completed' && orderItems.length > 0 && (
              <button 
                className="btn btn-primary"
                onClick={handleDraftInvoice}
              >
                Create Invoice
              </button>
            )}
          </div>
        </div>
        <div className="card-content">
          {/* Transaction Summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="stat-card">
              <div className="stat-value">{orderItems.length}</div>
              <div className="stat-label">Parts Issued</div>
              <div className="stat-sub">RM{calculateTotalCost().toFixed(2)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{laborCharges.length}</div>
              <div className="stat-label">Labor Charges</div>
              <div className="stat-sub">RM{laborCharges.reduce((total, labor) => total + (labor.hours * labor.rate), 0).toFixed(2)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{invoices.length}</div>
              <div className="stat-label">Invoices</div>
              <div className="stat-sub">{workOrder.status === 'Completed' ? 'Ready' : 'Pending'}</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">RM{(calculateTotalCost() + laborCharges.reduce((total, labor) => total + (labor.hours * labor.rate), 0)).toFixed(2)}</div>
              <div className="stat-label">Total Value</div>
              <div className="stat-sub">{workOrder.commission ? 'Commission Added' : 'No Commission'}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Work Order Details */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Work Order Details</h3>
        </div>
        <div className="card-content">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <h4 className="card-subtitle">Customer Information</h4>
              <p><span className="font-semibold">Name:</span> {customer?.name || 'Unknown'}</p>
              <p><span className="font-semibold">Phone:</span> {customer?.phone || '-'}</p>
              <p><span className="font-semibold">Vehicle:</span> {customer?.vehicleDetails || '-'}</p>
            </div>
            <div>
              <h4 className="card-subtitle">Assignment Information</h4>
              <p><span className="font-semibold">Mechanic:</span> {mechanic?.name || 'Unassigned'}</p>
              <p><span className="font-semibold">Specialty:</span> {mechanic?.specialty || '-'}</p>
              <p><span className="font-semibold">Created:</span> {new Date(workOrder.createdAt).toLocaleString()}</p>
            </div>
          </div>
          <div>
            <h4 className="card-subtitle">Job Description</h4>
            <div className="description-box">
              {workOrder.description}
            </div>
          </div>
        </div>
      </div>

      {/* Schedule Information */}
      {schedule && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Schedule Information</h3>
            <span 
              className={`badge ${
                schedule.status === 'scheduled' ? 'bg-green text-green' : 
                schedule.status === 'in-progress' ? 'badge-warning' : 
                schedule.status === 'completed' ? 'bg-green text-green' : 'bg-gray text-gray'
              }`}
            >
              {schedule.status.charAt(0).toUpperCase() + schedule.status.slice(1)}
            </span>
          </div>
          <div className="card-content">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="card-subtitle">Appointment Details</h4>
                <p><span className="font-semibold">Date:</span> {new Date(schedule.scheduledDate).toLocaleDateString()}</p>
                <p><span className="font-semibold">Time:</span> {schedule.startTime} - {schedule.endTime}</p>
                <p><span className="font-semibold">Duration:</span> {schedule.duration} minutes</p>
              </div>
              <div>
                <h4 className="card-subtitle">Additional Information</h4>
                <p><span className="font-semibold">Scheduled:</span> {new Date(schedule.createdAt).toLocaleString()}</p>
                {schedule.notes && (
                  <p><span className="font-semibold">Notes:</span> {schedule.notes}</p>
                )}
              </div>
            </div>
            {workOrder.status !== 'Completed' && (
              <div className="btn-group mt-4">
                <Link 
                  to={`/schedule?editSchedule=${schedule.id}`}
                  className="btn btn-secondary"
                >
                  Edit Schedule
                </Link>
                <button 
                  className="btn btn-danger"
                  onClick={() => handleDeleteSchedule(schedule.id)}
                >
                  Remove Schedule
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Schedule Option for Unscheduled Work Orders */}
      {!schedule && workOrder.status !== 'Completed' && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Schedule This Job</h3>
          </div>
          <div className="empty-state">
            <p className="text-gray">
              This work order is not scheduled. You can schedule it for a specific date and time.
            </p>
            <Link 
              to={`/schedule?scheduleWorkOrder=${workOrder.id}`}
              className="btn btn-primary"
            >
              Schedule Job
            </Link>
          </div>
        </div>
      )}

      {/* Status Actions */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Job Status Actions</h3>
        </div>
        <div className="card-content">
          <div className="btn-group">
            {workOrder.status === 'Requested' && (
              <button 
                className="btn btn-primary"
                onClick={() => handleStatusChange('In Progress')}
              >
                Start Job
              </button>
            )}
            {workOrder.status === 'In Progress' && (
              <button 
                className="btn btn-primary"
                onClick={() => handleStatusChange('Completed')}
              >
                Complete Job
              </button>
            )}
            {workOrder.status === 'Completed' && (
              <div className="text-green font-semibold">
                ✓ Job Completed
              </div>
            )}
          </div>
        </div>
      </div>

          </div>
        )}

        {/* Parts & Labor Tab */}
        {activeTab === 'parts-labor' && (
          <div className="space-y-8">
            {/* Parts Section */}
            <div className="mb-8">
              <div className="section-header mb-4">
                <h4 className="section-title">Parts Issued</h4>
                {workOrder.status !== 'Completed' && (
                  <button 
                    className="btn btn-primary"
                    onClick={() => setShowPartForm(!showPartForm)}
                  >
                    Issue Parts
                  </button>
                )}
              </div>
              
              {showPartForm && (
                <div className="form-overlay">
                  <form onSubmit={handleIssuePart}>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                      <div className="form-group">
                        <label htmlFor="partSelect">Select Part</label>
                        <select
                          id="partSelect"
                          value={selectedPart}
                          onChange={(e) => setSelectedPart(e.target.value)}
                          required
                        >
                          <option value="">Choose a part...</option>
                          {parts.filter(part => part.currentStock > 0).map(part => (
                            <option key={part.id} value={part.id}>
                              {part.name} - {part.sku} (Stock: {part.currentStock})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="form-group">
                        <label htmlFor="partQty">Quantity</label>
                        <input
                          type="number"
                          id="partQty"
                          value={partQty}
                          onChange={(e) => setPartQty(parseInt(e.target.value) || 1)}
                          min="1"
                          required
                        />
                      </div>
                      <div className="btn-group">
                        <button type="submit" className="btn btn-primary">
                          Issue Part
                        </button>
                        <button 
                          type="button" 
                          className="btn btn-secondary"
                          onClick={() => setShowPartForm(false)}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </form>
                </div>
              )}

              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Part Name</th>
                      <th>SKU</th>
                      <th>Quantity</th>
                      <th>Unit Price</th>
                      <th>Total</th>
                      <th>Issued At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orderItems.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="empty-state">
                          No parts issued yet.
                        </td>
                      </tr>
                    ) : (
                      orderItems.map((item) => (
                        <tr key={item.id}>
                          <td>{getPartName(item.partId)}</td>
                          <td>{parts.find(p => p.id === item.partId)?.sku || '-'}</td>
                          <td>{item.qty}</td>
                          <td>RM{getPartPrice(item.partId).toFixed(2)}</td>
                          <td>RM{(getPartPrice(item.partId) * item.qty).toFixed(2)}</td>
                          <td>{new Date(item.issuedAt).toLocaleString()}</td>
                        </tr>
                      ))
                    )}
                    {orderItems.length > 0 && (
                      <tr className="table-total">
                        <td colSpan="4" className="text-right font-semibold">Total Cost:</td>
                        <td className="font-semibold">RM{calculateTotalCost().toFixed(2)}</td>
                        <td></td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            
            {/* Labor Charges Section */} 
            <div>
              <div className="section-header mb-4">
                <h4 className="section-title">Labor Charges</h4>
                {workOrder.status !== 'Completed' && (
                  <button 
                    className="btn btn-primary"
                    onClick={() => setShowLaborForm(!showLaborForm)}
                  >
                    Add Labor
                  </button>
                )}
              </div>
              
              {showLaborForm && (
                <div className="form-overlay">
                  <form onSubmit={(e) => { e.preventDefault(); handleAddLabor(); }}>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                      <div className="form-group">
                        <label htmlFor="laborDescription">Labor Description</label>
                        <input
                          type="text"
                          id="laborDescription"
                          value={laborDescription}
                          onChange={(e) => setLaborDescription(e.target.value)}
                          placeholder="e.g., Engine diagnostic, Oil change, Brake repair..."
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label htmlFor="laborHours">Hours</label>
                        <input
                          type="number"
                          id="laborHours"
                          value={laborHours}
                          onChange={(e) => setLaborHours(parseFloat(e.target.value) || 1)}
                          min="0.1"
                          step="0.1"
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label htmlFor="laborRate">Rate (RM/hour)</label>
                        <input
                          type="number"
                          id="laborRate"
                          value={laborRate}
                          onChange={(e) => setLaborRate(parseFloat(e.target.value) || 50)}
                          min="0.01"
                          step="0.01"
                          required
                        />
                      </div>
                    </div>
                    <div className="btn-group mt-4">
                      <button type="submit" className="btn btn-primary">
                        Add Labor Charge
                      </button>
                      <button 
                        type="button" 
                        className="btn btn-secondary"
                        onClick={() => setShowLaborForm(false)}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              )}

              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Labor Description</th>
                      <th>Hours</th>
                      <th>Rate (RM/hour)</th>
                      <th>Total</th>
                      {workOrder.status !== 'Completed' && <th>Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {laborCharges.length === 0 ? (
                      <tr>
                        <td colSpan={workOrder.status !== 'Completed' ? "5" : "4"} className="empty-state">
                          No labor charges added yet.
                        </td>
                      </tr>
                    ) : (
                      laborCharges.map((labor) => (
                        <tr key={labor.id}>
                          <td>{labor.description}</td>
                          <td>{labor.hours}</td>
                          <td>RM{labor.rate.toFixed(2)}</td>
                          <td>RM{(labor.hours * labor.rate).toFixed(2)}</td>
                          {workOrder.status !== 'Completed' && (
                            <td>
                              <button 
                                className="btn btn-danger btn-sm"
                                onClick={() => handleRemoveLabor(labor.id)}
                              >
                                Remove
                              </button>
                            </td>
                          )}
                        </tr>
                      ))
                    )}
                    {laborCharges.length > 0 && (
                      <tr className="table-total">
                        <td colSpan="3" className="text-right font-semibold">Total Labor Cost:</td>
                        <td className="font-semibold">RM{laborCharges.reduce((total, labor) => total + (labor.hours * labor.rate), 0).toFixed(2)}</td>
                        {workOrder.status !== 'Completed' && <td></td>}
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Invoices Tab */}
        {activeTab === 'invoices' && (
          <div>
            <div className="section-header mb-6">
              <h3 className="section-title">Invoices</h3>
              {workOrder.status === 'Completed' && invoices.length === 0 && laborCharges.length > 0 && (
                <div className="text-green font-semibold text-sm">
                  ✓ Labor charges ready to be included in invoice
                </div>
              )}
              {workOrder.status === 'Completed' && invoices.length === 0 && (
                <button 
                  className="btn btn-primary"
                  onClick={handleDraftInvoice}
                >
                  Create Invoice
                </button>
              )}
            </div>
              {invoices.length > 0 ? (
              <div className="invoice-content">
                {/* Show only the most recent invoice (latest one) */}
                {(() => {
                  // Get the most recent invoice (assuming they're sorted by creation date or take the last one)
                  const mostRecentInvoice = invoices[invoices.length - 1];
                  return (
                    <div key={mostRecentInvoice.id}>
                      <InvoiceDisplay invoice={mostRecentInvoice} isReadOnly={true} showPrintButton={true} />
                      {invoices.length > 1 && (
                        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <p className="text-sm text-blue-800">
                            <strong>Note:</strong> Showing the most recent invoice. Total invoices for this work order: {invoices.length}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            ) : (
              <div className="empty-state">
                {workOrder.status === 'Completed' ? (
                  <p>No invoice created yet. Click "Create Invoice" to generate one.</p>
                ) : (
                  <p>Invoice will be available after work order completion.</p>
                )}
              </div>
            )}
          </div>
        )}      </div>      {/* Commission Management - Outside Tabs */}
      {workOrder.status === 'Completed' && (
        <div className="card" style={{ marginTop: '2rem' }}>
          <div className="card-header">
            <h3 className="card-title">💰 Mechanic Commission</h3>
            <div className="btn-group">
              {!showCommissionForm && !workOrder.commission && (
                <button 
                  className="btn btn-success"
                  onClick={() => setShowCommissionForm(true)}
                >
                  Add Commission
                </button>
              )}
              {!showCommissionForm && workOrder.commission && (
                <button 
                  className="btn btn-info"
                  onClick={() => {
                    setCommissionAmount(workOrder.commission.amount);
                    setCommissionNotes('');
                    setShowCommissionForm(true);
                  }}
                >
                  Edit Commission
                </button>
              )}
            </div>
          </div>
          <div className="card-content">
          
          {showCommissionForm && (
            <div className="form-overlay">
              <form onSubmit={handleAddCommission}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="form-group">
                    <label htmlFor="commissionAmount">Commission Amount (RM)</label>
                    <input
                      type="number"
                      id="commissionAmount"
                      value={commissionAmount}
                      onChange={(e) => setCommissionAmount(e.target.value)}
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Mechanic</label>
                    <input
                      type="text"
                      value={mechanic?.name || 'Unassigned'}
                      disabled
                      className="bg-gray"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="commissionNotes">Notes (Optional)</label>
                    <input
                      type="text"
                      id="commissionNotes"
                      value={commissionNotes}
                      onChange={(e) => setCommissionNotes(e.target.value)}
                      placeholder="Commission notes..."
                    />
                  </div>
                </div>
                <div className="btn-group mt-4">
                  <button type="submit" className="btn btn-success">
                    {workOrder.commission ? 'Update Commission' : 'Add Commission'}
                  </button>
                  <button 
                    type="button" 
                    className="btn btn-secondary"
                    onClick={() => {
                      setShowCommissionForm(false);
                      setCommissionAmount('');
                      setCommissionNotes('');
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}
          
          {!showCommissionForm && !workOrder.commission && (
            <div className="empty-state">
              <p>Add a commission for the mechanic who completed this work order.</p>
              <p><span className="font-semibold">Mechanic:</span> {mechanic?.name || 'Unassigned'}</p>
            </div>
          )}
            {!showCommissionForm && workOrder.commission && (
            <div className="commission-details">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="detail-item">
                  <span className="detail-label">Amount</span>
                  <span className="detail-value font-bold text-green-600 text-lg">
                    RM{workOrder.commission.amount.toFixed(2)}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Mechanic</span>
                  <span className="detail-value">{mechanic?.name || 'Unknown'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Status</span>
                  <span className={`status-badge ${workOrder.commission.paid ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'} px-3 py-1 rounded-full text-sm font-semibold`}>
                    {workOrder.commission.paid ? '✅ Paid' : '⏳ Pending'}
                  </span>
                </div>
                {workOrder.commission.paid && (
                  <>
                    <div className="detail-item">
                      <span className="detail-label">Payment Date</span>
                      <span className="detail-value">
                        {new Date(workOrder.commission.paidDate).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Payment Reference</span>
                      <span className="detail-value font-mono">
                        {workOrder.commission.paymentReference || 'N/A'}
                      </span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Payment Method</span>
                      <span className="detail-value">
                        {workOrder.commission.paymentMethod || 'Cash'}
                      </span>
                    </div>
                  </>
                )}
                <div className="detail-item col-span-full">
                  <span className="detail-label">Created</span>
                  <span className="detail-value">
                    {new Date(workOrder.commission.createdAt).toLocaleDateString()}
                    {workOrder.commission.updatedAt && 
                      ` (Updated: ${new Date(workOrder.commission.updatedAt).toLocaleDateString()})`}
                  </span>
                </div>
                
                {/* Commission actions */}
                {!workOrder.commission.paid && (
                  <div className="col-span-full mt-4">
                    <button 
                      className="btn btn-success mr-2"
                      onClick={async () => {
                        try {
                          await updateCommissionStatus(id, true);
                          toast.success('Commission marked as paid');
                          loadWorkOrderDetails(); // Reload to show updated data
                        } catch (error) {
                          console.error('Error updating commission status:', error);
                          toast.error('Failed to update commission payment status');
                        }
                      }}
                    >
                      Mark Commission Paid
                    </button>
                  </div>
                )}
                
                {workOrder.commission.paid && (
                  <div className="col-span-full mt-4">
                    <button 
                      className="btn btn-outline-warning"
                      onClick={async () => {
                        if (window.confirm('Are you sure you want to mark this commission as unpaid?')) {
                          try {
                            await updateCommissionStatus(id, false);
                            toast.success('Commission marked as unpaid');
                            loadWorkOrderDetails(); // Reload to show updated data
                          } catch (error) {
                            console.error('Error updating commission status:', error);
                            toast.error('Failed to update commission payment status');
                          }
                        }
                      }}
                    >
                      Mark as Unpaid                    </button>
                  </div>
                )}
              </div>            </div>
          )}
        </div>
      </div>
      )}
    </div>
  );
}

export default WorkOrderDetailPage;
