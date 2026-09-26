// Mhandisi Makini components — window.MhandisiMakini (React 18). Types are documentation.
import * as React from 'react';
export type IconName = 'search'|'pin'|'arrow'|'chevron'|'star'|'bolt'|'tap'|'bricks'|'roller'|'home'|'briefcase'|'clipboard'|'chat'|'heart'|'card'|'gear'|'user'|'bell'|'calendar'|'shield'|'users'|'alert';
export interface IconProps { name: IconName; size?: number; /** true = yellow fill (selected state), or a CSS colour */ filled?: boolean | string; /** accessible name; omit for decorative icons */ label?: string; className?: string; }
export declare function Icon(props: IconProps): React.ReactElement;
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> { variant?: 'primary'|'secondary'|'tertiary'|'destructive'; size?: 'sm'|'md'|'lg'; icon?: IconName; iconRight?: IconName; loading?: boolean; block?: boolean; href?: string; }
export declare function Button(props: ButtonProps): React.ReactElement;
export interface TextFieldProps extends React.InputHTMLAttributes<HTMLInputElement> { label: string; hideLabel?: boolean; icon?: IconName; trailingIcon?: IconName; hint?: string; error?: string; }
export declare function TextField(props: TextFieldProps): React.ReactElement;
export interface StatusChipProps { status?: 'available'|'progress'|'awaiting'|'completed'|'offline'|'error'|'info'; tone?: 'success'|'info'|'warning'|'error'|'neutral'; live?: boolean; children?: React.ReactNode; className?: string; }
export declare function StatusChip(props: StatusChipProps): React.ReactElement;
export interface RatingProps { value: number; count?: number; badge?: boolean; className?: string; }
export declare function Rating(props: RatingProps): React.ReactElement;
export interface ServiceCardProps { category: 'electrical'|'plumbing'|'building'|'finishing'; title?: string; description?: string; href?: string; onClick?: () => void; className?: string; }
export declare function ServiceCard(props: ServiceCardProps): React.ReactElement;
export interface ExpertCardProps { name: string; trade: string; rating: number; reviews?: number; location: string; availability?: StatusChipProps['status']; avatarSrc?: string; elevated?: boolean; actionLabel?: string; href?: string; onViewProfile?: () => void; className?: string; }
export declare function ExpertCard(props: ExpertCardProps): React.ReactElement;
export interface HeroPanelProps { title: string; subtitle?: string; trust?: Array<string | { icon?: IconName; label: string }>; children?: React.ReactNode; className?: string; }
export declare function HeroPanel(props: HeroPanelProps): React.ReactElement;
export interface NavItem { label: string; icon: IconName; href?: string; active?: boolean; badge?: number; onClick?: () => void; }
export interface SidebarNavProps { items: NavItem[]; logoSrc?: string; footer?: React.ReactNode | false; label?: string; className?: string; }
export declare function SidebarNav(props: SidebarNavProps): React.ReactElement;
export interface BottomNavProps { items: NavItem[]; label?: string; className?: string; }
export declare function BottomNav(props: BottomNavProps): React.ReactElement;
