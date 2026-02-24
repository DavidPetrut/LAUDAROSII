let toastHandler = null;
let confirmHandler = null;

export const setToastHandler = (handler) => {
  toastHandler = handler;
};

export const setConfirmHandler = (handler) => {
  confirmHandler = handler;
};

/**
 * Afișează un toast
 * @param {string} type - Tipul toast-ului (success, error, info, warning)
 * @param {string} title - Titlul toast-ului
 * @param {string} message - Mesajul toast-ului
 * @param {object} options - Opțiuni adiționale
 * @param {function} options.onPress - Callback când se apasă pe toast
 * @param {number} options.duration - Durata în ms (default: 3000)
 * @param {any} options.icon - Icon custom pentru toast
 */
export const showToast = (type, title, message, options = {}) => {
  if (toastHandler) {
    toastHandler(type, title, message, options);
  }
};

export const showSuccess = (message, options = {}) => {
  if (toastHandler) {
    toastHandler("success", message, "", options);
  }
};

export const showError = (message, options = {}) => {
  if (toastHandler) {
    toastHandler("error", message, "", options);
  }
};

export const showWarning = (message, options = {}) => {
  if (toastHandler) {
    toastHandler("info", message, "", options);
  }
};

export const showInfo = (message, options = {}) => {
  if (toastHandler) {
    toastHandler("info", message, "", options);
  }
};

/**
 * Afișează un toast pentru notificare de misiune nouă
 * @param {string} adminName - Numele adminului care a creat misiunea
 * @param {function} onPress - Callback când se apasă pe toast
 */
export const showMissionNotification = (adminName, onPress) => {
  if (toastHandler) {
    toastHandler("info", `${adminName} a adăugat o misiune nouă`, "", {
      onPress,
      duration: 5000,
      icon: "mission",
    });
  }
};

export const showConfirm = (title, message, onConfirm, onCancel) => {
  if (confirmHandler) {
    confirmHandler({
      title,
      message,
      confirmText: "Da",
      cancelText: "Anulează",
      onConfirm,
      onCancel,
    });
  }
};
