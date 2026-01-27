// Export utilities for CSV and data export
// Supports projects, materials, tasks, and reports

export interface ExportColumn<T> {
  key: keyof T | string;
  header: string;
  format?: (value: any, row: T) => string;
}

// CSV export utility
export const exportToCSV = <T extends Record<string, any>>(
  data: T[],
  columns: ExportColumn<T>[],
  filename: string
): void => {
  if (data.length === 0) {
    console.warn("No data to export");
    return;
  }

  // Build header row
  const headerRow = columns.map((col) => `"${col.header.replace(/"/g, '""')}"`).join(",");

  // Build data rows
  const dataRows = data.map((row) =>
    columns
      .map((col) => {
        const key = col.key as string;
        const value = key.includes(".") 
          ? key.split(".").reduce((obj, k) => obj?.[k], row)
          : row[key];
        
        const formatted = col.format ? col.format(value, row) : String(value ?? "");
        // Escape quotes and wrap in quotes
        return `"${formatted.replace(/"/g, '""')}"`;
      })
      .join(",")
  );

  // Combine and create blob
  const csvContent = [headerRow, ...dataRows].join("\n");
  const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
  
  // Download
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// JSON export utility
export const exportToJSON = <T>(data: T[], filename: string): void => {
  const jsonContent = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonContent], { type: "application/json" });
  
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// ============================================
// Pre-defined export configurations
// ============================================

// Project export columns
export const projectExportColumns: ExportColumn<any>[] = [
  { key: "name", header: "Project Name" },
  { key: "address", header: "Address" },
  { key: "trade", header: "Trade", format: (v) => v?.replace(/_/g, " ") || "" },
  { key: "status", header: "Status" },
  { key: "description", header: "Description" },
  { 
    key: "created_at", 
    header: "Created", 
    format: (v) => v ? new Date(v).toLocaleDateString("en-CA") : "" 
  },
];

// Materials/Line items export columns
export const materialsExportColumns: ExportColumn<any>[] = [
  { key: "name", header: "Material" },
  { key: "quantity", header: "Quantity", format: (v) => String(v ?? 0) },
  { key: "unit", header: "Unit" },
  { key: "unit_price", header: "Unit Price ($)", format: (v) => (v ?? 0).toFixed(2) },
  { 
    key: "total", 
    header: "Total ($)", 
    format: (_, row) => ((row.quantity || 0) * (row.unit_price || 0)).toFixed(2)
  },
  { key: "source", header: "Source" },
];

// Tasks export columns
export const tasksExportColumns: ExportColumn<any>[] = [
  { key: "title", header: "Task" },
  { key: "description", header: "Description" },
  { key: "status", header: "Status" },
  { key: "priority", header: "Priority" },
  { 
    key: "due_date", 
    header: "Due Date", 
    format: (v) => v ? new Date(v).toLocaleDateString("en-CA") : "" 
  },
  { key: "assigned_to", header: "Assigned To" },
];

// Contracts export columns
export const contractsExportColumns: ExportColumn<any>[] = [
  { key: "contract_number", header: "Contract #" },
  { key: "client_name", header: "Client" },
  { key: "project_name", header: "Project" },
  { key: "total_amount", header: "Amount ($)", format: (v) => (v ?? 0).toFixed(2) },
  { key: "status", header: "Status" },
  { 
    key: "contract_date", 
    header: "Date", 
    format: (v) => v ? new Date(v).toLocaleDateString("en-CA") : "" 
  },
];

// Team members export columns
export const teamMembersExportColumns: ExportColumn<any>[] = [
  { key: "company_name", header: "Company" },
  { key: "primary_trade", header: "Trade", format: (v) => v?.replace(/_/g, " ") || "" },
  { key: "experience_level", header: "Experience" },
  { key: "hourly_rate", header: "Hourly Rate ($)", format: (v) => (v ?? 0).toFixed(2) },
  { key: "service_area", header: "Service Area" },
  { key: "phone", header: "Phone" },
];

// Format currency for exports
export const formatCurrencyForExport = (amount: number, currency = "CAD"): string => {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency,
  }).format(amount);
};

// Generate filename with timestamp
export const generateExportFilename = (prefix: string): string => {
  const date = new Date().toISOString().split("T")[0];
  return `${prefix}_${date}`;
};
