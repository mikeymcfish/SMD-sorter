// Electronic schematic symbol components as SVG icons

export const ResistorIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M2 12h3m14 0h3M7 12h2l1-3 2 6 2-6 2 6 1-3h2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const CapacitorIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M2 12h7m6 0h7M9 6v12m6-12v12" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const InductorIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M2 12h2c1 0 2-1 2-2s1-2 2-2 2 1 2 2-1 2-2 2-2 1-2 2 1 2 2 2 2-1 2-2h2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const TransistorIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M12 2v6m0 8v6M8 10h8l-4 4-4-4z" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
);

export const DiodeIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M2 12h6m8 0h6M8 6v12l8-6-8-6z" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const ICIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <rect x="6" y="4" width="12" height="16" rx="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M9 2v2m6-2v2M9 20v2m6-2v2M4 8h2m16 0h-2M4 16h2m16 0h-2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const CrystalIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <rect x="8" y="6" width="8" height="12" rx="1" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M6 8v8m12-8v8M2 10h4m16 0h-4M2 14h4m16 0h-4" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const ConnectorIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <rect x="6" y="4" width="12" height="16" rx="2" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="10" cy="8" r="1" fill="currentColor"/>
    <circle cx="14" cy="8" r="1" fill="currentColor"/>
    <circle cx="10" cy="12" r="1" fill="currentColor"/>
    <circle cx="14" cy="12" r="1" fill="currentColor"/>
    <circle cx="10" cy="16" r="1" fill="currentColor"/>
    <circle cx="14" cy="16" r="1" fill="currentColor"/>
  </svg>
);

export const SwitchIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M2 12h6m8 0h6M8 12l6-4" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="8" cy="12" r="1" fill="currentColor"/>
    <circle cx="16" cy="8" r="1" fill="currentColor"/>
  </svg>
);

export const LEDIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M2 12h6m8 0h6M8 6v12l8-6-8-6z" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M14 4l2 2m-2 2l2 2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const SensorIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <circle cx="12" cy="12" r="6" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="12" cy="12" r="2" fill="currentColor"/>
    <path d="M12 2v2m0 16v2M2 12h2m16 0h2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const OtherIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <circle cx="12" cy="12" r="6" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M12 8v4l2 2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const getIconForCategory = (category: string) => {
  const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
    resistor: ResistorIcon,
    capacitor: CapacitorIcon,
    inductor: InductorIcon,
    transistor: TransistorIcon,
    diode: DiodeIcon,
    ic: ICIcon,
    crystal: CrystalIcon,
    connector: ConnectorIcon,
    switch: SwitchIcon,
    led: LEDIcon,
    sensor: SensorIcon,
    other: OtherIcon,
  };
  
  return iconMap[category] || OtherIcon;
};