// Local Trip mark: three nested contour rings (a tiny "summit" from the contour art) on cobalt.
// The same drawing is the browser-tab icon in public/favicon.svg.
export default function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" aria-hidden className={className}>
      <rect width="32" height="32" rx="9" className="fill-accent-600" />
      <g stroke="#fff" strokeLinecap="round" strokeLinejoin="round">
        <path
          strokeWidth="1.6"
          d="M16 5.5c5.2-.6 10 3.300 10.600 8.800.6 5.600-2.900 11-8.600 12-5.900 1-11.700-2.600-12.500-8.600C4.700 11.600 9.800 6.200 16 5.500Z"
        />
        <path
          strokeWidth="1.6"
          d="M16.300 10c3.200-.3 5.800 2 6.100 5.100.4 3.400-1.700 6.300-5 6.800-3.500.6-6.800-1.500-7.300-5-.5-3.600 2.500-6.600 6.200-6.900Z"
        />
        <path
          strokeWidth="1.8"
          d="M16.400 14.300c1.200-.1 2 .7 2.100 1.700.1 1.200-.7 2.100-1.900 2.300-1.300.2-2.400-.6-2.500-1.800-.2-1.200 1-2.100 2.300-2.200Z"
        />
      </g>
    </svg>
  )
}
