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
  
  // Birthplace state management
  // Parse birthplace array: [province, city]
  const birthplaceArray = Array.isArray(formData.birthplace) ? formData.birthplace : [];
  const [selectedBirthplaceProvince, setSelectedBirthplaceProvince] = useState(birthplaceArray[0] || "");
  const [selectedBirthplaceCity, setSelectedBirthplaceCity] = useState(birthplaceArray[1] || "");
  
  // Birthplace data from PSGC API
  const [birthplaceProvinces, setBirthplaceProvinces] = useState<string[]>([]);
  const [birthplaceCities, setBirthplaceCities] = useState<Array<{ name: string; type: string; code: string }>>([]);
  const [loadingBirthplaceProvinces, setLoadingBirthplaceProvinces] = useState(false);
  const [loadingBirthplaceCities, setLoadingBirthplaceCities] = useState(false);

  const normalizeText = (value: string) =>
    (value || "").trim().toUpperCase();

  const parseBirthplaceValue = (value: any): string[] => {
    if (Array.isArray(value)) {
      return [String(value[0] || "").trim(), String(value[1] || "").trim()];
    }
    if (value && typeof value === "object") {
      const province =
        value.province ?? value.birthplace_province ?? value.address_province;
      const city = value.city ?? value.municipality ?? value.birthplace_city;
      return [String(province || "").trim(), String(city || "").trim()];
    }
    if (typeof value === "string" && value.trim()) {
      let current: any = value.trim();
      for (let i = 0; i < 3; i += 1) {
        if (typeof current !== "string") break;
        const text = current.trim();
        if (
          !(text.startsWith("[") || text.startsWith("{") || text.startsWith('"'))
        ) {
          break;
        }
        try {
          current = JSON.parse(text);
        } catch {
          break;
        }
      }

      if (Array.isArray(current)) {
        return [
          String(current[0] || "").trim(),
          String(current[1] || "").trim(),
        ];
      }

      if (typeof current === "string" && current.startsWith("{") && current.endsWith("}")) {
        const inner = current.slice(1, -1);
        const parts = inner
          .split(",")
          .map((v) => v.replace(/^"+|"+$/g, "").trim())
          .filter(Boolean);
        if (parts.length >= 2) return [parts[0], parts[1]];
        if (parts.length === 1) return [parts[0], ""];
      }

      if (typeof current === "string") {
        const parts = current
          .split(",")
          .map((v) => v.trim())
          .filter(Boolean);
        if (parts.length >= 2) return [parts[0], parts.slice(1).join(", ")];
        if (parts.length === 1) return [parts[0], ""];
      }
    }
    return ["", ""];
  };

  // Sync local birthplace state when formData is loaded/updated externally
  useEffect(() => {
    const birthArray = parseBirthplaceValue(formData.birthplace);
    setSelectedBirthplaceProvince(birthArray[0] || "");
    setSelectedBirthplaceCity(birthArray[1] || "");
  }, [formData.birthplace]);

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

  // Reconcile saved birthplace province values like "METRO MANILA" to the exact
  // option label from PSGC list (e.g., "Metro Manila"), so the select shows it.
  useEffect(() => {
    if (!selectedBirthplaceProvince || birthplaceProvinces.length === 0) return;

    const matchedProvince = birthplaceProvinces.find(
      (province) =>
        normalizeText(province) === normalizeText(selectedBirthplaceProvince),
    );

    if (matchedProvince && matchedProvince !== selectedBirthplaceProvince) {
      setSelectedBirthplaceProvince(matchedProvince);
      handleInputChange(
        "birthplace",
        JSON.stringify([matchedProvince, selectedBirthplaceCity || ""]),
      );
    }
  }, [selectedBirthplaceProvince, selectedBirthplaceCity, birthplaceProvinces]);

  const handleBirthplaceProvinceChange = (province: string) => {
    setSelectedBirthplaceProvince(province);
    setSelectedBirthplaceCity("");
    // Update birthplace array: [province, ""]
    handleInputChange("birthplace", JSON.stringify([province, ""]));
  };

  const handleBirthplaceCityChange = (city: string) => {
    setSelectedBirthplaceCity(city);
    // Update birthplace array: [province, city]
    const birthplaceArray = [selectedBirthplaceProvince, city];
    handleInputChange("birthplace", JSON.stringify(birthplaceArray));
  };

  const normalizeLocationKey = (value: string) =>
    (value || "")
      .toUpperCase()
      .replace(/\(CITY\)|\(MUN\)|\(MUN\.\)/g, "")
      .replace(/\bCITY OF\b/g, "")
      .replace(/\bMUNICIPALITY OF\b/g, "")
      .replace(/\bCITY\b/g, "")
      .replace(/\bMUNICIPALITY\b/g, "")
      .replace(/[^A-Z0-9]/g, "")
      .trim();

  // Reconcile saved birthplace city values like "CITY OF MANILA" with PSGC list entries (e.g. "Manila")
  useEffect(() => {
    if (!selectedBirthplaceProvince || !selectedBirthplaceCity || birthplaceCities.length === 0) {
      return;
    }

    const currentKey = normalizeLocationKey(selectedBirthplaceCity);
    const matched = birthplaceCities.find(
      (item) => normalizeLocationKey(item.name) === currentKey,
    );

    if (matched && matched.name !== selectedBirthplaceCity) {
      setSelectedBirthplaceCity(matched.name);
      handleInputChange(
        "birthplace",
        JSON.stringify([selectedBirthplaceProvince, matched.name]),
      );
    }
  }, [
    selectedBirthplaceProvince,
    selectedBirthplaceCity,
    birthplaceCities,
  ]);

  const inputClasses =
    "w-full px-4 py-2.5 rounded-xl border bg-white/50 transition-all duration-300 focus:ring-2 focus:ring-offset-0 outline-none";

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
    <div className='space-y-4 animate-in slide-in-from-bottom-4 duration-500'>
      <div
        className='p-3 sm:p-4 md:p-6 rounded-2xl bg-white border shadow-lg shadow-gray-100/50'
        style={{
          borderColor: colors.accent + "20",
          background: `linear-gradient(to bottom right, #ffffff, ${colors.paper})`,
        }}
      >
        <div
          className='flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 mb-5 sm:mb-6 pb-4 border-b'
          style={{ borderColor: colors.accent + "10" }}
        >
          <div
            className='p-2.5 sm:p-3 rounded-2xl shadow-sm transform transition-transform hover:scale-105 duration-300 w-fit'
            style={{
              backgroundColor: "white",
              border: `1px solid ${colors.accent}20`,
            }}
          >
            <User className='w-5 h-5 sm:w-6 sm:h-6' style={{ color: colors.secondary }} />
          </div>
          <div>
            <h2
              className='text-lg sm:text-2xl font-bold tracking-tight'
              style={{ color: colors.primary }}
            >
              Student Information
            </h2>
            <p
              className='text-xs sm:text-sm mt-1 font-medium'
              style={{ color: colors.tertiary }}
            >
              Please provide your personal details
            </p>
          </div>
        </div>

        <div className='mb-4 group'>
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
          <div className='mb-4 p-3 rounded-xl border-2 border-amber-400 bg-amber-50 animate-in fade-in duration-300'>
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
          <div className='mb-4 p-3 rounded-xl border border-blue-200 bg-blue-50 animate-pulse'>
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

        <div className='grid grid-cols-1 md:grid-cols-3 gap-4 mb-4'>
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

        <div className='grid grid-cols-1 md:grid-cols-3 gap-4 mb-4'>
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

        <div className='mb-4'>
          <label
            className='block text-sm font-semibold mb-2 ml-1'
            style={{ color: colors.primary }}
          >
            Birthplace
          </label>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
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
                {[
                  ...((selectedBirthplaceProvince &&
                  !birthplaceProvinces.includes(selectedBirthplaceProvince)
                    ? [selectedBirthplaceProvince]
                    : []) as string[]),
                  ...birthplaceProvinces,
                ].map((province) => (
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
                {[
                  ...((selectedBirthplaceCity &&
                  !birthplaceCities.some(
                    (item) =>
                      normalizeText(item.name) ===
                      normalizeText(selectedBirthplaceCity),
                  )
                    ? [
                        {
                          name: selectedBirthplaceCity,
                          type: "City/Municipality",
                          code: `custom-bp-${selectedBirthplaceCity}`,
                        },
                      ]
                    : []) as Array<{ name: string; type: string; code: string }>),
                  ...birthplaceCities,
                ].map((item) => (
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
          </div>
          {fieldErrors.birthplace && (
            <p className='text-red-500 text-xs mt-1 ml-1'>
              {fieldErrors.birthplace}
            </p>
          )}
        </div>

        <div className='mb-4'>
          <label
            className='block text-sm font-semibold mb-2 ml-1'
            style={{ color: colors.primary }}
          >
            Complete Address
          </label>
          <div className='group'>
            <input
              name='complete_address'
              data-field='complete_address'
              type='text'
              value={formData.complete_address || ""}
              onChange={(e) =>
                handleInputChange("complete_address", e.target.value.toUpperCase())
              }
              disabled={isFormDisabled}
              className={`${inputClasses} ${isFormDisabled ? disabledClasses : ""} ${fieldErrors.complete_address ? "border-red-500" : ""}`}
              style={getInputStyle("complete_address")}
              onFocus={(e) => !isFormDisabled && handleFocus(e, "complete_address")}
              onBlur={(e) => handleBlur(e, "complete_address")}
              placeholder='e.g. 90 CONGRESSIONAL SITIO 3 BATASAN HILLS, QUEZON CITY, METRO MANILA'
            />
          </div>

          {fieldErrors.complete_address && (
            <p className='text-red-500 text-xs mt-1 ml-1'>
              {fieldErrors.complete_address}
            </p>
          )}
        </div>

        <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
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
