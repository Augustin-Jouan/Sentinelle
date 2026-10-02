import Link from 'next/link';
import type { ComponentProps, ComponentPropsWithRef } from 'react';
import { cx } from './cx';

/** Une action discrète, soulignée au survol, même dans un en-tête en capitales (ex-.dm-th-action). */
const CLASSES = 'cursor-pointer border-0 bg-transparent p-0 font-sans text-11 font-medium tracking-normal normal-case text-accent-2 no-underline hover:underline';

type Props =
	| (Omit<ComponentPropsWithRef<'button'>, 'className'> & { href?: undefined; className?: string })
	| (Omit<ComponentProps<typeof Link>, 'className'> & { className?: string });

export function LienAction(props: Props) {
	if (props.href === undefined) {
		const { className, type = 'button', ...reste } = props;
		return <button {...reste} type={type} className={cx(CLASSES, className)} />;
	}
	const { className, ...reste } = props;
	return <Link {...reste} className={cx(CLASSES, className)} />;
}
