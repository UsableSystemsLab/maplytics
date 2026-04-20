import { Skeleton } from "@/components/ui/skeleton";
import SkeletonCard from "./SkeletonCard";
import CardGridSkeleton from "./CardGridSkeleton";
import MapSkeleton from "./MapSkeleton";
import PageSkeleton from "./PageSkeleton";


const VARIANTS = {
  "card-grid": CardGridSkeleton,
  map: MapSkeleton,
  page: PageSkeleton,
};


export function LoadingSkeleton({ variant, ...props }) {
  if (variant && VARIANTS[variant]) {
    const Variant = VARIANTS[variant];
    return <Variant {...props} />;
  }
  return <Skeleton {...props} />;
}

export {
  Skeleton,
  SkeletonCard,
  CardGridSkeleton,
  MapSkeleton,
  PageSkeleton,
};
