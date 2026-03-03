// Philippine Address Utility using PSGC Cloud API
// API Documentation: https://psgc.cloud/api-docs
// Using Next.js API routes for caching and error handling

import Axios from "axios";

const API_BASE = "/api/psgc";

// Cache for API responses to avoid repeated calls
const cache: {
  regions?: PSGCRegion[];
  provinces?: PSGCProvince[];
  cities?: PSCGCity[];
  municipalities?: PSGCMunicipality[];
  barangays?: PSGCBarangay[];
  citiesByProvince: Record<string, PSCGCity[]>;
  municipalitiesByProvince: Record<string, PSGCMunicipality[]>;
  barangaysByCity: Record<string, PSGCBarangay[]>;
} = {
  citiesByProvince: {},
  municipalitiesByProvince: {},
  barangaysByCity: {},
};

// Type definitions based on PSGC API
export interface PSGCRegion {
  code: string;
  name: string;
}

export interface PSGCProvince {
  code: string;
  name: string;
  region_code?: string;
}

export interface PSCGCity {
  code: string;
  name: string;
  type?: string;
  district?: string;
  zip_code?: string;
  region_code?: string;
  province_code?: string;
}

export interface PSGCMunicipality {
  code: string;
  name: string;
  type?: string;
  district?: string;
  zip_code?: string;
  region_code?: string;
  province_code?: string;
}

export interface PSGCBarangay {
  code: string;
  name: string;
  status?: string;
}

// Fetch regions (not currently used, but available for future use)
export const fetchRegions = async (): Promise<PSGCRegion[]> => {
  if (cache.regions) {
    return cache.regions;
  }
  try {
    // Note: Regions endpoint not yet implemented in API routes
    // Direct call to PSGC API (can be moved to API route later)
    const response = await Axios.get<PSGCRegion[]>(
      "https://psgc.cloud/api/regions",
    );
    cache.regions = response.data;
    return response.data;
  } catch (error) {
    console.error("Error fetching regions:", error);
    return [];
  }
};

// Fetch provinces
export const fetchProvinces = async (): Promise<PSGCProvince[]> => {
  if (cache.provinces) {
    return cache.provinces;
  }
  try {
    const response = await Axios.get<{ data: PSGCProvince[] }>(
      `${API_BASE}/provinces`,
    );
    cache.provinces = response.data.data;
    return response.data.data;
  } catch (error) {
    console.error("Error fetching provinces:", error);
    return [];
  }
};

// Fetch cities (all cities)
export const fetchCities = async (): Promise<PSCGCity[]> => {
  if (cache.cities) {
    return cache.cities;
  }
  try {
    const response = await Axios.get<{ data: PSCGCity[] }>(
      `${API_BASE}/cities`,
    );
    cache.cities = response.data.data;
    return response.data.data;
  } catch (error) {
    console.error("Error fetching cities:", error);
    return [];
  }
};

// Fetch NCR cities using the v2 regions endpoint
// More efficient than fetching all cities and filtering
// API endpoint: https://psgc.cloud/api/v2/regions/1300000000/cities
export const fetchNCRCities = async (): Promise<PSCGCity[]> => {
  try {
    // Use the v2 API endpoint: /v2/regions/1300000000/cities
    // Note: API URL uses 1300000000 (with extra zero at the end)
    const response = await Axios.get<{ data: PSCGCity[] }>(
      `${API_BASE}/regions/1300000000/cities`,
    );
    return response.data.data || [];
  } catch (error) {
    console.error("Error fetching NCR cities:", error);
    return [];
  }
};

// Fetch cities for a specific province using the v2 provinces endpoint
// API endpoint: https://psgc.cloud/api/v2/provinces/{provinceCode}/cities
export const fetchProvinceCities = async (
  provinceCode: string,
): Promise<PSCGCity[]> => {
  try {
    const response = await Axios.get<{ data: PSCGCity[] }>(
      `${API_BASE}/provinces/${provinceCode}/cities`,
    );
    return response.data.data || [];
  } catch (error) {
    console.error(`Error fetching cities for province ${provinceCode}:`, error);
    return [];
  }
};

// Fetch municipalities for a specific province using the v2 provinces endpoint
// API endpoint: https://psgc.cloud/api/v2/provinces/{provinceCode}/municipalities
export const fetchProvinceMunicipalities = async (
  provinceCode: string,
): Promise<PSGCMunicipality[]> => {
  try {
    const response = await Axios.get<{ data: PSGCMunicipality[] }>(
      `${API_BASE}/provinces/${provinceCode}/municipalities`,
    );
    return response.data.data || [];
  } catch (error) {
    console.error(
      `Error fetching municipalities for province ${provinceCode}:`,
      error,
    );
    return [];
  }
};

// Fetch municipalities
export const fetchMunicipalities = async (): Promise<PSGCMunicipality[]> => {
  if (cache.municipalities) {
    return cache.municipalities;
  }
  try {
    const response = await Axios.get<{ data: PSGCMunicipality[] }>(
      `${API_BASE}/municipalities`,
    );
    cache.municipalities = response.data.data;
    return response.data.data;
  } catch (error) {
    console.error("Error fetching municipalities:", error);
    return [];
  }
};

// Fetch barangays
export const fetchBarangays = async (
  cityCode?: string,
): Promise<PSGCBarangay[]> => {
  const cacheKey = cityCode || "all";
  if (cache.barangays && !cityCode) {
    return cache.barangays;
  }
  try {
    const url = cityCode
      ? `${API_BASE}/barangays?cityCode=${cityCode}`
      : `${API_BASE}/barangays`;
    const response = await Axios.get<{ data: PSGCBarangay[] }>(url);
    if (!cityCode) {
      cache.barangays = response.data.data;
    }
    return response.data.data;
  } catch (error) {
    console.error("Error fetching barangays:", error);
    return [];
  }
};

// NCR region code constant
const NCR_REGION_CODE = "130000000";
const NCR_PROVINCE_NAME = "Metro Manila"; // Using "Metro Manila" as the derived province name

// Helper to check if a province name is NCR
export const isNCRProvince = (provinceName: string): boolean => {
  const upperName = provinceName.toUpperCase();
  return (
    upperName === "NCR" ||
    upperName === "METRO MANILA" ||
    upperName === "NATIONAL CAPITAL REGION"
  );
};

// Get provinces (sorted by name)
// Includes "Metro Manila" as a derived province for NCR (region_code = 130000000)
// Note: NCR has no official province level in PSGC, so we add "Metro Manila" as a derived value
export const getProvinces = async (): Promise<string[]> => {
  const provinces = await fetchProvinces();
  const provinceNames = provinces.map((p) => p.name);

  // Always add "Metro Manila" as a derived province for NCR
  // NCR (region_code = 130000000) has no province level in PSGC
  if (!provinceNames.includes(NCR_PROVINCE_NAME)) {
    provinceNames.push(NCR_PROVINCE_NAME);
  }

  return provinceNames.sort();
};

// Helper function to find province code by province name
const findProvinceCodeByName = async (
  provinceName: string,
): Promise<string | null> => {
  const provinces = await fetchProvinces();
  const province = provinces.find(
    (p) => p.name.toUpperCase() === provinceName.toUpperCase(),
  );
  return province?.code || null;
};

// Get cities and municipalities by province name
// Special handling for NCR (Metro Manila): filters by region_code = 130000000
// For other provinces: filters by province_code
export const getCitiesAndMunicipalitiesByProvince = async (
  provinceName: string,
): Promise<Array<{ name: string; type: string; code: string }>> => {
  if (!provinceName) return [];

  // Check cache first
  const cacheKey = provinceName.toUpperCase();
  if (
    cache.citiesByProvince[cacheKey] &&
    cache.municipalitiesByProvince[cacheKey]
  ) {
    return [
      ...cache.citiesByProvince[cacheKey].map((c) => ({
        name: c.name,
        type: c.type || "City",
        code: c.code,
      })),
      ...cache.municipalitiesByProvince[cacheKey].map((m) => ({
        name: m.name,
        type: m.type || "Municipality",
        code: m.code,
      })),
    ].sort((a, b) => a.name.localeCompare(b.name));
  }

  try {
    let filteredCities: PSCGCity[] = [];
    let filteredMunicipalities: PSGCMunicipality[] = [];

    // Special handling for NCR (Metro Manila)
    if (isNCRProvince(provinceName)) {
      // Use the dedicated v2 API endpoint for NCR cities (more efficient)
      filteredCities = await fetchNCRCities();
      // NCR typically doesn't have municipalities, only cities
      filteredMunicipalities = [];
    } else {
      // For other provinces, use the v2 provinces endpoint
      const provinceCode = await findProvinceCodeByName(provinceName);
      if (provinceCode) {
        // Use the dedicated v2 API endpoints for province cities and municipalities
        [filteredCities, filteredMunicipalities] = await Promise.all([
          fetchProvinceCities(provinceCode),
          fetchProvinceMunicipalities(provinceCode),
        ]);
      } else {
        // If province code not found, return empty array
        console.warn(`Province code not found for: ${provinceName}`);
        return [];
      }
    }

    // Store in cache
    cache.citiesByProvince[cacheKey] = filteredCities;
    cache.municipalitiesByProvince[cacheKey] = filteredMunicipalities;

    return [
      ...filteredCities.map((c) => ({
        name: c.name,
        type: c.type || "City",
        code: c.code,
      })),
      ...filteredMunicipalities.map((m) => ({
        name: m.name,
        type: m.type || "Municipality",
        code: m.code,
      })),
    ].sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    console.error("Error fetching cities/municipalities:", error);
    return [];
  }
};

// Get barangays by city/municipality code
export const getBarangaysByCityMunicipality = async (
  cityMunicipalityCode: string,
): Promise<string[]> => {
  if (!cityMunicipalityCode) return [];

  // Check cache
  if (cache.barangaysByCity[cityMunicipalityCode]) {
    return cache.barangaysByCity[cityMunicipalityCode]
      .map((b) => b.name)
      .sort();
  }

  try {
    // Fetch barangays (API route will filter by cityCode if supported)
    const barangays = await fetchBarangays(cityMunicipalityCode);

    // Store in cache
    cache.barangaysByCity[cityMunicipalityCode] = barangays;

    return barangays.map((b) => b.name).sort();
  } catch (error) {
    console.error("Error fetching barangays:", error);
    return [];
  }
};

// Simplified version: Get cities/municipalities (all, sorted)
export const getCitiesAndMunicipalities = async (): Promise<
  Array<{ name: string; type: string; code: string }>
> => {
  try {
    const [cities, municipalities] = await Promise.all([
      fetchCities(),
      fetchMunicipalities(),
    ]);

    return [
      ...cities.map((c) => ({
        name: c.name,
        type: c.type || "City",
        code: c.code,
      })),
      ...municipalities.map((m) => ({
        name: m.name,
        type: m.type || "Municipality",
        code: m.code,
      })),
    ].sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    console.error("Error fetching cities/municipalities:", error);
    return [];
  }
};

// Get barangays (all, sorted)
export const getBarangays = async (): Promise<string[]> => {
  try {
    const barangays = await fetchBarangays();
    return barangays.map((b) => b.name).sort();
  } catch (error) {
    console.error("Error fetching barangays:", error);
    return [];
  }
};

// Helper to find city/municipality code by name
export const findCityMunicipalityCode = async (
  name: string,
): Promise<string | null> => {
  try {
    const [cities, municipalities] = await Promise.all([
      fetchCities(),
      fetchMunicipalities(),
    ]);

    const city = cities.find(
      (c) => c.name.toUpperCase() === name.toUpperCase(),
    );
    if (city) return city.code;

    const municipality = municipalities.find(
      (m) => m.name.toUpperCase() === name.toUpperCase(),
    );
    if (municipality) return municipality.code;

    return null;
  } catch (error) {
    console.error("Error finding city/municipality code:", error);
    return null;
  }
};

// Legacy functions for backward compatibility
export const getCitiesByProvince = async (
  province: string,
): Promise<string[]> => {
  const items = await getCitiesAndMunicipalitiesByProvince(province);
  return items.map((item) => item.name);
};

export const getBarangaysByCity = async (
  province: string,
  city: string,
): Promise<string[]> => {
  // Find the city/municipality code
  const code = await findCityMunicipalityCode(city);
  if (!code) return [];

  // Get barangays by code
  return await getBarangaysByCityMunicipality(code);
};
