import { colors } from "../colors";

export const getFormStyles = (customColors?: {
  primary?: string;
  accent?: string;
}) => {
  const primaryColor = customColors?.primary || colors.primary;
  const accentColor = customColors?.accent || colors.accent;

  return `
    .custom-focus:focus {
      outline: none;
      border-color: ${accentColor} !important;
      box-shadow: 0 0 0 3px ${accentColor}1A !important;
    }
    .custom-checkbox:checked {
      accent-color: ${primaryColor};
    }
    .custom-radio:checked {
      accent-color: ${primaryColor};
    }
    input::placeholder,
    textarea::placeholder {
      color: #999999 !important;
      opacity: 0.7;
    }
  `;
};

export const defaultFormStyles = getFormStyles();

