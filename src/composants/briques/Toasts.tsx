'use client';

import { Toaster } from 'sonner';

/** Les messages de la maquette (ex-.toast) : sonner les place, la brique les dessine. */
const TOAST = 'flex items-center gap-2 rounded-xs bg-ink px-3.75 py-2.25 text-13 text-paper shadow-ombre-toast animate-monte [&_b]:font-medium [&_b]:text-accent-2';

export function Toasts() {
	return (
		<Toaster position="bottom-center" duration={3600} gap={8}
			toastOptions={{ unstyled: true, classNames: { toast: TOAST, title: '', description: '' } }} />
	);
}
