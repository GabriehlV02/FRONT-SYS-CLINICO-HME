import type { ReactNode, SVGProps } from 'react';

export type IconName = 'home' | 'package' | 'asset' | 'audit' | 'building' | 'fileText' | 'users' | 'patient' | 'userCheck' | 'lab' | 'logout' | 'search' | 'bell' | 'warehouse' | 'settings' | 'menu' | 'close' | 'chevronDown' | 'chevronRight' | 'chevronLeft' | 'plus' | 'check' | 'arrowRight' | 'sparkles' | 'eye' | 'eyeOff' | 'image' | 'camera' | 'calendar' | 'edit' | 'trash';
type Props = SVGProps<SVGSVGElement> & { name: IconName; size?: number };

const paths: Record<IconName, ReactNode> = {
  home: <><path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10M9 20v-6h6v6"/></>,
  package: <><path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z"/><path d="m4.5 7.5 7.5 4 7.5-4M12 11.5V21"/></>,
  asset: <><rect x="3" y="6" width="18" height="14" rx="2"/><path d="M8 6V4h8v2M3 11h18M8 15h3m3 0h2"/><circle cx="6" cy="9" r=".5" fill="currentColor"/></>,
  audit: <><path d="M9 5H6a2 2 0 0 0-2 2v13h13v-3M9 3h6v4H9z"/><circle cx="16" cy="12" r="4"/><path d="m19 15 3 3m-7-6 1 1 2-2"/></>,
  building: <><path d="M4 21V5l8-3v19M12 8h8v13M8 7v1m0 4v1m0 4v1m8-6v1m0 4v1M2 21h20"/></>,
  fileText: <><path d="M6 2h8l4 4v16H6z"/><path d="M14 2v5h5M9 12h6m-6 4h6"/></>,
  users: <><circle cx="12" cy="12" r="10"/><circle cx="12" cy="8" r="3.25" fill="currentColor" stroke="none"/><path d="M3.85 20.15C4.65 14.85 7.75 12 12 12s7.35 2.85 8.15 8.15A10.05 10.05 0 0 1 12 22a10.05 10.05 0 0 1-8.15-1.85Z" fill="currentColor" stroke="none"/></>,
  patient: <><circle cx="10" cy="7.5" r="3.25"/><path d="M3.5 20v-1.2a6.5 6.5 0 0 1 11.8-3.8"/><circle cx="17.5" cy="16.5" r="4"/><path d="M17.5 14.4v4.2m-2.1-2.1h4.2"/></>,
  userCheck: <><circle cx="9" cy="7.5" r="3.25"/><path d="M2.5 20v-1.2A6.5 6.5 0 0 1 14 14.65"/><path d="m15.2 18 2 2 4.3-5"/></>,
  lab: <><path d="M9 3h6"/><path d="M10 3v5.2l-5.5 9.3A2.3 2.3 0 0 0 6.5 21h11a2.3 2.3 0 0 0 2-3.5L14 8.2V3"/><path d="M7.2 16h9.6"/><path d="M9.4 12.2h5.2"/><circle cx="10" cy="18" r=".5" fill="currentColor"/><circle cx="14" cy="18" r=".5" fill="currentColor"/></>,
  logout: <><path d="m10 17 5-5-5-5m5 5H3"/><path d="M15 3h5a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1h-5"/></>,
  search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
  bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></>,
  warehouse: <><path d="M3 21V9l9-6 9 6v12M7 21v-8h10v8M7 16h10"/></>,
  settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.1V21h-4v-.1A1.7 1.7 0 0 0 8.6 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1.1-.4H3v-4h.1A1.7 1.7 0 0 0 4.6 8.6a1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1.1V3h4v.1A1.7 1.7 0 0 0 15.4 4a1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.4 9c.16.38.38.72.66 1 .3.27.68.42 1.08.4H21v4h-.1a1.7 1.7 0 0 0-1.5.6Z"/></>,
  menu: <path d="M4 6h16M4 12h16M4 18h16"/>, close: <path d="m6 6 12 12M18 6 6 18"/>,
  chevronDown: <path d="m7 10 5 5 5-5"/>, chevronRight: <path d="m9 18 6-6-6-6"/>, chevronLeft: <path d="m15 18-6-6 6-6"/>,
  plus: <path d="M12 5v14M5 12h14"/>, check: <path d="m5 12 4 4L19 6"/>,
  arrowRight: <path d="M5 12h14m-6-6 6 6-6 6"/>,
  sparkles: <><path d="m12 3-1.1 3.1a3 3 0 0 1-1.8 1.8L6 9l3.1 1.1a3 3 0 0 1 1.8 1.8L12 15l1.1-3.1a3 3 0 0 1 1.8-1.8L18 9l-3.1-1.1a3 3 0 0 1-1.8-1.8L12 3Z"/><path d="m19 16-.5 1.5L17 18l1.5.5L19 20l.5-1.5L21 18l-1.5-.5L19 16Z"/></>,
  eye: <><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"/><circle cx="12" cy="12" r="2.7"/></>,
  eyeOff: <><path d="m3 3 18 18"/><path d="M10.6 6.15A9.8 9.8 0 0 1 12 6c6 0 9.5 6 9.5 6a15.7 15.7 0 0 1-2.1 2.7M6.2 6.2C3.8 7.8 2.5 12 2.5 12s3.5 6 9.5 6a9.7 9.7 0 0 0 3.1-.5M9.9 9.9a3 3 0 0 0 4.2 4.2"/></>,
  image: <><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-5-5L5 20"/></>,
  camera: <><path d="M4 7h3l2-3h6l2 3h3a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2Z"/><circle cx="12" cy="13" r="4"/></>
  ,calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4m8-4v4M3 10h18"/><path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01"/></>
  ,edit: <><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z"/></>,
  trash: <><path d="M4 7h16M9 7V4h6v3m3 0-1 14H7L6 7m4 4v6m4-6v6"/></>
};

export default function Icon({ name, size = 20, ...props }: Props) {
  return <svg aria-hidden="true" viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>{paths[name]}</svg>;
}
