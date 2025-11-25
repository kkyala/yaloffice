import React from 'react';

// Helper to format currency values
const formatCurrency = (amount) => {
    if (typeof amount !== 'number') return '$0.00';
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
    }).format(amount);
};

// Helper to format dates to MM/DD/YY
const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
        const date = new Date(dateString);
        // Add a day to correct for potential timezone offsets that shift the date back
        date.setDate(date.getDate() + 1);
        return date.toLocaleDateString('en-US', {
            year: '2-digit',
            month: '2-digit',
            day: '2-digit',
        });
    } catch (e) {
        return 'Invalid Date';
    }
};

export default function PlacementsScreen({ placementsData = [] }) {
    return (
        <>
            <header className="page-header">
                <h1>Placements</h1>
            </header>
            <div className="table-container" style={{ overflowX: 'auto' }}>
                <table className="jobs-table" style={{ minWidth: '1600px' }}>
                    <thead>
                        <tr>
                            <th>Applicant Name</th>
                            <th>Placement Code</th>
                            <th>Job Title</th>
                            <th>Client</th>
                            <th>Business Unit</th>
                            <th>Client Bill Rate</th>
                            <th>Pay Rate</th>
                            <th>Net Margin</th>
                            <th>Actual Start Date</th>
                            <th>Status</th>
                            <th>Location</th>
                            <th>Revised</th>
                        </tr>
                    </thead>
                    <tbody>
                        {placementsData.length > 0 ? placementsData.map((p) => (
                            <tr key={p.id}>
                                <td>{p.applicant_name}</td>
                                <td>{p.placement_code}</td>
                                <td>{p.job_title}</td>
                                <td>{p.client}</td>
                                <td>{p.business_unit}</td>
                                <td>{formatCurrency(p.client_bill_rate)}</td>
                                <td>{formatCurrency(p.pay_rate)}</td>
                                <td>{formatCurrency(p.net_margin)}</td>
                                <td>{formatDate(p.actual_start_date)}</td>
                                <td>
                                    <span className={`status-badge status-${p.placement_status.toLowerCase()}`}>
                                        {p.placement_status}
                                    </span>
                                </td>
                                <td>{p.location}</td>
                                <td>{p.is_revised ? 'Yes' : 'No'}</td>
                            </tr>
                        )) : (
                             <tr>
                                <td colSpan={12} style={{ textAlign: 'center', padding: '2rem' }}>
                                    No placement data found.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </>
    );
}