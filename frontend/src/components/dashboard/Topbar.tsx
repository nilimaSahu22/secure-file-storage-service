import { useState } from "react";
import { LogOut } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { IconButton } from "../ui/IconButton";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";

export function Topbar() {
  const { user, logout } = useAuth();
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <header className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
      <div className="text-sm text-gray-500">
        Signed in as <span className="font-medium text-gray-900">{user?.email}</span>
      </div>
      <IconButton icon={LogOut} label="Log out" onClick={() => setConfirmOpen(true)} />

      <Modal open={confirmOpen} onClose={() => setConfirmOpen(false)} title="Log out?">
        <p className="mb-6 text-sm text-gray-500">
          You'll need to log in again to access your files.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="outlined" onClick={() => setConfirmOpen(false)}>
            Cancel
          </Button>
          <Button onClick={() => logout()}>Log out</Button>
        </div>
      </Modal>
    </header>
  );
}
