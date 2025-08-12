import {
  Briefcase,
  CircleDollarSign,
  Gift,
  Utensils,
  Home,
  Car,
  Bolt,
  Stethoscope,
  Film,
  ShoppingCart,
  GraduationCap,
  HelpCircle,
} from 'lucide-react';

interface CategoryIconProps {
  category: string;
}

export const CategoryIcon = ({ category }: CategoryIconProps) => {
  const iconProps = { className: "size-4" };
  
  switch (category) {
    // Income
    case 'Salary': return <Briefcase {...iconProps} />;
    case 'Freelance': return <CircleDollarSign {...iconProps} />;
    case 'Investment': return <CircleDollarSign {...iconProps} />;
    case 'Gift': return <Gift {...iconProps} />;

    // Expense
    case 'Food & Groceries': return <Utensils {...iconProps} />;
    case 'Housing': return <Home {...iconProps} />;
    case 'Transportation': return <Car {...iconProps} />;
    case 'Utilities': return <Bolt {...iconProps} />;
    case 'Healthcare': return <Stethoscope {...iconProps} />;
    case 'Entertainment': return <Film {...iconProps} />;
    case 'Shopping': return <ShoppingCart {...iconProps} />;
    case 'Education': return <GraduationCap {...iconProps} />;

    default: return <HelpCircle {...iconProps} />;
  }
};
