import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";
import { GlobalToast } from "../components/GlobalToast";
import { ConfirmModal } from "../components/ConfirmModal";
import { setToastHandler, setConfirmHandler } from "../functions/toast";

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toast, setToast] = useState({
    visible: false,
    type: "success",
    title: "",
    message: "",
    onPress: null,
    duration: 3000,
    icon: null,
  });
  const [confirm, setConfirm] = useState({
    visible: false,
    title: "",
    message: "",
    confirmText: "Confirm",
    cancelText: "Renunță",
    isDestructive: false,
    onConfirm: null,
  });

  const showToast = useCallback((type, title, message = "", options = {}) => {
    setToast({
      visible: true,
      type,
      title,
      message,
      onPress: options.onPress || null,
      duration: options.duration || 3000,
      icon: options.icon || null,
    });
  }, []);

  const hideToast = useCallback(() => {
    setToast((prev) => ({ ...prev, visible: false }));
  }, []);

  const showSuccess = useCallback(
    (title, message) => {
      showToast("success", title, message);
    },
    [showToast]
  );

  const showError = useCallback(
    (title, message) => {
      showToast("error", title, message);
    },
    [showToast]
  );

  const showInfo = useCallback(
    (title, message) => {
      showToast("info", title, message);
    },
    [showToast]
  );

  const showConfirm = useCallback((options) => {
    return new Promise((resolve) => {
      setConfirm({
        visible: true,
        title: options.title || "Confirmare",
        message: options.message || "Ești sigur?",
        confirmText: options.confirmText || "Confirm",
        cancelText: options.cancelText || "Renunță",
        confirmColor: options.confirmColor || "#10b981",
        isDestructive: options.isDestructive || false,
        onConfirm: () => {
          setConfirm((prev) => ({ ...prev, visible: false }));
          resolve(true);
          options.onConfirm?.();
        },
        onCancel: () => {
          setConfirm((prev) => ({ ...prev, visible: false }));
          resolve(false);
          options.onCancel?.();
        },
      });
    });
  }, []);

  const hideConfirm = useCallback(() => {
    setConfirm((prev) => ({ ...prev, visible: false }));
  }, []);

  useEffect(() => {
    setToastHandler(showToast);
    setConfirmHandler(showConfirm);
  }, [showToast, showConfirm]);

  return (
    <ToastContext.Provider
      value={{ showToast, showSuccess, showError, showInfo, showConfirm }}
    >
      {children}
      <GlobalToast
        visible={toast.visible}
        type={toast.type}
        title={toast.title}
        message={toast.message}
        onClose={hideToast}
        onPress={toast.onPress}
        duration={toast.duration}
        icon={toast.icon}
      />
      <ConfirmModal
        visible={confirm.visible}
        title={confirm.title}
        message={confirm.message}
        confirmText={confirm.confirmText}
        cancelText={confirm.cancelText}
        confirmColor={confirm.confirmColor}
        isDestructive={confirm.isDestructive}
        onConfirm={confirm.onConfirm}
        onCancel={confirm.onCancel || hideConfirm}
      />
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
};
