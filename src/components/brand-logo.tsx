import Image from "next/image";

type BrandLogoProps = {
  className?: string;
  priority?: boolean;
};

export function BrandLogo({ className, priority = false }: BrandLogoProps) {
  return (
    <Image
      alt="PrestAfrik"
      className={className}
      height={647}
      priority={priority}
      src="/logo-prestafrik.png"
      width={1176}
    />
  );
}
