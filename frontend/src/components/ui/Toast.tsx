import toast, { Toaster } from "react-hot-toast";

export const showToast = {
  success: (message: string) => toast.success(message),
  error: (message: string) => toast.error(message),
};

export function ToastHost() {
  return <Toaster position="top-right" toastOptions={{ duration: 3000 }} />;
}
