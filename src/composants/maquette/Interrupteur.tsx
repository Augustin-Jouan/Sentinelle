/** L'interrupteur de la maquette (.switch) : une case à cocher habillée. */
export function Interrupteur({ coche, onChange, children, id }: { coche: boolean; onChange: (v: boolean) => void; children: React.ReactNode; id?: string }) {
	return (
		<label className="switch">
			<input type="checkbox" id={id} checked={coche} onChange={(e) => onChange(e.target.checked)} />
			<span className="switch-box" aria-hidden="true" />
			{children}
		</label>
	);
}
