import React from "react";
import { Search, Filter } from "lucide-react";
import { colors } from "../../colors";

export interface FilterOption {
  value: string | number;
  label: string;
}

export interface SelectFilter {
  value: string | number;
  onChange: (value: string | number) => void;
  options: FilterOption[];
  placeholder?: string;
  icon?: React.ReactNode;
}

interface SearchFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  filters?: SelectFilter[];
}

const SearchFilters: React.FC<SearchFiltersProps> = ({
  searchTerm,
  onSearchChange,
  searchPlaceholder = "Search...",
  filters = [],
}) => {
  return (
    <div className='bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4 items-center justify-between'>
      <div className='relative flex-1 w-full md:max-w-md'>
        <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5' />
        <input
          type='text'
          placeholder={searchPlaceholder}
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className='w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-offset-0 transition-all'
          style={{ 
            outline: "none",
            color: "var(--text-brown)"
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = colors.tertiary;
            e.currentTarget.style.boxShadow = `0 0 0 3px ${colors.secondary}20`;
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = "#E5E7EB";
            e.currentTarget.style.boxShadow = "none";
          }}
        />
      </div>

      {filters.length > 0 && (
        <div className='flex items-center gap-3 w-full md:w-auto'>
          {filters.map((filter, index) => (
            <div
              key={index}
              className='flex items-center gap-2 px-3 py-2.5 border border-gray-200 rounded-xl bg-gray-50/50'
            >
              {filter.icon || <Filter className='w-4 h-4 text-gray-500' />}
              <select
                value={filter.value}
                onChange={(e) => {
                  const newValue = e.target.value;
                  // Always look up the matching option to preserve the original typed value (string or number)
                  const matchingOption = filter.options.find(
                    (opt) => String(opt.value) === newValue
                  );
                  filter.onChange(matchingOption ? matchingOption.value : newValue);
                }}
                className='bg-transparent border-none text-sm font-medium focus:ring-0 cursor-pointer'
                style={{ 
                  outline: "none",
                  color: "#6B5B4F"
                }}
              >
                {filter.options.map((option) => (
                  <option key={String(option.value)} value={String(option.value)}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SearchFilters;

