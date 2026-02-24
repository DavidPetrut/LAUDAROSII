export const validateEmail = (email) => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
};

export const validatePassword = (password) => {
  return password && password.length >= 6;
};

export const validateRequired = (value) => {
  return value && value.toString().trim().length > 0;
};

export const validatePhone = (phone) => {
  const regex = /^[0-9]{10}$/;
  return regex.test(phone.replace(/\s/g, ""));
};

export const getValidationError = (field, value) => {
  switch (field) {
    case "email":
      if (!value) return "Email-ul este obligatoriu";
      if (!validateEmail(value)) return "Email invalid";
      return null;
    case "password":
      if (!value) return "Parola este obligatorie";
      if (!validatePassword(value))
        return "Parola trebuie sa aiba minim 6 caractere";
      return null;
    case "fullName":
      if (!value) return "Numele este obligatoriu";
      return null;
    default:
      return null;
  }
};
