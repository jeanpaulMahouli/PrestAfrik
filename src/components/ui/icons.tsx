// Icônes communes (couleur héritée du texte). Décoratives : le texte voisin ou un aria-label porte le sens.

type IconProps = { size?: number; className?: string };

/** Coche (maquettes : check-mark-1.svg). */
export function CheckIcon({ size = 14, className }: IconProps) {
  return (
    <svg aria-hidden="true" className={`icon ${className ?? ""}`} fill="currentColor" focusable="false" height={size} viewBox="0 0 24 24" width={size}>
      <path d="M20.285 2l-11.285 11.567-5.286-5.011-3.714 3.716 9 8.728 15-15.285z" />
    </svg>
  );
}

/** Flèche de retour (svgrepo « left-direction-arrow »). */
export function BackIcon({ size = 16, className }: IconProps) {
  return (
    <svg aria-hidden="true" className={`icon ${className ?? ""}`} fill="currentColor" focusable="false" height={size} viewBox="0 0 34.075 34.075" width={size}>
      <path d="M24.57 34.075c-.505 0-1.011-.191-1.396-.577L8.11 18.432c-.771-.771-.771-2.019 0-2.79L23.174.578c.771-.771 2.02-.771 2.791 0s.771 2.02 0 2.79l-13.67 13.669 13.67 13.669c.771.771.771 2.021 0 2.792-.385.385-.89.577-1.395.577z" />
    </svg>
  );
}

// Banque d'icônes des tableaux de bord (vendeur et admin) : Phosphor Icons, style « Regular »
// (planche « PrestAfrik maquettes UX UI/Regular ico.svg »).
//
// Les icônes sont réexportées sous des noms courts et stables : on importe toujours depuis
// « @/components/ui/icons », jamais directement depuis le paquet. La version « ssr » de Phosphor
// fonctionne aussi bien dans les composants serveur que client.
export type { Icon as AppIcon } from "@phosphor-icons/react/dist/lib/types";

export {
  ArrowCounterClockwise as Undo,
  ArrowDown,
  ArrowDownRight,
  ArrowSquareOut as ExternalLink,
  ArrowUp,
  ArrowUpRight,
  Bell,
  BellRinging as BellRing,
  Buildings as Building2,
  Camera,
  CaretDown as ChevronDown,
  CaretLeft as ChevronLeft,
  CaretRight as ChevronRight,
  ChatCircle as MessageCircle,
  ChatCircleDots as MessageCircleQuestion,
  ChatCircleDots as MessageCircleMore,
  ChatsCircle as MessagesSquare,
  ChatText as MessageSquareText,
  Check,
  CheckCircle as CircleCheck,
  Checks as CopyCheck,
  CircleNotch as Spinner,
  Copy,
  CreditCard,
  Crown,
  CursorClick as MousePointerClick,
  DeviceMobile as Smartphone,
  DotsSixVertical as GripVertical,
  DownloadSimple as Download,
  EnvelopeOpen as MailOpen,
  EnvelopeSimpleOpen as MailCheck,
  Eye,
  FacebookLogo,
  EyeSlash as EyeOff,
  FileXls as FileSpreadsheet,
  Globe,
  Handshake,
  Heart,
  House,
  ImageSquare as ImagePlus,
  InstagramLogo,
  Images,
  Info,
  Lightbulb,
  Layout as LayoutTemplate,
  Lightning as Zap,
  MagicWand,
  LinkSimple as Link2,
  MagnifyingGlass as Search,
  MapPin,
  List as Menu,
  Megaphone,
  Minus,
  Money as Banknote,
  Monitor,
  Package,
  Package as PackageCheck,
  PaperPlaneRight as SendHorizontal,
  PaperPlaneTilt as Send,
  PencilSimple as Pencil,
  Percent,
  Plus,
  Power,
  Prohibit as PowerOff,
  SealCheck as BadgeCheck,
  SealPercent as BadgePercent,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Sparkle as Sparkles,
  SlidersHorizontal,
  SquaresFour as LayoutGrid,
  SquaresFour as LayoutDashboard,
  Star,
  Storefront as Store,
  Tag,
  Timer,
  Trash as Trash2,
  TiktokLogo,
  TrendUp as TrendingUp,
  Truck,
  Handbag,
  UserCheck,
  UserPlus,
  ForkKnife as UtensilsCrossed,
  Users,
  UsersThree as UsersRound,
  Wallet,
  Warning as TriangleAlert,
  WarningCircle as CircleAlert,
  WarningOctagon as OctagonAlert,
  X,
  XLogo,
  YoutubeLogo,
} from "@phosphor-icons/react/dist/ssr";
