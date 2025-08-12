import React from 'react';

const Select = ({ label, value, onChange, children, required }) => (
  <div>
    <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
    <select
      value={value}
      onChange={onChange}
      required={required}
      className="w-full px-3 py-2 text-slate-900 bg-slate-50 border border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 transition"
    >
      {children}
    </select>
  </div>
);

export default Select;