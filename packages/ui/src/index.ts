// Tokens & helpers
export * from './tokens/index';
export { cn } from './lib/cn';
export { contrastRatio, luminance } from './lib/contrast';
export { useFinePointer, useInView, useMediaQuery, usePrefersReducedMotion } from './lib/hooks';
export { localizePath, parseLocalePath, type UiLocale } from './lib/locale-path';
export { type Accent, type Surface, accentBg, surfaceBg, surfaceVar } from './lib/worlds';

// Brand
export { BrandMark, Logo, type BrandMarkProps, type LogoProps } from './components/brand-mark';

// Illustration & icons
export { Icon, type IconName } from './components/art/icon';
export { DeskScene, Spot, type SpotName } from './components/art/spot';

// Primitives
export { Button, type ButtonProps } from './components/button';
export { Chip, type ChipProps } from './components/chip';
export { Card, type CardProps } from './components/card';
export { Tilt, type TiltProps } from './components/tilt';

// Layout primitives
export { Container, type ContainerProps } from './components/container';

// Layout & content
export { BentoGrid, type BentoGridProps } from './components/bento-grid';
export { MediaCard, type MediaCardProps } from './components/media-card';
export { SectionSheet, type SectionSheetProps } from './components/section-sheet';
export { WorldBackground } from './components/world-background';
export {
  StatCard,
  StatCardStack,
  type Stat,
  type StatCardStackProps,
} from './components/stat-card-stack';
export {
  Timeline,
  groupByYear,
  milestoneWorld,
  type Milestone,
  type MilestoneType,
  type TimelineProps,
} from './components/timeline';

// Motion & texture
export { Squiggle, type SquiggleProps } from './components/squiggle';
export { Blob, type BlobProps } from './components/blob';
export {
  Marquee,
  MarqueePill,
  MarqueeWord,
  type MarqueePillProps,
  type MarqueeProps,
  type MarqueeRow,
} from './components/marquee';
export { GrainOverlay } from './components/grain-overlay';
export { CustomCursor } from './components/custom-cursor';

// Chrome
export {
  FloatingNav,
  nextNavState,
  type FloatingNavProps,
  type NavVisibility,
} from './components/floating-nav';
export { MenuSheet, MobileMenuSheet, type MenuSheetProps } from './components/menu-sheet';
export { Footer, type FooterProps } from './components/footer';
export {
  CommandPalette,
  openCommandPalette,
  type CommandGroup,
  type CommandItem,
  type CommandPaletteProps,
} from './components/command-palette';
export { ThemeToggle, applyTheme, resolveTheme, type Theme } from './components/theme';
export { ThemeScript, THEME_STORAGE_KEY } from './components/theme-script';
export { LocaleSwitch } from './components/locale-switch';
export {
  ConsentBanner,
  type ConsentBannerProps,
  type ConsentChoice,
} from './components/consent-banner';
export { isActivePath, type NavGroup, type NavLink } from './components/nav-types';

// App UI (admin & customer portals)
export {
  AppAccount,
  AppShell,
  activeHref,
  type AppNavItem,
  type AppNavSection,
  type AppShellProps,
} from './app/app-shell';
export {
  ActionButton,
  Checkbox,
  Field,
  Input,
  SearchInput,
  Select,
  Spinner,
  Textarea,
  type ActionButtonProps,
  type FieldProps,
} from './app/controls';
export { ConfirmDialog, Dialog, type ConfirmDialogProps, type DialogProps } from './app/dialog';
export { DataTable, LoadMore, type Column, type DataTableProps } from './app/data-table';
export { EmptyState, ErrorState, LoadingState, Notice, type EmptyStateProps } from './app/feedback';
export {
  DescriptionList,
  FilterChips,
  PageHeader,
  Section,
  StatRow,
  Tabs,
  type PageHeaderProps,
} from './app/page';
export {
  StatusBadge,
  statusLabel,
  statusTone,
  type StatusBadgeProps,
  type StatusTone,
} from './app/status';
export {
  CopyButton,
  FileDrop,
  OrderSummary,
  SupportConversation,
  type ConversationMessage,
  type OrderSummaryLine,
} from './app/commerce';
export {
  formatBytes,
  formatDate,
  formatDateTime,
  formatMoney,
  formatRelative,
  formatTotals,
  humanize,
} from './app/format';
