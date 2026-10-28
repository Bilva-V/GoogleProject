// Material Symbols (Rounded, weight 400), bundled as inline SVG so nothing is fetched at runtime.

import { memo } from 'react';
import Search from '@material-symbols/svg-400/rounded/search.svg?raw';
import Close from '@material-symbols/svg-400/rounded/close.svg?raw';
import Tune from '@material-symbols/svg-400/rounded/tune.svg?raw';
import Add from '@material-symbols/svg-400/rounded/add.svg?raw';
import ContentCopy from '@material-symbols/svg-400/rounded/content_copy.svg?raw';
import ArrowBack from '@material-symbols/svg-400/rounded/arrow_back.svg?raw';
import ArrowForward from '@material-symbols/svg-400/rounded/arrow_forward.svg?raw';
import Download from '@material-symbols/svg-400/rounded/download.svg?raw';
import Upload from '@material-symbols/svg-400/rounded/upload.svg?raw';
import Check from '@material-symbols/svg-400/rounded/check.svg?raw';
import Info from '@material-symbols/svg-400/rounded/info.svg?raw';
import ManageSearch from '@material-symbols/svg-400/rounded/manage_search.svg?raw';
import AddCircle from '@material-symbols/svg-400/rounded/add_circle.svg?raw';
import CleaningServices from '@material-symbols/svg-400/rounded/cleaning_services.svg?raw';
import Monitoring from '@material-symbols/svg-400/rounded/monitoring.svg?raw';
import Rule from '@material-symbols/svg-400/rounded/rule.svg?raw';
import CompareArrows from '@material-symbols/svg-400/rounded/compare_arrows.svg?raw';
import ManageSearchFill from '@material-symbols/svg-400/rounded/manage_search-fill.svg?raw';
import AddCircleFill from '@material-symbols/svg-400/rounded/add_circle-fill.svg?raw';
import CleaningServicesFill from '@material-symbols/svg-400/rounded/cleaning_services-fill.svg?raw';
import MonitoringFill from '@material-symbols/svg-400/rounded/monitoring-fill.svg?raw';
import RuleFill from '@material-symbols/svg-400/rounded/rule-fill.svg?raw';

const ICONS = {
  search: Search,
  close: Close,
  tune: Tune,
  add: Add,
  content_copy: ContentCopy,
  arrow_back: ArrowBack,
  arrow_forward: ArrowForward,
  download: Download,
  upload: Upload,
  check: Check,
  info: Info,
  manage_search: ManageSearch,
  add_circle: AddCircle,
  cleaning_services: CleaningServices,
  monitoring: Monitoring,
  rule: Rule,
  compare_arrows: CompareArrows,
  'manage_search-fill': ManageSearchFill,
  'add_circle-fill': AddCircleFill,
  'cleaning_services-fill': CleaningServicesFill,
  'monitoring-fill': MonitoringFill,
  'rule-fill': RuleFill,
} as const;

export type IconName = keyof typeof ICONS;

export const Icon = memo(function Icon({ name, size = 20, className }: { name: IconName; size?: number; className?: string }) {
  return (
    <span
      className={`icon${className ? ` ${className}` : ''}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: ICONS[name] }}
    />
  );
});
