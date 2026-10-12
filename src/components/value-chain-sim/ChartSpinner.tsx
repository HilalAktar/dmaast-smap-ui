export default function ChartSpinner() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 42, color: 'var(--text3)' }}>
      <div
        className="spinner"
        style={{
          width: 28,
          height: 28,
          border: '3px solid var(--border)',
          borderTopColor: 'var(--accent)',
          borderRadius: '50%',
          animation: 'vcdt-spin .8s linear infinite',
          marginRight: 12,
        }}
      />
      Loading charts…
    </div>
  );
}
