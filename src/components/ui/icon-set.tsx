import type { Icon as PhosphorIcon, IconProps } from "@phosphor-icons/react";
import * as P from "@phosphor-icons/react/ssr";
import type { ComponentType } from "react";

/**
 * Banque d'icônes de PrestAfrik : Phosphor (style « Regular »), sous les noms historiques de l'application.
 * Toute l'interface importe ses icônes d'ici (marketplace, tableau de bord, administration, site, fenêtres) :
 * changer une icône se fait à un seul endroit. Une icône « pleine » s'obtient avec `fill="currentColor"`
 * (comme avant) ou `weight="fill"`. `strokeWidth` est accepté et ignoré (les icônes Phosphor ont un trait fixe).
 */
export type IconComponentProps = Omit<IconProps, "ref"> & { strokeWidth?: number | string; absoluteStrokeWidth?: boolean };
export type LucideIcon = ComponentType<IconComponentProps>;

function icon(Base: PhosphorIcon, name: string): LucideIcon {
  function AppIcon({ fill, weight, ...rest }: IconComponentProps) {
    // Propriétés propres aux anciennes icônes, sans effet ici : retirées avant d'atteindre le <svg>.
    const props = { ...rest };
    delete props.strokeWidth;
    delete props.absoluteStrokeWidth;
    return <Base weight={weight ?? (fill && fill !== "none" ? "fill" : "regular")} {...props} />;
  }
  AppIcon.displayName = name;
  return AppIcon;
}

export const Apple = icon(P.OrangeSlice, "Apple");
export const ArrowDown = icon(P.ArrowDown, "ArrowDown");
export const ArrowDownRight = icon(P.ArrowDownRight, "ArrowDownRight");
export const ArrowLeft = icon(P.ArrowLeft, "ArrowLeft");
export const ArrowRight = icon(P.ArrowRight, "ArrowRight");
export const ArrowUp = icon(P.ArrowUp, "ArrowUp");
export const ArrowUpRight = icon(P.ArrowUpRight, "ArrowUpRight");
export const Baby = icon(P.Baby, "Baby");
export const BadgeCheck = icon(P.SealCheck, "BadgeCheck");
export const BadgePercent = icon(P.SealPercent, "BadgePercent");
export const Banknote = icon(P.Money, "Banknote");
export const Bell = icon(P.Bell, "Bell");
export const BookOpen = icon(P.BookOpen, "BookOpen");
export const Bot = icon(P.ChatCircleDots, "Bot");
export const Building2 = icon(P.Buildings, "Building2");
export const CalendarCheck = icon(P.CalendarCheck, "CalendarCheck");
export const CalendarDays = icon(P.CalendarBlank, "CalendarDays");
export const Car = icon(P.Car, "Car");
export const Check = icon(P.Check, "Check");
export const ChevronDown = icon(P.CaretDown, "ChevronDown");
export const ChevronLeft = icon(P.CaretLeft, "ChevronLeft");
export const ChevronRight = icon(P.CaretRight, "ChevronRight");
export const ChevronUp = icon(P.CaretUp, "ChevronUp");
export const CircleCheck = icon(P.CheckCircle, "CircleCheck");
export const Clock = icon(P.Clock, "Clock");
export const Compass = icon(P.Compass, "Compass");
export const Copy = icon(P.Copy, "Copy");
export const CopyCheck = icon(P.Checks, "CopyCheck");
export const CreditCard = icon(P.CreditCard, "CreditCard");
export const Crown = icon(P.Crown, "Crown");
export const Download = icon(P.DownloadSimple, "Download");
export const Dumbbell = icon(P.Barbell, "Dumbbell");
export const EllipsisVertical = icon(P.DotsThreeVertical, "EllipsisVertical");
export const ExternalLink = icon(P.ArrowSquareOut, "ExternalLink");
export const Eye = icon(P.Eye, "Eye");
export const EyeOff = icon(P.EyeSlash, "EyeOff");
export const FileSpreadsheet = icon(P.FileXls, "FileSpreadsheet");
export const Flame = icon(P.Fire, "Flame");
export const Footprints = icon(P.Footprints, "Footprints");
export const Gem = icon(P.Diamond, "Gem");
export const Glasses = icon(P.Eyeglasses, "Glasses");
export const Globe = icon(P.Globe, "Globe");
export const GripVertical = icon(P.DotsSixVertical, "GripVertical");
export const HandCoins = icon(P.HandCoins, "HandCoins");
export const Handshake = icon(P.Handshake, "Handshake");
export const HeartPulse = icon(P.Heartbeat, "HeartPulse");
export const House = icon(P.House, "House");
export const ImagePlus = icon(P.ImageSquare, "ImagePlus");
export const Images = icon(P.Images, "Images");
export const Info = icon(P.Info, "Info");
export const KeyRound = icon(P.Key, "KeyRound");
export const LayoutDashboard = icon(P.SquaresFour, "LayoutDashboard");
export const LayoutGrid = icon(P.GridFour, "LayoutGrid");
export const LayoutList = icon(P.ListBullets, "LayoutList");
export const LayoutTemplate = icon(P.Layout, "LayoutTemplate");
export const Lightbulb = icon(P.Lightbulb, "Lightbulb");
export const Link2 = icon(P.LinkSimple, "Link2");
export const ListOrdered = icon(P.ListNumbers, "ListOrdered");
export const Loader2 = icon(P.CircleNotch, "Loader2");
export const Lock = icon(P.Lock, "Lock");
export const Mail = icon(P.Envelope, "Mail");
export const MailCheck = icon(P.EnvelopeSimpleOpen, "MailCheck");
export const MailOpen = icon(P.EnvelopeOpen, "MailOpen");
export const MapPin = icon(P.MapPin, "MapPin");
export const MapPinned = icon(P.MapPinArea, "MapPinned");
export const Megaphone = icon(P.Megaphone, "Megaphone");
export const Menu = icon(P.List, "Menu");
export const MessageCircle = icon(P.ChatCircle, "MessageCircle");
export const MessageCircleMore = icon(P.ChatCircleDots, "MessageCircleMore");
export const MessageCircleQuestion = icon(P.Question, "MessageCircleQuestion");
export const MessageSquareText = icon(P.ChatText, "MessageSquareText");
export const MessagesSquare = icon(P.ChatsCircle, "MessagesSquare");
export const Minus = icon(P.Minus, "Minus");
export const Monitor = icon(P.Monitor, "Monitor");
export const MousePointerClick = icon(P.CursorClick, "MousePointerClick");
export const OctagonAlert = icon(P.WarningOctagon, "OctagonAlert");
export const Package = icon(P.Package, "Package");
export const PackageCheck = icon(P.Package, "PackageCheck");
export const PackageSearch = icon(P.MagnifyingGlass, "PackageSearch");
export const Palette = icon(P.Palette, "Palette");
export const Pause = icon(P.Pause, "Pause");
export const Pencil = icon(P.PencilSimple, "Pencil");
export const Percent = icon(P.Percent, "Percent");
export const Phone = icon(P.Phone, "Phone");
export const Play = icon(P.Play, "Play");
export const PlayCircle = icon(P.PlayCircle, "PlayCircle");
export const Plus = icon(P.Plus, "Plus");
export const Power = icon(P.Power, "Power");
export const PowerOff = icon(P.Power, "PowerOff");
export const QrCode = icon(P.QrCode, "QrCode");
export const Rocket = icon(P.RocketLaunch, "Rocket");
export const RotateCcw = icon(P.ArrowCounterClockwise, "RotateCcw");
export const Search = icon(P.MagnifyingGlass, "Search");
export const Send = icon(P.PaperPlaneTilt, "Send");
export const SendHorizontal = icon(P.PaperPlaneRight, "SendHorizontal");
export const Share = icon(P.ShareNetwork, "Share");
export const ShieldCheck = icon(P.ShieldCheck, "ShieldCheck");
export const Shirt = icon(P.TShirt, "Shirt");
export const ShoppingBag = icon(P.ShoppingBag, "ShoppingBag");
export const ShoppingCart = icon(P.ShoppingCartSimple, "ShoppingCart");
export const Smartphone = icon(P.DeviceMobile, "Smartphone");
export const Sofa = icon(P.Couch, "Sofa");
export const Sparkles = icon(P.Sparkle, "Sparkles");
export const SquarePlus = icon(P.PlusSquare, "SquarePlus");
export const Star = icon(P.Star, "Star");
export const Store = icon(P.Storefront, "Store");
export const Tag = icon(P.Tag, "Tag");
export const Timer = icon(P.Timer, "Timer");
export const Trash2 = icon(P.Trash, "Trash2");
export const TrendingUp = icon(P.TrendUp, "TrendingUp");
export const TriangleAlert = icon(P.Warning, "TriangleAlert");
export const Truck = icon(P.Truck, "Truck");
export const Tv = icon(P.Television, "Tv");
export const UserCheck = icon(P.UserCheck, "UserCheck");
export const UserPlus = icon(P.UserPlus, "UserPlus");
export const Users = icon(P.Users, "Users");
export const UsersRound = icon(P.UsersThree, "UsersRound");
export const Wallet = icon(P.Wallet, "Wallet");
export const Wrench = icon(P.Wrench, "Wrench");
export const X = icon(P.X, "X");
export const Zap = icon(P.Lightning, "Zap");
