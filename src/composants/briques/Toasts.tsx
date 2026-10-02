'use client';

import { Toaster } from 'sonner';

export function Toasts() {
	return (
		<Toaster position="bottom-center" duration={3600} gap={8}
			toastOptions={{ unstyled: true, classNames: { toast: 'toast', title: '', description: '' } }} />
	);
}
