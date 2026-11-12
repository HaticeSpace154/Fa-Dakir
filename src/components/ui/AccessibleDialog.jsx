import React from 'react';
import { Dialog } from '@base-ui/react/dialog';
import './AccessibleDialog.css';

export default function AccessibleDialog({
  open,
  onClose,
  label,
  backdropClassName = '',
  viewportClassName = '',
  popupClassName = '',
  dir = 'rtl',
  children,
}) {
  return (
    <Dialog.Root open={open} onOpenChange={(nextOpen) => { if (!nextOpen) onClose?.(); }}>
      <Dialog.Portal>
        <Dialog.Backdrop className={`base-ui-dialog-backdrop ${backdropClassName}`} />
        <Dialog.Viewport className={`base-ui-dialog-viewport ${viewportClassName}`}>
          <Dialog.Popup className={`base-ui-dialog-popup ${popupClassName}`} aria-label={label} dir={dir}>
            {children}
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
