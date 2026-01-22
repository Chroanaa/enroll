import React, { useState, useEffect } from "react";
import { User, Phone, Mail } from "lucide-react";
import { colors } from "../../colors";
import { EnrollmentPageProps } from "./types";
import {
  getProvinces,
  getCitiesAndMunicipalitiesByProvince,
} from "../../utils/philippineAddress";

const StudentInformation: React.FC<EnrollmentPageProps> = ({
  formData,
  handleInputChange,
  fieldErrors = {},
  duplicateError,
  isCheckingDuplicate,
}) => {
  // Disable all non-name fields when duplicate is detected or still checking
  const isFormDisabled = !!duplicateError || !!isCheckingDuplicate;

  // Address state management
  const [selectedProvince, setSelectedProvince] = useState(formData.address_province || "");
  const [selectedCity, setSelectedCity] = useState(formData.address_city || "");
  
  // Birthplace state management
  const [selectedBirthplaceProvince, setSelectedBirthplaceProvince] = useState("");
  const [selectedBirthplaceCity, setSelectedBirthplaceCity] = useState(formData.birthplace || "");
  
  // Address data from PSGC API
  const [provinces, setProvinces] = useState<string[]>([]);
  const [cities, setCities] = useState<Array<{ name: string; type: string; code: string }>>([]);
  const [loadingProvinces, setLoadingProvinces] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);
  
  // Birthplace data from PSGC API
  const [birthplaceProvinces, setBirthplaceProvinces] = useState<string[]>([]);
  const [birthplaceCities, setBirthplaceCities] = useState<Array<{ name: string; type: string; code: string }>>([]);
  const [loadingBirthplaceProvinces, setLoadingBirthplaceProvinces] = useState(false);
  const [loadingBirthplaceCities, setLoadingBirthplaceCities] = useState(false);

  // Load provinces on mount
  useEffect(() => {
    const loadProvinces = async () => {
      setLoadingProvinces(true);
      try {
        const data = await getProvinces();
        setProvinces(data);
      } catch (error) {
        console.error("Error loading provinces:", error);
      } finally {
        setLoadingProvinces(false);
      }
    };
    loadProvinces();
  }, []);

  // Load cities/municipalities when province changes
  useEffect(() => {
    const loadCities = async () => {
      if (!selectedProvince) {
        setCities([]);
        return;
      }
      setLoadingCities(true);
      try {
        const data = await getCitiesAndMunicipalitiesByProvince(selectedProvince);
        setCities(data);
      } catch (error) {
        console.error("Error loading cities:", error);
      } finally {
        setLoadingCities(false);
      }
    };
    loadCities();
  }, [selectedProvince]);

  // Load birthplace provinces on mount
  useEffect(() => {
    const loadBirthplaceProvinces = async () => {
      setLoadingBirthplaceProvinces(true);
      try {
        const data = await getProvinces();
        setBirthplaceProvinces(data);
      } catch (error) {
        console.error("Error loading birthplace provinces:", error);
      } finally {
        setLoadingBirthplaceProvinces(false);
      }
    };
    loadBirthplaceProvinces();
  }, []);

  // Load birthplace cities/municipalities when province changes
  useEffect(() => {
    const loadBirthplaceCities = async () => {
      if (!selectedBirthplaceProvince) {
        setBirthplaceCities([]);
        return;
      }
      setLoadingBirthplaceCities(true);
      try {
        const data = await getCitiesAndMunicipalitiesByProvince(selectedBirthplaceProvince);
        setBirthplaceCities(data);
      } catch (error) {
        console.error("Error loading birthplace cities:", error);
      } finally {
        setLoadingBirthplaceCities(false);
      }
    };
    loadBirthplaceCities();
  }, [selectedBirthplaceProvince]);


  const handleProvinceChange = (province: string) => {
    setSelectedProvince(province);
    setSelectedCity("");
    handleInputChange("address_province", province);
    handleInputChange("address_city", "");
    updateCompleteAddress(province, "", formData.address_detail || "");
  };

  const handleCityChange = (city: string) => {
    setSelectedCity(city);
    handleInputChange("address_city", city);
    updateCompleteAddress(selectedProvince, city, formData.address_detail || "");
  };

  // Helper function to construct complete address
  const updateCompleteAddress = (
    province: string,
    city: string,
    addressDetail: string
  ) => {
    const addressParts: string[] = [];
    
    if (addressDetail) addressParts.push(addressDetail);
    if (city) addressParts.push(city);
    if (province) addressParts.push(province);
    
    handleInputChange("complete_address", addressParts.join(", "));
  };

  // Handle address detail field change (house/building, street, barangay combined)
  const handleAddressDetailChange = (value: string) => {
    handleInputChange("address_detail", value.toUpperCase());
    updateCompleteAddress(selectedProvince, selectedCity, value.toUpperCase());
  };

  const handleBirthplaceProvinceChange = (province: string) => {
    setSelectedBirthplaceProvince(province);
    setSelectedBirthplaceCity("");
    handleInputChange("birthplace", "");
  };

  const handleBirthplaceCityChange = (city: string) => {
    // Prevent duplicate: check if birthplace matches address
    if (city && selectedCity && city === selectedCity) {
      // Show error but allow selection (validation will catch it)
      console.warn("Birthplace city matches address city");
    }
    
    setSelectedBirthplaceCity(city);
    handleInputChange("birthplace", city);
  };

  const inputClasses =
    "w-full px-4 py-3 rounded-xl border bg-white/50 transition-all duration-300 focus:ring-2 focus:ring-offset-0 outline-none";

  const disabledClasses = "cursor-not-allowed opacity-50 bg-gray-100";

  const getInputStyle = (fieldName: string) => ({
    borderColor: fieldErrors[fieldName] ? "#ef4444" : colors.tertiary + "30",
    color: colors.primary,
  });

  const handleFocus = (
    e: React.FocusEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
    fieldName: string,
  ) => {
    e.currentTarget.style.borderColor = fieldErrors[fieldName]
      ? "#ef4444"
      : colors.secondary;
    e.currentTarget.style.boxShadow = `0 0 0 4px ${fieldErrors[fieldName] ? "#ef444410" : colors.secondary + "10"}`;
  };

  const handleBlur = (
    e: React.FocusEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
    fieldName: string,
  ) => {
    e.currentTarget.style.borderColor = fieldErrors[fieldName]
      ? "#ef4444"
      : colors.tertiary + "30";
    e.currentTarget.style.boxShadow = "none";
  };

  return (
    <div className='space-y-6 animate-in slide-in-from-bottom-4 duration-500'>
      <div
        className='p-8 rounded-2xl bg-white border shadow-lg shadow-gray-100/50'
        style={{
          borderColor: colors.accent + "20",
          background: `linear-gradient(to bottom right, #ffffff, ${colors.paper})`,
        }}
      >
        <div
          className='flex items-center gap-4 mb-8 pb-6 border-b'
          style={{ borderColor: colors.accent + "10" }}
        >
          <div
            className='p-3 rounded-2xl shadow-sm transform transition-transform hover:scale-105 duration-300'
            style={{
              backgroundColor: "white",
              border: `1px solid ${colors.accent}20`,
            }}
          >
            <User className='w-6 h-6' style={{ color: colors.secondary }} />
          </div>
          <div>
            <h2
              className='text-2xl font-bold tracking-tight'
              style={{ color: colors.primary }}
            >
              Student Information
            </h2>
            <p
              className='text-sm mt-1 font-medium'
              style={{ color: colors.tertiary }}
            >
              Please provide your personal details
            </p>
          </div>
        </div>

        <div className='mb-6 group'>
          <label
            className='block text-sm font-semibold mb-2 ml-1 transition-colors'
            style={{ color: colors.primary }}
          >
            Student ID{" "}
            <span className='text-xs text-gray-500'>(Auto-generated)</span>
          </label>
          <input
            name='student_number'
            data-field='student_number'
            type='text'
            value={formData.student_number}
            readOnly
            disabled
            className={`${inputClasses} cursor-not-allowed opacity-75 bg-gray-50`}
            style={{
              borderColor: colors.tertiary + "30",
              color: colors.primary,
            }}
            placeholder='Auto-generated (YY-00001)'
          />
        </div>

        {/* Duplicate Warning Banner */}
        {duplicateError && (
          <div className='mb-6 p-4 rounded-xl border-2 border-amber-400 bg-amber-50 animate-in fade-in duration-300'>
            <div className='flex items-center gap-3'>
              <div className='p-2 rounded-full bg-amber-100'>
                <svg
                  className='w-5 h-5 text-amber-600'
                  fill='none'
                  stroke='currentColor'
                  viewBox='0 0 24 24'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z'
                  />
                </svg>
              </div>
              <div>
                <p className='font-semibold text-amber-800'>
                  Duplicate Enrollment Warning
                </p>
                <p className='text-sm text-amber-700'>{duplicateError}</p>
              </div>
            </div>
          </div>
        )}

        {/* Checking Duplicate Indicator */}
        {isCheckingDuplicate && (
          <div className='mb-6 p-3 rounded-xl border border-blue-200 bg-blue-50 animate-pulse'>
            <div className='flex items-center gap-2'>
              <svg
                className='w-4 h-4 text-blue-500 animate-spin'
                fill='none'
                viewBox='0 0 24 24'
              >
                <circle
                  className='opacity-25'
                  cx='12'
                  cy='12'
                  r='10'
                  stroke='currentColor'
                  strokeWidth='4'
                ></circle>
                <path
                  className='opacity-75'
                  fill='currentColor'
                  d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'
                ></path>
              </svg>
              <span className='text-sm text-blue-600'>
                Checking for existing enrollments...
              </span>
            </div>
          </div>
        )}

        <div className='grid grid-cols-1 md:grid-cols-3 gap-6 mb-6'>
          <div className='group'>
            <label
              className='block text-sm font-semibold mb-2 ml-1 transition-colors'
              style={{ color: colors.primary }}
            >
              Family Name
            </label>
            <input
              name='family_name'
              data-field='family_name'
              type='text'
              value={formData.family_name}
              onChange={(e) => handleInputChange("family_name", e.target.value.toUpperCase())}
              className={`${inputClasses} ${fieldErrors.family_name ? "border-red-500" : ""}`}
              style={getInputStyle("family_name")}
              onFocus={(e) => handleFocus(e, "family_name")}
              onBlur={(e) => handleBlur(e, "family_name")}
              placeholder='e.g. DELA CRUZ'
            />
            {fieldErrors.family_name && (
              <p className='text-red-500 text-xs mt-1 ml-1'>
                {fieldErrors.family_name}
              </p>
            )}
          </div>
          <div className='group'>
            <label
              className='block text-sm font-semibold mb-2 ml-1 transition-colors'
              style={{ color: colors.primary }}
            >
              First Name
            </label>
            <input
              name='first_name'
              data-field='first_name'
              type='text'
              value={formData.first_name}
              onChange={(e) => handleInputChange("first_name", e.target.value.toUpperCase())}
              className={`${inputClasses} ${fieldErrors.first_name ? "border-red-500" : ""}`}
              style={getInputStyle("first_name")}
              onFocus={(e) => handleFocus(e, "first_name")}
              onBlur={(e) => handleBlur(e, "first_name")}
              placeholder='e.g. JUAN'
            />
            {fieldErrors.first_name && (
              <p className='text-red-500 text-xs mt-1 ml-1'>
                {fieldErrors.first_name}
              </p>
            )}
          </div>
          <div className='group'>
            <label
              className='block text-sm font-semibold mb-2 ml-1 transition-colors'
              style={{ color: colors.primary }}
            >
              Middle Name
            </label>
            <input
              type='text'
              value={formData.middle_name}
              onChange={(e) => handleInputChange("middle_name", e.target.value.toUpperCase())}
              disabled={isFormDisabled}
              className={`${inputClasses} ${isFormDisabled ? disabledClasses : ""}`}
              style={{
                borderColor: colors.tertiary + "30",
                color: colors.primary,
              }}
              onFocus={(e) => {
                if (!isFormDisabled) {
                  e.currentTarget.style.borderColor = colors.secondary;
                  e.currentTarget.style.boxShadow = `0 0 0 4px ${colors.secondary}10`;
                }
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = colors.tertiary + "30";
                e.currentTarget.style.boxShadow = "none";
              }}
              placeholder='OPTIONAL'
            />
          </div>
        </div>

        <div className='grid grid-cols-1 md:grid-cols-3 gap-6 mb-6'>
          <div className='group'>
            <label
              className='block text-sm font-semibold mb-2 ml-1'
              style={{ color: colors.primary }}
            >
              Sex
            </label>
            <div className='relative'>
              <select
                name='sex'
                data-field='sex'
                value={formData.sex}
                onChange={(e) => handleInputChange("sex", e.target.value)}
                disabled={isFormDisabled}
                className={`${inputClasses} appearance-none ${isFormDisabled ? disabledClasses : "cursor-pointer"} ${fieldErrors.sex ? "border-red-500" : ""}`}
                style={getInputStyle("sex")}
                onFocus={(e) => !isFormDisabled && handleFocus(e, "sex")}
                onBlur={(e) => handleBlur(e, "sex")}
              >
                <option value=''>Select Sex</option>
                <option value='male'>Male</option>
                <option value='female'>Female</option>
              </select>
              <div className='absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-50'>
                <svg
                  width='12'
                  height='12'
                  viewBox='0 0 12 12'
                  fill='none'
                  xmlns='http://www.w3.org/2000/svg'
                >
                  <path
                    d='M2.5 4.5L6 8L9.5 4.5'
                    stroke='currentColor'
                    strokeWidth='1.5'
                    strokeLinecap='round'
                    strokeLinejoin='round'
                  />
                </svg>
              </div>
            </div>
            {fieldErrors.sex && (
              <p className='text-red-500 text-xs mt-1 ml-1'>
                {fieldErrors.sex}
              </p>
            )}
          </div>
          <div className='group'>
            <label
              className='block text-sm font-semibold mb-2 ml-1'
              style={{ color: colors.primary }}
            >
              Civil Status
            </label>
            <div className='relative'>
              <select
                name='civil_status'
                data-field='civil_status'
                value={formData.civil_status}
                onChange={(e) =>
                  handleInputChange("civil_status", e.target.value)
                }
                disabled={isFormDisabled}
                className={`${inputClasses} appearance-none ${isFormDisabled ? disabledClasses : "cursor-pointer"} ${fieldErrors.civil_status ? "border-red-500" : ""}`}
                style={getInputStyle("civil_status")}
                onFocus={(e) =>
                  !isFormDisabled && handleFocus(e, "civil_status")
                }
                onBlur={(e) => handleBlur(e, "civil_status")}
              >
                <option value=''>Select Status</option>
                <option value='single'>Single</option>
                <option value='married'>Married</option>
                <option value='widowed'>Widowed</option>
                <option value='separated'>Separated</option>
              </select>
              <div className='absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-50'>
                <svg
                  width='12'
                  height='12'
                  viewBox='0 0 12 12'
                  fill='none'
                  xmlns='http://www.w3.org/2000/svg'
                >
                  <path
                    d='M2.5 4.5L6 8L9.5 4.5'
                    stroke='currentColor'
                    strokeWidth='1.5'
                    strokeLinecap='round'
                    strokeLinejoin='round'
                  />
                </svg>
              </div>
            </div>
            {fieldErrors.civil_status && (
              <p className='text-red-500 text-xs mt-1 ml-1'>
                {fieldErrors.civil_status}
              </p>
            )}
          </div>
          <div className='group'>
            <label
              className='block text-sm font-semibold mb-2 ml-1'
              style={{ color: colors.primary }}
            >
              Birthdate
            </label>
            <input
              name='birthdate'
              data-field='birthdate'
              type='date'
              value={formData.birthdate}
              onChange={(e) => handleInputChange("birthdate", e.target.value)}
              disabled={isFormDisabled}
              max={(() => {
                const today = new Date();
                const maxDate = new Date(today.getFullYear() - 15, today.getMonth(), today.getDate());
                return maxDate.toISOString().split('T')[0];
              })()}
              min={(() => {
                const today = new Date();
                const minDate = new Date(today.getFullYear() - 100, 0, 1);
                return minDate.toISOString().split('T')[0];
              })()}
              className={`${inputClasses} ${isFormDisabled ? disabledClasses : ""} ${fieldErrors.birthdate ? "border-red-500" : ""}`}
              style={getInputStyle("birthdate")}
              onFocus={(e) => !isFormDisabled && handleFocus(e, "birthdate")}
              onBlur={(e) => handleBlur(e, "birthdate")}
            />
            {fieldErrors.birthdate && (
              <p className='text-red-500 text-xs mt-1 ml-1'>
                {fieldErrors.birthdate}
              </p>
            )}
          </div>
        </div>

        <div className='mb-6 space-y-4'>
          <label
            className='block text-sm font-semibold mb-2 ml-1'
            style={{ color: colors.primary }}
          >
            Birthplace
          </label>
          
          {/* Birthplace Province Dropdown */}
          <div className='group'>
            <label className='block text-xs font-medium mb-1 ml-1' style={{ color: colors.tertiary }}>
              Province
            </label>
            <div className='relative'>
              <select
                name='birthplace_province'
                value={selectedBirthplaceProvince}
                onChange={(e) => handleBirthplaceProvinceChange(e.target.value)}
                disabled={isFormDisabled || loadingBirthplaceProvinces}
                className={`${inputClasses} appearance-none ${isFormDisabled || loadingBirthplaceProvinces ? disabledClasses : "cursor-pointer"} ${fieldErrors.birthplace ? "border-red-500" : ""}`}
                style={getInputStyle("birthplace")}
                onFocus={(e) => !isFormDisabled && handleFocus(e, "birthplace")}
                onBlur={(e) => handleBlur(e, "birthplace")}
              >
                <option value=''>{loadingBirthplaceProvinces ? "Loading provinces..." : "Select Province"}</option>
                {birthplaceProvinces.map((province) => (
                  <option key={province} value={province}>
                    {province}
                  </option>
                ))}
              </select>
              <div className='absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-50'>
                <svg width='12' height='12' viewBox='0 0 12 12' fill='none' xmlns='http://www.w3.org/2000/svg'>
                  <path d='M2.5 4.5L6 8L9.5 4.5' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round' />
                </svg>
              </div>
            </div>
          </div>

          {/* Birthplace City/Municipality Dropdown */}
          <div className='group'>
            <label className='block text-xs font-medium mb-1 ml-1' style={{ color: colors.tertiary }}>
              City/Municipality
            </label>
            <div className='relative'>
              <select
                name='birthplace'
                data-field='birthplace'
                value={selectedBirthplaceCity}
                onChange={(e) => handleBirthplaceCityChange(e.target.value)}
                disabled={isFormDisabled || !selectedBirthplaceProvince || loadingBirthplaceCities}
                className={`${inputClasses} appearance-none ${isFormDisabled || !selectedBirthplaceProvince || loadingBirthplaceCities ? disabledClasses : "cursor-pointer"} ${fieldErrors.birthplace ? "border-red-500" : ""}`}
                style={getInputStyle("birthplace")}
                onFocus={(e) => !isFormDisabled && handleFocus(e, "birthplace")}
                onBlur={(e) => handleBlur(e, "birthplace")}
              >
                <option value=''>
                  {loadingBirthplaceCities
                    ? "Loading cities/municipalities..."
                    : selectedBirthplaceProvince
                    ? "Select City/Municipality"
                    : "Select Province first"}
                </option>
                {birthplaceCities
                  .filter((item) => {
                    // Prevent duplicate: filter out the city if it matches the address city
                    if (selectedCity && item.name === selectedCity) {
                      return false;
                    }
                    return true;
                  })
                  .map((item) => (
                    <option key={item.code} value={item.name}>
                      {item.name} ({item.type})
                    </option>
                  ))}
              </select>
              <div className='absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-50'>
                <svg width='12' height='12' viewBox='0 0 12 12' fill='none' xmlns='http://www.w3.org/2000/svg'>
                  <path d='M2.5 4.5L6 8L9.5 4.5' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round' />
                </svg>
              </div>
            </div>
            {selectedBirthplaceCity && selectedCity && selectedBirthplaceCity === selectedCity && (
              <p className='text-amber-600 text-xs mt-1 ml-1'>
                ⚠️ Birthplace city matches address city. Please select a different location.
              </p>
            )}
          </div>
          
          {fieldErrors.birthplace && (
            <p className='text-red-500 text-xs mt-1 ml-1'>
              {fieldErrors.birthplace}
            </p>
          )}
        </div>

        <div className='mb-6 space-y-4'>
          <label
            className='block text-sm font-semibold mb-2 ml-1'
            style={{ color: colors.primary }}
          >
            Complete Address
          </label>
          
          {/* Province Dropdown */}
          <div className='group'>
            <label className='block text-xs font-medium mb-1 ml-1' style={{ color: colors.tertiary }}>
              Province
            </label>
            <div className='relative'>
              <select
                name='address_province'
                data-field='address_province'
                value={selectedProvince}
                onChange={(e) => handleProvinceChange(e.target.value)}
                disabled={isFormDisabled || loadingProvinces}
                className={`${inputClasses} appearance-none ${isFormDisabled || loadingProvinces ? disabledClasses : "cursor-pointer"} ${fieldErrors.complete_address ? "border-red-500" : ""}`}
                style={getInputStyle("complete_address")}
                onFocus={(e) => !isFormDisabled && handleFocus(e, "complete_address")}
                onBlur={(e) => handleBlur(e, "complete_address")}
              >
                <option value=''>{loadingProvinces ? "Loading provinces..." : "Select Province"}</option>
                {provinces.map((province) => (
                  <option key={province} value={province}>
                    {province}
                  </option>
                ))}
              </select>
              <div className='absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-50'>
                <svg width='12' height='12' viewBox='0 0 12 12' fill='none' xmlns='http://www.w3.org/2000/svg'>
                  <path d='M2.5 4.5L6 8L9.5 4.5' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round' />
                </svg>
              </div>
            </div>
          </div>

          {/* City/Municipality Dropdown */}
          <div className='group'>
            <label className='block text-xs font-medium mb-1 ml-1' style={{ color: colors.tertiary }}>
              City/Municipality
            </label>
            <div className='relative'>
              <select
                name='address_city'
                data-field='address_city'
                value={selectedCity}
                onChange={(e) => handleCityChange(e.target.value)}
                disabled={isFormDisabled || !selectedProvince || loadingCities}
                className={`${inputClasses} appearance-none ${isFormDisabled || !selectedProvince || loadingCities ? disabledClasses : "cursor-pointer"} ${fieldErrors.complete_address ? "border-red-500" : ""}`}
                style={getInputStyle("complete_address")}
                onFocus={(e) => !isFormDisabled && handleFocus(e, "complete_address")}
                onBlur={(e) => handleBlur(e, "complete_address")}
              >
                <option value=''>
                  {loadingCities
                    ? "Loading cities/municipalities..."
                    : selectedProvince
                    ? "Select City/Municipality"
                    : "Select Province first"}
                </option>
                {cities
                  .filter((item) => {
                    // Prevent duplicate: filter out the city if it matches the birthplace city
                    if (selectedBirthplaceCity && item.name === selectedBirthplaceCity) {
                      return false;
                    }
                    return true;
                  })
                  .map((item) => (
                    <option key={item.code} value={item.name}>
                      {item.name} ({item.type})
                    </option>
                  ))}
              </select>
              <div className='absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-50'>
                <svg width='12' height='12' viewBox='0 0 12 12' fill='none' xmlns='http://www.w3.org/2000/svg'>
                  <path d='M2.5 4.5L6 8L9.5 4.5' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round' />
                </svg>
              </div>
            </div>
          </div>

          {/* Address Detail (House/Building Number, Street, Barangay) */}
          <div className='group'>
            <label className='block text-xs font-medium mb-1 ml-1' style={{ color: colors.tertiary }}>
              House/Building Number, Street, Barangay
            </label>
            <input
              name='address_detail'
              data-field='address_detail'
              type='text'
              value={formData.address_detail || ""}
              onChange={(e) => handleAddressDetailChange(e.target.value)}
              disabled={isFormDisabled}
              className={`${inputClasses} ${isFormDisabled ? disabledClasses : ""} ${fieldErrors.complete_address ? "border-red-500" : ""}`}
              style={getInputStyle("complete_address")}
              onFocus={(e) => !isFormDisabled && handleFocus(e, "complete_address")}
              onBlur={(e) => handleBlur(e, "complete_address")}
              placeholder='e.g. 123 MAIN STREET, BARANGAY NAME'
            />
          </div>

          {selectedCity && selectedBirthplaceCity && selectedCity === selectedBirthplaceCity && (
            <p className='text-amber-600 text-xs mt-1 ml-1'>
              ⚠️ Address city matches birthplace city. Please select a different location.
            </p>
          )}

          {fieldErrors.complete_address && (
            <p className='text-red-500 text-xs mt-1 ml-1'>
              {fieldErrors.complete_address}
            </p>
          )}
        </div>

        <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
          <div className='group'>
            <label
              className='flex items-center gap-2 text-sm font-semibold mb-2 ml-1'
              style={{ color: colors.primary }}
            >
              <Phone className='w-4 h-4' style={{ color: colors.secondary }} />
              Contact Number
            </label>
            <input
              name='contact_number'
              data-field='contact_number'
              type='tel'
              value={formData.contact_number}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, "");
                handleInputChange("contact_number", value);
              }}
              disabled={isFormDisabled}
              className={`${inputClasses} ${isFormDisabled ? disabledClasses : ""} ${fieldErrors.contact_number ? "border-red-500" : ""}`}
              style={getInputStyle("contact_number")}
              onFocus={(e) =>
                !isFormDisabled && handleFocus(e, "contact_number")
              }
              onBlur={(e) => handleBlur(e, "contact_number")}
              placeholder='09123456789'
              pattern='[0-9]*'
              inputMode='numeric'
            />
            {fieldErrors.contact_number && (
              <p className='text-red-500 text-xs mt-1 ml-1'>
                {fieldErrors.contact_number}
              </p>
            )}
          </div>
          <div className='group'>
            <label
              className='flex items-center gap-2 text-sm font-semibold mb-2 ml-1'
              style={{ color: colors.primary }}
            >
              <Mail className='w-4 h-4' style={{ color: colors.secondary }} />
              Email Address
            </label>
            <input
              name='email_address'
              data-field='email_address'
              type='email'
              value={formData.email_address}
              onChange={(e) =>
                handleInputChange("email_address", e.target.value)
              }
              disabled={isFormDisabled}
              className={`${inputClasses} ${isFormDisabled ? disabledClasses : ""} ${fieldErrors.email_address ? "border-red-500" : ""}`}
              style={getInputStyle("email_address")}
              onFocus={(e) =>
                !isFormDisabled && handleFocus(e, "email_address")
              }
              onBlur={(e) => handleBlur(e, "email_address")}
              placeholder='example@email.com'
            />
            {fieldErrors.email_address && (
              <p className='text-red-500 text-xs mt-1 ml-1'>
                {fieldErrors.email_address}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentInformation;
