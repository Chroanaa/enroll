
export const formatTerm = (term: string | null | undefined): string => {
  if (!term) return "N/A";
  

  const normalized = term.toLowerCase().trim();
  

  if (normalized === "first" || normalized === "1st semester" || normalized === "1st") {
    return "First";
  }
  if (normalized === "second" || normalized === "2nd semester" || normalized === "2nd") {
    return "Second";
  }
  if (normalized === "summer") {
    return "Summer";
  }
  
  return term.charAt(0).toUpperCase() + term.slice(1).toLowerCase();
};


export const normalizeTerm = (term: string | null | undefined): string | null => {
  if (!term) return null;
  
  const normalized = term.toLowerCase().trim();
  

  if (normalized === "first" || normalized === "1st semester" || normalized === "1st") {
    return "first";
  }
  if (normalized === "second" || normalized === "2nd semester" || normalized === "2nd") {
    return "second";
  }
  if (normalized === "summer") {
    return "summer";
  }
  
  return normalized;
};

