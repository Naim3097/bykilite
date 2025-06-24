import React, { useState, useEffect } from 'react';
import { getDashboardData } from '../../services/dataService';
import InvoiceDisplay from '../InvoiceDisplay';

function InvoiceManagement() {  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchWorkOrder, setSearchWorkOrder] = useState('');
  const [dateFilter, setDateFilter] = useState('all');

  useEffect(() => {
    loadInvoices();
  }, []);

  const loadInvoices = async () => {
    try {
      setLoading(true);
      const data = await getDashboardData();
      setInvoices(data.recentInvoices || []);
    } catch (error) {
      console.error('Error loading invoices:', error);
    } finally {
      setLoading(false);
    }
  };
  const filteredInvoices = invoices.filter(invoice => {
    // Status filter
    if (filterStatus === 'paid' && invoice.paymentStatus !== 'paid') return false;
    if (filterStatus === 'pending' && invoice.paymentStatus === 'paid') return false;
    
    // Work order search filter
    if (searchWorkOrder && !invoice.workOrderId?.toLowerCase().includes(searchWorkOrder.toLowerCase())) {
      return false;
    }
    
    // Date filter
    if (dateFilter !== 'all') {
      const invoiceDate = new Date(invoice.date);
      const now = new Date();
      
      if (dateFilter === 'today') {
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const invoiceDay = new Date(invoiceDate.getFullYear(), invoiceDate.getMonth(), invoiceDate.getDate());
        if (invoiceDay.getTime() !== today.getTime()) return false;
      } else if (dateFilter === 'week') {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        if (invoiceDate < weekAgo) return false;
      } else if (dateFilter === 'month') {
        const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        if (invoiceDate < monthAgo) return false;
      }
    }
    
    return true;
  });
  const calculateTotal = (invoice) => {
    return invoice.items?.reduce((total, item) => {
      return total + (item.qty * item.price);
    }, 0) || 0;
  };

  const getFilteredStats = () => {
    const totalValue = filteredInvoices.reduce((sum, invoice) => sum + calculateTotal(invoice), 0);
    const paidValue = filteredInvoices
      .filter(invoice => invoice.paymentStatus === 'paid')
      .reduce((sum, invoice) => sum + calculateTotal(invoice), 0);
    const pendingValue = totalValue - paidValue;
    
    return {
      totalInvoices: filteredInvoices.length,
      totalValue,
      paidValue,
      pendingValue,
      paidCount: filteredInvoices.filter(invoice => invoice.paymentStatus === 'paid').length,
      pendingCount: filteredInvoices.filter(invoice => invoice.paymentStatus !== 'paid').length
    };
  };

  if (loading) {
    return <div className="loading">Loading invoices...</div>;
  }

  return (
    <div className="space-y-6">      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-majestic">Invoice Management</h2>
          <p className="text-cool-gray">View and manage all invoices</p>
        </div>
      </div>

      {/* Enhanced Filters */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Filter & Search</h3>
        </div>        <div className="card-body">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="form-group">
              <label htmlFor="filterStatus">Payment Status</label>
              <select
                id="filterStatus"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="all">All Invoices</option>
                <option value="paid">Paid Only</option>
                <option value="pending">Pending Payment</option>
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="searchWorkOrder">Work Order ID</label>
              <input
                type="text"
                id="searchWorkOrder"
                value={searchWorkOrder}
                onChange={(e) => setSearchWorkOrder(e.target.value)}
                placeholder="Search by Work Order ID..."
              />
            </div>
            <div className="form-group">
              <label htmlFor="dateFilter">Date Range</label>
              <select
                id="dateFilter"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">Past Week</option>
                <option value="month">Past Month</option>
              </select>
            </div>
          </div>
        </div>
      </div>      {/* Invoice Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card">
          <div className="card-body text-center">
            <div className="text-2xl font-bold text-majestic">{getFilteredStats().totalInvoices}</div>
            <div className="text-cool-gray text-sm">Total Invoices</div>
            <div className="text-xs text-gray-500 mt-1">RM{getFilteredStats().totalValue.toFixed(2)}</div>
          </div>
        </div>
        <div className="card">
          <div className="card-body text-center">
            <div className="text-2xl font-bold text-green-600">{getFilteredStats().paidCount}</div>
            <div className="text-cool-gray text-sm">Paid Invoices</div>
            <div className="text-xs text-green-600 mt-1">RM{getFilteredStats().paidValue.toFixed(2)}</div>
          </div>
        </div>
        <div className="card">
          <div className="card-body text-center">
            <div className="text-2xl font-bold text-amber-600">{getFilteredStats().pendingCount}</div>
            <div className="text-cool-gray text-sm">Pending Payment</div>
            <div className="text-xs text-amber-600 mt-1">RM{getFilteredStats().pendingValue.toFixed(2)}</div>
          </div>
        </div>
        <div className="card">
          <div className="card-body text-center">
            <div className="text-lg font-bold text-blue-600">
              {getFilteredStats().totalInvoices > 0 ? 
                ((getFilteredStats().paidValue / getFilteredStats().totalValue) * 100).toFixed(1) : 0}%
            </div>
            <div className="text-cool-gray text-sm">Collection Rate</div>
            <div className="text-xs text-gray-500 mt-1">of filtered invoices</div>
          </div>
        </div>
      </div>

      {/* Invoice List */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">
            {filterStatus === 'all' ? 'All Invoices' : 
             filterStatus === 'paid' ? 'Paid Invoices' : 'Pending Invoices'} 
            ({filteredInvoices.length})
          </h3>
        </div>
        <div className="card-body">
          {filteredInvoices.length === 0 ? (
            <div className="empty-state">
              <p>No invoices found for the selected filter.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredInvoices.map((invoice) => (                <div key={invoice.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <h4 className="font-semibold text-majestic mb-1">
                        Invoice #{invoice.id.slice(-8).toUpperCase()}
                      </h4>
                      {invoice.workOrderId && (
                        <div className="text-sm text-blue-600 mb-1">
                          <span className="font-medium">Work Order:</span> {invoice.workOrderId}
                        </div>
                      )}
                      <p className="text-cool-gray text-sm">
                        <span className="font-medium">Customer:</span> {invoice.customerName}
                      </p>
                      <p className="text-cool-gray text-sm">
                        <span className="font-medium">Date:</span> {new Date(invoice.date).toLocaleDateString()}
                      </p>
                      {invoice.items && invoice.items.length > 0 && (
                        <div className="text-sm text-gray-600 mt-1">
                          <span className="font-medium">Items:</span> {invoice.items.length} item(s)
                          {invoice.items.some(item => item.category === 'parts') && 
                           invoice.items.some(item => item.category === 'labor') && (
                            <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                              Parts & Labor
                            </span>
                          )}
                          {invoice.items.every(item => item.category === 'parts') && (
                            <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">
                              Parts Only
                            </span>
                          )}
                          {invoice.items.every(item => item.category === 'labor') && (
                            <span className="ml-2 text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded">
                              Labor Only
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold text-majestic">
                        RM{calculateTotal(invoice).toFixed(2)}
                      </div>
                      <span className={`badge ${
                        invoice.paymentStatus === 'paid' ? 'badge-success' : 'badge-warning'
                      }`}>
                        {invoice.paymentStatus === 'paid' ? '✅ Paid' : '⏳ Pending'}
                      </span>
                    </div>
                  </div>
                  <InvoiceDisplay 
                    invoice={invoice} 
                    isReadOnly={true} 
                    showPrintButton={true} 
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default InvoiceManagement;
