import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  Check,
  ChefHat,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Flag,
  Heart,
  House,
  Image as ImageIcon,
  ListPlus,
  Mic,
  Plus,
  Search,
  ShoppingBasket,
  Square,
  Star,
  UserRound,
  Video,
  X,
  type LucideProps,
} from 'lucide-react-native';

type IconName =
  | 'arrow-left'
  | 'arrow-right'
  | 'bookmark'
  | 'check'
  | 'chef-hat'
  | 'chevron-down'
  | 'chevron-left'
  | 'chevron-right'
  | 'download'
  | 'flag'
  | 'heart'
  | 'home'
  | 'image'
  | 'list-plus'
  | 'mic'
  | 'plus'
  | 'search'
  | 'shopping-basket'
  | 'star'
  | 'square'
  | 'user'
  | 'video'
  | 'x';

const icons = {
  'arrow-left': ArrowLeft,
  'arrow-right': ArrowRight,
  bookmark: Bookmark,
  check: Check,
  'chef-hat': ChefHat,
  'chevron-down': ChevronDown,
  'chevron-left': ChevronLeft,
  'chevron-right': ChevronRight,
  download: Download,
  flag: Flag,
  heart: Heart,
  home: House,
  image: ImageIcon,
  'list-plus': ListPlus,
  mic: Mic,
  plus: Plus,
  search: Search,
  'shopping-basket': ShoppingBasket,
  square: Square,
  star: Star,
  user: UserRound,
  video: Video,
  x: X,
} satisfies Record<IconName, React.ComponentType<LucideProps>>;

type AppIconProps = {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
};

export function AppIcon({ name, size = 20, color = '#28551D', strokeWidth = 2 }: AppIconProps) {
  const Icon = icons[name];
  return <Icon size={size} color={color} strokeWidth={strokeWidth} />;
}
